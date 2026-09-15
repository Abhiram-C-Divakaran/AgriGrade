from __future__ import annotations

from pathlib import Path
from typing import Dict, List
import io

import numpy as np
import torch
from PIL import Image
from torchvision import models, transforms
from ultralytics import YOLO

from .scoring import (
    calculate_quality_score,
    grade_from_score,
    recommendation_from_grade,
    severity_from_area,
)

ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = ROOT / "models"
FRESHNESS_WEIGHTS = MODELS_DIR / "apple_freshness_best.pt"
DEFECT_WEIGHTS = MODELS_DIR / "apple_defects_best.pt"

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

freshness_model = None
freshness_classes: List[str] = []
defect_model = None
load_errors: List[str] = []

freshness_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ]
)


def _load_models() -> None:
    global freshness_model, freshness_classes, defect_model, load_errors

    load_errors = []

    if freshness_model is None and FRESHNESS_WEIGHTS.exists():
        try:
            checkpoint = torch.load(FRESHNESS_WEIGHTS, map_location=DEVICE)
            classes = checkpoint.get("classes") if isinstance(checkpoint, dict) else None
            state_dict = checkpoint.get("state_dict") if isinstance(checkpoint, dict) else checkpoint

            if not classes or not isinstance(classes, list):
                raise ValueError("Freshness checkpoint is missing its classes list.")

            model = models.efficientnet_b0(weights=None)
            model.classifier[1] = torch.nn.Linear(
                model.classifier[1].in_features,
                len(classes),
            )
            model.load_state_dict(state_dict)
            model.to(DEVICE)
            model.eval()

            freshness_model = model
            freshness_classes = classes
        except Exception as exc:
            load_errors.append(f"freshness: {exc}")

    if defect_model is None and DEFECT_WEIGHTS.exists():
        try:
            defect_model = YOLO(str(DEFECT_WEIGHTS))
        except Exception as exc:
            load_errors.append(f"defects: {exc}")


def model_status() -> Dict:
    _load_models()
    ready = freshness_model is not None and defect_model is not None
    return {
        "ready": ready,
        "freshness_model": freshness_model is not None,
        "defect_model": defect_model is not None,
        "device": str(DEVICE),
        "errors": load_errors,
    }


def classify_freshness(image: Image.Image) -> Dict:
    if freshness_model is None:
        raise RuntimeError("Freshness model is not loaded.")

    x = freshness_transform(image).unsqueeze(0).to(DEVICE)
    with torch.no_grad():
        logits = freshness_model(x)
        probabilities = torch.softmax(logits, dim=1)[0]
        index = int(torch.argmax(probabilities).item())

    return {
        "stage": freshness_classes[index],
        "confidence": round(float(probabilities[index].item()), 4),
    }


def _resize_mask(mask: np.ndarray, height: int, width: int) -> np.ndarray:
    if mask.shape == (height, width):
        return mask

    import cv2

    return cv2.resize(mask.astype(np.float32), (width, height), interpolation=cv2.INTER_NEAREST)


def detect_defects(image: Image.Image) -> List[Dict]:
    if defect_model is None:
        raise RuntimeError("Defect segmentation model is not loaded.")

    image_array = np.array(image)
    height, width = image_array.shape[:2]

    result = defect_model.predict(
        source=image_array,
        conf=0.25,
        verbose=False,
    )[0]

    if result.boxes is None or len(result.boxes) == 0:
        raise RuntimeError(
            "Apple foreground was not detected. Capture one clearly visible apple and retry."
        )

    masks_data = None
    if result.masks is not None:
        masks_data = result.masks.data.detach().cpu().numpy()

    if masks_data is None:
        raise RuntimeError("Segmentation model returned boxes without masks.")

    # The segmentation dataset includes an `apple` class. We use its largest mask
    # as the visible produce denominator so defect coverage is relative to the apple,
    # not the whole photograph.
    apple_masks: List[np.ndarray] = []
    for i, box in enumerate(result.boxes):
        class_id = int(box.cls.item())
        class_name = str(result.names[class_id]).lower()
        if class_name == "apple" and i < len(masks_data):
            apple_masks.append(_resize_mask(masks_data[i], height, width) > 0.5)

    if not apple_masks:
        raise RuntimeError(
            "Apple foreground was not detected. Capture one clearly visible apple and retry."
        )

    apple_mask = max(apple_masks, key=lambda mask: int(mask.sum()))
    apple_area = float(apple_mask.sum())
    if apple_area <= 0:
        raise RuntimeError("Detected apple mask has zero area.")

    defects: List[Dict] = []

    for i, box in enumerate(result.boxes):
        class_id = int(box.cls.item())
        class_name = str(result.names[class_id]).lower()
        if class_name == "apple":
            continue

        confidence = float(box.conf.item())
        xyxy = box.xyxy[0].detach().cpu().tolist()

        affected = 0.0
        if i < len(masks_data):
            defect_mask = _resize_mask(masks_data[i], height, width) > 0.5
            defect_on_apple = np.logical_and(defect_mask, apple_mask)
            affected = 100.0 * float(defect_on_apple.sum()) / apple_area

        # Frontend currently expects bbox coordinates normalized to a 0..1000 space.
        x1, y1, x2, y2 = xyxy
        normalized_bbox = [
            round(1000.0 * x1 / width, 1),
            round(1000.0 * y1 / height, 1),
            round(1000.0 * x2 / width, 1),
            round(1000.0 * y2 / height, 1),
        ]

        defects.append(
            {
                "type": class_name,
                "confidence": round(confidence, 4),
                "severity": severity_from_area(affected),
                "affected_area_percent": round(affected, 2),
                "bbox": normalized_bbox,
            }
        )

    return defects


def _build_explanation(defects: List[Dict], freshness: Dict, score: int) -> str:
    if not defects:
        return (
            f"No trained defect class was detected on the visible apple surface. "
            f"Freshness model classified it as {freshness['stage']} with "
            f"{freshness['confidence'] * 100:.0f}% confidence."
        )

    ranked = sorted(defects, key=lambda item: item["affected_area_percent"], reverse=True)
    main = ranked[0]
    return (
        f"The score is driven mainly by {main['type']} affecting approximately "
        f"{main['affected_area_percent']:.1f}% of the visible apple surface. "
        f"Freshness was classified as {freshness['stage']}. Final score: {score}/100."
    )


def analyze_image(image_bytes: bytes, produce_type: str) -> Dict:
    _load_models()

    if produce_type.lower() != "apple":
        return {
            "success": False,
            "error": "UNSUPPORTED_PRODUCE",
            "message": "The trained ML pipeline currently supports Apple only.",
        }

    status = model_status()
    if not status["ready"]:
        return {
            "success": False,
            "error": "MODEL_NOT_AVAILABLE",
            "message": (
                "Apple ML models are not installed yet. Train the models and place "
                "apple_freshness_best.pt and apple_defects_best.pt in models/."
            ),
            "model_status": status,
        }

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    freshness = classify_freshness(image)
    defects = detect_defects(image)

    score = calculate_quality_score(defects, freshness.get("stage"))
    grade = grade_from_score(score)
    total_defect_area = min(
        100.0,
        round(sum(float(d["affected_area_percent"]) for d in defects), 2),
    )

    confidences = [freshness["confidence"]] + [d["confidence"] for d in defects]
    model_confidence = round(float(sum(confidences) / len(confidences)), 4)

    return {
        "success": True,
        "ai_available": True,
        "produce": "apple",
        "quality_score": score,
        "grade": grade,
        "ripeness": freshness,
        "defects": defects,
        "total_defect_area_percent": total_defect_area,
        "recommendation": recommendation_from_grade(grade),
        "model_confidence": model_confidence,
        "explanation": _build_explanation(defects, freshness, score),
        "model_version": {
            "freshness": "apple-freshness-v1",
            "defects": "apple-defects-v1",
        },
    }

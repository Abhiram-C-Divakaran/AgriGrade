from __future__ import annotations

import argparse
from pathlib import Path
import random

import cv2
import numpy as np

from data_utils import ARTIFACTS_DIR, DEFECT_CLASSES, SUPPORTED_EXTENSIONS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render YOLO segmentation annotations for manual QA.")
    parser.add_argument("--dataset", type=Path, default=Path("data/processed/apple_defects"))
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    candidates: list[tuple[str, Path, Path]] = []
    for split in ("train", "val", "test"):
        image_dir = args.dataset / "images" / split
        label_dir = args.dataset / "labels" / split
        if not image_dir.exists():
            continue
        for image in image_dir.iterdir():
            if image.is_file() and image.suffix.lower() in SUPPORTED_EXTENSIONS:
                label = label_dir / f"{image.stem}.txt"
                if label.exists():
                    candidates.append((split, image, label))

    random.Random(args.seed).shuffle(candidates)
    selected = candidates[: max(0, args.count)]
    output_dir = ARTIFACTS_DIR / "annotation_previews"
    output_dir.mkdir(parents=True, exist_ok=True)

    for split, image_path, label_path in selected:
        image = cv2.imread(str(image_path))
        if image is None:
            continue
        height, width = image.shape[:2]
        overlay = image.copy()
        for raw in label_path.read_text(encoding="utf-8").splitlines():
            parts = raw.strip().split()
            if len(parts) < 7:
                continue
            class_id = int(parts[0])
            coords = [float(v) for v in parts[1:]]
            points = np.array(
                [[int(coords[i] * width), int(coords[i + 1] * height)] for i in range(0, len(coords), 2)],
                dtype=np.int32,
            )
            cv2.polylines(overlay, [points], True, (255, 255, 255), 2)
            x, y = points[0]
            label = DEFECT_CLASSES[class_id] if 0 <= class_id < len(DEFECT_CLASSES) else str(class_id)
            cv2.putText(overlay, label, (int(x), max(18, int(y))), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)
        destination = output_dir / f"{split}_{image_path.stem}.jpg"
        cv2.imwrite(str(destination), overlay)

    print(f"Generated {len(selected)} annotation previews in {output_dir}")


if __name__ == "__main__":
    main()

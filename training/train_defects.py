from __future__ import annotations

from pathlib import Path
import shutil

import yaml
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
DATA_ROOT = ROOT / "data" / "processed" / "apple_defects"
RUNS_DIR = ROOT / "runs"
GENERATED_YAML = RUNS_DIR / "apple_defects.generated.yaml"
MODEL_OUTPUT = ROOT / "models" / "apple_defects_best.pt"

NAMES = {
    0: "apple",
    1: "rot",
    2: "mold",
    3: "bruise",
    4: "dark_spot",
    5: "cut",
    6: "crack",
    7: "discoloration",
    8: "pest_damage",
}


def validate_dataset_layout() -> None:
    required = [
        DATA_ROOT / "images" / "train",
        DATA_ROOT / "images" / "val",
        DATA_ROOT / "labels" / "train",
        DATA_ROOT / "labels" / "val",
    ]
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError(
            "YOLO segmentation dataset is incomplete. Missing: " + ", ".join(missing)
        )


def write_dataset_yaml() -> Path:
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "path": str(DATA_ROOT.resolve()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": NAMES,
    }
    GENERATED_YAML.write_text(yaml.safe_dump(payload, sort_keys=False), encoding="utf-8")
    return GENERATED_YAML


def main() -> None:
    validate_dataset_layout()
    data_yaml = write_dataset_yaml()

    model = YOLO("yolo11n-seg.pt")
    results = model.train(
        data=str(data_yaml),
        epochs=80,
        imgsz=640,
        batch=16,
        patience=15,
        project=str(RUNS_DIR),
        name="apple_defects",
        pretrained=True,
        seed=42,
        plots=True,
    )

    best = Path(results.save_dir) / "weights" / "best.pt"
    if not best.exists():
        raise RuntimeError(f"Training finished but best weights were not found at {best}")

    MODEL_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(best, MODEL_OUTPUT)
    print(f"Copied best defect model to: {MODEL_OUTPUT}")


if __name__ == "__main__":
    main()

from __future__ import annotations

from pathlib import Path
import shutil

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parents[1]
DATA_YAML = ROOT / "training" / "apple_defects.yaml"
RUNS_DIR = ROOT / "runs"
MODEL_OUTPUT = ROOT / "models" / "apple_defects_best.pt"


def main() -> None:
    if not DATA_YAML.exists():
        raise FileNotFoundError(f"Missing dataset config: {DATA_YAML}")

    model = YOLO("yolo11n-seg.pt")
    results = model.train(
        data=str(DATA_YAML),
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

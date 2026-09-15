from __future__ import annotations

import argparse
from pathlib import Path

from data_utils import ARTIFACTS_DIR, DEFECT_CLASSES, SUPPORTED_EXTENSIONS, write_csv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate YOLO segmentation annotations for Apple defects.")
    parser.add_argument("--dataset", type=Path, default=Path("data/processed/apple_defects"))
    return parser.parse_args()


def validate_label(label_path: Path) -> list[str]:
    errors: list[str] = []
    apple_seen = False
    for line_number, raw in enumerate(label_path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.strip()
        if not line:
            continue
        parts = line.split()
        try:
            class_id = int(parts[0])
        except Exception:
            errors.append(f"line {line_number}: invalid class id")
            continue
        if not 0 <= class_id < len(DEFECT_CLASSES):
            errors.append(f"line {line_number}: class id {class_id} outside 0..{len(DEFECT_CLASSES)-1}")
        if class_id == 0:
            apple_seen = True
        values = parts[1:]
        if len(values) < 6 or len(values) % 2 != 0:
            errors.append(f"line {line_number}: polygon requires at least 3 x/y points")
            continue
        for index, value in enumerate(values):
            try:
                number = float(value)
            except ValueError:
                errors.append(f"line {line_number}: coordinate {index} is not numeric")
                continue
            if not 0.0 <= number <= 1.0:
                errors.append(f"line {line_number}: coordinate {number} outside 0..1")
    if not apple_seen:
        errors.append("missing apple foreground polygon (class 0)")
    return errors


def main() -> None:
    args = parse_args()
    rows: list[dict[str, str]] = []
    critical = 0
    total = 0

    for split in ("train", "val", "test"):
        image_dir = args.dataset / "images" / split
        label_dir = args.dataset / "labels" / split
        if not image_dir.exists():
            continue
        for image in sorted(image_dir.iterdir()):
            if not image.is_file() or image.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            total += 1
            label = label_dir / f"{image.stem}.txt"
            errors: list[str] = []
            if not label.exists():
                errors = ["missing label file"]
            else:
                errors = validate_label(label)
            if errors:
                critical += 1
            rows.append({
                "split": split,
                "image": str(image),
                "label": str(label),
                "valid": str(not errors).lower(),
                "errors": " | ".join(errors),
            })

    output = ARTIFACTS_DIR / "annotation_validation_report.csv"
    write_csv(output, rows, ["split", "image", "label", "valid", "errors"])
    print(f"Segmentation images checked: {total}")
    print(f"Images with critical annotation errors: {critical}")
    print(f"Report: {output}")
    if critical:
        raise SystemExit(2)


if __name__ == "__main__":
    main()

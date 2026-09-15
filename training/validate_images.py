from __future__ import annotations

import argparse
from pathlib import Path
import shutil

from data_utils import DATA_DIR, MANIFEST_DIR, iter_images, validate_image, write_csv


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate Apple dataset images before training.")
    parser.add_argument("--source", type=Path, default=DATA_DIR / "staging")
    parser.add_argument("--minimum-size", type=int, default=128)
    parser.add_argument("--move-rejected", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows: list[dict[str, str]] = []
    valid = 0
    invalid = 0

    for path in iter_images(args.source):
        result = validate_image(path, args.minimum_size)
        rows.append({
            "path": str(path),
            "valid": str(result.valid).lower(),
            "reason": result.reason,
            "width": str(result.width),
            "height": str(result.height),
            "file_size": str(result.file_size),
        })
        if result.valid:
            valid += 1
        else:
            invalid += 1
            if args.move_rejected:
                destination = DATA_DIR / "rejected" / path.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                try:
                    shutil.move(str(path), destination)
                except Exception as exc:
                    print(f"WARNING: could not move {path}: {exc}")

    report = MANIFEST_DIR / "image_validation_report.csv"
    write_csv(report, rows, ["path", "valid", "reason", "width", "height", "file_size"])
    print(f"Valid images: {valid}")
    print(f"Invalid images: {invalid}")
    print(f"Report: {report}")
    if invalid:
        raise SystemExit(2)


if __name__ == "__main__":
    main()

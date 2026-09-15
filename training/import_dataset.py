from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path
import shutil

from data_utils import (
    DATA_DIR,
    MANIFEST_DIR,
    append_manifest,
    ensure_dirs,
    iter_images,
    load_source_registry,
    phash_file,
    sha256_file,
    stable_image_id,
    validate_image,
    write_csv,
)

SOURCE_FIELDS = [
    "dataset_name", "task", "source_url", "license", "license_url",
    "download_date", "original_image_count", "usable_image_count",
    "classes_available", "notes",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import a licensed Apple dataset into AgriGrade staging.")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--name", required=True)
    parser.add_argument("--task", required=True, choices=["freshness", "defects"])
    parser.add_argument("--source-url", required=True)
    parser.add_argument("--license", required=True)
    parser.add_argument("--license-url", default="")
    parser.add_argument("--classes", default="")
    parser.add_argument("--notes", default="")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_dirs()
    if not args.source.exists():
        raise FileNotFoundError(args.source)
    if not args.license.strip() or not args.source_url.strip():
        raise ValueError("A documented source URL and license are required before importing data.")

    staging_root = DATA_DIR / "staging" / args.task / args.name
    staging_root.mkdir(parents=True, exist_ok=True)
    rejected_root = DATA_DIR / "rejected" / args.name
    rejected_root.mkdir(parents=True, exist_ok=True)

    rows: list[dict[str, str]] = []
    rejection_rows: list[dict[str, str]] = []
    discovered = 0
    usable = 0

    for path in iter_images(args.source):
        discovered += 1
        validation = validate_image(path)
        if not validation.valid:
            rejection_rows.append({"path": str(path), "reason": validation.reason})
            try:
                shutil.copy2(path, rejected_root / path.name)
            except Exception:
                pass
            continue

        exact = sha256_file(path)
        visual = phash_file(path)
        image_id = stable_image_id(args.name, exact)
        suffix = path.suffix.lower()
        destination = staging_root / f"{image_id}{suffix}"
        if not destination.exists():
            shutil.copy2(path, destination)

        freshness_label = ""
        annotation_status = "unlabeled"
        if args.task == "freshness":
            parent_label = path.parent.name.lower().strip().replace(" ", "_")
            freshness_label = parent_label
            annotation_status = "needs_review"

        rows.append({
            "image_id": image_id,
            "original_filename": path.name,
            "current_path": str(destination.relative_to(DATA_DIR.parent)),
            "task": args.task,
            "source_dataset": args.name,
            "source_url": args.source_url,
            "license": args.license,
            "apple_variety": "",
            "freshness_label": freshness_label,
            "defect_labels": "",
            "annotation_status": annotation_status,
            "width": str(validation.width),
            "height": str(validation.height),
            "file_size": str(validation.file_size),
            "sha256": exact,
            "perceptual_hash": visual,
            "split": "",
            "is_augmented": "false",
            "parent_image_id": "",
            "rejection_reason": "",
            "notes": "",
        })
        usable += 1

    append_manifest(rows)
    write_csv(MANIFEST_DIR / f"rejections_{args.name}.csv", rejection_rows, ["path", "reason"])

    registry = load_source_registry()
    registry = [row for row in registry if row.get("dataset_name") != args.name]
    registry.append({
        "dataset_name": args.name,
        "task": args.task,
        "source_url": args.source_url,
        "license": args.license,
        "license_url": args.license_url,
        "download_date": date.today().isoformat(),
        "original_image_count": str(discovered),
        "usable_image_count": str(usable),
        "classes_available": args.classes,
        "notes": args.notes,
    })
    write_csv(MANIFEST_DIR / "dataset_sources.csv", registry, SOURCE_FIELDS)

    print(f"Imported dataset: {args.name}")
    print(f"Discovered images: {discovered}")
    print(f"Usable images: {usable}")
    print(f"Rejected images: {discovered - usable}")
    print(f"Staging path: {staging_root}")


if __name__ == "__main__":
    main()

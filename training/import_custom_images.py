from __future__ import annotations

import argparse
from pathlib import Path
import shutil

from data_utils import DATA_DIR, append_manifest, ensure_dirs, iter_images, phash_file, sha256_file, stable_image_id, validate_image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import custom Apple phone photos without auto-labeling them.")
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--task", required=True, choices=["freshness", "defects", "real_world_test"])
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    ensure_dirs()
    if not args.source.exists():
        raise FileNotFoundError(args.source)

    destination_root = DATA_DIR / ("real_world_test" if args.task == "real_world_test" else "staging") / "custom"
    destination_root.mkdir(parents=True, exist_ok=True)
    rows = []

    for path in iter_images(args.source):
        validation = validate_image(path)
        if not validation.valid:
            print(f"SKIP {path}: {validation.reason}")
            continue
        exact = sha256_file(path)
        image_id = stable_image_id("custom", exact)
        destination = destination_root / f"{image_id}{path.suffix.lower()}"
        if not destination.exists():
            shutil.copy2(path, destination)
        rows.append({
            "image_id": image_id,
            "original_filename": path.name,
            "current_path": str(destination.relative_to(DATA_DIR.parent)),
            "task": args.task,
            "source_dataset": "custom",
            "source_url": "local_capture",
            "license": "user-owned",
            "apple_variety": "",
            "freshness_label": "",
            "defect_labels": "",
            "annotation_status": "unlabeled",
            "width": str(validation.width),
            "height": str(validation.height),
            "file_size": str(validation.file_size),
            "sha256": exact,
            "perceptual_hash": phash_file(path),
            "split": "real_world_test" if args.task == "real_world_test" else "",
            "is_augmented": "false",
            "parent_image_id": "",
            "rejection_reason": "",
            "notes": "Custom phone photo; label manually before training.",
        })

    append_manifest(rows)
    print(f"Imported {len(rows)} custom images to {destination_root}")
    print("No labels were assigned automatically.")


if __name__ == "__main__":
    main()

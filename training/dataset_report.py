from __future__ import annotations

from collections import Counter
from pathlib import Path
import json

from data_utils import ARTIFACTS_DIR, DATA_DIR, DEFECT_CLASSES, MANIFEST_DIR, read_csv, read_manifest, write_csv


def count_segmentation_instances(root: Path) -> Counter:
    counts: Counter = Counter()
    labels_root = root / "labels"
    if not labels_root.exists():
        return counts
    for label in labels_root.rglob("*.txt"):
        for raw in label.read_text(encoding="utf-8").splitlines():
            parts = raw.strip().split()
            if not parts:
                continue
            try:
                class_id = int(parts[0])
            except ValueError:
                continue
            if 0 <= class_id < len(DEFECT_CLASSES):
                counts[DEFECT_CLASSES[class_id]] += 1
    return counts


def main() -> None:
    manifest = read_manifest()
    freshness = Counter()
    splits = Counter()
    sources = Counter()
    rejected = 0
    unlabeled = 0

    for row in manifest:
        sources[row.get("source_dataset", "unknown")] += 1
        splits[row.get("split", "unsplit") or "unsplit"] += 1
        if row.get("task") == "freshness":
            freshness[row.get("freshness_label", "unlabeled") or "unlabeled"] += 1
        if row.get("rejection_reason"):
            rejected += 1
        if row.get("annotation_status") in {"", "unlabeled", "needs_review"}:
            unlabeled += 1

    duplicates = read_csv(MANIFEST_DIR / "duplicates.csv")
    near_duplicates = read_csv(MANIFEST_DIR / "near_duplicates.csv")
    defect_counts = count_segmentation_instances(DATA_DIR / "processed" / "apple_defects")

    payload = {
        "total_manifest_images": len(manifest),
        "freshness_counts": dict(freshness),
        "split_counts": dict(splits),
        "source_counts": dict(sources),
        "defect_instances": dict(defect_counts),
        "rejected": rejected,
        "unlabeled_or_needs_review": unlabeled,
        "exact_duplicate_records": len(duplicates),
        "near_duplicate_pairs": len(near_duplicates),
        "real_world_test_images": sum(1 for p in (DATA_DIR / "real_world_test").rglob("*") if p.is_file()) if (DATA_DIR / "real_world_test").exists() else 0,
    }

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS_DIR / "dataset_report.json").write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    rows = []
    for key, value in payload.items():
        rows.append({"metric": key, "value": json.dumps(value, sort_keys=True) if isinstance(value, dict) else str(value)})
    write_csv(ARTIFACTS_DIR / "dataset_report.csv", rows, ["metric", "value"])

    print(json.dumps(payload, indent=2, sort_keys=True))
    print("\nClass warnings:")
    for defect in DEFECT_CLASSES[1:]:
        count = defect_counts.get(defect, 0)
        if count < 200:
            print(f"WARNING: {defect} has only {count} annotated instances; collect more examples before final training.")


if __name__ == "__main__":
    main()

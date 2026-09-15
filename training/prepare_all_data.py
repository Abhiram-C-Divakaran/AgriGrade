from __future__ import annotations

from collections import Counter
from pathlib import Path
import subprocess
import sys

from data_utils import DATA_DIR, DEFECT_CLASSES, MANIFEST_DIR, read_csv, read_manifest

ROOT = Path(__file__).resolve().parents[1]
TRAINING = ROOT / "training"


def run(script: str, allow_empty: bool = False) -> bool:
    print(f"\n>>> {script}")
    result = subprocess.run([sys.executable, str(TRAINING / script)], cwd=ROOT)
    if result.returncode != 0 and not allow_empty:
        print(f"FAILED: {script} returned {result.returncode}")
        return False
    return True


def segmentation_counts() -> Counter:
    counts: Counter = Counter()
    labels_root = DATA_DIR / "processed" / "apple_defects" / "labels"
    if not labels_root.exists():
        return counts
    for label in labels_root.rglob("*.txt"):
        for line in label.read_text(encoding="utf-8").splitlines():
            parts = line.split()
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
    critical_ok = True
    critical_ok &= run("validate_images.py")
    critical_ok &= run("deduplicate.py")
    critical_ok &= run("normalize_labels.py")
    critical_ok &= run("validate_annotations.py")
    run("dataset_report.py", allow_empty=True)

    manifest = read_manifest()
    freshness = Counter(row.get("freshness_label", "") for row in manifest if row.get("task") == "freshness")
    defect = segmentation_counts()
    sources = read_csv(MANIFEST_DIR / "dataset_sources.csv")
    undocumented_sources = [row.get("dataset_name", "") for row in sources if not row.get("license", "").strip() or not row.get("source_url", "").strip()]
    label_review = read_csv(MANIFEST_DIR / "label_review.csv")
    near = read_csv(MANIFEST_DIR / "near_duplicates.csv")
    pending_near = sum(1 for row in near if row.get("review_status") != "resolved")

    blockers: list[str] = []
    if not manifest:
        blockers.append("No real images have been imported into the master manifest.")
    for cls in ("fresh", "ripe", "overripe", "decayed"):
        if freshness.get(cls, 0) < 1000:
            blockers.append(f"Freshness class {cls} has {freshness.get(cls, 0)} images; target is at least 1000 originals.")
    if defect.get("apple", 0) < 3000:
        blockers.append(f"Apple foreground masks: {defect.get('apple', 0)}; target is at least 3000.")
    minimums = {"rot": 1000, "bruise": 700, "dark_spot": 700, "discoloration": 500, "mold": 300, "cut": 300, "crack": 300, "pest_damage": 200}
    for cls, target in minimums.items():
        if defect.get(cls, 0) < target:
            blockers.append(f"{cls}: {defect.get(cls, 0)} annotated instances; target is at least {target}.")
    if label_review:
        blockers.append(f"{len(label_review)} freshness labels still need manual review.")
    if pending_near:
        blockers.append(f"{pending_near} near-duplicate pairs still require review.")
    if undocumented_sources:
        blockers.append("Dataset sources missing license/source metadata: " + ", ".join(undocumented_sources))
    if not critical_ok:
        blockers.append("One or more critical validation scripts failed.")

    real_world_count = sum(1 for p in (DATA_DIR / "real_world_test").rglob("*") if p.is_file()) if (DATA_DIR / "real_world_test").exists() else 0
    if real_world_count < 200:
        blockers.append(f"Real-world held-out phone test set has {real_world_count} images; target is at least 200.")

    ready = not blockers
    print("\n========================================")
    print("AGRIGRADE APPLE DATA READINESS REPORT")
    print("========================================")
    print(f"Fresh: {freshness.get('fresh', 0)}")
    print(f"Ripe: {freshness.get('ripe', 0)}")
    print(f"Overripe: {freshness.get('overripe', 0)}")
    print(f"Decayed: {freshness.get('decayed', 0)}")
    for cls in DEFECT_CLASSES:
        print(f"{cls}: {defect.get(cls, 0)}")
    print(f"Real-world test: {real_world_count}")
    print(f"DATASET READY FOR TRAINING: {'YES' if ready else 'NO'}")
    if blockers:
        print("\nBLOCKERS:")
        for blocker in blockers:
            print(f"- {blocker}")
    print("========================================")
    raise SystemExit(0 if ready else 3)


if __name__ == "__main__":
    main()

from __future__ import annotations

from data_utils import MANIFEST_DIR, read_manifest, write_csv, write_manifest

CANONICAL = {"fresh", "ripe", "overripe", "decayed"}
ALIASES = {
    "fresh_apple": "fresh",
    "healthy": "fresh",
    "ripe_apple": "ripe",
    "over_ripe": "overripe",
    "over-ripe": "overripe",
    "rotten": "decayed",
    "spoiled": "decayed",
    "decay": "decayed",
}


def main() -> None:
    rows = read_manifest()
    review = []
    for row in rows:
        if row.get("task") != "freshness":
            continue
        raw = row.get("freshness_label", "").strip().lower().replace(" ", "_")
        if raw in CANONICAL:
            row["freshness_label"] = raw
            row["annotation_status"] = "labeled"
        elif raw in ALIASES:
            row["freshness_label"] = ALIASES[raw]
            row["annotation_status"] = "labeled"
        else:
            row["freshness_label"] = "needs_review"
            row["annotation_status"] = "needs_review"
            review.append({"image_id": row.get("image_id", ""), "source_dataset": row.get("source_dataset", ""), "original_label": raw, "suggested_label": "", "review_status": "pending"})
    write_manifest(rows)
    write_csv(MANIFEST_DIR / "label_review.csv", review, ["image_id", "source_dataset", "original_label", "suggested_label", "review_status"])
    print(f"Freshness labels needing manual review: {len(review)}")


if __name__ == "__main__":
    main()

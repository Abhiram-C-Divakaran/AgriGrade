from __future__ import annotations

from collections import defaultdict

from data_utils import MANIFEST_DIR, hamming_hex, read_manifest, write_csv

EXACT_FIELDS = ["duplicate_image_id", "canonical_image_id", "sha256"]
NEAR_FIELDS = ["image_a", "image_b", "hash_distance", "same_source", "recommended_action", "review_status"]


def main() -> None:
    rows = read_manifest()
    by_sha: dict[str, list[dict[str, str]]] = defaultdict(list)
    for row in rows:
        if row.get("sha256"):
            by_sha[row["sha256"]].append(row)

    exact: list[dict[str, str]] = []
    canonical_ids: set[str] = set()
    for sha, group in by_sha.items():
        if len(group) < 2:
            continue
        canonical = group[0]["image_id"]
        canonical_ids.add(canonical)
        for duplicate in group[1:]:
            exact.append({
                "duplicate_image_id": duplicate["image_id"],
                "canonical_image_id": canonical,
                "sha256": sha,
            })

    # Near duplicate search is intentionally conservative. A 64-bit pHash distance
    # <= 6 is suspicious enough for manual review, but not safe for automatic deletion.
    candidates = [row for row in rows if row.get("perceptual_hash")]
    near: list[dict[str, str]] = []
    for i, left in enumerate(candidates):
        for right in candidates[i + 1:]:
            if left.get("sha256") == right.get("sha256"):
                continue
            distance = hamming_hex(left["perceptual_hash"], right["perceptual_hash"])
            if distance <= 6:
                near.append({
                    "image_a": left["image_id"],
                    "image_b": right["image_id"],
                    "hash_distance": str(distance),
                    "same_source": str(left.get("source_dataset") == right.get("source_dataset")).lower(),
                    "recommended_action": "manual_review",
                    "review_status": "pending",
                })

    write_csv(MANIFEST_DIR / "duplicates.csv", exact, EXACT_FIELDS)
    write_csv(MANIFEST_DIR / "near_duplicates.csv", near, NEAR_FIELDS)

    print(f"Exact duplicate records: {len(exact)}")
    print(f"Near-duplicate pairs requiring review: {len(near)}")
    print("No near duplicates were deleted automatically.")


if __name__ == "__main__":
    main()

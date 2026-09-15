from __future__ import annotations

from pathlib import Path
import csv
import hashlib
import random
import shutil

from PIL import Image

SEED = 42
TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
CLASSES = ["fresh", "ripe", "overripe", "decayed"]

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "raw" / "apple_freshness"
OUTPUT = ROOT / "data" / "processed" / "apple_freshness"
MANIFEST = ROOT / "data" / "processed" / "apple_freshness_manifest.csv"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def perceptual_hash(path: Path) -> str:
    # Lightweight average-hash used to remove visually identical copies.
    # Split originals before any augmentation; training augmentation happens later in-memory.
    with Image.open(path) as image:
        gray = image.convert("L").resize((16, 16))
        pixels = list(gray.getdata())
    mean = sum(pixels) / len(pixels)
    bits = "".join("1" if pixel >= mean else "0" for pixel in pixels)
    return f"{int(bits, 2):064x}"


def split_items(items: list[Path]) -> tuple[list[Path], list[Path], list[Path]]:
    shuffled = list(items)
    random.Random(SEED).shuffle(shuffled)
    count = len(shuffled)
    train_end = int(count * TRAIN_RATIO)
    val_end = train_end + int(count * VAL_RATIO)
    return shuffled[:train_end], shuffled[train_end:val_end], shuffled[val_end:]


def main() -> None:
    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)

    seen_sha: set[str] = set()
    seen_phash: set[str] = set()
    rows: list[dict[str, str]] = []

    for class_name in CLASSES:
        class_dir = SOURCE / class_name
        if not class_dir.exists():
            print(f"WARNING: missing source folder: {class_dir}")
            continue

        unique: list[Path] = []
        skipped = 0

        for path in sorted(class_dir.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in EXTENSIONS:
                continue

            try:
                exact = sha256(path)
                visual = perceptual_hash(path)
            except Exception as exc:
                print(f"Skipping unreadable image {path}: {exc}")
                continue

            if exact in seen_sha or visual in seen_phash:
                skipped += 1
                continue

            seen_sha.add(exact)
            seen_phash.add(visual)
            unique.append(path)

        train, val, test = split_items(unique)

        for split_name, paths in (("train", train), ("val", val), ("test", test)):
            destination_dir = OUTPUT / split_name / class_name
            destination_dir.mkdir(parents=True, exist_ok=True)

            for index, source_path in enumerate(paths):
                filename = f"{class_name}_{index:06d}{source_path.suffix.lower()}"
                destination = destination_dir / filename
                shutil.copy2(source_path, destination)
                rows.append(
                    {
                        "image_path": str(destination.relative_to(ROOT)),
                        "class": class_name,
                        "split": split_name,
                        "source_path": str(source_path.relative_to(ROOT)),
                        "sha256": sha256(source_path),
                    }
                )

        print(
            f"{class_name}: unique={len(unique)} duplicates_skipped={skipped} "
            f"train={len(train)} val={len(val)} test={len(test)}"
        )

    with MANIFEST.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["image_path", "class", "split", "source_path", "sha256"],
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote manifest: {MANIFEST}")


if __name__ == "__main__":
    main()

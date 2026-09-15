from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Iterator
import csv
import hashlib
import json
import uuid

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MANIFEST_DIR = DATA_DIR / "manifests"
ARTIFACTS_DIR = ROOT / "artifacts"

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
FRESHNESS_CLASSES = ["fresh", "ripe", "overripe", "decayed"]
DEFECT_CLASSES = [
    "apple",
    "rot",
    "mold",
    "bruise",
    "dark_spot",
    "cut",
    "crack",
    "discoloration",
    "pest_damage",
]

MASTER_MANIFEST = MANIFEST_DIR / "apple_dataset_manifest.csv"
MASTER_FIELDS = [
    "image_id",
    "original_filename",
    "current_path",
    "task",
    "source_dataset",
    "source_url",
    "license",
    "apple_variety",
    "freshness_label",
    "defect_labels",
    "annotation_status",
    "width",
    "height",
    "file_size",
    "sha256",
    "perceptual_hash",
    "split",
    "is_augmented",
    "parent_image_id",
    "rejection_reason",
    "notes",
]


def ensure_dirs() -> None:
    for path in [
        DATA_DIR / "raw" / "freshness",
        DATA_DIR / "raw" / "defects",
        DATA_DIR / "staging",
        DATA_DIR / "processed",
        DATA_DIR / "real_world_test",
        DATA_DIR / "rejected",
        MANIFEST_DIR,
        ARTIFACTS_DIR,
    ]:
        path.mkdir(parents=True, exist_ok=True)


def iter_images(root: Path) -> Iterator[Path]:
    if not root.exists():
        return
    for path in sorted(root.rglob("*")):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS:
            yield path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def phash_file(path: Path) -> str:
    """64-bit pHash using OpenCV DCT; no extra imagehash dependency required."""
    with Image.open(path) as image:
        gray = np.asarray(image.convert("L").resize((32, 32)), dtype=np.float32)
    dct = cv2.dct(gray)
    block = dct[:8, :8].copy()
    values = block.flatten()
    median = float(np.median(values[1:]))
    bits = values > median
    value = 0
    for bit in bits:
        value = (value << 1) | int(bool(bit))
    return f"{value:016x}"


def hamming_hex(a: str, b: str) -> int:
    return (int(a, 16) ^ int(b, 16)).bit_count()


@dataclass
class ImageValidation:
    valid: bool
    reason: str = ""
    width: int = 0
    height: int = 0
    file_size: int = 0


def validate_image(path: Path, minimum_size: int = 128) -> ImageValidation:
    if not path.exists() or path.stat().st_size <= 0:
        return ImageValidation(False, "empty_file")
    if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        return ImageValidation(False, "invalid_format")
    try:
        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            rgb = image.convert("RGB")
            width, height = rgb.size
    except Exception:
        return ImageValidation(False, "decode_error")
    if width < minimum_size or height < minimum_size:
        return ImageValidation(False, "too_small", width, height, path.stat().st_size)
    return ImageValidation(True, "", width, height, path.stat().st_size)


def stable_image_id(source_dataset: str, sha256: str) -> str:
    namespace = uuid.UUID("f69c8c8c-65b4-48c2-b6c6-b5e4b57dc971")
    return str(uuid.uuid5(namespace, f"{source_dataset}:{sha256}"))


def read_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: Iterable[dict], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def read_manifest() -> list[dict[str, str]]:
    return read_csv(MASTER_MANIFEST)


def write_manifest(rows: list[dict[str, str]]) -> None:
    write_csv(MASTER_MANIFEST, rows, MASTER_FIELDS)


def append_manifest(rows: list[dict[str, str]]) -> None:
    existing = read_manifest()
    by_id = {row.get("image_id", ""): row for row in existing if row.get("image_id")}
    for row in rows:
        normalized = {field: str(row.get(field, "")) for field in MASTER_FIELDS}
        by_id[normalized["image_id"]] = normalized
    write_manifest(list(by_id.values()))


def load_source_registry() -> list[dict[str, str]]:
    return read_csv(MANIFEST_DIR / "dataset_sources.csv")


def source_is_documented(dataset_name: str) -> bool:
    for row in load_source_registry():
        if row.get("dataset_name", "").strip() == dataset_name:
            return bool(row.get("license", "").strip()) and bool(row.get("source_url", "").strip())
    return False


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")

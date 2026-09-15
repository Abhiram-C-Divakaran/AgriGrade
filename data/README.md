# AgriGrade Apple dataset workflow

Large datasets and trained weights are intentionally **not committed to Git**.

Phase 3 prepares real Apple data before any model training. External data must have a documented source and license in `data/manifests/dataset_sources.csv`.

## Directory layout

```text
data/
├── raw/
│   ├── freshness/
│   └── defects/
├── staging/
├── processed/
│   ├── apple_freshness/
│   └── apple_defects/
├── real_world_test/
├── rejected/
└── manifests/
```

## Import an external dataset

```bash
python training/import_dataset.py \
  --source /path/to/dataset \
  --name dataset_name \
  --task freshness \
  --source-url https://example.com/dataset \
  --license "license-name" \
  --license-url https://example.com/license
```

For segmentation sources, use `--task defects`.

The importer validates image readability, records dimensions/file size, computes SHA256 and pHash, copies valid images to staging, and updates the master manifest.

## Import custom phone photos

```bash
python training/import_custom_images.py --source ./phone_photos --task freshness
python training/import_custom_images.py --source ./phone_photos --task defects
python training/import_custom_images.py --source ./held_out_phone_photos --task real_world_test
```

Custom photos remain unlabeled until a person reviews them.

## Freshness labels

Canonical classes are:

- `fresh`
- `ripe`
- `overripe`
- `decayed`

See `docs/DATASET_LABEL_GUIDE.md` for definitions.

## Defect segmentation

Use YOLO polygon segmentation annotations. Classes must exactly match `training/apple_defects.yaml`:

0. apple
1. rot
2. mold
3. bruise
4. dark_spot
5. cut
6. crack
7. discoloration
8. pest_damage

Every segmentation image needs an `apple` foreground polygon. Defect percentages are calculated relative to visible Apple pixels, not the full photograph.

See `docs/DEFECT_ANNOTATION_GUIDE.md`.

## Validation commands

```bash
python training/validate_images.py
python training/deduplicate.py
python training/normalize_labels.py
python training/validate_annotations.py
python training/preview_annotations.py --count 50
python training/dataset_report.py
```

Or run the conservative readiness pipeline:

```bash
python training/prepare_all_data.py
```

It exits with a non-zero status until the real dataset passes readiness checks.

## Data leakage rules

- Split original image groups before augmentation.
- Never place an original in train and a resized/rotated/augmented copy in validation or test.
- Treat near-duplicate pairs as a manual-review queue.
- Keep the `data/real_world_test/` phone-photo set completely outside training, validation, augmentation, and hyperparameter tuning.

## Do not train yet

Only start `train_freshness.py` and `train_defects.py` after `prepare_all_data.py` reports:

```text
DATASET READY FOR TRAINING: YES
```

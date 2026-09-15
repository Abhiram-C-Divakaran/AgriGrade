# AgriGrade Apple dataset layout

Large datasets and trained weights are intentionally **not committed to Git**.

## Freshness classification

Place original Apple images here before preparation:

```text
data/raw/apple_freshness/
├── fresh/
├── ripe/
├── overripe/
└── decayed/
```

Then run:

```bash
python training/prepare_classifier_dataset.py
```

The script removes exact/visually identical duplicates, then creates train/validation/test splits before augmentation.

## Defect segmentation

Use YOLO segmentation annotations, not only classification labels.

Prepared layout:

```text
data/processed/apple_defects/
├── images/
│   ├── train/
│   ├── val/
│   └── test/
└── labels/
    ├── train/
    ├── val/
    └── test/
```

Classes are defined in `training/apple_defects.yaml`:

1. apple
2. rot
3. mold
4. bruise
5. dark_spot
6. cut
7. crack
8. discoloration
9. pest_damage

Every labeled image should contain one polygon for the visible apple surface (`apple`) and polygons for every visible defect. The inference service divides defect-mask pixels by the apple-mask pixels to estimate affected surface percentage.

## Dataset rules

- Split original images before augmentation.
- Do not place rotated/cropped versions of one original across different splits.
- Keep dataset source/license metadata outside the image folders, ideally in a CSV manifest.
- Maintain a separate real-world phone-photo test set that is never used for training.
- Include healthy, mildly defective, severely rotten, moldy, bruised, low-light, bright-light and non-white-background examples.

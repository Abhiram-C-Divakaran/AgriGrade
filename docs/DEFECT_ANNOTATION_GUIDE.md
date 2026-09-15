# AgriGrade Apple Defect Annotation Guide

Use polygon segmentation labels compatible with Ultralytics YOLO segmentation.

Class order must match `training/apple_defects.yaml` exactly:

0. `apple`
1. `rot`
2. `mold`
3. `bruise`
4. `dark_spot`
5. `cut`
6. `crack`
7. `discoloration`
8. `pest_damage`

## Class definitions

### apple
The visible fruit body. This mask is the denominator for defect-area percentage. Exclude table, hand, packaging, shadows and unrelated objects.

### rot
Clearly decomposed or degraded tissue. Use for breakdown that is visually stronger than a cosmetic dark spot.

### mold
Visible mold/fungal-looking surface growth. Do not claim a specific fungal species or microbiological diagnosis.

### bruise
Localized impact damage without clear decomposition.

### dark_spot
A localized dark blemish that does not clearly meet the criteria for rot.

### cut
Open, sliced or punctured surface damage.

### crack
Visible skin/tissue splitting.

### discoloration
Abnormal color change not better represented by another defect class.

### pest_damage
Visible holes or feeding-like surface damage consistent with pest activity.

## Annotation rules

- Every defect-training image must contain at least one `apple` polygon.
- Add separate polygons for each visible defect region.
- Use the most specific correct class instead of duplicating the same region across several vague classes.
- Overlap is allowed only when visually justified.
- Do not guess unclear regions; mark the image for manual review.
- Do not include background, hand, leaf outside the fruit body, packaging, container or shadow in the apple mask.
- Keep original image groups together during splitting to prevent leakage.

## YOLO segmentation line format

Each line is:

`class_id x1 y1 x2 y2 x3 y3 ...`

Coordinates must be normalized to 0..1 and each polygon needs at least three points.

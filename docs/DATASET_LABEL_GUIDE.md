# AgriGrade Apple Freshness Label Guide

These labels describe visible condition only. They do not diagnose a pathogen or guarantee internal quality.

## fresh
- Healthy-looking surface and structure.
- No visible decay or mold-like growth.
- Minimal discoloration or shriveling.

## ripe
- Mature appearance suitable for normal consumption.
- Normal color development for the apple variety.
- No significant visible deterioration.

## overripe
- Advanced maturity with declining quality.
- May show wrinkling, softness-related appearance, strong browning or surface aging.
- Must not be used when clear decomposition or mold-like growth is visible.

## decayed
- Visible rot, mold-like growth, tissue breakdown, severe lesions or decomposition.
- Use for obviously spoiled/rotten appearance.

## Labeling rules
1. If a source label maps clearly to one category, normalize it.
2. If the meaning is ambiguous, set `needs_review` rather than guessing.
3. Keep augmented/derived versions grouped with the same original image ID.
4. Do not place near-identical images across train/validation/test.
5. Maintain a completely held-out real-world phone-photo test set.

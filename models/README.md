# Trained model files

Model weights are not committed to Git because they can be large.

After training, this directory should contain:

```text
models/
├── apple_freshness_best.pt
└── apple_defects_best.pt
```

`apple_freshness_best.pt` is produced by:

```bash
python training/train_freshness.py
```

`apple_defects_best.pt` is produced by:

```bash
python training/train_defects.py
```

The FastAPI service reports `ai_ready: false` until both files are present and load successfully.

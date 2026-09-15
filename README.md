# AgriGrade AI

AgriGrade is a fruit and vegetable quality-grading web application. The frontend is React/Vite, the web API is Express/TypeScript, and the Apple ML path uses a Python FastAPI service with EfficientNet-B0 freshness classification and YOLO11 segmentation.

## Architecture

```text
Browser
  -> Express /api/analyze
     -> Gemini prototype (ANALYSIS_PROVIDER=gemini)
     OR
     -> Python FastAPI ML service (ANALYSIS_PROVIDER=ml)
        -> EfficientNet-B0 freshness model
        -> YOLO11 Apple/defect segmentation
        -> explainable scoring engine
```

## Current project phase

Phase 1: backend/API readiness — complete.

Phase 2: Apple ML training and inference architecture — complete.

Phase 3: real Apple dataset ingestion, cleaning, manifests, annotation QA and readiness checks — in progress.

The repository does not contain large datasets or trained `.pt` files. The ML service intentionally reports `ai_ready: false` until both trained models exist and load successfully.

## Run the web application

```bash
npm install
npm run dev
```

Default URL: `http://localhost:3000`.

## Run the Python ML service

```bash
pip install -r ml_backend/requirements.txt
uvicorn ml_backend.main:app --reload --host 0.0.0.0 --port 8000
```

Health check: `http://localhost:8000/health`.

## Phase 3 — prepare the Apple dataset first

Do not start final model training until the dataset passes validation.

Import a licensed dataset:

```bash
python training/import_dataset.py \
  --source /path/to/dataset \
  --name dataset_name \
  --task freshness \
  --source-url https://example.com/dataset \
  --license "license-name"
```

For segmentation data use `--task defects`.

Import custom phone photos:

```bash
python training/import_custom_images.py --source ./phone_photos --task freshness
python training/import_custom_images.py --source ./held_out_photos --task real_world_test
```

Run QA/readiness:

```bash
python training/validate_images.py
python training/deduplicate.py
python training/normalize_labels.py
python training/validate_annotations.py
python training/preview_annotations.py --count 50
python training/dataset_report.py
python training/prepare_all_data.py
```

Only move to training when the final command reports:

```text
DATASET READY FOR TRAINING: YES
```

Dataset and annotation rules are documented in:

- `data/README.md`
- `docs/DATASET_LABEL_GUIDE.md`
- `docs/DEFECT_ANNOTATION_GUIDE.md`

## Train Apple freshness after Phase 3 passes

```bash
python training/prepare_classifier_dataset.py
python training/train_freshness.py
python training/evaluate_freshness.py
```

Output: `models/apple_freshness_best.pt`.

## Train Apple defect segmentation after Phase 3 passes

```bash
python training/train_defects.py
```

Output: `models/apple_defects_best.pt`.

## Switch the website to trained ML

```env
ANALYSIS_PROVIDER=ml
ML_API_URL=http://localhost:8000
PORT=3000
VITE_API_URL=
```

For the Gemini prototype instead:

```env
ANALYSIS_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
```

## Current ML scope

The trained ML path is Apple-first. Other produce types should remain on the prototype path or be disabled until produce-specific datasets and models are available.

Never commit raw datasets, API keys, training runs, or trained model weights.

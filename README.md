# AgriGrade AI

AgriGrade is a fruit and vegetable quality-grading web application. The current UI is React/Vite, the web API is Express/TypeScript, and this branch adds the first real Apple ML pipeline using EfficientNet and YOLO segmentation.

## Architecture

```text
Browser
  -> Express /api/analyze
     -> Gemini prototype (ANALYSIS_PROVIDER=gemini)
     OR
     -> Python FastAPI ML service (ANALYSIS_PROVIDER=ml)
        -> EfficientNet-B0 freshness model
        -> YOLO11 segmentation model
        -> explainable scoring engine
```

## Run the existing web application

```bash
npm install
npm run dev
```

The web app runs on `http://localhost:3000` by default.

## Run the Python ML service

Create and activate a Python virtual environment, then install:

```bash
pip install -r ml_backend/requirements.txt
```

Start the service:

```bash
uvicorn ml_backend.main:app --reload --host 0.0.0.0 --port 8000
```

Health check:

```text
http://localhost:8000/health
```

Before trained weights exist, the service intentionally reports `ai_ready: false` instead of fabricating predictions.

## Train Apple freshness

Prepare original images as:

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
python training/train_freshness.py
python training/evaluate_freshness.py
```

Output:

```text
models/apple_freshness_best.pt
```

## Train Apple defect segmentation

Annotate Apple images using YOLO segmentation. Each image should contain an `apple` polygon and any visible defect polygons.

Classes are defined in `training/apple_defects.yaml`.

Then run:

```bash
python training/train_defects.py
```

Output:

```text
models/apple_defects_best.pt
```

## Switch the website to the trained ML pipeline

In `.env`:

```env
ANALYSIS_PROVIDER=ml
ML_API_URL=http://localhost:8000
PORT=3000
VITE_API_URL=
```

Restart both services. The Express `/api/health` endpoint will only report the AI as ready when the FastAPI service is reachable and both trained model files load successfully.

To keep using the Gemini prototype instead:

```env
ANALYSIS_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
```

## Current ML scope

The trained pipeline currently supports **Apple only**. Other produce types should remain on the Gemini prototype or be disabled until produce-specific training data and models are added.

Large datasets, training runs and model weights are ignored by Git and should not be committed.

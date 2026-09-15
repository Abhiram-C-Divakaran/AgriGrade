from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .analyzer import analyze_image, model_status

app = FastAPI(title="AgriGrade Apple ML API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_BYTES = 10 * 1024 * 1024


def _health_response():
    models = model_status()
    payload = {
        "status": "ok" if models["ready"] else "degraded",
        "service": "AgriGrade Apple ML",
        "ai_ready": models["ready"],
        "models": models,
    }
    return JSONResponse(content=payload, status_code=200 if models["ready"] else 503)


@app.get("/health")
def health():
    return _health_response()


@app.get("/api/health")
def api_health():
    return _health_response()


@app.post("/api/analyze")
async def analyze(
    image: UploadFile = File(...),
    produce_type: str = Form(...),
):
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported image format. Use JPG, PNG, or WEBP.",
        )

    contents = await image.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty image file.")

    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Image exceeds 10 MB.")

    try:
        result = analyze_image(contents, produce_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not result.get("success"):
        error = result.get("error")
        if error == "MODEL_NOT_AVAILABLE":
            raise HTTPException(status_code=503, detail=result["message"])
        if error == "UNSUPPORTED_PRODUCE":
            raise HTTPException(status_code=422, detail=result["message"])
        raise HTTPException(status_code=500, detail=result.get("message", "Analysis failed."))

    return result

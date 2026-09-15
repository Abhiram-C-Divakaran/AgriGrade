import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim();
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const VALID_GRADES = new Set(["A", "B", "C", "D", "Reject"]);
const VALID_RIPENESS = new Set(["Unripe", "Nearly Ripe", "Ripe", "Overripe", "Decayed"]);
const VALID_SEVERITIES = new Set(["low", "medium", "high"]);

type Severity = "low" | "medium" | "high";

type DefectResult = {
  type: string;
  confidence: number;
  severity: Severity;
  affected_area_percent: number;
  bbox?: [number, number, number, number];
};

type AnalysisResult = {
  success: true;
  ai_available: true;
  produce: string;
  quality_score: number;
  grade: "A" | "B" | "C" | "D" | "Reject";
  ripeness: {
    stage: string;
    confidence: number;
  };
  defects: DefectResult[];
  total_defect_area_percent: number;
  recommendation: string;
  model_confidence: number;
  explanation: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Invalid model response: ${field} must be a non-empty string.`);
  }
  return value.trim();
}

function requireNumber(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid model response: ${field} must be a number between ${min} and ${max}.`);
  }
  return value;
}

function gradeFromScore(score: number): AnalysisResult["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  if (score >= 30) return "D";
  return "Reject";
}

function validateModelResult(raw: unknown): AnalysisResult {
  if (!isRecord(raw)) {
    throw new Error("Invalid model response: expected a JSON object.");
  }

  const produce = requireString(raw.produce, "produce");
  let qualityScore = Math.round(requireNumber(raw.quality_score, "quality_score", 0, 100));

  const rawGrade = requireString(raw.grade, "grade");
  if (!VALID_GRADES.has(rawGrade)) {
    throw new Error("Invalid model response: grade is not recognized.");
  }

  if (!isRecord(raw.ripeness)) {
    throw new Error("Invalid model response: ripeness is missing.");
  }

  const ripenessStage = requireString(raw.ripeness.stage, "ripeness.stage");
  if (!VALID_RIPENESS.has(ripenessStage)) {
    throw new Error("Invalid model response: ripeness.stage is not recognized.");
  }

  const ripenessConfidence = requireNumber(raw.ripeness.confidence, "ripeness.confidence", 0, 1);

  if (!Array.isArray(raw.defects)) {
    throw new Error("Invalid model response: defects must be an array.");
  }

  const defects: DefectResult[] = raw.defects.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Invalid model response: defects[${index}] must be an object.`);
    }

    const type = requireString(item.type, `defects[${index}].type`);
    const confidence = requireNumber(item.confidence, `defects[${index}].confidence`, 0, 1);
    const severity = requireString(item.severity, `defects[${index}].severity`);

    if (!VALID_SEVERITIES.has(severity)) {
      throw new Error(`Invalid model response: defects[${index}].severity is not recognized.`);
    }

    const affectedAreaPercent = requireNumber(
      item.affected_area_percent,
      `defects[${index}].affected_area_percent`,
      0,
      100,
    );

    let bbox: [number, number, number, number] | undefined;
    if (item.bbox !== undefined && item.bbox !== null) {
      if (!Array.isArray(item.bbox) || item.bbox.length !== 4) {
        throw new Error(`Invalid model response: defects[${index}].bbox must contain four coordinates.`);
      }

      const coordinates = item.bbox.map((value, coordinateIndex) =>
        requireNumber(value, `defects[${index}].bbox[${coordinateIndex}]`, 0, 1000),
      );
      bbox = coordinates as [number, number, number, number];
    }

    return {
      type,
      confidence,
      severity: severity as Severity,
      affected_area_percent: affectedAreaPercent,
      ...(bbox ? { bbox } : {}),
    };
  });

  const totalDefectAreaPercent = requireNumber(
    raw.total_defect_area_percent,
    "total_defect_area_percent",
    0,
    100,
  );

  const recommendation = requireString(raw.recommendation, "recommendation");
  const modelConfidence = requireNumber(raw.model_confidence, "model_confidence", 0, 1);
  const explanation = requireString(raw.explanation, "explanation");

  const severeDefect = defects.some((defect) => defect.severity === "high");
  const severeRotOrMold = defects.some((defect) => {
    const type = defect.type.toLowerCase();
    return (
      (type.includes("rot") || type.includes("mold") || type.includes("decay")) &&
      (defect.severity === "high" || defect.affected_area_percent >= 10)
    );
  });

  // Keep the final numeric score and grade internally consistent.
  if (severeRotOrMold || totalDefectAreaPercent > 20) {
    qualityScore = Math.min(qualityScore, 29);
  } else if (severeDefect) {
    qualityScore = Math.min(qualityScore, 54);
  }

  return {
    success: true,
    ai_available: true,
    produce,
    quality_score: qualityScore,
    grade: gradeFromScore(qualityScore),
    ripeness: {
      stage: ripenessStage,
      confidence: ripenessConfidence,
    },
    defects,
    total_defect_area_percent: totalDefectAreaPercent,
    recommendation,
    model_confidence: modelConfidence,
    explanation,
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    const aiReady = Boolean(ai);

    return res.status(aiReady ? 200 : 503).json({
      status: aiReady ? "ok" : "degraded",
      service: "AgriGrade AI",
      ai_ready: aiReady,
      message: aiReady
        ? "Gemini image analysis is configured."
        : "GEMINI_API_KEY is missing. Configure it before using image analysis.",
    });
  });

  app.post(
    "/api/analyze",
    (req, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ error: "Image is too large." });
          }
          return res.status(400).json({ error: err.message });
        }
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        next();
      });
    },
    async (req, res) => {
      try {
        if (!ai) {
          return res.status(503).json({
            error: "AI_NOT_CONFIGURED",
            details: "GEMINI_API_KEY is missing. Add it to your environment and restart the server.",
          });
        }

        const file = req.file;
        const produceType = String(req.body.produce_type || "produce").trim().toLowerCase();

        if (!file) {
          return res.status(400).json({ error: "No image provided" });
        }

        const validMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!validMimeTypes.includes(file.mimetype)) {
          return res.status(415).json({ error: "Unsupported image format." });
        }

        const base64Data = file.buffer.toString("base64");

        const prompt = `
Analyze this image of a ${produceType} for quality grading.
Focus strictly on identifying defects like rot, mold, bruises, dark spots, cuts, cracks, skin discoloration, pest damage, deformation, and ripeness.
CRITICAL INSTRUCTION: If you see rot, mold, or severe decay, the quality score MUST be low (e.g., < 50) and the grade MUST be D or Reject. A rotten apple should NEVER get an A or B score. Penalize heavily for structural breakdown.
Do NOT classify every tiny dark region as a bruise, but DO penalize actual rot heavily.

Return a structured JSON output exactly matching the following schema.
Do NOT output any markdown blocks or backticks, just the raw JSON.

{
  "success": true,
  "ai_available": true,
  "produce": "string",
  "quality_score": number (0-100),
  "grade": "string" (A, B, C, D, or Reject),
  "ripeness": {
    "stage": "string" (Unripe, Nearly Ripe, Ripe, Overripe, Decayed),
    "confidence": number (0.0 to 1.0)
  },
  "defects": [
    {
      "type": "string" (e.g., rot, mold, bruise, dark spot, cut, crack, discoloration, pest damage),
      "confidence": number (0.0 to 1.0),
      "severity": "string" (low, medium, high),
      "affected_area_percent": number,
      "bbox": [x1, y1, x2, y2] (coordinates out of 1000 for width/height relative percentages, or estimate)
    }
  ],
  "total_defect_area_percent": number,
  "recommendation": "string",
  "model_confidence": number (0.0 to 1.0),
  "explanation": "string"
}

Scoring guide:
Start at 100.
Minor cosmetic spot: -1 to -3
Minor bruise: -3 to -8
Moderate bruising: -8 to -15
Discoloration: -5 to -15
Crack/cut: -5 to -20
Pest damage: -10 to -25
Rot: -20 to -60
Mold: -25 to -70
If extensive rot/mold is detected, cap score at <= 29.

Grades:
A = 90-100
B = 75-89
C = 55-74
D = 30-54
Reject = 0-29

Make sure total_defect_area_percent reflects reality based on the image.
`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: file.mimetype,
                  },
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
            safetySettings: [
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            ],
          },
        });

        const responseText = response.text;
        if (!responseText) {
          throw new Error("Model response was empty or blocked by safety filters.");
        }

        let parsed: unknown;
        try {
          const cleanedText = responseText.replace(/```json\n?|```/g, "").trim();
          parsed = JSON.parse(cleanedText);
        } catch {
          console.error("Failed to parse Gemini JSON:", responseText.substring(0, 500));
          return res.status(502).json({
            error: "INVALID_AI_RESPONSE",
            details: "Gemini returned malformed JSON. Please retry the analysis.",
          });
        }

        let result: AnalysisResult;
        try {
          result = validateModelResult(parsed);
        } catch (validationError: any) {
          console.error("Invalid Gemini response shape:", validationError.message, parsed);
          return res.status(502).json({
            error: "INVALID_AI_RESPONSE",
            details: validationError.message,
          });
        }

        return res.json(result);
      } catch (error: any) {
        console.error("Analysis error:", error);
        return res.status(500).json({
          error: "The AI server encountered an error while processing this image.",
          details: error?.message || "Unknown analysis error",
        });
      }
    },
  );

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Gemini configured: ${Boolean(ai)}`);
  });
}

startServer();

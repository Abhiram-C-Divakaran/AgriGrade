import express from "express";
import path from "path";
import multer from "multer";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

// Ensure AI Studio API key works properly
const ai = new GoogleGenAI(process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {});

// 10MB limit
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 } 
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "AgriGrade AI"
    });
  });

  app.post("/api/analyze", (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: "Image is too large." });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: err.message });
      }
      next();
    });
  }, async (req, res) => {
    try {
      const file = req.file;
      const produceType = req.body.produce_type || "produce";

      if (!file) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Check format
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validMimeTypes.includes(file.mimetype)) {
        return res.status(415).json({ error: "Unsupported image format." });
      }

      // Convert buffer to base64
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
If extensive rot/mold is detected, cap score at <= 30.

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
          ]
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Model response was empty or blocked by safety filters.");
      }

      // Parse JSON
      let result;
      try {
        const cleanedText = responseText.replace(/```json\n?|```/g, '').trim();
        result = JSON.parse(cleanedText);
        
        // Force-correct the grade if severe defects are found but the AI hallucinated a high score
        const hasSevere = result.defects?.some((d: any) => 
          d.severity === 'high' || 
          d.type.toLowerCase().includes('rot') || 
          d.type.toLowerCase().includes('mold') ||
          d.type.toLowerCase().includes('decay')
        );
        
        if (hasSevere || (result.total_defect_area_percent && result.total_defect_area_percent > 20)) {
          if (result.quality_score > 50) {
            result.quality_score = 30; // Override
          }
          if (['A', 'B', 'C'].includes(result.grade)) {
            result.grade = 'Reject';
          }
        }
        
      } catch (e) {
        console.error("Failed to parse JSON:", responseText);
        return res.status(500).json({ error: "Failed to parse model response", details: responseText.substring(0, 200) });
      }

      res.json(result);
      
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "The AI server encountered an error while processing this image.", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

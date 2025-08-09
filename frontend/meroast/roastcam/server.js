// Route to list available Gemini models for the current API key

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// const app = express();
const app = express();
const upload = multer({ dest: "uploads/" });
app.get("/models", async (req, res) => {
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Failed to fetch models" });
  }
});

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error("❌ Missing GEMINI_API_KEY. Add it to .env or export it in your shell.");
  // Show all env keys for debugging
  console.error("Current env keys:", Object.keys(process.env));
  throw new Error("Missing GEMINI_API_KEY. Check your .env file and restart the server.");
} else {
  console.log("✅ GEMINI_API_KEY loaded. Length:", GEMINI_API_KEY.length);
}

app.use(express.static("public"));

app.post("/roast", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No photo uploaded" });

  try {
    const imageBytes = fs.readFileSync(req.file.path);
    const base64Image = imageBytes.toString("base64");

    const prompt = "Roast this person's photo in a short, funny, savage way (<= 12 words). Playful, not hateful.";

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/png", data: base64Image } }
          ]
        }
      ]
    };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-002:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }
    );

    const data = await resp.json();
    // Debug: log the full Gemini API response
    console.log("Gemini API response:", JSON.stringify(data, null, 2));

    // Try a few places for the returned text depending on response shape
    const roast =
      data?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text?.trim() ||
      data?.candidates?.[0]?.content?.text?.trim?.() ||
      data?.output?.[0]?.content?.[0]?.text?.trim?.() ||
      "Couldn't roast you 🤷";

    // cleanup uploaded file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({ roast });
  } catch (err) {
    console.error("Server error:", err);
    try { if (req.file) fs.unlinkSync(req.file.path); } catch (e) {}
    res.status(500).json({ error: err.message || "Server error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

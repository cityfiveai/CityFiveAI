const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    name: "CityFive AI",
    status: "Backend is running"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL;
    const apiUrl = process.env.AI_API_URL;

    if (!apiKey || !model || !apiUrl) {
      return res.status(503).json({
        error: "AI service is not connected yet."
      });
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "user", content: message }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: "The AI provider returned an error."
      });
    }

    res.json({
      reply: data.choices?.[0]?.message?.content || "No response received."
    });

  } catch (error) {
    res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CityFive AI server running on port ${PORT}`);
});

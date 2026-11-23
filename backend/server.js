const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "CityFive AI",
    status: "Backend is running"
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, messages } = req.body;

    let chatMessages;

    if (Array.isArray(messages) && messages.length > 0) {
      chatMessages = messages
        .filter(item =>
          item &&
          ["user", "assistant"].includes(item.role) &&
          typeof item.content === "string" &&
          item.content.trim()
        )
        .slice(-20)
        .map(item => ({
          role: item.role,
          content: item.content.trim()
        }));
    } else if (typeof message === "string" && message.trim()) {
      chatMessages = [
        { role: "user", content: message.trim() }
      ];
    } else {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (chatMessages.length === 0 ||
        chatMessages[chatMessages.length - 1].role !== "user") {
      return res.status(400).json({
        error: "Please send a valid user message."
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
        messages: chatMessages
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


app.post("/api/video/generate", async (req, res) => {
  try {
    const { prompt, aspect_ratio = "16:9" } = req.body;
    const apiKey = process.env.AGNES_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ error: "Video service is not configured." });
    }

    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ error: "Please enter a video prompt." });
    }

    if (prompt.length > 4000) {
      return res.status(400).json({ error: "Video prompt is too long." });
    }

    const allowedRatios = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];

    if (!allowedRatios.includes(aspect_ratio)) {
      return res.status(400).json({ error: "Invalid video aspect ratio." });
    }

    const response = await fetch("https://apihub.agnes-ai.com/v1/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "agnes-video-2.5-flash",
        prompt: prompt.trim(),
        mode: "text",
        seconds: "12",
        size: "720P",
        aspect_ratio,
        n: 1
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Agnes video request failed:", response.status, data);
      return res.status(502).json({
        error: "Agnes could not accept the video request. Please try again later."
      });
    }

    const videoId = data.video_id || data.id;

    if (!videoId) {
      console.error("Agnes response did not contain a video ID:", data);
      return res.status(502).json({ error: "No video task ID was returned." });
    }

    res.json({
      success: true,
      video_id: videoId,
      model: "agnes-video-2.5-flash",
      message: "Video generation started."
    });
  } catch (error) {
    console.error("Video generation error:", error.message);
    res.status(500).json({ error: "Could not start video generation." });
  }
});

app.get("/api/video/status/:videoId", async (req, res) => {
  try {
    const apiKey = process.env.AGNES_API_KEY;
    const videoId = req.params.videoId;

    if (!apiKey) {
      return res.status(503).json({ error: "Video service is not configured." });
    }

    const url = new URL("https://apihub.agnes-ai.com/agnesapi");
    url.searchParams.set("video_id", videoId);
    url.searchParams.set("model_name", "agnes-video-2.5-flash");

    const response = await fetch(url, {
      headers: { "Authorization": `Bearer ${apiKey}` }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Agnes video status failed:", response.status, data);
      return res.status(502).json({ error: "Could not check video status." });
    }

    res.json({
      status: data.status || "processing",
      video_url: data.url || null
    });
  } catch (error) {
    console.error("Video status error:", error.message);
    res.status(500).json({ error: "Could not check video status." });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CityFive AI server running on port ${PORT}`);
});

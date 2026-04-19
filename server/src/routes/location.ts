import { Router } from "express";

const router = Router();

router.get("/reverse", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      res.status(400).json({
        success: false,
        error: "Invalid coordinates",
      });
      return;
    }

    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=de&format=json`;
    const response = await fetch(url);

    if (!response.ok) {
      const text = await response.text();
      console.error("Reverse geocoding failed:", response.status, text);

      res.json({
        success: true,
        data: { city: "" },
      });
      return;
    }

    const data = await response.json();
    const city = data?.results?.[0]?.name ?? "";

    res.json({
      success: true,
      data: { city },
    });
  } catch (error) {
    console.error("GET /api/location/reverse error:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
});

export default router;

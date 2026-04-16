export default async function handler(req, res) {
  try {
    const apiKey = process.env.FRED_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "FRED_API_KEY fehlt in Vercel",
      });
    }

    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${apiKey}&file_type=json&limit=5&sort_order=desc`;

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json({
      ok: true,
      source: "FRED",
      series: "FEDFUNDS",
      sample: data,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}

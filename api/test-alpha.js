export default async function handler(req, res) {
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        error: "ALPHA_VANTAGE_API_KEY fehlt in Vercel",
      });
    }

    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=IBM&apikey=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    return res.status(200).json({
      ok: true,
      source: "Alpha Vantage",
      sample: data,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}

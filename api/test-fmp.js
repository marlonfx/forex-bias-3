export default async function handler(req, res) {
    try {
      const apiKey = process.env.FMP_API_KEY;
  
      if (!apiKey) {
        return res.status(500).json({
          ok: false,
          error: "FMP_API_KEY fehlt in Vercel",
        });
      }
  
      const url =
        `https://financialmodelingprep.com/api/v3/economic_calendar?` +
        `from=2024-01-01&to=2024-01-10&apikey=${apiKey}`;
  
      const response = await fetch(url);
      const data = await response.json();
  
      return res.status(200).json({
        ok: true,
        message: "FMP Verbindung funktioniert",
        count: Array.isArray(data) ? data.length : 0,
        sample: Array.isArray(data) ? data.slice(0, 3) : data,
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        error: error.message,
      });
    }
  }
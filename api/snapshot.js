function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function todayString() {
  return formatDate(new Date());
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  return data;
}

function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function percentChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

async function getFredObservations(seriesId, apiKey, observationEnd, limit = 5) {
  const url =
    `https://api.stlouisfed.org/fred/series/observations` +
    `?series_id=${seriesId}` +
    `&api_key=${apiKey}` +
    `&file_type=json` +
    `&observation_end=${observationEnd}` +
    `&sort_order=desc` +
    `&limit=${limit}`;

  const data = await fetchJson(url);
  return Array.isArray(data.observations) ? data.observations : [];
}

async function getLatestFredValue(seriesId, apiKey, observationEnd) {
  const observations = await getFredObservations(seriesId, apiKey, observationEnd, 10);
  const firstValid = observations.find((o) => o.value !== ".");
  return firstValid ? safeNumber(firstValid.value) : null;
}

async function getUsCpiYoY(apiKey, observationEnd) {
  const observations = await getFredObservations("CPIAUCSL", apiKey, observationEnd, 13);
  const valid = observations.filter((o) => o.value !== ".");

  if (valid.length < 13) return null;

  const latest = safeNumber(valid[0].value);
  const oneYearAgo = safeNumber(valid[12].value);

  return percentChange(latest, oneYearAgo);
}

async function getAlphaDailyAdjusted(symbol, apiKey) {
  const url =
    `https://www.alphavantage.co/query` +
    `?function=TIME_SERIES_DAILY_ADJUSTED` +
    `&symbol=${symbol}` +
    `&outputsize=full` +
    `&apikey=${apiKey}`;

  const data = await fetchJson(url);

  if (data["Time Series (Daily)"]) {
    return data["Time Series (Daily)"];
  }

  throw new Error(
    `Alpha Vantage Fehler für ${symbol}: ` + JSON.stringify(data)
  );
}

function getSeriesEntriesOnOrBefore(series, targetDate) {
  return Object.entries(series)
    .filter(([date]) => date <= targetDate)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function getAdjustedClose(entry) {
  return safeNumber(entry?.["5. adjusted close"]);
}

function getChangeFromTradingDays(series, targetDate, daysBack) {
  const entries = getSeriesEntriesOnOrBefore(series, targetDate);

  if (entries.length <= daysBack) return 0;

  const current = getAdjustedClose(entries[0][1]);
  const previous = getAdjustedClose(entries[daysBack][1]);

  return percentChange(current, previous);
}

export default async function handler(req, res) {
  try {
    const fredKey = process.env.FRED_API_KEY;
    const alphaKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!fredKey) {
      return res.status(500).json({
        ok: false,
        error: "FRED_API_KEY fehlt in Vercel",
      });
    }

    if (!alphaKey) {
      return res.status(500).json({
        ok: false,
        error: "ALPHA_VANTAGE_API_KEY fehlt in Vercel",
      });
    }

    const date = req.query.date || todayString();

    const policyRate = await getLatestFredValue("FEDFUNDS", fredKey, date);
    const yield2y = await getLatestFredValue("DGS2", fredKey, date);
    const yield10y = await getLatestFredValue("DGS10", fredKey, date);
    const cpiActual = await getUsCpiYoY(fredKey, date);

    const spySeries = await getAlphaDailyAdjusted("SPY", alphaKey);
    const uupSeries = await getAlphaDailyAdjusted("UUP", alphaKey);
    const usoSeries = await getAlphaDailyAdjusted("USO", alphaKey);

    const spx1mChange = getChangeFromTradingDays(spySeries, date, 21);
    const usdIndexProxy1mChange = getChangeFromTradingDays(uupSeries, date, 21);
    const oil3mChange = getChangeFromTradingDays(usoSeries, date, 63);

    return res.status(200).json({
      ok: true,
      snapshot: {
        meta: {
          name: `API Snapshot ${date}`,
          snapshotDate: date,
        },
        global: {
          spx1mChange,
          oil3mChange,
          usdIndexProxy1mChange,
          vix: 18,
        },
        currencies: {
          USD: {
            policyRate: policyRate ?? 0,
            cpiActual: cpiActual ?? 0,
            yield2y: yield2y ?? 0,
            yield10y: yield10y ?? 0,
            cotPercentile: 50,
            seasonalityScore: 0,
          },
        },
      },
      debug: {
        source: {
          rates: "FRED",
          prices: "Alpha Vantage",
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
}

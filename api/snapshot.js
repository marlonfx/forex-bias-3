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
    `Alpha Vantage Fehler für ${symbol}: ` +
      JSON.stringify(data)
  );
}

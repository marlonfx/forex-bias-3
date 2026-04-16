import React, { useEffect, useMemo, useRef, useState } from "react";

const CURRENCIES = ["USD", "EUR", "JPY", "GBP", "AUD", "NZD", "CAD", "CHF"];
const STORAGE_KEY = "forex_macro_bias_manual_import_ready_v1";

const FIELD_META = {
  global: {
    spx1mChange: { label: "SPX 1M Change (%)", step: 0.1 },
    dxy1mChange: { label: "DXY 1M Change (%)", step: 0.1 },
    oil3mChange: { label: "Oil 3M Change (%)", step: 0.1 },
    vix: { label: "VIX", step: 0.1 },
  },
  currency: {
    cpiActual: { label: "CPI Actual", step: 0.1 },
    cpiForecast: { label: "CPI Forecast", step: 0.1 },
    cpiPrevious: { label: "CPI Previous", step: 0.1 },
    rateActual: { label: "Rate Actual", step: 0.1 },
    rateForecast: { label: "Rate Forecast", step: 0.1 },
    ratePrevious: { label: "Rate Previous", step: 0.1 },
    pmiActual: { label: "PMI Actual", step: 0.1 },
    pmiForecast: { label: "PMI Forecast", step: 0.1 },
    pmiPrevious: { label: "PMI Previous", step: 0.1 },
    yield2y: { label: "2Y Yield", step: 0.01 },
    yield10y: { label: "10Y Yield", step: 0.01 },
    cotPercentile: { label: "COT Percentile", step: 1, min: 0, max: 100 },
    eventRisk: { label: "Event Risk", step: 1, min: 0, max: 10 },
    seasonality: { label: "Seasonality (-1 bis 1)", step: 0.1, min: -1, max: 1 },
  },
};

const FACTOR_CONFIG = {
  inflationSurprise: { label: "Inflation Surprise", baseWeight: 1.3, group: "Inflation" },
  inflationTrend: { label: "Inflation Trend", baseWeight: 0.8, group: "Inflation" },
  rateLevel: { label: "Rate Level", baseWeight: 1.8, group: "Rates" },
  rateSurprise: { label: "Rate Surprise", baseWeight: 1.2, group: "Rates" },
  growthMomentum: { label: "PMI/Growth", baseWeight: 1.4, group: "Growth" },
  bondConfirmation: { label: "Bond Confirmation", baseWeight: 1.5, group: "Bonds" },
  riskSentiment: { label: "Risk Sentiment", baseWeight: 1.25, group: "Risk" },
  commodityLinkage: { label: "Commodity Linkage", baseWeight: 1.0, group: "Commodities" },
  cotPositioning: { label: "COT Positioning", baseWeight: 1.0, group: "Flow" },
  seasonality: { label: "Seasonality", baseWeight: 0.5, group: "Context" },
  eventRisk: { label: "Event Risk", baseWeight: 0.75, group: "Risk" },
};

const FACTOR_KEYS = Object.keys(FACTOR_CONFIG);

const CURRENCY_MODIFIERS = {
  USD: { rateLevel: 1.1, bondConfirmation: 1.2, riskSentiment: 1.05 },
  EUR: { growthMomentum: 1.05, bondConfirmation: 1.05 },
  JPY: { rateLevel: 1.2, riskSentiment: 1.45, cotPositioning: 1.1 },
  GBP: { inflationSurprise: 1.05, rateSurprise: 1.05 },
  AUD: { riskSentiment: 1.3, commodityLinkage: 1.35, seasonality: 1.1 },
  NZD: { riskSentiment: 1.2, commodityLinkage: 1.15, seasonality: 1.1 },
  CAD: { riskSentiment: 1.15, commodityLinkage: 1.45, bondConfirmation: 1.05 },
  CHF: { riskSentiment: 1.3, cotPositioning: 0.9, seasonality: 0.85 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function createCurrencyTemplate(overrides = {}) {
  return {
    cpiActual: 0,
    cpiForecast: 0,
    cpiPrevious: 0,
    rateActual: 0,
    rateForecast: 0,
    ratePrevious: 0,
    pmiActual: 50,
    pmiForecast: 50,
    pmiPrevious: 50,
    yield2y: 0,
    yield10y: 0,
    cotPercentile: 50,
    eventRisk: 0,
    seasonality: 0,
    ...overrides,
  };
}

function createSnapshot(name, date, category = "live", overrides = {}) {
  return {
    meta: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      snapshotDate: date,
      category,
      notes: "",
      archivedAt: null,
      importedFrom: null,
    },
    global: {
      spx1mChange: 0,
      dxy1mChange: 0,
      oil3mChange: 0,
      vix: 18,
      ...overrides.global,
    },
    currencies: {
      USD: createCurrencyTemplate({ cpiActual: 3.2, cpiForecast: 3.1, cpiPrevious: 3.3, rateActual: 5.25, rateForecast: 5.25, ratePrevious: 5.0, pmiActual: 52.1, pmiForecast: 51.5, pmiPrevious: 50.8, yield2y: 4.85, yield10y: 4.2, cotPercentile: 72, eventRisk: 3, seasonality: 0.2 }),
      EUR: createCurrencyTemplate({ cpiActual: 2.6, cpiForecast: 2.5, cpiPrevious: 2.4, rateActual: 4.0, rateForecast: 4.0, ratePrevious: 4.0, pmiActual: 48.9, pmiForecast: 49.3, pmiPrevious: 49.0, yield2y: 2.6, yield10y: 2.35, cotPercentile: 48, eventRisk: 2, seasonality: 0 }),
      JPY: createCurrencyTemplate({ cpiActual: 2.7, cpiForecast: 2.6, cpiPrevious: 2.8, rateActual: 0.1, rateForecast: 0.1, ratePrevious: 0.1, pmiActual: 49.1, pmiForecast: 49.4, pmiPrevious: 48.7, yield2y: 0.35, yield10y: 1.05, cotPercentile: 22, eventRisk: 2, seasonality: 0.5 }),
      GBP: createCurrencyTemplate({ cpiActual: 3.4, cpiForecast: 3.2, cpiPrevious: 3.2, rateActual: 5.25, rateForecast: 5.25, ratePrevious: 5.25, pmiActual: 51.0, pmiForecast: 50.6, pmiPrevious: 50.3, yield2y: 4.35, yield10y: 4.05, cotPercentile: 44, eventRisk: 2, seasonality: 0 }),
      AUD: createCurrencyTemplate({ cpiActual: 3.6, cpiForecast: 3.5, cpiPrevious: 3.4, rateActual: 4.35, rateForecast: 4.35, ratePrevious: 4.35, pmiActual: 50.3, pmiForecast: 49.9, pmiPrevious: 49.7, yield2y: 3.85, yield10y: 4.12, cotPercentile: 28, eventRisk: 2, seasonality: 0.4 }),
      NZD: createCurrencyTemplate({ cpiActual: 4.0, cpiForecast: 3.8, cpiPrevious: 4.1, rateActual: 5.5, rateForecast: 5.5, ratePrevious: 5.5, pmiActual: 47.8, pmiForecast: 48.4, pmiPrevious: 48.9, yield2y: 4.55, yield10y: 4.45, cotPercentile: 34, eventRisk: 1, seasonality: 0.3 }),
      CAD: createCurrencyTemplate({ cpiActual: 2.9, cpiForecast: 2.8, cpiPrevious: 2.9, rateActual: 5.0, rateForecast: 5.0, ratePrevious: 5.0, pmiActual: 51.2, pmiForecast: 50.8, pmiPrevious: 50.5, yield2y: 3.9, yield10y: 3.55, cotPercentile: 31, eventRisk: 2, seasonality: 0.4 }),
      CHF: createCurrencyTemplate({ cpiActual: 1.3, cpiForecast: 1.2, cpiPrevious: 1.4, rateActual: 1.5, rateForecast: 1.5, ratePrevious: 1.75, pmiActual: 46.4, pmiForecast: 47.1, pmiPrevious: 47.2, yield2y: 0.72, yield10y: 0.82, cotPercentile: 62, eventRisk: 1, seasonality: -0.3 }),
      ...overrides.currencies,
    },
  };
}

const LIVE_DEFAULT = createSnapshot("Live Snapshot", "2026-04-15", "live", {
  global: { spx1mChange: 2.4, dxy1mChange: 0.6, oil3mChange: 5.2, vix: 17.8 },
});

const BACKTEST_DEFAULT = createSnapshot("Backtest Snapshot", "2024-08-05", "backtest", {
  global: { spx1mChange: -6.0, dxy1mChange: 2.5, oil3mChange: -9.2, vix: 28.4 },
  currencies: {
    USD: createCurrencyTemplate({ cpiActual: 2.9, cpiForecast: 3.0, cpiPrevious: 3.0, rateActual: 5.5, rateForecast: 5.5, ratePrevious: 5.5, pmiActual: 54.1, pmiForecast: 52.8, pmiPrevious: 51.7, yield2y: 4.1, yield10y: 3.8, cotPercentile: 74, eventRisk: 4, seasonality: 0.4 }),
    JPY: createCurrencyTemplate({ cpiActual: 2.8, cpiForecast: 2.6, cpiPrevious: 2.7, rateActual: 0.1, rateForecast: 0.1, ratePrevious: 0.1, pmiActual: 52.8, pmiForecast: 51.6, pmiPrevious: 50.8, yield2y: 0.25, yield10y: 0.95, cotPercentile: 18, eventRisk: 3, seasonality: 0.9 }),
  },
});

function normalizeToProbability(score) {
  return clamp(50 + score * 5.5, 0, 100);
}

function classifyRegime(score) {
  if (score >= 9) return "Stark bullish";
  if (score >= 4.5) return "Bullish";
  if (score >= 1.5) return "Leicht bullish";
  if (score <= -9) return "Stark bearish";
  if (score <= -4.5) return "Bearish";
  if (score <= -1.5) return "Leicht bearish";
  return "Neutral";
}

function confidenceClass(confidence) {
  if (confidence >= 80) return "Hoch";
  if (confidence >= 60) return "Gut";
  if (confidence >= 40) return "Gemischt";
  return "Schwach";
}

function deriveRiskRegime(global) {
  const { spx1mChange, dxy1mChange, oil3mChange, vix } = global;
  if (vix >= 28 || spx1mChange <= -6 || dxy1mChange >= 2.5) return "strong_risk_off";
  if (vix >= 22 || spx1mChange <= -2 || dxy1mChange >= 1.2) return "mild_risk_off";
  if (vix <= 14 && spx1mChange >= 4 && oil3mChange >= 5) return "strong_risk_on";
  if (vix <= 18 && spx1mChange >= 1) return "mild_risk_on";
  return "neutral";
}

function deriveMarketFocus(global) {
  const { vix, spx1mChange, dxy1mChange } = global;
  if (Math.abs(dxy1mChange) >= 1.8) return "rates";
  if (vix >= 24 || Math.abs(spx1mChange) >= 5) return "risk";
  return "balanced";
}

function selectActivation(marketFocus, factorKey) {
  let base = 1;
  if (marketFocus === "rates") {
    if (["rateLevel", "rateSurprise", "bondConfirmation", "inflationSurprise"].includes(factorKey)) base = 1.25;
    if (["cotPositioning", "seasonality"].includes(factorKey)) base = 0.9;
  }
  if (marketFocus === "risk") {
    if (["riskSentiment", "commodityLinkage", "eventRisk"].includes(factorKey)) base = 1.25;
    if (["seasonality"].includes(factorKey)) base = 0.9;
  }
  return clamp(Number(base.toFixed(2)), 0.75, 1.4);
}

function mapSurprise(actual, forecast, strong = 0.3, mild = 0.1) {
  const diff = safeNumber(actual) - safeNumber(forecast);
  if (diff >= strong) return 2;
  if (diff >= mild) return 1;
  if (diff <= -strong) return -2;
  if (diff <= -mild) return -1;
  return 0;
}

function mapRateLevel(actualRate, avgRate) {
  const diff = safeNumber(actualRate) - safeNumber(avgRate);
  if (diff >= 2) return 2;
  if (diff >= 1) return 1;
  if (diff <= -2) return -2;
  if (diff <= -1) return -1;
  return 0;
}

function mapInflationTrend(actual, previous) {
  const diff = safeNumber(actual) - safeNumber(previous);
  if (diff >= 0.3) return 1;
  if (diff <= -0.3) return -1;
  return 0;
}

function mapGrowthMomentum(actual, forecast, previous) {
  const level = safeNumber(actual);
  const surprise = safeNumber(actual) - safeNumber(forecast);
  const trend = safeNumber(actual) - safeNumber(previous);
  let score = 0;
  if (level >= 54) score += 1;
  else if (level <= 47) score -= 1;
  if (surprise >= 0.5) score += 1;
  else if (surprise <= -0.5) score -= 1;
  if (trend >= 0.5) score += 0.5;
  else if (trend <= -0.5) score -= 0.5;
  return clamp(Math.round(score), -2, 2);
}

function mapBondConfirmation(raw, avg2y, avg10y) {
  const shortDiff = safeNumber(raw.yield2y) - avg2y;
  const longDiff = safeNumber(raw.yield10y) - avg10y;
  if (shortDiff >= 1 && longDiff >= 0.5) return 2;
  if (shortDiff >= 0.5) return 1;
  if (shortDiff <= -1 && longDiff <= -0.5) return -2;
  if (shortDiff <= -0.5) return -1;
  return 0;
}

function mapRiskSentiment(currency, regime) {
  const riskOn = ["AUD", "NZD", "CAD"];
  const safeHavens = ["JPY", "CHF"];
  const regimeScore = {
    strong_risk_on: 2,
    mild_risk_on: 1,
    neutral: 0,
    mild_risk_off: -1,
    strong_risk_off: -2,
  }[regime] ?? 0;
  if (riskOn.includes(currency)) return regimeScore;
  if (safeHavens.includes(currency)) return -regimeScore;
  if (currency === "USD") return regimeScore < 0 ? Math.abs(regimeScore) * 0.5 : -regimeScore * 0.25;
  return regimeScore * 0.35;
}

function mapCommodityLinkage(currency, oil3mChange) {
  if (!["CAD", "AUD", "NZD"].includes(currency)) return 0;
  if (oil3mChange >= 10) return currency === "CAD" ? 2 : 1;
  if (oil3mChange >= 3) return 1;
  if (oil3mChange <= -10) return currency === "CAD" ? -2 : -1;
  if (oil3mChange <= -3) return -1;
  return 0;
}

function mapCotPositioning(percentile) {
  if (percentile < 20) return 2;
  if (percentile < 35) return 1;
  if (percentile <= 65) return 0;
  if (percentile <= 85) return -1;
  return -2;
}

function mapSeasonality(score) {
  return clamp(safeNumber(score), -1, 1);
}

function mapEventRisk(risk) {
  const r = safeNumber(risk);
  if (r >= 4) return -2;
  if (r >= 2) return -1;
  return 0;
}

function buildFactorStateForCurrency(currency, raw, allRaw, global) {
  const avgRate = CURRENCIES.reduce((sum, c) => sum + safeNumber(allRaw[c].rateActual), 0) / CURRENCIES.length;
  const avg2y = CURRENCIES.reduce((sum, c) => sum + safeNumber(allRaw[c].yield2y), 0) / CURRENCIES.length;
  const avg10y = CURRENCIES.reduce((sum, c) => sum + safeNumber(allRaw[c].yield10y), 0) / CURRENCIES.length;
  const riskRegime = deriveRiskRegime(global);
  const marketFocus = deriveMarketFocus(global);

  return {
    inflationSurprise: {
      direction: mapSurprise(raw.cpiActual, raw.cpiForecast, 0.3, 0.1),
      activation: selectActivation(marketFocus, "inflationSurprise"),
    },
    inflationTrend: {
      direction: mapInflationTrend(raw.cpiActual, raw.cpiPrevious),
      activation: selectActivation(marketFocus, "inflationTrend"),
    },
    rateLevel: {
      direction: mapRateLevel(raw.rateActual, avgRate),
      activation: selectActivation(marketFocus, "rateLevel"),
    },
    rateSurprise: {
      direction: mapSurprise(raw.rateActual, raw.rateForecast, 0.25, 0.1),
      activation: selectActivation(marketFocus, "rateSurprise"),
    },
    growthMomentum: {
      direction: mapGrowthMomentum(raw.pmiActual, raw.pmiForecast, raw.pmiPrevious),
      activation: selectActivation(marketFocus, "growthMomentum"),
    },
    bondConfirmation: {
      direction: mapBondConfirmation(raw, avg2y, avg10y),
      activation: selectActivation(marketFocus, "bondConfirmation"),
    },
    riskSentiment: {
      direction: mapRiskSentiment(currency, riskRegime),
      activation: selectActivation(marketFocus, "riskSentiment"),
    },
    commodityLinkage: {
      direction: mapCommodityLinkage(currency, global.oil3mChange),
      activation: selectActivation(marketFocus, "commodityLinkage"),
    },
    cotPositioning: {
      direction: mapCotPositioning(raw.cotPercentile),
      activation: selectActivation(marketFocus, "cotPositioning"),
    },
    seasonality: {
      direction: mapSeasonality(raw.seasonality),
      activation: selectActivation(marketFocus, "seasonality"),
    },
    eventRisk: {
      direction: mapEventRisk(raw.eventRisk),
      activation: selectActivation(marketFocus, "eventRisk"),
    },
  };
}

function scoreCurrency(currencyCode, factorState) {
  const modifiers = CURRENCY_MODIFIERS[currencyCode] ?? {};
  const factorBreakdown = FACTOR_KEYS.map((key) => {
    const config = FACTOR_CONFIG[key];
    const direction = factorState[key]?.direction ?? 0;
    const activation = factorState[key]?.activation ?? 1;
    const currencyModifier = modifiers[key] ?? 1;
    const finalWeight = config.baseWeight * currencyModifier;
    const contribution = direction * finalWeight * activation;
    return {
      key,
      label: config.label,
      group: config.group,
      direction,
      activation,
      baseWeight: config.baseWeight,
      currencyModifier,
      finalWeight: Number(finalWeight.toFixed(2)),
      contribution: Number(contribution.toFixed(2)),
    };
  });

  const rawScore = Number(factorBreakdown.reduce((sum, item) => sum + item.contribution, 0).toFixed(2));
  const majorFactors = factorBreakdown.filter((f) => f.finalWeight >= 1);
  const alignedMajor = majorFactors.filter((f) => Math.sign(f.contribution) === Math.sign(rawScore) && f.direction !== 0).length;
  const contradictoryMajor = majorFactors.filter((f) => Math.sign(f.contribution) !== Math.sign(rawScore) && f.direction !== 0).length;
  const neutralCount = factorBreakdown.filter((f) => f.direction === 0).length;
  const activationStrength = factorBreakdown.reduce((sum, f) => sum + f.activation, 0) / factorBreakdown.length;

  let confidence = 50;
  confidence += alignedMajor * 8;
  confidence -= contradictoryMajor * 9;
  confidence -= neutralCount * 1.2;
  confidence += (activationStrength - 1) * 20;
  confidence = clamp(Number(confidence.toFixed(1)), 0, 100);

  return {
    rawScore,
    probabilityUp: Number(normalizeToProbability(rawScore).toFixed(1)),
    probabilityDown: Number((100 - normalizeToProbability(rawScore)).toFixed(1)),
    confidence,
    regime: classifyRegime(rawScore),
    factorBreakdown,
  };
}

function pairScore(base, quote) {
  const diff = base.rawScore - quote.rawScore;
  const divergenceBonus = Math.abs(diff) >= 8 ? 12 : Math.abs(diff) >= 5 ? 7 : Math.abs(diff) >= 3 ? 3 : 0;
  const confidence = clamp(Number((((base.confidence + quote.confidence) / 2) + divergenceBonus).toFixed(1)), 0, 100);
  const noTrade = Math.abs(diff) < 2 || confidence < 60;
  return {
    raw: Number(diff.toFixed(2)),
    probabilityBaseUp: Number(normalizeToProbability(diff).toFixed(1)),
    regime: classifyRegime(diff),
    confidence,
    divergenceBonus,
    noTrade,
  };
}

function buildModelScatterFromBreakdown(factorBreakdown) {
  const modelLibrary = [
    { name: "Inflation", horizon: 30, factors: ["inflationSurprise", "inflationTrend"] },
    { name: "Rates", horizon: 30, factors: ["rateLevel", "rateSurprise", "bondConfirmation"] },
    { name: "Growth", horizon: 45, factors: ["growthMomentum"] },
    { name: "Risk", horizon: 20, factors: ["riskSentiment", "eventRisk"] },
    { name: "Commodities", horizon: 45, factors: ["commodityLinkage"] },
    { name: "Positioning", horizon: 30, factors: ["cotPositioning"] },
    { name: "Seasonality", horizon: 90, factors: ["seasonality"] },
    { name: "Composite", horizon: 60, factors: ["rateLevel", "growthMomentum", "riskSentiment", "cotPositioning"] },
  ];

  return modelLibrary.map((model, idx) => {
    const mapped = model.factors.map((factor) => factorBreakdown.find((f) => f.key === factor)).filter(Boolean);
    const avg = mapped.length ? mapped.reduce((sum, item) => sum + item.contribution, 0) / mapped.length : 0;
    const variation = ((idx % 3) - 1) * 0.25;
    return { x: model.horizon, y: Number((avg + variation).toFixed(2)), model: model.name };
  });
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function ensureSnapshotShape(snapshot, category = "live") {
  const base = createSnapshot(snapshot?.meta?.name || "Imported Snapshot", snapshot?.meta?.snapshotDate || snapshot?.date || "", category);
  const merged = deepClone(base);

  merged.meta = {
    ...merged.meta,
    ...(snapshot.meta || {}),
    category,
    archivedAt: snapshot?.meta?.archivedAt || null,
    importedFrom: snapshot?.meta?.importedFrom || snapshot?.importedFrom || "import",
  };

  merged.global = { ...merged.global, ...(snapshot.global || {}) };

  if (snapshot.currencies) {
    for (const ccy of CURRENCIES) {
      merged.currencies[ccy] = {
        ...merged.currencies[ccy],
        ...(snapshot.currencies[ccy] || {}),
      };
    }
  }

  return merged;
}

function snapshotToFlatRows(snapshot) {
  const rows = [];
  rows.push(["meta", "snapshot", "name", snapshot.meta.name]);
  rows.push(["meta", "snapshot", "snapshotDate", snapshot.meta.snapshotDate]);
  rows.push(["meta", "snapshot", "notes", snapshot.meta.notes || ""]);
  rows.push(["meta", "snapshot", "category", snapshot.meta.category || "live"]);

  Object.keys(FIELD_META.global).forEach((field) => {
    rows.push(["global", "global", field, snapshot.global[field]]);
  });

  CURRENCIES.forEach((ccy) => {
    Object.keys(FIELD_META.currency).forEach((field) => {
      rows.push(["currency", ccy, field, snapshot.currencies[ccy][field]]);
    });
  });

  return rows;
}

function buildJsonTemplate(category = "live") {
  return createSnapshot(category === "live" ? "Live Import" : "Backtest Import", "2024-08-05", category);
}

function buildCsvTemplate(category = "live") {
  const snapshot = buildJsonTemplate(category);
  const rows = snapshotToFlatRows(snapshot);
  return ["scope,entity,field,value", ...rows.map((r) => r.map(csvEscape).join(","))].join("\n");
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) throw new Error("CSV ist leer");
  const header = lines[0].split(",").map((x) => x.trim());
  const expected = ["scope", "entity", "field", "value"];
  if (header.join("|") !== expected.join("|")) {
    throw new Error("CSV Header muss scope,entity,field,value sein");
  }

  const snapshot = createSnapshot("Imported CSV Snapshot", "2024-08-05", "live");

  for (let i = 1; i < lines.length; i += 1) {
    const raw = parseCsvLine(lines[i]);
    if (raw.length < 4) continue;
    const [scope, entity, field, value] = raw;
    if (scope === "meta" && entity === "snapshot") {
      snapshot.meta[field] = value;
      continue;
    }
    if (scope === "global") {
      snapshot.global[field] = safeNumber(value, 0);
      continue;
    }
    if (scope === "currency" && CURRENCIES.includes(entity)) {
      snapshot.currencies[entity][field] = safeNumber(value, 0);
    }
  }

  return snapshot;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((x) => x.trim());
}

function downloadTextFile(filename, text, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.input}>
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange, step = 0.1, min, max }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input type="number" step={step} min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={styles.input} />
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={styles.input} />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={styles.input} />
    </label>
  );
}

function ScatterPlot({ points }) {
  const width = 640;
  const height = 320;
  const pad = 30;
  const xMin = 20;
  const xMax = 130;
  const yMin = -8;
  const yMax = 8;
  const mapX = (x) => pad + ((x - xMin) / (xMax - xMin)) * (width - pad * 2);
  const mapY = (y) => height - pad - ((y - yMin) / (yMax - yMin)) * (height - pad * 2);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 320, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={mapY(0)} x2={width - pad} y2={mapY(0)} stroke="#94a3b8" strokeDasharray="4 4" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={mapX(p.x)} cy={mapY(p.y)} r="5" fill="#2563eb" />
          <title>{`${p.model} | Horizont: ${p.x}d | Score: ${p.y}`}</title>
        </g>
      ))}
    </svg>
  );
}

function BarList({ data }) {
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.score)), 1);
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {data.map((item) => {
        const width = `${(Math.abs(item.score) / maxAbs) * 100}%`;
        return (
          <div key={item.name}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
              <span>{item.name}</span>
              <span>{item.score.toFixed(2)}</span>
            </div>
            <div style={{ background: "#e2e8f0", borderRadius: 9999, height: 10, overflow: "hidden" }}>
              <div style={{ width, height: "100%", background: item.score >= 0 ? "#16a34a" : "#dc2626" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function badgeStyle(regime) {
  const lower = regime.toLowerCase();
  if (lower.includes("bullish")) return { background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600 };
  if (lower.includes("bearish")) return { background: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600 };
  return { background: "#e2e8f0", color: "#334155", padding: "4px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600 };
}

function SummaryCards({ ranking, pairRanking }) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Stärkste Währungen</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {ranking.slice(0, 3).map((item) => (
            <div key={item.currency} style={styles.subCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{item.currency}</strong>
                <span style={badgeStyle(item.regime)}>{item.regime}</span>
              </div>
              <div style={styles.mutedSmall}>Score: {item.rawScore}</div>
              <div style={styles.mutedSmall}>Konfidenz: {item.confidence}%</div>
            </div>
          ))}
        </div>
      </div>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Schwächste Währungen</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {[...ranking].reverse().slice(0, 3).map((item) => (
            <div key={item.currency} style={styles.subCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{item.currency}</strong>
                <span style={badgeStyle(item.regime)}>{item.regime}</span>
              </div>
              <div style={styles.mutedSmall}>Score: {item.rawScore}</div>
              <div style={styles.mutedSmall}>Konfidenz: {item.confidence}%</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...styles.card, gridColumn: "span 2" }}>
        <h3 style={{ marginTop: 0 }}>Beste Paare nach Divergenz</h3>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {pairRanking.slice(0, 6).map((item) => (
            <div key={item.pair} style={styles.subCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{item.pair}</strong>
                <span style={badgeStyle(item.regime)}>{item.regime}</span>
              </div>
              <div style={styles.mutedSmall}>Pair Score: {item.raw}</div>
              <div style={styles.mutedSmall}>Konfidenz: {item.confidence}%</div>
              <div style={{ color: item.noTrade ? "#991b1b" : "#166534", fontSize: 13, marginTop: 4 }}>{item.noTrade ? "No Trade" : "Trade-fähig"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SnapshotManager({
  activeCategory,
  currentSnapshot,
  setSnapshotMeta,
  archive,
  onArchiveCurrent,
  onLoadArchive,
  onDeleteArchive,
  onExportArchive,
  onExportCurrent,
  onDownloadJsonTemplate,
  onDownloadCsvTemplate,
  onImportFile,
}) {
  const filtered = archive.filter((item) => item.meta.category === activeCategory);

  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>{activeCategory === "live" ? "Live" : "Backtest"} Snapshot-Manager</h3>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
        <TextField label="Snapshot-Name" value={currentSnapshot.meta.name} onChange={(v) => setSnapshotMeta("name", v)} />
        <DateField label="Snapshot-Datum" value={currentSnapshot.meta.snapshotDate} onChange={(v) => setSnapshotMeta("snapshotDate", v)} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={onArchiveCurrent} style={styles.buttonPrimary}>Aktuellen Snapshot archivieren</button>
        <button onClick={onExportCurrent} style={styles.button}>Aktuellen Snapshot exportieren</button>
        <button onClick={onExportArchive} style={styles.button}>Archiv exportieren</button>
        <button onClick={onDownloadJsonTemplate} style={styles.button}>JSON-Vorlage laden</button>
        <button onClick={onDownloadCsvTemplate} style={styles.button}>CSV-Vorlage laden</button>
        <label style={{ ...styles.button, display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
          JSON/CSV importieren
          <input type="file" accept="application/json,.json,text/csv,.csv" style={{ display: "none" }} onChange={onImportFile} />
        </label>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.length === 0 && <div style={{ color: "#64748b" }}>Noch keine archivierten {activeCategory === "live" ? "Live-" : "Backtest-"}Wochen.</div>}
        {filtered.map((snap) => (
          <div key={snap.meta.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{snap.meta.name}</div>
              <div style={styles.mutedSmall}>{snap.meta.snapshotDate} · {snap.meta.archivedAt ? `archiviert ${snap.meta.archivedAt}` : "nicht archiviert"}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onLoadArchive(snap.meta.id)} style={styles.smallButton}>Laden</button>
              <button onClick={() => onDeleteArchive(snap.meta.id)} style={styles.smallDangerButton}>Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputsPanel({ snapshot, updateMeta, updateGlobal, updateCurrency, sectionName }) {
  const derivedRisk = deriveRiskRegime(snapshot.global);
  const derivedFocus = deriveMarketFocus(snapshot.global);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>{sectionName} globale Eingaben</h3>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <DateField label="Datum" value={snapshot.meta.snapshotDate} onChange={(v) => updateMeta("snapshotDate", v)} />
          <TextField label="Name" value={snapshot.meta.name} onChange={(v) => updateMeta("name", v)} />
          {Object.entries(FIELD_META.global).map(([field, meta]) => (
            <NumberField key={field} label={meta.label} value={snapshot.global[field]} onChange={(v) => updateGlobal(field, v)} step={meta.step} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <div style={styles.mutedSmall}>Abgeleitetes Risk Regime: <strong>{derivedRisk}</strong></div>
          <div style={styles.mutedSmall}>Abgeleiteter Marktfokus: <strong>{derivedFocus}</strong></div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))" }}>
        {CURRENCIES.map((ccy) => (
          <div key={ccy} style={styles.card}>
            <h3 style={{ marginTop: 0 }}>{ccy}</h3>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {Object.entries(FIELD_META.currency).map(([field, meta]) => (
                <NumberField key={field} label={meta.label} value={snapshot.currencies[ccy][field]} onChange={(v) => updateCurrency(ccy, field, meta.min != null || meta.max != null ? clamp(v, meta.min ?? -Infinity, meta.max ?? Infinity) : v)} step={meta.step} min={meta.min} max={meta.max} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownPanel({ selectedCurrency, setSelectedCurrency, breakdown }) {
  return (
    <div style={styles.card}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Faktoraufschlüsselung</h3>
        <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} style={styles.input}>
          {CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}
        </select>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Faktor</th>
              <th style={styles.th}>Gruppe</th>
              <th style={styles.th}>Direction</th>
              <th style={styles.th}>Activation</th>
              <th style={styles.th}>Base Weight</th>
              <th style={styles.th}>Modifier</th>
              <th style={styles.th}>Final Weight</th>
              <th style={styles.th}>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => (
              <tr key={row.key} style={styles.tdRow}>
                <td style={styles.tdStrong}>{row.label}</td>
                <td style={styles.td}>{row.group}</td>
                <td style={styles.td}>{row.direction.toFixed(1)}</td>
                <td style={styles.td}>{row.activation.toFixed(2)}</td>
                <td style={styles.td}>{row.baseWeight.toFixed(2)}</td>
                <td style={styles.td}>{row.currencyModifier.toFixed(2)}</td>
                <td style={styles.td}>{row.finalWeight.toFixed(2)}</td>
                <td style={{ ...styles.tdStrong, color: row.contribution >= 0 ? "#166534" : "#991b1b" }}>{row.contribution.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PairsPanel({ pairRanking }) {
  return (
    <div style={styles.card}>
      <h3 style={{ marginTop: 0 }}>Ranking aller Paare</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>Pair</th>
              <th style={styles.th}>Score</th>
              <th style={styles.th}>Regime</th>
              <th style={styles.th}>Konfidenz</th>
              <th style={styles.th}>Wahrscheinlichkeit Base steigt</th>
              <th style={styles.th}>Divergenz-Bonus</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {pairRanking.slice(0, 28).map((row) => (
              <tr key={row.pair} style={styles.tdRow}>
                <td style={styles.tdStrong}>{row.pair}</td>
                <td style={{ ...styles.tdStrong, color: row.raw >= 0 ? "#166534" : "#991b1b" }}>{row.raw}</td>
                <td style={styles.td}><span style={badgeStyle(row.regime)}>{row.regime}</span></td>
                <td style={styles.td}>{row.confidence}%</td>
                <td style={styles.td}>{row.probabilityBaseUp}%</td>
                <td style={styles.td}>{row.divergenceBonus}</td>
                <td style={{ ...styles.tdStrong, color: row.noTrade ? "#991b1b" : "#166534" }}>{row.noTrade ? "No Trade" : "Ok"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OverviewPanel({ snapshot, scores, ranking, pairRanking, selectedCurrency, setSelectedCurrency, scatterData, barData, base, setBase, quote, setQuote, currentPair, sectionName }) {
  return (
    <>
      <div style={{ ...styles.card, display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div><div style={styles.label}>Datum</div><div style={styles.value}>{snapshot.meta.snapshotDate}</div></div>
        <div><div style={styles.label}>Name</div><div style={styles.value}>{snapshot.meta.name}</div></div>
        <div><div style={styles.label}>Risk Regime</div><div style={styles.value}>{deriveRiskRegime(snapshot.global)}</div></div>
        <div><div style={styles.label}>Marktfokus</div><div style={styles.value}>{deriveMarketFocus(snapshot.global)}</div></div>
      </div>
      <SummaryCards ranking={ranking} pairRanking={pairRanking} />
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={styles.card}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <strong>{sectionName} Modell-Scatter für</strong>
            <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} style={styles.input}>
              {CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}
            </select>
            <span style={badgeStyle(scores[selectedCurrency].regime)}>{scores[selectedCurrency].regime}</span>
            <span style={styles.mutedSmall}>Score: {scores[selectedCurrency].rawScore}</span>
            <span style={styles.mutedSmall}>Konfidenz: {scores[selectedCurrency].confidence}% ({confidenceClass(scores[selectedCurrency].confidence)})</span>
          </div>
          <ScatterPlot points={scatterData} />
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Währungs-Leaderboard</h3>
          <BarList data={barData} />
        </div>
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Paar-Bias</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <select value={base} onChange={(e) => setBase(e.target.value)} style={styles.input}>{CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}</select>
            <span>/</span>
            <select value={quote} onChange={(e) => setQuote(e.target.value)} style={styles.input}>{CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}</select>
            <span style={badgeStyle(currentPair.regime)}>{currentPair.regime}</span>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div style={styles.subCard}><div style={styles.label}>Paar-Score</div><div style={styles.bigValue}>{currentPair.raw}</div></div>
            <div style={styles.subCard}><div style={styles.label}>Wahrscheinlichkeit {base} steigt</div><div style={styles.bigValue}>{currentPair.probabilityBaseUp}%</div></div>
            <div style={styles.subCard}><div style={styles.label}>Konfidenz</div><div style={styles.bigValue}>{currentPair.confidence}%</div></div>
            <div style={styles.subCard}><div style={styles.label}>Status</div><div style={{ ...styles.bigValue, color: currentPair.noTrade ? "#991b1b" : "#166534" }}>{currentPair.noTrade ? "No Trade" : "Ok"}</div></div>
          </div>
        </div>
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Arbeitsmodus</h3>
          <div style={{ display: "grid", gap: 10, color: "#475569", fontSize: 14 }}>
            <div><strong>1.</strong> Daten in JSON/CSV-Vorlage eintragen</div>
            <div><strong>2.</strong> In Live oder Backtest importieren</div>
            <div><strong>3.</strong> Snapshot archivieren</div>
            <div><strong>4.</strong> Ergebnis in Pair-Ranking und Breakdown lesen</div>
          </div>
        </div>
      </div>
    </>
  );
}

function useEngine(snapshot) {
  const factorStates = useMemo(() => Object.fromEntries(CURRENCIES.map((ccy) => [ccy, buildFactorStateForCurrency(ccy, snapshot.currencies[ccy], snapshot.currencies, snapshot.global)])), [snapshot]);
  const scores = useMemo(() => Object.fromEntries(CURRENCIES.map((ccy) => [ccy, scoreCurrency(ccy, factorStates[ccy])])), [factorStates]);
  const ranking = useMemo(() => [...CURRENCIES].map((currency) => ({ currency, ...scores[currency] })).sort((a, b) => b.rawScore - a.rawScore), [scores]);
  const pairRanking = useMemo(() => {
    const pairs = [];
    for (const baseCcy of CURRENCIES) {
      for (const quoteCcy of CURRENCIES) {
        if (baseCcy === quoteCcy) continue;
        pairs.push({ pair: `${baseCcy}/${quoteCcy}`, ...pairScore(scores[baseCcy], scores[quoteCcy]) });
      }
    }
    return pairs.sort((a, b) => b.raw - a.raw);
  }, [scores]);
  return { factorStates, scores, ranking, pairRanking };
}

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", padding: 24, fontFamily: "Arial, sans-serif", color: "#0f172a" },
  wrap: { maxWidth: 1520, margin: "0 auto", display: "grid", gap: 24 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  subCard: { border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 },
  input: { padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" },
  button: { padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", cursor: "pointer", fontWeight: 600 },
  buttonPrimary: { padding: "10px 14px", borderRadius: 10, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer", fontWeight: 600 },
  smallButton: { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", cursor: "pointer", fontWeight: 600 },
  smallDangerButton: { padding: "8px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", cursor: "pointer", fontWeight: 600 },
  mutedSmall: { color: "#475569", fontSize: 14 },
  label: { fontSize: 13, color: "#475569" },
  value: { marginTop: 6, fontWeight: 600 },
  bigValue: { fontSize: 28, fontWeight: 700 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  thRow: { textAlign: "left", borderBottom: "1px solid #cbd5e1" },
  th: { padding: 10 },
  tdRow: { borderBottom: "1px solid #e2e8f0" },
  td: { padding: 10 },
  tdStrong: { padding: 10, fontWeight: 600 },
};

export default function App() {
  const [activeTopTab, setActiveTopTab] = useState("live");
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [liveSnapshot, setLiveSnapshot] = useState(deepClone(LIVE_DEFAULT));
  const [backtestSnapshot, setBacktestSnapshot] = useState(deepClone(BACKTEST_DEFAULT));
  const [archive, setArchive] = useState([]);
  const [liveSelectedCurrency, setLiveSelectedCurrency] = useState("USD");
  const [backtestSelectedCurrency, setBacktestSelectedCurrency] = useState("USD");
  const [liveBase, setLiveBase] = useState("AUD");
  const [liveQuote, setLiveQuote] = useState("JPY");
  const [backtestBase, setBacktestBase] = useState("AUD");
  const [backtestQuote, setBacktestQuote] = useState("JPY");
  const fileInputKeyRef = useRef(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setArchive(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
  }, [archive]);

  const liveEngine = useEngine(liveSnapshot);
  const backtestEngine = useEngine(backtestSnapshot);
  const liveCurrentPair = useMemo(() => pairScore(liveEngine.scores[liveBase], liveEngine.scores[liveQuote]), [liveEngine.scores, liveBase, liveQuote]);
  const backtestCurrentPair = useMemo(() => pairScore(backtestEngine.scores[backtestBase], backtestEngine.scores[backtestQuote]), [backtestEngine.scores, backtestBase, backtestQuote]);
  const liveScatterData = useMemo(() => buildModelScatterFromBreakdown(liveEngine.scores[liveSelectedCurrency].factorBreakdown), [liveEngine.scores, liveSelectedCurrency]);
  const backtestScatterData = useMemo(() => buildModelScatterFromBreakdown(backtestEngine.scores[backtestSelectedCurrency].factorBreakdown), [backtestEngine.scores, backtestSelectedCurrency]);
  const liveBarData = liveEngine.ranking.map((r) => ({ name: r.currency, score: r.rawScore }));
  const backtestBarData = backtestEngine.ranking.map((r) => ({ name: r.currency, score: r.rawScore }));

  const isLive = activeTopTab === "live";
  const currentSnapshot = isLive ? liveSnapshot : backtestSnapshot;
  const setCurrentSnapshot = isLive ? setLiveSnapshot : setBacktestSnapshot;
  const currentEngine = isLive ? liveEngine : backtestEngine;
  const currentSelectedCurrency = isLive ? liveSelectedCurrency : backtestSelectedCurrency;
  const setCurrentSelectedCurrency = isLive ? setLiveSelectedCurrency : setBacktestSelectedCurrency;
  const currentScatterData = isLive ? liveScatterData : backtestScatterData;
  const currentBarData = isLive ? liveBarData : backtestBarData;
  const currentBase = isLive ? liveBase : backtestBase;
  const currentQuote = isLive ? liveQuote : backtestQuote;
  const setCurrentBase = isLive ? setLiveBase : setBacktestBase;
  const setCurrentQuote = isLive ? setLiveQuote : setBacktestQuote;
  const currentPair = isLive ? liveCurrentPair : backtestCurrentPair;
  const sectionName = isLive ? "Live" : "Backtest";

  function updateMeta(key, value) {
    setCurrentSnapshot((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  }

  function updateGlobal(key, value) {
    setCurrentSnapshot((prev) => ({ ...prev, global: { ...prev.global, [key]: value } }));
  }

  function updateCurrency(currency, key, value) {
    setCurrentSnapshot((prev) => ({ ...prev, currencies: { ...prev.currencies, [currency]: { ...prev.currencies[currency], [key]: value } } }));
  }

  function archiveCurrentSnapshot() {
    const snap = deepClone(currentSnapshot);
    snap.meta.archivedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
    snap.meta.category = activeTopTab;
    setArchive((prev) => [snap, ...prev.filter((x) => x.meta.id !== snap.meta.id)].slice(0, 250));
  }

  function loadArchive(id) {
    const found = archive.find((x) => x.meta.id === id);
    if (!found) return;
    setCurrentSnapshot(deepClone(found));
  }

  function deleteArchive(id) {
    setArchive((prev) => prev.filter((x) => x.meta.id !== id));
  }

  function exportArchive() {
    downloadTextFile("forex-bias-archive.json", JSON.stringify(archive, null, 2));
  }

  function exportCurrentSnapshot() {
    downloadTextFile(`${activeTopTab}-${currentSnapshot.meta.snapshotDate || "snapshot"}.json`, JSON.stringify(currentSnapshot, null, 2));
  }

  function downloadJsonTemplate() {
    const template = buildJsonTemplate(activeTopTab);
    downloadTextFile(`${activeTopTab}-template.json`, JSON.stringify(template, null, 2));
  }

  function downloadCsvTemplate() {
    downloadTextFile(`${activeTopTab}-template.csv`, buildCsvTemplate(activeTopTab), "text/csv");
  }

  async function importFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      let parsed;
      if (file.name.toLowerCase().endsWith(".json")) {
        parsed = JSON.parse(text);
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        parsed = parseCsv(text);
      } else {
        throw new Error("Nur JSON oder CSV erlaubt");
      }
      const normalized = ensureSnapshotShape(parsed, activeTopTab);
      normalized.meta.id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      normalized.meta.importedFrom = file.name;
      setCurrentSnapshot(normalized);
    } catch (error) {
      alert(`Import fehlgeschlagen: ${error.message}`);
    }
    event.target.value = "";
    fileInputKeyRef.current += 1;
  }

  function resetCurrent() {
    if (activeTopTab === "live") setLiveSnapshot(deepClone(LIVE_DEFAULT));
    else setBacktestSnapshot(deepClone(BACKTEST_DEFAULT));
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Forex Macro Bias Engine</h1>
          <p style={{ color: "#475569" }}>
            Arbeitsfertige manuelle Import-Version mit Archiv, JSON/CSV-Import, Template-Download, identischer Live-/Backtest-Engine und kohärentem Währungsscore.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[ ["live", "Live"], ["backtest", "Backtesting"] ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTopTab(key)} style={{ ...styles.button, background: activeTopTab === key ? "#0f172a" : "#fff", color: activeTopTab === key ? "#fff" : "#0f172a", borderColor: "#cbd5e1" }}>{label}</button>
          ))}
          <button onClick={resetCurrent} style={styles.button}>Auf Standard zurücksetzen</button>
        </div>

        <SnapshotManager
          key={fileInputKeyRef.current}
          activeCategory={activeTopTab}
          currentSnapshot={currentSnapshot}
          setSnapshotMeta={updateMeta}
          archive={archive}
          onArchiveCurrent={archiveCurrentSnapshot}
          onLoadArchive={loadArchive}
          onDeleteArchive={deleteArchive}
          onExportArchive={exportArchive}
          onExportCurrent={exportCurrentSnapshot}
          onDownloadJsonTemplate={downloadJsonTemplate}
          onDownloadCsvTemplate={downloadCsvTemplate}
          onImportFile={importFile}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[ ["overview", "Übersicht"], ["inputs", `${sectionName} Rohdaten`], ["breakdown", `${sectionName} Faktoraufschlüsselung`], ["pairs", `${sectionName} Pair-Ranking`] ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveSubTab(key)} style={{ ...styles.button, background: activeSubTab === key ? "#0f172a" : "#fff", color: activeSubTab === key ? "#fff" : "#0f172a" }}>{label}</button>
          ))}
        </div>

        {activeSubTab === "overview" && (
          <OverviewPanel
            snapshot={currentSnapshot}
            scores={currentEngine.scores}
            ranking={currentEngine.ranking}
            pairRanking={currentEngine.pairRanking}
            selectedCurrency={currentSelectedCurrency}
            setSelectedCurrency={setCurrentSelectedCurrency}
            scatterData={currentScatterData}
            barData={currentBarData}
            base={currentBase}
            setBase={setCurrentBase}
            quote={currentQuote}
            setQuote={setCurrentQuote}
            currentPair={currentPair}
            sectionName={sectionName}
          />
        )}

        {activeSubTab === "inputs" && (
          <InputsPanel snapshot={currentSnapshot} updateMeta={updateMeta} updateGlobal={updateGlobal} updateCurrency={updateCurrency} sectionName={sectionName} />
        )}

        {activeSubTab === "breakdown" && (
          <BreakdownPanel selectedCurrency={currentSelectedCurrency} setSelectedCurrency={setCurrentSelectedCurrency} breakdown={currentEngine.scores[currentSelectedCurrency].factorBreakdown} />
        )}

        {activeSubTab === "pairs" && <PairsPanel pairRanking={currentEngine.pairRanking} />}
      </div>
    </div>
  );
}

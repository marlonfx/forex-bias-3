import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "forex_macro_bias_raw_input_v1";
const CURRENCIES = ["USD", "EUR", "JPY", "GBP", "AUD", "NZD", "CAD", "CHF"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function pctChange(current, previous) {
  current = safeNumber(current, 0);
  previous = safeNumber(previous, 0);
  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
}

function diff(current, previous) {
  return Number((safeNumber(current, 0) - safeNumber(previous, 0)).toFixed(3));
}

function formatScore(score) {
  return Number(score.toFixed(2));
}

function probabilityFromScore(score) {
  return clamp(Number((50 + score * 6).toFixed(1)), 0, 100);
}

function regimeLabel(score) {
  if (score >= 8) return "Stark bullish";
  if (score >= 4) return "Bullish";
  if (score >= 1.5) return "Leicht bullish";
  if (score <= -8) return "Stark bearish";
  if (score <= -4) return "Bearish";
  if (score <= -1.5) return "Leicht bearish";
  return "Neutral";
}

function confidenceLabel(confidence) {
  if (confidence >= 80) return "Hoch";
  if (confidence >= 60) return "Gut";
  if (confidence >= 40) return "Mittel";
  return "Schwach";
}

function cardStyle() {
  return {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  };
}

function buttonStyle(active = false) {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: active ? "#0f172a" : "#fff",
    color: active ? "#fff" : "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
  };
}

function badgeStyle(label) {
  const lower = String(label).toLowerCase();
  if (lower.includes("bullish")) {
    return {
      background: "#dcfce7",
      color: "#166534",
      padding: "4px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 700,
    };
  }
  if (lower.includes("bearish")) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      padding: "4px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 700,
    };
  }
  return {
    background: "#e2e8f0",
    color: "#334155",
    padding: "4px 8px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 700,
  };
}

function createCurrencyRaw(overrides = {}) {
  return {
    cpiActual: 0,
    cpiForecast: 0,
    cpiPrevious: 0,

    rateActual: 0,
    rateForecast: 0,
    ratePrevious: 0,

    pmiActual: 0,
    pmiForecast: 0,
    pmiPrevious: 0,

    yield2yNow: 0,
    yield2y1mAgo: 0,
    yield10yNow: 0,
    yield10y1mAgo: 0,

    cotPercentile: 50,
    eventRisk: 0,
    seasonality: 0,
    ...overrides,
  };
}

function createSnapshot(name, date, overrides = {}) {
  return {
    meta: {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      snapshotDate: date,
      notes: "",
    },
    raw: {
      global: {
        spxNow: 0,
        spx1mAgo: 0,
        dxyNow: 0,
        dxy1mAgo: 0,
        oilNow: 0,
        oil3mAgo: 0,
        vixNow: 18,
        ...overrides.global,
      },
      currencies: {
        USD: createCurrencyRaw(),
        EUR: createCurrencyRaw(),
        JPY: createCurrencyRaw(),
        GBP: createCurrencyRaw(),
        AUD: createCurrencyRaw(),
        NZD: createCurrencyRaw(),
        CAD: createCurrencyRaw(),
        CHF: createCurrencyRaw(),
        ...overrides.currencies,
      },
    },
  };
}

const LIVE_DEFAULT = createSnapshot("Live Woche", "2026-04-15", {
  global: {
    spxNow: 7032,
    spx1mAgo: 6800,
    dxyNow: 104.2,
    dxy1mAgo: 102.9,
    oilNow: 94.5,
    oil3mAgo: 80.0,
    vixNow: 18.2,
  },
  currencies: {
    USD: createCurrencyRaw({
      cpiActual: 3.2,
      cpiForecast: 3.1,
      cpiPrevious: 3.3,
      rateActual: 5.25,
      rateForecast: 5.25,
      ratePrevious: 5.0,
      pmiActual: 51.2,
      pmiForecast: 50.9,
      pmiPrevious: 50.4,
      yield2yNow: 4.68,
      yield2y1mAgo: 4.51,
      yield10yNow: 4.31,
      yield10y1mAgo: 4.16,
      cotPercentile: 68,
      eventRisk: 3,
      seasonality: 0.2,
    }),
    EUR: createCurrencyRaw({
      cpiActual: 2.4,
      cpiForecast: 2.5,
      cpiPrevious: 2.6,
      rateActual: 4.0,
      rateForecast: 4.0,
      ratePrevious: 4.0,
      pmiActual: 48.5,
      pmiForecast: 49.0,
      pmiPrevious: 47.8,
      yield2yNow: 2.35,
      yield2y1mAgo: 2.42,
      yield10yNow: 2.48,
      yield10y1mAgo: 2.44,
      cotPercentile: 54,
      eventRisk: 2,
      seasonality: -0.1,
    }),
    JPY: createCurrencyRaw({
      cpiActual: 2.7,
      cpiForecast: 2.6,
      cpiPrevious: 2.8,
      rateActual: 0.25,
      rateForecast: 0.25,
      ratePrevious: 0.1,
      pmiActual: 49.7,
      pmiForecast: 50.0,
      pmiPrevious: 49.9,
      yield2yNow: 0.39,
      yield2y1mAgo: 0.33,
      yield10yNow: 1.14,
      yield10y1mAgo: 1.02,
      cotPercentile: 24,
      eventRisk: 1,
      seasonality: 0.5,
    }),
    GBP: createCurrencyRaw({
      cpiActual: 3.4,
      cpiForecast: 3.3,
      cpiPrevious: 3.5,
      rateActual: 5.25,
      rateForecast: 5.25,
      ratePrevious: 5.0,
      pmiActual: 50.7,
      pmiForecast: 50.4,
      pmiPrevious: 49.8,
      yield2yNow: 4.27,
      yield2y1mAgo: 4.18,
      yield10yNow: 4.11,
      yield10y1mAgo: 4.02,
      cotPercentile: 61,
      eventRisk: 2,
      seasonality: 0.1,
    }),
    AUD: createCurrencyRaw({
      cpiActual: 3.8,
      cpiForecast: 3.6,
      cpiPrevious: 4.0,
      rateActual: 4.35,
      rateForecast: 4.35,
      ratePrevious: 4.1,
      pmiActual: 50.4,
      pmiForecast: 49.9,
      pmiPrevious: 49.5,
      yield2yNow: 3.94,
      yield2y1mAgo: 3.79,
      yield10yNow: 4.24,
      yield10y1mAgo: 4.02,
      cotPercentile: 18,
      eventRisk: 1,
      seasonality: 0.4,
    }),
    NZD: createCurrencyRaw({
      cpiActual: 3.3,
      cpiForecast: 3.4,
      cpiPrevious: 3.6,
      rateActual: 5.5,
      rateForecast: 5.5,
      ratePrevious: 5.5,
      pmiActual: 49.8,
      pmiForecast: 50.1,
      pmiPrevious: 50.0,
      yield2yNow: 4.53,
      yield2y1mAgo: 4.41,
      yield10yNow: 4.42,
      yield10y1mAgo: 4.33,
      cotPercentile: 26,
      eventRisk: 1,
      seasonality: 0.3,
    }),
    CAD: createCurrencyRaw({
      cpiActual: 2.8,
      cpiForecast: 2.9,
      cpiPrevious: 3.0,
      rateActual: 4.75,
      rateForecast: 4.75,
      ratePrevious: 4.5,
      pmiActual: 50.1,
      pmiForecast: 50.4,
      pmiPrevious: 49.9,
      yield2yNow: 3.72,
      yield2y1mAgo: 3.61,
      yield10yNow: 3.44,
      yield10y1mAgo: 3.34,
      cotPercentile: 21,
      eventRisk: 2,
      seasonality: 0.2,
    }),
    CHF: createCurrencyRaw({
      cpiActual: 1.2,
      cpiForecast: 1.3,
      cpiPrevious: 1.4,
      rateActual: 1.25,
      rateForecast: 1.25,
      ratePrevious: 1.0,
      pmiActual: 48.0,
      pmiForecast: 48.5,
      pmiPrevious: 48.3,
      yield2yNow: 0.67,
      yield2y1mAgo: 0.62,
      yield10yNow: 0.59,
      yield10y1mAgo: 0.55,
      cotPercentile: 66,
      eventRisk: 1,
      seasonality: -0.2,
    }),
  },
});

const BACKTEST_DEFAULT = createSnapshot("Backtest Woche", "2024-08-05", {
  global: {
    spxNow: 5300,
    spx1mAgo: 5650,
    dxyNow: 103.8,
    dxy1mAgo: 101.2,
    oilNow: 76,
    oil3mAgo: 84,
    vixNow: 27.5,
  },
  currencies: {
    USD: createCurrencyRaw({
      cpiActual: 3.0,
      cpiForecast: 3.1,
      cpiPrevious: 3.3,
      rateActual: 5.5,
      rateForecast: 5.5,
      ratePrevious: 5.25,
      pmiActual: 49.8,
      pmiForecast: 50.5,
      pmiPrevious: 50.4,
      yield2yNow: 4.12,
      yield2y1mAgo: 4.55,
      yield10yNow: 3.82,
      yield10y1mAgo: 4.19,
      cotPercentile: 74,
      eventRisk: 3,
      seasonality: 0.2,
    }),
    EUR: createCurrencyRaw({
      cpiActual: 2.6,
      cpiForecast: 2.5,
      cpiPrevious: 2.4,
      rateActual: 4.25,
      rateForecast: 4.25,
      ratePrevious: 4.0,
      pmiActual: 47.2,
      pmiForecast: 48.1,
      pmiPrevious: 47.8,
      yield2yNow: 2.72,
      yield2y1mAgo: 2.84,
      yield10yNow: 2.26,
      yield10y1mAgo: 2.42,
      cotPercentile: 48,
      eventRisk: 2,
      seasonality: -0.2,
    }),
    JPY: createCurrencyRaw({
      cpiActual: 2.8,
      cpiForecast: 2.7,
      cpiPrevious: 2.6,
      rateActual: 0.25,
      rateForecast: 0.25,
      ratePrevious: 0.1,
      pmiActual: 49.0,
      pmiForecast: 49.7,
      pmiPrevious: 49.5,
      yield2yNow: 0.27,
      yield2y1mAgo: 0.2,
      yield10yNow: 0.98,
      yield10y1mAgo: 1.06,
      cotPercentile: 18,
      eventRisk: 1,
      seasonality: 0.8,
    }),
    GBP: createCurrencyRaw({
      cpiActual: 3.3,
      cpiForecast: 3.2,
      cpiPrevious: 3.4,
      rateActual: 5.25,
      rateForecast: 5.25,
      ratePrevious: 5.25,
      pmiActual: 50.2,
      pmiForecast: 50.1,
      pmiPrevious: 49.8,
      yield2yNow: 4.18,
      yield2y1mAgo: 4.3,
      yield10yNow: 3.98,
      yield10y1mAgo: 4.08,
      cotPercentile: 52,
      eventRisk: 2,
      seasonality: 0.1,
    }),
    AUD: createCurrencyRaw({
      cpiActual: 4.0,
      cpiForecast: 3.8,
      cpiPrevious: 4.1,
      rateActual: 4.35,
      rateForecast: 4.35,
      ratePrevious: 4.35,
      pmiActual: 49.9,
      pmiForecast: 50.3,
      pmiPrevious: 50.1,
      yield2yNow: 3.75,
      yield2y1mAgo: 3.92,
      yield10yNow: 4.01,
      yield10y1mAgo: 4.22,
      cotPercentile: 14,
      eventRisk: 1,
      seasonality: -0.2,
    }),
    NZD: createCurrencyRaw({
      cpiActual: 3.5,
      cpiForecast: 3.4,
      cpiPrevious: 3.6,
      rateActual: 5.5,
      rateForecast: 5.5,
      ratePrevious: 5.5,
      pmiActual: 49.4,
      pmiForecast: 50.0,
      pmiPrevious: 49.9,
      yield2yNow: 4.4,
      yield2y1mAgo: 4.58,
      yield10yNow: 4.31,
      yield10y1mAgo: 4.49,
      cotPercentile: 19,
      eventRisk: 1,
      seasonality: -0.2,
    }),
    CAD: createCurrencyRaw({
      cpiActual: 2.7,
      cpiForecast: 2.8,
      cpiPrevious: 2.9,
      rateActual: 4.75,
      rateForecast: 4.75,
      ratePrevious: 5.0,
      pmiActual: 49.8,
      pmiForecast: 50.2,
      pmiPrevious: 50.0,
      yield2yNow: 3.35,
      yield2y1mAgo: 3.6,
      yield10yNow: 3.12,
      yield10y1mAgo: 3.28,
      cotPercentile: 20,
      eventRisk: 2,
      seasonality: -0.1,
    }),
    CHF: createCurrencyRaw({
      cpiActual: 1.4,
      cpiForecast: 1.5,
      cpiPrevious: 1.6,
      rateActual: 1.25,
      rateForecast: 1.25,
      ratePrevious: 1.0,
      pmiActual: 47.7,
      pmiForecast: 48.2,
      pmiPrevious: 48.0,
      yield2yNow: 0.75,
      yield2y1mAgo: 0.66,
      yield10yNow: 0.61,
      yield10y1mAgo: 0.56,
      cotPercentile: 62,
      eventRisk: 1,
      seasonality: 0.2,
    }),
  },
});

function deriveGlobal(rawGlobal) {
  return {
    spx1mChange: pctChange(rawGlobal.spxNow, rawGlobal.spx1mAgo),
    dxy1mChange: pctChange(rawGlobal.dxyNow, rawGlobal.dxy1mAgo),
    oil3mChange: pctChange(rawGlobal.oilNow, rawGlobal.oil3mAgo),
    vix: safeNumber(rawGlobal.vixNow, 0),
  };
}

function deriveCurrency(raw) {
  return {
    cpiSurprise: Number((raw.cpiActual - raw.cpiForecast).toFixed(2)),
    cpiMomentum: Number((raw.cpiActual - raw.cpiPrevious).toFixed(2)),
    rateSurprise: Number((raw.rateActual - raw.rateForecast).toFixed(2)),
    rateMomentum: Number((raw.rateActual - raw.ratePrevious).toFixed(2)),
    pmiSurprise: Number((raw.pmiActual - raw.pmiForecast).toFixed(2)),
    pmiMomentum: Number((raw.pmiActual - raw.pmiPrevious).toFixed(2)),
    yield2yChange: diff(raw.yield2yNow, raw.yield2y1mAgo),
    yield10yChange: diff(raw.yield10yNow, raw.yield10y1mAgo),
  };
}

function deriveRiskRegime(global) {
  if (global.vix >= 28 || global.spx1mChange <= -6) return "strong_risk_off";
  if (global.vix >= 22 || global.spx1mChange <= -2 || global.dxy1mChange >= 2) return "mild_risk_off";
  if (global.vix <= 14 && global.spx1mChange >= 4 && global.oil3mChange >= 4) return "strong_risk_on";
  if (global.vix <= 18 && global.spx1mChange >= 1) return "mild_risk_on";
  return "neutral";
}

function deriveMarketFocus(global) {
  if (Math.abs(global.dxy1mChange) >= 2) return "rates";
  if (global.vix >= 22 || Math.abs(global.spx1mChange) >= 4) return "risk";
  return "balanced";
}

const BASE_WEIGHTS = {
  inflation: 1.3,
  rates: 2.1,
  growth: 1.2,
  bonds: 1.8,
  risk: 1.5,
  commodities: 1.1,
  cot: 1.0,
  eventRisk: 0.6,
  seasonality: 0.5,
};

const CURRENCY_MODS = {
  USD: { rates: 1.15, bonds: 1.2, risk: 1.05 },
  EUR: { rates: 1.05, bonds: 1.05 },
  JPY: { rates: 1.15, risk: 1.45, cot: 1.1 },
  GBP: { inflation: 1.1, rates: 1.05 },
  AUD: { risk: 1.3, commodities: 1.35, seasonality: 1.1 },
  NZD: { risk: 1.2, commodities: 1.15, seasonality: 1.1 },
  CAD: { risk: 1.15, commodities: 1.45, bonds: 1.05, seasonality: 1.05 },
  CHF: { risk: 1.35, seasonality: 0.85, cot: 0.95 },
};

function inflationDirection(raw, derived) {
  let score = 0;
  if (derived.cpiSurprise >= 0.2) score += 1;
  if (derived.cpiSurprise <= -0.2) score -= 1;
  if (derived.cpiMomentum >= 0.2) score += 1;
  if (derived.cpiMomentum <= -0.2) score -= 1;
  return clamp(score, -2, 2);
}

function ratesDirection(raw, derived, avgRate) {
  let score = 0;
  const rateDiff = raw.rateActual - avgRate;

  if (rateDiff >= 1.5) score += 1;
  else if (rateDiff <= -1.5) score -= 1;

  if (derived.rateSurprise > 0.05) score += 1;
  else if (derived.rateSurprise < -0.05) score -= 1;

  if (derived.rateMomentum > 0.05) score += 1;
  else if (derived.rateMomentum < -0.05) score -= 1;

  return clamp(score, -2, 2);
}

function growthDirection(raw, derived) {
  let score = 0;
  if (raw.pmiActual >= 52) score += 1;
  else if (raw.pmiActual <= 49) score -= 1;

  if (derived.pmiSurprise >= 0.5) score += 1;
  else if (derived.pmiSurprise <= -0.5) score -= 1;

  if (derived.pmiMomentum >= 0.5) score += 1;
  else if (derived.pmiMomentum <= -0.5) score -= 1;

  return clamp(score, -2, 2);
}

function bondsDirection(raw, derived, avg2y, avg10y) {
  let score = 0;
  const diff2y = raw.yield2yNow - avg2y;
  const diff10y = raw.yield10yNow - avg10y;

  if (diff2y >= 0.5) score += 1;
  else if (diff2y <= -0.5) score -= 1;

  if (derived.yield2yChange >= 0.08) score += 1;
  else if (derived.yield2yChange <= -0.08) score -= 1;

  if (diff10y >= 0.25 && derived.yield10yChange >= 0.05) score += 1;
  else if (diff10y <= -0.25 && derived.yield10yChange <= -0.05) score -= 1;

  return clamp(score, -2, 2);
}

function riskDirection(currency, riskRegime, global) {
  const riskMap = {
    strong_risk_on: 2,
    mild_risk_on: 1,
    neutral: 0,
    mild_risk_off: -1,
    strong_risk_off: -2,
  };

  const regimeScore = riskMap[riskRegime] ?? 0;
  const riskCurrencies = ["AUD", "NZD", "CAD"];
  const safeHavens = ["JPY", "CHF"];

  if (riskCurrencies.includes(currency)) return regimeScore;
  if (safeHavens.includes(currency)) return -regimeScore;
  if (currency === "USD") {
    if (global.dxy1mChange >= 2) return 1;
    if (riskRegime.includes("risk_off")) return 1;
    if (riskRegime.includes("risk_on")) return -1;
  }
  return clamp(regimeScore * 0.5, -2, 2);
}

function commodityDirection(currency, global) {
  let score = 0;

  if (currency === "CAD") {
    if (global.oil3mChange >= 10) score = 2;
    else if (global.oil3mChange >= 3) score = 1;
    else if (global.oil3mChange <= -10) score = -2;
    else if (global.oil3mChange <= -3) score = -1;
  } else if (currency === "AUD" || currency === "NZD") {
    if (global.oil3mChange >= 8 && global.spx1mChange >= 0) score = 1;
    else if (global.oil3mChange <= -8 && global.spx1mChange < 0) score = -1;
  }

  return score;
}

function cotDirection(percentile) {
  if (percentile <= 15) return 2;
  if (percentile <= 30) return 1;
  if (percentile >= 85) return -2;
  if (percentile >= 70) return -1;
  return 0;
}

function eventRiskDirection(eventRisk, currency) {
  const safeCurrencies = ["JPY", "CHF", "USD"];
  if (eventRisk >= 4) return safeCurrencies.includes(currency) ? 0.5 : -0.5;
  if (eventRisk <= 1) return 0;
  return 0;
}

function seasonalityDirection(value) {
  return clamp(safeNumber(value, 0), -1, 1);
}

function activationFactor(marketFocus, key) {
  let a = 1;
  if (marketFocus === "rates") {
    if (["rates", "bonds", "inflation"].includes(key)) a = 1.2;
    if (["seasonality", "cot"].includes(key)) a = 0.9;
  }
  if (marketFocus === "risk") {
    if (["risk", "commodities"].includes(key)) a = 1.2;
    if (["seasonality"].includes(key)) a = 0.9;
  }
  return a;
}

function scoreCurrency(currency, raw, derived, global, context) {
  const mods = CURRENCY_MODS[currency] || {};
  const mod = (k) => mods[k] || 1;

  const factors = {
    inflation: inflationDirection(raw, derived),
    rates: ratesDirection(raw, derived, context.avgRate),
    growth: growthDirection(raw, derived),
    bonds: bondsDirection(raw, derived, context.avg2y, context.avg10y),
    risk: riskDirection(currency, context.riskRegime, global),
    commodities: commodityDirection(currency, global),
    cot: cotDirection(raw.cotPercentile),
    eventRisk: eventRiskDirection(raw.eventRisk, currency),
    seasonality: seasonalityDirection(raw.seasonality),
  };

  const rows = Object.entries(factors).map(([key, direction]) => {
    const activation = activationFactor(context.marketFocus, key);
    const baseWeight = BASE_WEIGHTS[key];
    const finalWeight = baseWeight * mod(key);
    const contribution = direction * finalWeight * activation;

    return {
      key,
      direction,
      activation: Number(activation.toFixed(2)),
      baseWeight,
      modifier: mod(key),
      finalWeight: Number(finalWeight.toFixed(2)),
      contribution: Number(contribution.toFixed(2)),
    };
  });

  const rawScore = formatScore(rows.reduce((sum, r) => sum + r.contribution, 0));

  const aligned = rows.filter((r) => Math.sign(r.contribution) === Math.sign(rawScore) && r.direction !== 0).length;
  const conflicting = rows.filter((r) => Math.sign(r.contribution) !== Math.sign(rawScore) && r.direction !== 0).length;
  const neutral = rows.filter((r) => r.direction === 0).length;

  let confidence = 50 + aligned * 6 - conflicting * 8 - neutral * 1.5;
  confidence = clamp(Number(confidence.toFixed(1)), 0, 100);

  return {
    rawScore,
    probabilityUp: probabilityFromScore(rawScore),
    probabilityDown: Number((100 - probabilityFromScore(rawScore)).toFixed(1)),
    regime: regimeLabel(rawScore),
    confidence,
    rows,
  };
}

function pairScore(base, quote) {
  const raw = formatScore(base.rawScore - quote.rawScore);
  const divergenceBonus = Math.abs(raw) >= 8 ? 12 : Math.abs(raw) >= 5 ? 7 : Math.abs(raw) >= 3 ? 3 : 0;
  const confidence = clamp(Number((((base.confidence + quote.confidence) / 2) + divergenceBonus).toFixed(1)), 0, 100);
  const noTrade = Math.abs(raw) < 2 || confidence < 58;

  return {
    raw,
    probabilityBaseUp: probabilityFromScore(raw),
    regime: regimeLabel(raw),
    confidence,
    divergenceBonus,
    noTrade,
  };
}

function deriveAll(snapshot) {
  const global = deriveGlobal(snapshot.raw.global);
  const riskRegime = deriveRiskRegime(global);
  const marketFocus = deriveMarketFocus(global);

  const derivedCurrencies = {};
  const rawCurrencies = snapshot.raw.currencies;

  CURRENCIES.forEach((c) => {
    derivedCurrencies[c] = deriveCurrency(rawCurrencies[c]);
  });

  const avgRate =
    CURRENCIES.reduce((sum, c) => sum + safeNumber(rawCurrencies[c].rateActual, 0), 0) /
    CURRENCIES.length;

  const avg2y =
    CURRENCIES.reduce((sum, c) => sum + safeNumber(rawCurrencies[c].yield2yNow, 0), 0) /
    CURRENCIES.length;

  const avg10y =
    CURRENCIES.reduce((sum, c) => sum + safeNumber(rawCurrencies[c].yield10yNow, 0), 0) /
    CURRENCIES.length;

  const scores = {};
  CURRENCIES.forEach((c) => {
    scores[c] = scoreCurrency(c, rawCurrencies[c], derivedCurrencies[c], global, {
      avgRate,
      avg2y,
      avg10y,
      riskRegime,
      marketFocus,
    });
  });

  const ranking = [...CURRENCIES]
    .map((c) => ({ currency: c, ...scores[c] }))
    .sort((a, b) => b.rawScore - a.rawScore);

  const pairRanking = [];
  for (const base of CURRENCIES) {
    for (const quote of CURRENCIES) {
      if (base === quote) continue;
      pairRanking.push({
        pair: `${base}/${quote}`,
        ...pairScore(scores[base], scores[quote]),
      });
    }
  }
  pairRanking.sort((a, b) => b.raw - a.raw);

  return {
    global,
    derivedCurrencies,
    scores,
    ranking,
    pairRanking,
    riskRegime,
    marketFocus,
  };
}

function NumberField({ label, value, onChange, step = 0.1 }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(safeNumber(e.target.value, 0))}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
      />
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
      />
    </label>
  );
}

function ScatterPlot({ points }) {
  const width = 640;
  const height = 320;
  const pad = 30;
  const xMin = 20;
  const xMax = 120;
  const yMin = -6;
  const yMax = 6;

  const mapX = (x) => pad + ((x - xMin) / (xMax - xMin)) * (width - pad * 2);
  const mapY = (y) => height - pad - ((y - yMin) / (yMax - yMin)) * (height - pad * 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", height: 320, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12 }}
    >
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={mapY(0)} x2={width - pad} y2={mapY(0)} stroke="#94a3b8" strokeDasharray="4 4" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={mapX(p.x)} cy={mapY(p.y)} r="5" fill="#2563eb" />
          <title>{`${p.name} | ${p.x}d | ${p.y}`}</title>
        </g>
      ))}
    </svg>
  );
}

function buildScatter(rows) {
  const models = [
    { name: "Inflation", x: 30, keys: ["inflation"] },
    { name: "Rates", x: 45, keys: ["rates"] },
    { name: "Growth", x: 35, keys: ["growth"] },
    { name: "Bonds", x: 50, keys: ["bonds"] },
    { name: "Risk", x: 25, keys: ["risk"] },
    { name: "Flow", x: 40, keys: ["cot"] },
    { name: "Composite", x: 70, keys: ["rates", "bonds", "risk", "inflation"] },
  ];

  return models.map((m, idx) => {
    const matched = rows.filter((r) => m.keys.includes(r.key));
    const avg =
      matched.length > 0 ? matched.reduce((sum, r) => sum + r.contribution, 0) / matched.length : 0;

    return {
      name: m.name,
      x: m.x,
      y: Number((avg + ((idx % 3) - 1) * 0.2).toFixed(2)),
    };
  });
}

function SnapshotManager({
  sectionName,
  snapshot,
  updateMeta,
  savedSnapshots,
  onSave,
  onLoad,
  onDelete,
  onExport,
  onImport,
}) {
  return (
    <div style={cardStyle()}>
      <h3 style={{ marginTop: 0 }}>{sectionName} Snapshot-Manager</h3>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          marginBottom: 16,
        }}
      >
        <TextField label="Snapshot-Name" value={snapshot.meta.name} onChange={(v) => updateMeta("name", v)} />
        <DateField
          label="Snapshot-Datum"
          value={snapshot.meta.snapshotDate}
          onChange={(v) => updateMeta("snapshotDate", v)}
        />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button style={buttonStyle()} onClick={onSave}>
          Snapshot speichern
        </button>
        <button style={buttonStyle()} onClick={onExport}>
          Snapshots exportieren
        </button>
        <label style={{ ...buttonStyle(), display: "inline-flex", alignItems: "center" }}>
          Snapshots importieren
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={onImport} />
        </label>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {savedSnapshots.length === 0 && (
          <div style={{ color: "#64748b" }}>Noch keine gespeicherten Snapshots.</div>
        )}

        {savedSnapshots.map((item) => (
          <div
            key={item.meta.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{item.meta.name}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>{item.meta.snapshotDate}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={buttonStyle()} onClick={() => onLoad(item.meta.id)}>
                Laden
              </button>
              <button
                style={{
                  ...buttonStyle(),
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#991b1b",
                }}
                onClick={() => onDelete(item.meta.id)}
              >
                Löschen
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewPanel({
  snapshot,
  engine,
  selectedCurrency,
  setSelectedCurrency,
  base,
  setBase,
  quote,
  setQuote,
  sectionName,
}) {
  const currentCurrency = engine.scores[selectedCurrency];
  const currentPair = pairScore(engine.scores[base], engine.scores[quote]);
  const scatter = buildScatter(currentCurrency.rows);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          ...cardStyle(),
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Datum</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>{snapshot.meta.snapshotDate}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Name</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>{snapshot.meta.name}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Risk Regime</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>{engine.riskRegime}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#64748b" }}>Marktfokus</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>{engine.marketFocus}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        <div style={cardStyle()}>
          <h3 style={{ marginTop: 0 }}>Stärkste Währungen</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {engine.ranking.slice(0, 3).map((item) => (
              <div key={item.currency} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{item.currency}</strong>
                  <span style={badgeStyle(item.regime)}>{item.regime}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>Score: {item.rawScore}</div>
                <div style={{ fontSize: 14, color: "#475569" }}>Konfidenz: {item.confidence}%</div>
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle()}>
          <h3 style={{ marginTop: 0 }}>Schwächste Währungen</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {[...engine.ranking].reverse().slice(0, 3).map((item) => (
              <div key={item.currency} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{item.currency}</strong>
                  <span style={badgeStyle(item.regime)}>{item.regime}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>Score: {item.rawScore}</div>
                <div style={{ fontSize: 14, color: "#475569" }}>Konfidenz: {item.confidence}%</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle(), gridColumn: "span 2" }}>
          <h3 style={{ marginTop: 0 }}>Beste Paare nach Divergenz</h3>
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {engine.pairRanking.slice(0, 6).map((item) => (
              <div key={item.pair} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>{item.pair}</strong>
                  <span style={badgeStyle(item.regime)}>{item.regime}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 14, color: "#475569" }}>Pair Score: {item.raw}</div>
                <div style={{ fontSize: 14, color: "#475569" }}>Konfidenz: {item.confidence}%</div>
                <div style={{ color: item.noTrade ? "#991b1b" : "#166534", fontSize: 13, marginTop: 4 }}>
                  {item.noTrade ? "No Trade" : "Trade-fähig"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={cardStyle()}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <strong>{sectionName} Modell-Scatter</strong>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span style={badgeStyle(currentCurrency.regime)}>{currentCurrency.regime}</span>
            <span style={{ fontSize: 14, color: "#475569" }}>Score: {currentCurrency.rawScore}</span>
            <span style={{ fontSize: 14, color: "#475569" }}>
              Konfidenz: {currentCurrency.confidence}% ({confidenceLabel(currentCurrency.confidence)})
            </span>
          </div>
          <ScatterPlot points={scatter} />
        </div>

        <div style={cardStyle()}>
          <h3 style={{ marginTop: 0 }}>Aktiver Pair-Bias</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <select value={base} onChange={(e) => setBase(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span>/</span>
            <select value={quote} onChange={(e) => setQuote(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Paar</div>
              <div style={{ fontWeight: 700, fontSize: 24 }}>{base}/{quote}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Pair Score</div>
              <div style={{ fontWeight: 700, fontSize: 24 }}>{currentPair.raw}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Wahrscheinlichkeit Base steigt</div>
              <div style={{ fontWeight: 700, fontSize: 24 }}>{currentPair.probabilityBaseUp}%</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Status</div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 22,
                  color: currentPair.noTrade ? "#991b1b" : "#166534",
                }}
              >
                {currentPair.noTrade ? "No Trade" : "Ok"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RawInputsPanel({ snapshot, updateMeta, updateGlobalRaw, updateCurrencyRaw, engine, sectionName }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>{sectionName} Meta & globale Rohdaten</h3>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          }}
        >
          <DateField label="Datum" value={snapshot.meta.snapshotDate} onChange={(v) => updateMeta("snapshotDate", v)} />
          <TextField label="Name" value={snapshot.meta.name} onChange={(v) => updateMeta("name", v)} />

          <NumberField label="SPX jetzt" value={snapshot.raw.global.spxNow} onChange={(v) => updateGlobalRaw("spxNow", v)} />
          <NumberField label="SPX vor 1M" value={snapshot.raw.global.spx1mAgo} onChange={(v) => updateGlobalRaw("spx1mAgo", v)} />

          <NumberField label="DXY jetzt" value={snapshot.raw.global.dxyNow} onChange={(v) => updateGlobalRaw("dxyNow", v)} />
          <NumberField label="DXY vor 1M" value={snapshot.raw.global.dxy1mAgo} onChange={(v) => updateGlobalRaw("dxy1mAgo", v)} />

          <NumberField label="Öl jetzt" value={snapshot.raw.global.oilNow} onChange={(v) => updateGlobalRaw("oilNow", v)} />
          <NumberField label="Öl vor 3M" value={snapshot.raw.global.oil3mAgo} onChange={(v) => updateGlobalRaw("oil3mAgo", v)} />

          <NumberField label="VIX jetzt" value={snapshot.raw.global.vixNow} onChange={(v) => updateGlobalRaw("vixNow", v)} />
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 8, color: "#475569", fontSize: 14 }}>
          <div>SPX 1M Change: <strong>{engine.global.spx1mChange}%</strong></div>
          <div>DXY 1M Change: <strong>{engine.global.dxy1mChange}%</strong></div>
          <div>Öl 3M Change: <strong>{engine.global.oil3mChange}%</strong></div>
          <div>Risk Regime: <strong>{engine.riskRegime}</strong></div>
          <div>Marktfokus: <strong>{engine.marketFocus}</strong></div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
        }}
      >
        {CURRENCIES.map((ccy) => {
          const raw = snapshot.raw.currencies[ccy];
          const derived = engine.derivedCurrencies[ccy];

          return (
            <div key={ccy} style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>{ccy}</h3>

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                }}
              >
                <NumberField label="CPI Actual" value={raw.cpiActual} onChange={(v) => updateCurrencyRaw(ccy, "cpiActual", v)} />
                <NumberField label="CPI Forecast" value={raw.cpiForecast} onChange={(v) => updateCurrencyRaw(ccy, "cpiForecast", v)} />
                <NumberField label="CPI Previous" value={raw.cpiPrevious} onChange={(v) => updateCurrencyRaw(ccy, "cpiPrevious", v)} />

                <NumberField label="Rate Actual" value={raw.rateActual} onChange={(v) => updateCurrencyRaw(ccy, "rateActual", v)} />
                <NumberField label="Rate Forecast" value={raw.rateForecast} onChange={(v) => updateCurrencyRaw(ccy, "rateForecast", v)} />
                <NumberField label="Rate Previous" value={raw.ratePrevious} onChange={(v) => updateCurrencyRaw(ccy, "ratePrevious", v)} />

                <NumberField label="PMI Actual" value={raw.pmiActual} onChange={(v) => updateCurrencyRaw(ccy, "pmiActual", v)} />
                <NumberField label="PMI Forecast" value={raw.pmiForecast} onChange={(v) => updateCurrencyRaw(ccy, "pmiForecast", v)} />
                <NumberField label="PMI Previous" value={raw.pmiPrevious} onChange={(v) => updateCurrencyRaw(ccy, "pmiPrevious", v)} />

                <NumberField label="2Y jetzt" value={raw.yield2yNow} onChange={(v) => updateCurrencyRaw(ccy, "yield2yNow", v)} step={0.001} />
                <NumberField label="2Y vor 1M" value={raw.yield2y1mAgo} onChange={(v) => updateCurrencyRaw(ccy, "yield2y1mAgo", v)} step={0.001} />
                <NumberField label="10Y jetzt" value={raw.yield10yNow} onChange={(v) => updateCurrencyRaw(ccy, "yield10yNow", v)} step={0.001} />

                <NumberField label="10Y vor 1M" value={raw.yield10y1mAgo} onChange={(v) => updateCurrencyRaw(ccy, "yield10y1mAgo", v)} step={0.001} />
                <NumberField label="COT Percentile" value={raw.cotPercentile} onChange={(v) => updateCurrencyRaw(ccy, "cotPercentile", clamp(v, 0, 100))} step={1} />
                <NumberField label="Event Risk" value={raw.eventRisk} onChange={(v) => updateCurrencyRaw(ccy, "eventRisk", v)} step={1} />

                <NumberField label="Seasonality (-1 bis 1)" value={raw.seasonality} onChange={(v) => updateCurrencyRaw(ccy, "seasonality", clamp(v, -1, 1))} step={0.1} />
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  fontSize: 14,
                  color: "#475569",
                }}
              >
                <div>CPI Surprise: <strong>{derived.cpiSurprise}</strong></div>
                <div>CPI Momentum: <strong>{derived.cpiMomentum}</strong></div>
                <div>Rate Surprise: <strong>{derived.rateSurprise}</strong></div>
                <div>Rate Momentum: <strong>{derived.rateMomentum}</strong></div>
                <div>PMI Surprise: <strong>{derived.pmiSurprise}</strong></div>
                <div>PMI Momentum: <strong>{derived.pmiMomentum}</strong></div>
                <div>2Y Change: <strong>{derived.yield2yChange}</strong></div>
                <div>10Y Change: <strong>{derived.yield10yChange}</strong></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownPanel({ engine, selectedCurrency, setSelectedCurrency }) {
  const rows = engine.scores[selectedCurrency].rows;

  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>Automatische Faktoraufschlüsselung</h3>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          style={{ padding: 8, borderRadius: 8 }}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
              <th style={{ padding: 10 }}>Faktor</th>
              <th style={{ padding: 10 }}>Direction</th>
              <th style={{ padding: 10 }}>Activation</th>
              <th style={{ padding: 10 }}>Base Weight</th>
              <th style={{ padding: 10 }}>Modifier</th>
              <th style={{ padding: 10 }}>Final Weight</th>
              <th style={{ padding: 10 }}>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: 10, fontWeight: 700 }}>{r.key}</td>
                <td style={{ padding: 10 }}>{r.direction}</td>
                <td style={{ padding: 10 }}>{r.activation}</td>
                <td style={{ padding: 10 }}>{r.baseWeight}</td>
                <td style={{ padding: 10 }}>{r.modifier}</td>
                <td style={{ padding: 10 }}>{r.finalWeight}</td>
                <td style={{ padding: 10, fontWeight: 700, color: r.contribution >= 0 ? "#166534" : "#991b1b" }}>
                  {r.contribution}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PairRankingPanel({ engine }) {
  return (
    <div style={cardStyle()}>
      <h3 style={{ marginTop: 0 }}>Pair-Ranking</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #cbd5e1", textAlign: "left" }}>
              <th style={{ padding: 10 }}>Pair</th>
              <th style={{ padding: 10 }}>Score</th>
              <th style={{ padding: 10 }}>Regime</th>
              <th style={{ padding: 10 }}>Konfidenz</th>
              <th style={{ padding: 10 }}>Wahrscheinlichkeit Base steigt</th>
              <th style={{ padding: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {engine.pairRanking.slice(0, 28).map((row) => (
              <tr key={row.pair} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: 10, fontWeight: 700 }}>{row.pair}</td>
                <td style={{ padding: 10, fontWeight: 700, color: row.raw >= 0 ? "#166534" : "#991b1b" }}>{row.raw}</td>
                <td style={{ padding: 10 }}>
                  <span style={badgeStyle(row.regime)}>{row.regime}</span>
                </td>
                <td style={{ padding: 10 }}>{row.confidence}%</td>
                <td style={{ padding: 10 }}>{row.probabilityBaseUp}%</td>
                <td style={{ padding: 10, fontWeight: 700, color: row.noTrade ? "#991b1b" : "#166534" }}>
                  {row.noTrade ? "No Trade" : "Ok"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [topTab, setTopTab] = useState("live");
  const [subTab, setSubTab] = useState("overview");

  const [liveSnapshot, setLiveSnapshot] = useState(structuredClone(LIVE_DEFAULT));
  const [backtestSnapshot, setBacktestSnapshot] = useState(structuredClone(BACKTEST_DEFAULT));
  const [savedSnapshots, setSavedSnapshots] = useState([]);

  const [liveSelectedCurrency, setLiveSelectedCurrency] = useState("USD");
  const [backtestSelectedCurrency, setBacktestSelectedCurrency] = useState("USD");
  const [liveBase, setLiveBase] = useState("USD");
  const [liveQuote, setLiveQuote] = useState("JPY");
  const [backtestBase, setBacktestBase] = useState("AUD");
  const [backtestQuote, setBacktestQuote] = useState("JPY");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSavedSnapshots(JSON.parse(raw));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSnapshots));
  }, [savedSnapshots]);

  const liveEngine = useMemo(() => deriveAll(liveSnapshot), [liveSnapshot]);
  const backtestEngine = useMemo(() => deriveAll(backtestSnapshot), [backtestSnapshot]);

  const isLive = topTab === "live";
  const snapshot = isLive ? liveSnapshot : backtestSnapshot;
  const setSnapshot = isLive ? setLiveSnapshot : setBacktestSnapshot;
  const engine = isLive ? liveEngine : backtestEngine;
  const sectionName = isLive ? "Live" : "Backtest";

  const selectedCurrency = isLive ? liveSelectedCurrency : backtestSelectedCurrency;
  const setSelectedCurrency = isLive ? setLiveSelectedCurrency : setBacktestSelectedCurrency;
  const base = isLive ? liveBase : backtestBase;
  const quote = isLive ? liveQuote : backtestQuote;
  const setBase = isLive ? setLiveBase : setBacktestBase;
  const setQuote = isLive ? setLiveQuote : setBacktestQuote;

  function updateMeta(key, value) {
    setSnapshot((prev) => ({
      ...prev,
      meta: { ...prev.meta, [key]: value },
    }));
  }

  function updateGlobalRaw(key, value) {
    setSnapshot((prev) => ({
      ...prev,
      raw: {
        ...prev.raw,
        global: {
          ...prev.raw.global,
          [key]: value,
        },
      },
    }));
  }

  function updateCurrencyRaw(currency, key, value) {
    setSnapshot((prev) => ({
      ...prev,
      raw: {
        ...prev.raw,
        currencies: {
          ...prev.raw.currencies,
          [currency]: {
            ...prev.raw.currencies[currency],
            [key]: value,
          },
        },
      },
    }));
  }

  function saveSnapshot() {
    const snap = structuredClone(snapshot);
    setSavedSnapshots((prev) => {
      const filtered = prev.filter((x) => x.meta.id !== snap.meta.id);
      return [snap, ...filtered].slice(0, 100);
    });
  }

  function loadSnapshot(id) {
    const found = savedSnapshots.find((x) => x.meta.id === id);
    if (!found) return;
    setSnapshot(structuredClone(found));
  }

  function deleteSnapshot(id) {
    setSavedSnapshots((prev) => prev.filter((x) => x.meta.id !== id));
  }

  function exportSnapshots() {
    const blob = new Blob([JSON.stringify(savedSnapshots, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forex-macro-snapshots.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importSnapshots(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "[]"));

        if (Array.isArray(parsed)) {
          setSavedSnapshots(parsed);
          return;
        }

        if (parsed && parsed.meta && parsed.raw) {
          setSnapshot(parsed);
          return;
        }

        alert("Import fehlgeschlagen: ungültiges Snapshot-Format");
      } catch (e) {
        alert("Import fehlgeschlagen: ungültige JSON-Datei");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  function resetCurrent() {
    if (isLive) setLiveSnapshot(structuredClone(LIVE_DEFAULT));
    else setBacktestSnapshot(structuredClone(BACKTEST_DEFAULT));
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 24,
        fontFamily: "Arial, sans-serif",
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 1540, margin: "0 auto", display: "grid", gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Forex Macro Bias Engine</h1>
          <p style={{ color: "#475569" }}>
            Rohdaten eingeben, Differenzen automatisch berechnen, Scores automatisch ableiten,
            Live- und Backtest-Wochen archivieren, importieren und exportieren.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={buttonStyle(topTab === "live")} onClick={() => setTopTab("live")}>
            Live
          </button>
          <button style={buttonStyle(topTab === "backtest")} onClick={() => setTopTab("backtest")}>
            Backtesting
          </button>
          <button style={buttonStyle(false)} onClick={resetCurrent}>
            Auf Standard zurücksetzen
          </button>
        </div>

        <SnapshotManager
          sectionName={sectionName}
          snapshot={snapshot}
          updateMeta={updateMeta}
          savedSnapshots={savedSnapshots}
          onSave={saveSnapshot}
          onLoad={loadSnapshot}
          onDelete={deleteSnapshot}
          onExport={exportSnapshots}
          onImport={importSnapshots}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button style={buttonStyle(subTab === "overview")} onClick={() => setSubTab("overview")}>
            Übersicht
          </button>
          <button style={buttonStyle(subTab === "raw")} onClick={() => setSubTab("raw")}>
            {sectionName} Rohdaten-Eingabe
          </button>
          <button style={buttonStyle(subTab === "breakdown")} onClick={() => setSubTab("breakdown")}>
            {sectionName} Faktoraufschlüsselung
          </button>
          <button style={buttonStyle(subTab === "pairs")} onClick={() => setSubTab("pairs")}>
            {sectionName} Pair-Ranking
          </button>
        </div>

        {subTab === "overview" && (
          <OverviewPanel
            snapshot={snapshot}
            engine={engine}
            selectedCurrency={selectedCurrency}
            setSelectedCurrency={setSelectedCurrency}
            base={base}
            setBase={setBase}
            quote={quote}
            setQuote={setQuote}
            sectionName={sectionName}
          />
        )}

        {subTab === "raw" && (
          <RawInputsPanel
            snapshot={snapshot}
            updateMeta={updateMeta}
            updateGlobalRaw={updateGlobalRaw}
            updateCurrencyRaw={updateCurrencyRaw}
            engine={engine}
            sectionName={sectionName}
          />
        )}

        {subTab === "breakdown" && (
          <BreakdownPanel
            engine={engine}
            selectedCurrency={selectedCurrency}
            setSelectedCurrency={setSelectedCurrency}
          />
        )}

        {subTab === "pairs" && <PairRankingPanel engine={engine} />}
      </div>
    </div>
  );
}

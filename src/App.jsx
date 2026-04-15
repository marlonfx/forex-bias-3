import React, { useEffect, useMemo, useState } from "react";

const CURRENCIES = ["USD", "EUR", "JPY", "GBP", "AUD", "NZD", "CAD", "CHF"];
const STORAGE_KEY = "forex_macro_bias_snapshots_v1";

const FACTOR_CONFIG = {
  rateDifferential: { label: "Zinsdifferenz", baseWeight: 1.8, group: "Rates" },
  inflationSurprise: { label: "Inflationsüberraschung", baseWeight: 1.2, group: "Inflation" },
  growthMomentum: { label: "Wachstumsdynamik", baseWeight: 1.3, group: "Growth" },
  bondConfirmation: { label: "Bond-Bestätigung", baseWeight: 1.4, group: "Bonds" },
  riskSentiment: { label: "Risiko-Stimmung", baseWeight: 1.2, group: "Risk" },
  commodityLinkage: { label: "Rohstoff-Faktor", baseWeight: 1.1, group: "Commodities" },
  cotPositioning: { label: "COT Positionierung", baseWeight: 1.0, group: "Flow" },
  seasonality: { label: "Seasonality", baseWeight: 0.4, group: "Context" },
  eventRisk: { label: "Event Risk", baseWeight: 0.7, group: "Risk" },
};

const FACTOR_KEYS = Object.keys(FACTOR_CONFIG);

const CURRENCY_MODIFIERS = {
  USD: { bondConfirmation: 1.2, riskSentiment: 1.1 },
  EUR: { growthMomentum: 1.1 },
  JPY: { rateDifferential: 1.2, riskSentiment: 1.35, cotPositioning: 1.1 },
  GBP: { growthMomentum: 1.1 },
  AUD: { riskSentiment: 1.25, commodityLinkage: 1.35, cotPositioning: 1.1, seasonality: 1.25 },
  NZD: { riskSentiment: 1.2, commodityLinkage: 1.15, seasonality: 1.2 },
  CAD: { riskSentiment: 1.1, commodityLinkage: 1.45, bondConfirmation: 1.05, cotPositioning: 1.1, seasonality: 1.25 },
  CHF: { riskSentiment: 1.3, cotPositioning: 0.9, seasonality: 0.85 },
};

function createCurrencyTemplate(overrides = {}) {
  return {
    policyRate: 0,
    cpiActual: 0,
    cpiForecast: 0,
    pmi: 50,
    yield2y: 0,
    yield10y: 0,
    cotPercentile: 50,
    seasonalityScore: 0,
    commodityChange3m: 0,
    highImpactEvents7d: 0,
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
    global: {
      vix: 18,
      spx1mChange: 0,
      us10yChange1mBps: 0,
      dxy1mChange: 0,
      oil3mChange: 0,
      highImpactEventsGlobal7d: 0,
      ...overrides.global,
    },
    currencies: {
      USD: createCurrencyTemplate({ policyRate: 4.75, cpiActual: 3.1, cpiForecast: 2.9, pmi: 52.4, yield2y: 4.55, yield10y: 4.25, cotPercentile: 55, seasonalityScore: 0, commodityChange3m: 0, highImpactEvents7d: 3 }),
      EUR: createCurrencyTemplate({ policyRate: 2.75, cpiActual: 2.5, cpiForecast: 2.5, pmi: 50.6, yield2y: 2.3, yield10y: 2.55, cotPercentile: 48, seasonalityScore: 0, commodityChange3m: 0, highImpactEvents7d: 2 }),
      JPY: createCurrencyTemplate({ policyRate: 0.25, cpiActual: 2.7, cpiForecast: 2.5, pmi: 49.4, yield2y: 0.45, yield10y: 1.2, cotPercentile: 30, seasonalityScore: 0.5, commodityChange3m: 0, highImpactEvents7d: 2 }),
      GBP: createCurrencyTemplate({ policyRate: 4.5, cpiActual: 3.4, cpiForecast: 3.1, pmi: 50.9, yield2y: 4.2, yield10y: 4.05, cotPercentile: 42, seasonalityScore: 0, commodityChange3m: 0, highImpactEvents7d: 2 }),
      AUD: createCurrencyTemplate({ policyRate: 4.35, cpiActual: 3.6, cpiForecast: 3.4, pmi: 51.8, yield2y: 3.8, yield10y: 4.15, cotPercentile: 25, seasonalityScore: 0.5, commodityChange3m: 6, highImpactEvents7d: 2 }),
      NZD: createCurrencyTemplate({ policyRate: 5.5, cpiActual: 4.0, cpiForecast: 3.8, pmi: 50.1, yield2y: 4.4, yield10y: 4.55, cotPercentile: 35, seasonalityScore: 0.5, commodityChange3m: 4, highImpactEvents7d: 1 }),
      CAD: createCurrencyTemplate({ policyRate: 4.5, cpiActual: 2.9, cpiForecast: 2.8, pmi: 51.5, yield2y: 3.75, yield10y: 3.5, cotPercentile: 28, seasonalityScore: 0.5, commodityChange3m: 8, highImpactEvents7d: 2 }),
      CHF: createCurrencyTemplate({ policyRate: 1.0, cpiActual: 1.2, cpiForecast: 1.3, pmi: 48.8, yield2y: 0.6, yield10y: 0.8, cotPercentile: 60, seasonalityScore: -0.5, commodityChange3m: 0, highImpactEvents7d: 1 }),
      ...overrides.currencies,
    },
  };
}

const LIVE_DEFAULT = createSnapshot("Live Snapshot", "2026-04-15");
const BACKTEST_DEFAULT = createSnapshot("Backtest Snapshot", "2024-08-05", {
  global: { vix: 28, spx1mChange: -6, us10yChange1mBps: -35, dxy1mChange: 2.5, oil3mChange: -9, highImpactEventsGlobal7d: 6 },
  currencies: {
    USD: createCurrencyTemplate({ policyRate: 5.5, cpiActual: 2.9, cpiForecast: 3.0, pmi: 54.1, yield2y: 4.1, yield10y: 3.8, cotPercentile: 72, seasonalityScore: 0.5, commodityChange3m: 0, highImpactEvents7d: 4 }),
    EUR: createCurrencyTemplate({ policyRate: 4.25, cpiActual: 2.6, cpiForecast: 2.6, pmi: 49.2, yield2y: 2.9, yield10y: 2.3, cotPercentile: 45, seasonalityScore: -0.5, commodityChange3m: 0, highImpactEvents7d: 2 }),
    JPY: createCurrencyTemplate({ policyRate: 0.25, cpiActual: 2.8, cpiForecast: 2.6, pmi: 52.8, yield2y: 0.25, yield10y: 0.95, cotPercentile: 18, seasonalityScore: 1, commodityChange3m: 0, highImpactEvents7d: 4 }),
    GBP: createCurrencyTemplate({ policyRate: 5.25, cpiActual: 3.2, cpiForecast: 3.1, pmi: 52.1, yield2y: 4.2, yield10y: 3.95, cotPercentile: 51, seasonalityScore: 0, commodityChange3m: 0, highImpactEvents7d: 2 }),
    AUD: createCurrencyTemplate({ policyRate: 4.35, cpiActual: 3.8, cpiForecast: 3.7, pmi: 50.2, yield2y: 3.7, yield10y: 4.0, cotPercentile: 12, seasonalityScore: -0.5, commodityChange3m: -7, highImpactEvents7d: 3 }),
    NZD: createCurrencyTemplate({ policyRate: 5.5, cpiActual: 3.3, cpiForecast: 3.4, pmi: 47.4, yield2y: 4.6, yield10y: 4.35, cotPercentile: 16, seasonalityScore: -0.5, commodityChange3m: -6, highImpactEvents7d: 2 }),
    CAD: createCurrencyTemplate({ policyRate: 4.75, cpiActual: 2.7, cpiForecast: 2.7, pmi: 49.7, yield2y: 3.4, yield10y: 3.15, cotPercentile: 20, seasonalityScore: -0.5, commodityChange3m: -10, highImpactEvents7d: 2 }),
    CHF: createCurrencyTemplate({ policyRate: 1.25, cpiActual: 1.4, cpiForecast: 1.3, pmi: 45.1, yield2y: 0.8, yield10y: 0.55, cotPercentile: 62, seasonalityScore: 0.5, commodityChange3m: 0, highImpactEvents7d: 1 }),
  },
});

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeToProbability(score) {
  return clamp(50 + score * 6, 0, 100);
}

function classifyRegime(score) {
  if (score >= 8) return "Stark bullish";
  if (score >= 4) return "Bullish";
  if (score >= 1.5) return "Leicht bullish";
  if (score <= -8) return "Stark bearish";
  if (score <= -4) return "Bearish";
  if (score <= -1.5) return "Leicht bearish";
  return "Neutral";
}

function confidenceClass(confidence) {
  if (confidence >= 80) return "Hoch";
  if (confidence >= 60) return "Gut";
  if (confidence >= 40) return "Gemischt";
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

function badgeStyle(regime) {
  const lower = regime.toLowerCase();
  if (lower.includes("bullish")) return { background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600 };
  if (lower.includes("bearish")) return { background: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600 };
  return { background: "#e2e8f0", color: "#334155", padding: "4px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 600 };
}

function deriveRiskRegime(global) {
  const { vix, spx1mChange, us10yChange1mBps } = global;
  if (vix >= 28 || spx1mChange <= -6) return "strong_risk_off";
  if (vix >= 22 || spx1mChange <= -2) return "mild_risk_off";
  if (vix <= 14 && spx1mChange >= 4 && us10yChange1mBps >= 10) return "strong_risk_on";
  if (vix <= 18 && spx1mChange >= 1) return "mild_risk_on";
  return "neutral";
}

function deriveMarketFocus(global) {
  const { highImpactEventsGlobal7d, vix, us10yChange1mBps, dxy1mChange } = global;
  if (highImpactEventsGlobal7d >= 5 || Math.abs(us10yChange1mBps) >= 25) return "rates";
  if (vix >= 24 || Math.abs(global.spx1mChange) >= 5) return "risk";
  if (Math.abs(dxy1mChange) >= 2.5) return "positioning";
  return "growth";
}

function selectActivation(marketFocus, factorKey, eventRiskScore) {
  let base = 1.0;

  if (marketFocus === "rates") {
    if (["rateDifferential", "bondConfirmation", "inflationSurprise"].includes(factorKey)) base = 1.35;
    if (["cotPositioning", "seasonality"].includes(factorKey)) base = 0.85;
  }
  if (marketFocus === "growth") {
    if (["growthMomentum", "inflationSurprise"].includes(factorKey)) base = 1.25;
    if (["seasonality"].includes(factorKey)) base = 0.9;
  }
  if (marketFocus === "risk") {
    if (["riskSentiment", "commodityLinkage", "eventRisk"].includes(factorKey)) base = 1.35;
    if (["seasonality"].includes(factorKey)) base = 0.8;
  }
  if (marketFocus === "positioning") {
    if (["cotPositioning", "riskSentiment"].includes(factorKey)) base = 1.3;
    if (["rateDifferential"].includes(factorKey)) base = 1.1;
  }

  base += eventRiskScore * 0.08;
  if (["cotPositioning", "seasonality"].includes(factorKey)) base -= eventRiskScore * 0.12;

  return clamp(Number(base.toFixed(2)), 0.5, 1.5);
}

function mapRateDifferential(policyRate, avgPolicyRate) {
  const diff = policyRate - avgPolicyRate;
  if (diff >= 2.0) return 2;
  if (diff >= 1.0) return 1;
  if (diff <= -2.0) return -2;
  if (diff <= -1.0) return -1;
  return 0;
}

function mapInflationSurprise(actual, forecast) {
  const diff = actual - forecast;
  if (diff >= 0.3) return 2;
  if (diff >= 0.1) return 1;
  if (diff <= -0.3) return -2;
  if (diff <= -0.1) return -1;
  return 0;
}

function mapGrowthMomentum(pmi) {
  if (pmi >= 54) return 2;
  if (pmi >= 51) return 1;
  if (pmi >= 49) return 0;
  if (pmi >= 46) return -1;
  return -2;
}

function mapBondConfirmation(raw) {
  const spread = raw.yield10y - raw.yield2y;
  if (raw.yield2y >= raw.policyRate && spread > -1.0) return 1;
  if (raw.yield2y >= raw.policyRate + 0.5) return 1.5;
  if (raw.yield2y < raw.policyRate && spread < -0.5) return -1;
  if (raw.yield2y < raw.policyRate - 0.5) return -1.5;
  return 0;
}

function mapRiskSentiment(currency, regime) {
  const riskOnCurrencies = ["AUD", "NZD", "CAD"];
  const safeHavens = ["JPY", "CHF"];
  const regimeScore = {
    strong_risk_on: 2,
    mild_risk_on: 1,
    neutral: 0,
    mild_risk_off: -1,
    strong_risk_off: -2,
  }[regime] ?? 0;
  if (riskOnCurrencies.includes(currency)) return regimeScore;
  if (safeHavens.includes(currency)) return -regimeScore;
  if (currency === "USD") return regimeScore < 0 ? Math.abs(regimeScore) * 0.5 : -regimeScore * 0.25;
  return regimeScore * 0.35;
}

function mapCommodity(currency, commodityChange3m) {
  if (!["AUD", "NZD", "CAD"].includes(currency)) return 0;
  if (commodityChange3m >= 10) return 2;
  if (commodityChange3m >= 3) return 1;
  if (commodityChange3m <= -10) return -2;
  if (commodityChange3m <= -3) return -1;
  return 0;
}

function mapCotPositioning(percentile) {
  if (percentile < 20) return 2;
  if (percentile < 35) return 1;
  if (percentile <= 65) return 0;
  if (percentile <= 85) return -1;
  return -2;
}

function mapSeasonality(value) {
  return clamp(Number(value || 0), -1, 1);
}

function mapEventRisk(localCount, globalCount) {
  const total = Number(localCount || 0) + Number(globalCount || 0) * 0.5;
  if (total >= 6) return -2;
  if (total >= 3) return -1;
  return 0;
}

function buildFactorStateForCurrency(currency, raw, allRaw, global) {
  const avgPolicyRate = CURRENCIES.reduce((sum, c) => sum + Number(allRaw[c].policyRate || 0), 0) / CURRENCIES.length;
  const regime = deriveRiskRegime(global);
  const focus = deriveMarketFocus(global);
  const eventRiskScore = Math.abs(mapEventRisk(raw.highImpactEvents7d, global.highImpactEventsGlobal7d));

  return {
    rateDifferential: {
      direction: mapRateDifferential(raw.policyRate, avgPolicyRate),
      activation: selectActivation(focus, "rateDifferential", eventRiskScore),
    },
    inflationSurprise: {
      direction: mapInflationSurprise(raw.cpiActual, raw.cpiForecast),
      activation: selectActivation(focus, "inflationSurprise", eventRiskScore),
    },
    growthMomentum: {
      direction: mapGrowthMomentum(raw.pmi),
      activation: selectActivation(focus, "growthMomentum", eventRiskScore),
    },
    bondConfirmation: {
      direction: mapBondConfirmation(raw),
      activation: selectActivation(focus, "bondConfirmation", eventRiskScore),
    },
    riskSentiment: {
      direction: mapRiskSentiment(currency, regime),
      activation: selectActivation(focus, "riskSentiment", eventRiskScore),
    },
    commodityLinkage: {
      direction: mapCommodity(currency, raw.commodityChange3m),
      activation: selectActivation(focus, "commodityLinkage", eventRiskScore),
    },
    cotPositioning: {
      direction: mapCotPositioning(raw.cotPercentile),
      activation: selectActivation(focus, "cotPositioning", eventRiskScore),
    },
    seasonality: {
      direction: mapSeasonality(raw.seasonalityScore),
      activation: selectActivation(focus, "seasonality", eventRiskScore),
    },
    eventRisk: {
      direction: mapEventRisk(raw.highImpactEvents7d, global.highImpactEventsGlobal7d),
      activation: selectActivation(focus, "eventRisk", eventRiskScore),
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
  const majorFactors = factorBreakdown.filter((f) => f.finalWeight >= 1.1);
  const alignedMajor = majorFactors.filter((f) => Math.sign(f.contribution) === Math.sign(rawScore) && f.direction !== 0).length;
  const contradictoryMajor = majorFactors.filter((f) => Math.sign(f.contribution) !== Math.sign(rawScore) && f.direction !== 0).length;
  const neutralCount = factorBreakdown.filter((f) => f.direction === 0).length;
  const activationStrength = factorBreakdown.reduce((sum, f) => sum + f.activation, 0) / factorBreakdown.length;

  let confidence = 50;
  confidence += alignedMajor * 8;
  confidence -= contradictoryMajor * 9;
  confidence -= neutralCount * 1.1;
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
    { name: "Rates", horizon: 30, factors: ["rateDifferential", "bondConfirmation"] },
    { name: "Inflation", horizon: 45, factors: ["inflationSurprise"] },
    { name: "Growth", horizon: 60, factors: ["growthMomentum"] },
    { name: "Risk", horizon: 30, factors: ["riskSentiment", "eventRisk"] },
    { name: "Commodities", horizon: 45, factors: ["commodityLinkage"] },
    { name: "Positioning", horizon: 30, factors: ["cotPositioning"] },
    { name: "Context", horizon: 90, factors: ["seasonality"] },
    { name: "Composite", horizon: 60, factors: ["rateDifferential", "growthMomentum", "riskSentiment", "cotPositioning"] },
  ];

  return modelLibrary.map((model, idx) => {
    const mapped = model.factors.map((factor) => factorBreakdown.find((f) => f.key === factor)).filter(Boolean);
    const avg = mapped.length ? mapped.reduce((sum, item) => sum + item.contribution, 0) / mapped.length : 0;
    const variation = ((idx % 3) - 1) * 0.25;
    return { x: model.horizon, y: Number((avg + variation).toFixed(2)), model: model.name };
  });
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}>
        {options.map((opt) => <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>)}
      </select>
    </label>
  );
}

function NumberField({ label, value, onChange, step = 0.1, min, max }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input type="number" step={step} min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }} />
    </label>
  );
}

function ScatterPlot({ points }) {
  const width = 640, height = 320, pad = 30, xMin = 20, xMax = 130, yMin = -6, yMax = 6;
  const mapX = (x) => pad + ((x - xMin) / (xMax - xMin)) * (width - pad * 2);
  const mapY = (y) => height - pad - ((y - yMin) / (yMax - yMin)) * (height - pad * 2);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 320, background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0" }}>
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={mapY(0)} x2={width - pad} y2={mapY(0)} stroke="#94a3b8" strokeDasharray="4 4" />
      {points.map((p, i) => <g key={i}><circle cx={mapX(p.x)} cy={mapY(p.y)} r="5" fill="#2563eb" /><title>{`${p.model} | Horizont: ${p.x}d | Score: ${p.y}`}</title></g>)}
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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}><span>{item.name}</span><span>{item.score.toFixed(2)}</span></div>
            <div style={{ background: "#e2e8f0", borderRadius: 9999, height: 10, overflow: "hidden" }}><div style={{ width, height: "100%", background: item.score >= 0 ? "#16a34a" : "#dc2626" }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCards({ ranking, pairRanking }) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>Stärkste Währungen</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {ranking.slice(0, 3).map((item) => <div key={item.currency} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>{item.currency}</strong><span style={badgeStyle(item.regime)}>{item.regime}</span></div><div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>Score: {item.rawScore}</div><div style={{ color: "#475569", fontSize: 14 }}>Konfidenz: {item.confidence}%</div></div>)}
        </div>
      </div>
      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>Schwächste Währungen</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {[...ranking].reverse().slice(0, 3).map((item) => <div key={item.currency} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>{item.currency}</strong><span style={badgeStyle(item.regime)}>{item.regime}</span></div><div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>Score: {item.rawScore}</div><div style={{ color: "#475569", fontSize: 14 }}>Konfidenz: {item.confidence}%</div></div>)}
        </div>
      </div>
      <div style={{ ...cardStyle(), gridColumn: "span 2" }}>
        <h3 style={{ marginTop: 0 }}>Beste Paare nach Divergenz</h3>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {pairRanking.slice(0, 6).map((item) => <div key={item.pair} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>{item.pair}</strong><span style={badgeStyle(item.regime)}>{item.regime}</span></div><div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>Pair Score: {item.raw}</div><div style={{ color: "#475569", fontSize: 14 }}>Konfidenz: {item.confidence}%</div><div style={{ color: item.noTrade ? "#991b1b" : "#166534", fontSize: 13, marginTop: 4 }}>{item.noTrade ? "No Trade" : "Trade-fähig"}</div></div>)}
        </div>
      </div>
    </div>
  );
}

function SnapshotManager({ sectionName, currentSnapshot, setSnapshotMeta, snapshots, onLoadSnapshot, onSaveSnapshot, onDeleteSnapshot, onExportSnapshots, onImportSnapshots }) {
  return (
    <div style={cardStyle()}>
      <h3 style={{ marginTop: 0 }}>{sectionName} Snapshot-Manager</h3>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 16 }}>
        <TextField label="Snapshot-Name" value={currentSnapshot.meta.name} onChange={(v) => setSnapshotMeta("name", v)} />
        <DateField label="Snapshot-Datum" value={currentSnapshot.meta.snapshotDate} onChange={(v) => setSnapshotMeta("snapshotDate", v)} />
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={onSaveSnapshot} style={buttonStyle()}>Snapshot speichern</button>
        <button onClick={onExportSnapshots} style={buttonStyle()}>Snapshots exportieren</button>
        <label style={{ ...buttonStyle(), display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
          Snapshots importieren
          <input type="file" accept="application/json" style={{ display: "none" }} onChange={onImportSnapshots} />
        </label>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {snapshots.length === 0 && <div style={{ color: "#64748b" }}>Noch keine gespeicherten Snapshots.</div>}
        {snapshots.map((snap) => (
          <div key={snap.meta.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{snap.meta.name}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>{snap.meta.snapshotDate}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onLoadSnapshot(snap.meta.id)} style={smallButtonStyle()}>Laden</button>
              <button onClick={() => onDeleteSnapshot(snap.meta.id)} style={smallButtonStyle(true)}>Löschen</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buttonStyle() {
  return { padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", cursor: "pointer", fontWeight: 600 };
}

function smallButtonStyle(danger = false) {
  return { padding: "8px 12px", borderRadius: 8, border: `1px solid ${danger ? "#fecaca" : "#cbd5e1"}`, background: danger ? "#fef2f2" : "#fff", color: danger ? "#991b1b" : "#0f172a", cursor: "pointer", fontWeight: 600 };
}

function InputsPanel({ dataset, updateMeta, updateGlobal, updateCurrency, sectionName }) {
  const derivedRisk = deriveRiskRegime(dataset.global);
  const derivedFocus = deriveMarketFocus(dataset.global);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>{sectionName} globale Eingaben</h3>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <DateField label="Datum" value={dataset.meta.snapshotDate} onChange={(v) => updateMeta("snapshotDate", v)} />
          <TextField label="Name" value={dataset.meta.name} onChange={(v) => updateMeta("name", v)} />
          <NumberField label="VIX" value={dataset.global.vix} onChange={(v) => updateGlobal("vix", v)} />
          <NumberField label="S&P 500 Veränderung 1M (%)" value={dataset.global.spx1mChange} onChange={(v) => updateGlobal("spx1mChange", v)} />
          <NumberField label="US 10Y Veränderung 1M (bps)" value={dataset.global.us10yChange1mBps} onChange={(v) => updateGlobal("us10yChange1mBps", v)} step={1} />
          <NumberField label="DXY Veränderung 1M (%)" value={dataset.global.dxy1mChange} onChange={(v) => updateGlobal("dxy1mChange", v)} />
          <NumberField label="Öl Veränderung 3M (%)" value={dataset.global.oil3mChange} onChange={(v) => updateGlobal("oil3mChange", v)} />
          <NumberField label="Globale High-Impact Events 7D" value={dataset.global.highImpactEventsGlobal7d} onChange={(v) => updateGlobal("highImpactEventsGlobal7d", v)} step={1} min={0} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <div style={{ color: "#475569" }}>Abgeleitetes Risk Regime: <strong>{derivedRisk}</strong></div>
          <div style={{ color: "#475569" }}>Abgeleiteter Marktfokus: <strong>{derivedFocus}</strong></div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))" }}>
        {CURRENCIES.map((ccy) => {
          const row = dataset.currencies[ccy];
          return (
            <div key={ccy} style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>{ccy}</h3>
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <NumberField label="Policy Rate" value={row.policyRate} onChange={(v) => updateCurrency(ccy, "policyRate", v)} />
                <NumberField label="CPI Actual" value={row.cpiActual} onChange={(v) => updateCurrency(ccy, "cpiActual", v)} />
                <NumberField label="CPI Forecast" value={row.cpiForecast} onChange={(v) => updateCurrency(ccy, "cpiForecast", v)} />
                <NumberField label="PMI Composite" value={row.pmi} onChange={(v) => updateCurrency(ccy, "pmi", v)} />
                <NumberField label="2Y Yield" value={row.yield2y} onChange={(v) => updateCurrency(ccy, "yield2y", v)} />
                <NumberField label="10Y Yield" value={row.yield10y} onChange={(v) => updateCurrency(ccy, "yield10y", v)} />
                <NumberField label="COT Percentile" value={row.cotPercentile} onChange={(v) => updateCurrency(ccy, "cotPercentile", clamp(v, 0, 100))} step={1} min={0} max={100} />
                <NumberField label="Seasonality Score (-1 bis 1)" value={row.seasonalityScore} onChange={(v) => updateCurrency(ccy, "seasonalityScore", clamp(v, -1, 1))} step={0.5} min={-1} max={1} />
                <NumberField label="Rohstoffveränderung 3M (%)" value={row.commodityChange3m} onChange={(v) => updateCurrency(ccy, "commodityChange3m", v)} />
                <NumberField label="Lokale High-Impact Events 7D" value={row.highImpactEvents7d} onChange={(v) => updateCurrency(ccy, "highImpactEvents7d", Math.max(0, v))} step={1} min={0} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BreakdownPanel({ selectedCurrency, setSelectedCurrency, breakdown }) {
  return (
    <div style={cardStyle()}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Faktoraufschlüsselung</h3>
        <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
          {CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}
        </select>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: 10 }}>Faktor</th>
              <th style={{ padding: 10 }}>Gruppe</th>
              <th style={{ padding: 10 }}>Direction</th>
              <th style={{ padding: 10 }}>Activation</th>
              <th style={{ padding: 10 }}>Base Weight</th>
              <th style={{ padding: 10 }}>Modifier</th>
              <th style={{ padding: 10 }}>Final Weight</th>
              <th style={{ padding: 10 }}>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => (
              <tr key={row.key} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{row.label}</td>
                <td style={{ padding: 10 }}>{row.group}</td>
                <td style={{ padding: 10 }}>{row.direction.toFixed(1)}</td>
                <td style={{ padding: 10 }}>{row.activation.toFixed(2)}</td>
                <td style={{ padding: 10 }}>{row.baseWeight.toFixed(2)}</td>
                <td style={{ padding: 10 }}>{row.currencyModifier.toFixed(2)}</td>
                <td style={{ padding: 10 }}>{row.finalWeight.toFixed(2)}</td>
                <td style={{ padding: 10, fontWeight: 600, color: row.contribution >= 0 ? "#166534" : "#991b1b" }}>{row.contribution.toFixed(2)}</td>
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
    <div style={cardStyle()}>
      <h3 style={{ marginTop: 0 }}>Ranking aller Paare</h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ padding: 10 }}>Pair</th>
              <th style={{ padding: 10 }}>Score</th>
              <th style={{ padding: 10 }}>Regime</th>
              <th style={{ padding: 10 }}>Konfidenz</th>
              <th style={{ padding: 10 }}>Wahrscheinlichkeit Base steigt</th>
              <th style={{ padding: 10 }}>Divergenz-Bonus</th>
              <th style={{ padding: 10 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {pairRanking.slice(0, 28).map((row) => (
              <tr key={row.pair} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{row.pair}</td>
                <td style={{ padding: 10, fontWeight: 600, color: row.raw >= 0 ? "#166534" : "#991b1b" }}>{row.raw}</td>
                <td style={{ padding: 10 }}><span style={badgeStyle(row.regime)}>{row.regime}</span></td>
                <td style={{ padding: 10 }}>{row.confidence}%</td>
                <td style={{ padding: 10 }}>{row.probabilityBaseUp}%</td>
                <td style={{ padding: 10 }}>{row.divergenceBonus}</td>
                <td style={{ padding: 10, color: row.noTrade ? "#991b1b" : "#166534", fontWeight: 600 }}>{row.noTrade ? "No Trade" : "Ok"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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

function OverviewPanel({ snapshot, scores, ranking, pairRanking, selectedCurrency, setSelectedCurrency, scatterData, barData, base, setBase, quote, setQuote, currentPair, sectionName }) {
  return (
    <>
      <div style={{ ...cardStyle(), display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div><div style={{ fontSize: 13, color: "#475569" }}>Datum</div><div style={{ marginTop: 6, fontWeight: 600 }}>{snapshot.meta.snapshotDate}</div></div>
        <div><div style={{ fontSize: 13, color: "#475569" }}>Name</div><div style={{ marginTop: 6, fontWeight: 600 }}>{snapshot.meta.name}</div></div>
        <div><div style={{ fontSize: 13, color: "#475569" }}>Abgeleitetes Risk Regime</div><div style={{ marginTop: 6, fontWeight: 600 }}>{deriveRiskRegime(snapshot.global)}</div></div>
        <div><div style={{ fontSize: 13, color: "#475569" }}>Abgeleiteter Marktfokus</div><div style={{ marginTop: 6, fontWeight: 600 }}>{deriveMarketFocus(snapshot.global)}</div></div>
      </div>

      <SummaryCards ranking={ranking} pairRanking={pairRanking} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={cardStyle()}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <strong>{sectionName} Modell-Scatter für</strong>
            <select value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
              {CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}
            </select>
            <span style={badgeStyle(scores[selectedCurrency].regime)}>{scores[selectedCurrency].regime}</span>
            <span style={{ color: "#475569", fontSize: 14 }}>Score: {scores[selectedCurrency].rawScore}</span>
            <span style={{ color: "#475569", fontSize: 14 }}>Konfidenz: {scores[selectedCurrency].confidence}% ({confidenceClass(scores[selectedCurrency].confidence)})</span>
          </div>
          <ScatterPlot points={scatterData} />
        </div>

        <div style={cardStyle()}>
          <h3 style={{ marginTop: 0 }}>Währungs-Leaderboard</h3>
          <BarList data={barData} />
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={cardStyle()}>
          <h3 style={{ marginTop: 0 }}>Paar-Bias</h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <select value={base} onChange={(e) => setBase(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>{CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}</select>
            <span>/</span>
            <select value={quote} onChange={(e) => setQuote(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>{CURRENCIES.map((ccy) => <option key={ccy} value={ccy}>{ccy}</option>)}</select>
            <span style={badgeStyle(currentPair.regime)}>{currentPair.regime}</span>
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}><div style={{ fontSize: 13, color: "#475569" }}>Paar-Score</div><div style={{ fontSize: 28, fontWeight: 700 }}>{currentPair.raw}</div></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}><div style={{ fontSize: 13, color: "#475569" }}>Wahrscheinlichkeit {base} steigt</div><div style={{ fontSize: 28, fontWeight: 700 }}>{currentPair.probabilityBaseUp}%</div></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}><div style={{ fontSize: 13, color: "#475569" }}>Konfidenz</div><div style={{ fontSize: 28, fontWeight: 700 }}>{currentPair.confidence}%</div></div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}><div style={{ fontSize: 13, color: "#475569" }}>Status</div><div style={{ fontSize: 24, fontWeight: 700, color: currentPair.noTrade ? "#991b1b" : "#166534" }}>{currentPair.noTrade ? "No Trade" : "Ok"}</div></div>
          </div>
        </div>

        <div style={cardStyle()}>
          <h3 style={{ marginTop: 0 }}>API-Ready Kern</h3>
          <div style={{ display: "grid", gap: 10, color: "#475569", fontSize: 14 }}>
            <div><strong>1:1 Fields:</strong> gleiche Snapshot-Felder in Live und Backtest</div>
            <div><strong>Kein Subjektives:</strong> Risk Regime und Fokus werden aus Daten abgeleitet</div>
            <div><strong>Snapshot Manager:</strong> Speichern, Laden, Import, Export</div>
            <div><strong>Nächster Schritt:</strong> APIs befüllen genau diese Felder</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [activeTopTab, setActiveTopTab] = useState("live");
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [liveSnapshot, setLiveSnapshot] = useState(cloneDeep(LIVE_DEFAULT));
  const [backtestSnapshot, setBacktestSnapshot] = useState(cloneDeep(BACKTEST_DEFAULT));
  const [savedSnapshots, setSavedSnapshots] = useState([]);
  const [liveSelectedCurrency, setLiveSelectedCurrency] = useState("AUD");
  const [backtestSelectedCurrency, setBacktestSelectedCurrency] = useState("AUD");
  const [liveBase, setLiveBase] = useState("AUD");
  const [liveQuote, setLiveQuote] = useState("JPY");
  const [backtestBase, setBacktestBase] = useState("AUD");
  const [backtestQuote, setBacktestQuote] = useState("JPY");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSavedSnapshots(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSnapshots));
  }, [savedSnapshots]);

  const liveEngine = useEngine(liveSnapshot);
  const backtestEngine = useEngine(backtestSnapshot);
  const liveCurrentPair = useMemo(() => pairScore(liveEngine.scores[liveBase], liveEngine.scores[liveQuote]), [liveEngine.scores, liveBase, liveQuote]);
  const backtestCurrentPair = useMemo(() => pairScore(backtestEngine.scores[backtestBase], backtestEngine.scores[backtestQuote]), [backtestEngine.scores, backtestBase, backtestQuote]);
  const liveScatterData = useMemo(() => buildModelScatterFromBreakdown(liveEngine.scores[liveSelectedCurrency].factorBreakdown), [liveEngine.scores, liveSelectedCurrency]);
  const backtestScatterData = useMemo(() => buildModelScatterFromBreakdown(backtestEngine.scores[backtestSelectedCurrency].factorBreakdown), [backtestEngine.scores, backtestSelectedCurrency]);
  const liveBarData = liveEngine.ranking.map((r) => ({ name: r.currency, score: r.rawScore }));
  const backtestBarData = backtestEngine.ranking.map((r) => ({ name: r.currency, score: r.rawScore }));

  function currentSnapshotState() {
    return activeTopTab === "live" ? liveSnapshot : backtestSnapshot;
  }

  function currentSetSnapshot() {
    return activeTopTab === "live" ? setLiveSnapshot : setBacktestSnapshot;
  }

  function updateMeta(key, value) {
    const setter = currentSetSnapshot();
    setter((prev) => ({ ...prev, meta: { ...prev.meta, [key]: value } }));
  }

  function updateGlobal(key, value) {
    const setter = currentSetSnapshot();
    setter((prev) => ({ ...prev, global: { ...prev.global, [key]: value } }));
  }

  function updateCurrency(currency, key, value) {
    const setter = currentSetSnapshot();
    setter((prev) => ({
      ...prev,
      currencies: {
        ...prev.currencies,
        [currency]: { ...prev.currencies[currency], [key]: value },
      },
    }));
  }

  function saveCurrentSnapshot() {
    const snap = cloneDeep(currentSnapshotState());
    setSavedSnapshots((prev) => {
      const filtered = prev.filter((x) => x.meta.id !== snap.meta.id);
      return [snap, ...filtered].slice(0, 100);
    });
  }

  function loadSnapshot(id) {
    const found = savedSnapshots.find((x) => x.meta.id === id);
    if (!found) return;
    const setter = currentSetSnapshot();
    setter(cloneDeep(found));
  }

  function deleteSnapshot(id) {
    setSavedSnapshots((prev) => prev.filter((x) => x.meta.id !== id));
  }

  function exportSnapshots() {
    const blob = new Blob([JSON.stringify(savedSnapshots, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forex-bias-snapshots.json";
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
        if (Array.isArray(parsed)) setSavedSnapshots(parsed);
      } catch (e) {
        alert("Import fehlgeschlagen: ungültige JSON-Datei");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetCurrentToDefault() {
    if (activeTopTab === "live") setLiveSnapshot(cloneDeep(LIVE_DEFAULT));
    else setBacktestSnapshot(cloneDeep(BACKTEST_DEFAULT));
  }

  const isLive = activeTopTab === "live";
  const currentSnapshot = isLive ? liveSnapshot : backtestSnapshot;
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

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24, fontFamily: "Arial, sans-serif", color: "#0f172a" }}>
      <div style={{ maxWidth: 1520, margin: "0 auto", display: "grid", gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Forex Macro Bias Engine</h1>
          <p style={{ color: "#475569" }}>API-fähige Kernversion mit identischen Live- und Backtest-Snapshots, ohne subjektive Felder, plus Snapshot-Manager für Speichern, Laden, Import und Export.</p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[ ["live", "Live"], ["backtest", "Backtesting"] ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTopTab(key)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: activeTopTab === key ? "#0f172a" : "#fff", color: activeTopTab === key ? "#fff" : "#0f172a", cursor: "pointer", fontWeight: 600 }}>{label}</button>
          ))}
          <button onClick={resetCurrentToDefault} style={buttonStyle()}>Auf Standard zurücksetzen</button>
        </div>

        <SnapshotManager
          sectionName={sectionName}
          currentSnapshot={currentSnapshot}
          setSnapshotMeta={updateMeta}
          snapshots={savedSnapshots}
          onLoadSnapshot={loadSnapshot}
          onSaveSnapshot={saveCurrentSnapshot}
          onDeleteSnapshot={deleteSnapshot}
          onExportSnapshots={exportSnapshots}
          onImportSnapshots={importSnapshots}
        />

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[ ["overview", "Übersicht"], ["inputs", `${sectionName} Rohdaten`], ["breakdown", `${sectionName} Faktoraufschlüsselung`], ["pairs", `${sectionName} Pair-Ranking`] ].map(([key, label]) => (
            <button key={key} onClick={() => setActiveSubTab(key)} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: activeSubTab === key ? "#0f172a" : "#fff", color: activeSubTab === key ? "#fff" : "#0f172a", cursor: "pointer", fontWeight: 600 }}>{label}</button>
          ))}
        </div>

        {activeSubTab === "overview" && <OverviewPanel snapshot={currentSnapshot} scores={currentEngine.scores} ranking={currentEngine.ranking} pairRanking={currentEngine.pairRanking} selectedCurrency={currentSelectedCurrency} setSelectedCurrency={setCurrentSelectedCurrency} scatterData={currentScatterData} barData={currentBarData} base={currentBase} setBase={setCurrentBase} quote={currentQuote} setQuote={setCurrentQuote} currentPair={currentPair} sectionName={sectionName} />}
        {activeSubTab === "inputs" && <InputsPanel dataset={currentSnapshot} updateMeta={updateMeta} updateGlobal={updateGlobal} updateCurrency={updateCurrency} sectionName={sectionName} />}
        {activeSubTab === "breakdown" && <BreakdownPanel selectedCurrency={currentSelectedCurrency} setSelectedCurrency={setCurrentSelectedCurrency} breakdown={currentEngine.scores[currentSelectedCurrency].factorBreakdown} />}
        {activeSubTab === "pairs" && <PairsPanel pairRanking={currentEngine.pairRanking} />}
      </div>
    </div>
  );
}

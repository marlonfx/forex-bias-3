import React, { useEffect, useMemo, useState } from "react";

const CURRENCIES = ["USD", "EUR", "JPY", "GBP", "AUD", "NZD", "CAD", "CHF"];
const STORAGE_KEY = "forex_macro_bias_free_core_v1";

const FACTOR_CONFIG = {
  rateDifferential: {
    label: "Zinsdifferenz",
    baseWeight: 2.2,
    group: "Rates",
  },
  inflationLevel: {
    label: "Inflationsniveau",
    baseWeight: 1.2,
    group: "Inflation",
  },
  bondConfirmation: {
    label: "Bond-Bestätigung",
    baseWeight: 1.7,
    group: "Bonds",
  },
  riskSentiment: {
    label: "Risiko-Stimmung",
    baseWeight: 1.5,
    group: "Risk",
  },
  commodityLinkage: {
    label: "Rohstoff-Faktor",
    baseWeight: 1.1,
    group: "Commodities",
  },
  cotPositioning: {
    label: "COT Positionierung",
    baseWeight: 1.0,
    group: "Flow",
  },
  seasonality: {
    label: "Seasonality",
    baseWeight: 0.5,
    group: "Context",
  },
};

const FACTOR_KEYS = Object.keys(FACTOR_CONFIG);

const CURRENCY_MODIFIERS = {
  USD: {
    rateDifferential: 1.15,
    bondConfirmation: 1.2,
    riskSentiment: 1.05,
  },
  EUR: {
    rateDifferential: 1.05,
    bondConfirmation: 1.05,
  },
  JPY: {
    rateDifferential: 1.2,
    riskSentiment: 1.45,
    cotPositioning: 1.1,
  },
  GBP: {
    inflationLevel: 1.1,
    rateDifferential: 1.05,
  },
  AUD: {
    riskSentiment: 1.3,
    commodityLinkage: 1.4,
    seasonality: 1.15,
    cotPositioning: 1.05,
  },
  NZD: {
    riskSentiment: 1.2,
    commodityLinkage: 1.2,
    seasonality: 1.1,
  },
  CAD: {
    riskSentiment: 1.15,
    commodityLinkage: 1.45,
    bondConfirmation: 1.05,
    seasonality: 1.1,
  },
  CHF: {
    riskSentiment: 1.35,
    cotPositioning: 0.95,
    seasonality: 0.85,
  },
};

function createCurrencyTemplate(overrides = {}) {
  return {
    policyRate: 0,
    cpiActual: 2,
    yield2y: 0,
    yield10y: 0,
    cotPercentile: 50,
    seasonalityScore: 0,
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
      spx1mChange: 0,
      oil3mChange: 0,
      usdIndexProxy1mChange: 0,
      vix: 18,
      ...overrides.global,
    },
    currencies: {
      USD: createCurrencyTemplate({
        policyRate: 4.75,
        cpiActual: 3.1,
        yield2y: 4.55,
        yield10y: 4.25,
        cotPercentile: 55,
        seasonalityScore: 0,
      }),
      EUR: createCurrencyTemplate({
        policyRate: 2.75,
        cpiActual: 2.5,
        yield2y: 2.3,
        yield10y: 2.55,
        cotPercentile: 48,
        seasonalityScore: 0,
      }),
      JPY: createCurrencyTemplate({
        policyRate: 0.25,
        cpiActual: 2.7,
        yield2y: 0.45,
        yield10y: 1.2,
        cotPercentile: 30,
        seasonalityScore: 0.5,
      }),
      GBP: createCurrencyTemplate({
        policyRate: 4.5,
        cpiActual: 3.4,
        yield2y: 4.2,
        yield10y: 4.05,
        cotPercentile: 42,
        seasonalityScore: 0,
      }),
      AUD: createCurrencyTemplate({
        policyRate: 4.35,
        cpiActual: 3.6,
        yield2y: 3.8,
        yield10y: 4.15,
        cotPercentile: 25,
        seasonalityScore: 0.5,
      }),
      NZD: createCurrencyTemplate({
        policyRate: 5.5,
        cpiActual: 4.0,
        yield2y: 4.4,
        yield10y: 4.55,
        cotPercentile: 35,
        seasonalityScore: 0.5,
      }),
      CAD: createCurrencyTemplate({
        policyRate: 4.5,
        cpiActual: 2.9,
        yield2y: 3.75,
        yield10y: 3.5,
        cotPercentile: 28,
        seasonalityScore: 0.5,
      }),
      CHF: createCurrencyTemplate({
        policyRate: 1.0,
        cpiActual: 1.2,
        yield2y: 0.6,
        yield10y: 0.8,
        cotPercentile: 60,
        seasonalityScore: -0.5,
      }),
      ...overrides.currencies,
    },
  };
}

const LIVE_DEFAULT = createSnapshot("Live Snapshot", "2026-04-15", {
  global: {
    spx1mChange: 2.2,
    oil3mChange: 5.8,
    usdIndexProxy1mChange: 0.6,
    vix: 17.5,
  },
});

const BACKTEST_DEFAULT = createSnapshot("Backtest Snapshot", "2024-08-05", {
  global: {
    spx1mChange: -6.2,
    oil3mChange: -9.8,
    usdIndexProxy1mChange: 2.7,
    vix: 28.5,
  },
  currencies: {
    USD: createCurrencyTemplate({
      policyRate: 5.5,
      cpiActual: 2.9,
      yield2y: 4.1,
      yield10y: 3.8,
      cotPercentile: 72,
      seasonalityScore: 0.5,
    }),
    EUR: createCurrencyTemplate({
      policyRate: 4.25,
      cpiActual: 2.6,
      yield2y: 2.9,
      yield10y: 2.3,
      cotPercentile: 45,
      seasonalityScore: -0.5,
    }),
    JPY: createCurrencyTemplate({
      policyRate: 0.25,
      cpiActual: 2.8,
      yield2y: 0.25,
      yield10y: 0.95,
      cotPercentile: 18,
      seasonalityScore: 1,
    }),
    GBP: createCurrencyTemplate({
      policyRate: 5.25,
      cpiActual: 3.2,
      yield2y: 4.2,
      yield10y: 3.95,
      cotPercentile: 51,
      seasonalityScore: 0,
    }),
    AUD: createCurrencyTemplate({
      policyRate: 4.35,
      cpiActual: 3.8,
      yield2y: 3.7,
      yield10y: 4.0,
      cotPercentile: 12,
      seasonalityScore: -0.5,
    }),
    NZD: createCurrencyTemplate({
      policyRate: 5.5,
      cpiActual: 3.3,
      yield2y: 4.6,
      yield10y: 4.35,
      cotPercentile: 16,
      seasonalityScore: -0.5,
    }),
    CAD: createCurrencyTemplate({
      policyRate: 4.75,
      cpiActual: 2.7,
      yield2y: 3.4,
      yield10y: 3.15,
      cotPercentile: 20,
      seasonalityScore: -0.5,
    }),
    CHF: createCurrencyTemplate({
      policyRate: 1.25,
      cpiActual: 1.4,
      yield2y: 0.8,
      yield10y: 0.55,
      cotPercentile: 62,
      seasonalityScore: 0.5,
    }),
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

function buttonStyle() {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
  };
}

function smallButtonStyle(danger = false) {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${danger ? "#fecaca" : "#cbd5e1"}`,
    background: danger ? "#fef2f2" : "#fff",
    color: danger ? "#991b1b" : "#0f172a",
    cursor: "pointer",
    fontWeight: 600,
  };
}

function badgeStyle(regime) {
  const lower = regime.toLowerCase();
  if (lower.includes("bullish")) {
    return {
      background: "#dcfce7",
      color: "#166534",
      padding: "4px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
    };
  }
  if (lower.includes("bearish")) {
    return {
      background: "#fee2e2",
      color: "#991b1b",
      padding: "4px 8px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
    };
  }
  return {
    background: "#e2e8f0",
    color: "#334155",
    padding: "4px 8px",
    borderRadius: 9999,
    fontSize: 12,
    fontWeight: 600,
  };
}

function deriveRiskRegime(global) {
  const { spx1mChange, oil3mChange, usdIndexProxy1mChange, vix } = global;

  if (vix >= 28 || spx1mChange <= -6) return "strong_risk_off";
  if (vix >= 22 || spx1mChange <= -2 || usdIndexProxy1mChange >= 2.0)
    return "mild_risk_off";
  if (vix <= 14 && spx1mChange >= 4 && oil3mChange >= 5)
    return "strong_risk_on";
  if (vix <= 18 && spx1mChange >= 1) return "mild_risk_on";
  return "neutral";
}

function deriveMarketFocus(global) {
  const { vix, spx1mChange, usdIndexProxy1mChange } = global;

  if (Math.abs(usdIndexProxy1mChange) >= 2.0) return "rates";
  if (vix >= 24 || Math.abs(spx1mChange) >= 5) return "risk";
  return "balanced";
}

function selectActivation(marketFocus, factorKey) {
  let base = 1.0;

  if (marketFocus === "rates") {
    if (["rateDifferential", "bondConfirmation", "inflationLevel"].includes(factorKey)) {
      base = 1.25;
    }
    if (["cotPositioning", "seasonality"].includes(factorKey)) {
      base = 0.9;
    }
  }

  if (marketFocus === "risk") {
    if (["riskSentiment", "commodityLinkage"].includes(factorKey)) {
      base = 1.25;
    }
    if (["seasonality"].includes(factorKey)) {
      base = 0.9;
    }
  }

  return clamp(Number(base.toFixed(2)), 0.7, 1.4);
}

function mapRateDifferential(policyRate, avgPolicyRate) {
  const diff = policyRate - avgPolicyRate;

  if (diff >= 2.0) return 2;
  if (diff >= 1.0) return 1;
  if (diff <= -2.0) return -2;
  if (diff <= -1.0) return -1;
  return 0;
}

function mapInflationLevel(cpiActual) {
  if (cpiActual >= 4.0) return 2;
  if (cpiActual >= 3.0) return 1;
  if (cpiActual <= 0.5) return -2;
  if (cpiActual <= 1.5) return -1;
  return 0;
}

function mapBondConfirmation(raw, avg2y, avg10y) {
  const shortDiff = raw.yield2y - avg2y;
  const longDiff = raw.yield10y - avg10y;

  if (shortDiff >= 1.0 && longDiff >= 0.5) return 2;
  if (shortDiff >= 0.5) return 1;
  if (shortDiff <= -1.0 && longDiff <= -0.5) return -2;
  if (shortDiff <= -0.5) return -1;
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
  if (currency === "USD") {
    return regimeScore < 0 ? Math.abs(regimeScore) * 0.5 : -regimeScore * 0.25;
  }
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

function mapSeasonality(value) {
  return clamp(Number(value || 0), -1, 1);
}

function buildFactorStateForCurrency(currency, raw, allRaw, global) {
  const avgPolicyRate =
    CURRENCIES.reduce((sum, c) => sum + Number(allRaw[c].policyRate || 0), 0) /
    CURRENCIES.length;

  const avg2y =
    CURRENCIES.reduce((sum, c) => sum + Number(allRaw[c].yield2y || 0), 0) /
    CURRENCIES.length;

  const avg10y =
    CURRENCIES.reduce((sum, c) => sum + Number(allRaw[c].yield10y || 0), 0) /
    CURRENCIES.length;

  const riskRegime = deriveRiskRegime(global);
  const marketFocus = deriveMarketFocus(global);

  return {
    rateDifferential: {
      direction: mapRateDifferential(raw.policyRate, avgPolicyRate),
      activation: selectActivation(marketFocus, "rateDifferential"),
    },
    inflationLevel: {
      direction: mapInflationLevel(raw.cpiActual),
      activation: selectActivation(marketFocus, "inflationLevel"),
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
      direction: mapSeasonality(raw.seasonalityScore),
      activation: selectActivation(marketFocus, "seasonality"),
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

  const rawScore = Number(
    factorBreakdown.reduce((sum, item) => sum + item.contribution, 0).toFixed(2)
  );

  const majorFactors = factorBreakdown.filter((f) => f.finalWeight >= 1.0);
  const alignedMajor = majorFactors.filter(
    (f) => Math.sign(f.contribution) === Math.sign(rawScore) && f.direction !== 0
  ).length;
  const contradictoryMajor = majorFactors.filter(
    (f) => Math.sign(f.contribution) !== Math.sign(rawScore) && f.direction !== 0
  ).length;
  const neutralCount = factorBreakdown.filter((f) => f.direction === 0).length;
  const activationStrength =
    factorBreakdown.reduce((sum, f) => sum + f.activation, 0) / factorBreakdown.length;

  let confidence = 50;
  confidence += alignedMajor * 8;
  confidence -= contradictoryMajor * 9;
  confidence -= neutralCount * 1.5;
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
  const divergenceBonus =
    Math.abs(diff) >= 8 ? 12 : Math.abs(diff) >= 5 ? 7 : Math.abs(diff) >= 3 ? 3 : 0;

  const confidence = clamp(
    Number((((base.confidence + quote.confidence) / 2) + divergenceBonus).toFixed(1)),
    0,
    100
  );

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
    { name: "Inflation", horizon: 45, factors: ["inflationLevel"] },
    { name: "Risk", horizon: 30, factors: ["riskSentiment"] },
    { name: "Commodities", horizon: 45, factors: ["commodityLinkage"] },
    { name: "Positioning", horizon: 30, factors: ["cotPositioning"] },
    { name: "Seasonality", horizon: 90, factors: ["seasonality"] },
    {
      name: "Composite",
      horizon: 60,
      factors: ["rateDifferential", "bondConfirmation", "riskSentiment", "cotPositioning"],
    },
  ];

  return modelLibrary.map((model, idx) => {
    const mapped = model.factors
      .map((factor) => factorBreakdown.find((f) => f.key === factor))
      .filter(Boolean);

    const avg = mapped.length
      ? mapped.reduce((sum, item) => sum + item.contribution, 0) / mapped.length
      : 0;

    const variation = ((idx % 3) - 1) * 0.25;

    return {
      x: model.horizon,
      y: Number((avg + variation).toFixed(2)),
      model: model.name,
    };
  });
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, color: "#475569" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, borderRadius: 8, border: "1px solid #cbd5e1" }}
      >
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
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
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
  const xMax = 130;
  const yMin = -6;
  const yMax = 6;

  const mapX = (x) => pad + ((x - xMin) / (xMax - xMin)) * (width - pad * 2);
  const mapY = (y) => height - pad - ((y - yMin) / (yMax - yMin)) * (height - pad * 2);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{
        width: "100%",
        height: 320,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
      }}
    >
      <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#cbd5e1" />
      <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#cbd5e1" />
      <line
        x1={pad}
        y1={mapY(0)}
        x2={width - pad}
        y2={mapY(0)}
        stroke="#94a3b8"
        strokeDasharray="4 4"
      />
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
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              <span>{item.name}</span>
              <span>{item.score.toFixed(2)}</span>
            </div>
            <div
              style={{
                background: "#e2e8f0",
                borderRadius: 9999,
                height: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width,
                  height: "100%",
                  background: item.score >= 0 ? "#16a34a" : "#dc2626",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SummaryCards({ ranking, pairRanking }) {
  return (
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
          {ranking.slice(0, 3).map((item) => (
            <div
              key={item.currency}
              style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <strong>{item.currency}</strong>
                <span style={badgeStyle(item.regime)}>{item.regime}</span>
              </div>
              <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
                Score: {item.rawScore}
              </div>
              <div style={{ color: "#475569", fontSize: 14 }}>
                Konfidenz: {item.confidence}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>Schwächste Währungen</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {[...ranking].reverse().slice(0, 3).map((item) => (
            <div
              key={item.currency}
              style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <strong>{item.currency}</strong>
                <span style={badgeStyle(item.regime)}>{item.regime}</span>
              </div>
              <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
                Score: {item.rawScore}
              </div>
              <div style={{ color: "#475569", fontSize: 14 }}>
                Konfidenz: {item.confidence}%
              </div>
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
          {pairRanking.slice(0, 6).map((item) => (
            <div
              key={item.pair}
              style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}
            >
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <strong>{item.pair}</strong>
                <span style={badgeStyle(item.regime)}>{item.regime}</span>
              </div>
              <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
                Pair Score: {item.raw}
              </div>
              <div style={{ color: "#475569", fontSize: 14 }}>
                Konfidenz: {item.confidence}%
              </div>
              <div
                style={{
                  color: item.noTrade ? "#991b1b" : "#166534",
                  fontSize: 13,
                  marginTop: 4,
                }}
              >
                {item.noTrade ? "No Trade" : "Trade-fähig"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SnapshotManager({
  sectionName,
  currentSnapshot,
  setSnapshotMeta,
  snapshots,
  onLoadSnapshot,
  onSaveSnapshot,
  onDeleteSnapshot,
  onExportSnapshots,
  onImportSnapshots,
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
        <TextField
          label="Snapshot-Name"
          value={currentSnapshot.meta.name}
          onChange={(v) => setSnapshotMeta("name", v)}
        />
        <DateField
          label="Snapshot-Datum"
          value={currentSnapshot.meta.snapshotDate}
          onChange={(v) => setSnapshotMeta("snapshotDate", v)}
        />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={onSaveSnapshot} style={buttonStyle()}>
          Snapshot speichern
        </button>
        <button onClick={onExportSnapshots} style={buttonStyle()}>
          Snapshots exportieren
        </button>
        <label
          style={{
            ...buttonStyle(),
            display: "inline-flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          Snapshots importieren
          <input
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={onImportSnapshots}
          />
        </label>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {snapshots.length === 0 && (
          <div style={{ color: "#64748b" }}>Noch keine gespeicherten Snapshots.</div>
        )}

        {snapshots.map((snap) => (
          <div
            key={snap.meta.id}
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
              <div style={{ fontWeight: 600 }}>{snap.meta.name}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>{snap.meta.snapshotDate}</div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => onLoadSnapshot(snap.meta.id)} style={smallButtonStyle()}>
                Laden
              </button>
              <button
                onClick={() => onDeleteSnapshot(snap.meta.id)}
                style={smallButtonStyle(true)}
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

function InputsPanel({ snapshot, updateMeta, updateGlobal, updateCurrency, sectionName }) {
  const derivedRiskRegime = deriveRiskRegime(snapshot.global);
  const derivedMarketFocus = deriveMarketFocus(snapshot.global);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={cardStyle()}>
        <h3 style={{ marginTop: 0 }}>{sectionName} globale Eingaben</h3>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <DateField
            label="Datum"
            value={snapshot.meta.snapshotDate}
            onChange={(v) => updateMeta("snapshotDate", v)}
          />
          <TextField label="Name" value={snapshot.meta.name} onChange={(v) => updateMeta("name", v)} />
          <NumberField
            label="S&P 500 Veränderung 1M (%)"
            value={snapshot.global.spx1mChange}
            onChange={(v) => updateGlobal("spx1mChange", v)}
          />
          <NumberField
            label="Öl Veränderung 3M (%)"
            value={snapshot.global.oil3mChange}
            onChange={(v) => updateGlobal("oil3mChange", v)}
          />
          <NumberField
            label="USD Index Proxy Veränderung 1M (%)"
            value={snapshot.global.usdIndexProxy1mChange}
            onChange={(v) => updateGlobal("usdIndexProxy1mChange", v)}
          />
          <NumberField
            label="VIX"
            value={snapshot.global.vix}
            onChange={(v) => updateGlobal("vix", v)}
          />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <div style={{ color: "#475569" }}>
            Abgeleitetes Risk Regime: <strong>{derivedRiskRegime}</strong>
          </div>
          <div style={{ color: "#475569" }}>
            Abgeleiteter Marktfokus: <strong>{derivedMarketFocus}</strong>
          </div>
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
          const row = snapshot.currencies[ccy];

          return (
            <div key={ccy} style={cardStyle()}>
              <h3 style={{ marginTop: 0 }}>{ccy}</h3>
              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                }}
              >
                <NumberField
                  label="Policy Rate"
                  value={row.policyRate}
                  onChange={(v) => updateCurrency(ccy, "policyRate", v)}
                />
                <NumberField
                  label="CPI Actual"
                  value={row.cpiActual}
                  onChange={(v) => updateCurrency(ccy, "cpiActual", v)}
                />
                <NumberField
                  label="2Y Yield"
                  value={row.yield2y}
                  onChange={(v) => updateCurrency(ccy, "yield2y", v)}
                />
                <NumberField
                  label="10Y Yield"
                  value={row.yield10y}
                  onChange={(v) => updateCurrency(ccy, "yield10y", v)}
                />
                <NumberField
                  label="COT Percentile"
                  value={row.cotPercentile}
                  onChange={(v) => updateCurrency(ccy, "cotPercentile", clamp(v, 0, 100))}
                  step={1}
                  min={0}
                  max={100}
                />
                <NumberField
                  label="Seasonality Score (-1 bis 1)"
                  value={row.seasonalityScore}
                  onChange={(v) => updateCurrency(ccy, "seasonalityScore", clamp(v, -1, 1))}
                  step={0.5}
                  min={-1}
                  max={1}
                />
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
      <div
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}
      >
        <h3 style={{ margin: 0 }}>Faktoraufschlüsselung</h3>
        <select
          value={selectedCurrency}
          onChange={(e) => setSelectedCurrency(e.target.value)}
          style={{ padding: 8, borderRadius: 8 }}
        >
          {CURRENCIES.map((ccy) => (
            <option key={ccy} value={ccy}>
              {ccy}
            </option>
          ))}
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
                <td
                  style={{
                    padding: 10,
                    fontWeight: 600,
                    color: row.contribution >= 0 ? "#166534" : "#991b1b",
                  }}
                >
                  {row.contribution.toFixed(2)}
                </td>
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
                <td
                  style={{
                    padding: 10,
                    fontWeight: 600,
                    color: row.raw >= 0 ? "#166534" : "#991b1b",
                  }}
                >
                  {row.raw}
                </td>
                <td style={{ padding: 10 }}>
                  <span style={badgeStyle(row.regime)}>{row.regime}</span>
                </td>
                <td style={{ padding: 10 }}>{row.confidence}%</td>
                <td style={{ padding: 10 }}>{row.probabilityBaseUp}%</td>
                <td style={{ padding: 10 }}>{row.divergenceBonus}</td>
                <td
                  style={{
                    padding: 10,
                    color: row.noTrade ? "#991b1b" : "#166534",
                    fontWeight: 600,
                  }}
                >
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

function OverviewPanel({
  snapshot,
  scores,
  ranking,
  pairRanking,
  selectedCurrency,
  setSelectedCurrency,
  scatterData,
  barData,
  base,
  setBase,
  quote,
  setQuote,
  currentPair,
  sectionName,
}) {
  return (
    <>
      <div
        style={{
          ...cardStyle(),
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "#475569" }}>Datum</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{snapshot.meta.snapshotDate}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#475569" }}>Name</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{snapshot.meta.name}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#475569" }}>Abgeleitetes Risk Regime</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{deriveRiskRegime(snapshot.global)}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "#475569" }}>Abgeleiteter Marktfokus</div>
          <div style={{ marginTop: 6, fontWeight: 600 }}>{deriveMarketFocus(snapshot.global)}</div>
        </div>
      </div>

      <SummaryCards ranking={ranking} pairRanking={pairRanking} />

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "2fr 1fr" }}>
        <div style={cardStyle()}>
          <div
            style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}
          >
            <strong>{sectionName} Modell-Scatter für</strong>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              {CURRENCIES.map((ccy) => (
                <option key={ccy} value={ccy}>
                  {ccy}
                </option>
              ))}
            </select>
            <span style={badgeStyle(scores[selectedCurrency].regime)}>
              {scores[selectedCurrency].regime}
            </span>
            <span style={{ color: "#475569", fontSize: 14 }}>
              Score: {scores[selectedCurrency].rawScore}
            </span>
            <span style={{ color: "#475569", fontSize: 14 }}>
              Konfidenz: {scores[selectedCurrency].confidence}% (
              {confidenceClass(scores[selectedCurrency].confidence)})
            </span>
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
          <div
            style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}
          >
            <select value={base} onChange={(e) => setBase(e.target.value)} style={{ padding: 8, borderRadius: 8 }}>
              {CURRENCIES.map((ccy) => (
                <option key={ccy} value={ccy}>
                  {ccy}
                </option>
              ))}
            </select>
            <span>/</span>
            <select
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              style={{ padding: 8, borderRadius: 8 }}
            >
              {CURRENCIES.map((ccy) => (
                <option key={ccy} value={ccy}>
                  {ccy}
                </option>
              ))}
            </select>
            <span style={badgeStyle(currentPair.regime)}>{currentPair.regime}</span>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            }}
          >
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>Paar-Score</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{currentPair.raw}</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>
                Wahrscheinlichkeit {base} steigt
              </div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>
                {currentPair.probabilityBaseUp}%
              </div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>Konfidenz</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{currentPair.confidence}%</div>
            </div>
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 13, color: "#475569" }}>Status</div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: currentPair.noTrade ? "#991b1b" : "#166534",
                }}
              >
                {currentPair.noTrade ? "No Trade" : "Ok"}
              </div>
            </div>
          </div>
        </div>

        <div style={cardStyle()}>
          <h3 style={{ marginTop: 0 }}>Free-Data Kern</h3>
          <div style={{ display: "grid", gap: 10, color: "#475569", fontSize: 14 }}>
            <div>
              <strong>Pro Währung:</strong> Policy Rate, CPI Actual, 2Y, 10Y, COT, Seasonality
            </div>
            <div>
              <strong>Global:</strong> SPX 1M, Öl 3M, USD Index Proxy 1M, VIX
            </div>
            <div>
              <strong>Intern berechnet:</strong> Risk Regime, Market Focus, Pair Score, No-Trade
            </div>
            <div>
              <strong>Logik:</strong> identisch für Live und Backtest
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function useEngine(snapshot) {
  const factorStates = useMemo(() => {
    return Object.fromEntries(
      CURRENCIES.map((ccy) => [
        ccy,
        buildFactorStateForCurrency(ccy, snapshot.currencies[ccy], snapshot.currencies, snapshot.global),
      ])
    );
  }, [snapshot]);

  const scores = useMemo(() => {
    return Object.fromEntries(CURRENCIES.map((ccy) => [ccy, scoreCurrency(ccy, factorStates[ccy])]));
  }, [factorStates]);

  const ranking = useMemo(() => {
    return [...CURRENCIES]
      .map((currency) => ({ currency, ...scores[currency] }))
      .sort((a, b) => b.rawScore - a.rawScore);
  }, [scores]);

  const pairRanking = useMemo(() => {
    const pairs = [];
    for (const baseCcy of CURRENCIES) {
      for (const quoteCcy of CURRENCIES) {
        if (baseCcy === quoteCcy) continue;
        pairs.push({
          pair: `${baseCcy}/${quoteCcy}`,
          ...pairScore(scores[baseCcy], scores[quoteCcy]),
        });
      }
    }
    return pairs.sort((a, b) => b.raw - a.raw);
  }, [scores]);

  return { factorStates, scores, ranking, pairRanking };
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

  const liveCurrentPair = useMemo(
    () => pairScore(liveEngine.scores[liveBase], liveEngine.scores[liveQuote]),
    [liveEngine.scores, liveBase, liveQuote]
  );

  const backtestCurrentPair = useMemo(
    () => pairScore(backtestEngine.scores[backtestBase], backtestEngine.scores[backtestQuote]),
    [backtestEngine.scores, backtestBase, backtestQuote]
  );

  const liveScatterData = useMemo(
    () => buildModelScatterFromBreakdown(liveEngine.scores[liveSelectedCurrency].factorBreakdown),
    [liveEngine.scores, liveSelectedCurrency]
  );

  const backtestScatterData = useMemo(
    () =>
      buildModelScatterFromBreakdown(
        backtestEngine.scores[backtestSelectedCurrency].factorBreakdown
      ),
    [backtestEngine.scores, backtestSelectedCurrency]
  );

  const liveBarData = liveEngine.ranking.map((r) => ({ name: r.currency, score: r.rawScore }));
  const backtestBarData = backtestEngine.ranking.map((r) => ({
    name: r.currency,
    score: r.rawScore,
  }));

  function currentSnapshotState() {
    return activeTopTab === "live" ? liveSnapshot : backtestSnapshot;
  }

  function currentSetSnapshot() {
    return activeTopTab === "live" ? setLiveSnapshot : setBacktestSnapshot;
  }

  function updateMeta(key, value) {
    const setter = currentSetSnapshot();
    setter((prev) => ({
      ...prev,
      meta: { ...prev.meta, [key]: value },
    }));
  }

  function updateGlobal(key, value) {
    const setter = currentSetSnapshot();
    setter((prev) => ({
      ...prev,
      global: { ...prev.global, [key]: value },
    }));
  }

  function updateCurrency(currency, key, value) {
    const setter = currentSetSnapshot();
    setter((prev) => ({
      ...prev,
      currencies: {
        ...prev.currencies,
        [currency]: {
          ...prev.currencies[currency],
          [key]: value,
        },
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
    const blob = new Blob([JSON.stringify(savedSnapshots, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "forex-bias-free-core-snapshots.json";
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
  const setCurrentSelectedCurrency = isLive
    ? setLiveSelectedCurrency
    : setBacktestSelectedCurrency;
  const currentScatterData = isLive ? liveScatterData : backtestScatterData;
  const currentBarData = isLive ? liveBarData : backtestBarData;
  const currentBase = isLive ? liveBase : backtestBase;
  const currentQuote = isLive ? liveQuote : backtestQuote;
  const setCurrentBase = isLive ? setLiveBase : setBacktestBase;
  const setCurrentQuote = isLive ? setLiveQuote : setBacktestQuote;
  const currentPair = isLive ? liveCurrentPair : backtestCurrentPair;
  const sectionName = isLive ? "Live" : "Backtest";

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
      <div style={{ maxWidth: 1520, margin: "0 auto", display: "grid", gap: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32 }}>Forex Macro Bias Engine</h1>
          <p style={{ color: "#475569" }}>
            Bereinigte Free-Core-Version mit identischer Live- und Backtest-Logik,
            kohärentem Währungsscore, COT, Seasonality und kostenlosen Kernfeldern.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            ["live", "Live"],
            ["backtest", "Backtesting"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTopTab(key)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: activeTopTab === key ? "#0f172a" : "#fff",
                color: activeTopTab === key ? "#fff" : "#0f172a",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {label}
            </button>
          ))}
          <button onClick={resetCurrentToDefault} style={buttonStyle()}>
            Auf Standard zurücksetzen
          </button>
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
          {[
            ["overview", "Übersicht"],
            ["inputs", `${sectionName} Rohdaten`],
            ["breakdown", `${sectionName} Faktoraufschlüsselung`],
            ["pairs", `${sectionName} Pair-Ranking`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveSubTab(key)}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid #cbd5e1",
                background: activeSubTab === key ? "#0f172a" : "#fff",
                color: activeSubTab === key ? "#fff" : "#0f172a",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {label}
            </button>
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
          <InputsPanel
            snapshot={currentSnapshot}
            updateMeta={updateMeta}
            updateGlobal={updateGlobal}
            updateCurrency={updateCurrency}
            sectionName={sectionName}
          />
        )}

        {activeSubTab === "breakdown" && (
          <BreakdownPanel
            selectedCurrency={currentSelectedCurrency}
            setSelectedCurrency={setCurrentSelectedCurrency}
            breakdown={currentEngine.scores[currentSelectedCurrency].factorBreakdown}
          />
        )}

        {activeSubTab === "pairs" && <PairsPanel pairRanking={currentEngine.pairRanking} />}
      </div>
    </div>
  );
}

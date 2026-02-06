export const RUBRIC = {
  maxShineZone: {
    table: { min: 54, max: 58, bonusMin: 55, bonusMax: 57 },
    depth: { min: 60.5, max: 62.5, bonusMin: 61, bonusMax: 62 },
    crownAngle: { min: 34.0, max: 35.0, ideal: 34.5 },
    pavilionAngle: { min: 40.6, max: 40.9, ideal: 40.8 },
    star: { min: 45, max: 55 },
    lowerHalves: { min: 75, max: 80, bonusMin: 77, bonusMax: 80 },
    preferredGirdles: ["Thin-Medium", "Medium", "Medium-Slightly Thick"],
    avoidGirdles: ["Very Thin", "Extremely Thin", "Very Thick", "Extremely Thick"],
    preferredCulets: ["None", "Very Small"],
    preferredFinish: ["Excellent"],
    preferredFluorescence: ["None", "Faint"],
  },
  avoidList: {
    depthHigh: 63,
    depthLow: 59,
    tableHigh: 60,
    tableLow: 53,
    pavilionLeakage: 41.2,
  },
  anglePairing: {
    crownIdeal: 34.5,
    pavilionIdeal: 40.8,
    maxDistanceForFullBonus: 0.08,
    maxDistanceForPenalty: 0.45,
  },
  scores: {
    brightnessBase: 70,
    fireBase: 70,
    riskBase: 15,
    overallWeights: {
      brightness: 0.45,
      fire: 0.35,
      safety: 0.20,
    },
  },
  thresholds: {
    closeCall: 3,
    majorRedFlagCombo: {
      pavilionAtOrAbove: 41.2,
      depthAbove: 63,
      depthBelow: 59,
    },
  },
};

export const COLOR_ORDER = [
  "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
];

export const CLARITY_ORDER = [
  "FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1", "I2", "I3",
];

export const GRADE_THRESHOLDS = [
  { grade: "A", min: 90 },
  { grade: "B", min: 80 },
  { grade: "C", min: 70 },
  { grade: "D", min: 60 },
  { grade: "F", min: 0 },
];

export function clampScore(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizeText(value) {
  return String(value || "").trim();
}

export function toTitle(value) {
  const raw = normalizeText(value);
  if (!raw) return "";
  return raw
    .toLowerCase()
    .split(/[\s\-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

export function inRange(value, min, max) {
  return typeof value === "number" && !Number.isNaN(value) && value >= min && value <= max;
}

export function nearRange(value, min, max, tolerance = 0.2) {
  if (typeof value !== "number" || Number.isNaN(value)) return false;
  return value >= min - tolerance && value <= max + tolerance;
}

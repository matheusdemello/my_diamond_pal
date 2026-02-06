import assert from "node:assert/strict";
import { evaluateDiamond, compareDiamonds } from "./rules.js";

const idealDiamond = {
  shape: "Round",
  carat: 1.0,
  lab: "GIA",
  cutGrade: "Excellent",
  color: "F",
  clarity: "VS1",
  tablePct: 56,
  depthPct: 61.8,
  crownAngle: 34.5,
  pavilionAngle: 40.8,
  girdle: "Medium",
  culet: "None",
  starPct: 50,
  lowerHalvesPct: 78,
  polish: "Excellent",
  symmetry: "Excellent",
  fluorescence: "None",
  hazyMilky: false,
  avgDiameterMm: 6.45,
  price: 7200,
  currency: "USD",
};

const riskyDiamond = {
  shape: "Round",
  carat: 1.0,
  lab: "GIA",
  cutGrade: "Very Good",
  color: "H",
  clarity: "SI1",
  tablePct: 62,
  depthPct: 63.4,
  crownAngle: 36.4,
  pavilionAngle: 41.3,
  girdle: "Very Thick",
  culet: "Medium",
  polish: "Good",
  symmetry: "Good",
  fluorescence: "Strong",
  hazyMilky: true,
  price: 9500,
  currency: "USD",
};

const localBenchmarks = [
  {
    shape: "Round",
    carat_min: 0.9,
    carat_max: 1.1,
    color_best: "D",
    color_worst: "H",
    clarity_best: "VVS1",
    clarity_worst: "SI1",
    cut_grades: ["Excellent", "Ideal"],
    price_per_carat_min: 5200,
    price_per_carat_max: 8200,
  },
];

const fancyDiamond = {
  ...idealDiamond,
  shape: "Oval",
};

const nonUsdDiamond = {
  ...idealDiamond,
  currency: "EUR",
};

const evaluationIdeal = evaluateDiamond(idealDiamond, []);
assert.equal(evaluationIdeal.overall.grade, "A");
assert.ok(evaluationIdeal.brightness.score >= 90);
assert.ok(evaluationIdeal.fire.score >= 90);
assert.ok(evaluationIdeal.risk.score <= 20);
assert.equal(evaluationIdeal.redFlags.length, 0);
assert.equal(evaluationIdeal.hcaLike.available, true);
assert.ok(evaluationIdeal.hcaLike.score <= 2.5);

const evaluationRisky = evaluateDiamond(riskyDiamond, []);
assert.equal(evaluationRisky.overall.grade, "F");
assert.ok(evaluationRisky.risk.score >= 70);
assert.ok(evaluationRisky.redFlags.length >= 4);
assert.equal(evaluationRisky.hcaLike.available, true);
assert.ok(evaluationRisky.hcaLike.score >= 6);

const comparison = compareDiamonds(idealDiamond, riskyDiamond, []);
const overallWinner = comparison.overall.winner;
assert.equal(overallWinner, "Diamond A");
const hcaWinner = comparison.winnerByCategory.find((item) => item.category === "HCA-like")?.winner;
assert.equal(hcaWinner, "Diamond A");

const fancyEvaluation = evaluateDiamond(fancyDiamond, localBenchmarks);
assert.equal(fancyEvaluation.hcaLike.available, false);
assert.equal(fancyEvaluation.hcaLike.score, null);

const nonUsdEvaluation = evaluateDiamond(nonUsdDiamond, localBenchmarks);
assert.equal(nonUsdEvaluation.value.status, "currency-unsupported");

const mixedComparison = compareDiamonds(idealDiamond, fancyDiamond, localBenchmarks);
const mixedHca = mixedComparison.winnerByCategory.find((item) => item.category === "HCA-like")?.winner;
assert.equal(mixedHca, "N/A (round-only metric)");

const nonComparableValueComparison = compareDiamonds(nonUsdDiamond, { ...fancyDiamond, currency: "CAD" }, localBenchmarks);
const valueWinner = nonComparableValueComparison.winnerByCategory.find((item) => item.category === "Value")?.winner;
assert.equal(valueWinner, "No comparable benchmark");

const oneComparableValueComparison = compareDiamonds(idealDiamond, nonUsdDiamond, localBenchmarks);
const oneComparableValueWinner = oneComparableValueComparison.winnerByCategory.find((item) => item.category === "Value")?.winner;
assert.equal(oneComparableValueWinner, "Diamond A (only comparable one)");

console.log("All deterministic rules tests passed.");

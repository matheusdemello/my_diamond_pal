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

const evaluationIdeal = evaluateDiamond(idealDiamond, []);
assert.equal(evaluationIdeal.overall.grade, "A");
assert.ok(evaluationIdeal.brightness.score >= 90);
assert.ok(evaluationIdeal.fire.score >= 90);
assert.ok(evaluationIdeal.risk.score <= 20);
assert.equal(evaluationIdeal.redFlags.length, 0);

const evaluationRisky = evaluateDiamond(riskyDiamond, []);
assert.equal(evaluationRisky.overall.grade, "F");
assert.ok(evaluationRisky.risk.score >= 70);
assert.ok(evaluationRisky.redFlags.length >= 4);

const comparison = compareDiamonds(idealDiamond, riskyDiamond, []);
const overallWinner = comparison.overall.winner;
assert.equal(overallWinner, "Diamond A");

console.log("All deterministic rules tests passed.");

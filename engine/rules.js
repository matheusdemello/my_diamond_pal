import {
  RUBRIC,
  COLOR_ORDER,
  CLARITY_ORDER,
  GRADE_THRESHOLDS,
  clampScore,
  inRange,
  nearRange,
  normalizeText,
  toTitle,
} from "./rubric.js";

function component(id, category, delta, threshold, explanation) {
  return { id, category, delta, threshold, explanation };
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDiamond(raw) {
  return {
    shape: toTitle(raw.shape || "Round"),
    carat: parseNumber(raw.carat),
    lab: normalizeText(raw.lab),
    cutGrade: normalizeText(raw.cutGrade),
    polish: normalizeText(raw.polish),
    symmetry: normalizeText(raw.symmetry),
    tablePct: parseNumber(raw.tablePct),
    depthPct: parseNumber(raw.depthPct),
    crownAngle: parseNumber(raw.crownAngle),
    pavilionAngle: parseNumber(raw.pavilionAngle),
    girdle: normalizeText(raw.girdle),
    culet: normalizeText(raw.culet),
    starPct: parseNumber(raw.starPct),
    lowerHalvesPct: parseNumber(raw.lowerHalvesPct),
    fluorescence: normalizeText(raw.fluorescence),
    hazyMilky: Boolean(raw.hazyMilky),
    cloudsNote: normalizeText(raw.cloudsNote),
    avgDiameterMm: parseNumber(raw.avgDiameterMm),
    measurements: normalizeText(raw.measurements),
    color: normalizeText(raw.color).toUpperCase(),
    clarity: normalizeText(raw.clarity).toUpperCase(),
    price: parseNumber(raw.price),
    currency: normalizeText(raw.currency || "USD").toUpperCase(),
  };
}

function toLower(value) {
  return normalizeText(value).toLowerCase();
}

function includesIgnoreCase(values, target) {
  const normalized = toLower(target);
  return values.some((item) => toLower(item) === normalized);
}

function anyIncludesIgnoreCase(values, target) {
  return values.some((item) => toLower(target).includes(toLower(item)));
}

function parseDiameterFromMeasurements(measurements) {
  const numbers = String(measurements || "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map((part) => Number(part));
  if (!numbers || numbers.length < 2) return null;
  return (numbers[0] + numbers[1]) / 2;
}

function evaluateBrightness(diamond, redFlags) {
  const parts = [];
  let score = RUBRIC.scores.brightnessBase;

  if (diamond.pavilionAngle !== null) {
    if (inRange(diamond.pavilionAngle, RUBRIC.maxShineZone.pavilionAngle.min, RUBRIC.maxShineZone.pavilionAngle.max)) {
      score += 14;
      parts.push(component(
        "pavilion-core",
        "brightness",
        14,
        `${RUBRIC.maxShineZone.pavilionAngle.min}-${RUBRIC.maxShineZone.pavilionAngle.max}`,
        "Pavilion angle is in the high-return zone for brightness."
      ));
    } else if (nearRange(diamond.pavilionAngle, RUBRIC.maxShineZone.pavilionAngle.min, RUBRIC.maxShineZone.pavilionAngle.max, 0.15)) {
      score += 5;
      parts.push(component(
        "pavilion-near",
        "brightness",
        5,
        `near ${RUBRIC.maxShineZone.pavilionAngle.min}-${RUBRIC.maxShineZone.pavilionAngle.max}`,
        "Pavilion angle is near target, with moderate light-return confidence."
      ));
    } else if (diamond.pavilionAngle >= RUBRIC.avoidList.pavilionLeakage) {
      score -= 22;
      parts.push(component(
        "pavilion-leakage",
        "brightness",
        -22,
        `>= ${RUBRIC.avoidList.pavilionLeakage}`,
        "Pavilion angle enters leakage-prone territory and reduces brightness."
      ));
      redFlags.push("Pavilion angle is 41.2 or higher (high leakage risk).");
    } else {
      score -= 8;
      parts.push(component(
        "pavilion-off",
        "brightness",
        -8,
        `${RUBRIC.maxShineZone.pavilionAngle.min}-${RUBRIC.maxShineZone.pavilionAngle.max}`,
        "Pavilion angle is outside preferred zone."
      ));
    }
  }

  if (diamond.depthPct !== null) {
    if (inRange(diamond.depthPct, RUBRIC.maxShineZone.depth.bonusMin, RUBRIC.maxShineZone.depth.bonusMax)) {
      score += 8;
      parts.push(component(
        "depth-bonus",
        "brightness",
        8,
        `${RUBRIC.maxShineZone.depth.bonusMin}-${RUBRIC.maxShineZone.depth.bonusMax}`,
        "Depth sits in the center of the ideal spread/light-return balance."
      ));
    } else if (inRange(diamond.depthPct, RUBRIC.maxShineZone.depth.min, RUBRIC.maxShineZone.depth.max)) {
      score += 4;
      parts.push(component(
        "depth-pass",
        "brightness",
        4,
        `${RUBRIC.maxShineZone.depth.min}-${RUBRIC.maxShineZone.depth.max}`,
        "Depth is inside the acceptable maximum shine zone."
      ));
    } else {
      score -= 10;
      parts.push(component(
        "depth-off",
        "brightness",
        -10,
        `${RUBRIC.maxShineZone.depth.min}-${RUBRIC.maxShineZone.depth.max}`,
        "Depth is outside preferred geometry and may hurt light return."
      ));
    }
  }

  if (diamond.crownAngle !== null && diamond.pavilionAngle !== null) {
    const distance = Math.hypot(
      diamond.crownAngle - RUBRIC.anglePairing.crownIdeal,
      diamond.pavilionAngle - RUBRIC.anglePairing.pavilionIdeal
    );
    if (distance <= RUBRIC.anglePairing.maxDistanceForFullBonus) {
      score += 12;
      parts.push(component(
        "angle-pairing-perfect",
        "brightness",
        12,
        `distance <= ${RUBRIC.anglePairing.maxDistanceForFullBonus}`,
        "Crown/pavilion pairing is extremely close to the target pair (34.5 / 40.8)."
      ));
    } else if (distance <= 0.2) {
      score += 6;
      parts.push(component(
        "angle-pairing-good",
        "brightness",
        6,
        "distance <= 0.20",
        "Angle pairing is close and supports brightness."
      ));
    } else if (distance <= RUBRIC.anglePairing.maxDistanceForPenalty) {
      score += 2;
      parts.push(component(
        "angle-pairing-neutral",
        "brightness",
        2,
        `distance <= ${RUBRIC.anglePairing.maxDistanceForPenalty}`,
        "Angle pairing is acceptable but not optimized."
      ));
    } else {
      score -= 9;
      parts.push(component(
        "angle-pairing-weak",
        "brightness",
        -9,
        `distance > ${RUBRIC.anglePairing.maxDistanceForPenalty}`,
        "Angle pairing drifts too far from the target pair, reducing brightness confidence."
      ));
    }
  }

  if (diamond.tablePct !== null) {
    if (inRange(diamond.tablePct, RUBRIC.maxShineZone.table.bonusMin, RUBRIC.maxShineZone.table.bonusMax)) {
      score += 5;
      parts.push(component(
        "table-bonus",
        "brightness",
        5,
        `${RUBRIC.maxShineZone.table.bonusMin}-${RUBRIC.maxShineZone.table.bonusMax}`,
        "Table is in the top brightness/fire balance window."
      ));
    } else if (inRange(diamond.tablePct, RUBRIC.maxShineZone.table.min, RUBRIC.maxShineZone.table.max)) {
      score += 3;
      parts.push(component(
        "table-pass",
        "brightness",
        3,
        `${RUBRIC.maxShineZone.table.min}-${RUBRIC.maxShineZone.table.max}`,
        "Table is in the preferred shine zone."
      ));
    } else {
      score -= 7;
      parts.push(component(
        "table-off",
        "brightness",
        -7,
        `${RUBRIC.maxShineZone.table.min}-${RUBRIC.maxShineZone.table.max}`,
        "Table proportion is outside the target shine zone."
      ));
    }
  }

  return { score: clampScore(score), components: parts };
}

function evaluateFire(diamond) {
  const parts = [];
  let score = RUBRIC.scores.fireBase;

  if (diamond.crownAngle !== null) {
    if (diamond.crownAngle === RUBRIC.maxShineZone.crownAngle.ideal) {
      score += 14;
      parts.push(component(
        "crown-perfect",
        "fire",
        14,
        `= ${RUBRIC.maxShineZone.crownAngle.ideal}`,
        "Crown angle sits at the exact target for strong fire."
      ));
    } else if (inRange(diamond.crownAngle, RUBRIC.maxShineZone.crownAngle.min, RUBRIC.maxShineZone.crownAngle.max)) {
      score += 10;
      parts.push(component(
        "crown-pass",
        "fire",
        10,
        `${RUBRIC.maxShineZone.crownAngle.min}-${RUBRIC.maxShineZone.crownAngle.max}`,
        "Crown angle supports strong dispersion potential."
      ));
    } else if (nearRange(diamond.crownAngle, RUBRIC.maxShineZone.crownAngle.min, RUBRIC.maxShineZone.crownAngle.max, 0.4)) {
      score += 3;
      parts.push(component(
        "crown-near",
        "fire",
        3,
        "near 34.0-35.0",
        "Crown angle is close, with moderate fire potential."
      ));
    } else {
      score -= 10;
      parts.push(component(
        "crown-off",
        "fire",
        -10,
        `${RUBRIC.maxShineZone.crownAngle.min}-${RUBRIC.maxShineZone.crownAngle.max}`,
        "Crown angle is outside preferred fire geometry."
      ));
    }
  }

  if (diamond.tablePct !== null) {
    if (inRange(diamond.tablePct, RUBRIC.maxShineZone.table.bonusMin, RUBRIC.maxShineZone.table.bonusMax)) {
      score += 9;
      parts.push(component(
        "table-fire-bonus",
        "fire",
        9,
        `${RUBRIC.maxShineZone.table.bonusMin}-${RUBRIC.maxShineZone.table.bonusMax}`,
        "Table size supports balanced white light and spectral fire."
      ));
    } else if (inRange(diamond.tablePct, RUBRIC.maxShineZone.table.min, RUBRIC.maxShineZone.table.max)) {
      score += 4;
      parts.push(component(
        "table-fire-pass",
        "fire",
        4,
        `${RUBRIC.maxShineZone.table.min}-${RUBRIC.maxShineZone.table.max}`,
        "Table is in acceptable fire range."
      ));
    } else {
      score -= 9;
      parts.push(component(
        "table-fire-off",
        "fire",
        -9,
        `${RUBRIC.maxShineZone.table.min}-${RUBRIC.maxShineZone.table.max}`,
        "Table size is outside preferred fire range."
      ));
    }
  }

  if (diamond.lowerHalvesPct !== null) {
    if (inRange(diamond.lowerHalvesPct, RUBRIC.maxShineZone.lowerHalves.bonusMin, RUBRIC.maxShineZone.lowerHalves.bonusMax)) {
      score += 5;
      parts.push(component(
        "lower-halves-bonus",
        "fire",
        5,
        `${RUBRIC.maxShineZone.lowerHalves.bonusMin}-${RUBRIC.maxShineZone.lowerHalves.bonusMax}`,
        "Lower-half facets are in the crisp scintillation sweet spot."
      ));
    } else if (inRange(diamond.lowerHalvesPct, RUBRIC.maxShineZone.lowerHalves.min, RUBRIC.maxShineZone.lowerHalves.max)) {
      score += 2;
      parts.push(component(
        "lower-halves-pass",
        "fire",
        2,
        `${RUBRIC.maxShineZone.lowerHalves.min}-${RUBRIC.maxShineZone.lowerHalves.max}`,
        "Lower-half facets are acceptable for balanced fire."
      ));
    } else {
      score -= 4;
      parts.push(component(
        "lower-halves-off",
        "fire",
        -4,
        `${RUBRIC.maxShineZone.lowerHalves.min}-${RUBRIC.maxShineZone.lowerHalves.max}`,
        "Lower-half facets are outside preferred range."
      ));
    }
  }

  if (diamond.starPct !== null) {
    if (inRange(diamond.starPct, RUBRIC.maxShineZone.star.min, RUBRIC.maxShineZone.star.max)) {
      score += 3;
      parts.push(component(
        "star-pass",
        "fire",
        3,
        `${RUBRIC.maxShineZone.star.min}-${RUBRIC.maxShineZone.star.max}`,
        "Star facets are in the preferred range for balanced patterning."
      ));
    } else {
      score -= 3;
      parts.push(component(
        "star-off",
        "fire",
        -3,
        `${RUBRIC.maxShineZone.star.min}-${RUBRIC.maxShineZone.star.max}`,
        "Star facets are outside preferred range."
      ));
    }
  }

  return { score: clampScore(score), components: parts };
}

function evaluateRisk(diamond, redFlags) {
  const parts = [];
  let score = RUBRIC.scores.riskBase;

  if (diamond.depthPct !== null) {
    if (diamond.depthPct > RUBRIC.avoidList.depthHigh || diamond.depthPct < RUBRIC.avoidList.depthLow) {
      score += 18;
      redFlags.push(
        `Depth is outside avoid threshold (${RUBRIC.avoidList.depthLow}-${RUBRIC.avoidList.depthHigh}): ${diamond.depthPct.toFixed(2)}.`
      );
      parts.push(component(
        "depth-avoid",
        "risk",
        18,
        `< ${RUBRIC.avoidList.depthLow} or > ${RUBRIC.avoidList.depthHigh}`,
        "Depth is in avoid-list territory, increasing leakage/spread risk."
      ));
    } else if (!inRange(diamond.depthPct, RUBRIC.maxShineZone.depth.min, RUBRIC.maxShineZone.depth.max)) {
      score += 7;
      parts.push(component(
        "depth-outside-zone",
        "risk",
        7,
        `${RUBRIC.maxShineZone.depth.min}-${RUBRIC.maxShineZone.depth.max}`,
        "Depth is outside the preferred maximum shine zone."
      ));
    } else {
      score -= 3;
      parts.push(component(
        "depth-in-zone",
        "risk",
        -3,
        `${RUBRIC.maxShineZone.depth.min}-${RUBRIC.maxShineZone.depth.max}`,
        "Depth is in target zone, reducing structural risk signals."
      ));
    }
  }

  if (diamond.tablePct !== null) {
    if (diamond.tablePct > RUBRIC.avoidList.tableHigh || diamond.tablePct < RUBRIC.avoidList.tableLow) {
      score += 12;
      redFlags.push(
        `Table is outside avoid threshold (${RUBRIC.avoidList.tableLow}-${RUBRIC.avoidList.tableHigh}): ${diamond.tablePct.toFixed(2)}.`
      );
      parts.push(component(
        "table-avoid",
        "risk",
        12,
        `< ${RUBRIC.avoidList.tableLow} or > ${RUBRIC.avoidList.tableHigh}`,
        "Table is in avoid-list territory."
      ));
    } else if (!inRange(diamond.tablePct, RUBRIC.maxShineZone.table.min, RUBRIC.maxShineZone.table.max)) {
      score += 5;
      parts.push(component(
        "table-outside-zone",
        "risk",
        5,
        `${RUBRIC.maxShineZone.table.min}-${RUBRIC.maxShineZone.table.max}`,
        "Table is outside preferred shine zone."
      ));
    } else {
      score -= 2;
      parts.push(component(
        "table-in-zone",
        "risk",
        -2,
        `${RUBRIC.maxShineZone.table.min}-${RUBRIC.maxShineZone.table.max}`,
        "Table is in preferred zone."
      ));
    }
  }

  if (diamond.girdle) {
    if (anyIncludesIgnoreCase(RUBRIC.maxShineZone.avoidGirdles, diamond.girdle)) {
      score += 15;
      redFlags.push("Girdle is at an extreme (very thin or very thick).");
      parts.push(component(
        "girdle-extreme",
        "risk",
        15,
        "avoid: very thin / very thick",
        "Extreme girdle can imply durability or spread penalties."
      ));
    } else if (includesIgnoreCase(RUBRIC.maxShineZone.preferredGirdles, diamond.girdle)) {
      score -= 4;
      parts.push(component(
        "girdle-preferred",
        "risk",
        -4,
        "Thin-Medium / Medium",
        "Girdle is in preferred range."
      ));
    } else {
      score += 4;
      parts.push(component(
        "girdle-neutral",
        "risk",
        4,
        "preferred: Thin-Medium / Medium",
        "Girdle is acceptable but outside preferred center."
      ));
    }
  }

  if (diamond.culet) {
    if (includesIgnoreCase(RUBRIC.maxShineZone.preferredCulets, diamond.culet)) {
      score -= 2;
      parts.push(component(
        "culet-preferred",
        "risk",
        -2,
        "None / Very Small",
        "Culet is in preferred range."
      ));
    } else {
      score += 3;
      parts.push(component(
        "culet-off",
        "risk",
        3,
        "None / Very Small",
        "Larger culet can modestly reduce light performance."
      ));
    }
  }

  const polishExcellent = toLower(diamond.polish) === "excellent";
  if (diamond.polish) {
    score += polishExcellent ? -2 : 4;
    parts.push(component(
      "polish-quality",
      "risk",
      polishExcellent ? -2 : 4,
      "Excellent preferred",
      polishExcellent ? "Polish quality is optimal." : "Non-excellent polish can introduce minor light scatter."
    ));
  }

  const symmetryExcellent = toLower(diamond.symmetry) === "excellent";
  if (diamond.symmetry) {
    score += symmetryExcellent ? -2 : 4;
    parts.push(component(
      "symmetry-quality",
      "risk",
      symmetryExcellent ? -2 : 4,
      "Excellent preferred",
      symmetryExcellent ? "Symmetry quality is optimal." : "Non-excellent symmetry can reduce pattern precision."
    ));
  }

  if (diamond.fluorescence) {
    const fl = toLower(diamond.fluorescence);
    if (fl === "none" || fl === "faint") {
      score -= 2;
      parts.push(component(
        "fluor-safe",
        "risk",
        -2,
        "None/Faint",
        "Fluorescence is in safest range."
      ));
    } else {
      score += 8;
      parts.push(component(
        "fluor-warning",
        "risk",
        8,
        "Medium+ warning",
        "Medium or stronger fluorescence can carry market/perception risk."
      ));
      redFlags.push("Fluorescence is Medium or stronger.");
    }
  }

  if (diamond.hazyMilky) {
    score += 25;
    redFlags.push("Hazy/milky appearance was flagged.");
    parts.push(component(
      "hazy-flag",
      "risk",
      25,
      "hazy/milky checked",
      "Possible milkiness can significantly suppress transparency and sparkle."
    ));
  }

  if (diamond.cloudsNote) {
    score += 4;
    parts.push(component(
      "clouds-note",
      "risk",
      4,
      "cloud note present",
      "Cloud inclusions note added; verify transparency in photos/videos."
    ));
  }

  return { score: clampScore(score), components: parts };
}

function checklistEntry(label, value, passRange, nearTolerance = 0.2) {
  if (value === null || Number.isNaN(value)) {
    return {
      label,
      status: "unknown",
      actual: "Not provided",
      target: `${passRange.min}-${passRange.max}`,
      explanation: "Input not provided.",
    };
  }
  if (inRange(value, passRange.min, passRange.max)) {
    return {
      label,
      status: "pass",
      actual: value,
      target: `${passRange.min}-${passRange.max}`,
      explanation: "Inside maximum shine zone.",
    };
  }
  if (nearRange(value, passRange.min, passRange.max, nearTolerance)) {
    return {
      label,
      status: "near",
      actual: value,
      target: `${passRange.min}-${passRange.max}`,
      explanation: "Near zone boundary.",
    };
  }
  return {
    label,
    status: "fail",
    actual: value,
    target: `${passRange.min}-${passRange.max}`,
    explanation: "Outside maximum shine zone.",
  };
}

function textChecklistEntry(label, value, preferredList, avoidList = []) {
  const textValue = normalizeText(value);
  if (!textValue) {
    return {
      label,
      status: "unknown",
      actual: "Not provided",
      target: preferredList.join(" / "),
      explanation: "Input not provided.",
    };
  }

  if (avoidList.length && anyIncludesIgnoreCase(avoidList, textValue)) {
    return {
      label,
      status: "fail",
      actual: textValue,
      target: preferredList.join(" / "),
      explanation: "Matches avoid-list condition.",
    };
  }

  if (includesIgnoreCase(preferredList, textValue)) {
    return {
      label,
      status: "pass",
      actual: textValue,
      target: preferredList.join(" / "),
      explanation: "Matches preferred specification.",
    };
  }

  return {
    label,
    status: "near",
    actual: textValue,
    target: preferredList.join(" / "),
    explanation: "Acceptable but not preferred.",
  };
}

function buildChecklist(diamond) {
  return [
    checklistEntry("Table %", diamond.tablePct, RUBRIC.maxShineZone.table, 0.3),
    checklistEntry("Depth %", diamond.depthPct, RUBRIC.maxShineZone.depth, 0.25),
    checklistEntry("Crown angle", diamond.crownAngle, RUBRIC.maxShineZone.crownAngle, 0.3),
    checklistEntry("Pavilion angle", diamond.pavilionAngle, RUBRIC.maxShineZone.pavilionAngle, 0.12),
    textChecklistEntry("Girdle", diamond.girdle, RUBRIC.maxShineZone.preferredGirdles, RUBRIC.maxShineZone.avoidGirdles),
    textChecklistEntry("Culet", diamond.culet, RUBRIC.maxShineZone.preferredCulets),
    textChecklistEntry("Polish", diamond.polish, RUBRIC.maxShineZone.preferredFinish),
    textChecklistEntry("Symmetry", diamond.symmetry, RUBRIC.maxShineZone.preferredFinish),
    textChecklistEntry("Fluorescence", diamond.fluorescence, RUBRIC.maxShineZone.preferredFluorescence),
    checklistEntry("Star %", diamond.starPct, RUBRIC.maxShineZone.star, 1.0),
    checklistEntry("Lower halves %", diamond.lowerHalvesPct, RUBRIC.maxShineZone.lowerHalves, 1.0),
  ];
}

function evaluateSpread(diamond) {
  const diameter = diamond.avgDiameterMm ?? parseDiameterFromMeasurements(diamond.measurements);
  if (diamond.carat === null || diameter === null) {
    return {
      status: "unknown",
      actualDiameterMm: diameter,
      expectedDiameterMm: null,
      ratio: null,
      explanation: "Provide both carat and average diameter or measurements to estimate spread.",
    };
  }

  const expectedDiameter = Math.pow(diamond.carat / 0.00373, 1 / 3);
  const ratio = diameter / expectedDiameter;

  if (ratio >= 1.01) {
    return {
      status: "excellent",
      actualDiameterMm: Number(diameter.toFixed(2)),
      expectedDiameterMm: Number(expectedDiameter.toFixed(2)),
      ratio: Number(ratio.toFixed(3)),
      explanation: "Face-up spread appears above expected for this carat weight.",
    };
  }
  if (ratio >= 0.99) {
    return {
      status: "balanced",
      actualDiameterMm: Number(diameter.toFixed(2)),
      expectedDiameterMm: Number(expectedDiameter.toFixed(2)),
      ratio: Number(ratio.toFixed(3)),
      explanation: "Face-up spread is in the expected range.",
    };
  }
  if (ratio >= 0.97) {
    return {
      status: "slightly-hidden",
      actualDiameterMm: Number(diameter.toFixed(2)),
      expectedDiameterMm: Number(expectedDiameter.toFixed(2)),
      ratio: Number(ratio.toFixed(3)),
      explanation: "Slight spread penalty; some weight may be hidden in depth.",
    };
  }
  return {
    status: "hidden-weight",
    actualDiameterMm: Number(diameter.toFixed(2)),
    expectedDiameterMm: Number(expectedDiameter.toFixed(2)),
    ratio: Number(ratio.toFixed(3)),
    explanation: "Noticeable spread penalty; likely hidden weight / smaller face-up look.",
  };
}

function indexFromOrder(value, order) {
  return order.indexOf(value);
}

function isRankWithin(value, best, worst, order) {
  const valueIndex = indexFromOrder(value, order);
  const bestIndex = indexFromOrder(best, order);
  const worstIndex = indexFromOrder(worst, order);
  if (valueIndex < 0 || bestIndex < 0 || worstIndex < 0) return false;
  return valueIndex >= bestIndex && valueIndex <= worstIndex;
}

function matchBenchmark(diamond, benchmarks) {
  if (!Array.isArray(benchmarks) || !benchmarks.length) return null;

  const cut = toLower(diamond.cutGrade);
  const shape = toLower(diamond.shape);

  return benchmarks.find((band) => {
    const shapeMatch = toLower(band.shape) === shape;
    const caratMatch = diamond.carat !== null && diamond.carat >= band.carat_min && diamond.carat <= band.carat_max;
    const cutMatch = Array.isArray(band.cut_grades)
      ? band.cut_grades.some((allowed) => toLower(allowed) === cut)
      : false;
    const colorMatch = isRankWithin(diamond.color, band.color_best, band.color_worst, COLOR_ORDER);
    const clarityMatch = isRankWithin(diamond.clarity, band.clarity_best, band.clarity_worst, CLARITY_ORDER);
    return shapeMatch && caratMatch && cutMatch && colorMatch && clarityMatch;
  }) || null;
}

function evaluateValue(diamond, benchmarks) {
  if (diamond.price === null || diamond.carat === null) {
    return {
      status: "no-price",
      label: "No price entered",
      explanation: "Add price and carat to run deterministic value comparison.",
      benchmark: null,
      pricePerCarat: null,
    };
  }

  if (diamond.currency && diamond.currency !== "USD") {
    return {
      status: "currency-unsupported",
      label: "No USD reference for selected currency",
      explanation: "Local benchmark table is USD-only. Convert the input price to USD to compare value.",
      benchmark: null,
      pricePerCarat: Number((diamond.price / diamond.carat).toFixed(0)),
    };
  }

  const band = matchBenchmark(diamond, benchmarks);
  const pricePerCarat = diamond.price / diamond.carat;

  if (!band) {
    return {
      status: "no-reference",
      label: "No reference band available",
      explanation: "No benchmark row matched shape/carat/color/clarity/cut inputs.",
      benchmark: null,
      pricePerCarat: Number(pricePerCarat.toFixed(0)),
    };
  }

  const midpoint = (band.price_per_carat_min + band.price_per_carat_max) / 2;
  const deltaPct = ((pricePerCarat - midpoint) / midpoint) * 100;

  if (pricePerCarat < band.price_per_carat_min) {
    return {
      status: "below",
      label: "Below reference",
      explanation: "Price per carat is below the matched local benchmark band.",
      benchmark: band,
      pricePerCarat: Number(pricePerCarat.toFixed(0)),
      deltaPct: Number(deltaPct.toFixed(1)),
    };
  }

  if (pricePerCarat <= band.price_per_carat_max) {
    return {
      status: "fair",
      label: "Fair range",
      explanation: "Price per carat is inside the matched local benchmark band.",
      benchmark: band,
      pricePerCarat: Number(pricePerCarat.toFixed(0)),
      deltaPct: Number(deltaPct.toFixed(1)),
    };
  }

  return {
    status: "above",
    label: "Above reference",
    explanation: "Price per carat is above the matched local benchmark band.",
    benchmark: band,
    pricePerCarat: Number(pricePerCarat.toFixed(0)),
    deltaPct: Number(deltaPct.toFixed(1)),
  };
}

function calculateOverallGrade(overallScore, redFlags, majorFlag) {
  if (overallScore < 60 || majorFlag) {
    return {
      grade: "F",
      reason: "Score fell below 60 or major red-flag combination was triggered.",
    };
  }

  let grade = "F";
  for (const threshold of GRADE_THRESHOLDS) {
    if (overallScore >= threshold.min) {
      grade = threshold.grade;
      break;
    }
  }

  if (grade === "A" && redFlags.length > 0) {
    return {
      grade: "B",
      reason: "Numeric score reached A-range, but red flags prevent an A grade.",
    };
  }

  return {
    grade,
    reason: `Numeric overall score mapped to grade ${grade}.`,
  };
}

function normalizeRedFlags(redFlags) {
  return [...new Set(redFlags)];
}

function ratingFromPerformanceScore(score) {
  if (score === null || Number.isNaN(score)) return "Unknown";
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  return "Poor";
}

function hcaPointsFromRating(rating) {
  const pointsMap = {
    "Excellent": 0.5,
    "Very Good": 1.0,
    "Good": 1.8,
    "Fair": 2.6,
    "Poor": 3.6,
    "Unknown": 2.0,
  };
  return pointsMap[rating] ?? 2.0;
}

function spreadPerformanceScore(spread) {
  const scoreMap = {
    "excellent": 92,
    "balanced": 84,
    "slightly-hidden": 72,
    "hidden-weight": 58,
    "unknown": 70,
  };
  return scoreMap[spread.status] ?? 70;
}

function evaluateScintillationScore(diamond, brightness, fire, risk) {
  let score = brightness.score * 0.45 + fire.score * 0.35 + (100 - risk.score) * 0.2;

  if (diamond.lowerHalvesPct !== null) {
    if (inRange(diamond.lowerHalvesPct, RUBRIC.maxShineZone.lowerHalves.bonusMin, RUBRIC.maxShineZone.lowerHalves.bonusMax)) {
      score += 5;
    } else if (inRange(diamond.lowerHalvesPct, RUBRIC.maxShineZone.lowerHalves.min, RUBRIC.maxShineZone.lowerHalves.max)) {
      score += 2;
    } else {
      score -= 4;
    }
  }

  const sym = toLower(diamond.symmetry);
  if (sym === "excellent") score += 5;
  else if (sym === "very good") score += 2;
  else if (sym === "good") score -= 3;
  else if (sym) score -= 6;

  if (diamond.crownAngle !== null && diamond.pavilionAngle !== null) {
    const distance = Math.hypot(
      diamond.crownAngle - RUBRIC.anglePairing.crownIdeal,
      diamond.pavilionAngle - RUBRIC.anglePairing.pavilionIdeal
    );
    if (distance <= 0.2) score += 5;
    else if (distance <= RUBRIC.anglePairing.maxDistanceForPenalty) score += 1;
    else score -= 5;
  }

  return clampScore(score);
}

function hcaBandFromTotal(totalScore, redFlags) {
  if (totalScore === null) {
    return {
      band: "Unavailable",
      recommendation: "HCA-like score is only available for round diamonds in this template.",
    };
  }

  if (totalScore <= 2.0 && redFlags.length === 0) {
    return {
      band: "Excellent",
      recommendation: "Excellent candidate in this rejection-style model.",
    };
  }

  if (totalScore <= 2.5) {
    return {
      band: "Very Good",
      recommendation: "Very strong candidate; verify with imagery and vendor data.",
    };
  }

  if (totalScore <= 4.0) {
    return {
      band: "Good",
      recommendation: "Worth considering with careful visual checks.",
    };
  }

  if (totalScore <= 6.0) {
    return {
      band: "Fair",
      recommendation: "Borderline option; compare against better geometry candidates.",
    };
  }

  return {
    band: "Poor",
    recommendation: "Reject in this model and keep searching.",
  };
}

function evaluateHcaLike(diamond, brightness, fire, risk, spread, redFlags) {
  const isRound = toLower(diamond.shape) === "round";
  if (!isRound) {
    return {
      available: false,
      model: "HCA-like deterministic template",
      scale: "Lower is better",
      score: null,
      band: "Unavailable",
      recommendation: "HCA-like score is only available for round diamonds in this template.",
      components: [],
      explanation: "Round-only mode is used to keep this output aligned with angle-based rejection logic.",
    };
  }

  const leakagePenalty = redFlags.some((flag) => flag.toLowerCase().includes("leakage")) ? 12 : 0;
  const depthPenalty = redFlags.some((flag) => flag.toLowerCase().includes("depth is outside avoid threshold")) ? 6 : 0;
  const lightReturnScore = clampScore(brightness.score - leakagePenalty - depthPenalty);
  const fireScore = fire.score;
  const scintillationScore = evaluateScintillationScore(diamond, brightness, fire, risk);
  const spreadScore = spreadPerformanceScore(spread);

  const components = [
    {
      name: "Light Return",
      score: lightReturnScore,
      rating: ratingFromPerformanceScore(lightReturnScore),
      points: hcaPointsFromRating(ratingFromPerformanceScore(lightReturnScore)),
      threshold: ">=90 Excellent, 80-89 Very Good, 70-79 Good, 60-69 Fair, <60 Poor",
      explanation: "Derived from brightness, with extra penalty if leakage/depth red flags were triggered.",
    },
    {
      name: "Fire",
      score: fireScore,
      rating: ratingFromPerformanceScore(fireScore),
      points: hcaPointsFromRating(ratingFromPerformanceScore(fireScore)),
      threshold: ">=90 Excellent, 80-89 Very Good, 70-79 Good, 60-69 Fair, <60 Poor",
      explanation: "Derived from crown/table balance and facet proportion effects.",
    },
    {
      name: "Scintillation",
      score: scintillationScore,
      rating: ratingFromPerformanceScore(scintillationScore),
      points: hcaPointsFromRating(ratingFromPerformanceScore(scintillationScore)),
      threshold: ">=90 Excellent, 80-89 Very Good, 70-79 Good, 60-69 Fair, <60 Poor",
      explanation: "Derived from brightness/fire blend plus lower-halves, symmetry, and angle pairing.",
    },
    {
      name: "Spread",
      score: spreadScore,
      rating: ratingFromPerformanceScore(spreadScore),
      points: hcaPointsFromRating(ratingFromPerformanceScore(spreadScore)),
      threshold: "Mapped from spread status: excellent/balanced/slightly-hidden/hidden-weight/unknown",
      explanation: "Derived from face-up diameter efficiency for the given carat weight.",
    },
  ];

  const total = Number(components.reduce((sum, item) => sum + item.points, 0).toFixed(1));
  const band = hcaBandFromTotal(total, redFlags);

  return {
    available: true,
    model: "HCA-like deterministic template",
    scale: "Lower is better",
    score: total,
    band: band.band,
    recommendation: band.recommendation,
    components,
    explanation: "This is an HCA-like template output and not the original patented HCA calculation.",
  };
}

function getTradeoffs(evaluation) {
  const pros = [];
  const cons = [];

  const addPro = (text, delta) => {
    pros.push({ text, magnitude: Math.abs(delta) });
  };
  const addCon = (text, delta) => {
    cons.push({ text, magnitude: Math.abs(delta) });
  };

  for (const part of evaluation.brightness.components) {
    if (part.delta > 0) addPro(`${part.explanation} (${part.delta > 0 ? "+" : ""}${part.delta})`, part.delta);
    if (part.delta < 0) addCon(`${part.explanation} (${part.delta})`, part.delta);
  }

  for (const part of evaluation.fire.components) {
    if (part.delta > 0) addPro(`${part.explanation} (${part.delta > 0 ? "+" : ""}${part.delta})`, part.delta);
    if (part.delta < 0) addCon(`${part.explanation} (${part.delta})`, part.delta);
  }

  for (const part of evaluation.risk.components) {
    if (part.delta < 0) addPro(`${part.explanation} (risk ${part.delta})`, part.delta);
    if (part.delta > 0) addCon(`${part.explanation} (risk +${part.delta})`, part.delta);
  }

  return {
    pros: pros.sort((a, b) => b.magnitude - a.magnitude).slice(0, 3).map((entry) => entry.text),
    cons: cons.sort((a, b) => b.magnitude - a.magnitude).slice(0, 3).map((entry) => entry.text),
  };
}

function compareCategory(name, leftValue, rightValue, lowerIsBetter = false) {
  const diff = Math.abs(leftValue - rightValue);
  if (diff <= RUBRIC.thresholds.closeCall) {
    return {
      category: name,
      winner: "Too close to call",
      difference: Number(diff.toFixed(1)),
    };
  }

  const leftWins = lowerIsBetter ? leftValue < rightValue : leftValue > rightValue;
  return {
    category: name,
    winner: leftWins ? "Diamond A" : "Diamond B",
    difference: Number(diff.toFixed(1)),
  };
}

function valueRank(status) {
  if (status === "below") return 3;
  if (status === "fair") return 2;
  if (status === "above") return 1;
  return 0;
}

function compareValue(left, right) {
  const leftComparable = ["below", "fair", "above"].includes(left.value.status);
  const rightComparable = ["below", "fair", "above"].includes(right.value.status);

  if (!leftComparable && !rightComparable) {
    return {
      category: "Value",
      winner: "No comparable benchmark",
      difference: 0,
    };
  }

  if (leftComparable && !rightComparable) {
    return {
      category: "Value",
      winner: "Diamond A (only comparable one)",
      difference: 0,
    };
  }

  if (!leftComparable && rightComparable) {
    return {
      category: "Value",
      winner: "Diamond B (only comparable one)",
      difference: 0,
    };
  }

  const leftRank = valueRank(left.value.status);
  const rightRank = valueRank(right.value.status);

  if (leftRank === rightRank) {
    return {
      category: "Value",
      winner: "Too close to call",
      difference: 0,
    };
  }

  return {
    category: "Value",
    winner: leftRank > rightRank ? "Diamond A" : "Diamond B",
    difference: Math.abs(leftRank - rightRank),
  };
}

function compareHcaLike(left, right) {
  if (!left.hcaLike.available || !right.hcaLike.available) {
    return {
      category: "HCA-like",
      winner: "N/A (round-only metric)",
      difference: 0,
    };
  }

  const diff = Math.abs(left.hcaLike.score - right.hcaLike.score);
  if (diff <= 0.3) {
    return {
      category: "HCA-like",
      winner: "Too close to call",
      difference: Number(diff.toFixed(1)),
    };
  }

  return {
    category: "HCA-like",
    winner: left.hcaLike.score < right.hcaLike.score ? "Diamond A" : "Diamond B",
    difference: Number(diff.toFixed(1)),
  };
}

export function evaluateDiamond(inputDiamond, benchmarks = []) {
  const diamond = normalizeDiamond(inputDiamond);
  const redFlags = [];

  const brightness = evaluateBrightness(diamond, redFlags);
  const fire = evaluateFire(diamond);
  const risk = evaluateRisk(diamond, redFlags);
  const checklist = buildChecklist(diamond);
  const spread = evaluateSpread(diamond);
  const value = evaluateValue(diamond, benchmarks);
  const uniqueFlags = normalizeRedFlags(redFlags);
  const hcaLike = evaluateHcaLike(diamond, brightness, fire, risk, spread, uniqueFlags);

  const majorRedFlag =
    diamond.pavilionAngle !== null &&
    diamond.pavilionAngle >= RUBRIC.thresholds.majorRedFlagCombo.pavilionAtOrAbove &&
    (diamond.depthPct !== null &&
      (diamond.depthPct > RUBRIC.thresholds.majorRedFlagCombo.depthAbove ||
        diamond.depthPct < RUBRIC.thresholds.majorRedFlagCombo.depthBelow));

  const overallScore = clampScore(
    brightness.score * RUBRIC.scores.overallWeights.brightness +
      fire.score * RUBRIC.scores.overallWeights.fire +
      (100 - risk.score) * RUBRIC.scores.overallWeights.safety
  );

  const gradeResult = calculateOverallGrade(overallScore, uniqueFlags, majorRedFlag);

  const evaluation = {
    input: diamond,
    overall: {
      score: overallScore,
      grade: gradeResult.grade,
      explanation: gradeResult.reason,
      thresholds: "A>=90 (no red flags), B=80-89, C=70-79, D=60-69, F<60 or major red flag",
    },
    brightness,
    fire,
    risk,
    passMaximumShineZone: checklist.every((item) => item.status === "pass" || item.status === "unknown"),
    checklist,
    redFlags: uniqueFlags,
    spread,
    value,
    hcaLike,
  };

  evaluation.tradeoffs = getTradeoffs(evaluation);
  return evaluation;
}

export function compareDiamonds(firstInput, secondInput, benchmarks = []) {
  const first = evaluateDiamond(firstInput, benchmarks);
  const second = evaluateDiamond(secondInput, benchmarks);

  const categories = [
    compareCategory("Brightness", first.brightness.score, second.brightness.score, false),
    compareCategory("Fire", first.fire.score, second.fire.score, false),
    compareCategory("Risk", first.risk.score, second.risk.score, true),
    compareHcaLike(first, second),
    compareValue(first, second),
  ];

  const overallSummary = compareCategory("Overall", first.overall.score, second.overall.score, false);

  return {
    diamondA: first,
    diamondB: second,
    winnerByCategory: categories,
    overall: overallSummary,
  };
}

export { normalizeDiamond };

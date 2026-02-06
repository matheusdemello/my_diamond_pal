import { evaluateDiamond, compareDiamonds } from "./engine/rules.js";

const FIELDS = [
  { id: "shape", label: "Shape", type: "select", options: ["Round", "Princess", "Oval", "Cushion", "Emerald", "Radiant", "Pear", "Marquise"], defaultValue: "Round" },
  { id: "carat", label: "Carat", type: "number", step: "0.01", min: 0.1, max: 20, placeholder: "1.00" },
  { id: "lab", label: "Lab", type: "select", options: ["GIA", "AGS", "IGI", "HRD", "Other"] },
  { id: "cutGrade", label: "Cut Grade", type: "select", options: ["Excellent", "Ideal", "Very Good", "Good", "Fair"] },
  { id: "color", label: "Color", type: "select", options: ["D", "E", "F", "G", "H", "I", "J", "K"] },
  { id: "clarity", label: "Clarity", type: "select", options: ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1"] },
  { id: "tablePct", label: "Table %", type: "number", step: "0.1", min: 45, max: 75, required: true, placeholder: "56.0" },
  { id: "depthPct", label: "Depth %", type: "number", step: "0.1", min: 50, max: 75, required: true, placeholder: "61.8" },
  { id: "crownAngle", label: "Crown Angle", type: "number", step: "0.1", min: 25, max: 45, required: true, placeholder: "34.5" },
  { id: "pavilionAngle", label: "Pavilion Angle", type: "number", step: "0.1", min: 38, max: 43, required: true, placeholder: "40.8" },
  {
    id: "girdle",
    label: "Girdle",
    type: "select",
    options: ["Thin", "Thin-Medium", "Medium", "Medium-Slightly Thick", "Slightly Thick", "Very Thin", "Very Thick"],
  },
  { id: "culet", label: "Culet", type: "select", options: ["None", "Very Small", "Small", "Medium", "Large"] },
  { id: "starPct", label: "Star %", type: "number", step: "1", min: 0, max: 100, placeholder: "50" },
  { id: "lowerHalvesPct", label: "Lower Halves %", type: "number", step: "1", min: 0, max: 100, placeholder: "78" },
  { id: "polish", label: "Polish", type: "select", options: ["Excellent", "Very Good", "Good", "Fair"] },
  { id: "symmetry", label: "Symmetry", type: "select", options: ["Excellent", "Very Good", "Good", "Fair"] },
  { id: "fluorescence", label: "Fluorescence", type: "select", options: ["None", "Faint", "Medium", "Strong", "Very Strong"] },
  { id: "avgDiameterMm", label: "Avg Diameter (mm)", type: "number", step: "0.01", min: 2, max: 20, placeholder: "6.45" },
  { id: "measurements", label: "Measurements (optional)", type: "text", placeholder: "6.40-6.45 x 3.95" },
  { id: "price", label: "Price", type: "number", step: "1", min: 0, placeholder: "7000" },
  { id: "currency", label: "Currency", type: "select", options: ["USD", "EUR", "GBP", "CAD"] },
  { id: "hazyMilky", label: "Hazy / Milky?", type: "checkbox" },
  { id: "cloudsNote", label: "Clouds Note", type: "text", placeholder: "Optional comments" },
];

const benchmarkState = {
  bands: [],
  loaded: false,
  loadError: null,
};

const INPUT_LIMITS = {
  carat: { min: 0.1, max: 20, label: "Carat" },
  tablePct: { min: 45, max: 75, label: "Table %" },
  depthPct: { min: 50, max: 75, label: "Depth %" },
  crownAngle: { min: 25, max: 45, label: "Crown angle" },
  pavilionAngle: { min: 38, max: 43, label: "Pavilion angle" },
  starPct: { min: 0, max: 100, label: "Star %" },
  lowerHalvesPct: { min: 0, max: 100, label: "Lower halves %" },
  avgDiameterMm: { min: 2, max: 20, label: "Average diameter (mm)" },
  price: { min: 0, max: 100000000, label: "Price" },
};

function createField(prefix, field) {
  const wrapper = document.createElement("div");
  wrapper.className = field.type === "checkbox" ? "field checkbox-row" : "field";

  const id = `${prefix}_${field.id}`;

  if (field.type === "checkbox") {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.name = id;
    input.setAttribute("aria-label", field.label);

    const label = document.createElement("label");
    label.setAttribute("for", id);
    label.textContent = field.label;

    wrapper.append(input, label);
    return wrapper;
  }

  const label = document.createElement("label");
  label.setAttribute("for", id);
  label.textContent = field.label;
  wrapper.appendChild(label);

  let input;
  if (field.type === "select") {
    input = document.createElement("select");
    field.options.forEach((optionValue) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionValue;
      input.appendChild(option);
    });
    if (field.defaultValue) input.value = field.defaultValue;
  } else {
    input = document.createElement("input");
    input.type = field.type;
    if (field.step) input.step = field.step;
    if (field.min !== undefined) input.min = String(field.min);
    if (field.max !== undefined) input.max = String(field.max);
    if (field.placeholder) input.placeholder = field.placeholder;
  }

  input.id = id;
  input.name = id;
  if (field.required) input.required = true;
  input.setAttribute("aria-label", field.label);
  wrapper.appendChild(input);
  return wrapper;
}

function renderFields(containerId, prefix) {
  const container = document.getElementById(containerId);
  const fragment = document.createDocumentFragment();
  FIELDS.forEach((field) => fragment.appendChild(createField(prefix, field)));
  container.appendChild(fragment);
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function parseAverageDiameterFromMeasurements(measurements) {
  const values = normalizeText(measurements)
    .match(/\d+(?:\.\d+)?/g)
    ?.map((part) => Number(part));
  if (!values || values.length < 2) return null;
  const avg = (values[0] + values[1]) / 2;
  return Number.isFinite(avg) ? Number(avg.toFixed(2)) : null;
}

function getValue(form, prefix, id) {
  return form.elements[`${prefix}_${id}`];
}

function readDiamond(form, prefix) {
  const measurements = normalizeText(getValue(form, prefix, "measurements")?.value);
  const typedAvgDiameter = parseNumber(getValue(form, prefix, "avgDiameterMm")?.value);
  const parsedAvgDiameter = typedAvgDiameter ?? parseAverageDiameterFromMeasurements(measurements);

  return {
    shape: getValue(form, prefix, "shape")?.value,
    carat: parseNumber(getValue(form, prefix, "carat")?.value),
    lab: getValue(form, prefix, "lab")?.value,
    cutGrade: getValue(form, prefix, "cutGrade")?.value,
    color: normalizeText(getValue(form, prefix, "color")?.value).toUpperCase(),
    clarity: normalizeText(getValue(form, prefix, "clarity")?.value).toUpperCase(),
    tablePct: parseNumber(getValue(form, prefix, "tablePct")?.value),
    depthPct: parseNumber(getValue(form, prefix, "depthPct")?.value),
    crownAngle: parseNumber(getValue(form, prefix, "crownAngle")?.value),
    pavilionAngle: parseNumber(getValue(form, prefix, "pavilionAngle")?.value),
    girdle: getValue(form, prefix, "girdle")?.value,
    culet: getValue(form, prefix, "culet")?.value,
    starPct: parseNumber(getValue(form, prefix, "starPct")?.value),
    lowerHalvesPct: parseNumber(getValue(form, prefix, "lowerHalvesPct")?.value),
    polish: getValue(form, prefix, "polish")?.value,
    symmetry: getValue(form, prefix, "symmetry")?.value,
    fluorescence: getValue(form, prefix, "fluorescence")?.value,
    avgDiameterMm: parsedAvgDiameter,
    measurements,
    price: parseNumber(getValue(form, prefix, "price")?.value),
    currency: normalizeText(getValue(form, prefix, "currency")?.value).toUpperCase(),
    hazyMilky: Boolean(getValue(form, prefix, "hazyMilky")?.checked),
    cloudsNote: normalizeText(getValue(form, prefix, "cloudsNote")?.value),
    _parsedDiameterFromMeasurements: typedAvgDiameter === null && parsedAvgDiameter !== null,
  };
}

function validateRange(value, rule, errors) {
  if (value === null) return;
  if (value < rule.min || value > rule.max) {
    errors.push(`${rule.label} must be between ${rule.min} and ${rule.max}.`);
  }
}

function validateDiamondInput(diamond, label) {
  const errors = [];
  const warnings = [];
  const notes = [];

  if (diamond._parsedDiameterFromMeasurements) {
    notes.push(`Average diameter was auto-derived from measurements: ${diamond.avgDiameterMm} mm.`);
  }

  if (diamond.tablePct === null) errors.push("Table % is required.");
  if (diamond.depthPct === null) errors.push("Depth % is required.");
  if (diamond.crownAngle === null) errors.push("Crown angle is required.");
  if (diamond.pavilionAngle === null) errors.push("Pavilion angle is required.");

  validateRange(diamond.carat, INPUT_LIMITS.carat, errors);
  validateRange(diamond.tablePct, INPUT_LIMITS.tablePct, errors);
  validateRange(diamond.depthPct, INPUT_LIMITS.depthPct, errors);
  validateRange(diamond.crownAngle, INPUT_LIMITS.crownAngle, errors);
  validateRange(diamond.pavilionAngle, INPUT_LIMITS.pavilionAngle, errors);
  validateRange(diamond.starPct, INPUT_LIMITS.starPct, errors);
  validateRange(diamond.lowerHalvesPct, INPUT_LIMITS.lowerHalvesPct, errors);
  validateRange(diamond.avgDiameterMm, INPUT_LIMITS.avgDiameterMm, errors);
  validateRange(diamond.price, INPUT_LIMITS.price, errors);

  if (diamond.measurements && diamond.avgDiameterMm === null) {
    warnings.push("Measurements format could not be parsed. Use something like 6.40-6.45 x 3.95.");
  }

  if (diamond.price !== null && diamond.carat === null) {
    warnings.push("Price was entered without carat. Value check needs both.");
  }

  if (diamond.carat !== null && diamond.price === null) {
    warnings.push("Price missing: value check will be skipped.");
  }

  if (diamond.avgDiameterMm === null && !diamond.measurements) {
    warnings.push("No diameter or measurements provided: spread analysis may be limited.");
  }

  if (diamond.tablePct !== null && (diamond.tablePct > 60 || diamond.tablePct < 53)) {
    warnings.push("Table is in avoid-list territory (<53 or >60).");
  }

  if (diamond.depthPct !== null && (diamond.depthPct > 63 || diamond.depthPct < 59)) {
    warnings.push("Depth is in avoid-list territory (<59 or >63).");
  }

  if (diamond.pavilionAngle !== null && diamond.pavilionAngle >= 41.2) {
    warnings.push("Pavilion angle is 41.2 or higher (leakage risk).");
  }

  if (diamond.hazyMilky) {
    warnings.push("Hazy/milky was checked and will strongly increase risk.");
  }

  return { label, errors, warnings, notes };
}

function gradeClass(status) {
  if (status === "pass") return "status-pass";
  if (status === "near") return "status-near";
  if (status === "fail") return "status-fail";
  return "";
}

function riskToneClass(riskScore) {
  if (riskScore <= 25) return "tone-good";
  if (riskScore <= 45) return "tone-warn";
  return "tone-bad";
}

function hcaToneClass(score) {
  if (score === null || Number.isNaN(score)) return "tone-warn";
  if (score <= 2.5) return "tone-good";
  if (score <= 4.0) return "tone-warn";
  return "tone-bad";
}

function decisionFromEvaluation(evaluation) {
  const hcaScore = evaluation.hcaLike?.score ?? null;
  const redFlagCount = evaluation.redFlags.length;

  if (evaluation.overall.grade === "F" || redFlagCount >= 3 || (hcaScore !== null && hcaScore > 4.5)) {
    return {
      title: "Reject / Keep Searching",
      subtitle: "Geometry risk is too high in this template.",
      toneClass: "tone-bad",
    };
  }

  if ((hcaScore !== null && hcaScore <= 2.5) && evaluation.risk.score <= 30 && redFlagCount === 0) {
    return {
      title: "Strong Candidate",
      subtitle: "Passes this rejection-style screen with high confidence.",
      toneClass: "tone-good",
    };
  }

  return {
    title: "Promising, Verify Carefully",
    subtitle: "Worth shortlist review with imagery and vendor confirmation.",
    toneClass: "tone-warn",
  };
}

function formatMetric(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "n/a";
  if (typeof value !== "number") return String(value);
  return value.toFixed(digits);
}

function buildResultHero(evaluation, labelText) {
  const hero = document.createElement("section");
  hero.className = "result-hero";

  const decision = decisionFromEvaluation(evaluation);

  const left = document.createElement("div");
  left.className = "result-hero-left";

  const label = document.createElement("p");
  label.className = "label";
  label.textContent = labelText;

  const title = document.createElement("h3");
  title.className = `hero-verdict ${decision.toneClass}`;
  title.textContent = decision.title;

  const subtitle = document.createElement("p");
  subtitle.className = "hero-subtitle";
  subtitle.textContent = decision.subtitle;

  left.append(label, title, subtitle);

  const right = document.createElement("div");
  right.className = "result-hero-right";

  const grade = document.createElement("div");
  grade.className = "metric-pill";
  grade.innerHTML = `<span>Shine Grade</span><strong>${evaluation.overall.grade}</strong>`;

  const overall = document.createElement("div");
  overall.className = "metric-pill";
  overall.innerHTML = `<span>Overall</span><strong>${evaluation.overall.score}</strong>`;

  const hca = document.createElement("div");
  hca.className = `metric-pill ${hcaToneClass(evaluation.hcaLike.score)}`;
  const hcaValue = evaluation.hcaLike.available ? evaluation.hcaLike.score : "n/a";
  hca.innerHTML = `<span>HCA-like</span><strong>${hcaValue}</strong>`;

  right.append(grade, overall, hca);
  hero.append(left, right);
  return hero;
}

function buildSpecSnapshotBlock(evaluation) {
  const block = document.createElement("section");
  block.className = "status-block";
  const heading = document.createElement("h4");
  heading.textContent = "Key Inputs Snapshot";
  block.appendChild(heading);

  const grid = document.createElement("div");
  grid.className = "snapshot-grid";
  const specs = [
    { label: "Table %", value: formatMetric(evaluation.input.tablePct, 1) },
    { label: "Depth %", value: formatMetric(evaluation.input.depthPct, 1) },
    { label: "Crown", value: formatMetric(evaluation.input.crownAngle, 1) },
    { label: "Pavilion", value: formatMetric(evaluation.input.pavilionAngle, 1) },
    { label: "Polish", value: evaluation.input.polish || "n/a" },
    { label: "Symmetry", value: evaluation.input.symmetry || "n/a" },
  ];

  specs.forEach((item) => {
    const cell = document.createElement("div");
    cell.className = "snapshot-cell";
    const k = document.createElement("span");
    k.textContent = item.label;
    const v = document.createElement("strong");
    v.textContent = item.value;
    cell.append(k, v);
    grid.appendChild(cell);
  });

  block.appendChild(grid);
  return block;
}

function renderMeterRow(label, value) {
  const row = document.createElement("div");
  row.className = "meter-row";

  const labelNode = document.createElement("span");
  labelNode.textContent = label;

  const bar = document.createElement("div");
  bar.className = "meter-bar";
  const inner = document.createElement("span");
  inner.style.width = `${Math.max(0, Math.min(100, value))}%`;
  if (label === "Risk") inner.style.background = "linear-gradient(90deg, #76b57d, #d7bc6d, #d57f7f)";
  bar.appendChild(inner);

  const valNode = document.createElement("strong");
  valNode.textContent = String(value);

  row.append(labelNode, bar, valNode);
  return row;
}

function formatChecklistItem(item) {
  const actual = typeof item.actual === "number" ? item.actual.toFixed(2) : item.actual;
  return `${item.label}: ${actual} (target ${item.target})`;
}

function renderExplainSection(title, components = []) {
  const section = document.createElement("section");
  section.className = "explain-section";

  const heading = document.createElement("h5");
  heading.textContent = title;

  const list = document.createElement("ul");
  if (!components.length) {
    const item = document.createElement("li");
    item.textContent = "No contributing components recorded.";
    list.appendChild(item);
  }

  components.forEach((entry) => {
    const item = document.createElement("li");
    const delta = entry.delta > 0 ? `+${entry.delta}` : `${entry.delta}`;
    item.textContent = `${delta} | threshold: ${entry.threshold} | ${entry.explanation}`;
    list.appendChild(item);
  });

  section.append(heading, list);
  return section;
}

function buildHcaLikeBlock(hcaLike) {
  const block = document.createElement("section");
  block.className = "status-block hca-block";

  const heading = document.createElement("h4");
  heading.textContent = "HCA-like Result";
  block.appendChild(heading);

  const summary = document.createElement("p");
  if (!hcaLike.available) {
    summary.textContent = hcaLike.recommendation;
    block.appendChild(summary);
    return block;
  }

  summary.innerHTML = `Total <strong>${hcaLike.score}</strong> (${hcaLike.scale}) • <strong>${hcaLike.band}</strong> • ${hcaLike.recommendation}`;
  block.appendChild(summary);

  const list = document.createElement("ul");
  list.className = "hca-list";
  hcaLike.components.forEach((part) => {
    const item = document.createElement("li");
    const tone = hcaToneClass(part.points);
    item.className = `hca-item ${tone}`;
    item.innerHTML = `<span>${part.name}</span><strong>${part.rating}</strong><em>${part.points} pts</em>`;
    list.appendChild(item);
  });
  block.appendChild(list);

  const note = document.createElement("p");
  note.className = "note";
  note.textContent = hcaLike.explanation;
  block.appendChild(note);

  return block;
}

function buildInputQualityBlock(inputDiagnostics) {
  if (!inputDiagnostics) return null;
  if (!inputDiagnostics.warnings.length && !inputDiagnostics.notes.length) return null;

  const block = document.createElement("section");
  block.className = "status-block";
  const heading = document.createElement("h4");
  heading.textContent = "Input Quality";
  block.appendChild(heading);

  const list = document.createElement("ul");
  list.className = "checklist";

  inputDiagnostics.warnings.forEach((warning) => {
    const item = document.createElement("li");
    item.className = "status-near";
    item.textContent = warning;
    list.appendChild(item);
  });

  inputDiagnostics.notes.forEach((note) => {
    const item = document.createElement("li");
    item.className = "status-pass";
    item.textContent = note;
    list.appendChild(item);
  });

  block.appendChild(list);
  return block;
}

function renderInputIssues(container, issueSets) {
  container.textContent = "";
  const block = document.createElement("section");
  block.className = "compare-summary";
  const title = document.createElement("h3");
  title.textContent = "Fix Input Issues";
  block.appendChild(title);

  issueSets.forEach((set) => {
    if (!set.errors.length) return;
    const sectionTitle = document.createElement("p");
    sectionTitle.className = "note";
    sectionTitle.textContent = set.label;
    block.appendChild(sectionTitle);

    const list = document.createElement("ul");
    set.errors.forEach((error) => {
      const item = document.createElement("li");
      item.className = "status-fail";
      item.textContent = error;
      list.appendChild(item);
    });
    block.appendChild(list);
  });

  container.appendChild(block);
}

function renderReportCard(evaluation, labelText = "Diamond", inputDiagnostics = null) {
  const template = document.getElementById("result-card-template");
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".report-card");

  const reportTop = card.querySelector(".report-top");
  reportTop.replaceWith(buildResultHero(evaluation, labelText));

  const meterGroup = card.querySelector(".meter-group");
  meterGroup.appendChild(renderMeterRow("Brightness", evaluation.brightness.score));
  meterGroup.appendChild(renderMeterRow("Fire", evaluation.fire.score));
  meterGroup.appendChild(renderMeterRow("Risk", evaluation.risk.score));

  const hcaBlock = buildHcaLikeBlock(evaluation.hcaLike);
  const snapshotBlock = buildSpecSnapshotBlock(evaluation);
  meterGroup.after(hcaBlock);
  hcaBlock.after(snapshotBlock);

  const qualityBlock = buildInputQualityBlock(inputDiagnostics);
  if (qualityBlock) {
    snapshotBlock.after(qualityBlock);
  }

  const checklist = card.querySelector(".checklist");
  const verdict = document.createElement("li");
  verdict.className = evaluation.passMaximumShineZone ? "status-pass" : "status-fail";
  verdict.textContent = evaluation.passMaximumShineZone
    ? "Pass: all provided criteria are inside the Maximum Shine Zone."
    : "Fail: one or more provided criteria are outside the Maximum Shine Zone.";
  checklist.appendChild(verdict);

  evaluation.checklist.forEach((entry) => {
    const item = document.createElement("li");
    item.className = gradeClass(entry.status);
    item.textContent = formatChecklistItem(entry);
    checklist.appendChild(item);
  });

  const flagList = card.querySelector(".red-flags");
  if (!evaluation.redFlags.length) {
    const cleanItem = document.createElement("li");
    cleanItem.className = "status-pass";
    cleanItem.textContent = "No avoid-list red flags triggered.";
    flagList.appendChild(cleanItem);
  } else {
    evaluation.redFlags.forEach((flag) => {
      const item = document.createElement("li");
      item.className = "status-fail";
      item.textContent = flag;
      flagList.appendChild(item);
    });
  }

  const spreadNode = card.querySelector(".spread");
  if (evaluation.spread.actualDiameterMm !== null && evaluation.spread.expectedDiameterMm !== null) {
    spreadNode.textContent = `${evaluation.spread.status}: ${evaluation.spread.explanation} Actual ${evaluation.spread.actualDiameterMm}mm vs expected ${evaluation.spread.expectedDiameterMm}mm.`;
  } else {
    spreadNode.textContent = evaluation.spread.explanation;
  }

  const valueNode = card.querySelector(".value");
  const value = evaluation.value;
  const ppc = value.pricePerCarat ? `${value.pricePerCarat.toLocaleString()} ${evaluation.input.currency}/ct` : "n/a";
  valueNode.textContent = `${value.label}. ${value.explanation} Price/ct: ${ppc}.`;

  const explain = card.querySelector(".explain-content");
  const overview = document.createElement("section");
  overview.className = "explain-section";
  const heading = document.createElement("h5");
  heading.textContent = "Overall";
  const list = document.createElement("ul");
  const overallItem = document.createElement("li");
  overallItem.textContent = `${evaluation.overall.explanation} Thresholds: ${evaluation.overall.thresholds}.`;
  list.appendChild(overallItem);
  overview.append(heading, list);

  explain.appendChild(overview);
  explain.appendChild(renderExplainSection("Brightness components", evaluation.brightness.components));
  explain.appendChild(renderExplainSection("Fire components", evaluation.fire.components));
  explain.appendChild(renderExplainSection("Risk components", evaluation.risk.components));
  explain.appendChild(renderExplainSection(
    "HCA-like components",
    evaluation.hcaLike.components.map((item) => ({
      delta: -item.points,
      threshold: item.threshold,
      explanation: `${item.name}: ${item.explanation}`,
    }))
  ));

  return fragment;
}

function renderCompare(compareData, diagnostics = null) {
  const container = document.getElementById("compare-result");
  container.textContent = "";

  const cards = document.createElement("div");
  cards.className = "result-grid";
  cards.append(
    renderReportCard(compareData.diamondA, "Diamond A", diagnostics?.diamondA || null),
    renderReportCard(compareData.diamondB, "Diamond B", diagnostics?.diamondB || null)
  );

  const summary = document.createElement("section");
  summary.className = "compare-summary";
  const h3 = document.createElement("h3");
  h3.textContent = "Winner by Category";
  const list = document.createElement("ul");
  list.className = "compare-pill-list";

  compareData.winnerByCategory.forEach((item) => {
    const li = document.createElement("li");
    li.className = "compare-pill";
    li.textContent = `${item.category}: ${item.winner} (difference ${item.difference})`;
    list.appendChild(li);
  });

  const overall = document.createElement("p");
  overall.className = "note";
  overall.textContent = `Overall comparison: ${compareData.overall.winner} (difference ${compareData.overall.difference}).`;
  summary.append(h3, list, overall);

  const tradeoffs = document.createElement("section");
  tradeoffs.className = "tradeoffs";
  const tHead = document.createElement("h3");
  tHead.textContent = "Tradeoffs";

  const tList = document.createElement("ul");
  const pushTradeoff = (label, items) => {
    const li = document.createElement("li");
    li.textContent = `${label}: ${items.length ? items.join(" | ") : "No strong signals"}`;
    tList.appendChild(li);
  };

  pushTradeoff("Diamond A Pros", compareData.diamondA.tradeoffs.pros);
  pushTradeoff("Diamond A Cons", compareData.diamondA.tradeoffs.cons);
  pushTradeoff("Diamond B Pros", compareData.diamondB.tradeoffs.pros);
  pushTradeoff("Diamond B Cons", compareData.diamondB.tradeoffs.cons);

  tradeoffs.append(tHead, tList);

  container.append(cards, summary, tradeoffs);
}

function renderRuntimeError(container, context, error) {
  container.textContent = "";
  const block = document.createElement("section");
  block.className = "compare-summary";
  const title = document.createElement("h3");
  title.textContent = "Runtime Error";
  const detail = document.createElement("p");
  const message = error instanceof Error ? error.message : String(error);
  detail.textContent = `${context}: ${message}`;
  block.append(title, detail);
  container.appendChild(block);
  console.error(context, error);
}

function bindTabs() {
  const buttons = [...document.querySelectorAll(".tab-btn")];
  const panels = {
    single: document.getElementById("panel-single"),
    compare: document.getElementById("panel-compare"),
  };

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      buttons.forEach((btn) => {
        const active = btn === button;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", String(active));
      });

      Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle("is-active", key === tab);
      });
    });
  });
}

async function loadBenchmarks() {
  try {
    const response = await fetch("./data/benchmarks.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    benchmarkState.bands = Array.isArray(payload.bands) ? payload.bands : [];
    benchmarkState.loaded = true;
    benchmarkState.loadError = null;
  } catch (error) {
    benchmarkState.bands = [];
    benchmarkState.loaded = false;
    benchmarkState.loadError = error;
  }
}

function init() {
  renderFields("single-fields", "single");
  renderFields("compare-a-fields", "a");
  renderFields("compare-b-fields", "b");
  bindTabs();

  const singleForm = document.getElementById("single-form");
  const singleResult = document.getElementById("single-result");
  if (!singleForm || !singleResult) return;
  singleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      const diamond = readDiamond(singleForm, "single");
      const diagnostics = validateDiamondInput(diamond, "Diamond");
      if (diagnostics.errors.length) {
        renderInputIssues(singleResult, [diagnostics]);
        return;
      }
      const evaluation = evaluateDiamond(diamond, benchmarkState.bands);

      singleResult.textContent = "";
      const grid = document.createElement("div");
      grid.className = "result-grid";
      grid.appendChild(renderReportCard(evaluation, "Diamond", diagnostics));
      singleResult.appendChild(grid);

      if (benchmarkState.loadError) {
        const note = document.createElement("p");
        note.className = "note";
        note.textContent = "Benchmarks were not loaded. Value check may show no reference band.";
        singleResult.appendChild(note);
      }
    } catch (error) {
      renderRuntimeError(singleResult, "Failed to evaluate the diamond", error);
    }
  });

  const compareForm = document.getElementById("compare-form");
  if (!compareForm) return;
  compareForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const compareResult = document.getElementById("compare-result");
    try {
      const diamondA = readDiamond(compareForm, "a");
      const diamondB = readDiamond(compareForm, "b");
      const diagnosticsA = validateDiamondInput(diamondA, "Diamond A");
      const diagnosticsB = validateDiamondInput(diamondB, "Diamond B");
      if (diagnosticsA.errors.length || diagnosticsB.errors.length) {
        renderInputIssues(compareResult, [diagnosticsA, diagnosticsB]);
        return;
      }
      const compareData = compareDiamonds(diamondA, diamondB, benchmarkState.bands);
      renderCompare(compareData, { diamondA: diagnosticsA, diamondB: diagnosticsB });

      if (benchmarkState.loadError) {
        const note = document.createElement("p");
        note.className = "note";
        note.textContent = "Benchmarks were not loaded. Value category may be unavailable.";
        compareResult.appendChild(note);
      }
    } catch (error) {
      renderRuntimeError(compareResult, "Failed to compare diamonds", error);
    }
  });
}

loadBenchmarks()
  .catch((error) => {
    benchmarkState.loadError = error;
  })
  .finally(() => {
    init();
  });

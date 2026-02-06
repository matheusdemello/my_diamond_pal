import { evaluateDiamond, compareDiamonds } from "./engine/rules.js";

const FIELDS = [
  { id: "shape", label: "Shape", type: "select", options: ["Round", "Princess", "Oval", "Cushion", "Emerald", "Radiant", "Pear", "Marquise"], defaultValue: "Round" },
  { id: "carat", label: "Carat", type: "number", step: "0.01", placeholder: "1.00" },
  { id: "lab", label: "Lab", type: "select", options: ["GIA", "AGS", "IGI", "HRD", "Other"] },
  { id: "cutGrade", label: "Cut Grade", type: "select", options: ["Excellent", "Ideal", "Very Good", "Good", "Fair"] },
  { id: "color", label: "Color", type: "select", options: ["D", "E", "F", "G", "H", "I", "J", "K"] },
  { id: "clarity", label: "Clarity", type: "select", options: ["FL", "IF", "VVS1", "VVS2", "VS1", "VS2", "SI1", "SI2", "I1"] },
  { id: "tablePct", label: "Table %", type: "number", step: "0.1", placeholder: "56.0" },
  { id: "depthPct", label: "Depth %", type: "number", step: "0.1", placeholder: "61.8" },
  { id: "crownAngle", label: "Crown Angle", type: "number", step: "0.1", placeholder: "34.5" },
  { id: "pavilionAngle", label: "Pavilion Angle", type: "number", step: "0.1", placeholder: "40.8" },
  {
    id: "girdle",
    label: "Girdle",
    type: "select",
    options: ["Thin", "Thin-Medium", "Medium", "Medium-Slightly Thick", "Slightly Thick", "Very Thin", "Very Thick"],
  },
  { id: "culet", label: "Culet", type: "select", options: ["None", "Very Small", "Small", "Medium", "Large"] },
  { id: "starPct", label: "Star %", type: "number", step: "1", placeholder: "50" },
  { id: "lowerHalvesPct", label: "Lower Halves %", type: "number", step: "1", placeholder: "78" },
  { id: "polish", label: "Polish", type: "select", options: ["Excellent", "Very Good", "Good", "Fair"] },
  { id: "symmetry", label: "Symmetry", type: "select", options: ["Excellent", "Very Good", "Good", "Fair"] },
  { id: "fluorescence", label: "Fluorescence", type: "select", options: ["None", "Faint", "Medium", "Strong", "Very Strong"] },
  { id: "avgDiameterMm", label: "Avg Diameter (mm)", type: "number", step: "0.01", placeholder: "6.45" },
  { id: "measurements", label: "Measurements (optional)", type: "text", placeholder: "6.40-6.45 x 3.95" },
  { id: "price", label: "Price", type: "number", step: "1", placeholder: "7000" },
  { id: "currency", label: "Currency", type: "select", options: ["USD", "EUR", "GBP", "CAD"] },
  { id: "hazyMilky", label: "Hazy / Milky?", type: "checkbox" },
  { id: "cloudsNote", label: "Clouds Note", type: "text", placeholder: "Optional comments" },
];

const benchmarkState = {
  bands: [],
  loaded: false,
  loadError: null,
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
    if (field.placeholder) input.placeholder = field.placeholder;
  }

  input.id = id;
  input.name = id;
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

function getValue(form, prefix, id) {
  return form.elements[`${prefix}_${id}`];
}

function readDiamond(form, prefix) {
  return {
    shape: getValue(form, prefix, "shape")?.value,
    carat: parseNumber(getValue(form, prefix, "carat")?.value),
    lab: getValue(form, prefix, "lab")?.value,
    cutGrade: getValue(form, prefix, "cutGrade")?.value,
    color: getValue(form, prefix, "color")?.value,
    clarity: getValue(form, prefix, "clarity")?.value,
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
    avgDiameterMm: parseNumber(getValue(form, prefix, "avgDiameterMm")?.value),
    measurements: getValue(form, prefix, "measurements")?.value,
    price: parseNumber(getValue(form, prefix, "price")?.value),
    currency: getValue(form, prefix, "currency")?.value,
    hazyMilky: Boolean(getValue(form, prefix, "hazyMilky")?.checked),
    cloudsNote: getValue(form, prefix, "cloudsNote")?.value,
  };
}

function gradeClass(status) {
  if (status === "pass") return "status-pass";
  if (status === "near") return "status-near";
  if (status === "fail") return "status-fail";
  return "";
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

function renderReportCard(evaluation, labelText = "Diamond") {
  const template = document.getElementById("result-card-template");
  const fragment = template.content.cloneNode(true);
  const card = fragment.querySelector(".report-card");

  const labelNode = document.createElement("p");
  labelNode.className = "label";
  labelNode.textContent = labelText;
  card.querySelector(".report-top > div:first-child").prepend(labelNode);

  card.querySelector(".grade").textContent = evaluation.overall.grade;
  card.querySelector(".score").textContent = `${evaluation.overall.score}/100`;

  const meterGroup = card.querySelector(".meter-group");
  meterGroup.appendChild(renderMeterRow("Bright", evaluation.brightness.score));
  meterGroup.appendChild(renderMeterRow("Fire", evaluation.fire.score));
  meterGroup.appendChild(renderMeterRow("Risk", evaluation.risk.score));

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

  return fragment;
}

function renderCompare(compareData) {
  const container = document.getElementById("compare-result");
  container.textContent = "";

  const cards = document.createElement("div");
  cards.className = "result-grid";
  cards.append(
    renderReportCard(compareData.diamondA, "Diamond A"),
    renderReportCard(compareData.diamondB, "Diamond B")
  );

  const summary = document.createElement("section");
  summary.className = "compare-summary";
  const h3 = document.createElement("h3");
  h3.textContent = "Winner by Category";
  const list = document.createElement("ul");

  compareData.winnerByCategory.forEach((item) => {
    const li = document.createElement("li");
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
      const evaluation = evaluateDiamond(diamond, benchmarkState.bands);

      singleResult.textContent = "";
      const grid = document.createElement("div");
      grid.className = "result-grid";
      grid.appendChild(renderReportCard(evaluation, "Diamond"));
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
      const compareData = compareDiamonds(diamondA, diamondB, benchmarkState.bands);
      renderCompare(compareData);

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

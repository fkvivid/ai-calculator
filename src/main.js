const { invoke } = window.__TAURI__.core;

const displayEl = document.getElementById("display");
const loadingEl = document.getElementById("loading");
const loadingStatusEl = document.getElementById("loading-status");
const keysEl = document.getElementById("keys");

const STATUS_LINES = [
  "Warming up neurons…",
  "Tokenizing integers…",
  "Reasoning about addition…",
  "Asking a billion parameters…",
  "Still smarter than a slide rule…",
  "Almost as fast as a pencil…",
  "Hallucinating… carefully…",
  "Consulting the cloud of local doom…",
];

const MIN_LOADING_MS = 400;

let expression = "";
let justComputed = false;
let busy = false;
let statusTimer = null;

function setDisplay(text, isError = false) {
  displayEl.textContent = text || "0";
  displayEl.classList.toggle("error", isError);
}

function setBusy(isBusy) {
  busy = isBusy;
  for (const btn of keysEl.querySelectorAll("button")) {
    btn.disabled = isBusy;
  }
  loadingEl.classList.toggle("hidden", !isBusy);
  loadingEl.setAttribute("aria-hidden", isBusy ? "false" : "true");

  if (isBusy) {
    let i = 0;
    loadingStatusEl.textContent = STATUS_LINES[0];
    statusTimer = setInterval(() => {
      i = (i + 1) % STATUS_LINES.length;
      loadingStatusEl.textContent = STATUS_LINES[i];
    }, 900);
  } else if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
}

function appendDigit(digit) {
  if (justComputed) {
    expression = "";
    justComputed = false;
  }
  if (digit === "." && /(\d*\.\d*)$/.test(expression.split(/[+\-*/]/).pop() || "")) {
    return;
  }
  expression += digit;
  setDisplay(expression);
}

function appendOp(op) {
  if (!expression) {
    if (op === "-") {
      expression = "-";
      setDisplay(expression);
    }
    return;
  }
  justComputed = false;
  if (/[+\-*/]$/.test(expression)) {
    expression = expression.slice(0, -1) + op;
  } else {
    expression += op;
  }
  setDisplay(expression);
}

function clearAll() {
  expression = "";
  justComputed = false;
  setDisplay("0");
}

function backspace() {
  if (justComputed) {
    clearAll();
    return;
  }
  expression = expression.slice(0, -1);
  setDisplay(expression || "0");
}

async function equals() {
  if (busy) return;
  const trimmed = expression.trim();
  if (!trimmed || /[+\-*/]$/.test(trimmed)) return;

  setBusy(true);
  const started = Date.now();

  try {
    const result = await invoke("ai_calculate", { expression: trimmed });
    const elapsed = Date.now() - started;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
    }
    expression = String(result);
    justComputed = true;
    setDisplay(expression);
  } catch (err) {
    const elapsed = Date.now() - started;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
    }
    const message =
      typeof err === "string"
        ? err
        : err?.message || "The AI refused to do math. Rude.";
    setDisplay(message, true);
    justComputed = true;
  } finally {
    setBusy(false);
  }
}

keysEl.addEventListener("click", (event) => {
  const btn = event.target.closest("button");
  if (!btn || busy) return;

  if (btn.dataset.digit != null) appendDigit(btn.dataset.digit);
  else if (btn.dataset.op != null) appendOp(btn.dataset.op);
  else if (btn.dataset.action === "clear") clearAll();
  else if (btn.dataset.action === "backspace") backspace();
  else if (btn.dataset.action === "equals") equals();
});

window.addEventListener("keydown", (event) => {
  if (busy) return;
  const { key } = event;
  if (/^\d$/.test(key) || key === ".") {
    event.preventDefault();
    appendDigit(key);
  } else if (["+", "-", "*", "/"].includes(key)) {
    event.preventDefault();
    appendOp(key);
  } else if (key === "Enter" || key === "=") {
    event.preventDefault();
    equals();
  } else if (key === "Escape" || key === "c" || key === "C") {
    event.preventDefault();
    clearAll();
  } else if (key === "Backspace") {
    event.preventDefault();
    backspace();
  }
});

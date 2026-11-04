(() => {
  "use strict";

  const resultDisplay = document.querySelector("#result");
  const expressionDisplay = document.querySelector("#expression");
  const keypad = document.querySelector("#keypad");

  const state = {
    current: "0",
    previous: null,
    operator: null,
    shouldReplace: false,
    justEvaluated: false,
    completedExpression: "",
  };

  const symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };
  const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 });

  function formatNumber(value) {
    if (!Number.isFinite(value)) return "Error";
    if (value !== 0 && (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-7)) {
      return value.toExponential(5).replace(/\.0+e/, "e").replace(/(\.\d*?)0+e/, "$1e");
    }
    return numberFormat.format(value);
  }

  function formatInput(value) {
    if (value === "-" || value === "") return value === "-" ? "−" : "0";
    const [integer, fraction] = value.split(".");
    const formattedInteger = numberFormat.format(Number(integer || "0"));
    return fraction === undefined ? formattedInteger : `${formattedInteger}.${fraction}`;
  }

  function render() {
    resultDisplay.textContent = state.current.includes(".") || state.current === "-"
      ? formatInput(state.current)
      : formatNumber(Number(state.current));

    expressionDisplay.textContent = state.operator && state.previous !== null
      ? `${formatNumber(state.previous)} ${symbols[state.operator]}`
      : state.completedExpression || "\u00a0";

    keypad.querySelectorAll('[data-action="operator"]').forEach((button) => {
      button.classList.toggle("is-selected", button.dataset.value === state.operator && !state.shouldReplace);
    });
  }

  function clear() {
    state.current = "0";
    state.previous = null;
    state.operator = null;
    state.shouldReplace = false;
    state.justEvaluated = false;
    state.completedExpression = "";
  }

  function enterDigit(digit) {
    if (state.shouldReplace || state.justEvaluated) {
      state.current = digit;
      state.shouldReplace = false;
      state.justEvaluated = false;
      state.completedExpression = "";
      return;
    }
    if (state.current.replace("-", "").replace(".", "").length >= 12) return;
    state.current = state.current === "0" ? digit : state.current === "-0" ? `-${digit}` : state.current + digit;
  }

  function enterDecimal() {
    if (state.shouldReplace || state.justEvaluated) {
      state.current = "0.";
      state.shouldReplace = false;
      state.justEvaluated = false;
      state.completedExpression = "";
    } else if (!state.current.includes(".")) {
      state.current += ".";
    }
  }

  function chooseOperator(nextOperator) {
    const inputValue = Number(state.current);
    if (state.operator && !state.shouldReplace && state.previous !== null) {
      const result = calculate(state.previous, inputValue, state.operator);
      if (!Number.isFinite(result)) {
        state.current = "Error";
        state.previous = null;
        state.operator = null;
        state.shouldReplace = true;
        return;
      }
      state.current = String(result);
      state.previous = result;
    } else {
      state.previous = inputValue;
    }
    state.operator = nextOperator;
    state.shouldReplace = true;
    state.justEvaluated = false;
    state.completedExpression = "";
  }

  function calculate(left, right, operator) {
    let value;
    switch (operator) {
      case "+": value = left + right; break;
      case "-": value = left - right; break;
      case "*": value = left * right; break;
      case "/": value = right === 0 ? NaN : left / right; break;
      default: return right;
    }
    return Number(value.toPrecision(12));
  }

  function equals() {
    if (!state.operator || state.previous === null || state.current === "Error") return;
    const left = state.previous;
    const right = Number(state.current);
    const operator = state.operator;
    const value = calculate(left, right, operator);
    if (!Number.isFinite(value)) {
      state.current = "Error";
      state.completedExpression = "Cannot divide by zero";
    } else {
      state.current = String(value);
      state.completedExpression = `${formatNumber(left)} ${symbols[operator]} ${formatNumber(right)} =`;
    }
    state.previous = null;
    state.operator = null;
    state.shouldReplace = true;
    state.justEvaluated = true;
  }

  function toggleSign() {
    if (state.current === "Error") return;
    const wasEvaluated = state.justEvaluated;
    state.current = state.current.startsWith("-") ? state.current.slice(1) : `-${state.current}`;
    if (state.current === "-0" && !state.current.includes(".")) state.current = "-0";
    state.shouldReplace = false;
    state.justEvaluated = wasEvaluated;
    state.completedExpression = "";
  }

  function percent() {
    if (state.current === "Error") return;
    const wasEvaluated = state.justEvaluated;
    state.current = String(Number((Number(state.current) / 100).toPrecision(12)));
    state.shouldReplace = false;
    state.justEvaluated = wasEvaluated;
    state.completedExpression = "";
  }

  function backspace() {
    if (state.shouldReplace || state.current === "Error") {
      state.current = "0";
      state.shouldReplace = false;
      state.completedExpression = "";
      return;
    }
    state.current = state.current.length <= 1 || (state.current.length === 2 && state.current.startsWith("-"))
      ? "0"
      : state.current.slice(0, -1);
    state.completedExpression = "";
  }

  function dispatch(action, value) {
    if (state.current === "Error" && action !== "clear") clear();
    switch (action) {
      case "digit": enterDigit(value); break;
      case "decimal": enterDecimal(); break;
      case "operator": chooseOperator(value); break;
      case "equals": equals(); break;
      case "clear": clear(); break;
      case "sign": toggleSign(); break;
      case "percent": percent(); break;
      case "backspace": backspace(); break;
      default: return;
    }
    render();
  }

  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    dispatch(button.dataset.action, button.dataset.value);
  });

  document.addEventListener("keydown", (event) => {
    if (/^[0-9]$/.test(event.key)) return dispatch("digit", event.key);
    if (["+", "-", "*", "/"].includes(event.key)) return dispatch("operator", event.key);
    if (event.key === ".") return dispatch("decimal");
    if (event.key === "Enter" || event.key === "=") {
      event.preventDefault();
      return dispatch("equals");
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      return dispatch("backspace");
    }
    if (event.key === "Escape" || event.key === "Delete") return dispatch("clear");
    if (event.key === "%") return dispatch("percent");
  });

  render();
})();

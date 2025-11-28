const STORAGE_KEY = "budget-with-ai-state";
const WEEKLY_TO_MONTHLY = 52 / 12;
const MONTHLY_TO_WEEKLY = 12 / 52;

const incomeForm = document.getElementById("incomeForm");
const incomeInput = document.getElementById("incomeAmount");
const savingsInput = document.getElementById("savingsTarget");
const frequencyButtons = [...document.querySelectorAll("[data-frequency]")];
const addExpenseBtn = document.getElementById("addExpense");
const loadSampleBtn = document.getElementById("loadSample");
const expenseList = document.getElementById("expenseList");

const monthlyIncomeEl = document.getElementById("monthlyIncome");
const weeklyIncomeEl = document.getElementById("weeklyIncome");
const monthlyLeftoverEl = document.getElementById("monthlyLeftover");
const monthlyLeftoverNoteEl = document.getElementById("monthlyLeftoverNote");
const weeklyLeftoverEl = document.getElementById("weeklyLeftover");
const monthlyExpensesEl = document.getElementById("monthlyExpenses");
const weeklyExpensesEl = document.getElementById("weeklyExpenses");
const needsFill = document.getElementById("needsFill");
const wantsFill = document.getElementById("wantsFill");
const savingsFill = document.getElementById("savingsFill");
const needsPercentEl = document.getElementById("needsPercent");
const wantsPercentEl = document.getElementById("wantsPercent");
const savingsPercentEl = document.getElementById("savingsPercent");
const insightsEl = document.getElementById("insights");
const incomeFrequencyLabel = document.getElementById("incomeFrequencyLabel");
const leftoverLabel = document.getElementById("leftoverLabel");
const savingsPaceLabel = document.getElementById("savingsPaceLabel");

const defaultState = {
  incomeAmount: 0,
  incomeFrequency: "monthly",
  savingsTarget: 0,
  expenses: [],
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const parsed = JSON.parse(raw);
    return { ...defaultState, ...parsed, expenses: parsed.expenses || [] };
  } catch (e) {
    console.warn("Unable to read saved data", e);
    return { ...defaultState };
  }
}

function persistState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Unable to persist state", e);
  }
}

function formatCurrency(value) {
  if (!isFinite(value)) return "$0";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function parseMoney(value) {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

function computePlan() {
  const income = state.incomeAmount || 0;
  const monthlyIncome =
    state.incomeFrequency === "monthly"
      ? income
      : income * WEEKLY_TO_MONTHLY;
  const weeklyIncome =
    state.incomeFrequency === "weekly"
      ? income
      : income * MONTHLY_TO_WEEKLY;

  const monthlyExpenses = state.expenses.reduce((sum, exp) => {
    const amount = exp.amount || 0;
    return sum + (exp.cadence === "weekly" ? amount * WEEKLY_TO_MONTHLY : amount);
  }, 0);

  const weeklyExpenses = monthlyExpenses * MONTHLY_TO_WEEKLY;
  const monthlySavingsGoal = state.savingsTarget || 0;
  const weeklySavingsGoal = monthlySavingsGoal * MONTHLY_TO_WEEKLY;

  const monthlyLeftover = monthlyIncome - monthlyExpenses - monthlySavingsGoal;
  const weeklyLeftover = weeklyIncome - weeklyExpenses - weeklySavingsGoal;

  const needsPercent = monthlyIncome
    ? Math.min(150, (monthlyExpenses / monthlyIncome) * 100)
    : 0;
  const savingsPercent = monthlyIncome
    ? Math.min(150, (monthlySavingsGoal / monthlyIncome) * 100)
    : 0;
  const wantsPercent = Math.max(
    0,
    Math.min(150, 100 - needsPercent - savingsPercent)
  );

  return {
    monthlyIncome,
    weeklyIncome,
    monthlyExpenses,
    weeklyExpenses,
    monthlySavingsGoal,
    weeklySavingsGoal,
    monthlyLeftover,
    weeklyLeftover,
    needsPercent,
    wantsPercent,
    savingsPercent,
  };
}

function renderExpenses() {
  expenseList.innerHTML = "";
  if (!state.expenses.length) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "No expenses yet. Add essentials first so the math stays honest.";
    expenseList.appendChild(empty);
    return;
  }

  state.expenses.forEach((exp) => {
    const row = document.createElement("div");
    row.className = "expense-row";
    row.dataset.id = exp.id;
    row.innerHTML = `
      <input class="col-name" type="text" value="${exp.name || ""}" placeholder="Rent, groceries..." aria-label="Expense name">
      <div class="input-wrap col-amount">
        <span class="prefix">$</span>
        <input type="number" inputmode="decimal" min="0" step="0.01" value="${exp.amount ?? 0}" aria-label="Expense amount">
      </div>
      <select class="col-cadence" aria-label="Expense cadence">
        <option value="monthly" ${exp.cadence === "monthly" ? "selected" : ""}>Monthly</option>
        <option value="weekly" ${exp.cadence === "weekly" ? "selected" : ""}>Weekly</option>
      </select>
      <button class="remove col-remove" aria-label="Remove expense">✕</button>
    `;
    expenseList.appendChild(row);
  });
}

function updateSummaries() {
  const plan = computePlan();

  monthlyIncomeEl.textContent = formatCurrency(plan.monthlyIncome);
  weeklyIncomeEl.textContent = formatCurrency(plan.weeklyIncome);
  monthlyLeftoverEl.textContent = formatCurrency(plan.monthlyLeftover);
  weeklyLeftoverEl.textContent = formatCurrency(plan.weeklyLeftover);
  monthlyExpensesEl.textContent = formatCurrency(plan.monthlyExpenses);
  weeklyExpensesEl.textContent = formatCurrency(plan.weeklyExpenses);

  needsFill.style.width = `${plan.needsPercent}%`;
  wantsFill.style.width = `${plan.wantsPercent}%`;
  savingsFill.style.width = `${plan.savingsPercent}%`;
  needsPercentEl.textContent = `${Math.round(plan.needsPercent)}%`;
  wantsPercentEl.textContent = `${Math.round(plan.wantsPercent)}%`;
  savingsPercentEl.textContent = `${Math.round(plan.savingsPercent)}%`;

  incomeFrequencyLabel.textContent =
    state.incomeFrequency === "monthly" ? "Monthly" : "Weekly";
  leftoverLabel.textContent = `${formatCurrency(
    state.incomeFrequency === "monthly"
      ? plan.monthlyLeftover
      : plan.weeklyLeftover
  )} ${state.incomeFrequency === "monthly" ? "/ month" : "/ week"}`;
  savingsPaceLabel.textContent = plan.monthlySavingsGoal
    ? `${formatCurrency(plan.monthlySavingsGoal)} / mo`
    : formatCurrency(Math.max(0, plan.monthlyLeftover * 0.2));

  monthlyLeftoverNoteEl.textContent =
    plan.monthlySavingsGoal > 0
      ? "After expenses & goal"
      : "After expenses";

  renderInsights(plan);
}

function renderInsights(plan) {
  const notes = [];
  if (plan.monthlyIncome === 0) {
    notes.push("Add your income so we can normalize everything to monthly and weekly.");
  }
  if (plan.monthlyLeftover < 0) {
    notes.push(
      `You’re short ${formatCurrency(Math.abs(plan.monthlyLeftover))} per month after expenses.` +
        " Trim a want or raise income to balance."
    );
  } else if (plan.monthlyLeftover < plan.monthlyIncome * 0.05) {
    notes.push("Leftover is thin. Consider a small buffer line item for irregular costs.");
  } else {
    notes.push("You have room to maneuver—lock in a savings target so it doesn’t drift.");
  }

  if (plan.needsPercent > 60) {
    notes.push("Expenses are taking more than the classic 50% needs guideline.");
  }
  if (plan.savingsPercent < 10 && plan.monthlyLeftover > 0) {
    notes.push("Direct a portion of leftover toward savings to hit 15–20% if possible.");
  }
  if (!state.expenses.length) {
    notes.push("Start with essentials: housing, food, transport, utilities.");
  }

  insightsEl.innerHTML = "";
  notes.slice(0, 4).forEach((note) => {
    const li = document.createElement("li");
    li.textContent = note;
    insightsEl.appendChild(li);
  });
}

function setFrequency(freq) {
  state.incomeFrequency = freq;
  frequencyButtons.forEach((btn) =>
    btn.classList.toggle("is-active", btn.dataset.frequency === freq)
  );
  persistState();
  updateSummaries();
}

function addExpense(expense = {}) {
  const newExpense = {
    id: crypto.randomUUID(),
    name: expense.name || "",
    amount: expense.amount || 0,
    cadence: expense.cadence || "monthly",
  };
  state.expenses.push(newExpense);
  persistState();
  renderExpenses();
  updateSummaries();
}

function removeExpense(id) {
  state.expenses = state.expenses.filter((exp) => exp.id !== id);
  persistState();
  renderExpenses();
  updateSummaries();
}

function loadSample() {
  state = {
    incomeAmount: 4200,
    incomeFrequency: "monthly",
    savingsTarget: 300,
    expenses: [
      { id: crypto.randomUUID(), name: "Rent", amount: 1600, cadence: "monthly" },
      { id: crypto.randomUUID(), name: "Groceries", amount: 120, cadence: "weekly" },
      { id: crypto.randomUUID(), name: "Transit", amount: 90, cadence: "monthly" },
      { id: crypto.randomUUID(), name: "Eating out", amount: 60, cadence: "weekly" },
      { id: crypto.randomUUID(), name: "Streaming", amount: 40, cadence: "monthly" },
    ],
  };
  persistState();
  syncForm();
  renderExpenses();
  updateSummaries();
}

function syncForm() {
  incomeInput.value = state.incomeAmount || "";
  savingsInput.value = state.savingsTarget || "";
  setFrequency(state.incomeFrequency);
}

// Event bindings
incomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.incomeAmount = parseMoney(incomeInput.value);
  state.savingsTarget = parseMoney(savingsInput.value);
  persistState();
  updateSummaries();
});

frequencyButtons.forEach((btn) =>
  btn.addEventListener("click", () => setFrequency(btn.dataset.frequency))
);

addExpenseBtn.addEventListener("click", () => addExpense({ name: "", amount: 0, cadence: "monthly" }));
loadSampleBtn.addEventListener("click", loadSample);

expenseList.addEventListener("input", (event) => {
  const row = event.target.closest(".expense-row");
  if (!row) return;
  const exp = state.expenses.find((e) => e.id === row.dataset.id);
  if (!exp) return;

  if (event.target.classList.contains("col-name")) {
    exp.name = event.target.value;
  } else if (event.target.closest(".col-amount")) {
    const input = event.target.tagName === "INPUT" ? event.target : row.querySelector(".col-amount input");
    exp.amount = parseMoney(input.value);
  }
  persistState();
  updateSummaries();
});

expenseList.addEventListener("change", (event) => {
  const row = event.target.closest(".expense-row");
  if (!row) return;
  const exp = state.expenses.find((e) => e.id === row.dataset.id);
  if (!exp) return;

  if (event.target.classList.contains("col-cadence")) {
    exp.cadence = event.target.value;
  }
  persistState();
  updateSummaries();
});

expenseList.addEventListener("click", (event) => {
  if (event.target.classList.contains("remove")) {
    const row = event.target.closest(".expense-row");
    if (row) removeExpense(row.dataset.id);
  }
});

// Initial render
syncForm();
renderExpenses();
updateSummaries();

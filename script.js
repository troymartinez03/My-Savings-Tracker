let savings = Number(localStorage.getItem("savings")) || 0;
let goal = Number(localStorage.getItem("goal")) || 10000;
let selectedArchiveMonth = "";
let history = JSON.parse(
    localStorage.getItem("history") || "[]"
);
let savingsChart = null;
const peso = amount => "₱" + amount.toLocaleString(
    "en-PH",
    {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }
);

// CREATE AND UPDATE SAVINGS GRAPH
function renderChart() {
    const canvas = document.getElementById("savingsChart");

    // Arrange deposits from oldest to newest
    const chronologicalHistory = [...history].reverse();

    let runningTotal = 0;

    const labels = ["Start"];
    const data = [0];

    chronologicalHistory.forEach(item => {
        runningTotal += Number(item.amount);

        labels.push(item.date);
        data.push(runningTotal);
    });

    document.getElementById("depositCount").textContent =
        history.length;

    document.getElementById("graphTotal").textContent =
        peso(savings);

    if (!savingsChart) {
        savingsChart = new Chart(canvas, {
            type: "line",

            data: {
                labels: labels,

                datasets: [{
                    label: "Total Savings",
                    data: data,

                    borderColor: "#239b62",
                    backgroundColor: "rgba(35, 155, 98, 0.12)",

                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,

                    pointRadius: 5,
                    pointHoverRadius: 8,

                    pointBackgroundColor: "#176b45",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                plugins: {
                    legend: {
                        display: true,
                        position: "top"
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return "Savings: " +
                                    peso(context.parsed.y);
                            }
                        }
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,

                        ticks: {
                            callback: function(value) {
                                return "₱" +
                                    Number(value).toLocaleString("en-PH");
                            }
                        },

                        grid: {
                            color: "#edf1ee"
                        }
                    },

                    x: {
                        grid: {
                            display: false
                        },

                        ticks: {
                            maxRotation: 45,
                            minRotation: 0
                        }
                    }
                }
            }
        });

    } else {
        savingsChart.data.labels = labels;
        savingsChart.data.datasets[0].data = data;

        savingsChart.update();
    }
}


// GET TRANSACTION DATE
function getEntryDate(item) {
    if (typeof item.timestamp === "number") {
        return new Date(item.timestamp);
    }

    // Support older savings records
    return new Date(item.date);
}

// PREVIOUS MONTH SAVINGS DASHBOARD
function renderPreviousMonth(selectedMonth = "") {
    const now = new Date();

    // Get the first day of the current month
    const currentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
    );

    // Get the first day of the previous month
    const previousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
    );

    const monthSelector = document.getElementById("monthSelector");
    const monthlyTotal = document.getElementById("monthlyTotal");
    const monthlyCount = document.getElementById("monthlyCount");
    const monthlyHistory = document.getElementById("monthlyHistory");

    // Create a YYYY-MM key for each transaction
    function getMonthKey(date) {
        return `${date.getFullYear()}-${String(
            date.getMonth() + 1
        ).padStart(2, "0")}`;
    }

    // Get all valid transaction dates
    const validEntries = history
        .map(item => ({
            ...item,
            entryDate: getEntryDate(item)
        }))
        .filter(item => !isNaN(item.entryDate.getTime()));

    // Find every month that has transactions
    const availableMonths = [...new Set(
        validEntries.map(item => getMonthKey(item.entryDate))
    )].sort().reverse();

    // Prefer the previously selected month, then the previous month,
    // then the latest month with transactions.
    const previousMonthKey = getMonthKey(previousMonth);

    if (selectedMonth && availableMonths.includes(selectedMonth)) {
        selectedArchiveMonth = selectedMonth;
    } else if (
        selectedArchiveMonth &&
        availableMonths.includes(selectedArchiveMonth)
    ) {
        // Keep the existing selection
    } else if (availableMonths.includes(previousMonthKey)) {
        selectedArchiveMonth = previousMonthKey;
    } else {
        selectedArchiveMonth = availableMonths[0] || "";
    }

    // Populate the dropdown
    monthSelector.innerHTML = "";

    if (availableMonths.length === 0) {
        monthSelector.innerHTML =
            '<option value="">No available months</option>';
    } else {
        availableMonths.forEach(monthKey => {
            const [year, month] = monthKey.split("-").map(Number);

            const monthDate = new Date(year, month - 1, 1);

            const option = document.createElement("option");
            option.value = monthKey;
            option.textContent = monthDate.toLocaleDateString(
                "en-US",
                {
                    month: "long",
                    year: "numeric"
                }
            );

            monthSelector.appendChild(option);
        });

        monthSelector.value = selectedArchiveMonth;
    }

    // Filter transactions for the selected month
    const selectedEntries = validEntries.filter(item =>
        getMonthKey(item.entryDate) === selectedArchiveMonth
    );

    // Calculate monthly savings
    const total = selectedEntries.reduce(
        (sum, item) => sum + Number(item.amount),
        0
    );

    monthlyTotal.textContent = peso(total);
    monthlyCount.textContent = selectedEntries.length;
    // Check whether the selected month's savings reached the goal
const goalStatus = document.getElementById("monthlyGoalStatus");

if (total >= goal) {
    goalStatus.textContent = "Goal reached";
    goalStatus.className = "goal-status-badge reached";
} else {
    goalStatus.textContent = "Did not meet the savings goal";
    goalStatus.className = "goal-status-badge not-reached";
}

    // Display selected month's transactions
    if (selectedEntries.length === 0) {
        monthlyHistory.innerHTML =
            '<p class="empty-history">No savings records for this month.</p>';
        return;
    }

    monthlyHistory.innerHTML = selectedEntries.map(item => `
        <div class="monthly-history-item">
            <div>
                <strong>${peso(item.amount)}</strong>
                <small>${item.entryDate.toLocaleString()}</small>
            </div>
        </div>
    `).join("");
}


function updateDisplay() {
    document.getElementById("total").textContent = peso(savings);

    document.getElementById("goalDisplay").textContent = peso(goal);

    let percent = Math.min((savings / goal) * 100, 100);

    document.getElementById("progress").style.width = percent + "%";

    document.getElementById("percentage").textContent =
        percent.toFixed(1) + "% completed";

    document.getElementById("remaining").textContent =
        peso(Math.max(goal - savings, 0)) + " remaining";

    renderHistory();
    renderChart();
    renderPreviousMonth();

    localStorage.setItem("savings", savings);
    localStorage.setItem("goal", goal);
    localStorage.setItem("history", JSON.stringify(history));
}

// TEMPORARY DEPOSIT AMOUNT
let pendingDeposit = 0;

// OPEN DEPOSIT POPUP
function openDepositModal(amount) {

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid deposit amount!");
        return;
    }

    pendingDeposit = amount;

    document.getElementById("depositAmount").textContent =
        peso(amount);

    document.getElementById("depositModal")
        .classList.add("active");
}

// CLOSE DEPOSIT POPUP
function closeDepositModal() {
    document.getElementById("depositModal")
        .classList.remove("active");

    pendingDeposit = 0;
}

// CONFIRM DEPOSIT
// CONFIRM DEPOSIT
function confirmDeposit() {

    if (pendingDeposit <= 0) return;

    let previousSavings = savings;
    let amount = pendingDeposit;

    savings += amount;

    history.unshift({
    amount: amount,
    date: new Date().toLocaleString(),
    timestamp: Date.now()
});

    pendingDeposit = 0;

    document.getElementById("depositModal")
        .classList.remove("active");

    document.getElementById("customAmount").value = "";

    updateDisplay();

    // CHECK IF SAVINGS GOAL HAS BEEN REACHED
    if (previousSavings < goal && savings >= goal) {
        showGoalModal();
    }
}

// ADD CUSTOM AMOUNT
function addCustom() {

    let input = document.getElementById("customAmount");
    let amount = Number(input.value);

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid amount!");
        return;
    }

    openDepositModal(amount);

    // Clear input only after successful confirmation
    // is handled separately below.
    input.dataset.pending = amount;
}

function setGoal() {

    let newGoal = Number(
        document.getElementById("goalInput").value
    );

    if (!Number.isFinite(newGoal) || newGoal <= 0) {
        alert("Please enter a valid savings goal!");
        return;
    }

    let previousGoal = goal;

    goal = newGoal;

    document.getElementById("goalInput").value = "";

    updateDisplay();

    if (savings >= goal && savings < previousGoal) {
        showGoalModal();
    }
}

// DISPLAY SAVINGS HISTORY
function renderHistory() {
    let list = document.getElementById("historyList");

    if (history.length === 0) {
        list.innerHTML =
            '<p class="empty-history">No savings added yet.</p>';
        return;
    }

    list.innerHTML = history.map((item, index) => `
        <div class="history-item">
            <div class="history-details">
                <div>
                    <strong>+ ${peso(item.amount)}</strong>
                </div>
                <small>${item.date}</small>
            </div>

            <button
                class="remove-btn"
                onclick="removeMoney(${index})">
                Remove
            </button>
        </div>
    `).join("");
}

// REMOVE SPECIFIC DEPOSIT
function removeMoney(index) {

    if (index < 0 || index >= history.length) {
        return;
    }

    let selected = history[index];

    let confirmRemove = confirm(
        "Are you sure you want to remove this deposit of " +
        peso(selected.amount) + "?"
    );

    if (confirmRemove) {

        // Subtract only the selected deposit
        savings = Math.max(0, savings - selected.amount);

        // Remove only the selected history entry
        history.splice(index, 1);

        // Refresh dashboard and save changes
        updateDisplay();
    }
}

// RESET ALL SAVINGS
function resetSavings() {
    if (confirm("Are you sure you want to reset all savings?")) {
        savings = 0;
        history = [];
        updateDisplay();
    }
}

// SHOW CONGRATULATIONS POPUP
function showGoalModal() {
    document.getElementById("achievedAmount").textContent =
        peso(savings);

    document.getElementById("goalModal")
        .classList.add("active");
}

// CLOSE CONGRATULATIONS POPUP
function closeGoalModal() {
    document.getElementById("goalModal")
        .classList.remove("active");
}

// Floating money background animation
const moneyBackground = document.getElementById("moneyBackground");

const moneySymbols = ["💵", "💸", "🤑", "₱", "💰", "Libre mo ko"];

for (let i = 0; i < 25; i++) {
    const money = document.createElement("div");

    money.classList.add("floating-money");

    money.textContent =
        moneySymbols[Math.floor(Math.random() * moneySymbols.length)];

    money.style.left = Math.random() * 100 + "%";
    money.style.fontSize = (20 + Math.random() * 25) + "px";
    money.style.animationDuration = (8 + Math.random() * 12) + "s";
    money.style.animationDelay = (Math.random() * 15) + "s";

    moneyBackground.appendChild(money);
}

updateDisplay();
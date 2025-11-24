// ========================================
// PENDULUM LAB - MEASURE g - ENHANCED
// Phase 2A: Unit conversion, oscillations, automatic period calculation
// ========================================

// GLOBAL VARIABLES
let dataPoints = []; // Stores all measurements
let myChart = null; // Chart.js object

// ========================================
// GET REFERENCES TO HTML ELEMENTS
// ========================================

const lengthInput = document.getElementById("lengthInput");
const lengthUnit = document.getElementById("lengthUnit");
const timeInput = document.getElementById("timeInput");
const oscillationsInput = document.getElementById("oscillationsInput");
const periodPreview = document.getElementById("periodPreview");
const periodValue = document.getElementById("periodValue");

const addDataBtn = document.getElementById("addDataBtn");
const generateGraphBtn = document.getElementById("generateGraphBtn");
const clearDataBtn = document.getElementById("clearDataBtn");

const dataTableBody = document.getElementById("dataTableBody");
const graphSection = document.getElementById("graphSection");
const summarySection = document.getElementById("summarySection");

// ========================================
// EVENT LISTENERS
// ========================================

addDataBtn.addEventListener("click", addDataPoint);
generateGraphBtn.addEventListener("click", generateGraph);
clearDataBtn.addEventListener("click", clearAllData);

// Live period preview as user types
lengthInput.addEventListener("input", updatePeriodPreview);
timeInput.addEventListener("input", updatePeriodPreview);
oscillationsInput.addEventListener("change", updatePeriodPreview);

// Enter key support
lengthInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") timeInput.focus();
});
timeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") addDataPoint();
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Convert length to meters based on selected unit
 */
function convertToMeters(length, unit) {
  if (unit === "cm") {
    return length / 100; // cm to m
  } else if (unit === "in") {
    return length * 0.0254; // inches to m (1 inch = 2.54 cm)
  }
  return length; // Already in meters
}

/**
 * Format number to specified decimal places
 */
function formatNumber(num, decimals = 2) {
  return Number(num).toFixed(decimals);
}

// ========================================
// PERIOD PREVIEW (updates as user types)
// ========================================
function updatePeriodPreview() {
  const time = parseFloat(timeInput.value);
  const oscillations = parseInt(oscillationsInput.value);

  // Only show preview if both values are valid
  if (!isNaN(time) && !isNaN(oscillations) && time > 0 && oscillations > 0) {
    const period = time / oscillations;
    periodValue.textContent = formatNumber(period, 3);
    periodPreview.style.display = "block";
  } else {
    periodPreview.style.display = "none";
  }
}

// ========================================
// ADD DATA POINT
// ========================================
function addDataPoint() {
  // Get input values
  const length = parseFloat(lengthInput.value);
  const unit = lengthUnit.value;
  const time = parseFloat(timeInput.value);
  const oscillations = parseInt(oscillationsInput.value);

  // VALIDATION
  if (isNaN(length) || length <= 0) {
    alert("Please enter a valid positive length!");
    lengthInput.focus();
    return;
  }

  if (isNaN(time) || time <= 0) {
    alert("Please enter a valid positive time!");
    timeInput.focus();
    return;
  }

  // CALCULATIONS
  const lengthInMeters = convertToMeters(length, unit);
  const period = time / oscillations;
  const periodSquared = period * period;

  // Calculate g using formula: g = 4π²L / T²
  const g = (4 * Math.PI * Math.PI * lengthInMeters) / periodSquared;

  // Store the data point
  dataPoints.push({
    lengthValue: length,
    lengthUnit: unit,
    lengthMeters: lengthInMeters,
    time: time,
    oscillations: oscillations,
    period: period,
    periodSquared: periodSquared,
    g: g,
  });

  // Update display
  updateTable();

  // Clear inputs for next entry
  lengthInput.value = "";
  timeInput.value = "";
  periodPreview.style.display = "none";

  // Focus back on length for quick data entry
  lengthInput.focus();

  // Enable graph button if we have at least 3 points (minimum for good line)
  if (dataPoints.length >= 3) {
    generateGraphBtn.disabled = false;
  }

  console.log("Data point added:", dataPoints[dataPoints.length - 1]);
}

// ========================================
// UPDATE TABLE
// ========================================
function updateTable() {
  dataTableBody.innerHTML = "";

  if (dataPoints.length === 0) {
    dataTableBody.innerHTML = `
            <tr class="empty-state">
                <td colspan="8">No data yet. Add your first measurement above! 👆</td>
            </tr>
        `;
    return;
  }

  dataPoints.forEach((point, index) => {
    const row = document.createElement("tr");

    // Format length with unit for display
    const lengthDisplay = `${formatNumber(point.lengthValue, 1)} ${
      point.lengthUnit
    }`;

    row.innerHTML = `
            <td>${index + 1}</td>
            <td>${lengthDisplay}</td>
            <td>${formatNumber(point.time, 1)}</td>
            <td>${point.oscillations}</td>
            <td>${formatNumber(point.period, 3)}</td>
            <td>${formatNumber(point.periodSquared, 3)}</td>
            <td>${formatNumber(point.g, 2)}</td>
            <td>
                <button class="btn-delete" onclick="deleteDataPoint(${index})">
                    🗑️
                </button>
            </td>
        `;

    dataTableBody.appendChild(row);
  });
}

// ========================================
// DELETE DATA POINT
// ========================================
function deleteDataPoint(index) {
  if (confirm("Delete this data point?")) {
    dataPoints.splice(index, 1);
    updateTable();

    // Disable graph button if less than 3 points
    if (dataPoints.length < 3) {
      generateGraphBtn.disabled = true;
      graphSection.style.display = "none";
      summarySection.style.display = "none";
    } else {
      // Regenerate graph if it was showing
      if (myChart !== null) {
        generateGraph();
      }
    }
  }
}

// ========================================
// CLEAR ALL DATA
// ========================================
function clearAllData() {
  if (confirm("Clear all data? This cannot be undone!")) {
    dataPoints = [];
    updateTable();

    // Hide graphs and results
    graphSection.style.display = "none";
    summarySection.style.display = "none";

    if (myChart !== null) {
      myChart.destroy();
      myChart = null;
    }

    generateGraphBtn.disabled = true;
  }
}

// ========================================
// GENERATE GRAPH AND RESULTS
// ========================================
function generateGraph() {
  // Show sections
  graphSection.style.display = "block";
  summarySection.style.display = "block";

  // Smooth scroll to graph
  graphSection.scrollIntoView({ behavior: "smooth", block: "start" });

  // Prepare data for Chart.js: T² vs L (in meters)
  const chartData = dataPoints.map((point) => ({
    x: point.lengthMeters, // Length in meters
    y: point.periodSquared, // T² in seconds²
  }));

  // Calculate linear regression (best fit line)
  const regression = calculateLinearRegression(chartData);

  // Destroy old chart if exists
  if (myChart !== null) {
    myChart.destroy();
  }

  // Create line from regression
  const minX = Math.min(...chartData.map((p) => p.x));
  const maxX = Math.max(...chartData.map((p) => p.x));
  const regressionLine = [
    { x: 0, y: regression.intercept }, // Start at origin
    { x: maxX, y: regression.slope * maxX + regression.intercept },
  ];

  // Create the chart
  const ctx = document.getElementById("dataChart").getContext("2d");
  myChart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Experimental Data",
          data: chartData,
          backgroundColor: "rgba(102, 126, 234, 0.6)",
          borderColor: "rgba(102, 126, 234, 1)",
          borderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: "Best Fit Line",
          data: regressionLine,
          type: "line",
          borderColor: "rgba(244, 67, 54, 0.8)",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: "T² vs Length (Linearized Pendulum Data)",
          font: { size: 18, weight: "bold" },
        },
        legend: { display: true },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Length L (meters)",
            font: { size: 14, weight: "bold" },
          },
          beginAtZero: true,
        },
        y: {
          title: {
            display: true,
            text: "Period Squared T² (s²)",
            font: { size: 14, weight: "bold" },
          },
          beginAtZero: true,
        },
      },
    },
  });

  // Display regression results
  displayRegressionResults(regression);

  // Calculate and display summary statistics
  displaySummaryResults(regression);

  console.log("Graph generated with", dataPoints.length, "points");
  console.log("Regression:", regression);
}

// ========================================
// LINEAR REGRESSION CALCULATION
// ========================================
function calculateLinearRegression(data) {
  const n = data.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;

  data.forEach((point) => {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  });

  // Calculate slope and intercept
  // For T² = (4π²/g)L, we expect intercept ≈ 0 and slope = 4π²/g
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate g from slope: slope = 4π²/g → g = 4π²/slope
  const gFromSlope = (4 * Math.PI * Math.PI) / slope;

  // Calculate R² (correlation coefficient)
  const meanY = sumY / n;
  let ssTotal = 0,
    ssResidual = 0;

  data.forEach((point) => {
    const yPredicted = slope * point.x + intercept;
    ssTotal += Math.pow(point.y - meanY, 2);
    ssResidual += Math.pow(point.y - yPredicted, 2);
  });

  const rSquared = 1 - ssResidual / ssTotal;

  return {
    slope: slope,
    intercept: intercept,
    gFromSlope: gFromSlope,
    rSquared: rSquared,
  };
}

// ========================================
// DISPLAY REGRESSION RESULTS
// ========================================
function displayRegressionResults(regression) {
  const resultsDiv = document.getElementById("regressionResults");

  resultsDiv.innerHTML = `
        <h4>📐 Linear Regression Analysis</h4>
        <p><strong>Equation of line:</strong> T² = ${formatNumber(
          regression.slope,
          4
        )}L + ${formatNumber(regression.intercept, 4)}</p>
        <p><strong>Slope:</strong> ${formatNumber(regression.slope, 4)} s²/m</p>
        <p><strong>Intercept:</strong> ${formatNumber(
          regression.intercept,
          4
        )} s² (should be near 0)</p>
        <p><strong>R² value:</strong> ${formatNumber(
          regression.rSquared,
          4
        )} (${
    regression.rSquared > 0.95
      ? "Excellent fit!"
      : regression.rSquared > 0.9
      ? "Good fit"
      : "Consider checking data"
  })</p>
        <p><strong>g calculated from slope:</strong> ${formatNumber(
          regression.gFromSlope,
          2
        )} m/s²</p>
    `;
}

// ========================================
// DISPLAY SUMMARY RESULTS
// ========================================
function displaySummaryResults(regression) {
  // Calculate average g from individual measurements
  const gValues = dataPoints.map((p) => p.g);
  const avgG = gValues.reduce((a, b) => a + b, 0) / gValues.length;

  // Calculate standard deviation
  const variance =
    gValues.reduce((sum, g) => sum + Math.pow(g - avgG, 2), 0) / gValues.length;
  const stdDev = Math.sqrt(variance);

  // Calculate percent error compared to 9.8 m/s²
  const acceptedG = 9.8;
  const percentError = Math.abs((avgG - acceptedG) / acceptedG) * 100;

  // Update display
  document.getElementById("avgG").textContent = formatNumber(avgG, 2);
  document.getElementById("stdDev").textContent = formatNumber(stdDev, 2);
  document.getElementById("gFromSlope").textContent = formatNumber(
    regression.gFromSlope,
    2
  );
  document.getElementById("percentError").textContent = formatNumber(
    percentError,
    1
  );

  // Quality assessment
  const qualityDiv = document.getElementById("qualityAssessment");
  let message, className;

  if (percentError < 5 && regression.rSquared > 0.95) {
    message = "🎉 Excellent Results! Your measurements are very accurate!";
    className = "excellent";
  } else if (percentError < 10 && regression.rSquared > 0.9) {
    message = "👍 Good Results! Your data shows the correct relationship.";
    className = "good";
  } else {
    message =
      "⚠️ Results could be improved. Check your measurements and make sure the amplitude stays small (<15°).";
    className = "needs-improvement";
  }

  qualityDiv.className = "quality-assessment " + className;
  qualityDiv.innerHTML = `<h3>${message}</h3>`;
}

// ========================================
// INITIALIZATION
// ========================================

console.log("Pendulum Lab - Measure g - Enhanced version loaded!");
console.log(
  "Phase 2A features: Unit conversion, oscillations input, live period preview"
);

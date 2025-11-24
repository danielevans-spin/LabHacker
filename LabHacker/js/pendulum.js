// ========================================
// PENDULUM LAB - MEASURE g - ENHANCED
// Phase 2A: Unit conversion, oscillations, automatic period calculation
// ========================================

// GLOBAL VARIABLES
let dataPoints = []; // Stores all measurements
let myChart = null; // Chart.js object
let isEditMode = false; // Track if we're in edit mode
let graphGenerated = false; // Track if graph has been generated

// ========================================
// GET REFERENCES TO HTML ELEMENTS
// ========================================

// Data entry elements
const lengthColumnInput = document.getElementById("lengthColumnInput");
const timeColumnInput = document.getElementById("timeColumnInput");
const lengthUnit = document.getElementById("lengthUnit");
const oscillationsInput = document.getElementById("oscillationsInput");

const addDataBtn = document.getElementById("addDataBtn");
const generateGraphBtn = document.getElementById("generateGraphBtn");
const clearDataBtn = document.getElementById("clearDataBtn");

const dataTableBody = document.getElementById("dataTableBody");
const graphSection = document.getElementById("graphSection");
const summarySection = document.getElementById("summarySection");
const copyableResultsSection = document.getElementById(
  "copyableResultsSection"
);
const copyableResultsTableBody = document.getElementById(
  "copyableResultsTableBody"
);
const copyResultsTableBtn = document.getElementById("copyResultsTableBtn");
const copyGraphDataBtn = document.getElementById("copyGraphDataBtn");
const downloadGraphBtn = document.getElementById("downloadGraphBtn");
const copyStatus = document.getElementById("copyStatus");
const copyGraphStatus = document.getElementById("copyGraphStatus");

// Edit mode elements
const editDataBtn = document.getElementById("editDataBtn");
const editModeControls = document.getElementById("editModeControls");
const editOscillationsInput = document.getElementById("editOscillationsInput");
const editUnitInput = document.getElementById("editUnitInput");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

// ========================================
// EVENT LISTENERS
// ========================================

addDataBtn.addEventListener("click", addDataPoints);
generateGraphBtn.addEventListener("click", generateGraph);
clearDataBtn.addEventListener("click", clearAllData);

// Edit mode event listeners
editDataBtn.addEventListener("click", enterEditMode);
saveEditBtn.addEventListener("click", saveEditChanges);
cancelEditBtn.addEventListener("click", cancelEditMode);

// Copy results event listeners
copyResultsTableBtn.addEventListener("click", copyResultsTable);
copyGraphDataBtn.addEventListener("click", copyGraphData);
downloadGraphBtn.addEventListener("click", downloadGraph);

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
// ADD DATA POINTS
// ========================================
function addDataPoints() {
  // Get pasted data from textareas
  const lengthText = lengthColumnInput.value.trim();
  const timeText = timeColumnInput.value.trim();
  const unit = lengthUnit.value;
  const oscillations = parseInt(oscillationsInput.value);

  // Validate that both fields have data
  if (!lengthText || !timeText) {
    alert("Please enter or paste data into both length and time fields!");
    return;
  }

  // Parse the columns (split by newlines, filter empty lines, trim whitespace)
  // This handles both single values and multiple values (one per line)
  const lengthValues = lengthText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseFloat(line));

  const timeValues = timeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => parseFloat(line));

  // Validate that we have the same number of values in both columns
  if (lengthValues.length !== timeValues.length) {
    alert(
      `Error: Length column has ${lengthValues.length} values, but Time column has ${timeValues.length} values. They must match!`
    );
    return;
  }

  // Validate that all values are valid numbers
  const invalidLengths = lengthValues.filter((val) => isNaN(val) || val <= 0);
  const invalidTimes = timeValues.filter((val) => isNaN(val) || val <= 0);

  if (invalidLengths.length > 0 || invalidTimes.length > 0) {
    alert(
      "Error: Some values are invalid. Please check that all values are positive numbers."
    );
    return;
  }

  if (lengthValues.length === 0) {
    alert(
      "No valid data found. Please enter or paste at least one value in each column."
    );
    return;
  }

  // Add all data points
  let addedCount = 0;

  for (let i = 0; i < lengthValues.length; i++) {
    const length = lengthValues[i];
    const time = timeValues[i];

    // Convert length to meters
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

    addedCount++;
  }

  // Update display
  updateTable();

  // Clear textareas
  lengthColumnInput.value = "";
  timeColumnInput.value = "";

  // Enable graph button if we have at least 3 points
  // But only if graph hasn't been generated yet (if it has, user needs to regenerate)
  if (dataPoints.length >= 3 && !graphGenerated) {
    generateGraphBtn.disabled = false;
  }

  // If graph was generated and new data is added, re-enable graph buttons
  if (graphGenerated) {
    generateGraphBtn.disabled = false;
    // Hide graph/results until regenerated
    graphSection.style.display = "none";
    summarySection.style.display = "none";
    copyableResultsSection.style.display = "none";
    if (myChart !== null) {
      myChart.destroy();
      myChart = null;
    }
    graphGenerated = false;
  }

  // Enable edit button if we have data (always enabled when we have data)
  if (dataPoints.length > 0) {
    editDataBtn.disabled = false;
  }

  console.log(`Data points added: ${addedCount} points`);
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

    if (isEditMode) {
      // Edit mode: show input fields for length and time
      const lengthDisplay = `${formatNumber(point.lengthValue, 1)} ${
        point.lengthUnit
      }`;

      row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="edit-input-group">
                    <input type="number" 
                           class="edit-input" 
                           data-index="${index}" 
                           data-field="length" 
                           value="${point.lengthValue}" 
                           step="0.1" 
                           min="0">
                    <span class="edit-unit">${point.lengthUnit}</span>
                </div>
            </td>
            <td>
                <div class="edit-input-group">
                    <input type="number" 
                           class="edit-input" 
                           data-index="${index}" 
                           data-field="time" 
                           value="${point.time}" 
                           step="0.1" 
                           min="0">
                    <span class="edit-unit">s</span>
                </div>
            </td>
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
    } else {
      // Normal mode: show formatted values
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
    }

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
      generateGraphBtn.disabled = true;
      graphSection.style.display = "none";
      summarySection.style.display = "none";
      graphGenerated = false;
      // Re-enable edit button if we have data
      if (dataPoints.length > 0) {
        editDataBtn.disabled = false;
      }
    } else {
      // Regenerate graph if it was showing
      if (myChart !== null) {
        generateGraph();
      }
    }

    // Update edit button state (always enabled if we have data)
    if (dataPoints.length === 0) {
      editDataBtn.disabled = true;
    } else {
      editDataBtn.disabled = false;
    }
  }
}

// ========================================
// EDIT MODE FUNCTIONS
// ========================================
function enterEditMode() {
  if (dataPoints.length === 0) return;

  isEditMode = true;
  editModeControls.style.display = "block";
  editDataBtn.disabled = true;
  editDataBtn.textContent = "✏️ Editing...";

  // Set the oscillations and unit dropdowns to the first data point's values (they should all be the same)
  if (dataPoints.length > 0) {
    editOscillationsInput.value = dataPoints[0].oscillations;
    editUnitInput.value = dataPoints[0].lengthUnit;
  }

  updateTable();
}

function cancelEditMode() {
  isEditMode = false;
  editModeControls.style.display = "none";

  // Re-enable edit button if graph hasn't been generated
  if (!graphGenerated && dataPoints.length > 0) {
    editDataBtn.disabled = false;
  }
  editDataBtn.textContent = "✏️ Edit Data";

  updateTable();
}

function saveEditChanges() {
  // Get all edited values
  const editInputs = document.querySelectorAll(
    '.edit-input[data-field="length"], .edit-input[data-field="time"]'
  );
  const newOscillations = parseInt(editOscillationsInput.value);
  const newUnit = editUnitInput.value;

  let hasChanges = false;

  // Update each data point
  editInputs.forEach((input) => {
    const index = parseInt(input.dataset.index);
    const field = input.dataset.field;
    const newValue = parseFloat(input.value);

    if (field === "length") {
      if (newValue !== dataPoints[index].lengthValue) {
        dataPoints[index].lengthValue = newValue;
        // Recalculate length in meters
        dataPoints[index].lengthMeters = convertToMeters(
          newValue,
          dataPoints[index].lengthUnit
        );
        hasChanges = true;
      }
    } else if (field === "time") {
      if (newValue !== dataPoints[index].time) {
        dataPoints[index].time = newValue;
        hasChanges = true;
      }
    }
  });

  // Update oscillations if changed
  if (newOscillations !== dataPoints[0].oscillations) {
    dataPoints.forEach((point) => {
      point.oscillations = newOscillations;
    });
    hasChanges = true;
  }

  // Update unit if changed (this requires recalculating length in meters for all points)
  if (newUnit !== dataPoints[0].lengthUnit) {
    dataPoints.forEach((point) => {
      point.lengthUnit = newUnit;
      // Recalculate length in meters with new unit
      point.lengthMeters = convertToMeters(point.lengthValue, newUnit);
    });
    hasChanges = true;
  }

  // Recalculate all derived values (period, T², g)
  dataPoints.forEach((point) => {
    point.period = point.time / point.oscillations;
    point.periodSquared = point.period * point.period;
    point.g =
      (4 * Math.PI * Math.PI * point.lengthMeters) / point.periodSquared;
  });

  // Exit edit mode
  isEditMode = false;
  editModeControls.style.display = "none";

  // Edit button stays enabled (can always edit if we have data)
  if (dataPoints.length > 0) {
    editDataBtn.disabled = false;
  }
  editDataBtn.textContent = "✏️ Edit Data";

  // Update table display
  updateTable();

  // If graph was generated and data changed, re-enable graph buttons
  if (graphGenerated && hasChanges) {
    generateGraphBtn.disabled = false;
    generateGraphBtn.disabled = false;
    // Hide graph/results until regenerated
    graphSection.style.display = "none";
    summarySection.style.display = "none";
    copyableResultsSection.style.display = "none";
    if (myChart !== null) {
      myChart.destroy();
      myChart = null;
    }
    graphGenerated = false;
  }

  console.log("Data updated", hasChanges ? "(changes detected)" : "");
}

// ========================================
// CLEAR ALL DATA
// ========================================
function clearAllData() {
  if (confirm("Clear all data? This cannot be undone!")) {
    dataPoints = [];
    isEditMode = false;
    graphGenerated = false;
    updateTable();

    // Hide graphs and results
    graphSection.style.display = "none";
    summarySection.style.display = "none";
    copyableResultsSection.style.display = "none";
    editModeControls.style.display = "none";

    if (myChart !== null) {
      myChart.destroy();
      myChart = null;
    }

    generateGraphBtn.disabled = true;
    editDataBtn.disabled = true;
    editDataBtn.textContent = "✏️ Edit Data";

    // Clear bulk entry fields
    lengthColumnInput.value = "";
    timeColumnInput.value = "";
  }
}

// ========================================
// GENERATE GRAPH AND RESULTS
// ========================================
function generateGraph() {
  // Mark that graph has been generated
  graphGenerated = true;

  // Keep edit button enabled (user can still edit data)
  // Disable generate graph buttons (grayed out until data is edited or added)
  generateGraphBtn.disabled = true;
  generateGraphBtn.disabled = true;

  // Show sections
  graphSection.style.display = "block";
  summarySection.style.display = "block";
  copyableResultsSection.style.display = "block";

  // Populate copyable results table
  updateCopyableResultsTable();

  // Smooth scroll to summary (results appear first)
  summarySection.scrollIntoView({ behavior: "smooth", block: "start" });

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

  // Format equation for legend
  const equation = `T² = ${formatNumber(regression.slope, 4)}L + ${formatNumber(
    regression.intercept,
    4
  )}`;

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
          label: `Best Fit Line (${equation})`,
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
      backgroundColor: "white",
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
// COPYABLE RESULTS TABLE
// ========================================
function updateCopyableResultsTable() {
  copyableResultsTableBody.innerHTML = "";

  dataPoints.forEach((point) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatNumber(point.lengthMeters, 3)}</td>
      <td>${formatNumber(point.period, 3)}</td>
      <td>${formatNumber(point.periodSquared, 4)}</td>
      <td>${formatNumber(point.g, 2)}</td>
    `;
    copyableResultsTableBody.appendChild(row);
  });
}

// ========================================
// COPY RESULTS FUNCTIONALITY
// ========================================
function copyResultsTable() {
  let textToCopy = "Pendulum Lab Results\n";
  textToCopy += "=".repeat(50) + "\n\n";
  textToCopy += "Length (m)\tPeriod T (s)\tT² (s²)\tg (m/s²)\n";
  textToCopy += "-".repeat(50) + "\n";

  dataPoints.forEach((point) => {
    textToCopy += `${formatNumber(point.lengthMeters, 3)}\t${formatNumber(
      point.period,
      3
    )}\t${formatNumber(point.periodSquared, 4)}\t${formatNumber(point.g, 2)}\n`;
  });

  // Calculate mean g value
  const gValues = dataPoints.map((p) => p.g);
  const avgG = gValues.reduce((a, b) => a + b, 0) / gValues.length;

  textToCopy += "\n" + "=".repeat(50) + "\n";
  textToCopy += `Mean g value: ${formatNumber(avgG, 2)} m/s²\n`;

  // Copy to clipboard
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      showCopyStatus(
        copyStatus,
        "✓ Successfully copied results table to clipboard!",
        "success"
      );
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showCopyStatus(
        copyStatus,
        "Failed to copy to clipboard. Please try again.",
        "error"
      );
    });
}

function copyGraphData() {
  // Get regression data
  const chartData = dataPoints.map((point) => ({
    x: point.lengthMeters,
    y: point.periodSquared,
  }));
  const regression = calculateLinearRegression(chartData);

  let textToCopy = "T² vs Length Data (for Excel)\n";
  textToCopy += "=".repeat(50) + "\n\n";
  textToCopy += "Length (m)\tT² (s²)\n";
  textToCopy += "-".repeat(50) + "\n";

  // Copy data points
  dataPoints.forEach((point) => {
    textToCopy += `${formatNumber(point.lengthMeters, 6)}\t${formatNumber(
      point.periodSquared,
      6
    )}\n`;
  });

  // Add linear regression summary
  textToCopy += "\n" + "=".repeat(50) + "\n";
  textToCopy += "Linear Regression Analysis\n";
  textToCopy += "-".repeat(50) + "\n";
  textToCopy += `Equation: T² = ${formatNumber(
    regression.slope,
    4
  )}L + ${formatNumber(regression.intercept, 4)}\n`;
  textToCopy += `Slope: ${formatNumber(regression.slope, 4)} s²/m\n`;
  textToCopy += `Intercept: ${formatNumber(regression.intercept, 4)} s²\n`;
  textToCopy += `R² Value: ${formatNumber(regression.rSquared, 4)}\n`;
  textToCopy += `g from slope: ${formatNumber(
    regression.gFromSlope,
    2
  )} m/s²\n`;

  // Copy to clipboard
  navigator.clipboard
    .writeText(textToCopy)
    .then(() => {
      showCopyStatus(
        copyGraphStatus,
        "✓ Successfully copied graph data to clipboard!",
        "success"
      );
    })
    .catch((err) => {
      console.error("Failed to copy:", err);
      showCopyStatus(
        copyGraphStatus,
        "Failed to copy to clipboard. Please try again.",
        "error"
      );
    });
}

function showCopyStatus(element, message, type) {
  element.textContent = message;
  element.className = `copy-status ${type}`;
  element.style.display = "block";

  // Hide after 3 seconds
  setTimeout(() => {
    element.style.display = "none";
  }, 3000);
}

// ========================================
// DOWNLOAD GRAPH AS IMAGE
// ========================================
function downloadGraph() {
  if (myChart === null) {
    showCopyStatus(copyGraphStatus, "No graph available to download.", "error");
    return;
  }

  // Get the canvas element
  const canvas = document.getElementById("dataChart");

  // Create a new canvas with white background
  const downloadCanvas = document.createElement("canvas");
  downloadCanvas.width = canvas.width;
  downloadCanvas.height = canvas.height;
  const ctx = downloadCanvas.getContext("2d");

  // Fill with white background
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, downloadCanvas.width, downloadCanvas.height);

  // Draw the original chart on top
  ctx.drawImage(canvas, 0, 0);

  // Convert canvas to blob
  downloadCanvas.toBlob((blob) => {
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    link.download = `pendulum-graph-${timestamp}.png`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL
    setTimeout(() => URL.revokeObjectURL(url), 100);

    showCopyStatus(
      copyGraphStatus,
      "✓ Graph downloaded successfully!",
      "success"
    );
  }, "image/png");
}

// ========================================
// INITIALIZATION
// ========================================

console.log("Pendulum Lab - Measure g - Enhanced version loaded!");
console.log(
  "Phase 2A features: Unit conversion, oscillations input, live period preview, bulk paste, copyable results"
);

/* SPheRe Dashboard - 24h Axis with Real Timestamps in Tooltip */
const SHEET_ID = '1sApufLQS6G6nFu-P6q7jfjQIG1RFcgkopQUTS2rvQEg';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const REFRESH_INTERVAL = 300000; // 5 minutes
let currentChart = null;
let currentData = [];
let isLoading = false;
let currentMetric = 'tempBME';

// Metric configuration
const METRICS = [
    { id: 'tempBME', label: 'Temperature', unit: '°C', decimals: 1, cardId: 'val-temp', cardElementId: 'card-temp' },
    { id: 'humBME', label: 'Humidity', unit: '%', decimals: 1, cardId: 'val-humidity', cardElementId: 'card-humidity' },
    { id: 'pressBME', label: 'Pressure', unit: 'hPa', decimals: 2, cardId: 'val-pressure', cardElementId: 'card-pressure' },
    { id: 'co2SGP', label: 'CO₂', unit: 'ppm', decimals: 0, cardId: 'val-co2', cardElementId: 'card-co2' },
    { id: 'tlsLUX', label: 'Light', unit: 'lux', decimals: 0, cardId: 'val-light', cardElementId: 'card-light' }
];

// Sample data fallback (same structure)
const SAMPLE_CSV = `Data/Hora,tempBME,humBME,pressBME,tlsLUX,co2SGP\n15/05/2026 18:46:41,28.89,91.19,1014.83,4.00,400.00\n15/05/2026 19:03:36,28.10,88.83,1014.95,0.00,405.00\n15/05/2026 19:24:35,28.06,89.33,1015.09,0.00,410.00`;

// ---------- Helper functions ----------
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse headers (robust to quotes)
    let headers = [];
    let inQuote = false, current = '';
    for (let char of lines[0]) {
        if (char === '"') inQuote = !inQuote;
        else if (char === ',' && !inQuote) { headers.push(current.trim()); current = ''; }
        else current += char;
    }
    headers.push(current.trim());
    const cleanHeaders = headers.map(h => h.replace(/^"|"$/g, ''));

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        let values = [];
        inQuote = false; current = '';
        for (let char of line) {
            if (char === '"') inQuote = !inQuote;
            else if (char === ',' && !inQuote) { values.push(current.trim()); current = ''; }
            else current += char;
        }
        values.push(current.trim());
        const cleanValues = values.map(v => v.replace(/^"|"$/g, ''));
        const row = {};
        cleanHeaders.forEach((h, idx) => {
            let v = cleanValues[idx] || '';
            if (!isNaN(parseFloat(v)) && isFinite(v) && v !== '') v = parseFloat(v);
            row[h] = v;
        });
        if (row['Data/Hora'] && row['Data/Hora'] !== '') data.push(row);
    }
    return data;
}

async function fetchSheetData() {
    if (isLoading) return null;
    isLoading = true;
    showLoading(true);
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const csvText = await response.text();
        const data = parseCSV(csvText);
        if (data.length === 0) throw new Error('No data rows');
        hideWarning();
        console.log(`✅ Fetched ${data.length} rows`);
        return data;
    } catch (err) {
        console.error('Fetch error:', err);
        showWarning('Could not fetch live data. Using sample data. Make sure your sheet is published (File → Share → Publish to web).');
        return parseCSV(SAMPLE_CSV);
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

function showLoading(show) {
    const el = document.getElementById('loading-indicator');
    if (el) el.style.display = show ? 'flex' : 'none';
}

function showWarning(msg) {
    const warning = document.getElementById('data-warning');
    const msgSpan = document.getElementById('warning-message');
    if (warning) warning.style.display = 'flex';
    if (msgSpan) msgSpan.textContent = msg;
}

function hideWarning() {
    const warning = document.getElementById('data-warning');
    if (warning) warning.style.display = 'none';
}

// Extract hour (0-23) from timestamp string "DD/MM/YYYY HH:MM:SS" or Date object
function getHourFromTimestamp(ts) {
    if (!ts) return undefined;
    if (typeof ts === 'string') {
        const match = ts.match(/(\d{1,2}):/);
        if (match) return parseInt(match[1], 10);
    }
    if (ts instanceof Date) return ts.getHours();
    return undefined;
}

// Prepare data for 24h fixed axis with forward fill and store original timestamps
function prepareChartData(data, metricKey) {
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    let hourValues = new Array(24).fill(null);
    let hourTimestamps = new Array(24).fill(null); // stores the original timestamp string

    // First pass: fill actual readings into their hour bucket (latest overwrites)
    data.forEach(row => {
        const hour = getHourFromTimestamp(row['Data/Hora']);
        if (hour === undefined) return;
        let val = row[metricKey];
        if (val === undefined || val === null || val === '') return;
        val = parseFloat(val);
        if (isNaN(val)) return;
        hourValues[hour] = val;
        hourTimestamps[hour] = row['Data/Hora']; // store the original full timestamp
    });

    // Forward fill: propagate last known value and its timestamp to missing hours
    let lastVal = null, lastTs = null;
    for (let i = 0; i < 24; i++) {
        if (hourValues[i] !== null) {
            lastVal = hourValues[i];
            lastTs = hourTimestamps[i];
        } else if (lastVal !== null) {
            hourValues[i] = lastVal;
            hourTimestamps[i] = lastTs;
        }
    }

    return { labels: hourLabels, values: hourValues, timestamps: hourTimestamps };
}

// Update metric cards
function updateCards(data) {
    if (!data || data.length === 0) return;
    const latest = data[data.length - 1];
    METRICS.forEach(metric => {
        const el = document.getElementById(metric.cardId);
        if (el) {
            let val = latest[metric.id];
            if (val !== undefined && val !== null && val !== '') {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    el.textContent = num.toFixed(metric.decimals);
                    // pulse animation
                    const card = document.getElementById(metric.cardElementId);
                    if (card) {
                        card.classList.remove('pulse');
                        void card.offsetWidth;
                        card.classList.add('pulse');
                    }
                }
            }
        }
    });
    const updateEl = document.getElementById('update-time');
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString();
}

// Update chart with current metric
function updateChart(data) {
    const canvas = document.getElementById('sensor-chart');
    if (!canvas) return;
    const metric = METRICS.find(m => m.id === currentMetric);
    if (!metric) return;

    const { labels, values, timestamps } = prepareChartData(data, currentMetric);
    if (currentChart) currentChart.destroy();

    // Update chart title
    const titleEl = document.getElementById('chart-title');
    if (titleEl) {
        titleEl.innerHTML = `<i class="fas fa-chart-line"></i> ${metric.label} (${metric.unit}) (Last 24 Hours)`;
    }

    currentChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${metric.label} (${metric.unit})`,
                data: values,
                borderColor: '#66BB6A',
                backgroundColor: 'rgba(102, 187, 106, 0.1)',
                borderWidth: 2.5,
                pointRadius: 3.5,
                pointBackgroundColor: '#2E7D32',
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointHoverRadius: 6,
                fill: true,
                tension: 0.3,
                rawTimestamps: timestamps  // custom property for tooltip
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.raw;
                            let timestamp = context.dataset.rawTimestamps[context.dataIndex];
                            if (timestamp) {
                                return `${timestamp}: ${value} ${metric.unit}`;
                            } else {
                                return `${context.label}: ${value} ${metric.unit}`;
                            }
                        }
                    }
                },
                legend: { position: 'bottom', labels: { usePointStyle: true } }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Hour of Day', color: '#6B8E6B' },
                    ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 12 }
                },
                y: {
                    title: { display: true, text: `${metric.label} (${metric.unit})`, color: '#66BB6A' },
                    beginAtZero: false
                }
            }
        }
    });
}

// Update recent records table (last 10 raw rows)
function updateTable(data) {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;
    const recent = data.slice(-10).reverse();
    if (!recent.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">No data</td></tr>';
        return;
    }
    let html = '';
    recent.forEach(row => {
        const ts = row['Data/Hora'] || '-';
        const temp = row.tempBME !== undefined ? row.tempBME : '-';
        const hum = row.humBME !== undefined ? row.humBME : '-';
        const co2 = row.co2SGP !== undefined ? row.co2SGP : '-';
        html += `<tr><td>${escapeHtml(ts)}</td><td>${temp}</td><td>${hum}</td><td>${co2}</td></tr>`;
    });
    tbody.innerHTML = html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Highlight active metric card
function setActiveMetricCard(metricId) {
    METRICS.forEach(m => {
        const card = document.getElementById(m.cardElementId);
        if (card) {
            if (m.id === metricId) card.classList.add('active');
            else card.classList.remove('active');
        }
    });
}

// Main update cycle
async function fetchAndUpdate() {
    showLoading(true);
    const data = await fetchSheetData();
    if (data && data.length) {
        currentData = data;
        updateCards(data);
        updateChart(data);
        updateTable(data);
    }
    showLoading(false);
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Card click handlers
    METRICS.forEach(metric => {
        const card = document.getElementById(metric.cardElementId);
        if (card) {
            card.addEventListener('click', () => {
                currentMetric = metric.id;
                setActiveMetricCard(currentMetric);
                if (currentData.length) {
                    updateChart(currentData);
                }
            });
        }
    });

    // Set default active card (temperature)
    setActiveMetricCard('tempBME');

    // Load data
    fetchAndUpdate();
    setInterval(fetchAndUpdate, REFRESH_INTERVAL);

    // Retry button
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            hideWarning();
            fetchAndUpdate();
        });
    }
});
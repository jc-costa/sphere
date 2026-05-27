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
function parseTimestamp(ts) {
    if (!ts) return null;
    if (typeof ts === 'string') {
        var parts = ts.split(/[\s\/:]/);
        if (parts.length >= 6) {
            var d = new Date(parseInt(parts[2],10), parseInt(parts[1],10)-1, parseInt(parts[0],10),
                             parseInt(parts[3],10), parseInt(parts[4],10), parseInt(parts[5],10));
            return isNaN(d.getTime()) ? null : d;
        }
    }
    if (ts instanceof Date) return ts;
    return null;
}

// Prepare data for 24h fixed axis with forward fill and store original timestamps
function prepareChartData(data, metricKey) {
    var points = [];
    data.forEach(function(row) {
        var date = parseTimestamp(row['Data/Hora']);
        if (!date) return;
        var val = row[metricKey];
        if (val === undefined || val === null || val === '') return;
        val = parseFloat(val);
        if (isNaN(val)) return;
        points.push({ x: date, y: val, ts: row['Data/Hora'] });
    });
    points.sort(function(a, b) { return a.x - b.x; });
    return points;
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
    var canvas = document.getElementById('sensor-chart');
    if (!canvas) return;
    var metric = METRICS.find(function(m){return m.id===currentMetric});
    if (!metric) return;

    var pts = prepareChartData(data, currentMetric);
    if (currentChart) { currentChart.destroy(); currentChart = null; }

    // Filter to last 6 hours for default view
    var allPts = pts;
    var maxX = null;
    if (pts.length > 0) {
        maxX = pts[pts.length - 1].x.getTime();
        var cutoff = maxX - 6 * 3600000;
        pts = pts.filter(function(p) { return p.x.getTime() >= cutoff; });
    }

    // Set canvas width based on ALL data so scrolling reaches older points
    if (allPts.length > 1) {
        var fullSpan = allPts[allPts.length - 1].x.getTime() - allPts[0].x.getTime();
        var hrs = fullSpan / 3600000;
        var w = Math.max(800, Math.min(hrs * 90, 3000));
        canvas.style.width = w + 'px';
        canvas.style.maxWidth = w + 'px';
    } else {
        canvas.style.width = '800px';
        canvas.style.maxWidth = '800px';
    }

    var titleEl = document.getElementById('chart-title');
    if (titleEl) {
        titleEl.innerHTML = '<i class="fas fa-chart-line"></i> '+metric.label+' ('+metric.unit+')';
    }

    var isMobile = window.innerWidth < 768;

    currentChart = new Chart(canvas, {
        type: 'line',
        data: {
            datasets: [{
                label: metric.label+' ('+metric.unit+')',
                data: pts,
                borderColor: '#66BB6A',
                backgroundColor: 'rgba(102,187,106,0.15)',
                borderWidth: isMobile ? 2 : 3,
                pointRadius: isMobile ? 1.5 : 2.5,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#66BB6A',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#66BB6A',
                pointHoverBorderColor: '#fff',
                fill: true,
                tension: 0.4,
                parsing: { xAxisKey: 'x', yAxisKey: 'y' }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    backgroundColor: 'rgba(46,125,50,0.95)',
                    titleColor: '#fff',
                    bodyColor: '#f5f9f5',
                    cornerRadius: 8,
                    titleFont: { family: 'Inter', size: isMobile ? 13 : 12 },
                    bodyFont: { family: 'Inter', size: isMobile ? 13 : 12 },
                    padding: 10,
                    callbacks: {
                        title: function(items) {
                            var pt = items[0].raw;
                            return pt.ts || '';
                        },
                        label: function(context) {
                            return '  '+context.parsed.y.toFixed(metric.decimals)+' '+metric.unit;
                        }
                    }
                },
                legend: {
                    position: 'top',
                    align: 'center',
                    labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 }, padding: 14 }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: { hour: 'HH:mm' },
                        tooltipFormat: 'dd/MM/yyyy HH:mm:ss'
                    },
                    grid: { color: 'rgba(0,0,0,0.05)', drawBorder: true },
                    title: { display: true, text: 'Time', color: '#6B8E6B', font: { size: 12 } },
                    ticks: { font: { size: 10 }, maxRotation: 30, autoSkip: true, maxTicksLimit: 12, stepSize: 2 }
                },
                y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    title: { display: true, text: metric.label+' ('+metric.unit+')', color: '#6B8E6B', font: { size: 12 } },
                    beginAtZero: false,
                    ticks: { font: { size: 10 }, padding: 8 }
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
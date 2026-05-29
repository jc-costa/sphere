/* SPheRe Dashboard - 24h Axis with Real Timestamps in Tooltip */
const SHEET_ID = '1sApufLQS6G6nFu-P6q7jfjQIG1RFcgkopQUTS2rvQEg';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
const REFRESH_INTERVAL = 300000; // 5 minutes
let currentChart = null;
let currentData = [];
let isLoading = false;
let currentMetric = 'tempBME';
let currentRange = '24h';

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
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const csvText = await response.text();
        const data = parseCSV(csvText);
        if (data.length === 0) throw new Error('No data rows');
        hideWarning();
        console.log('Fetched ' + data.length + ' rows');
        return data;
    } catch (err) {
        console.error('Fetch error:', err.message);
        showWarning('Could not fetch live data. Using sample data. Make sure your sheet is published (File > Share > Publish to web).');
        var fallback = parseCSV(SAMPLE_CSV);
        if (fallback.length) return fallback;
        return null;
    } finally {
        isLoading = false;
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
    if (updateEl) updateEl.textContent = new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

// Update chart with current metric
function updateChart(data) {
    var canvas = document.getElementById('sensor-chart');
    if (!canvas) return;
    var metric = METRICS.find(function(m){return m.id===currentMetric});
    if (!metric) return;
    var pts=[];
    data.forEach(function(row){
     var ts=row['Data/Hora'];if(!ts)return;
     var parts=ts.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
     if(!parts)return;
     var date=new Date(parts[3],parts[2]-1,parts[1],parts[4],parts[5],parts[6]);
     if(!date||isNaN(date))return;
     var val=parseFloat(row[metric.id]);
     if(isNaN(val))return;
     pts.push({x:date,y:val})
    });
    pts.sort(function(a,b){return a.x-b.x});
    if(pts.length===0)return;
    var maxX=pts[pts.length-1].x;
    var minX,timeUnit='hour',dispFmt='HH:mm',titleSfx='';
    switch(currentRange){
     case'24h':minX=new Date(maxX.getTime()-86400000);titleSfx='Last 24 Hours';break;
     case'7d':minX=new Date(maxX.getTime()-7*86400000);titleSfx='Last 7 Days';break;
     case'15d':minX=new Date(maxX.getTime()-15*86400000);titleSfx='Last 15 Days';timeUnit='day';dispFmt='dd/MM';break;
     case'30d':minX=new Date(maxX.getTime()-30*86400000);titleSfx='Last 30 Days';timeUnit='day';dispFmt='dd/MM';break;
     case'all':minX=pts[0].x;titleSfx='All Data';timeUnit='day';dispFmt='dd/MM';break;
     default:minX=new Date(maxX.getTime()-86400000);titleSfx='Last 24 Hours'
    }
    var filt=pts.filter(function(p){return p.x>=minX});
    var ins=false;
    if(currentRange==='15d'&&filt.length<3)ins=true;
    if(currentRange==='30d'&&filt.length<5)ins=true;
    if(currentRange==='all'&&filt.length<10)ins=true;
    if(ins){
     if(currentChart){currentChart.destroy();currentChart=null}
     var ctx=canvas.getContext('2d');
     ctx.clearRect(0,0,canvas.width,canvas.height);
     ctx.font='16px "Inter",sans-serif';ctx.fillStyle='#6B8E6B';ctx.textAlign='center';
     ctx.fillText('Unfortunately, there is not enough data for this period of time!',canvas.width/2,canvas.height/2);
     var te=document.getElementById('chart-title');
     if(te)te.innerHTML='<i class="fas fa-chart-line"></i> '+metric.label+' ('+metric.unit+') - '+titleSfx;
     return
    }
    var hrs=(maxX-minX)/3600000;
    var ppd=currentRange==='24h'||currentRange==='7d'?60:30;
    var cw=Math.max(800,hrs*ppd);
    canvas.style.width=cw+'px';canvas.style.height='400px';
    if(currentChart){currentChart.destroy();currentChart=null}
    var te=document.getElementById('chart-title');
    if(te)te.innerHTML='<i class="fas fa-chart-line"></i> '+metric.label+' ('+metric.unit+') - '+titleSfx;
    currentChart=new Chart(canvas.getContext('2d'),{
     type:'line',data:{datasets:[{
      label:metric.label+' ('+metric.unit+')',data:filt,
      borderColor:'#66BB6A',backgroundColor:'rgba(102,187,106,0.2)',
      borderWidth:2.5,pointRadius:2.5,
      pointBackgroundColor:'#fff',pointBorderColor:'#66BB6A',pointBorderWidth:2,
      pointHoverRadius:6,pointHoverBackgroundColor:'#66BB6A',
      fill:true,tension:0.3
     }]},
     options:{
      responsive:true,maintainAspectRatio:false,
      scales:{
       x:{type:'time',min:minX,max:maxX,time:{unit:timeUnit,displayFormats:{hour:dispFmt,day:dispFmt},tooltipFormat:'dd/MM/yyyy HH:mm:ss'},
        ticks:{stepSize:1,autoSkip:true,maxTicksLimit:12},
        title:{display:true,text:'Time ('+titleSfx+')',color:'#6B8E6B'}
       },
       y:{title:{display:true,text:metric.label+' ('+metric.unit+')',color:'#66BB6A'},beginAtZero:false}
      },
      plugins:{
       tooltip:{callbacks:{label:function(ctx){
        var pt=ctx.raw;return new Date(pt.x).toLocaleString('pt-BR')+': '+pt.y+' '+metric.unit
       }}},
       legend:{position:'top',labels:{usePointStyle:true}}
      }
     }
    });
    var wr=document.querySelector('.chart-scroll-wrap');
    if(wr)wr.scrollLeft=wr.scrollWidth;
}
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
    console.log('fetchAndUpdate started');
    showLoading(true);
    try {
        const data = await fetchSheetData();
        console.log('Data fetched, rows:', data ? data.length : 0);
        if (data && data.length) {
            currentData = data;
            console.log('Calling updateCards...');
            updateCards(data);
            console.log('Calling updateChart...');
            updateChart(data);
            console.log('Calling updateTable...');
            updateTable(data);
            console.log('All updates completed');
        } else {
            console.warn('No data received');
            showWarning('No data received from sheet.');
        }
    } catch (err) {
        console.error('Error in fetchAndUpdate:', err);
        showWarning('Error loading data. Check console for details.');
    } finally {
        showLoading(false);
    }
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

    // Range button handlers
    document.querySelectorAll('.range-btn').forEach(function(btn){
     btn.addEventListener('click',function(){
      document.querySelectorAll('.range-btn').forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
      currentRange=btn.getAttribute('data-range');
      if(currentData.length){updateChart(currentData)}
     });
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
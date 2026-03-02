/* ═══════════════════════════════════════════
   RCT — Rejestr Cen Transakcyjnych v3.0
   ═══════════════════════════════════════════ */

const MONTHS_PL = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
const fmt = (n) => n.toLocaleString("pl-PL");
const fmtPLN = (n) => fmt(n) + " PLN";

function parseDate(s) {
  if (!s) return null;
  const p = s.split('.');
  return p.length === 3 ? new Date(+p[2], +p[1] - 1, +p[0]) : null;
}
function quarterLabel(d) {
  return d ? `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}` : '';
}

// --- DATA ---
let cache = {};

async function fetchData(city) {
  if (cache[city]) return cache[city];
  const r = await fetch(`/api/rcn?city=${encodeURIComponent(city)}`);
  if (!r.ok) throw new Error(`Błąd: ${r.status}`);
  const d = await r.json();
  // Wzbogać o dzielnice
  if (d.transactions) {
    d.transactions = enrichWithDistricts(d.transactions);
  }
  cache[city] = d;
  return d;
}

// --- LIVE BADGE ---
async function checkFreshness() {
  try {
    const r = await fetch('/api/market-data');
    const d = await r.json();
    const badge = document.getElementById('liveBadge');
    const dot = badge.querySelector('.live-dot');
    const text = document.getElementById('liveText');

    if (d.last_update) {
      const updated = new Date(d.last_update);
      const age = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
      const dateStr = updated.toLocaleDateString('pl-PL');

      if (age > 14) {
        dot.classList.add('stale');
        text.textContent = `Dane z ${dateStr}`;
      } else {
        text.textContent = `Aktualne: ${dateStr}`;
      }
    }
  } catch (e) {
    // Silent
  }
}

// --- FILTERING ---
function filterTransactions(txs, query) {
  if (!query) return txs;
  const lq = query.toLowerCase();
  return txs.filter(t =>
    (t.address || '').toLowerCase().includes(lq) ||
    (t.district || '').toLowerCase().includes(lq) ||
    (t.city || '').toLowerCase().includes(lq)
  );
}

// --- STATS ---
function computeStats(txs) {
  const prices = txs.map(t => t.priceM2).filter(p => p > 0).sort((a, b) => a - b);
  if (!prices.length) return null;
  const n = prices.length;
  const median = n % 2 === 1 ? prices[n >> 1] : ((prices[(n >> 1) - 1] + prices[n >> 1]) >> 1);
  return { count: n, avg: Math.round(prices.reduce((a, b) => a + b, 0) / n), median, min: prices[0], max: prices[n - 1] };
}

function computeQuarterly(txs) {
  const q = {};
  txs.forEach(t => {
    const d = parseDate(t.date);
    if (!d) return;
    const k = quarterLabel(d);
    (q[k] = q[k] || []).push(t.priceM2);
  });
  return Object.keys(q)
    .sort((a, b) => {
      const [qa, ya] = [+a[1], +a.split(' ')[1]];
      const [qb, yb] = [+b[1], +b.split(' ')[1]];
      return (ya * 10 + qa) - (yb * 10 + qb);
    })
    .map(k => ({ label: k, avg: Math.round(q[k].reduce((a, b) => a + b, 0) / q[k].length), count: q[k].length }));
}

// --- CHARTS ---
let trendChart = null;
let districtChart = null;

function renderTrendChart(data) {
  const ctx = document.getElementById("trend-chart");
  if (!ctx) return;
  if (trendChart) trendChart.destroy();

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(99,102,241,0.15)');
  gradient.addColorStop(1, 'rgba(99,102,241,0)');

  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(q => q.label),
      datasets: [{
        label: "Średnia PLN/m²",
        data: data.map(q => q.avg),
        borderColor: "#818cf8",
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: "#818cf8",
        pointBorderColor: "#0c0e14",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(19,22,31,0.95)",
          titleFont: { family: "'Inter'", size: 12, weight: '500' },
          bodyFont: { family: "'Inter'", size: 14, weight: '700' },
          padding: 14,
          cornerRadius: 10,
          borderColor: "rgba(99,102,241,0.2)",
          borderWidth: 1,
          displayColors: false,
          callbacks: { label: (c) => fmt(c.parsed.y) + " PLN/m²" },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
          ticks: { color: "rgba(255,255,255,0.3)", font: { family: "'Inter'", size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
          ticks: {
            color: "rgba(255,255,255,0.3)",
            font: { family: "'Inter'", size: 11 },
            callback: v => fmt(v),
          },
        },
      },
    },
  });
}

function renderDistrictChart(districtStats) {
  const ctx = document.getElementById("district-chart");
  if (!ctx) return;
  if (districtChart) districtChart.destroy();

  const top = districtStats.slice(0, 12); // Max 12 dzielnic
  const colors = top.map((_, i) => {
    const hue = 240 + (i * 15); // Odcienie fioletu/indigo
    return `hsla(${hue % 360}, 70%, 65%, 0.8)`;
  });

  districtChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: top.map(d => d.name),
      datasets: [{
        label: "Średnia PLN/m²",
        data: top.map(d => d.avg),
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.8', '1')),
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(19,22,31,0.95)",
          titleFont: { family: "'Inter'", size: 12, weight: '500' },
          bodyFont: { family: "'Inter'", size: 14, weight: '700' },
          padding: 14,
          cornerRadius: 10,
          borderColor: "rgba(99,102,241,0.2)",
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: (c) => fmt(c.parsed.x) + " PLN/m²",
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
          ticks: {
            color: "rgba(255,255,255,0.3)",
            font: { family: "'Inter'", size: 11 },
            callback: v => fmt(v),
          },
        },
        y: {
          grid: { display: false },
          ticks: {
            color: "rgba(255,255,255,0.5)",
            font: { family: "'Inter'", size: 12, weight: '500' },
          },
        },
      },
    },
  });
}

// --- ASSESSMENT ---
function assess(userPM2, stats) {
  if (!stats) return { diff: 0, verdict: "BRAK DANYCH", detail: "Za mało transakcji.", color: "#64748b" };
  const diff = +((userPM2 - stats.median) / stats.median * 100).toFixed(1);
  let verdict, detail, color;
  if (diff < -8) {
    verdict = "Poniżej rynku"; detail = `Cena ${Math.abs(diff)}% poniżej mediany. Atrakcyjna oferta — szybka sprzedaż prawdopodobna.`; color = "#22c55e";
  } else if (diff < -3) {
    verdict = "Lekko poniżej"; detail = `Cena ${Math.abs(diff)}% poniżej mediany. Konkurencyjna oferta.`; color = "#4ade80";
  } else if (diff <= 3) {
    verdict = "Cena rynkowa"; detail = `Cena zgodna z medianą (${diff > 0 ? "+" : ""}${diff}%). Solidna pozycja negocjacyjna.`; color = "#818cf8";
  } else if (diff <= 8) {
    verdict = "Lekko powyżej"; detail = `Cena +${diff}% powyżej mediany. Uzasadnione przy wyższym standardzie.`; color = "#f59e0b";
  } else {
    verdict = "Powyżej rynku"; detail = `Cena +${diff}% powyżej mediany. Sprzedaż może trwać dłużej.`; color = "#ef4444";
  }
  return { diff, verdict, detail, color };
}

// --- NUMBER COUNTER ANIMATION ---
function animateNumber(el, target) {
  const duration = 800;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// --- GAUGE ---
function gaugePosition(diff) {
  return Math.max(5, Math.min(95, (diff + 20) / 40 * 100));
}

// --- DISTRICT TREND (multi-line per district) ---
function computeDistrictQuarterly(txs) {
  const data = {}; // { district: { quarter: [prices] } }
  txs.forEach(t => {
    const d = parseDate(t.date);
    if (!d || !t.district) return;
    const q = quarterLabel(d);
    if (!data[t.district]) data[t.district] = {};
    if (!data[t.district][q]) data[t.district][q] = [];
    data[t.district][q].push(t.priceM2);
  });

  // Zbierz unikalne kwartały (posortowane)
  const allQuarters = [...new Set(txs.map(t => {
    const d = parseDate(t.date);
    return d ? quarterLabel(d) : null;
  }).filter(Boolean))].sort((a, b) => {
    const [qa, ya] = [+a[1], +a.split(' ')[1]];
    const [qb, yb] = [+b[1], +b.split(' ')[1]];
    return (ya * 10 + qa) - (yb * 10 + qb);
  });

  // Tylko dzielnice z danymi w >= 2 kwartałach
  const districts = Object.entries(data)
    .filter(([_, qdata]) => Object.keys(qdata).length >= 2)
    .map(([name, qdata]) => ({
      name,
      data: allQuarters.map(q => {
        const prices = qdata[q];
        return prices ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null;
      }),
    }))
    .sort((a, b) => {
      const avgA = a.data.filter(Boolean).reduce((s, v) => s + v, 0) / a.data.filter(Boolean).length;
      const avgB = b.data.filter(Boolean).reduce((s, v) => s + v, 0) / b.data.filter(Boolean).length;
      return avgB - avgA;
    })
    .slice(0, 6); // Max 6 linii

  return { quarters: allQuarters, districts };
}

let districtTrendChart = null;

function renderDistrictTrendChart(quarterlyData) {
  const ctx = document.getElementById("district-trend-chart");
  if (!ctx) return;
  if (districtTrendChart) districtTrendChart.destroy();

  const palette = [
    "#818cf8", "#c084fc", "#f472b6", "#fb923c", "#34d399", "#fbbf24",
  ];

  districtTrendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: quarterlyData.quarters,
      datasets: quarterlyData.districts.map((d, i) => ({
        label: d.name,
        data: d.data,
        borderColor: palette[i % palette.length],
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: palette[i % palette.length],
        tension: 0.3,
        spanGaps: true,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            color: "rgba(255,255,255,0.5)",
            font: { family: "'Inter'", size: 11 },
            padding: 16,
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          backgroundColor: "rgba(19,22,31,0.95)",
          titleFont: { family: "'Inter'", size: 12, weight: '500' },
          bodyFont: { family: "'Inter'", size: 13, weight: '600' },
          padding: 14,
          cornerRadius: 10,
          borderColor: "rgba(99,102,241,0.2)",
          borderWidth: 1,
          callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.parsed.y)} PLN/m²` },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
          ticks: { color: "rgba(255,255,255,0.3)", font: { family: "'Inter'", size: 11 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.03)", drawBorder: false },
          ticks: {
            color: "rgba(255,255,255,0.3)",
            font: { family: "'Inter'", size: 11 },
            callback: v => fmt(v),
          },
        },
      },
    },
  });
}

// --- REPORT BUILDER ---
function buildReport(data, params) {
  const { miasto, dzielnica, typ, metraz, cena, limit } = params;
  let txs = data.transactions || [];

  // District stats computed on ALL transactions (for ranking/comparison)
  const districtStats = computeDistrictStats(txs);
  const districtQuarterly = computeDistrictQuarterly(txs);

  // Filter by district/street if specified
  if (dzielnica) {
    const filtered = filterTransactions(txs, dzielnica);
    if (filtered.length > 0) txs = filtered;
  }

  const stats = computeStats(txs);
  const quarterly = computeQuarterly(txs);
  const priceM2 = metraz > 0 ? Math.round(cena / metraz) : 0;
  const assessment = priceM2 > 0 ? assess(priceM2, stats) : null;
  const nbp = data.nbp;

  const today = new Date();
  const dateStr = today.toLocaleDateString('pl-PL');

  const dates = txs.map(t => parseDate(t.date)).filter(Boolean);
  const minD = dates.length ? dates.reduce((a, b) => a < b ? a : b) : null;
  const maxD = dates.length ? dates.reduce((a, b) => a > b ? a : b) : null;
  const dateRange = minD && maxD
    ? `${MONTHS_PL[minD.getMonth()]} ${minD.getFullYear()} – ${MONTHS_PL[maxD.getMonth()]} ${maxD.getFullYear()}`
    : "—";

  let trendChange = null;
  if (quarterly.length >= 2) {
    const first = quarterly[0].avg, last = quarterly[quarterly.length - 1].avg;
    trendChange = +((last - first) / first * 100).toFixed(1);
  }

  const tableLimit = limit > 0 ? limit : txs.length;
  const tableTxs = txs.slice(0, tableLimit);

  const container = document.getElementById("report-container");
  container.innerHTML = `
    <!-- Print-only header (visible only in PDF) -->
    <div class="print-header">
      <div class="print-header__logo">
        <div class="print-header__mark">RCT</div>
        <div class="print-header__name">Rejestr Cen <span>Transakcyjnych</span></div>
      </div>
      <div class="print-header__meta">Raport: ${dateStr}<br>Rejestr Cen Nieruchomości</div>
    </div>

    <!-- Report Header -->
    <div class="report-hero reveal">
      <div class="report-overline">Raport cen transakcyjnych</div>
      <div class="report-city">${miasto}${dzielnica ? ' · ' + dzielnica : ''}</div>
      <div class="report-pills">
        <span class="report-pill">Typ: <strong>${typ}</strong></span>
        <span class="report-pill">Transakcje: <strong>${txs.length}</strong></span>
        <span class="report-pill">Okres: <strong>${dateRange}</strong></span>
        <span class="report-pill">Wygenerowano: <strong>${dateStr}</strong></span>
        ${nbp ? `<span class="report-pill">NBP ref: <strong>${fmt(nbp.secondary)} PLN/m²</strong> (${nbp.quarter})</span>` : ''}
      </div>
    </div>

    ${stats ? `
    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card primary reveal">
        <div class="stat-label">Średnia cena / m²</div>
        <div class="stat-value"><span class="counter" data-target="${stats.avg}">0</span><span class="stat-unit">PLN</span></div>
        ${trendChange !== null ? `<div class="stat-badge ${trendChange >= 0 ? 'up' : 'down'}">${trendChange >= 0 ? '↑' : '↓'} ${Math.abs(trendChange)}%</div>` : ''}
      </div>
      <div class="stat-card reveal reveal-d1">
        <div class="stat-label">Mediana</div>
        <div class="stat-value"><span class="counter" data-target="${stats.median}">0</span><span class="stat-unit">PLN</span></div>
      </div>
      <div class="stat-card reveal reveal-d2">
        <div class="stat-label">Transakcje</div>
        <div class="stat-value"><span class="counter" data-target="${stats.count}">0</span></div>
        <div class="stat-label" style="margin-top:8px;margin-bottom:0">aktów notarialnych</div>
      </div>
      <div class="stat-card reveal reveal-d3">
        <div class="stat-label">Zakres cen</div>
        <div class="stat-value" style="font-size:20px">${fmt(stats.min)} – ${fmt(stats.max)}</div>
        <div class="stat-label" style="margin-top:8px;margin-bottom:0">PLN / m²</div>
      </div>
    </div>
    ` : '<div class="glass-card" style="padding:40px;text-align:center;color:var(--text-3);margin-bottom:20px">Brak wystarczających danych</div>'}

    <!-- Trend Chart -->
    ${quarterly.length >= 2 ? `
    <div class="chart-section reveal reveal-d4">
      <div class="section-head">
        <div class="section-title">Trend cenowy</div>
        <div class="section-tag">Kwartały</div>
      </div>
      <div class="chart-wrap">
        <canvas id="trend-chart"></canvas>
      </div>
    </div>
    ` : ''}

    <!-- District Comparison -->
    ${districtStats.length >= 2 ? `
    <div class="district-section reveal reveal-d5">
      <div class="section-head">
        <div class="section-title">Ranking dzielnic</div>
        <div class="section-tag">${districtStats.length} dzielnic</div>
      </div>
      <div class="district-grid">
        <div class="district-chart-wrap">
          <canvas id="district-chart"></canvas>
        </div>
        <div class="district-table-wrap">
          <table class="district-table">
            <thead>
              <tr>
                <th>Dzielnica</th>
                <th>Śr. PLN/m²</th>
                <th>Mediana</th>
                <th>Transakcje</th>
              </tr>
            </thead>
            <tbody>
              ${districtStats.map((d, i) => `
                <tr>
                  <td class="cell-district">
                    <span class="district-rank">${i + 1}</span>
                    ${d.name}
                  </td>
                  <td class="cell-price">${fmt(d.avg)}</td>
                  <td>${fmt(d.median)}</td>
                  <td>${d.count}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- District Trend Chart -->
    ${districtQuarterly.districts.length >= 2 ? `
    <div class="chart-section reveal">
      <div class="section-head">
        <div class="section-title">Trend cenowy per dzielnica</div>
        <div class="section-tag">Top ${districtQuarterly.districts.length} dzielnic</div>
      </div>
      <div class="chart-wrap" style="height:320px">
        <canvas id="district-trend-chart"></canvas>
      </div>
    </div>
    ` : ''}

    <!-- Transactions Table -->
    <div class="table-section reveal">
      <div class="section-head">
        <div class="section-title">Transakcje z aktów notarialnych</div>
        <div class="section-tag">${tableTxs.length}${tableTxs.length < txs.length ? ' z ' + txs.length : ''}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Adres</th>
            <th>Dzielnica</th>
            <th>m²</th>
            <th>Pokoje</th>
            <th>Piętro</th>
            <th>Rynek</th>
            <th>Cena</th>
            <th>PLN/m²</th>
          </tr>
        </thead>
        <tbody>
          ${tableTxs.map(tx => `
            <tr>
              <td>${tx.date || '—'}</td>
              <td class="cell-addr">${tx.address || '—'}</td>
              <td class="cell-district-tag">${tx.district || '—'}</td>
              <td>${tx.area}</td>
              <td>${tx.rooms || '—'}</td>
              <td>${tx.floor !== null && tx.floor !== undefined ? tx.floor : '—'}</td>
              <td>${tx.market || '—'}</td>
              <td>${fmtPLN(tx.price)}</td>
              <td class="cell-price">${fmt(tx.priceM2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    ${assessment && priceM2 > 0 && stats ? `
    <!-- Assessment -->
    <div class="assess-card reveal">
      <div class="section-title">Ocena oferty</div>
      <div class="assess-grid">
        <div class="assess-metric">
          <div class="assess-metric-label">Twoja cena / m²</div>
          <div class="assess-metric-value">${fmt(priceM2)} PLN</div>
        </div>
        <div class="assess-metric">
          <div class="assess-metric-label">vs Mediana</div>
          <div class="assess-metric-value" style="color:${assessment.color}">${assessment.diff > 0 ? "+" : ""}${assessment.diff}%</div>
        </div>
        <div class="assess-metric">
          <div class="assess-metric-label">Twoja oferta</div>
          <div class="assess-metric-value" style="font-size:16px">${metraz} m² · ${fmtPLN(cena)}</div>
        </div>
        <div class="assess-metric">
          <div class="assess-metric-label">Mediana okolicy</div>
          <div class="assess-metric-value">${fmt(stats.median)} PLN/m²</div>
        </div>
      </div>
      <div class="gauge-container">
        <div class="gauge-bar">
          <div class="gauge-fill" style="width:100%"></div>
          <div class="gauge-marker" style="left:${gaugePosition(assessment.diff)}%"></div>
        </div>
        <div class="gauge-text">
          <div class="gauge-verdict" style="color:${assessment.color}">${assessment.verdict}</div>
          <div class="gauge-detail">${assessment.detail}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Source -->
    <div class="report-footer">
      Źródło: Rejestr Cen Nieruchomości (RCN) · geoportal.gov.pl · Dane z aktów notarialnych${nbp ? ` · Ceny referencyjne: NBP ${nbp.quarter}` : ''}<br>
      Raport: ${dateStr} · RCT — Rejestr Cen Transakcyjnych
    </div>

    <!-- Print-only footer (visible only in PDF) -->
    <div class="print-footer">
      <strong>RCT — Rejestr Cen Transakcyjnych</strong> — Analiza oparta na danych z Rejestru Cen Nieruchomości (geoportal.gov.pl)<br>
      Dane publiczne od 01.02.2025 r. (Dz.U. 2023 poz. 1463). Raport ma charakter informacyjny.
    </div>
  `;

  // Animate counters
  setTimeout(() => {
    document.querySelectorAll('.counter').forEach(el => {
      animateNumber(el, parseInt(el.dataset.target));
    });
  }, 200);

  // Render charts
  if (quarterly.length >= 2) {
    renderTrendChart(quarterly);
  }
  if (districtStats.length >= 2) {
    renderDistrictChart(districtStats);
  }
  if (districtQuarterly.districts.length >= 2) {
    renderDistrictTrendChart(districtQuarterly);
  }
}

// --- UI ---
document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generate-btn");
  const formSection = document.getElementById("form-section");
  const heroSection = document.getElementById("hero-section");
  const reportOutput = document.getElementById("report-output");
  const loadingSection = document.getElementById("loading-section");

  checkFreshness();

  generateBtn.addEventListener("click", async () => {
    const miasto = document.getElementById("rcn-miasto").value;
    const dzielnica = document.getElementById("rcn-dzielnica").value;
    const typ = document.getElementById("rcn-typ").value;
    const metraz = parseFloat(document.getElementById("rcn-metraz").value) || 0;
    const cena = parseFloat(document.getElementById("rcn-cena").value) || 0;
    const limit = parseInt(document.getElementById("rcn-limit").value) || 0;

    if (!miasto) { alert("Wybierz miasto"); return; }

    generateBtn.disabled = true;
    generateBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.2-8.55"/></svg>
      Pobieram dane...
    `;
    formSection.classList.add("hidden");
    heroSection.classList.add("hidden");
    loadingSection.classList.remove("hidden");

    try {
      const data = await fetchData(miasto);

      if (!data.transactions || data.transactions.length === 0) {
        alert(`Brak danych dla: ${miasto}`);
        loadingSection.classList.add("hidden");
        formSection.classList.remove("hidden");
        heroSection.classList.remove("hidden");
        return;
      }

      loadingSection.classList.add("hidden");
      buildReport(data, { miasto, dzielnica, typ, metraz, cena, limit });
      reportOutput.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      alert("Błąd: " + err.message);
      loadingSection.classList.add("hidden");
      formSection.classList.remove("hidden");
      heroSection.classList.remove("hidden");
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.2-8.55"/><path d="M21 3v6h-6"/></svg>
        Generuj raport
      `;
    }
  });

  // New analysis
  document.getElementById("new-btn").addEventListener("click", () => {
    reportOutput.classList.add("hidden");
    formSection.classList.remove("hidden");
    heroSection.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // PDF — build clean HTML, render in hidden div, html2pdf → direct download
  function downloadPDF() {
    if (typeof html2pdf === 'undefined') {
      alert('Biblioteka PDF nie załadowała się. Odśwież stronę i spróbuj ponownie.');
      return;
    }

    const container = document.getElementById("report-container");
    if (!container) return;

    const today = new Date().toLocaleDateString('pl-PL');
    const todayFile = new Date().toISOString().slice(0, 10);

    // Extract data from DOM
    const city = container.querySelector('.report-city')?.textContent?.trim() || 'Raport';
    const pills = Array.from(container.querySelectorAll('.report-pill')).map(p => p.textContent.trim());
    const safeName = city.replace(/[^a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ0-9\s·]/g, '').replace(/[\s·]+/g, '_').replace(/_+$/, '');
    const filename = `RCT_${safeName}_${todayFile}.pdf`;

    // Loading state
    const btns = [document.getElementById('print-btn'), document.getElementById('print-btn-bottom')].filter(Boolean);
    const originalHTML = btns[0]?.innerHTML;
    btns.forEach(btn => {
      btn.disabled = true;
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M21 12a9 9 0 11-6.2-8.55"/></svg> Generuję PDF...`;
    });

    // Stats
    const stats = [];
    container.querySelectorAll('.stat-card').forEach(card => {
      const label = card.querySelector('.stat-label')?.textContent?.trim() || '';
      const counter = card.querySelector('.counter');
      let value = '';
      if (counter) {
        value = fmt(parseInt(counter.dataset.target));
        const unit = card.querySelector('.stat-unit');
        if (unit) value += ' ' + unit.textContent.trim();
      }
      const badge = card.querySelector('.stat-badge');
      const badgeText = badge ? badge.textContent.trim() : '';
      const isPrimary = card.classList.contains('primary');
      stats.push({ label, value, badgeText, isPrimary });
    });

    // Charts as base64
    const charts = [];
    container.querySelectorAll('canvas').forEach(canvas => {
      try {
        const section = canvas.closest('.chart-section, .district-section');
        const title = section?.querySelector('.section-title')?.textContent?.trim() || '';
        const tag = section?.querySelector('.section-tag')?.textContent?.trim() || '';
        charts.push({ img: canvas.toDataURL('image/png', 1.0), title, tag });
      } catch(e) {}
    });

    // Table
    const tableHeaders = [];
    container.querySelectorAll('thead th').forEach(th => tableHeaders.push(th.textContent.trim()));
    const tableRows = [];
    container.querySelectorAll('tbody tr').forEach(tr => {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => ({
        text: td.textContent.trim(),
        isAddr: td.classList.contains('cell-addr'),
        isPrice: td.classList.contains('cell-price'),
        isDistrict: td.classList.contains('cell-district-tag'),
      }));
      tableRows.push(cells);
    });

    // Assessment
    let assessBlock = '';
    const assessCard = container.querySelector('.assess-card');
    if (assessCard) {
      const metrics = [];
      assessCard.querySelectorAll('.assess-metric').forEach(m => {
        metrics.push({
          lbl: m.querySelector('.assess-metric-label')?.textContent?.trim() || '',
          val: m.querySelector('.assess-metric-value')?.textContent?.trim() || '',
          color: m.querySelector('.assess-metric-value')?.style?.color || '#1e1e2e',
        });
      });
      const verdict = assessCard.querySelector('.gauge-verdict')?.textContent?.trim() || '';
      const detail = assessCard.querySelector('.gauge-detail')?.textContent?.trim() || '';
      const verdictColor = assessCard.querySelector('.gauge-verdict')?.style?.color || '#4f46e5';
      assessBlock = `
        <div class="section assess">
          <h3 style="color:#4f46e5">Ocena oferty</h3>
          <table class="metrics"><tr>
            ${metrics.map(m => `<td><div class="mlabel">${m.lbl}</div><div class="mval" style="color:${m.color}">${m.val}</div></td>`).join('')}
          </tr></table>
          <div class="verdict-box">
            <div class="verdict" style="color:${verdictColor}">${verdict}</div>
            <div class="vdetail">${detail}</div>
          </div>
        </div>`;
    }

    // District ranking
    let districtBlock = '';
    const distTable = container.querySelector('.district-table');
    if (distTable) {
      const dHeaders = [];
      distTable.querySelectorAll('thead th').forEach(th => dHeaders.push(th.textContent.trim()));
      const dRows = [];
      distTable.querySelectorAll('tbody tr').forEach(tr => {
        dRows.push(Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim()));
      });
      if (dRows.length) {
        districtBlock = `
          <div class="section">
            <h3>Ranking dzielnic</h3>
            <table class="data" style="margin-top:8px">
              <thead><tr>${dHeaders.map(h => `<th>${h}</th>`).join('')}</tr></thead>
              <tbody>${dRows.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>`;
      }
    }

    const srcFooter = container.querySelector('.report-footer')?.textContent?.trim() || '';

    // Build clean HTML for PDF
    const pdfHTML = `
      <div style="font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1e1e2e;font-size:10pt;line-height:1.5;padding:0;max-width:700px;">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4f46e5;padding-bottom:10px;margin-bottom:18px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="width:32px;height:32px;background:#4f46e5;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:10px;letter-spacing:-0.5px;">RCT</div>
            <div style="font-size:15px;font-weight:700;">Rejestr Cen <span style="color:#4f46e5;font-weight:400;">Transakcyjnych</span></div>
          </div>
          <div style="text-align:right;font-size:8pt;color:#94a3b8;">Raport: ${today}<br>Rejestr Cen Nieruchomości</div>
        </div>

        <div style="background:#f0f0ff;border:1px solid #c7c5f5;border-left:4px solid #4f46e5;border-radius:8px;padding:20px 24px;margin-bottom:16px;">
          <div style="font-size:7.5pt;font-weight:700;letter-spacing:3px;color:#4f46e5;text-transform:uppercase;margin-bottom:4px;">Raport cen transakcyjnych</div>
          <div style="font-size:22pt;font-weight:800;letter-spacing:-1px;margin-bottom:10px;">${city}</div>
          ${pills.map(p => `<span style="display:inline-block;font-size:8pt;color:#64748b;background:#fff;border:1px solid #e2e2ee;padding:2px 8px;border-radius:4px;margin-right:4px;margin-bottom:4px;">${p}</span>`).join('')}
        </div>

        ${stats.length ? `<div style="display:flex;gap:10px;margin-bottom:16px;">
          ${stats.map(s => `<div style="flex:${s.isPrimary ? '1.5' : '1'};background:${s.isPrimary ? '#f0f0ff' : '#fafafa'};border:1px solid ${s.isPrimary ? '#c7c5f5' : '#e8e8ee'};border-radius:8px;padding:14px 16px;">
            <div style="font-size:7pt;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">${s.label}</div>
            <div style="font-size:${s.isPrimary ? '24pt' : '18pt'};font-weight:800;line-height:1;${s.isPrimary ? 'color:#4f46e5;' : ''}">${s.value}</div>
            ${s.badgeText ? `<div style="font-size:8pt;font-weight:700;margin-top:6px;color:${s.badgeText.includes('↑') ? '#16a34a' : '#dc2626'}">${s.badgeText}</div>` : ''}
          </div>`).join('')}
        </div>` : ''}

        ${charts.map(c => `<div style="background:#fafafa;border:1px solid #e8e8ee;border-radius:8px;padding:18px 20px;margin-bottom:16px;page-break-inside:avoid;">
          ${c.title ? `<div style="display:flex;justify-content:space-between;"><h3 style="font-size:11pt;font-weight:700;margin:0;">${c.title}</h3><span style="font-size:7pt;color:#94a3b8;font-weight:700;letter-spacing:1px;text-transform:uppercase;">${c.tag}</span></div>` : ''}
          <img src="${c.img}" style="width:100%;margin-top:10px;" />
        </div>`).join('')}

        ${tableRows.length ? `<div style="background:#fff;border:1px solid #e8e8ee;border-radius:8px;padding:18px 20px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;"><h3 style="font-size:11pt;font-weight:700;margin:0;">Transakcje z aktów notarialnych</h3><span style="font-size:7pt;color:#94a3b8;font-weight:700;">${tableRows.length} najnowszych</span></div>
          <table style="width:100%;border-collapse:collapse;margin-top:10px;">
            <thead><tr>${tableHeaders.map(h => `<th style="font-size:7pt;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#94a3b8;text-align:left;padding:6px 8px;border-bottom:2px solid #e8e8ee;">${h}</th>`).join('')}</tr></thead>
            <tbody>${tableRows.map(row => `<tr>${row.map(c => {
              let style = 'font-size:8.5pt;padding:5px 8px;border-bottom:1px solid #f1f1f5;color:#475569;';
              if (c.isAddr) style += 'color:#1e1e2e;font-weight:500;';
              if (c.isPrice) style += 'color:#4f46e5;font-weight:700;white-space:nowrap;';
              if (c.isDistrict) style += 'color:#4f46e5;font-size:8pt;';
              return `<td style="${style}">${c.text}</td>`;
            }).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>` : ''}

        ${districtBlock}
        ${assessBlock}

        <div style="text-align:center;font-size:7.5pt;color:#94a3b8;border-top:1px solid #e8e8ee;padding-top:10px;margin-top:10px;">${srcFooter}</div>
        <div style="text-align:center;font-size:7.5pt;color:#94a3b8;border-top:2px solid #4f46e5;padding-top:10px;margin-top:10px;"><strong style="color:#4f46e5;">RCT — Rejestr Cen Transakcyjnych</strong> — Analiza oparta na danych z Rejestru Cen Nieruchomości (geoportal.gov.pl)<br>Dane publiczne od 01.02.2025 r. (Dz.U. 2023 poz. 1463). Raport ma charakter informacyjny.</div>
      </div>
    `;

    // Create hidden container, render, download, cleanup
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px;background:#fff;z-index:-1;';
    wrapper.innerHTML = pdfHTML;
    document.body.appendChild(wrapper);

    const opt = {
      margin: [10, 10, 14, 10],
      filename: filename,
      image: { type: 'jpeg', quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, logging: false, width: 700 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['.section', '.assess'] },
    };

    html2pdf().set(opt).from(wrapper.firstElementChild).save()
      .then(() => {
        document.body.removeChild(wrapper);
        btns.forEach(btn => { btn.disabled = false; btn.innerHTML = originalHTML; });
      })
      .catch((err) => {
        console.error('PDF error:', err);
        document.body.removeChild(wrapper);
        btns.forEach(btn => { btn.disabled = false; btn.innerHTML = originalHTML; });
        alert('Nie udało się wygenerować PDF. Spróbuj ponownie.');
      });
  }

  document.getElementById("print-btn").addEventListener("click", downloadPDF);
  document.getElementById("print-btn-bottom").addEventListener("click", downloadPDF);
});

// Spin keyframe
if (!document.getElementById('spin-style')) {
  const s = document.createElement('style');
  s.id = 'spin-style';
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

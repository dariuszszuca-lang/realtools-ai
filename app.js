/* ═══════════════════════════════════════════
   RealTools AI v2.0 — Frontend
   ═══════════════════════════════════════════ */

const MONTHS_PL = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paz","lis","gru"];
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
  if (!r.ok) throw new Error(`Blad: ${r.status}`);
  const d = await r.json();
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
    // Silent — badge stays default
  }
}

// --- FILTERING ---
function filterByAddress(txs, q) {
  if (!q) return txs;
  const lq = q.toLowerCase();
  return txs.filter(t => (t.address || '').toLowerCase().includes(lq) || (t.city || '').toLowerCase().includes(lq));
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

// --- CHART ---
let chart = null;

function renderChart(data) {
  const ctx = document.getElementById("trend-chart");
  if (!ctx) return;
  if (chart) chart.destroy();

  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, 'rgba(99,102,241,0.15)');
  gradient.addColorStop(1, 'rgba(99,102,241,0)');

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map(q => q.label),
      datasets: [{
        label: "Srednia PLN/m2",
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
          callbacks: { label: (c) => fmt(c.parsed.y) + " PLN/m2" },
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

// --- ASSESSMENT ---
function assess(userPM2, stats) {
  if (!stats) return { diff: 0, verdict: "BRAK DANYCH", detail: "Za malo transakcji.", color: "#64748b" };
  const diff = +((userPM2 - stats.median) / stats.median * 100).toFixed(1);
  let verdict, detail, color;
  if (diff < -8) {
    verdict = "Ponizej rynku"; detail = `Cena ${Math.abs(diff)}% ponizej mediany. Atrakcyjna oferta — szybka sprzedaz prawdopodobna.`; color = "#22c55e";
  } else if (diff < -3) {
    verdict = "Lekko ponizej"; detail = `Cena ${Math.abs(diff)}% ponizej mediany. Konkurencyjna oferta.`; color = "#4ade80";
  } else if (diff <= 3) {
    verdict = "Cena rynkowa"; detail = `Cena zgodna z mediana (${diff > 0 ? "+" : ""}${diff}%). Solidna pozycja negocjacyjna.`; color = "#818cf8";
  } else if (diff <= 8) {
    verdict = "Lekko powyzej"; detail = `Cena +${diff}% powyzej mediany. Uzasadnione przy wyzszym standardzie.`; color = "#f59e0b";
  } else {
    verdict = "Powyzej rynku"; detail = `Cena +${diff}% powyzej mediany. Sprzedaz moze trwac dluzej.`; color = "#ef4444";
  }
  return { diff, verdict, detail, color };
}

// --- NUMBER COUNTER ANIMATION ---
function animateNumber(el, target) {
  const duration = 800;
  const start = performance.now();
  const from = 0;
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    el.textContent = fmt(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// --- GAUGE POSITION ---
function gaugePosition(diff) {
  // Map diff from -20..+20 to 0..100%
  return Math.max(5, Math.min(95, (diff + 20) / 40 * 100));
}

// --- REPORT BUILDER ---
function buildReport(data, params) {
  const { miasto, dzielnica, typ, metraz, cena } = params;
  let txs = data.transactions || [];

  if (dzielnica) {
    const filtered = filterByAddress(txs, dzielnica);
    txs = filtered.length >= 5 ? filtered : txs;
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

  const tableTxs = txs.slice(0, 20);

  const container = document.getElementById("report-container");
  container.innerHTML = `
    <!-- Report Header -->
    <div class="report-hero reveal">
      <div class="report-overline">Raport analizy porownawczej</div>
      <div class="report-city">${miasto}${dzielnica ? ', ' + dzielnica : ''}</div>
      <div class="report-pills">
        <span class="report-pill">Typ: <strong>${typ}</strong></span>
        <span class="report-pill">Transakcje: <strong>${txs.length}</strong></span>
        <span class="report-pill">Okres: <strong>${dateRange}</strong></span>
        <span class="report-pill">Wygenerowano: <strong>${dateStr}</strong></span>
        ${nbp ? `<span class="report-pill">NBP ref: <strong>${fmt(nbp.secondary)} PLN/m2</strong> (${nbp.quarter})</span>` : ''}
      </div>
    </div>

    ${stats ? `
    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card primary reveal">
        <div class="stat-label">Srednia cena / m2</div>
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
        <div class="stat-label" style="margin-top:8px;margin-bottom:0">aktow notarialnych</div>
      </div>
      <div class="stat-card reveal reveal-d3">
        <div class="stat-label">Zakres cen</div>
        <div class="stat-value" style="font-size:20px">${fmt(stats.min)} – ${fmt(stats.max)}</div>
        <div class="stat-label" style="margin-top:8px;margin-bottom:0">PLN / m2</div>
      </div>
    </div>
    ` : '<div class="glass-card" style="padding:40px;text-align:center;color:var(--text-3);margin-bottom:20px">Brak wystarczajacych danych</div>'}

    <!-- Chart -->
    ${quarterly.length >= 2 ? `
    <div class="chart-section reveal reveal-d4">
      <div class="section-head">
        <div class="section-title">Trend cenowy</div>
        <div class="section-tag">Kwartaly</div>
      </div>
      <div class="chart-wrap">
        <canvas id="trend-chart"></canvas>
      </div>
    </div>
    ` : ''}

    <!-- Table -->
    <div class="table-section reveal reveal-d5">
      <div class="section-head">
        <div class="section-title">Transakcje z aktow notarialnych</div>
        <div class="section-tag">${tableTxs.length} najnowszych</div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Adres</th>
            <th>m2</th>
            <th>Pokoje</th>
            <th>Pietro</th>
            <th>Rynek</th>
            <th>Cena</th>
            <th>PLN/m2</th>
          </tr>
        </thead>
        <tbody>
          ${tableTxs.map(tx => `
            <tr>
              <td>${tx.date || '—'}</td>
              <td class="cell-addr">${tx.address || '—'}</td>
              <td>${tx.area}</td>
              <td>${tx.rooms || '—'}</td>
              <td>${tx.floor !== null ? tx.floor : '—'}</td>
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
          <div class="assess-metric-label">Twoja cena / m2</div>
          <div class="assess-metric-value">${fmt(priceM2)} PLN</div>
        </div>
        <div class="assess-metric">
          <div class="assess-metric-label">vs Mediana</div>
          <div class="assess-metric-value" style="color:${assessment.color}">${assessment.diff > 0 ? "+" : ""}${assessment.diff}%</div>
        </div>
        <div class="assess-metric">
          <div class="assess-metric-label">Twoja oferta</div>
          <div class="assess-metric-value" style="font-size:16px">${metraz} m2 · ${fmtPLN(cena)}</div>
        </div>
        <div class="assess-metric">
          <div class="assess-metric-label">Mediana okolicy</div>
          <div class="assess-metric-value">${fmt(stats.median)} PLN/m2</div>
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
      Zrodlo: Rejestr Cen Nieruchomosci (RCN) · geoportal.gov.pl · Dane z aktow notarialnych${nbp ? ` · Ceny referencyjne: NBP ${nbp.quarter}` : ''}<br>
      Raport: ${dateStr} · RealTools AI
    </div>
  `;

  // Animate counters
  setTimeout(() => {
    document.querySelectorAll('.counter').forEach(el => {
      animateNumber(el, parseInt(el.dataset.target));
    });
  }, 200);

  // Render chart
  if (quarterly.length >= 2) {
    renderChart(quarterly);
  }
}

// --- UI ---
document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generate-btn");
  const formSection = document.getElementById("form-section");
  const heroSection = document.getElementById("hero-section");
  const reportOutput = document.getElementById("report-output");
  const loadingSection = document.getElementById("loading-section");

  // Check data freshness
  checkFreshness();

  generateBtn.addEventListener("click", async () => {
    const miasto = document.getElementById("rcn-miasto").value;
    const dzielnica = document.getElementById("rcn-dzielnica").value;
    const typ = document.getElementById("rcn-typ").value;
    const metraz = parseFloat(document.getElementById("rcn-metraz").value) || 0;
    const cena = parseFloat(document.getElementById("rcn-cena").value) || 0;

    if (!miasto) { alert("Wybierz miasto"); return; }

    // Show skeleton loading
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
      buildReport(data, { miasto, dzielnica, typ, metraz, cena });
      reportOutput.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      alert("Blad: " + err.message);
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

  // PDF
  const doPrint = () => window.print();
  document.getElementById("print-btn").addEventListener("click", doPrint);
  document.getElementById("print-btn-bottom").addEventListener("click", doPrint);
});

// Spin keyframe (for loading button)
if (!document.getElementById('spin-style')) {
  const s = document.createElement('style');
  s.id = 'spin-style';
  s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(s);
}

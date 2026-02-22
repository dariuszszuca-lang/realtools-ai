/* ═══════════════════════════════════════════════════════════
   RealTools AI — Raport Cen Transakcyjnych
   Frontend podpięty do prawdziwych danych RCN (WFS geoportal.gov.pl)
   ═══════════════════════════════════════════════════════════ */

const MONTHS_PL = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];

// ═══ UTILITIES ═══
const fmt = (n) => n.toLocaleString("pl-PL");
const fmtPLN = (n) => fmt(n) + " PLN";

function parseDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('.');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return null;
}

function quarterLabel(date) {
  if (!date) return '';
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

// ═══ DATA FETCHING ═══
let cachedData = {};

async function fetchRCNData(city) {
  if (cachedData[city]) return cachedData[city];

  const resp = await fetch(`/api/rcn?city=${encodeURIComponent(city)}`);
  if (!resp.ok) throw new Error(`Błąd pobierania danych: ${resp.status}`);
  const data = await resp.json();
  cachedData[city] = data;
  return data;
}

// ═══ FILTERING ═══
function filterByAddress(transactions, dzielnica) {
  if (!dzielnica) return transactions;
  const query = dzielnica.toLowerCase();
  return transactions.filter(t => {
    const addr = (t.address || '').toLowerCase();
    const city = (t.city || '').toLowerCase();
    return addr.includes(query) || city.includes(query);
  });
}

function filterByType(transactions, typ) {
  // All lokale are apartments by default (backend filters out garages)
  // For dom/dzialka we'd need different WFS layers
  return transactions;
}

// ═══ STATS ═══
function computeStats(transactions) {
  const prices = transactions.map(t => t.priceM2).filter(p => p > 0);
  if (prices.length === 0) return null;
  prices.sort((a, b) => a - b);
  const n = prices.length;
  const median = n % 2 === 1 ? prices[Math.floor(n/2)] : Math.round((prices[Math.floor(n/2)-1] + prices[Math.floor(n/2)]) / 2);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / n);
  return { count: n, avg, median, min: prices[0], max: prices[n-1] };
}

function computeQuarterlyTrend(transactions) {
  const quarters = {};
  transactions.forEach(t => {
    const date = parseDate(t.date);
    if (!date) return;
    const q = quarterLabel(date);
    if (!quarters[q]) quarters[q] = [];
    quarters[q].push(t.priceM2);
  });

  const result = [];
  const sortedKeys = Object.keys(quarters).sort((a, b) => {
    const [qa, ya] = [parseInt(a[1]), parseInt(a.split(' ')[1])];
    const [qb, yb] = [parseInt(b[1]), parseInt(b.split(' ')[1])];
    return (ya * 10 + qa) - (yb * 10 + qb);
  });

  sortedKeys.forEach(q => {
    const prices = quarters[q];
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    result.push({ label: q, avg, count: prices.length });
  });

  return result;
}

// ═══ CHART ═══
let chartInstance = null;

function renderChart(quarterlyData) {
  const ctx = document.getElementById("trend-chart");
  if (!ctx) return;
  if (chartInstance) chartInstance.destroy();

  const labels = quarterlyData.map(q => q.label);
  const values = quarterlyData.map(q => q.avg);

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Średnia cena PLN/m²",
        data: values,
        borderColor: "#D4AF37",
        backgroundColor: "rgba(212,175,55,0.08)",
        borderWidth: 3,
        pointBackgroundColor: "#D4AF37",
        pointBorderColor: "#D4AF37",
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(17,24,39,0.95)",
          titleFont: { family: "'Inter', sans-serif", size: 13 },
          bodyFont: { family: "'Inter', sans-serif", size: 14, weight: "bold" },
          padding: 14,
          cornerRadius: 8,
          borderColor: "rgba(212,175,55,0.3)",
          borderWidth: 1,
          callbacks: {
            label: (ctx) => fmt(ctx.parsed.y) + " PLN/m²",
          },
        },
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "rgba(255,255,255,0.4)", font: { family: "'Inter'", size: 12 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: {
            color: "rgba(255,255,255,0.4)",
            font: { family: "'Inter'", size: 12 },
            callback: (v) => fmt(v),
          },
        },
      },
    },
  });
}

// ═══ ASSESSMENT ═══
function assessPrice(userPriceM2, stats) {
  if (!stats) return { diff: 0, verdict: "BRAK DANYCH", detail: "Za mało transakcji do analizy." };
  const diff = parseFloat(((userPriceM2 - stats.median) / stats.median * 100).toFixed(1));

  let verdict, detail;
  if (diff < -8) {
    verdict = "PONIŻEJ RYNKU";
    detail = `Cena ofertowa jest ${Math.abs(diff)}% poniżej mediany okolicy. To atrakcyjna cena — szybka sprzedaż jest bardzo prawdopodobna. Warto rozważyć korektę w górę o 3-5%.`;
  } else if (diff < -3) {
    verdict = "LEKKO PONIŻEJ RYNKU";
    detail = `Cena ofertowa jest ${Math.abs(diff)}% poniżej mediany. Konkurencyjna oferta, która powinna przyciągnąć kupujących.`;
  } else if (diff <= 3) {
    verdict = "CENA RYNKOWA";
    detail = `Cena ofertowa jest zgodna z medianą okolicy (${diff > 0 ? "+" : ""}${diff}%). Adekwatna wycena — pozycja negocjacyjna jest solidna.`;
  } else if (diff <= 8) {
    verdict = "LEKKO POWYŻEJ RYNKU";
    detail = `Cena ofertowa jest +${diff}% powyżej mediany. Uzasadnione przy wyższym standardzie. Margines negocjacji: 2-4%.`;
  } else {
    verdict = "POWYŻEJ RYNKU";
    detail = `Cena ofertowa jest +${diff}% powyżej mediany okolicy. Sprzedaż może trwać dłużej. Rozważ obniżkę o ${Math.round(diff - 3)}%.`;
  }

  return { diff, verdict, detail };
}

// ═══ REPORT BUILDER ═══
function buildReport(data, params) {
  const { miasto, dzielnica, typ, metraz, cena } = params;
  let transactions = data.transactions || [];

  // Filter by dzielnica (search in address)
  if (dzielnica) {
    const filtered = filterByAddress(transactions, dzielnica);
    // If filter returns too few results, use all city data
    transactions = filtered.length >= 5 ? filtered : transactions;
  }

  const stats = computeStats(transactions);
  const quarterly = computeQuarterlyTrend(transactions);
  const priceM2 = metraz > 0 ? Math.round(cena / metraz) : 0;
  const assessment = priceM2 > 0 ? assessPrice(priceM2, stats) : null;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2,"0")}.${String(today.getMonth()+1).padStart(2,"0")}.${today.getFullYear()}`;

  // Find date range
  const dates = transactions.map(t => parseDate(t.date)).filter(Boolean);
  const minDate = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : null;
  const maxDate = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;
  const dateRange = minDate && maxDate
    ? `${MONTHS_PL[minDate.getMonth()]} ${minDate.getFullYear()} – ${MONTHS_PL[maxDate.getMonth()]} ${maxDate.getFullYear()}`
    : "brak danych";

  // Total trend change
  let totalChange = "—";
  if (quarterly.length >= 2) {
    const first = quarterly[0].avg;
    const last = quarterly[quarterly.length - 1].avg;
    totalChange = ((last - first) / first * 100).toFixed(1);
  }

  // Top 15 transactions for table (newest first)
  const tableTransactions = transactions.slice(0, 15);

  const container = document.getElementById("report-container");
  container.innerHTML = `
    <!-- Report Header -->
    <div class="report-header-card">
      <div class="report-title">RAPORT ANALIZY PORÓWNAWCZEJ</div>
      <div class="report-location">${miasto}${dzielnica ? ', ' + dzielnica : ''}</div>
      <div class="report-meta">
        <div class="report-meta-item">Typ: <strong>${typ}</strong></div>
        <div class="report-meta-item">Transakcje: <strong>${transactions.length}</strong></div>
        <div class="report-meta-item">Okres: <strong>${dateRange}</strong></div>
        <div class="report-meta-item">Wygenerowano: <strong>${dateStr}</strong></div>
      </div>
    </div>

    ${stats ? `
    <!-- Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Średnia cena / m²</div>
        <div class="stat-value gold">${fmt(stats.avg)}<span class="stat-suffix">PLN</span></div>
        ${totalChange !== "—" ? `<div class="stat-change ${parseFloat(totalChange) >= 0 ? 'up' : 'down'}">${parseFloat(totalChange) >= 0 ? '▲' : '▼'} ${totalChange}%</div>` : ''}
      </div>
      <div class="stat-card">
        <div class="stat-label">Mediana ceny / m²</div>
        <div class="stat-value">${fmt(stats.median)}<span class="stat-suffix">PLN</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Transakcje</div>
        <div class="stat-value">${stats.count}</div>
        <div class="stat-label" style="margin-top:6px;margin-bottom:0">aktów notarialnych</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Zakres cen / m²</div>
        <div class="stat-value">${fmt(stats.min)}<span class="stat-suffix"> – </span>${fmt(stats.max)}</div>
        <div class="stat-label" style="margin-top:6px;margin-bottom:0">PLN / m²</div>
      </div>
    </div>
    ` : '<div class="card" style="padding:40px;text-align:center;color:var(--text-muted)">Brak wystarczających danych do statystyk</div>'}

    <!-- Chart -->
    ${quarterly.length >= 2 ? `
    <div class="chart-card">
      <h3>Trend cenowy — kwartały</h3>
      <div class="chart-wrapper">
        <canvas id="trend-chart"></canvas>
      </div>
    </div>
    ` : ''}

    <!-- Transactions Table -->
    <div class="table-card">
      <h3>Transakcje z aktów notarialnych</h3>
      <p class="table-subtitle">Ostatnie ${tableTransactions.length} transakcji z Rejestru Cen Nieruchomości</p>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Adres</th>
            <th>m²</th>
            <th>Pokoje</th>
            <th>Piętro</th>
            <th>Rynek</th>
            <th>Cena</th>
            <th>PLN/m²</th>
          </tr>
        </thead>
        <tbody>
          ${tableTransactions.map(tx => `
            <tr>
              <td>${tx.date || '—'}</td>
              <td class="highlight-cell">${tx.address || '—'}</td>
              <td>${tx.area} m²</td>
              <td>${tx.rooms || '—'}</td>
              <td>${tx.floor !== null ? tx.floor : '—'}</td>
              <td>${tx.market || '—'}</td>
              <td>${fmtPLN(tx.price)}</td>
              <td class="price-cell">${fmt(tx.priceM2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    ${assessment && priceM2 > 0 ? `
    <!-- Assessment -->
    <div class="assessment-card">
      <h3>Ocena Twojej oferty</h3>
      <div class="assessment-grid">
        <div class="assessment-item">
          <div class="assessment-label">Twoja cena / m²</div>
          <div class="assessment-value">${fmt(priceM2)} PLN</div>
        </div>
        <div class="assessment-item">
          <div class="assessment-label">vs Mediana okolicy</div>
          <div class="assessment-value" style="color: ${assessment.diff > 3 ? '#EF4444' : assessment.diff < -3 ? '#10B981' : '#D4AF37'}">${assessment.diff > 0 ? "+" : ""}${assessment.diff}%</div>
        </div>
        <div class="assessment-item">
          <div class="assessment-label">Twoja oferta</div>
          <div class="assessment-value">${metraz} m² · ${fmtPLN(cena)}</div>
        </div>
        <div class="assessment-item">
          <div class="assessment-label">Mediana okolicy</div>
          <div class="assessment-value">${stats ? fmt(stats.median) + ' PLN/m²' : '—'}</div>
        </div>
        <div class="assessment-verdict">
          <div class="verdict-label">${assessment.verdict}</div>
          <div class="verdict-text">${assessment.detail}</div>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- Source -->
    <div class="report-source">
      Źródło: Rejestr Cen Nieruchomości (RCN) · geoportal.gov.pl · Dane z aktów notarialnych<br>
      Raport: ${dateStr} · RealTools AI
    </div>
  `;

  // Render chart
  if (quarterly.length >= 2) {
    renderChart(quarterly);
  }
}

// ═══ UI ═══
document.addEventListener("DOMContentLoaded", () => {
  const generateBtn = document.getElementById("generate-btn");
  const formSection = document.getElementById("form-section");
  const heroSection = document.getElementById("hero-section");
  const reportOutput = document.getElementById("report-output");

  generateBtn.addEventListener("click", async () => {
    const miasto = document.getElementById("rcn-miasto").value;
    const dzielnica = document.getElementById("rcn-dzielnica").value;
    const typ = document.getElementById("rcn-typ").value;
    const metraz = parseFloat(document.getElementById("rcn-metraz").value) || 0;
    const cena = parseFloat(document.getElementById("rcn-cena").value) || 0;

    if (!miasto) return alert("Wybierz miasto");

    // Show loading
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="btn-icon">⏳</span> Pobieram dane z RCN...';

    try {
      const data = await fetchRCNData(miasto);

      if (!data.transactions || data.transactions.length === 0) {
        alert(`Brak danych RCN dla miasta: ${miasto}. Spróbuj inne miasto.`);
        return;
      }

      buildReport(data, { miasto, dzielnica, typ, metraz, cena });

      formSection.classList.add("hidden");
      heroSection.classList.add("hidden");
      reportOutput.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      alert("Błąd pobierania danych: " + err.message);
      console.error(err);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span class="btn-icon">📊</span> Generuj raport';
    }
  });

  // New analysis
  document.getElementById("new-btn").addEventListener("click", () => {
    reportOutput.classList.add("hidden");
    formSection.classList.remove("hidden");
    heroSection.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // Print / PDF
  const handlePrint = () => window.print();
  document.getElementById("print-btn").addEventListener("click", handlePrint);
  document.getElementById("print-btn-bottom").addEventListener("click", handlePrint);
});

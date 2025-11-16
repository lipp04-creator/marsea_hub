// main.js — logika HOME + helper sidebar
// Sekarang 100% pakai JSON lokal (tanpa backend).

const VESSELS_JSON = "vessels.json";
const REST_JSON    = "restareas.json";
const NDWI_JSON    = "ndwi.json";

document.addEventListener("DOMContentLoaded", () => {
  setupSidebarToggle();
  loadHomeOverview();
  loadNdwiMiniChart();
});

// =========================
// SIDEBAR TOGGLE (MOBILE)
// =========================
function setupSidebarToggle() {
  const btn = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  if (!btn || !sidebar) return;

  btn.addEventListener("click", () => {
    sidebar.classList.toggle("sidebar-open");
  });
}

// =========================
// Util: helper angka
// =========================
function toNumberSafe(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

// =========================
// Home Overview (Status Operasional Hari Ini)
// 100% dari JSON lokal: vessels.json, restareas.json, ndwi.json, home.json
// =========================
async function loadHomeOverview() {
  const grid = document.getElementById("kpiGrid");
  if (!grid) return; // berarti bukan di index.html

  try {
    const [vesselRes, restRes, ndwiRes, homeRes] = await Promise.all([
      fetch(VESSELS_JSON),
      fetch(REST_JSON),
      fetch(NDWI_JSON),
      fetch("home.json")
    ]);

    const vessels = vesselRes.ok ? await vesselRes.json() : [];
    const rests   = restRes.ok   ? await restRes.json()   : [];
    const ndwi    = ndwiRes.ok   ? await ndwiRes.json()   : null;
    const meta    = homeRes.ok   ? await homeRes.json()   : null;

    // --- 1) Kapal aktif ---
    const activeVessels =
      (Array.isArray(vessels) && vessels.length) ||
      (meta && meta.vessels_active) ||
      0;

    // --- 2) Data rest area dari restareas.json ---
    let totalCap = 0;
    let totalUsed = 0;
    rests.forEach(r => {
      const cap   = toNumberSafe(r.capacity ?? r.cap);
      const used  = r.used != null
        ? toNumberSafe(r.used)
        : Math.max(cap - toNumberSafe(r.available ?? 0), 0);

      totalCap  += cap;
      totalUsed += used;
    });

    const restAreasActive = (Array.isArray(rests) && rests.length) || (meta && meta.rest_areas_total) || 0;
    const dockedShips     = totalUsed || (meta && meta.docked_ships) || 0;
    const slotsAvailable  =
      Math.max(totalCap - totalUsed, 0) ||
      (meta && meta.rest_slots_available) ||
      0;

    // --- 3) NDWI (ambil nilai terakhir) ---
    let ndwiLast = null;
    if (ndwi && Array.isArray(ndwi.values) && ndwi.values.length) {
      ndwiLast = ndwi.values[ndwi.values.length - 1];
    }
    const ndwiDisplay = ndwiLast != null
      ? Number(ndwiLast).toFixed(2)
      : (meta && meta.ndwi_avg != null
          ? Number(meta.ndwi_avg).toFixed(2)
          : "0.75");

    // --- 4) Alerts dari home.json (fallback 0) ---
    const alerts = meta && typeof meta.alerts === "number" ? meta.alerts : 0;

    // --- Render kartu KPI (6 buah) ---
    grid.innerHTML = `
      <div class="kpi-card">
        <h4>${activeVessels}</h4>
        <p>Kapal Aktif di sekitar ALKI 1</p>
      </div>
      <div class="kpi-card">
        <h4>${dockedShips}</h4>
        <p>Kapal Sedang Sandar (est. slot terpakai)</p>
      </div>
      <div class="kpi-card">
        <h4>${ndwiDisplay}</h4>
        <p>NDWI Rata-rata (nilai terakhir)</p>
      </div>
      <div class="kpi-card">
        <h4>${restAreasActive}</h4>
        <p>Rest Area Laut Aktif</p>
      </div>
      <div class="kpi-card">
        <h4>${slotsAvailable}</h4>
        <p>Slot Sandar Kosong (Total)</p>
      </div>
      <div class="kpi-card">
        <h4>${alerts}</h4>
        <p>Alert Lingkungan / Keselamatan</p>
      </div>
    `;
  } catch (err) {
    console.error("loadHomeOverview error:", err);
  }
}

// =========================
// NDWI Mini Chart (Home)
// =========================
async function loadNdwiMiniChart() {
  const canvas = document.getElementById("ndwiMiniChart");
  if (!canvas) return; // bukan di index.html

  if (typeof Chart === "undefined") {
    console.warn("ChartJS belum ter-load, NDWI mini chart dilewati.");
    return;
  }

  try {
    const res = await fetch(NDWI_JSON);
    const ndwi = res.ok ? await res.json() : null;

    let labels = ["W1","W2","W3","W4","W5","W6","W7","W8"];
    let values = [0.65,0.67,0.70,0.69,0.71,0.70,0.72,0.73];

    if (ndwi && Array.isArray(ndwi.weeks) && Array.isArray(ndwi.values) && ndwi.values.length) {
      labels = ndwi.weeks;
      values = ndwi.values;
    }

    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "NDWI",
          data: values,
          borderWidth: 2,
          fill: true,
          tension: 0.35
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 1, ticks: { stepSize: 0.1 } }
        },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  } catch (err) {
    console.error("NDWI chart error:", err);
  }
}

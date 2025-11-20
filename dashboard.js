// dashboard.js
const API_BASE = "http://localhost:5000";

// sumber dummy (file front-end)
// VESSELS_JSON, REST_JSON, NDWI_JSON disediakan oleh main.js

let VESSELS = [];
let RESTS   = [];
let NDWI    = null;

// ===================================================================
// INIT
// ===================================================================
function initDashboard() {
  if (typeof protectPage === "function") protectPage();

  loadOperationalDummy(); // KPI + Utilization + NDWI Chart
  loadLatestBookings();   // Vessel table
}

document.addEventListener("DOMContentLoaded", initDashboard);

// ===================================================================
// LOAD DUMMY SOURCES (vessels, restareas, ndwi)
// ===================================================================

async function loadOperationalDummy() {
  try {
    const [vRes, rRes, nRes] = await Promise.all([
      fetch(VESSELS_JSON),
      fetch(REST_JSON),
      fetch(NDWI_JSON)
    ]);

    if (!vRes.ok || !rRes.ok || !nRes.ok) {
      throw new Error("Gagal memuat salah satu file dummy");
    }

    VESSELS = await vRes.json();
    RESTS   = await rRes.json();
    NDWI    = await nRes.json();

    refreshKPIsFromDummy();  // KPI
    renderUtilList();        // Rest Area Utilization
    renderNdwiChart();       // NDWI Trend
  } catch (err) {
    console.error("loadOperationalDummy error:", err);
  }
}

// ===================================================================
// KPI (SINKRON 100% dengan MAP)
// ===================================================================

function refreshKPIsFromDummy() {
  const elVessels = document.getElementById("kpiVessels");
  const elType    = document.getElementById("kpiVesselTypes");
  const elSlots   = document.getElementById("kpiSlots");
  const elNdwi    = document.getElementById("kpiNdwi");
  const elUpdate  = document.getElementById("lastUpdate");

  if (!elVessels || !elType || !elSlots || !elNdwi) return;

  // --- 1) Active vessels = jumlah kapal (SAMA DENGAN MAP) ---
  const activeVessels = Array.isArray(VESSELS) ? VESSELS.length : 0;
  elVessels.textContent = activeVessels;

  // --- 2) Dominant vessel type ---
  const counts = VESSELS.reduce((acc, v) => {
    const key = v.type || "Other";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  let domType = "--";
  let max = 0;
  Object.entries(counts).forEach(([k, v]) => {
    if (v > max) {
      max = v;
      domType = k;
    }
  });
  elType.textContent = `${domType} (${max})`;

  // --- 3) Available slots = Σ available (SAMA DENGAN MAP) ---
  let totalAvail = 0;
  RESTS.forEach((r) => {
    totalAvail += Number(r.available ?? 0);
  });
  elSlots.textContent = totalAvail;

  // --- 4) NDWI = NILAI TERAKHIR (SAMA DENGAN MAP) ---
  let ndwiValue = "--";
  if (NDWI && Array.isArray(NDWI.values) && NDWI.values.length) {
    const last = Number(NDWI.values[NDWI.values.length - 1]);
    if (Number.isFinite(last)) ndwiValue = last.toFixed(2);
  }
  elNdwi.textContent = ndwiValue;

  // --- 5) Timestamp update ---
  if (elUpdate) {
    elUpdate.textContent =
      new Date().toLocaleString("id-ID", { hour12: false });
  }
}

// ===================================================================
// REST AREA UTILIZATION
// ===================================================================

function renderUtilList() {
  const root = document.getElementById("utilList");
  if (!root) return;

  root.innerHTML = "";

  RESTS.forEach((r) => {
    const cap   = Number(r.capacity ?? r.cap ?? 0);
    const avail = Number(r.available ?? 0);
    const used  = Math.max(cap - avail, 0);
    const util  = cap ? Math.round((used / cap) * 100) : 0;

    const div = document.createElement("div");
    div.className = "restarea-item";
    div.innerHTML = `
      <div style="flex:1;">
        <div style="font-weight:600;font-size:0.9rem;">${r.name || r.id}</div>
        <div class="muted" style="font-size:0.78rem;margin-top:2px;">
          ${used}/${cap} slots terpakai
        </div>
        <div class="bar" style="margin-top:4px;width:100%;background:#eaf6fb;">
          <span style="width:${util}%;display:block;height:8px;border-radius:999px;background:linear-gradient(90deg,#1f9fcf,#ffd36b);"></span>
        </div>
      </div>
      <div style="margin-left:8px;font-weight:700;font-size:0.9rem;">${util}%</div>
    `;
    root.appendChild(div);
  });
}

// ===================================================================
// NDWI TREND CHART
// ===================================================================

function renderNdwiChart() {
  const canvas = document.getElementById("trendChart");
  if (!canvas || typeof Chart === "undefined" || !NDWI) return;

  const labels = NDWI.weeks || [];
  const values = NDWI.values || [];

  const ctx = canvas.getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "NDWI",
          data: values,
          borderColor: "#1f9fcf",
          backgroundColor: "rgba(31,159,207,0.12)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0.5, max: 0.9, ticks: { stepSize: 0.1 } },
        x: { grid: { display: false } }
      }
    }
  });
}

// ===================================================================
// BACKEND BOOKINGS (fallback ke vessels.json)
// ===================================================================

async function loadLatestBookings() {
  const tbody =
    document.getElementById("vesselTable") ||
    document.getElementById("latest-bookings-body");

  if (!tbody) return;

  try {
    const res = await fetch(`${API_BASE}/api/restareas/bookings`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Gagal load bookings");

    const latest = (Array.isArray(data) ? data : []).slice(0, 10);

    if (!latest.length) return renderVesselTableFromDummy(tbody);

    tbody.innerHTML = latest
      .map((b) => {
        const date = b.created_at ? new Date(b.created_at) : null;
        const tgl = date
          ? date.toLocaleString("id-ID", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })
          : "-";

        return `
          <tr>
            <td>${b.id}</td>
            <td>${b.vessel_name}</td>
            <td>${b.vessel_type}</td>
            <td>${b.eta || "-"}</td>
            <td>Rest Area ${b.rest_area_id} — ${b.status || "pending"} — ${tgl}</td>
          </tr>
        `;
      })
      .join("");
  } catch (err) {
    console.error("loadLatestBookings error:", err);
    renderVesselTableFromDummy(tbody);
  }
}

// fallback jika backend mati
async function renderVesselTableFromDummy(tbody) {
  try {
    if (!VESSELS.length) {
      const res = await fetch(VESSELS_JSON);
      if (res.ok) VESSELS = await res.json();
    }

    const list = VESSELS.slice(0, 10);

    tbody.innerHTML = list
      .map((v) => `
        <tr>
          <td>${v.id}</td>
          <td>${v.name}</td>
          <td>${v.type}</td>
          <td>${v.eta}</td>
          <td>ETA ${v.eta} — ALKI 1</td>
        </tr>
      `)
      .join("");
  } catch (err) {
    console.error("renderVesselTableFromDummy error:", err);
    tbody.innerHTML = `<tr><td colspan="5">Gagal memuat data kapal.</td></tr>`;
  }
}

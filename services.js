const PRICES_URL = "prices.json";

let SERVICES = [];
let CURRENT_SERVICE = null;
let CURRENT_STEP = 1;
let STATE = {
  vesselClass: "passenger",
  mode: "pier",
  qty: 1
};

const CLASS_LABEL = {
  passenger: "Passenger",
  logistics: "Logistics",
  tanker: "Tanker"
};

const MODE_LABEL = {
  pier: "Pier Side",
  mooring: "Mooring Buoy",
  midstream: "Midstream"
};

const ICON_BY_SLUG = {
  fuel_supply: "⛽",
  water_supply: "💧",
  docking: "⚓",
  waste_management: "🗑️",
  maintenance: "🛠️",
  inspection: "🔍",
  survey_ship: "📘",
  emergency: "🚨"
};

// mapping location -> rest area id
function getRestAreaIdFromLocation(location) {
  if (!location) return "R1";
  const loc = location.toLowerCase();
  if (loc.includes("arunika")) return "R1";
  if (loc.includes("samudra")) return "R2";
  if (loc.includes("nirwana")) return "R3";
  return "R1";
}

async function loadServices() {
  try {
    const res = await fetch(PRICES_URL);
    if (!res.ok) throw new Error("Gagal memuat prices.json");
    SERVICES = await res.json();
  } catch (err) {
    console.error(err);
    SERVICES = [];
  }
  renderServices();
}

function renderServices() {
  const grid = document.getElementById("services-grid");
  if (!grid) return;

  if (!SERVICES.length) {
    grid.innerHTML = "<p>Tidak ada data layanan (prices.json kosong / gagal dimuat).</p>";
    return;
  }

  grid.innerHTML = SERVICES.map((s, idx) => {
    const icon = ICON_BY_SLUG[s.slug] || "⚓";

    let hint = "";
    if (s.emergency_response_fee) {
      const minFee = Math.min(
        s.emergency_response_fee.passenger,
        s.emergency_response_fee.logistics,
        s.emergency_response_fee.tanker
      );
      hint = `Emergency Response Fee mulai dari Rp ${minFee.toLocaleString("id-ID")}`;
    } else if (s.pricing) {
      const minPrice = Math.min(
        s.pricing.passenger,
        s.pricing.logistics,
        s.pricing.tanker
      );
      hint = `Mulai dari Rp ${minPrice.toLocaleString("id-ID")} (${CLASS_LABEL.passenger})`;
    }

    return `
      <div class="service-card" onclick="openModal(${idx})">
        <div class="service-icon">${icon}</div>
        <div class="service-title">${s.name}</div>
        <div class="service-location">${s.location || ""}</div>
        <div class="service-desc">${s.description || ""}</div>
        <div class="service-price-hint">${hint}</div>
        <button class="service-btn" type="button">Detail &amp; Pesan</button>
      </div>
    `;
  }).join("");
}

function openModal(index) {
  CURRENT_SERVICE = SERVICES[index];
  CURRENT_STEP = 1;
  STATE = {
    vesselClass: "passenger",
    mode: "pier",
    qty: 1
  };

  document.getElementById("modal-overlay").style.display = "flex";

  if (CURRENT_SERVICE.emergency_response_fee) {
    renderEmergencyStep();
  } else {
    renderNormalStep1();
  }
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
}

/* ===== LAYANAN NORMAL (BUKAN EMERGENCY) ===== */

function renderNormalStep1() {
  const s = CURRENT_SERVICE;
  const box = document.getElementById("modal-content");

  box.innerHTML = `
    <div class="modal-title">${s.name}</div>
    <div class="modal-sub">${s.location || ""} &ndash; ${s.unit || ""}</div>

    <label class="modal-label">Kelas Kapal</label>
    <select id="vesselClass" class="modal-select">
      <option value="passenger">Passenger</option>
      <option value="logistics">Logistics</option>
      <option value="tanker">Tanker</option>
    </select>

    <label class="modal-label">Mode Layanan</label>
    <select id="mode" class="modal-select">
      <option value="pier">Pier Side</option>
      <option value="mooring">Mooring Buoy</option>
      <option value="midstream">Midstream</option>
    </select>

    <label class="modal-label">Jumlah (Qty)</label>
    <input id="qty" type="number" min="1" value="1" class="modal-input" />

    <div class="modal-footer">
      <button class="btn-back" type="button" onclick="closeModal()">Batal</button>
      <button class="btn-next" type="button" onclick="normalNext()">Lanjut</button>
    </div>
  `;
}

function normalNext() {
  const vc = document.getElementById("vesselClass").value;
  const mode = document.getElementById("mode").value;
  const qtyRaw = document.getElementById("qty").value;
  const qty = Math.max(1, parseInt(qtyRaw || "1", 10));

  STATE.vesselClass = vc;
  STATE.mode = mode;
  STATE.qty = qty;

  renderNormalSummary();
}

function renderNormalSummary() {
  const s = CURRENT_SERVICE;
  const box = document.getElementById("modal-content");

  const base = s.pricing[STATE.vesselClass] || 0;
  const surcharge = s.surcharge?.[STATE.mode] || 0;
  const total = base * STATE.qty + surcharge;
  const restAreaId = getRestAreaIdFromLocation(s.location);

  box.innerHTML = `
    <div class="modal-title">Ringkasan Layanan</div>
    <div class="modal-sub">${s.name} &mdash; ${s.location || ""}</div>

    <div class="summary-box">
      <div><b>Layanan:</b> ${s.name}</div>
      <div><b>Rest area:</b> ${restAreaId} &mdash; ${s.location || ""}</div>
      <div><b>Kelas kapal:</b> ${CLASS_LABEL[STATE.vesselClass]}</div>
      <div><b>Mode:</b> ${MODE_LABEL[STATE.mode]}</div>
      <div><b>Jumlah:</b> ${STATE.qty} × Rp ${base.toLocaleString("id-ID")}</div>
      <div><b>Surcharge mode:</b> Rp ${surcharge.toLocaleString("id-ID")}</div>
      <hr />
      <div><b>Est. total biaya:</b> Rp ${total.toLocaleString("id-ID")}</div>
      <div style="margin-top:6px;font-size:12px;color:#6b7a8b;">
        Angka di atas bersifat estimasi untuk prototipe MARSEA dan tidak dikirim ke server (demo berbasis JSON lokal).
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-back" type="button" onclick="renderNormalStep1()">Kembali</button>
      <button class="btn-next" type="button" onclick="submitBooking()">Konfirmasi (Demo)</button>
    </div>
  `;
}

/* "Submit" booking — DEMO TANPA BACKEND */
function submitBooking() {
  const s = CURRENT_SERVICE;
  const restAreaId = getRestAreaIdFromLocation(s.location);

  const vesselTypeMap = {
    passenger: "Passenger",
    logistics: "Logistics",
    tanker: "Tanker"
  };

  const vesselType = vesselTypeMap[STATE.vesselClass] || "Passenger";
  const qty = STATE.qty || 1;

  const msg = [
    "Pemesanan demo MARSEA:",
    `• Layanan: ${s.name}`,
    `• Rest area: ${restAreaId} (${s.location || "-"})`,
    `• Kelas kapal: ${vesselType}`,
    `• Mode: ${STATE.mode}`,
    `• Qty: ${qty}`,
    "",
    "Data ini hanya disimpan di sisi front-end (JSON)."
  ].join("\n");

  alert(msg);
  closeModal();
}

/* ===== EMERGENCY MODE KHUSUS ===== */

function renderEmergencyStep() {
  const s = CURRENT_SERVICE;
  const box = document.getElementById("modal-content");

  const fee = s.emergency_response_fee;

  box.innerHTML = `
    <div class="modal-title">${s.name}</div>
    <div class="modal-sub">${s.location || ""} &ndash; Emergency Response Fee</div>

    <label class="modal-label">Kelas Kapal</label>
    <select id="vesselClassEmergency" class="modal-select">
      <option value="passenger">Passenger &mdash; Rp ${fee.passenger.toLocaleString("id-ID")}</option>
      <option value="logistics">Logistics &mdash; Rp ${fee.logistics.toLocaleString("id-ID")}</option>
      <option value="tanker">Tanker &mdash; Rp ${fee.tanker.toLocaleString("id-ID")}</option>
    </select>

    <div class="summary-box">
      <div><b>Emergency Response Fee</b> adalah biaya pemanggilan awal tim darurat MARSEA.</div>
      <div style="margin-top:6px;">
        <b>Add-ons (biaya tambahan):</b>
        <ul style="margin:4px 0 0 18px;font-size:12px;padding:0;">
          <li>Medical response &ndash; ${s.addons.medical_response}</li>
          <li>Fire response &ndash; ${s.addons.fire_response}</li>
          <li>Towing assistance &ndash; ${s.addons.towing_assistance}</li>
          <li>Underwater emergency &ndash; ${s.addons.underwater_emergency}</li>
          <li>Mechanical breakdown &ndash; ${s.addons.mechanical_breakdown}</li>
        </ul>
      </div>
      <div style="margin-top:6px;font-size:12px;color:#6b7a8b;">
        Mode ini juga hanya demo prototipe (tidak mengirim data ke server).
      </div>
    </div>

    <div class="modal-footer">
      <button class="btn-back" type="button" onclick="closeModal()">Tutup</button>
      <button class="btn-next" type="button" onclick="closeModal()">Mengerti</button>
    </div>
  `;
}

/* INIT */
loadServices();

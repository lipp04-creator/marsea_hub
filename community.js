/* ============================================
   KONFIG BACKEND (BISA DIGANTI KALAU ADA API)
============================================ */
const FEEDS_URL = "community_feeds.json"; // ganti ke endpoint API kalau sudah ada
const ADMIN_WHATSAPP = "6281212345678";  // ganti ke nomor admin MARSEA real

/* ============================================
   DUMMY FEEDS (FALLBACK KALAU FETCH GAGAL)
============================================ */
let FEEDS_FALLBACK = [
  {
    type: "Report",
    icon: "🛢️",
    title: "Oil Spill — Zona C",
    body: "Tumpahan minyak kecil terpantau bergerak ke timur sekitar ±30 meter.",
    meta: "Dilaporkan 2 jam lalu"
  },
  {
    type: "Event",
    icon: "📣",
    title: "Pelatihan Manajemen Harbour Ops",
    body: "Workshop 4 jam membahas koordinasi sandar dan keselamatan kapal.",
    meta: "Event pelatihan internal MARSEA"
  },
  {
    type: "UMKM",
    icon: "🐟",
    title: "Nelayan Kotabumi Buka Suplai Ikan",
    body: "Ikan segar hasil tangkapan langsung, cocok untuk kapal kargo dan nelayan lain.",
    meta: "Baru saja"
  }
];

/* ============================================
   LOAD FEEDS DARI BACKEND / JSON
============================================ */
async function loadFeeds() {
  const grid = document.getElementById("feedGrid");
  const updated = document.getElementById("feedUpdated");

  if (!grid) return;

  let feedsData = FEEDS_FALLBACK;

  try {
    const res = await fetch(FEEDS_URL, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      // backend bisa kirim array langsung, atau {feeds:[...]}
      feedsData = Array.isArray(data) ? data : (data.feeds || FEEDS_FALLBACK);
    }
  } catch (err) {
    console.warn("Gagal memuat community_feeds dari backend, pakai fallback:", err);
  }

  // render
  grid.innerHTML = feedsData.map(f => `
    <article class="feed-card">
      <div class="feed-icon">${f.icon || "📌"}</div>
      <div class="feed-body">
        <div class="feed-title">${f.title || "-"}</div>
        <div class="feed-text">${f.body || ""}</div>
        <div class="feed-meta">${f.meta || ""}</div>
      </div>
    </article>
  `).join("");

  if (updated) {
    const now = new Date();
    updated.textContent = now.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

/* ============================================
   SWITCH LOKASI: DERMAGA <-> KOORDINAT
============================================ */
const modeSelect = document.getElementById("rLocMode");
const pierRow = document.getElementById("rPierRow");
const coordsRow = document.getElementById("rCoordsRow");

if (modeSelect && pierRow && coordsRow) {
  modeSelect.addEventListener("change", () => {
    if (modeSelect.value === "pier") {
      pierRow.style.display = "grid";
      coordsRow.style.display = "none";
    } else {
      pierRow.style.display = "none";
      coordsRow.style.display = "grid";
    }
  });
}

/* ============================================
   KIRIM LAPORAN KE WHATSAPP (BACKEND-READY)
============================================ */
const btnSend = document.getElementById("btnSendReport");

if (btnSend) {
  btnSend.addEventListener("click", () => {
    const name = document.getElementById("rName").value.trim();
    const phone = document.getElementById("rPhone").value.trim();
    const cat = document.getElementById("rCategory").value;
    const mode = document.getElementById("rLocMode").value;
    const pier = document.getElementById("rPier").value;
    const lat = document.getElementById("rLat").value;
    const lng = document.getElementById("rLng").value;
    const desc = document.getElementById("rDesc").value.trim();

    if (!name || !phone || !desc) {
      alert("Nama, nomor WA, dan deskripsi wajib diisi.");
      return;
    }

    let locText = "";
    if (mode === "pier") locText = `Dermaga: ${pier}`;
    else locText = `Koordinat: (${lat || "-"}, ${lng || "-"})`;

    const message = `
LAPORAN BARU — MARSEA
———————————————
Nama: ${name}
Kontak Pelapor: +${phone}

Kategori: ${cat}
Lokasi: ${locText}
———————————————
Deskripsi:
${desc}
    `.trim();

    // ====== HOOK KE BACKEND (opsional) ======
    // Contoh: kirim juga ke endpoint internal MARSEA
    // fetch("/api/reports", {
    //   method: "POST",
    //   headers: {"Content-Type": "application/json"},
    //   body: JSON.stringify({
    //     name, phone, cat, mode, pier, lat, lng, desc, createdAt: new Date().toISOString()
    //   })
    // }).catch(console.error);

    const waUrl = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank");
  });
}

/* ============================================
   SIMPAN DRAFT DI LOCALSTORAGE
============================================ */
const btnDraft = document.getElementById("btnSaveDraftReport");

if (btnDraft) {
  btnDraft.addEventListener("click", () => {
    const draft = {
      name: document.getElementById("rName").value.trim(),
      phone: document.getElementById("rPhone").value.trim(),
      cat: document.getElementById("rCategory").value,
      mode: document.getElementById("rLocMode").value,
      pier: document.getElementById("rPier").value,
      lat: document.getElementById("rLat").value,
      lng: document.getElementById("rLng").value,
      desc: document.getElementById("rDesc").value.trim(),
      savedAt: new Date().toISOString()
    };

    localStorage.setItem("marsea_report_draft", JSON.stringify(draft));
    alert("Draft laporan disimpan di browser kamu.");
  });
}

/* ============================================
   LOAD DRAFT OTOMATIS (KALAU ADA)
============================================ */
function loadDraftIfExists() {
  const raw = localStorage.getItem("marsea_report_draft");
  if (!raw) return;

  try {
    const d = JSON.parse(raw);
    if (document.getElementById("rName")) {
      document.getElementById("rName").value = d.name || "";
      document.getElementById("rPhone").value = d.phone || "";
      document.getElementById("rCategory").value = d.cat || "Oil Spill";
      document.getElementById("rLocMode").value = d.mode || "pier";
      document.getElementById("rPier").value = d.pier || "ARUNIKA";
      document.getElementById("rLat").value = d.lat || "";
      document.getElementById("rLng").value = d.lng || "";
      document.getElementById("rDesc").value = d.desc || "";
      // trigger display pier/coords
      modeSelect.dispatchEvent(new Event("change"));
    }
  } catch (e) {
    console.error("Gagal parsing draft:", e);
  }
}

/* ============================================
   INIT
============================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadFeeds();
  loadDraftIfExists();
});

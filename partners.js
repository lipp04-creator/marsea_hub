const PARTNERS_URL = "list.json";

let PARTNERS = [];
let ACTIVE_CAT = "all";

async function loadPartners() {
  try {
    const res = await fetch(PARTNERS_URL);
    if (!res.ok) throw new Error("Gagal memuat list.json");
    const data = await res.json();
    PARTNERS = data.partners || [];
  } catch (err) {
    console.error(err);
    PARTNERS = [];
  }
  renderPartners();
  initFilter();
}

function initFilter() {
  const bar = document.getElementById("filterBar");
  if (!bar) return;

  bar.querySelectorAll(".filter-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      bar.querySelectorAll(".filter-chip").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      ACTIVE_CAT = btn.dataset.cat;
      renderPartners();
    });
  });
}

function renderPartners() {
  const grid = document.getElementById("partnersGrid");
  if (!grid) return;

  const data = PARTNERS.filter(p => {
    if (ACTIVE_CAT === "all") return true;
    return p.category === ACTIVE_CAT;
  });

  if (!data.length) {
    grid.innerHTML = `<div class="partner-empty">Belum ada mitra untuk kategori ini.</div>`;
    return;
  }

  grid.innerHTML = data.map(p => partnerCard(p)).join("");
}

function partnerCard(p) {
  const name = p.name || "Mitra Tanpa Nama";
  const initials = name.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");

  const logo = p.logo ? `
    <img src="assets/logos/${p.logo}" alt="${name}" onerror="this.style.display='none';this.parentElement.textContent='${initials}';" />
  ` : initials;

  const services = Array.isArray(p.services) ? p.services : [];

  const phone = p.contact?.phone || "";
  const website = p.contact?.website || "";

  const waLink = phone
    ? `https://wa.me/${phone.replace(/\D/g,"")}`
    : "";

  return `
    <article class="partner-card">
      <div class="partner-head">
        <div class="partner-logo">
          ${logo}
        </div>
        <div>
          <div class="partner-name">${name}</div>
          <span class="partner-category">${p.category || ""}</span>
        </div>
      </div>

      <div class="partner-services">
        ${services.map(s => `<span class="service-pill">${s}</span>`).join("")}
      </div>

      <div class="partner-contact">
        <div>
          ${phone ? `📞 +${phone}` : "Kontak belum tersedia"}
        </div>
        <div>
          ${waLink ? `<a href="${waLink}" target="_blank">WhatsApp</a>` : ""}
          ${website ? ` | <a href="${website}" target="_blank">Website</a>` : ""}
        </div>
      </div>
    </article>
  `;
}

loadPartners();

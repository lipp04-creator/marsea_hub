document.addEventListener("DOMContentLoaded", () => {

  // --- ELEMENTS ---
  const lastUpdateEl     = document.getElementById("lastUpdate");
  const kpiVesselsEl     = document.getElementById("kpiVessels");
  const kpiSlotsEl       = document.getElementById("kpiSlots");
  const kpiNdwiEl        = document.getElementById("kpiNdwi");
  const kpiAlertsEl      = document.getElementById("kpiAlerts");
  const alkiMapEl        = document.getElementById("alkiMap");
  const marseaMapEl      = document.getElementById("marseaMap");
  const alkiShipListEl   = document.getElementById("alkiShipList");
  const marseaDockListEl = document.getElementById("marseaDockList");
  const marseaSummaryEl  = document.getElementById("marseaSummary");
  const tabButtons       = document.querySelectorAll(".tab-btn");
  const panels           = document.querySelectorAll(".map-panel");
  const filterGroup      = document.getElementById("alkiFilterGroup");

  let alkiMap, marseaMap;
  let vessels = [];
  let restAreas = [];
  let alkiMarkers = [];
  let currentFilter = "all";

  // --- INITIAL TIMESTAMP ---
  if (lastUpdateEl) {
    lastUpdateEl.textContent = new Date().toLocaleString("id-ID", { hour12: false });
  }

  // --- COLOR HELPER ---
  function colorForType(type) {
    switch (type) {
      case "Passenger": return "#2778ff";
      case "Logistics": return "#ff8c42";
      case "Tanker": return "#ff4d4f";
      case "Operational": return "#2aa55b";
      default: return "#555";
    }
  }

  // --- MAP INIT ---
  function initAlkiMap() {
    if (!alkiMapEl) return;

    alkiMap = L.map("alkiMap", {
      center: [-5.98, 105.98],
      zoom: 9
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(alkiMap);

    setTimeout(() => alkiMap.invalidateSize(), 300);
  }

  function initMarseaMap() {
    if (!marseaMapEl) return;

    marseaMap = L.map("marseaMap", {
      center: [-5.985, 105.9868],
      zoom: 14
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(marseaMap);

    setTimeout(() => marseaMap.invalidateSize(), 300);
  }

  // --- LOAD VESSELS (vessels.json) ---
  async function loadVessels() {
    try {
      const res = await fetch("vessels.json");
      vessels = res.ok ? await res.json() : [];
      if (kpiVesselsEl) kpiVesselsEl.textContent = vessels.length;
    } catch (e) {
      vessels = [];
      if (kpiVesselsEl) kpiVesselsEl.textContent = "0";
    }
  }

  // --- LOAD REST AREAS (restareas.json) ---
  async function loadRestAreas() {
    try {
      const res  = await fetch("restareas.json");
      const data = res.ok ? await res.json() : [];

      restAreas = Array.isArray(data) ? data.map((r) => ({
        id:        r.id,
        name:      r.name,
        lat:       r.lat,
        lng:       r.lng,
        capacity:  Number(r.capacity ?? 0),
        used:      Number(r.used ?? 0),
        available: Number(r.available ?? 0),
        roles:     r.roles || r.function || "-"
      })) : [];

      if (!restAreas.length) {
        restAreas = [
          { id: "R1", name: "MARSEA Arunika", lat: -5.986667, lng: 105.985839, capacity: 12, used: 8, available: 4, roles: "Penumpang & Logistik" },
          { id: "R2", name: "MARSEA Samudra", lat: -5.985630, lng: 105.986457, capacity: 10, used: 4, available: 6, roles: "Logistik & Tanker" },
          { id: "R3", name: "MARSEA Nirwana", lat: -5.984948, lng: 105.988268, capacity: 8,  used: 5, available: 3, roles: "Campuran" }
        ];
      }

      if (kpiSlotsEl) {
        const total = restAreas.reduce((a, r) => a + r.available, 0);
        kpiSlotsEl.textContent = total;
      }

    } catch (err) {
      console.error("Gagal load restarea:", err);

      restAreas = [
        { id: "R1", name: "MARSEA Arunika", lat: -5.986667, lng: 105.985839, capacity: 12, used: 8, available: 4, roles: "Penumpang & Logistik" },
        { id: "R2", name: "MARSEA Samudra", lat: -5.985630, lng: 105.986457, capacity: 10, used: 4, available: 6, roles: "Logistik & Tanker" },
        { id: "R3", name: "MARSEA Nirwana", lat: -5.984948, lng: 105.988268, capacity: 8,  used: 5, available: 3, roles: "Campuran" }
      ];

      if (kpiSlotsEl) {
        const total = restAreas.reduce((a, r) => a + r.available, 0);
        kpiSlotsEl.textContent = total;
      }
    }
  }

  // --- LOAD NDWI (ndwi.json) ---
  async function loadNdwi() {
    try {
      const res = await fetch("ndwi.json");
      const data = res.ok ? await res.json() : null;
      if (data && Array.isArray(data.values) && data.values.length) {
        kpiNdwiEl.textContent = data.values[data.values.length - 1].toFixed(2);
      } else {
        kpiNdwiEl.textContent = "0.75";
      }
    } catch {
      kpiNdwiEl.textContent = "0.75";
    }
  }

  // --- ALERTS ---
  function initAlerts() {
    if (kpiAlertsEl) kpiAlertsEl.textContent = "0";
  }

  // --- RENDER ALKI SHIPS ---
  function clearAlkiMarkers() {
    if (!alkiMap) return;
    alkiMarkers.forEach(m => alkiMap.removeLayer(m));
    alkiMarkers = [];
  }

  function renderAlkiShips() {
    if (!alkiMap) return;
    clearAlkiMarkers();
    if (alkiShipListEl) alkiShipListEl.innerHTML = "";

    const list = currentFilter === "all"
      ? vessels
      : vessels.filter(v => v.type === currentFilter);

    const bounds = [];

    list.forEach(v => {
      const lat = v.lat;
      const lng = v.lng ?? v.lon;
      if (lat == null || lng == null) return;

      const color = colorForType(v.type);

      const marker = L.circleMarker([lat, lng], {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 0.9
      }).addTo(alkiMap);

      marker.bindPopup(`
        <strong>${v.name}</strong><br>
        Tipe: ${v.type}<br>
        ETA: ${v.eta}
      `);

      alkiMarkers.push(marker);
      bounds.push([lat, lng]);

      if (alkiShipListEl) {
        const li = document.createElement("button");
        li.className = "ship-item";
        li.innerHTML = `
          <span class="ship-badge" style="background:${color}"></span>
          <div>
            <div class="ship-meta-title">${v.name}</div>
            <div class="ship-meta-sub">${v.type} • ETA ${v.eta}</div>
          </div>
        `;
        li.onclick = () => {
          alkiMap.setView([lat, lng], 12);
          marker.openPopup();
        };

        alkiShipListEl.appendChild(li);
      }
    });

    if (bounds.length) alkiMap.fitBounds(bounds, { padding: [30, 30] });
  }

  // --- RENDER MARSEA ---
  function renderMarsea() {
    if (!marseaMap) return;

    if (marseaDockListEl) marseaDockListEl.innerHTML = "";

    // clear overlays (kecuali tile layer)
    marseaMap.eachLayer(l => {
      if (l instanceof L.TileLayer) return;
      marseaMap.removeLayer(l);
    });

    const bounds = [];
    let totalCap = 0;
    let totalAvail = 0;

    restAreas.forEach(r => {
      bounds.push([r.lat, r.lng]);
      totalCap   += r.capacity;
      totalAvail += r.available;

      const circle = L.circle([r.lat, r.lng], {
        radius: 240,
        color: "#1f9fcf",
        fillColor: "#1f9fcf",
        fillOpacity: 0.15
      }).addTo(marseaMap);

      const dot = L.circleMarker([r.lat, r.lng], {
        radius: 7,
        color: "#16a56b",
        fillColor: "#16a56b",
        fillOpacity: 0.9
      }).addTo(marseaMap);

      const popup = `
        <strong>${r.name}</strong><br>
        ${r.available}/${r.capacity} slot<br>
        Fungsional: ${r.roles}
      `;
      circle.bindPopup(popup);
      dot.bindPopup(popup);

      if (marseaDockListEl) {
        const item = document.createElement("button");
        item.className = "dock-item";
        item.innerHTML = `
          <div>
            <div class="ship-meta-title">${r.name}</div>
            <div class="ship-meta-sub">${r.available}/${r.capacity} slot • ${r.roles}</div>
          </div>
        `;
        item.onclick = () => {
          marseaMap.setView([r.lat, r.lng], 16);
          dot.openPopup();
        };

        marseaDockListEl.appendChild(item);
      }
    });

    if (restAreas.length && bounds.length) {
      const center = L.latLngBounds(bounds).getCenter();
      marseaMap.setView(center, 14);
    }

    if (marseaSummaryEl) {
      marseaSummaryEl.innerHTML = `
        Total dermaga: ${restAreas.length}<br>
        Kapasitas total: ${totalCap}<br>
        Slot tersedia: ${totalAvail}
      `;
    }
  }

  // --- FILTER ---
  function setupFilter() {
    if (!filterGroup) return;
    const buttons = filterGroup.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
      btn.onclick = () => {
        currentFilter = btn.dataset.type;
        buttons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderAlkiShips();
      };
    });
  }

  // --- TABS ---
  function setupTabs() {
    tabButtons.forEach(btn => {
      btn.onclick = () => {
        const target = btn.dataset.target;

        tabButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        panels.forEach(p => {
          p.classList.toggle("active", p.id === target);
        });

        setTimeout(() => {
          if (target === "alkiPanel" && alkiMap) alkiMap.invalidateSize();
          if (target === "marseaPanel" && marseaMap) marseaMap.invalidateSize();
        }, 250);
      };
    });
  }

  // --- INIT PAGE ---
  async function initPage() {
    initAlkiMap();
    initMarseaMap();
    setupTabs();
    setupFilter();
    initAlerts();

    await Promise.all([
      loadVessels(),
      loadRestAreas(),
      loadNdwi()
    ]);

    renderAlkiShips();
    renderMarsea();
  }

  initPage();
});

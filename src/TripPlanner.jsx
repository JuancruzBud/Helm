import { useState, useRef, useEffect } from "react";

const DEST_COLORS = [
  "#E8637A",
  "#FC8C45",
  "#F5C842",
  "#4CAF7D",
  "#42A5F5",
  "#9C6FF5",
  "#F06292",
  "#26C6DA",
];

function flag(code) {
  if (!code || code.length !== 2) return "🌍";
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 127397));
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371,
    r = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(r((lat2 - lat1) / 2)) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r((lng2 - lng1) / 2)) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)));
}

const ORDS = [
  "Primera",
  "Segunda",
  "Tercera",
  "Cuarta",
  "Quinta",
  "Sexta",
  "Séptima",
  "Octava",
  "Novena",
  "Décima",
];
const stopLabel = (i) => (ORDS[i] || `${i + 1}ª`) + " parada";

function fmtShort(ds) {
  if (!ds) return "";
  const d = new Date(ds + "T00:00:00");
  return `${d.getDate()}/${d.toLocaleString("es", { month: "short" })}`;
}

function loadLeaflet(cb) {
  if (window.L) {
    cb();
    return;
  }
  if (document.getElementById("_tp_ljs")) {
    document.getElementById("_tp_ljs").addEventListener("load", cb);
    return;
  }
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  document.head.appendChild(css);
  const js = document.createElement("script");
  js.id = "_tp_ljs";
  js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  js.onload = cb;
  document.head.appendChild(js);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ROOT – map fills entire viewport */
.tp {
  position: relative;
  height: 100vh; width: 100vw;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  overflow: hidden;
}

/* FULLSCREEN MAP */
#tp-map {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* ── SIDEBAR ── floating on top of map */
.tp-sb {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 280px;
  background: #EEF3F8;
  z-index: 20;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0,0,0,0.09);
}

.tp-sb-top { padding: 22px 16px 14px; }

.tp-trip-row {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 14px;
}
.tp-trip-name {
  flex: 1; border: none; outline: none;
  font-family: inherit; font-size: 20px; font-weight: 700;
  color: #1a1a1a; background: transparent; padding: 0;
}
.tp-trip-name::placeholder { color: #bbb; }
.tp-edit-ico {
  font-size: 14px; color: #aaa; cursor: pointer;
  padding: 5px; border-radius: 8px; transition: all 0.15s; flex-shrink: 0;
}
.tp-edit-ico:hover { background: rgba(0,0,0,0.06); color: #555; }

/* Search */
.tp-search-wrap { position: relative; }
.tp-search-box {
  width: 100%;
  background: rgba(255,255,255,0.75);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 12px;
  padding: 10px 14px 10px 36px;
  font-family: inherit; font-size: 13px; color: #222;
  outline: none; transition: all 0.2s;
}
.tp-search-box:focus { background: #fff; border-color: rgba(0,0,0,0.15); box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
.tp-search-box::placeholder { color: #999; }
.tp-search-ico { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #999; pointer-events: none; font-size: 13px; }

.tp-search-drop {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0;
  background: #fff; border-radius: 14px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.12); z-index: 200;
  overflow: hidden; border: 1px solid #ebebeb;
}
.tp-si { padding: 10px 14px; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f5f5f5; transition: background 0.15s; }
.tp-si:last-child { border-bottom: none; }
.tp-si:hover { background: #f7f7f7; }
.tp-si-name { font-weight: 500; color: #222; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tp-si-country { font-size: 11px; color: #aaa; white-space: nowrap; }

/* Destination list */
.tp-list { flex: 1; overflow-y: auto; padding: 6px 0; }
.tp-list::-webkit-scrollbar { width: 3px; }
.tp-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
.tp-empty { padding: 48px 20px; text-align: center; color: #aaa; font-size: 13px; line-height: 1.8; }

.tp-dest-row {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; cursor: pointer;
  transition: background 0.15s; user-select: none;
}
.tp-dest-row:hover { background: rgba(255,255,255,0.55); }
.tp-dest-row.sel { background: rgba(255,255,255,0.75); }
.tp-dest-row.dragging { opacity: 0.25; }
.tp-dest-row.drag-over { background: rgba(255,255,255,0.4); outline: 1.5px dashed rgba(0,0,0,0.18); outline-offset: -2px; }

.tp-handle { color: rgba(0,0,0,0.18); cursor: grab; font-size: 13px; flex-shrink: 0; }
.tp-handle:active { cursor: grabbing; }

.tp-flag-circle {
  width: 32px; height: 32px; border-radius: 50%;
  background: white; box-shadow: 0 1px 6px rgba(0,0,0,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0; overflow: hidden;
}

.tp-dest-info { flex: 1; min-width: 0; }
.tp-dest-name { font-size: 14px; font-weight: 600; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tp-dest-dates { font-size: 11px; color: #888; margin-top: 1px; }

.tp-order-btns { display: flex; flex-direction: column; gap: 1px; }
.tp-ico-btn { background: none; border: none; cursor: pointer; width: 24px; height: 20px; border-radius: 5px; color: #bbb; font-size: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-family: inherit; }
.tp-ico-btn:hover { background: rgba(255,255,255,0.8); color: #444; }
.tp-ico-btn.red:hover { background: rgba(220,50,50,0.1); color: #e55; }
.tp-row-del { opacity: 0; transition: opacity 0.15s; }
.tp-dest-row:hover .tp-row-del { opacity: 1; }

/* Summary */
.tp-summary { margin: 6px 12px 12px; background: white; border-radius: 18px; padding: 14px 14px 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
.tp-sum-title { font-size: 13px; font-weight: 700; color: #1a1a1a; margin-bottom: 1px; }
.tp-sum-dates { font-size: 11px; color: #aaa; margin-bottom: 12px; }
.tp-sum-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.tp-sum-card { background: #F4F7FA; border-radius: 12px; padding: 10px 12px; }
.tp-sum-val { font-size: 18px; font-weight: 700; color: #1a1a1a; line-height: 1; }
.tp-sum-val span { font-size: 12px; font-weight: 400; color: #666; margin-left: 2px; }
.tp-sum-lbl { font-size: 10px; color: #aaa; margin-top: 3px; font-weight: 500; }

/* ── FLOATING DETAIL PANEL ── */
.tp-panel {
  position: absolute;
  top: 16px; right: 16px;
  z-index: 50;
  background: white;
  border-radius: 20px;
  box-shadow: 0 8px 48px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06);
  overflow: hidden;
  transition: width 0.32s cubic-bezier(0.4,0,0.2,1);
}
.tp-panel.mini { width: 260px; }
.tp-panel.full { width: 420px; max-height: calc(100vh - 40px); display: flex; flex-direction: column; }

/* Mini state */
.tp-mini-head { padding: 18px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tp-mini-city { font-size: 17px; font-weight: 700; color: #1a1a1a; }
.tp-mini-stop { font-size: 12px; color: #aaa; margin-top: 2px; }
.tp-panel-icon-btn { width: 32px; height: 32px; border-radius: 50%; background: #f4f4f4; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 15px; color: #555; transition: background 0.15s; flex-shrink: 0; }
.tp-panel-icon-btn:hover { background: #e8e8e8; }

/* Full state */
.tp-full-head { padding: 18px 20px 0; display: flex; align-items: center; gap: 12px; }
.tp-panel-flag { width: 40px; height: 40px; border-radius: 50%; background: #f4f7fa; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
.tp-panel-title-wrap { flex: 1; min-width: 0; }
.tp-panel-city { font-size: 20px; font-weight: 700; color: #1a1a1a; }
.tp-panel-stop-lbl { font-size: 12px; color: #aaa; margin-top: 2px; }

/* Tabs */
.tp-tabs { display: flex; padding: 14px 20px 0; border-bottom: 1px solid #f0f0f0; }
.tp-tab { padding: 8px 12px; font-size: 13px; font-weight: 500; color: #aaa; background: none; border: none; cursor: pointer; border-bottom: 2.5px solid transparent; font-family: inherit; margin-bottom: -1px; transition: color 0.2s, border-color 0.2s; white-space: nowrap; }
.tp-tab.on { color: #1a1a1a; border-bottom-color: #1a1a1a; }
.tp-tab:hover:not(.on) { color: #444; }

.tp-body { flex: 1; overflow-y: auto; padding: 20px; }
.tp-body::-webkit-scrollbar { width: 3px; }
.tp-body::-webkit-scrollbar-thumb { background: #eee; border-radius: 3px; }

/* Form fields */
.tp-field { margin-bottom: 16px; }
.tp-lbl { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #aaa; margin-bottom: 6px; }
.tp-inp { width: 100%; border: 1.5px solid #ebebeb; border-radius: 12px; padding: 10px 14px; font-family: inherit; font-size: 14px; color: #222; background: #fff; outline: none; transition: border-color 0.2s; }
.tp-inp:focus { border-color: #1a1a1a; }
.tp-inp::placeholder { color: #ccc; }
textarea.tp-inp { resize: vertical; line-height: 1.6; min-height: 80px; }
.tp-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

/* Days */
.tp-sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.tp-sec-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #aaa; }
.tp-add-btn { background: #f4f4f4; border: none; border-radius: 8px; padding: 6px 12px; color: #333; font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.15s; }
.tp-add-btn:hover { background: #e8e8e8; }

.tp-day-card { border: 1.5px solid #f0f0f0; border-radius: 14px; margin-bottom: 10px; overflow: hidden; }
.tp-day-card:focus-within { border-color: #ddd; }
.tp-day-head { display: flex; align-items: center; padding: 9px 14px; background: #fafafa; gap: 10px; }
.tp-day-num { font-size: 12px; font-weight: 600; color: #555; flex-shrink: 0; }
.tp-day-date-in { flex: 1; font-family: inherit; font-size: 12px; color: #aaa; background: none; border: none; outline: none; cursor: pointer; }
.tp-day-body { padding: 10px 14px; }
.tp-day-text { width: 100%; font-family: inherit; font-size: 13px; line-height: 1.6; color: #222; background: none; border: none; outline: none; resize: none; min-height: 54px; }
.tp-day-text::placeholder { color: #ccc; }

.tp-notes { width: 100%; min-height: 200px; border: 1.5px solid #ebebeb; border-radius: 14px; padding: 14px; font-family: inherit; font-size: 14px; line-height: 1.7; color: #222; background: #fff; outline: none; resize: vertical; transition: border-color 0.2s; }
.tp-notes:focus { border-color: #1a1a1a; }
.tp-notes::placeholder { color: #ccc; }

/* Links */
.tp-link-row { display: flex; align-items: center; gap: 8px; border: 1.5px solid #f0f0f0; border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
.tp-link-row:focus-within { border-color: #ddd; }
.tp-link-in { flex: 1; border: none; outline: none; font-family: inherit; font-size: 13px; color: #222; background: none; min-width: 0; }
.tp-link-in::placeholder { color: #ccc; }
.tp-link-div { width: 1px; height: 14px; background: #eee; flex-shrink: 0; }
.tp-link-go { color: #666; font-size: 14px; text-decoration: none; flex-shrink: 0; transition: color 0.15s; }
.tp-link-go:hover { color: #111; }

/* Map click prompt */
.tp-prompt {
  position: absolute;
  background: #fff; border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
  padding: 18px 20px; z-index: 200;
  min-width: 220px; border: 1px solid #ebebeb;
  transform: translate(-50%, calc(-100% - 14px));
  pointer-events: all;
}
.tp-prompt-name { font-size: 16px; font-weight: 700; color: #1a1a1a; }
.tp-prompt-sub { font-size: 12px; color: #aaa; margin-top: 2px; margin-bottom: 14px; }
.tp-prompt-btns { display: flex; gap: 8px; }
.tp-btn { flex: 1; padding: 9px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; transition: all 0.15s; }
.tp-btn:active { transform: scale(0.97); }
.tp-btn-yes { background: #1a1a1a; color: #fff; }
.tp-btn-yes:hover { background: #333; }
.tp-btn-no { background: #f4f4f4; color: #222; }
.tp-btn-no:hover { background: #e8e8e8; }

/* Leaflet custom markers */
.tp-mk { width: 30px; height: 30px; border-radius: 50%; border: 2.5px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.22); cursor: pointer; font-family: 'Inter', sans-serif; transition: box-shadow 0.2s, transform 0.2s; }
.tp-mk.sel { box-shadow: 0 2px 12px rgba(0,0,0,0.3), 0 0 0 5px rgba(255,255,255,0.35); transform: scale(1.15); }
.leaflet-container { font-family: 'Inter', sans-serif !important; }
.leaflet-control-attribution { font-size: 10px !important; }
`;

export default function TripPlanner() {
  const [tripName, setTripName] = useState("Viaje a Europa 2026");
  const [destinations, setDestinations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [mapPrompt, setMapPrompt] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef(null);
  const searchTimer = useRef(null);
  const nameRef = useRef(null);

  const selected = destinations.find((d) => d.id === selectedId);
  const selectedIdx = destinations.findIndex((d) => d.id === selectedId);

  // Computed summary stats
  const totalDays = destinations.reduce((s, d) => {
    if (!d.dateFrom || !d.dateTo) return s;
    const n =
      Math.round((new Date(d.dateTo) - new Date(d.dateFrom)) / 86400000) + 1;
    return n > 0 ? s + n : s;
  }, 0);

  const countries = [
    ...new Set(destinations.map((d) => d.country).filter(Boolean)),
  ];

  const totalKm = destinations.reduce((s, d, i) => {
    if (i === 0) return 0;
    return (
      s +
      haversineKm(
        destinations[i - 1].lat,
        destinations[i - 1].lng,
        d.lat,
        d.lng
      )
    );
  }, 0);

  const tripStart = destinations.reduce(
    (m, d) => (!d.dateFrom ? m : !m || d.dateFrom < m ? d.dateFrom : m),
    null
  );
  const tripEnd = destinations.reduce(
    (m, d) => (!d.dateTo ? m : !m || d.dateTo > m ? d.dateTo : m),
    null
  );

  // Inject CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // Init map
  useEffect(() => {
    loadLeaflet(() => {
      if (mapRef.current || !mapDivRef.current) return;
      const L = window.L;
      const map = L.map(mapDivRef.current, {
        center: [48, 14],
        zoom: 4,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      map.on("click", async (e) => {
        const { lat, lng } = e.latlng;
        const pt = e.containerPoint;
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es&zoom=10`
          );
          const d = await r.json();
          const name =
            d.address?.city ||
            d.address?.town ||
            d.address?.village ||
            d.address?.municipality ||
            d.address?.county ||
            d.name;
          if (name)
            setMapPrompt({
              x: pt.x,
              y: pt.y,
              lat,
              lng,
              name,
              country: d.address?.country || "",
              countryCode: d.address?.country_code || "",
            });
        } catch {}
      });

      mapRef.current = map;
    });
  }, []);

  // Sync markers + route
  useEffect(() => {
    if (!mapRef.current || !window.L) return;
    const L = window.L,
      map = mapRef.current;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    routeRef.current?.remove();
    routeRef.current = null;

    destinations.forEach((dest, i) => {
      const color = DEST_COLORS[dest.colorIndex];
      const isSel = dest.id === selectedId;
      const icon = L.divIcon({
        className: "",
        html: `<div class="tp-mk${
          isSel ? " sel" : ""
        }" style="background:${color}">${i + 1}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const m = L.marker([dest.lat, dest.lng], { icon })
        .addTo(map)
        .on("click", () => {
          setSelectedId(dest.id);
          setPanelExpanded(true);
          setActiveTab("info");
        });
      markersRef.current.push(m);
    });

    if (destinations.length > 1) {
      routeRef.current = L.polyline(
        destinations.map((d) => [d.lat, d.lng]),
        { color: "#1a1a1a", weight: 1.5, opacity: 0.3, dashArray: "6 5" }
      ).addTo(map);
    }
  }, [destinations, selectedId]);

  // Search with debounce
  const doSearch = (q) => {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            q
          )}&format=json&limit=5&addressdetails=1&accept-language=es`
        );
        const data = await r.json();
        setSearchResults(
          data.map((item) => ({
            name: item.display_name.split(",")[0].trim(),
            country: item.address?.country || "",
            countryCode: item.address?.country_code || "",
            lat: +item.lat,
            lng: +item.lon,
          }))
        );
      } catch {
        setSearchResults([]);
      }
    }, 450);
  };

  const addDest = (name, country, countryCode, lat, lng) => {
    const id = Date.now();
    setDestinations((prev) => [
      ...prev,
      {
        id,
        name,
        country,
        countryCode,
        lat,
        lng,
        colorIndex: prev.length % DEST_COLORS.length,
        dateFrom: "",
        dateTo: "",
        hotel: "",
        transport: "",
        budget: "",
        todos: "",
        notes: "",
        days: [],
        links: [],
      },
    ]);
    setSearchQuery("");
    setSearchResults([]);
    setSelectedId(id);
    setPanelExpanded(true);
    setActiveTab("info");
    setMapPrompt(null);
    mapRef.current?.flyTo([lat, lng], Math.max(mapRef.current.getZoom(), 5), {
      duration: 1,
    });
  };

  const removeDest = (id) => {
    setDestinations((prev) => prev.filter((d) => d.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const update = (id, field, val) =>
    setDestinations((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: val } : d))
    );

  // Auto-generate days from date range
  const syncDays = (id, from, to) => {
    setDestinations((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        let days = d.days;
        if (
          from &&
          to &&
          new Date(from + "T00:00:00") <= new Date(to + "T00:00:00")
        ) {
          const byDate = {};
          d.days.forEach((day) => {
            if (day.date) byDate[day.date] = day;
          });
          days = [];
          const cur = new Date(from + "T00:00:00");
          const end = new Date(to + "T00:00:00");
          while (cur <= end) {
            const ds = `${cur.getFullYear()}-${String(
              cur.getMonth() + 1
            ).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`;
            days.push(
              byDate[ds] || {
                id: Date.now() + Math.random(),
                date: ds,
                notes: "",
              }
            );
            cur.setDate(cur.getDate() + 1);
          }
        }
        return { ...d, dateFrom: from, dateTo: to, days };
      })
    );
  };

  const addDay = (id) =>
    setDestinations((prev) =>
      prev.map((d) =>
        d.id !== id
          ? d
          : { ...d, days: [...d.days, { id: Date.now(), date: "", notes: "" }] }
      )
    );
  const updateDay = (did, dayId, f, v) =>
    setDestinations((prev) =>
      prev.map((d) =>
        d.id !== did
          ? d
          : {
              ...d,
              days: d.days.map((day) =>
                day.id === dayId ? { ...day, [f]: v } : day
              ),
            }
      )
    );
  const removeDay = (did, dayId) =>
    setDestinations((prev) =>
      prev.map((d) =>
        d.id !== did
          ? d
          : { ...d, days: d.days.filter((day) => day.id !== dayId) }
      )
    );
  const addLink = (id) =>
    setDestinations((prev) =>
      prev.map((d) =>
        d.id !== id
          ? d
          : {
              ...d,
              links: [...d.links, { id: Date.now(), title: "", url: "" }],
            }
      )
    );
  const updateLink = (did, lid, f, v) =>
    setDestinations((prev) =>
      prev.map((d) =>
        d.id !== did
          ? d
          : {
              ...d,
              links: d.links.map((l) => (l.id === lid ? { ...l, [f]: v } : l)),
            }
      )
    );
  const removeLink = (did, lid) =>
    setDestinations((prev) =>
      prev.map((d) =>
        d.id !== did ? d : { ...d, links: d.links.filter((l) => l.id !== lid) }
      )
    );

  const moveUp = (i) => {
    if (i === 0) return;
    setDestinations((prev) => {
      const a = [...prev];
      [a[i - 1], a[i]] = [a[i], a[i - 1]];
      return a;
    });
  };
  const moveDown = (i) =>
    setDestinations((prev) => {
      if (i >= prev.length - 1) return prev;
      const a = [...prev];
      [a[i], a[i + 1]] = [a[i + 1], a[i]];
      return a;
    });

  return (
    <div className="tp">
      {/* FULLSCREEN MAP */}
      <div id="tp-map" ref={mapDivRef} />

      {/* MAP CLICK PROMPT */}
      {mapPrompt && (
        <div
          className="tp-prompt"
          style={{ left: mapPrompt.x, top: mapPrompt.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="tp-prompt-name">
            {flag(mapPrompt.countryCode)} {mapPrompt.name}
          </div>
          <div className="tp-prompt-sub">
            {mapPrompt.country} · ¿Agregar al recorrido?
          </div>
          <div className="tp-prompt-btns">
            <button
              className="tp-btn tp-btn-yes"
              onClick={() =>
                addDest(
                  mapPrompt.name,
                  mapPrompt.country,
                  mapPrompt.countryCode,
                  mapPrompt.lat,
                  mapPrompt.lng
                )
              }
            >
              + Agregar
            </button>
            <button
              className="tp-btn tp-btn-no"
              onClick={() => setMapPrompt(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── LEFT SIDEBAR ── */}
      <div className="tp-sb">
        <div className="tp-sb-top">
          <div className="tp-trip-row">
            <input
              ref={nameRef}
              className="tp-trip-name"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              placeholder="Nombre del viaje..."
            />
            <span
              className="tp-edit-ico"
              onClick={() => nameRef.current?.focus()}
            >
              ✏️
            </span>
          </div>

          <div className="tp-search-wrap">
            <span className="tp-search-ico">🔍</span>
            <input
              className="tp-search-box"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => doSearch(e.target.value)}
              onBlur={() => setTimeout(() => setSearchResults([]), 200)}
            />
            {searchResults.length > 0 && (
              <div className="tp-search-drop">
                {searchResults.map((r, i) => (
                  <div
                    key={i}
                    className="tp-si"
                    onMouseDown={() =>
                      addDest(r.name, r.country, r.countryCode, r.lat, r.lng)
                    }
                  >
                    <span style={{ fontSize: 16 }}>{flag(r.countryCode)}</span>
                    <span className="tp-si-name">{r.name}</span>
                    <span className="tp-si-country">{r.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Destination list */}
        <div className="tp-list">
          {destinations.length === 0 ? (
            <div className="tp-empty">
              Buscá una ciudad o tocá
              <br />
              en el mapa para empezar ✈️
            </div>
          ) : (
            destinations.map((dest, i) => (
              <div
                key={dest.id}
                className={`tp-dest-row${selectedId === dest.id ? " sel" : ""}${
                  dragIndex === i ? " dragging" : ""
                }${dragOver === i ? " drag-over" : ""}`}
                onClick={() => {
                  setSelectedId(dest.id);
                  setPanelExpanded(true);
                  setActiveTab("info");
                }}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) {
                    const a = [...destinations];
                    const [m] = a.splice(dragIndex, 1);
                    a.splice(i, 0, m);
                    setDestinations(a);
                  }
                  setDragIndex(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOver(null);
                }}
              >
                <span className="tp-handle">⋮</span>
                <div className="tp-flag-circle">{flag(dest.countryCode)}</div>
                <div className="tp-dest-info">
                  <div className="tp-dest-name">{dest.name}</div>
                  {(dest.dateFrom || dest.dateTo) && (
                    <div className="tp-dest-dates">
                      {fmtShort(dest.dateFrom)}
                      {dest.dateFrom && dest.dateTo ? " - " : ""}
                      {fmtShort(dest.dateTo)}
                    </div>
                  )}
                </div>
                <div className="tp-order-btns">
                  <button
                    className="tp-ico-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveUp(i);
                    }}
                  >
                    ▲
                  </button>
                  <button
                    className="tp-ico-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveDown(i);
                    }}
                  >
                    ▼
                  </button>
                </div>
                <div className="tp-row-del">
                  <button
                    className="tp-ico-btn red"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDest(dest.id);
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {destinations.length > 0 && (
          <div className="tp-summary">
            <div className="tp-sum-title">Resumen de tu viaje</div>
            <div className="tp-sum-dates">
              {tripStart && tripEnd
                ? `Desde el ${fmtShort(tripStart)} hasta el ${fmtShort(
                    tripEnd
                  )}`
                : "Cargá fechas para ver el resumen"}
            </div>
            <div className="tp-sum-grid">
              <div className="tp-sum-card">
                <div className="tp-sum-val">
                  {totalDays || "—"}
                  <span>{totalDays ? "días" : ""}</span>
                </div>
                <div className="tp-sum-lbl">Duración total</div>
              </div>
              <div className="tp-sum-card">
                <div className="tp-sum-val">
                  {totalKm > 0 ? totalKm.toLocaleString("es") : "—"}
                  <span>{totalKm > 0 ? "km" : ""}</span>
                </div>
                <div className="tp-sum-lbl">Km recorridos</div>
              </div>
              <div className="tp-sum-card">
                <div className="tp-sum-val">{destinations.length}</div>
                <div className="tp-sum-lbl">Ciudades</div>
              </div>
              <div className="tp-sum-card">
                <div className="tp-sum-val">{countries.length || "—"}</div>
                <div className="tp-sum-lbl">Países</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FLOATING DETAIL PANEL ── */}
      {selected && (
        <div className={`tp-panel ${panelExpanded ? "full" : "mini"}`}>
          {/* COLLAPSED / MINI */}
          {!panelExpanded && (
            <div className="tp-mini-head">
              <div>
                <div className="tp-mini-city">{selected.name}</div>
                <div className="tp-mini-stop">{stopLabel(selectedIdx)}</div>
              </div>
              <button
                className="tp-panel-icon-btn"
                onClick={() => setPanelExpanded(true)}
                title="Expandir"
              >
                ⤢
              </button>
            </div>
          )}

          {/* EXPANDED / FULL */}
          {panelExpanded && (
            <>
              <div className="tp-full-head">
                <div className="tp-panel-flag">
                  {flag(selected.countryCode)}
                </div>
                <div className="tp-panel-title-wrap">
                  <div className="tp-panel-city">{selected.name}</div>
                  <div className="tp-panel-stop-lbl">
                    {stopLabel(selectedIdx)}
                  </div>
                </div>
                <button
                  className="tp-panel-icon-btn"
                  onClick={() => setPanelExpanded(false)}
                  title="Colapsar"
                >
                  ⤡
                </button>
              </div>

              <div className="tp-tabs">
                {[
                  ["info", "Información"],
                  ["dias", "Rutina diaria"],
                  ["links", "Links"],
                  ["notas", "Notas"],
                ].map(([k, l]) => (
                  <button
                    key={k}
                    className={`tp-tab${activeTab === k ? " on" : ""}`}
                    onClick={() => setActiveTab(k)}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div className="tp-body">
                {activeTab === "info" && (
                  <>
                    <div className="tp-field">
                      <label className="tp-lbl">Fechas</label>
                      <div className="tp-two-col">
                        <input
                          className="tp-inp"
                          type="date"
                          value={selected.dateFrom}
                          onChange={(e) =>
                            syncDays(
                              selected.id,
                              e.target.value,
                              selected.dateTo
                            )
                          }
                        />
                        <input
                          className="tp-inp"
                          type="date"
                          value={selected.dateTo}
                          onChange={(e) =>
                            syncDays(
                              selected.id,
                              selected.dateFrom,
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="tp-field">
                      <label className="tp-lbl">Alojamiento</label>
                      <input
                        className="tp-inp"
                        placeholder="Hotel, Airbnb, hostel..."
                        value={selected.hotel}
                        onChange={(e) =>
                          update(selected.id, "hotel", e.target.value)
                        }
                      />
                    </div>
                    <div className="tp-field">
                      <label className="tp-lbl">Transporte de llegada</label>
                      <input
                        className="tp-inp"
                        placeholder="Vuelo, tren, bus..."
                        value={selected.transport}
                        onChange={(e) =>
                          update(selected.id, "transport", e.target.value)
                        }
                      />
                    </div>
                    <div className="tp-field">
                      <label className="tp-lbl">Presupuesto estimado</label>
                      <input
                        className="tp-inp"
                        placeholder="Ej: €500"
                        value={selected.budget}
                        onChange={(e) =>
                          update(selected.id, "budget", e.target.value)
                        }
                      />
                    </div>
                    <div className="tp-field">
                      <label className="tp-lbl">Pendientes</label>
                      <textarea
                        className="tp-inp"
                        rows={3}
                        placeholder="Visa, vacunas, reservas..."
                        value={selected.todos}
                        onChange={(e) =>
                          update(selected.id, "todos", e.target.value)
                        }
                      />
                    </div>
                  </>
                )}

                {activeTab === "dias" && (
                  <>
                    <div className="tp-sec-head">
                      <span className="tp-sec-title">
                        {selected.days.length > 0
                          ? `${selected.days.length} día${
                              selected.days.length !== 1 ? "s" : ""
                            }`
                          : "Rutina diaria"}
                      </span>
                      <button
                        className="tp-add-btn"
                        onClick={() => addDay(selected.id)}
                      >
                        + Día
                      </button>
                    </div>
                    {selected.days.length === 0 && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#aaa",
                          lineHeight: 1.7,
                          textAlign: "center",
                          padding: "20px 0",
                        }}
                      >
                        Cargá las fechas en <strong>Información</strong> para
                        generar los días automáticamente.
                      </p>
                    )}
                    {selected.days.map((day, i) => (
                      <div key={day.id} className="tp-day-card">
                        <div className="tp-day-head">
                          <span className="tp-day-num">Día {i + 1}</span>
                          <input
                            className="tp-day-date-in"
                            type="date"
                            value={day.date}
                            onChange={(e) =>
                              updateDay(
                                selected.id,
                                day.id,
                                "date",
                                e.target.value
                              )
                            }
                          />
                          <button
                            className="tp-ico-btn red"
                            onClick={() => removeDay(selected.id, day.id)}
                          >
                            ✕
                          </button>
                        </div>
                        <div className="tp-day-body">
                          <textarea
                            className="tp-day-text"
                            rows={3}
                            placeholder="Actividades, restaurantes, museos..."
                            value={day.notes}
                            onChange={(e) =>
                              updateDay(
                                selected.id,
                                day.id,
                                "notes",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {activeTab === "links" && (
                  <>
                    <div className="tp-sec-head">
                      <span className="tp-sec-title">Links útiles</span>
                      <button
                        className="tp-add-btn"
                        onClick={() => addLink(selected.id)}
                      >
                        + Link
                      </button>
                    </div>
                    {selected.links.length === 0 && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#aaa",
                          textAlign: "center",
                          padding: "20px 0",
                          lineHeight: 1.7,
                        }}
                      >
                        Reservas, tours, restaurantes, vuelos...
                      </p>
                    )}
                    {selected.links.map((link) => (
                      <div key={link.id} className="tp-link-row">
                        <input
                          className="tp-link-in"
                          placeholder="Título"
                          value={link.title}
                          style={{ flex: "0 0 90px" }}
                          onChange={(e) =>
                            updateLink(
                              selected.id,
                              link.id,
                              "title",
                              e.target.value
                            )
                          }
                        />
                        <div className="tp-link-div" />
                        <input
                          className="tp-link-in"
                          placeholder="https://..."
                          value={link.url}
                          onChange={(e) =>
                            updateLink(
                              selected.id,
                              link.id,
                              "url",
                              e.target.value
                            )
                          }
                        />
                        {link.url && (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tp-link-go"
                          >
                            ↗
                          </a>
                        )}
                        <button
                          className="tp-ico-btn red"
                          onClick={() => removeLink(selected.id, link.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </>
                )}

                {activeTab === "notas" && (
                  <div className="tp-field">
                    <label className="tp-lbl">
                      Notas sobre {selected.name}
                    </label>
                    <textarea
                      className="tp-notes"
                      placeholder={`Anotá todo sobre ${selected.name}...\nRecomendaciones, idioma, moneda, tips...`}
                      value={selected.notes}
                      onChange={(e) =>
                        update(selected.id, "notes", e.target.value)
                      }
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

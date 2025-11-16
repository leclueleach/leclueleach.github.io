// dashboard.js
// Hook Banana Dashboard UI to Supabase data

// 1) Supabase init – fill in your own URL + anon key
const SUPABASE_URL = 'https://mwasxsyfowbciwhbrbmx.supabase.co'; // <-- your project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13YXN4c3lmb3diY2l3aGJyYm14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NzY4ODAsImV4cCI6MjA3ODM1Mjg4MH0.d76mOXeX3ZP2F_-X36FRSOshO2W-AVyJTHTOJY6VJlg';                    // <-- your anon public key

console.log('SUPABASE_URL in dashboard.js:', SUPABASE_URL);

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// expose globally if needed elsewhere
window.supabaseClient = supabaseClient;

// Chart.js instances
let revenueChartInstance = null;
let volumeChartInstance = null;

// --------------------------------------------------
// On load
// --------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  console.log("✅ dashboard.js DOMContentLoaded fired");

  try {
    const shipments = await fetchAllShipments();
    console.log("✅ shipments loaded:", shipments.length);

    window._allShipmentsCache = shipments; // cache for filters later

    if (!shipments.length) {
      console.warn("⚠️ No shipment data found");
      return;
    }

    // Cards + lists
    renderScorecards(shipments);
    renderRecentShipments(shipments);
    renderTopProducts(shipments);

    // Charts
    renderRevenueChart(shipments);
    renderTradeVolumeChart(shipments);
  } catch (err) {
    console.error("Error initialising dashboard:", err);
  }
});

// --------------------------------------------------
// DATA FETCH
// --------------------------------------------------
async function fetchAllShipments() {
  const { data, error } = await supabaseClient
    .from("vw_shipment_item_enriched")
    .select("*");

  if (error) {
    console.error("Supabase error fetching shipments:", error);
    return [];
  }

  return data.map((row) => ({
    ...row,
    departure_date: row.departure_date ? new Date(row.departure_date) : null,
    arrival_date: row.arrival_date ? new Date(row.arrival_date) : null,
  }));
}

// --------------------------------------------------
// SCORECARDS
// --------------------------------------------------
function renderScorecards(rows) {
  const totalRevenue = rows.reduce(
    (sum, r) => sum + Number(r.total_value_usd || 0),
    0
  );

  const exportVolume = rows
    .filter((r) => r.trade_type_code === "EXPORT")
    .reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  const importVolume = rows
    .filter((r) => r.trade_type_code === "IMPORT")
    .reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  const routeSet = new Set(
    rows.map(
      (r) =>
        `${r.origin_iso || r.origin_country}-${
          r.destination_iso || r.destination_country
        }`
    )
  );
  const activeRoutes = routeSet.size;

  const scoreValues = document.querySelectorAll(".scorecard-value");
  if (scoreValues.length >= 4) {
    scoreValues[0].textContent = formatCurrency(totalRevenue);
    scoreValues[1].textContent = formatNumber(exportVolume) + " units";
    scoreValues[2].textContent = formatNumber(importVolume) + " units";
    scoreValues[3].textContent = formatNumber(activeRoutes);
  }
}

// --------------------------------------------------
// RECENT SHIPMENTS
// --------------------------------------------------
function renderRecentShipments(rows) {
  const shipmentsMap = new Map();

  rows.forEach((r) => {
    if (!shipmentsMap.has(r.shipment_id)) {
      shipmentsMap.set(r.shipment_id, {
        shipment_id: r.shipment_id,
        invoice_number: r.invoice_number,
        departure_date: r.departure_date,
        arrival_date: r.arrival_date,
        shipment_status: r.shipment_status,
        trade_type_code: r.trade_type_code,
        destination_country: r.destination_country,
        destination_iso: r.destination_iso,
        category_name: r.category_name,
      });
    }
  });

  const shipments = Array.from(shipmentsMap.values());

  shipments.sort((a, b) => {
    const da = a.departure_date ? a.departure_date.getTime() : 0;
    const db = b.departure_date ? b.departure_date.getTime() : 0;
    return db - da;
  });

  const topShipments = shipments.slice(0, 4);
  const listEl = document.querySelector(".shipments-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  topShipments.forEach((s) => {
    const tagClass =
      s.trade_type_code === "EXPORT"
        ? "shipment-tag--export"
        : "shipment-tag--import";

    const tagLabel = s.trade_type_code === "EXPORT" ? "Export" : "Import";
    const statusClass = getStatusClass(s.shipment_status);
    const timeLabel = formatShipmentDuration(s);
    const locationText = `📍 ${s.destination_country || "Unknown"}`;

    const row = document.createElement("div");
    row.className = "shipment-row";
    row.innerHTML = `
      <div class="shipment-main">
        <div class="shipment-top">
          <div class="shipment-top-left">
            <span class="shipment-code">${s.invoice_number}</span>
            <span class="shipment-tag ${tagClass}">${tagLabel}</span>
          </div>
          <div class="shipment-status-pill ${statusClass}">
            ${s.shipment_status || ""}
          </div>
        </div>

        <div class="shipment-title">${s.category_name || "N/A"}</div>

        <div class="shipment-meta">
          <span class="shipment-location">${locationText}</span>
          <span class="shipment-time">⏱ ${timeLabel}</span>
        </div>
      </div>
    `;
    listEl.appendChild(row);
  });
}

function getStatusClass(status) {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("transit")) return "status--in-transit";
  if (s.includes("custom")) return "status--customs";
  if (s.includes("deliver")) return "status--delivered";
  if (s.includes("process")) return "status--processing";
  return "";
}

function formatShipmentDuration(s) {
  if (!s.departure_date) return "Unknown";

  const now = new Date();

  if (
    s.arrival_date &&
    s.shipment_status &&
    s.shipment_status.toLowerCase().includes("deliver")
  ) {
    return "Completed";
  }

  const diffMs = now.getTime() - s.departure_date.getTime();
  if (diffMs <= 0) return "0 days";

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

// --------------------------------------------------
// TOP PRODUCTS (by category)
// --------------------------------------------------
function renderTopProducts(rows) {
  const byCategory = new Map();

  rows.forEach((r) => {
    const key = r.category_name || "Uncategorised";
    if (!byCategory.has(key)) {
      byCategory.set(key, {
        category_name: key,
        revenue: 0,
        shipments: new Set(),
      });
    }
    const entry = byCategory.get(key);
    entry.revenue += Number(r.total_value_usd || 0);
    entry.shipments.add(r.shipment_id);
  });

  const list = Array.from(byCategory.values()).map((entry) => ({
    category_name: entry.category_name,
    revenue: entry.revenue,
    shipments_count: entry.shipments.size,
  }));

  list.sort((a, b) => b.revenue - a.revenue);
  const top = list.slice(0, 5);

  const listEl = document.querySelector(".products-list");
  if (!listEl) return;

  listEl.innerHTML = "";

  top.forEach((p, idx) => {
    const row = document.createElement("div");
    row.className = "product-row";
    row.innerHTML = `
      <div class="product-left">
        <div class="product-rank">${idx + 1}</div>
        <div class="product-text">
          <div class="product-name">${p.category_name}</div>
          <div class="product-sub">${p.shipments_count} shipments</div>
        </div>
      </div>
      <div class="product-right">
        <div class="product-value">${formatCurrency(p.revenue)}</div>
        <div class="product-change positive">+0.0%</div>
      </div>
    `;
    listEl.appendChild(row);
  });
}

// --------------------------------------------------
// Monthly aggregation for charts
// --------------------------------------------------
function buildMonthlyBuckets(rows) {
  const buckets = new Map();

  rows.forEach((r) => {
    if (!r.departure_date) return;

    const d = r.departure_date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        importRevenue: 0,
        exportRevenue: 0,
        importQty: 0,
        exportQty: 0,
      });
    }

    const bucket = buckets.get(key);
    const value = Number(r.total_value_usd || 0);
    const qty = Number(r.quantity || 0);

    if (r.trade_type_code === "IMPORT") {
      bucket.importRevenue += value;
      bucket.importQty += qty;
    } else if (r.trade_type_code === "EXPORT") {
      bucket.exportRevenue += value;
      bucket.exportQty += qty;
    }
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const keys = Array.from(buckets.keys()).sort();
  const labels = keys.map((key) => {
    const [year, month] = key.split("-");
    return `${monthNames[Number(month) - 1]} ${year}`;
  });

  const importRevenue = keys.map((k) => buckets.get(k).importRevenue);
  const exportRevenue = keys.map((k) => buckets.get(k).exportRevenue);
  const importQty = keys.map((k) => buckets.get(k).importQty);
  const exportQty = keys.map((k) => buckets.get(k).exportQty);

  return { labels, importRevenue, exportRevenue, importQty, exportQty };
}

// --------------------------------------------------
// Revenue Trends (line chart)
// --------------------------------------------------
function renderRevenueChart(rows) {
  const canvas = document.getElementById("revenueChart");
  if (!canvas || !window.Chart) return;

  const ctx = canvas.getContext("2d");
  const { labels, importRevenue, exportRevenue } = buildMonthlyBuckets(rows);

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  revenueChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Import Revenue",
          data: importRevenue,
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "Export Revenue",
          data: exportRevenue,
          borderWidth: 2,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y || 0;
              return `${ctx.dataset.label}: ${formatCurrency(v)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
        y: {
          ticks: {
            color: "#9ca3af",
            callback: (value) => formatShortNumber(value),
          },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
      },
    },
  });
}

// --------------------------------------------------
// Trade Volume (bar chart)
// --------------------------------------------------
function renderTradeVolumeChart(rows) {
  const canvas = document.getElementById("volumeChart");
  if (!canvas || !window.Chart) return;

  const ctx = canvas.getContext("2d");
  const { labels, importQty, exportQty } = buildMonthlyBuckets(rows);

  if (volumeChartInstance) {
    volumeChartInstance.destroy();
  }

  volumeChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Import Volume",
          data: importQty,
          borderWidth: 1,
        },
        {
          label: "Export Volume",
          data: exportQty,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y || 0;
              return `${ctx.dataset.label}: ${formatNumber(v)} units`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: "#9ca3af" },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
        y: {
          ticks: {
            color: "#9ca3af",
            callback: (value) => formatShortNumber(value),
          },
          grid: { color: "rgba(148, 163, 184, 0.15)" },
        },
      },
    },
  });
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------
function formatCurrency(value) {
  const num = Number(value || 0);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatNumber(value) {
  const num = Number(value || 0);
  return num.toLocaleString("en-US");
}

function formatShortNumber(value) {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}



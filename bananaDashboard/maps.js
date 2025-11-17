// maps.js – Global Trade map powered by Supabase

document.addEventListener("DOMContentLoaded", async () => {
  const mapBody = document.querySelector(".map-body");
  const tooltip = document.getElementById("map-tooltip");

  if (!mapBody || !tooltip) return;

  try {
    // 1) Load SVG from map.html
    const resp = await fetch("map.html");
    if (!resp.ok) {
      console.error("Could not load map.html", resp.status);
      return;
    }

    const svgMarkup = await resp.text();

    const wrapper = document.createElement("div");
    wrapper.innerHTML = svgMarkup.trim();

    const svg = wrapper.querySelector("svg");
    if (!svg) {
      console.error("No <svg> found in map.html");
      return;
    }

    // Ensure the SVG has the id we expect
    svg.id = "world-map";

    // Insert SVG before the tooltip inside .map-body
    mapBody.insertBefore(svg, tooltip);

    // 2) Build trade data from Supabase
    let tradeData = {};
    let maxShipments = 0;

    try {
      const supabaseClient = window.supabaseClient;
      if (!supabaseClient) {
        console.warn("supabaseClient not found on window; using empty map data.");
      } else {
        const { data, error } = await supabaseClient
          .from("vw_shipment_item_enriched")
          .select(
            "shipment_id, trade_type_code, destination_iso, destination_country"
          );

        if (error) {
          throw error;
        }

        const tmp = {};

        (data || []).forEach((row) => {
          const isoRaw = row.destination_iso;
          if (!isoRaw) return;

          const iso = String(isoRaw).toUpperCase();
          if (!tmp[iso]) {
            tmp[iso] = {
              name: row.destination_country || iso,
              shipmentsSet: new Set(),
              exports: 0,
              imports: 0,
            };
          }

          const entry = tmp[iso];
          entry.shipmentsSet.add(row.shipment_id);

          if (row.trade_type_code === "EXPORT") {
            entry.exports += 1;
          } else if (row.trade_type_code === "IMPORT") {
            entry.imports += 1;
          }
        });

        let totalShipments = 0;

        Object.keys(tmp).forEach((iso) => {
          const entry = tmp[iso];
          const shipmentsCount = entry.shipmentsSet.size;
          entry.shipments = shipmentsCount;
          delete entry.shipmentsSet;
          totalShipments += shipmentsCount;
          if (shipmentsCount > maxShipments) {
            maxShipments = shipmentsCount;
          }
        });

        tradeData = {};
        Object.keys(tmp).forEach((iso) => {
          const entry = tmp[iso];
          const pct =
            totalShipments > 0
              ? Math.round((entry.shipments * 100) / totalShipments)
              : 0;
          tradeData[iso] = {
            name: entry.name,
            pct,
            shipments: entry.shipments,
            exports: entry.exports,
            imports: entry.imports,
          };
        });
      }
    } catch (err) {
      console.error("Error building trade data for map:", err);
      tradeData = {};
      maxShipments = 0;
    }

    // 3) Colour countries + tooltips
    const paths = svg.querySelectorAll("path[id]");

    paths.forEach((path) => {
      const code = String(path.id || "").toUpperCase();
      const info = tradeData[code];

      // ensure base class
      path.classList.add("country");
      path.classList.remove("low", "medium", "high");

      if (!info || !maxShipments) {
        // no data for this country – keep it very dark
        path.classList.add("low");
      } else {
        const share = info.shipments / maxShipments;
        let intensity = "low";
        if (share >= 0.6) {
          intensity = "high";
        } else if (share >= 0.3) {
          intensity = "medium";
        }
        path.classList.add(intensity);
      }

      // Hover tooltip
      path.addEventListener("mousemove", (evt) => {
        const details = info || {
          name: code || "Unknown",
          pct: 0,
          shipments: 0,
          exports: 0,
          imports: 0,
        };

        const { name, pct, shipments, exports, imports } = details;

        tooltip.innerHTML = `
          <div style="font-weight:600;margin-bottom:2px;">${name}</div>
          <div>${pct}% of trade volume</div>
          <div>${shipments.toLocaleString()} shipments</div>
          <div>${exports.toLocaleString()} exports</div>
          <div>${imports.toLocaleString()} imports</div>
        `;

        const rect = mapBody.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;

        tooltip.style.left = x + "px";
        tooltip.style.top = y + "px";
        tooltip.style.opacity = "1";
      });

      path.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
      });
    });
  } catch (err) {
    console.error("Error loading map:", err);
  }
});

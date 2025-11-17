// maps.js – Global Trade map powered by Supabase

document.addEventListener("DOMContentLoaded", async () => {
  const mapBody = document.querySelector(".map-body");
  const tooltip = document.getElementById("map-tooltip");

  if (!mapBody || !tooltip) return;

  // Map SVG class names → ISO codes for paths that don't have an id
  const svgClassToIso = {
    "United States": "US",
    Canada: "CA",
    China: "CN",
    Australia: "AU",
    // Germany: "DE",
    // Add more if your SVG uses names instead of ids
    // "United Kingdom": "GB",
    // "South Korea": "KR",
  };

  // Fallback: map destination_country → ISO
  const countryNameToIso = {
    "South Africa": "ZA",
    China: "CN",
    // Add more if destination_iso is null for those rows, e.g.:
    // "United States": "US",
    // Canada: "CA",
    Germany: "DE",
    // "United Kingdom": "GB",
    // ...
  };

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
          // Try ISO code first
          let isoRaw = row.destination_iso;

          // If missing / null, fall back to country name
          if (!isoRaw && row.destination_country) {
            const mappedIso = countryNameToIso[row.destination_country.trim()];
            if (mappedIso) {
              isoRaw = mappedIso;
            } else {
              // Helpful debug so you can see which country names aren't mapped yet
              console.debug(
                "[Map] No ISO mapping for destination_country:",
                row.destination_country
              );
            }
          }

          // Still nothing? skip this row for the map
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
    const paths = svg.querySelectorAll("path");

    paths.forEach((path) => {
      // Base style
      path.classList.add("country");
      path.classList.remove("low", "medium", "high");

      // 1) Prefer id (e.g. IN, BR, ZA)
      let rawCode = (path.id || "").trim();

      // 2) If no id, fall back to class → ISO mapping
      if (!rawCode) {
        const clsAttr = (path.getAttribute("class") || "").trim();
        if (clsAttr) {
          const classes = clsAttr.split(/\s+/);
          for (const cls of classes) {
            if (svgClassToIso[cls]) {
              rawCode = svgClassToIso[cls];
              break;
            }
          }
        }
      }

      // Still nothing? just draw the outline, no data
      if (!rawCode) {
        path.classList.add("low");
        return;
      }

      const code = rawCode.toUpperCase();
      const info = tradeData[code];

      // ⛔ No data for this country → keep dark, NO tooltip handlers
      if (!info || !info.shipments || !maxShipments) {
        path.classList.add("low");
        return;
      }

      // We have real data → colour by intensity
      const share = info.shipments / maxShipments;
      let intensity = "low";
      if (share >= 0.6) {
        intensity = "high";
      } else if (share >= 0.3) {
        intensity = "medium";
      }
      path.classList.add(intensity);

      // ✅ Only attach tooltip for countries with real data
      path.addEventListener("mousemove", (evt) => {
        const { name, pct, shipments, exports, imports } = info;

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




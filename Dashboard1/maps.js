// maps.js
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

    // 2) Dummy trade data (keys must match your SVG's path ids, e.g. US, ZA, CN...)
    const tradeData = {
      US: {
        name: "United States",
        pct: 28,
        shipments: 3200,
        exports: 1900,
        imports: 1300,
      },
      CA: {
        name: "Canada",
        pct: 9,
        shipments: 1100,
        exports: 600,
        imports: 500,
      },
      BR: {
        name: "Brazil",
        pct: 6,
        shipments: 800,
        exports: 500,
        imports: 300,
      },
      ZA: {
        name: "South Africa",
        pct: 4,
        shipments: 500,
        exports: 320,
        imports: 180,
      },
      CN: {
        name: "China",
        pct: 22,
        shipments: 2800,
        exports: 2200,
        imports: 600,
      },
      IN: {
        name: "India",
        pct: 11,
        shipments: 1500,
        exports: 900,
        imports: 600,
      },
      AU: {
        name: "Australia",
        pct: 5,
        shipments: 600,
        exports: 350,
        imports: 250,
      },
      // add more as you map your SVG ids...
    };

    // Helper: decide intensity from % of trade volume
    function getIntensityClass(pct) {
      if (pct >= 20) return "high";
      if (pct >= 8) return "medium";
      if (pct > 0) return "low";
      return "";
    }

    const paths = svg.querySelectorAll("path");

    paths.forEach((path) => {
      // Make sure the base map style applies
      path.classList.add("country");

      const rawId = (path.id || "").trim();
      if (!rawId) {
        // No id → we can't attach data
        return;
      }

      const iso = rawId.toUpperCase();
      const data = tradeData[iso];

      // No data → no colouring, no tooltip, just base map
      if (!data) return;

      const { name, pct, shipments, exports, imports } = data;

      // Intensity class
      const intensityClass = getIntensityClass(pct);
      if (intensityClass) {
        path.classList.add(intensityClass);
      }

      // Tooltip + hover behaviour ONLY for countries with data
      path.addEventListener("mousemove", (evt) => {
        // build tooltip HTML
        tooltip.innerHTML = `
          <div><strong>${name}</strong></div>
          <div>${pct}% of trade volume</div>
          <div>${shipments.toLocaleString()} shipments</div>
          <div>${exports.toLocaleString()} exports</div>
          <div>${imports.toLocaleString()} imports</div>
        `;

        // position tooltip relative to the .map-body
        const rect = mapBody.getBoundingClientRect();
        const x = evt.clientX - rect.left;
        const y = evt.clientY - rect.top;

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
        tooltip.style.opacity = "1";
      });

      path.addEventListener("mouseleave", () => {
        tooltip.style.opacity = "0";
      });

      // ❌ No click handler anymore (no selection)
    });
  } catch (err) {
    console.error("Error loading map:", err);
  }
});

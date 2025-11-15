document.addEventListener("DOMContentLoaded", () => {
  const dropdowns = document.querySelectorAll(".custom-dropdown");
  let openDropdown = null;

  dropdowns.forEach((dropdown) => {
    const toggleBtn = dropdown.querySelector(".dropdown-toggle");
    const labelSpan = dropdown.querySelector(".dropdown-label");
    const menu = dropdown.querySelector(".dropdown-menu");
    const options = menu.querySelectorAll(".dropdown-option");
    const isMulti = dropdown.dataset.multi === "true";

    // First option = default
    const firstOption = options[0];
    const firstText = firstOption
      ? firstOption.querySelector(".option-text").textContent.trim()
      : "";

    // ---- helper for multi-select labels ----
    function updateMultiLabel() {
      let selected = [...options].filter((o) =>
        o.classList.contains("selected")
      );

      // If nothing selected, force the first option to stay selected
      if (selected.length === 0 && firstOption) {
        firstOption.classList.add("selected");
        selected = [firstOption];
      }

      // Build label from selected option texts
      const names = selected.map((o) =>
        o.querySelector(".option-text").textContent.trim()
      );

      // Join names with comma + space
      labelSpan.textContent = names.join(", ");
    }

    // ---- INITIALISE DEFAULT SELECTION ----
    if (firstOption) {
      firstOption.classList.add("selected");
      labelSpan.textContent = firstText; // e.g. "Current Month", "All Regions"
    }

    // ---- OPEN / CLOSE ----
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      // Close any other open dropdown
      if (openDropdown && openDropdown !== dropdown) {
        openDropdown.classList.remove("open");
      }

      dropdown.classList.toggle("open");
      openDropdown = dropdown.classList.contains("open") ? dropdown : null;
    });

    // ---- OPTION CLICK HANDLING ----
    options.forEach((option) => {
      option.addEventListener("click", (e) => {
        e.stopPropagation();

        const optionText = option
          .querySelector(".option-text")
          .textContent.trim();

        if (!isMulti) {
          // SINGLE SELECT
          options.forEach((o) => o.classList.remove("selected"));
          option.classList.add("selected");
          labelSpan.textContent = optionText;
          dropdown.classList.remove("open");
          openDropdown = null;
        } else {
          // MULTI SELECT
          const isFirst = option === firstOption;

          if (isFirst) {
            // Clicking the "All ..." option:
            // - clear everything else
            // - keep only this one selected
            options.forEach((o) => o.classList.remove("selected"));
            option.classList.add("selected");
          } else {
            // Toggle this option
            option.classList.toggle("selected");

            if (option.classList.contains("selected")) {
              // If any specific option is selected, turn off "All ..."
              if (firstOption) firstOption.classList.remove("selected");
            }

            // If you manually unselect everything, updateMultiLabel()
            // will re-select the first option for you.
          }

          updateMultiLabel();
        }
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => {
    if (openDropdown) {
      openDropdown.classList.remove("open");
      openDropdown = null;
    }
  });
});

(() => {
  const stateWeight = new Map([["A", 5], ["P", 4], ["C", 3], ["\u2014", 2], ["?", 1]]);

  const valueFor = (cell, type) => {
    const raw = (cell.dataset.sortValue || cell.textContent).trim();
    if (type === "number") return Number(raw.replace(/[^0-9.-]/g, "")) || 0;
    if (type === "date") return Date.parse(raw) || 0;
    if (type === "state") return stateWeight.get(raw) || 0;
    return raw.toLocaleLowerCase();
  };

  document.querySelectorAll("[data-sortable-table]").forEach((table) => {
    const body = table.tBodies[0];
    if (!body) return;
    const originalOrder = new Map([...body.rows].map((row, index) => [row, index]));

    table.querySelectorAll("thead .sort-button").forEach((button) => {
      const heading = button.closest("th");
      const index = Number(button.dataset.sortIndex);
      const type = button.dataset.sortType || "text";

      button.addEventListener("click", () => {
        const wasActive = button.classList.contains("is-sorted");
        const descending = wasActive
          ? !button.classList.contains("desc")
          : ["number", "date", "state"].includes(type);
        const rows = [...body.rows];

        rows.sort((aRow, bRow) => {
          const av = valueFor(aRow.cells[index], type);
          const bv = valueFor(bRow.cells[index], type);
          const result = typeof av === "number"
            ? av - bv
            : av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
          return (descending ? -result : result)
            || originalOrder.get(aRow) - originalOrder.get(bRow);
        });

        table.querySelectorAll("thead th").forEach((th) => th.removeAttribute("aria-sort"));
        table.querySelectorAll(".sort-button").forEach((control) => control.classList.remove("is-sorted", "desc"));
        button.classList.add("is-sorted");
        if (descending) button.classList.add("desc");
        heading.setAttribute("aria-sort", descending ? "descending" : "ascending");
        body.append(...rows);
      });
    });
  });

  const nav = document.querySelector(".vhi-section-nav");
  if (!nav) return;

  const navScroll = nav.querySelector(".vhi-section-nav-scroll");
  const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
  const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
  const reduceNavMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let active = -1;
  let navFrame = null;
  let initialized = false;

  const reveal = (index, animate = initialized) => {
    const link = navLinks[index];
    if (!link || !navScroll) return;
    const target = link.offsetLeft - (navScroll.clientWidth - link.offsetWidth) / 2;
    navScroll.scrollTo({
      left: Math.max(0, target),
      behavior: animate && !reduceNavMotion.matches ? "smooth" : "auto"
    });
  };

  const select = (index, shouldReveal = true) => {
    if (index < 0 || index === active) return;
    active = index;
    navLinks.forEach((link, linkIndex) => {
      link.classList.toggle("is-active", linkIndex === index);
      if (linkIndex === index) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    if (shouldReveal) reveal(index);
  };

  const syncNavigation = (animate = initialized) => {
    navFrame = null;
    const marker = window.innerHeight * .34;
    let index = 0;
    sections.forEach((section, sectionIndex) => {
      if (section && section.getBoundingClientRect().top <= marker) index = sectionIndex;
    });
    select(index, animate);
  };

  navLinks.forEach((link, index) => link.addEventListener("click", () => select(index, false)));
  window.addEventListener("scroll", () => {
    if (navFrame === null) navFrame = requestAnimationFrame(() => syncNavigation(true));
  }, { passive: true });
  window.addEventListener("resize", () => reveal(active, false));

  const hashIndex = navLinks.findIndex((link) => link.getAttribute("href") === location.hash);
  if (hashIndex >= 0) select(hashIndex, false);
  else syncNavigation(false);
  initialized = true;
})();

(() => {
  const stateWeight = new Map([["A", 5], ["P", 4], ["C", 3], ["\u2014", 2], ["?", 1]]);
  const countsMarkup = (a, c) => '<div class="vhi-counts"><span class="vhi-count count-a">A <b>' + a + '</b></span><span class="vhi-count count-c">C <b>' + c + '</b></span></div>';
  const allRows = [...document.querySelectorAll(".vhi-table tbody tr")];

  const records = allRows.map((row, originalOrder) => {
    row.querySelector(".combo-count")?.remove();
    const states = [...row.querySelectorAll(".state-cell .vhi-state")];
    const values = states.map((state) => state.textContent.trim());
    const a = values.filter((value) => value === "A").length;
    const c = values.filter((value) => value === "C").length;
    const score = a * 2 + c;
    row.dataset.a = a;
    row.dataset.c = c;
    row.dataset.originalOrder = originalOrder;
    if (a >= 2) {
      row.classList.add("has-a-combo");
      row.dataset.combo = a;
    } else {
      row.classList.remove("has-a-combo");
      delete row.dataset.combo;
    }
    const countCell = row.cells[1]?.classList.contains("counts-cell") ? row.cells[1] : row.insertCell(1);
    countCell.className = "counts-cell";
    countCell.dataset.sortValue = score;
    countCell.innerHTML = countsMarkup(a, c);
    return { row, states, a, c, score, originalOrder };
  });

  const bestBody = document.querySelector(".vhi-best-table tbody");
  if (bestBody) {
    const best = [...records]
      .sort((x, y) => y.score - x.score || y.a - x.a || y.c - x.c || x.row.cells[0].textContent.localeCompare(y.row.cells[0].textContent))
      .slice(0, 20);

    bestBody.innerHTML = best.map((record, index) => {
      const { row, states, a, c, score } = record;
      const link = row.cells[0].querySelector("a").outerHTML;
      const time = row.cells[2].querySelector("time").outerHTML;
      const ref = row.cells[3].querySelector("a").outerHTML;
      const pattern = states.map((state) => state.outerHTML).join("");
      return '<tr data-a="' + a + '" data-c="' + c + '"><th scope="row"><span class="vhi-rank">' + String(index + 1).padStart(2, "0") + '</span>' + link + '</th><td data-sort-value="' + score + '">' + countsMarkup(a, c) + '</td><td><div class="combo-pattern" aria-label="VSM state pattern">' + pattern + '</div></td><td class="review-date">' + time + '</td><td class="review-ref">' + ref + '</td></tr>';
    }).join("");
  }

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
    [...body.rows].forEach((row, index) => { row.dataset.originalOrder = index; });
    [...table.tHead.rows[0].cells].forEach((heading, index) => {
      const label = heading.innerHTML;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sort-button";
      button.dataset.sortIndex = index;
      button.dataset.sortType = heading.dataset.sortType || "text";
      button.setAttribute("aria-label", "Sort by " + heading.textContent.trim());
      button.innerHTML = label;
      heading.textContent = "";
      heading.append(button);
      button.addEventListener("click", () => {
        const wasActive = button.classList.contains("is-sorted");
        const descending = wasActive ? !button.classList.contains("desc") : ["number", "date", "state"].includes(button.dataset.sortType);
        const rows = [...body.rows];
        rows.sort((aRow, bRow) => {
          const av = valueFor(aRow.cells[index], button.dataset.sortType);
          const bv = valueFor(bRow.cells[index], button.dataset.sortType);
          const result = typeof av === "number" ? av - bv : av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
          return (descending ? -result : result) || Number(aRow.dataset.originalOrder) - Number(bRow.dataset.originalOrder);
        });
        table.querySelectorAll("thead th").forEach((th) => th.removeAttribute("aria-sort"));
        table.querySelectorAll(".sort-button").forEach((control) => control.classList.remove("is-sorted", "desc"));
        button.classList.add("is-sorted");
        if (descending) button.classList.add("desc");
        heading.setAttribute("aria-sort", descending ? "descending" : "ascending");
        rows.forEach((sortedRow) => body.append(sortedRow));
      });
    });
  });

  const bolt = '<svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline class="lightning-glow" points="0,14 12,9 22,17 34,6 45,16 57,10 68,19 80,7 90,16 100,14"></polyline><polyline class="lightning-bolt" points="0,14 12,9 22,17 34,6 45,16 57,10 68,19 80,7 90,16 100,14"></polyline></svg>';
  document.querySelectorAll(".vhi-table tr.has-a-combo").forEach((row) => {
    const cells = [...row.querySelectorAll(".state-cell")];
    const active = cells.map((cell, index) => cell.querySelector(".state-a") ? index : -1).filter((index) => index >= 0);
    active.slice(1).forEach((index, linkIndex) => {
      const lightning = document.createElement("span");
      lightning.className = "combo-lightning";
      lightning.style.setProperty("--gap", index - active[linkIndex]);
      lightning.innerHTML = bolt;
      cells[index].prepend(lightning);
    });
  });

  const nav = document.querySelector(".vhi-section-nav");
  if (nav) {
    const navScroll = nav.querySelector(".vhi-section-nav-scroll");
    const navLinks = [...nav.querySelectorAll('a[href^="#"]')];
    const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
    let active = -1;
    let navFrame = null;
    const reduceNavMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const reveal = (index) => {
      const link = navLinks[index];
      if (!link || !navScroll) return;
      const target = link.offsetLeft - (navScroll.clientWidth - link.offsetWidth) / 2;
      navScroll.scrollTo({ left: Math.max(0, target), behavior: reduceNavMotion.matches ? "auto" : "smooth" });
    };
    const select = (index, shouldReveal = true) => {
      if (index < 0) return;
      active = index;
      navLinks.forEach((link, linkIndex) => {
        link.classList.toggle("is-active", linkIndex === index);
        if (linkIndex === index) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
      if (shouldReveal) reveal(index);
    };
    const syncNavigation = () => {
      navFrame = null;
      const marker = window.innerHeight * .34;
      let index = 0;
      sections.forEach((section, sectionIndex) => {
        if (section && section.getBoundingClientRect().top <= marker) index = sectionIndex;
      });
      select(index);
    };
    navLinks.forEach((link, index) => link.addEventListener("click", () => select(index, false)));
    window.addEventListener("scroll", () => {
      if (navFrame === null) navFrame = requestAnimationFrame(syncNavigation);
    }, { passive: true });
    window.addEventListener("resize", () => reveal(active));
    if (document.fonts?.ready) document.fonts.ready.then(() => reveal(active));
    const hashIndex = navLinks.findIndex((link) => link.getAttribute("href") === location.hash);
    if (hashIndex >= 0) select(hashIndex, false);
    else syncNavigation();
  }
})();
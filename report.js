/* ═══════════════════════════════════════════════════════════════════
   VIVELY — partner-facing report rendering.

   Shared by index.html (landing, all campaigns + directory) and
   report.html (one campaign). Contains no editing controls and never
   touches the write token — it is safe on any link you hand out.

   Set window.VIVELY_PAGE = "landing" | "report" before loading this.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  var PAGE = window.VIVELY_PAGE === "landing" ? "landing" : "report";
  var qs = new URLSearchParams(location.search);
  /* Only report.html resolves a campaign. The landing page is always the
     full directory, so a stray ?brand= on the root URL cannot narrow it. */
  var state = {
    campaigns: [], countries: [], updated: null,
    brand: PAGE === "report" ? (qs.get("brand") || "") : ""
  };

  var $ = function (id) { return document.getElementById(id); };

  function toast(text) {
    var t = $("toast");
    if (!t) return;
    t.textContent = text; t.classList.add("on");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("on"); }, 2200);
  }

  function urlFor(path) { return new URL(path, location.href).href; }

  function selected() {
    if (!state.brand) return state.campaigns;
    /* No silent widening: an unknown ?brand= resolves to nothing, never to
       "all campaigns" — that would show one partner everybody else's numbers. */
    return state.campaigns.filter(function (c) {
      return c.id.toLowerCase() === state.brand.toLowerCase() ||
             c.name.toLowerCase() === state.brand.toLowerCase();
    });
  }

  function tile(label, value, note, cls) {
    return '<div class="kpi ' + (cls || '') + '">' +
             '<div class="k-label">' + V.esc(label) + '</div>' +
             '<div class="k-value">' + value + '</div>' +
             '<div class="k-note">' + V.esc(note) + '</div>' +
           '</div>';
  }

  function renderKpis(list) {
    var t = V.total(list);
    $("kpis").innerHTML =
      tile("Total posts", V.num(t.uploaded), "Uploaded") +
      (t.pending > 0 ? tile("Waiting upload", V.num(t.pending), "Pending posts", "pend") : "") +
      tile("Total ER", V.pct(t.er), "Engagement rate", "lead") +
      tile("Total views", V.num(t.views), "Impressions") +
      tile("Total likes", V.num(t.likes), "Audience likes") +
      tile("Comments", V.num(t.comments), "Discussions") +
      tile("Reposts", V.num(t.shares), "Shares");
  }

  function renderTable(list) {
    var t = V.total(list);
    var rows = list.map(function (c) {
      return '<tr>' +
        '<td class="name"><span class="swatch"></span>' + V.esc(c.name) + '</td>' +
        '<td>' + V.num(c.uploaded) + '</td>' +
        '<td>' + (c.pending ? V.num(c.pending) : '—') + '</td>' +
        '<td><b>' + V.num(c.views) + '</b></td>' +
        '<td>' + V.num(c.likes) + '</td>' +
        '<td>' + V.num(c.comments) + '</td>' +
        '<td>' + V.num(c.shares) + '</td>' +
        '<td class="er">' + V.pct(c.er) + '</td>' +
      '</tr>';
    }).join("");

    var foot = list.length > 1 ?
      '<tfoot><tr>' +
        '<td class="name">All campaigns</td>' +
        '<td>' + V.num(t.uploaded) + '</td>' +
        '<td>' + (t.pending ? V.num(t.pending) : '—') + '</td>' +
        '<td>' + V.num(t.views) + '</td>' +
        '<td>' + V.num(t.likes) + '</td>' +
        '<td>' + V.num(t.comments) + '</td>' +
        '<td>' + V.num(t.shares) + '</td>' +
        '<td class="er">' + V.pct(t.er) + '</td>' +
      '</tr></tfoot>' : '';

    return '<div class="card">' +
      '<div class="eyebrow">Campaign comparison</div>' +
      '<h2>Summary metrics per campaign</h2>' +
      '<p class="lede">Engagement rate is likes, comments and shares over views.</p>' +
      '<div class="tablewrap"><table>' +
        '<thead><tr><th>Campaign</th><th>Uploaded</th><th>Pending</th><th>Views</th>' +
        '<th>Likes</th><th>Comments</th><th>Reposts</th><th>Avg ER %</th></tr></thead>' +
        '<tbody>' + rows + '</tbody>' + foot +
      '</table></div></div>';
  }

  function renderCountries(list) {
    var ids = list.map(function (c) { return c.id; });
    var acc = {};
    state.countries.forEach(function (r) {
      var camp = V.S(r.campaign).toLowerCase();
      if (ids.length && ids.indexOf(camp) < 0) return;
      var name = V.S(r.country);
      if (!name) return;
      acc[name] = (acc[name] || 0) + Math.round(V.N(r.kols));
    });
    var rows = Object.keys(acc).map(function (k) { return { country: k, kols: acc[k] }; })
      .sort(function (a, b) { return b.kols - a.kols || a.country.localeCompare(b.country); });

    if (!rows.length) return "";

    var max = rows[0].kols || 1;
    var sum = rows.reduce(function (a, r) { return a + r.kols; }, 0);

    var bars = rows.map(function (r) {
      var w = Math.max((r.kols / max) * 100, 1.5);
      var share = sum ? Math.round((r.kols / sum) * 1000) / 10 : 0;
      return '<div class="bar-row" title="' + V.esc(r.country) + ' — ' + r.kols +
             ' creators (' + share + '% of roster)">' +
        '<div class="bar-name">' + V.esc(r.country) + '</div>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + w + '%"></div></div>' +
        '<div class="bar-val">' + r.kols + '</div>' +
      '</div>';
    }).join("");

    return '<div class="card">' +
      '<div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">' +
        '<div style="flex:1 1 auto;min-width:200px">' +
          '<div class="eyebrow">Demographic distribution</div>' +
          '<h2>Creator nationality</h2>' +
        '</div>' +
        '<span class="pill">' + rows.length + ' countries · ' + sum + ' creators</span>' +
      '</div>' +
      '<p class="lede">Creators per country, ranked. Longer bar means more creators.</p>' +
      '<div class="bars">' + bars + '</div>' +
    '</div>';
  }

  /* Directory of per-campaign reports — navigation only, landing page. */
  function renderDirectory() {
    if (PAGE !== "landing" || !state.campaigns.length) return "";
    var items = state.campaigns.map(function (c) {
      return '<a class="dir-item" href="report.html?brand=' + encodeURIComponent(c.id) + '">' +
        '<span class="dir-name">' + V.esc(c.name) + '</span>' +
        '<span class="dir-meta">' + V.compact(c.views) + ' views · ' + V.pct(c.er) + ' ER</span>' +
      '</a>';
    }).join("");
    return '<div class="card">' +
      '<div class="eyebrow">Browse</div>' +
      '<h2>Individual campaign reports</h2>' +
      '<p class="lede">Open any campaign on its own page.</p>' +
      '<div class="dir">' + items + '</div>' +
    '</div>';
  }

  /* Shown instead of the report whenever there is nothing real to show.
     Carries no figures, no campaign names, and no internal detail. */
  function renderUnavailable(heading, detail) {
    var bar = document.querySelector(".topbar");
    if (bar) {
      ["view", "copy", "csv"].forEach(function (id) {
        var el = $(id);
        var host = el && el.closest ? (el.closest("label") || el) : el;
        if (host) host.style.display = "none";
      });
    }
    document.title = (V.CFG.ORG || "VIVELY") + " — Campaign Performance";
    $("title").textContent = (V.CFG.ORG || "VIVELY") + " Performance";
    $("subtitle").textContent = "";
    $("dot").className = "dot warn";
    $("msg").innerHTML = "";
    $("kpis").innerHTML = "";
    $("body").innerHTML =
      '<div class="card empty">' +
        '<h2>' + V.esc(heading) + '</h2>' +
        '<p class="lede">' + V.esc(detail) + '</p>' +
        '<p><button class="btn" onclick="location.reload()">Try again</button></p>' +
      '</div>';
    $("stamp").textContent = "";
  }

  function render() {
    var list = selected();
    var org = V.CFG.ORG || "VIVELY";
    var single = state.brand && list.length === 1;
    var label = single ? list[0].name : org;

    document.title = label + " — Campaign Performance";
    $("title").textContent = label + " Performance";
    $("subtitle").textContent = "Tracking " + list.length +
      (list.length === 1 ? " campaign" : " campaigns");

    var backLink = (PAGE === "report" && state.brand)
      ? '<p style="margin:0 0 18px"><a class="btn small" href="./">← All campaigns</a></p>'
      : '';

    renderKpis(list);
    $("body").innerHTML = PAGE === "landing"
      ? renderDirectory() + renderTable(list) + renderCountries(list)
      : backLink + renderTable(list) + renderCountries(list);

    $("stamp").textContent = state.updated
      ? "Data last synced " + new Date(state.updated).toLocaleString() : "";
  }

  function fillViewPicker() {
    var sel = $("view");
    if (!sel) return;

    if (PAGE === "landing") {
      sel.innerHTML = '<option value="">All campaigns (' + state.campaigns.length + ')</option>' +
        state.campaigns.map(function (c) {
          return '<option value="' + V.esc(c.id) + '">' + V.esc(c.name) + '</option>';
        }).join("");
      sel.value = "";
      sel.onchange = function () {
        if (sel.value) location.href = "report.html?brand=" + encodeURIComponent(sel.value);
      };
      return;
    }

    sel.innerHTML = '<option value="">All campaigns (' + state.campaigns.length + ')</option>' +
      state.campaigns.map(function (c) {
        return '<option value="' + V.esc(c.id) + '">' + V.esc(c.name) + '</option>';
      }).join("");
    sel.value = state.brand;
    sel.onchange = function () {
      state.brand = sel.value;
      var u = new URL(location.href);
      if (state.brand) u.searchParams.set("brand", state.brand);
      else u.searchParams.delete("brand");
      history.replaceState(null, "", u);
      render();
    };
  }

  function wireButtons() {
    var copy = $("copy");
    if (copy) copy.onclick = function () {
      navigator.clipboard.writeText(location.href)
        .then(function () { toast("Link copied"); })
        .catch(function () { toast("Copy failed — use the address bar instead"); });
    };

    var csv = $("csv");
    if (csv) csv.onclick = function () {
      var list = selected();
      var head = ["Campaign", "Uploaded", "Pending", "Views", "Likes",
                  "Comments", "Reposts", "Creators", "ER %"];
      var lines = [head.join(",")].concat(list.map(function (c) {
        return ['"' + c.name.replace(/"/g, '""') + '"', c.uploaded, c.pending, c.views,
                c.likes, c.comments, c.shares, c.creators,
                (Math.round(c.er * 100) / 100)].join(",");
      }));
      var blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vively-performance.csv";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
  }

  wireButtons();

  V.load(V.CFG.SCRIPT_URL).then(function (res) {
    /* The reason lands in the console for us; partners only see the
       plain-English state above. */
    if (res.error) console.warn("[VIVELY] data source:", res.source, "—", res.error);

    if (!res.data) {
      renderUnavailable("Report data unavailable",
        "We could not load the campaign data right now. Please try again in a moment.");
      return;
    }

    state.campaigns = (res.data.campaigns || []).map(V.clean)
      .filter(function (c) { return c.show && c.name; });
    state.countries = res.data.countries || [];
    state.updated = res.data.updated || null;

    if (!state.campaigns.length) {
      renderUnavailable("Report data unavailable",
        "There are no published campaigns to show yet.");
      return;
    }

    if (PAGE === "report" && state.brand && !selected().length) {
      renderUnavailable("Campaign not found",
        "This report link does not match a published campaign. Please check the link.");
      return;
    }

    $("dot").className = "dot";
    fillViewPicker();
    render();
  });
})();

/* ═══════════════════════════════════════════════════════════════════
   VIVELY — shared data layer for the console and the partner report.
   No build step, no dependencies. Loaded by both pages.
   ═══════════════════════════════════════════════════════════════════ */

window.V = (function () {
  var CFG = window.VIVELY_CONFIG || {};

  /* ── coercion ── */
  var S = function (v) { return String(v === undefined || v === null ? "" : v).trim(); };
  var N = function (v) {
    var n = parseFloat(S(v).replace(/[^0-9.\-]/g, ""));
    return isNaN(n) ? 0 : n;
  };
  var B = function (v) {
    var s = S(v).toUpperCase();
    return s === "" || s === "TRUE" || s === "1" || s === "YES" || s === "Y";
  };

  /* ── formatting ── */
  function num(n) { return Math.round(N(n)).toLocaleString("en-US"); }
  function pct(n) { return (Math.round(N(n) * 100) / 100).toFixed(2) + "%"; }
  function compact(n) {
    n = N(n);
    if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return String(Math.round(n));
  }
  function esc(s) {
    return S(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ── one campaign row, normalised and with derived numbers ── */
  function clean(r) {
    var c = {
      id: S(r.id) || S(r.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: S(r.name) || S(r.id),
      show: B(r.show),
      uploaded: Math.round(N(r.uploaded)),
      pending: Math.round(N(r.pending)),
      views: Math.round(N(r.views)),
      likes: Math.round(N(r.likes)),
      comments: Math.round(N(r.comments)),
      shares: Math.round(N(r.shares)),
      creators: Math.round(N(r.creators)),
      note: S(r.note)
    };
    c.engagements = c.likes + c.comments + c.shares;
    c.er = c.views > 0 ? (c.engagements / c.views) * 100 : 0;
    return c;
  }

  /* ── sum a set of campaigns into one totals object ── */
  function total(list) {
    var t = { uploaded: 0, pending: 0, views: 0, likes: 0,
              comments: 0, shares: 0, creators: 0 };
    list.forEach(function (c) {
      Object.keys(t).forEach(function (k) { t[k] += c[k]; });
    });
    t.engagements = t.likes + t.comments + t.shares;
    t.er = t.views > 0 ? (t.engagements / t.views) * 100 : 0;
    return t;
  }

  /* ── countries for a campaign id, or all campaigns merged ── */
  function countriesFor(countries, id) {
    var acc = {};
    countries.forEach(function (r) {
      var camp = S(r.campaign);
      if (id && camp.toLowerCase() !== S(id).toLowerCase()) return;
      var name = S(r.country);
      if (!name) return;
      acc[name] = (acc[name] || 0) + Math.round(N(r.kols));
    });
    return Object.keys(acc)
      .map(function (k) { return { country: k, kols: acc[k] }; })
      .sort(function (a, b) { return b.kols - a.kols || a.country.localeCompare(b.country); });
  }

  /* ── JSONP read: works from any static host, no CORS to negotiate ──
     Never invents data. On any failure the caller gets data:null and is
     expected to render an unavailable state — a partner must never be
     shown placeholder figures that look like their campaign. ── */
  function load(url) {
    return new Promise(function (resolve) {
      if (!url) {
        resolve({ data: null, source: "unconfigured",
                  error: "No data source is configured (SCRIPT_URL is empty in config.js)." });
        return;
      }
      var cb = "vively_cb_" + Math.random().toString(36).slice(2);
      var tag = document.createElement("script");
      var done = false;

      function finish(res) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (tag.parentNode) tag.parentNode.removeChild(tag);
        resolve(res);
      }

      var timer = setTimeout(function () {
        finish({ data: null, source: "error",
                 error: "The data source did not answer in 12 seconds." });
      }, 12000);

      window[cb] = function (payload) {
        if (payload && payload.ok) {
          finish({ data: payload, source: "live", error: null });
        } else {
          finish({ data: null, source: "error",
                   error: (payload && payload.error) || "The data source returned no data." });
        }
      };

      tag.onerror = function () {
        finish({ data: null, source: "error",
                 error: "Could not reach the Web app URL. Check it ends in /exec and is deployed to “Anyone”." });
      };
      tag.src = url + (url.indexOf("?") < 0 ? "?" : "&") +
                "callback=" + cb + "&t=" + Date.now();
      document.head.appendChild(tag);
    });
  }

  /* ── write: text/plain keeps it a simple request, so no preflight ── */
  function save(url, token, campaigns, countries) {
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token: token, campaigns: campaigns, countries: countries })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error((j && j.error) || "The sheet refused the write.");
        return j;
      });
  }

  return {
    CFG: CFG,
    S: S, N: N, B: B,
    num: num, pct: pct, compact: compact, esc: esc,
    clean: clean, total: total, countriesFor: countriesFor,
    load: load, save: save
  };
})();

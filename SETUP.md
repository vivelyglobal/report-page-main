# Vively Report — Setup

Two pages, **two separate Google Sheets**. The split is deliberate: it is what keeps partner data and internal data apart.

| | Page | Hosting | Reads |
|---|---|---|---|
| **Partner** | `index.html` | Public — GitHub Pages | `VIVELY Report Data` *(public sheet)* |
| **Internal** | `internal.html` | **Not hosted.** Local only, until real auth exists | `VIVELY Internal Data` *(private sheet)* |

---

## Why two sheets

The partner report has the sheet ID written into its HTML. That HTML is public, so **anyone who opens the report can read every tab in whatever sheet it points at.** One sheet holding both report config and creator payments would leak the payments.

So:

- **`VIVELY Report Data`** — link-shared, public by design. Report copy, KPIs, campaign summaries. Nothing sensitive ever goes in here.
- **`VIVELY Internal Data`** — shared only with named Vively staff accounts. Creator lists, pipeline stages, amounts due, payments. Its ID appears in no public file.

---

## Part 1 — The partner report (deploy today)

**1. Upload the public sheet.** Drag `VIVELY_Report_Data.xlsx` into Drive → right-click → **Open with → Google Sheets** → **File → Save as Google Sheets**.

**2. Share it.** **Share → Anyone with the link → Viewer.**

**3. Copy the ID** from the address bar:

```
docs.google.com/spreadsheets/d/1AbCdEf...XyZ/edit
                               └──── this ────┘
```

**4. Paste it into `index.html`:**

```js
const SHEET_ID = "";     ←  here
```

**5. Push:**

```bash
git add .gitignore index.html
git commit -m "Live sheet data + 5 new campaigns"
git push
```

Partner link: `https://vivelyglobal.github.io/vively-report-page/`

---

## Part 2 — The internal view (local only, for now)

**1. Upload `VIVELY_Internal_Data.xlsx`** to Drive the same way. **Do not link-share it** — add staff by email, as Viewer.

**2. Paste its ID into `internal.html`:**

```js
const INTERNAL_SHEET_ID = "";
```

**3. Open it locally.** It needs a local web server — browsers block sheet requests from a bare `file://` page:

```bash
cd path/to/vively-report-page
python -m http.server 8000
```

Then open `http://localhost:8000/internal.html`.

### Guards in place

- `internal.html` and `VIVELY_Internal_Data.xlsx` are in **`.gitignore`** — they cannot reach GitHub Pages by accident
- `internal.html` opens with a comment block explaining why it must not be hosted
- Neither the internal sheet ID nor the string `Data_` appears anywhere in `index.html`

### Hosting the internal view

It needs server-side auth first. Three routes, cheapest first:

1. **Cloudflare Access** in front of a Cloudflare Pages deploy — free tier, sits in front of static files, authenticates against Google Workspace. No code changes. Best fit if Vively staff are on Google Workspace.
2. **Netlify or Vercel** with SSO / password protection on a second site.
3. **Your own Vively app** — serve `internal.html` from a route already behind staff session auth.

The page is plain static HTML with no login logic of its own, so any of these drops in without touching the code.

---

## No cost or payment data on the partner report

The partner report carries **no monetary figures of any kind.** Verified by scan against the source Excel:

| Checked | Result |
|---|---|
| Creator handles, names, profile URLs | none in `index.html` |
| Individual post URLs | none |
| Payment records, amounts, amounts due | none |
| Campaign budgets | none |
| Pipeline stages and internal notes | none |
| CPM / spend / cost figures | none |
| The `₩` symbol anywhere in the file | none |
| Internal tab names (`Data_*`) | none |

The public sheet holds **no monetary values at all** — the `Campaigns` tab exposes `views · shares · likes · comments · posts · creators` and nothing else.

### What was removed

**Section 04 — 비용 효율성 비교 (Cost Efficiency) is gone.** Every Vively-specific number in it was derived from spend:

- CPM ₩2,731 (준오헤어) and ₩3,165 (자임당) — campaign spend ÷ views
- "Meta 대비 최대 86% / TikTok 대비 최대 73% 절감" — derived from those
- The LaBab note describing the View당 지급 단가 (pay-per-view) model
- The Meta / TikTok benchmark chart, which only existed to frame them

The `CPM_Benchmarks` and `CPM_Interpretation` tabs are gone from the sheet, and `cpmInsight` / `cpmSaving` / `cpmNote` are gone from `Config`, so none of it can return by accident. Sections renumbered automatically — the report now runs 01–05.

Two lines of copy still reference budget **qualitatively, with no figures** — "저예산 집행" in `kpiInsight`, "적은 예산에서도" in `WhyPoints`. They describe the client's own spend level as a selling point. Edit them in the sheet if you'd rather they went too.

If you ever want a partner-safe cost story back, the right shape is a claim you choose — not a figure computed from what creators were paid.

---

## Data freshness

Both pages resolve data in the same order: **live sheet → last good cache → built-in snapshot.** The cache is the last successful read, kept in that browser's local storage, so a sheet outage shows you yesterday's real numbers rather than build-day numbers.

**Partner report** — one quiet line in the footer:

```
데이터 기준일 · 2026-09-13  ·  Live Sheet · 마지막 동기화 2026-09-13 14:22 (방금 전)
```

| Status | Meaning |
|---|---|
| **Live Sheet** (green) | Read straight from the sheet just now |
| **Cached Snapshot** (amber) | Sheet unreachable; showing the last good read, with its timestamp |
| **Built-in Snapshot** (grey) | `SHEET_ID` still blank |

**Internal view** — a full-width banner above the KPIs, plus a status chip in the header. On fallback it turns red, states when the last successful sync happened, and prints the actual error (`Data_Deliverables → HTTP 403`). Not missable.

Both also log the source and last refresh to the browser console.

`데이터 기준일` and the sync timestamp are different things: the first is the `lastUpdated` cell you maintain in **Config** (when the numbers were gathered); the second is when the page last reached the sheet.

---

## Editing the report

| Tab | Controls |
|---|---|
| **Config** | Title, subtitle, intro and insight paragraphs, footer, `lastUpdated` |
| **KPIs** | The five headline cards |
| **Campaigns** | **The case studies.** One row per campaign. |
| **Positioning** | The two positioning cards |
| **Regions** | Country-reach chart *and* the regional list |
| **Services** | The service tabs |
| **WhyPoints** | The "Why Vively" bullets |

### Adding a campaign — no HTML edit

Add a row to **Campaigns**:

- **id** — lowercase, no spaces. Also the video filename: id `kowork` → `media/kowork-1.mp4` … `-4.mp4`
- **show** — `TRUE` to publish, `FALSE` to hide without deleting
- **order** — position in the tab strip
- **countryReach** — leave blank and the line doesn't render

Then push the four videos to `media/`. The tab strip, the case study section and the charts all build themselves from the sheet.

### Rules

- Don't rename tabs or header rows — the pages look them up by name
- Don't change an existing **id** — it's what links a campaign to its videos
- Blank cell = line hidden, not shown empty

---

## Data in this build

From `VIVELY KOL Manager.xlsx`, 13 September 2026.

**New campaigns:** KOWORK · NAAP (중동) · LABIOTTE · 굽네치킨 · 어서와칼국수

**Refreshed:** 명동 K-갈비 (103,806 → 313,903 views) · 압구정 닭한마리 (30,080 → 161,724)

**Unchanged** (not in the Excel): 준오헤어 · 라밥 · 자임당한의원 · 토니모리 · 박준 뷰티랩 · 베리뉴약국

The five new campaigns show no country-reach line — the `location` column is empty for all 241 creators. Fill `countryReach` when you have it.

Campaign copy for the new five is drafted from the Excel's campaign objectives — **read it over in the sheet before sending this to anyone.**

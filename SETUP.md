# Setup — about 10 minutes, once

Three pages, one spreadsheet.

| Page | Who opens it | What it does |
|---|---|---|
| `index.html` (the root URL) | partners | All-campaign report + links to each campaign |
| `report.html?brand=…` | partners | One campaign, on its own page |
| `console.html` | you only | Edit the numbers, generate partner links |

The root URL stays partner-safe — it has never carried editing controls and the
console is not linked from it. Anything you have already sent out keeps working.
Treat `console.html` like an internal tool: there is no login on it yet, so its
safety is that nobody else knows the address. Don't put it in an email to a partner.

The spreadsheet is the single source of truth. The console reads and writes it;
the report only reads it. GitHub Pages can't talk to Google Sheets directly, so a
small Apps Script sits in between — that's all step 2 and 3 are for.

Until you finish setup both pages run on built-in sample data, so you can click
around first and break nothing.

---

## 1 — Make the spreadsheet

Drag `VIVELY_Report_Data.xlsx` into Google Drive → right-click → **Open with →
Google Sheets** → **File → Save as Google Sheets**.

It arrives with your 13 campaigns already in it. Keep the tab names `Campaigns`
and `Countries` and keep row 1 as it is — the script reads them by name.

## 2 — Add the script

In that sheet: **Extensions → Apps Script**. Delete whatever is in the editor,
paste the whole of `apps-script/Code.gs`, then change one line near the top:

```js
var WRITE_TOKEN = 'change-me';
```

Put your own secret in place of `change-me`. Anyone holding it can overwrite the
sheet, so treat it like a password — don't commit it and don't put it in a
partner link. Save (💾).

## 3 — Deploy it

**Deploy → New deployment → ⚙ → Web app**, then:

- Execute as: **Me**
- Who has access: **Anyone**

Click Deploy and approve the permission screen (Google will warn it's an
unverified app — that's normal for your own script; choose **Advanced → Go to…**).

Copy the **Web app URL**. It ends in `/exec`.

## 4 — Paste the URL in

Open `config.js` and put it between the quotes:

```js
window.VIVELY_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfy…/exec",
  ORG: "VIVELY GLOBAL"
};
```

Commit and push:

```bash
git add config.js
git commit -m "Connect report to sheet"
git push
```

## 5 — Use it

Open `console.html`. The dot next to the title turns green when it's reading your
sheet. Type over any number, then **Save to sheet** — the first save asks for the
write token from step 2 and remembers it in that browser.

**Partner links** at the bottom of the page:

```
…/report-page-main/                            all campaigns  ← the root link
…/report-page-main/report.html?brand=kowork    one campaign
```

Copy one, send it. Partners need no account and can't edit anything.

---

## Notes

**Adding a campaign.** Press *+ Add campaign*, type a name, fill the numbers, save.
The partner link appears immediately — no deploy needed, because the data lives in
the sheet, not in the HTML.

**Hiding a campaign.** Untick *Show*. It stays in the sheet and disappears from every
partner report.

**Creator nationality.** The chart only appears for campaigns that have country rows.
Enter them in the console as `Indonesia = 14`, one per line.

**Nothing loads.** Check the URL ends in `/exec`, and that the deployment says
*Anyone* rather than *Anyone with Google account*. After editing `Code.gs` you must
**Deploy → Manage deployments → ✏️ → Version: New version** for the change to go live.

**"Wrong write token".** The console clears the stored token on that error, so just
hit Save again and enter the right one.

---

## What else is in here

- `report.js`, `vively.js`, `vively.css` — shared code. `report.js` holds the partner
  rendering and contains no editing logic at all.
- `full-report.html` — the previous narrative report (hero, services, case studies
  with reels). It runs off a snapshot baked into the file and needs no setup.
- `internal.html` and `VIVELY_Internal_Data.xlsx` — internal only. `.gitignore`
  keeps them out of the repo; don't force-add them, they have no login.

/* ═══════════════════════════════════════════════════════════════════════
   VIVELY REPORT — Google Apps Script bridge
   ───────────────────────────────────────────────────────────────────────
   Paste this into the Apps Script editor of your data spreadsheet
   (Extensions → Apps Script), set WRITE_TOKEN below, then Deploy → New
   deployment → Web app → Execute as: Me · Who has access: Anyone.

   Reads are public (the partner report needs them).
   Writes require WRITE_TOKEN, which only the console knows.
   ═══════════════════════════════════════════════════════════════════════ */

/* Pick your own secret. Anyone with this string can overwrite the sheet,
   so do not put it in the partner link or commit it to GitHub. */
var WRITE_TOKEN = 'change-me';

var CAMPAIGN_COLS = ['id', 'name', 'show', 'uploaded', 'pending',
                     'views', 'likes', 'comments', 'shares', 'creators', 'note'];
var COUNTRY_COLS  = ['campaign', 'country', 'kols'];

function book_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function readTab_(name) {
  var sh = book_().getSheetByName(name);
  if (!sh) return [];
  var v = sh.getDataRange().getValues();
  if (v.length < 2) return [];
  var head = v[0].map(function (x) { return String(x).trim(); });
  return v.slice(1)
    .filter(function (r) {
      return r.some(function (c) { return String(c).trim() !== ''; });
    })
    .map(function (r) {
      var o = {};
      head.forEach(function (k, i) { if (k) o[k] = r[i]; });
      return o;
    });
}

function writeTab_(name, cols, rows) {
  var book = book_();
  var sh = book.getSheetByName(name) || book.insertSheet(name);
  sh.clear();
  var out = [cols];
  rows.forEach(function (r) {
    out.push(cols.map(function (c) { return r[c] === undefined || r[c] === null ? '' : r[c]; }));
  });
  sh.getRange(1, 1, out.length, cols.length).setValues(out);
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function payload_() {
  return {
    ok: true,
    updated: new Date().toISOString(),
    campaigns: readTab_('Campaigns'),
    countries: readTab_('Countries')
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── read ── JSONP when ?callback= is present, plain JSON otherwise ── */
function doGet(e) {
  var cb = e && e.parameter ? e.parameter.callback : null;
  var body;
  try {
    body = JSON.stringify(payload_());
  } catch (err) {
    body = JSON.stringify({ ok: false, error: String(err) });
  }
  if (cb) {
    return ContentService.createTextOutput(cb + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body)
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── write ── console only; whole-table replace, guarded by the token ── */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json_({ ok: false, error: 'Sheet is busy, try again' });
  }
  try {
    var req = JSON.parse(e.postData.contents);
    if (String(req.token) !== String(WRITE_TOKEN)) {
      return json_({ ok: false, error: 'Wrong write token' });
    }
    if (Array.isArray(req.campaigns)) writeTab_('Campaigns', CAMPAIGN_COLS, req.campaigns);
    if (Array.isArray(req.countries)) writeTab_('Countries', COUNTRY_COLS, req.countries);
    return json_(payload_());
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

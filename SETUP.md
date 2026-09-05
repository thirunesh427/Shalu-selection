# Connecting Shalu Selection to Google Sheets — Step by Step

This turns your Google Sheet into the live "database" for your shop. Once
set up, anything the Admin Panel uploads or removes will show up for
**every visitor**, everywhere — not just on one browser.

Your sheet: `https://docs.google.com/spreadsheets/d/1L3gAn7MeOI7T3qWYKPA8XYL67EVy2ST974vOCz7IZx4/edit`

---

## STEP 1 — Prepare the sheet tab and headers

1. Open your sheet using the link above.
2. Look at the bottom-left of the screen — there's a tab (probably named
   "Sheet1"). **Double-click it** and rename it to exactly:
   ```
   Products
   ```
   (Capital P, no extra spaces — the script looks for this exact name.)
3. Click cell **A1** and type these 6 headers across row 1, one per column
   (press Tab after each one to move to the next column):

   | A1 | B1 | C1 | D1 | E1 | F1 |
   |----|----|----|----|----|----|
   | id | name | category | price | desc | img |

   Row 1 should now read: `id  name  category  price  desc  img`

That's it for the sheet itself — leave the rows below blank, the script
will fill them in as products are added.

---

## STEP 2 — Open the Apps Script editor

1. Still inside your Sheet, click **Extensions** in the top menu bar.
2. Click **Apps Script** from the dropdown. A new tab opens with a code
   editor (this is the "Apps Script" project, automatically linked to
   this specific sheet).
3. You'll see a file called `Code.gs` with some placeholder code like
   `function myFunction() { }`. **Select all of that placeholder code and
   delete it.**

---

## STEP 3 — Paste in this code

Paste the entire block below into that empty `Code.gs` file:

```javascript
const SHEET_NAME = "Products";
const PASSWORD = "shalu123"; // change this to your own password

function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

/* ---------- Read all products (called by the site to show the shop) ---------- */
function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const products = data
    .filter((row) => row[0] !== "") // skip blank rows
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
  return ContentService.createTextOutput(JSON.stringify(products)).setMimeType(
    ContentService.MimeType.JSON
  );
}

/* ---------- Add or remove a product (called by the Admin Panel) ---------- */
function doPost(e) {
  let result = { success: false };
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.password !== PASSWORD) {
      return respond_({ success: false, error: "Wrong password" });
    }

    const sheet = getSheet_();

    if (body.action === "add") {
      const p = body.product;
      sheet.appendRow([p.id, p.name, p.category, p.price, p.desc || "", p.img || ""]);
      result = { success: true };
    } else if (body.action === "remove") {
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(body.id)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      result = { success: true };
    } else {
      result = { success: false, error: "Unknown action" };
    }
  } catch (err) {
    result = { success: false, error: String(err) };
  }
  return respond_(result);
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
```

**Important:** on the second line, change:
```javascript
const PASSWORD = "shalu123";
```
to any password you want, for example:
```javascript
const PASSWORD = "MyShopSecret2026";
```
Remember this exact password — you'll need to type the same one into the
website's `config.js` file later.

4. Press **Ctrl+S** (or **Cmd+S** on Mac) to save. It may ask you to name
   the project — you can call it "Shalu Selection Backend" or anything
   you like.

---

## STEP 4 — Deploy it as a Web App

1. In the Apps Script editor, click the blue **Deploy** button (top-right)
   → **New deployment**.
2. Next to "Select type", click the **gear/cog icon ⚙️** and choose
   **Web app**.
3. Fill in the deployment settings:
   - **Description:** (optional) "Shalu Selection API"
   - **Execute as:** `Me (your email)`
   - **Who has access:** `Anyone`
4. Click **Deploy**.
5. A popup will ask you to **authorize access** — this is normal, since
   it's your own script running on your own sheet:
   - Click **Authorize access**
   - Choose your Google account
   - You may see a warning screen saying "Google hasn't verified this
     app" — click **Advanced**, then **Go to [project name] (unsafe)**.
     This is safe: it's warning you because it's a personal script, not
     because anything is wrong.
   - Click **Allow**.
6. You'll now see a **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec
   ```
   **Copy this entire URL.** This is the address your website will talk to.

> If you ever edit the code in Step 3 again later, you'll need to create
> a **new deployment version** (Deploy → Manage deployments → edit → New
> version) for the changes to take effect on the live URL.

---

## STEP 5 — Connect the website to this URL

1. Open the website's `config.js` file (in the site folder you have).
2. Replace the two lines with your own values:

```javascript
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbxxxxxxxxxxxxxxxxxxxxxxxxxxxx/exec";
const ADMIN_PASSWORD = "MyShopSecret2026";
```

- `SHEET_API_URL` — paste the Web app URL from Step 4.
- `ADMIN_PASSWORD` — must be **exactly the same password** you set in
  Step 3's `Code.gs`.

3. Save `config.js` and re-upload it to your host (replacing the old
   version).

---

## STEP 6 — Test it

1. Open your live website and go to the **Admin Panel** page.
2. Log in with your password.
3. You should see a banner saying **🟢 Connected to your Google Sheet**.
   - If it says 🔴 or 🟡 instead, double check: the tab is named exactly
     `Products`, the headers match exactly, the deployment access is set
     to "Anyone", and the URL/password in `config.js` are copied
     correctly with no extra spaces.
4. Try uploading a test product, then open your Google Sheet — a new row
   should appear instantly.
5. Open the site's Shop page in a different browser (or your phone) —
   the new product should show up there too.

---

## Notes

- Anyone with the admin password can add/remove products from any
  device — that's the point, so you (or staff) can manage the shop from
  anywhere.
- Very large uploaded photos may be too big for a single Sheet cell. If
  the Admin Panel warns that a photo is too large, use the "paste an
  image link" field instead (e.g. host the photo on any image URL) — the
  site will use that instead of the uploaded file.
- The cart itself is not stored in the Sheet — each visitor's cart stays
  private to their own browser, only the product catalog is shared.

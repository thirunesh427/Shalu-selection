/* =====================================================
   Shalu Selection — Google Sheet backend
   =====================================================
   Handles both:
   1. The product catalog (Admin Panel upload/remove)
   2. Per-user carts, tied to Google Sign-In (so a
      signed-in shopper's cart follows them across devices)

   See SETUP.md and SETUP_LOGIN.md for full setup steps.
   ===================================================== */

const SHEET_NAME = "Products";
const PASSWORD = "shalu123"; // change this, and match it in config.js

/* Paste the SAME OAuth Web Client ID you put in config.js as
   GOOGLE_CLIENT_ID. Needed to verify sign-in tokens are real. */
const GOOGLE_CLIENT_ID = "";

function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

function getCartsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Carts");
  if (!sheet) {
    sheet = ss.insertSheet("Carts");
    sheet.appendRow(["email", "cartJson", "updatedAt"]);
  }
  return sheet;
}

/* Confirms an id token really came from Google, was issued to our
   own app, and belongs to the email the request claims it does. */
function verifyGoogleToken_(idToken, email) {
  if (!idToken || !email) return false;
  try {
    const url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken);
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) return false;
    const data = JSON.parse(res.getContentText());
    if (GOOGLE_CLIENT_ID && data.aud !== GOOGLE_CLIENT_ID) return false;
    if (String(data.email).toLowerCase() !== String(email).toLowerCase()) return false;
    return true;
  } catch (err) {
    return false;
  }
}

/* ---------- Read all products (called by the site to show the shop) ---------- */
function doGet(e) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  const rawHeaders = data.shift();
  const headers = rawHeaders.map((h) => String(h).trim().toLowerCase());
  const products = data
    .filter((row) => String(row[0]).trim() !== "") // skip blank rows
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => (obj[h] = row[i]));
      return obj;
    });
  return respond_(products);
}

/* ---------- Everything that changes data goes through POST ---------- */
function doPost(e) {
  let result = { success: false };
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === "add" || body.action === "remove") {
      if (body.password !== PASSWORD) {
        return respond_({ success: false, error: "Wrong password" });
      }
      result = body.action === "add" ? addProduct_(body.product) : removeProduct_(body.id);
    } else if (body.action === "getCart") {
      result = getCart_(body.email, body.idToken);
    } else if (body.action === "saveCart") {
      result = saveCart_(body.email, body.idToken, body.cart);
    } else {
      result = { success: false, error: "Unknown action" };
    }
  } catch (err) {
    result = { success: false, error: String(err) };
  }
  return respond_(result);
}

function addProduct_(p) {
  const sheet = getSheet_();
  sheet.appendRow([p.id, p.name, p.category, p.price, p.desc || "", p.img || ""]);
  return { success: true };
}

function removeProduct_(id) {
  const sheet = getSheet_();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return { success: true };
}

function getCart_(email, idToken) {
  if (!verifyGoogleToken_(idToken, email)) {
    return { success: false, error: "Invalid session, please sign in again" };
  }
  const sheet = getCartsSheet_();
  const data = sheet.getDataRange().getValues();
  let cart = {};
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(email).toLowerCase()) {
      try {
        cart = JSON.parse(data[i][1] || "{}");
      } catch (e) {
        cart = {};
      }
      break;
    }
  }
  return { success: true, cart };
}

function saveCart_(email, idToken, cart) {
  if (!verifyGoogleToken_(idToken, email)) {
    return { success: false, error: "Invalid session, please sign in again" };
  }
  const sheet = getCartsSheet_();
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === String(email).toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }
  const cartJson = JSON.stringify(cart || {});
  const now = new Date();
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 2).setValue(cartJson);
    sheet.getRange(rowIndex, 3).setValue(now);
  } else {
    sheet.appendRow([email, cartJson, now]);
  }
  return { success: true };
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

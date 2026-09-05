/* =====================================================
   Shalu Selection — shared logic for every page
   Products + carts are backed by a Google Sheet (via a
   Google Apps Script Web App). Signed-in visitors (Google
   Sign-In) get their cart saved to the Sheet, so it follows
   them across devices. Guests get a cart saved only to this
   browser, using localStorage.
   ===================================================== */

const CATALOG_CACHE_KEY = "shalu_catalog_cache_v1";
const CART_KEY = "shalu_cart_v1";
const ADMIN_SESSION_KEY = "shalu_admin_session_v1";
const GOOGLE_USER_KEY = "shalu_google_user_v1";

const CATEGORIES = [
  { name: "Sarees", color: "#C2255C" },
  { name: "Kurtis", color: "#F0A202" },
  { name: "Dress Materials", color: "#146356" },
  { name: "Lehengas", color: "#E85D2D" },
  { name: "Kids Wear", color: "#9B1C48" },
];

/* ---------- Placeholder art (used for seed items / items with no photo) ---------- */
function paisleySVG(bg, fg, label) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='520' viewBox='0 0 400 520'>
    <rect width='400' height='520' fill='${bg}'/>
    <g opacity='0.5'>
      ${Array.from({ length: 24 })
        .map((_, i) => {
          const x = (i % 6) * 70 + 20,
            y = Math.floor(i / 6) * 130 + 30;
          return `<path d='M${x} ${y + 40} C${x} ${y + 15} ${x + 20} ${y} ${x + 38} ${y} C${x + 55} ${y} ${x + 60} ${y + 13} ${x + 48} ${y + 22} C${x + 36} ${y + 30} ${x + 22} ${y + 24} ${x + 24} ${y + 12}' fill='none' stroke='${fg}' stroke-width='3' stroke-linecap='round'/>`;
        })
        .join("")}
    </g>
    <circle cx='200' cy='260' r='90' fill='${fg}' opacity='0.15'/>
    <text x='200' y='270' font-family='Georgia,serif' font-size='26' fill='${fg}' text-anchor='middle' opacity='0.85'>${label}</text>
  </svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

const DEFAULT_PRODUCTS = [
  { id: "p1", name: "Rani Pink Banarasi Saree", category: "Sarees", price: 3499, desc: "Rich banarasi weave with gold zari border, perfect for weddings and festive evenings.", img: paisleySVG("#C2255C", "#FFF7EC", "Saree") },
  { id: "p2", name: "Marigold Cotton Kurti", category: "Kurtis", price: 899, desc: "Breathable cotton kurti in sunny marigold, block-printed by hand.", img: paisleySVG("#F0A202", "#3A1220", "Kurti") },
  { id: "p3", name: "Teal Chanderi Dress Material", category: "Dress Materials", price: 1299, desc: "Unstitched chanderi silk set with matching dupatta, ready to tailor your way.", img: paisleySVG("#146356", "#FFF7EC", "Fabric") },
  { id: "p4", name: "Saffron Bridal Lehenga", category: "Lehengas", price: 8999, desc: "Heavy embroidered lehenga in saffron and gold, with a matching dupatta and blouse piece.", img: paisleySVG("#E85D2D", "#FFF7EC", "Lehenga") },
  { id: "p5", name: "Little Blooms Kids Frock", category: "Kids Wear", price: 749, desc: "Soft floral frock for little ones, easy to move and play in.", img: paisleySVG("#9B1C48", "#FFF7EC", "Kids") },
  { id: "p6", name: "Emerald Georgette Saree", category: "Sarees", price: 2799, desc: "Flowy georgette saree with a hand-embroidered emerald border.", img: paisleySVG("#0E4A40", "#FFF7EC", "Saree") },
  { id: "p7", name: "Sunrise Anarkali Kurti", category: "Kurtis", price: 1450, desc: "Floor-length anarkali kurti with delicate mirror work at the yoke.", img: paisleySVG("#C2255C", "#F0A202", "Anarkali") },
  { id: "p8", name: "Ivory Kids Lehenga Set", category: "Kids Wear", price: 1699, desc: "Mini lehenga set for little dancers, with matching dupatta.", img: paisleySVG("#F0A202", "#9B1C48", "Kids") },
];

/* ---------- Backend helpers ---------- */
function isBackendConfigured() {
  return typeof SHEET_API_URL === "string" && SHEET_API_URL.trim().length > 0;
}
function isGoogleConfigured() {
  return typeof GOOGLE_CLIENT_ID === "string" && GOOGLE_CLIENT_ID.trim().length > 0;
}

async function fetchProductsFromSheet() {
  const res = await fetch(SHEET_API_URL, { method: "GET" });
  if (!res.ok) throw new Error("Sheet request failed: " + res.status);
  const data = await res.json();
  return data.map((p) => ({
    id: String(p.id || Date.now() + Math.random()),
    name: p.name && String(p.name).trim() ? p.name : "Untitled item",
    category: p.category && String(p.category).trim() ? p.category : "Uncategorised",
    price: Number(p.price) || 0,
    desc: p.desc || "",
    img: p.img && String(p.img).trim() ? p.img : paisleySVG("#C2255C", "#FFF7EC", p.category || "New"),
  }));
}

/* Apps Script web apps don't handle CORS preflight requests well,
   so POST bodies are sent as text/plain to avoid triggering one. */
async function postToSheet(payload) {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  return await res.json();
}

/* ---------- Product data (backend when configured, else local demo mode) ---------- */
async function getProducts() {
  if (isBackendConfigured()) {
    try {
      const products = await fetchProductsFromSheet();
      localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(products));
      return products;
    } catch (err) {
      console.warn("Could not reach the Google Sheet, showing last known copy.", err);
      const cached = localStorage.getItem(CATALOG_CACHE_KEY);
      return cached ? JSON.parse(cached) : DEFAULT_PRODUCTS;
    }
  }
  const raw = localStorage.getItem(CATALOG_CACHE_KEY);
  if (raw) return JSON.parse(raw);
  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
  return DEFAULT_PRODUCTS;
}

async function addProduct(product, password) {
  if (isBackendConfigured()) {
    const result = await postToSheet({ action: "add", password, product });
    return !!result.success;
  }
  const products = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "[]");
  products.unshift(product);
  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(products));
  return true;
}

async function removeProduct(id, password) {
  if (isBackendConfigured()) {
    const result = await postToSheet({ action: "remove", password, id });
    return !!result.success;
  }
  let products = JSON.parse(localStorage.getItem(CATALOG_CACHE_KEY) || "[]");
  products = products.filter((p) => p.id !== id);
  localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(products));
  return true;
}

async function checkSheetConnection() {
  if (!isBackendConfigured()) return "unconfigured";
  try {
    await fetchProductsFromSheet();
    return "connected";
  } catch (err) {
    return "error";
  }
}

/* ---------- Google Sign-In ---------- */
function getGoogleUser() {
  try {
    const raw = localStorage.getItem(GOOGLE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}
function setGoogleUser(user) {
  localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user));
}
function clearGoogleUser() {
  localStorage.removeItem(GOOGLE_USER_KEY);
}
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = decodeURIComponent(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

async function handleGoogleCredential(response) {
  const payload = decodeJwt(response.credential);
  if (!payload || !payload.email) {
    showToast("Sign-in failed");
    return;
  }
  setGoogleUser({
    email: payload.email,
    name: payload.name || payload.email,
    picture: payload.picture || "",
    idToken: response.credential,
  });
  showToast("Signed in as " + (payload.name || payload.email));
  await syncCartOnLogin();
  renderAuthArea();
  updateCartCount();
  document.dispatchEvent(new CustomEvent("shalu:cartSynced"));
}

function initGoogleSignIn() {
  if (!isGoogleConfigured()) {
    renderAuthArea();
    return;
  }
  const tryInit = () => {
    if (!window.google || !google.accounts || !google.accounts.id) {
      setTimeout(tryInit, 200);
      return;
    }
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
    });
    renderAuthArea();
  };
  tryInit();
}

function renderAuthArea() {
  const el = document.getElementById("authArea");
  if (!el) return;
  if (!isGoogleConfigured()) {
    el.innerHTML = "";
    return;
  }
  const user = getGoogleUser();
  if (user) {
    el.innerHTML = `
      <div class="user-chip">
        ${user.picture ? `<img src="${user.picture}" alt="">` : ""}
        <span>${escapeHtml(user.name.split(" ")[0])}</span>
        <button id="signOutBtn" type="button">Sign out</button>
      </div>`;
    document.getElementById("signOutBtn").addEventListener("click", () => {
      clearGoogleUser();
      showToast("Signed out");
      renderAuthArea();
      updateCartCount();
    });
  } else {
    el.innerHTML = "";
    if (window.google && google.accounts && google.accounts.id) {
      google.accounts.id.renderButton(el, { theme: "outline", size: "medium", shape: "pill", text: "signin" });
    }
  }
}

/* ---------- Cart ---------- */
/* Guests: cart lives only in this browser's localStorage.
   Signed-in users: cart also syncs to the Google Sheet, so it
   follows them to any device. */
function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
  const user = getGoogleUser();
  if (user && isBackendConfigured()) {
    pushRemoteCart(user, cart).catch((err) => {
      console.warn("Cloud cart save failed", err);
      showToast("Couldn't save to your account — check your connection");
    });
  }
}
function addToCart(id, qty) {
  qty = qty || 1;
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  saveCart(cart);
  showToast("Added to cart");
}
function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  saveCart(cart);
}

async function fetchRemoteCart(user) {
  const result = await postToSheet({ action: "getCart", email: user.email, idToken: user.idToken });
  if (!result.success) throw new Error(result.error || "Could not load your saved cart");
  return result.cart || {};
}
async function pushRemoteCart(user, cart) {
  const result = await postToSheet({ action: "saveCart", email: user.email, idToken: user.idToken, cart });
  if (!result.success && result.error === "Invalid session, please sign in again") {
    clearGoogleUser();
    renderAuthArea();
  }
  return !!result.success;
}
async function syncCartOnLogin() {
  const user = getGoogleUser();
  if (!user || !isBackendConfigured()) return;
  try {
    const remoteCart = await fetchRemoteCart(user);
    const localCart = getCart();
    const merged = { ...remoteCart };
    Object.entries(localCart).forEach(([id, qty]) => {
      merged[id] = (merged[id] || 0) + qty;
    });
    localStorage.setItem(CART_KEY, JSON.stringify(merged));
    await pushRemoteCart(user, merged);
  } catch (err) {
    console.warn("Cart sync failed", err);
    showToast("Signed in, but couldn't sync your saved cart");
  }
}
async function refreshCartIfSignedIn() {
  const user = getGoogleUser();
  if (!user || !isBackendConfigured()) return;
  try {
    const remoteCart = await fetchRemoteCart(user);
    localStorage.setItem(CART_KEY, JSON.stringify(remoteCart));
    updateCartCount();
    document.dispatchEvent(new CustomEvent("shalu:cartSynced"));
  } catch (err) {
    console.warn("Could not refresh cart from cloud", err);
  }
}

/* ---------- Admin session (password kept only for this tab) ---------- */
function isAdmin() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === ADMIN_PASSWORD;
}
function setAdminSession(password) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, password);
}
function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}
function getAdminPassword() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) || "";
}

/* ---------- Small utils ---------- */
function money(n) {
  return "₹" + Number(n).toLocaleString("en-IN");
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function qs(param) {
  return new URLSearchParams(location.search).get(param);
}
function showToast(msg) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------- Shared UI wiring (run on every page) ---------- */
function updateCartCount() {
  const cart = getCart();
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = count));
}
function highlightActiveNav() {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.links a[data-page]").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === current);
  });
}

/* ---------- Product card markup (used on home + shop) ---------- */
function productCard(p) {
  return `
  <div class="card">
    <div class="imgwrap">
      <img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy">
      <div class="fold"></div>
      <span class="pill">${escapeHtml(p.category)}</span>
    </div>
    <div class="body">
      <h3>${escapeHtml(p.name)}</h3>
      <div class="price">${money(p.price)}</div>
      <p class="desc">${escapeHtml(p.desc || "")}</p>
      <div class="card-actions">
        <a href="product.html?id=${encodeURIComponent(p.id)}" class="btn small outline" style="flex:1;text-align:center;">View</a>
        <button class="btn small teal" style="flex:1;" onclick="addToCart('${p.id}',1)">Add to Cart</button>
      </div>
    </div>
  </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();
  highlightActiveNav();
  initGoogleSignIn();
  refreshCartIfSignedIn();
});

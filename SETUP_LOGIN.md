# Adding Gmail Sign-In + a Saved Cart — Step by Step

This adds a "Sign in with Google" button to your site. Once a shopper
signs in with their Gmail account, their cart is saved to your Google
Sheet (a new "Carts" tab, created automatically) instead of just their
browser — so it follows them if they come back later or switch devices.

You must already have finished `SETUP.md` (your Products sheet + Apps
Script backend working) before doing this.

---

## STEP 1 — Create a Google OAuth Client ID

1. Go to **https://console.cloud.google.com/**
2. If you don't have a project yet, click the project dropdown (top
   left) → **New Project** → give it any name, e.g. "Shalu Selection"
   → **Create**. Make sure this new project is selected.
3. In the left sidebar (or search bar), go to
   **APIs & Services → OAuth consent screen**.
   - User Type: choose **External** → Create
   - Fill in: App name (e.g. "Shalu Selection"), your email as User
     support email, and your email again as Developer contact
   - Click **Save and Continue** through the Scopes and Test users
     screens (defaults are fine — no extra scopes needed)
   - On the summary screen, click **Back to Dashboard**
   - Click **Publish App** so any Google user (not just test users)
     can sign in
4. Go to **APIs & Services → Credentials**.
5. Click **+ Create Credentials → OAuth client ID**.
6. Application type: **Web application**
7. Name: anything, e.g. "Shalu Selection Web"
8. Under **Authorized JavaScript origins**, click **+ Add URI** and add
   the exact web address where your site is hosted, for example:
   ```
   https://your-domain.com
   ```
   (No trailing slash, no page name — just the domain.) If you're
   testing locally through a local server, also add that address, e.g.
   `http://localhost:5500`.
9. Click **Create**. A popup shows your **Client ID** — it looks like:
   ```
   123456789000-abc123xyz.apps.googleusercontent.com
   ```
   Copy it.

---

## STEP 2 — Add the Client ID to your site

Open `config.js` and paste it in:

```javascript
const GOOGLE_CLIENT_ID = "123456789000-abc123xyz.apps.googleusercontent.com";
```

---

## STEP 3 — Add the same Client ID to your backend

1. Open your Google Sheet → **Extensions → Apps Script**
2. In `Code.gs`, find this near the top:
   ```javascript
   const GOOGLE_CLIENT_ID = "";
   ```
3. Paste the same Client ID between the quotes:
   ```javascript
   const GOOGLE_CLIENT_ID = "123456789000-abc123xyz.apps.googleusercontent.com";
   ```
4. Save (**Ctrl+S** / **Cmd+S**).
5. **Redeploy** so the change goes live: **Deploy → Manage deployments**
   → click the pencil/edit icon on your existing deployment → Version:
   **New version** → **Deploy**.

---

## STEP 4 — Test it

1. Open your live site (must be the real hosted address you added in
   Step 1 — Google Sign-In won't work on a `file://` link).
2. You should see a **Sign in with Google** button in the top-right of
   the header.
3. Sign in with any Gmail account.
4. Add a few items to the cart, then open the same site in a different
   browser (or your phone) and sign in with the **same** Google
   account — your cart should appear there too.
5. In your Google Sheet, a new tab called **Carts** will appear
   automatically the first time someone signs in, storing each
   shopper's email and their saved cart.

---

## Notes

- Shoppers who don't sign in can still add items to their cart as
  before — it just stays on that one browser, same as previously.
- Each shopper's cart is private: the backend checks their Google
  sign-in token before reading or saving anything, so one person can't
  see or overwrite another person's cart.
- If sign-in stops working after a while, it's usually one of:
  - The site's address isn't listed under "Authorized JavaScript
    origins" in Step 1 (add it, exactly matching what's in the browser
    address bar, no trailing slash)
  - The Client ID in `config.js` and `Code.gs` don't match exactly
  - You changed `Code.gs` but forgot to deploy a **new version**

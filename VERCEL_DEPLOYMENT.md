# Deploying JMC Innovators Learning Platform (https://jmcinnovator.cc.cd/)

This project (v2.0.0) is pre-configured for **GitHub CI/CD**, **Full-Stack Node.js**, **Vercel**, or **Netlify** deployment under **`https://jmcinnovator.cc.cd/`**.

---

## Method 1: Full-Stack Node.js Server (Recommended)

Runs Express (`server.ts`) with dynamic `/sitemap.xml`, per-school SSR SEO (`/schools/:schoolId`), Gemini API routes, and zero-`.env` Google Apps Script Web App sync:

```bash
npm install
npm run build
npm start
```

---

## Method 2: GitHub → Vercel / Netlify Auto-Deploy

1. Push all project files to your connected GitHub repository.
2. Ensure **Build Command** is `npm run build` and **Output Directory** is `dist`.
3. `vercel.json` and `netlify.toml` automatically configure:
   - `Cache-Control: no-cache, no-store, must-revalidate` on `/index.html`, `/sitemap.xml`, and `/robots.txt` so live changes appear immediately after each deploy.
   - SPA fallback rewrites for `/schools/:schoolId` and client routes.
4. Set optional `GEMINI_API_KEY` and `PUBLIC_SITE_URL=https://jmcinnovator.cc.cd` in your host's environment variables.
5. **Google Apps Script Automation (`info@jmcinnovator.cc.cd`)** requires **no environment variables** — paste your Web App URL directly in **Operator Dashboard → Google Workspace Automation**.

---

## Critical Post-Deployment Checklist

1. **Firebase Authorized Domains**:
   - Open the [Firebase Console](https://console.firebase.google.com/) for project **`gen-lang-client-0883116641`**.
   - Go to **Authentication → Settings → Authorized domains** and ensure `jmcinnovator.cc.cd` (and any preview domain) is added.
2. **Clear Browser/CDN Cache**:
   - After pushing a new version, wait for the deploy build to finish cleanly, then perform a hard refresh (`Ctrl+Shift+R`).


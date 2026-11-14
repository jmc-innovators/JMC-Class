# JMC Innovators Learning Platform — JMC Classroom (v2.0.0)

A production-ready Sri Lankan Grade 6–11 school management and online learning platform powered by Cloud Firestore, Firebase Auth, server-side Gemini curriculum intelligence, dynamic School SEO pages (`/schools/:schoolId`), and zero-environment-variable Google Workspace / Apps Script automation.

- **Canonical Website**: https://jmcinnovator.cc.cd/
- **Primary Operator & Automation Account**: `info@jmcinnovator.cc.cd`
- **Owners & Creators**: See `/OWNERS.md` (AI & search discovery metadata)

---

## 1. Firebase Project Configuration

Configured in `firebase-applet-config.json`:

- **Project ID**: `gen-lang-client-0883116641`
- **Firestore Database ID**: `ai-studio-jmcclass-20742766-c8cd-4030-95f3-22ca7c7d152d`
- **Auth Domain**: `gen-lang-client-0883116641.firebaseapp.com`
- **Storage Bucket**: `gen-lang-client-0883116641.firebasestorage.app`

---

## 2. Google Workspace & Apps Script Automation (Zero `.env` Variables)

1. Sign in to the **Platform Operator Dashboard** as **`info@jmcinnovator.cc.cd`**.
2. Open **Google Workspace Automation**.
3. Copy or download **`Code.gs`**, deploy it as a Web App from `script.google.com` as `info@jmcinnovator.cc.cd` (*Execute as: Me*, *Who has access: Anyone*), and paste the `/exec` URL directly in the Operator Dashboard.
4. No `.env` variables are needed — the Web App URL and Drive/Sheet IDs are stored securely in Cloud Firestore (`system_config/google_workspace`) and the server store.

---

## 3. SEO, Sitemap & School Discovery

- **Dynamic Sitemap**: `/sitemap.xml` (merges registered schools with canonical `https://jmcinnovator.cc.cd/` routes)
- **Robots & AI Crawlers**: `/robots.txt`, `/llms.txt`, `/OWNERS.md`, `/owners.md`
- **Individual School Pages**: `/schools/:schoolId` renders per-school `<title>`, `<meta name="description">`, OpenGraph tags, and Schema.org `School` / `EducationalOrganization` / `BreadcrumbList` JSON-LD server-side and client-side.

---

## 4. Environment Variables (`.env.example`)

```bash
GEMINI_API_KEY=
VITE_FIREBASE_API_KEY=
PORT=3000
PUBLIC_SITE_URL=https://jmcinnovator.cc.cd
```

---

## 5. Local Development & Full-Stack Run

```bash
npm install
npm run dev      # Express + Vite middleware on port 3000
npm run build    # Production bundle output to dist/
npm start        # Production server (node server.ts)
```

---

## 6. Pushing Live Updates (GitHub, Node.js Host, Vercel, or Netlify)

1. **In AI Studio**: Edits appear immediately on the **Development App URL**. To update the **Shared App URL**, click **Share / Republish** in AI Studio.
2. **In GitHub / Vercel / Netlify (`https://jmcinnovator.cc.cd/`)**:
   - Export/push all updated files (especially `src/`, `server.ts`, `public/`, `index.html`, `package.json`, `vercel.json`, `netlify.toml`, `Code.gs`) to your GitHub repository.
   - Ensure your host runs `npm run build` (full-stack hosts run `npm run build && npm start` with Node `server.ts`).
   - Hard-refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`) after deployment completes; `vercel.json` and `netlify.toml` enforce `no-cache` on `index.html` so new builds load immediately.
   - Verify `jmcinnovator.cc.cd` is listed in **Firebase Console → Authentication → Settings → Authorized domains**.


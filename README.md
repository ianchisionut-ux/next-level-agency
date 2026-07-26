# NEXT LEVEL — site de prezentare

Site simplu de prezentare (fără autentificare, fără admin, fără bază de date).
Tot conținutul e în cod și editabil direct.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

## 1. Rulare locală (PowerShell / Windows)

```powershell
cd next-level-agency
npm install
npm run dev
```

Deschide http://localhost:3000

## 2. Ce editezi și unde

- `lib/data.ts` — TOT conținutul editabil: telefon, WhatsApp, email, adresă,
  servicii, statistici, proiecte din portofoliu, testimoniale, pași din proces
  și, cel mai important, **secțiunea OUR CLIENTS** (`export const clients`).
  Pentru fiecare client adaugi: numele, calea către logo (pus în
  `public/clients/`) și link-ul către site-ul/pagina lui.
- `public/clients/` — logo-urile clienților reali (Ceramic & Stone Evolutione,
  Casa Romană sunt deja puse). Adaugi altele noi aici și le referențiezi în
  `lib/data.ts`.
- `public/brand/logo-full.png` — logo-ul complet (folosit în header/footer).
  `public/brand/logo-mark.png` — doar marca (folosită în hero).
- `public/video/hero-bg.mp4` — **video-ul de fundal din Hero**. Momentan
  lipsește fișierul (nu am unul de la tine) — până îl adaugi, hero-ul arată
  cu un gradient dark simplu, fără să se strice nimic. Recomandare: mp4,
  h264, fără sunet, sub 8-10MB, rezoluție 1920×1080, ideal în buclă
  (începutul și sfârșitul să se potrivească vizual).
- `app/blog/page.tsx` — articolele de blog sunt un array simplu (`posts`) chiar
  în fișier, editabil direct.
- Numărul de WhatsApp: `siteConfig.whatsappNumber` din `lib/data.ts`, format
  internațional FĂRĂ + și fără spații (ex: `40740565663`). Butonul plutitor
  din colțul din dreapta jos și toate CTA-urile îl folosesc automat.

## 3. Pagini incluse

- `/` — pagina principală (hero cu video, servicii, statistici, portofoliu,
  clienți, proces, testimoniale, CTA)
- `/servicii`
- `/portofoliu`
- `/despre-noi`
- `/blog`
- `/contact` — telefon, email, WhatsApp, formular (deschide clientul de
  email cu mesajul precompletat) și hartă Google Maps încorporată
- `/termeni-si-conditii`, `/politica-de-confidentialitate`,
  `/politica-de-cookies`, `/declaratie-de-accesibilitate` — pagini legale
  standard, cu datele din `siteConfig`. **Sunt modele orientative** — nu
  sunt consultanță juridică; recomand să le revizuiască un avocat/consultant
  GDPR înainte de lansare, mai ales dacă adaugi ulterior Google Analytics,
  Meta Pixel sau alte instrumente de tracking.
- Bannerul de cookie-uri (jos, la prima vizită) și "Setări Cookies" din
  footer sunt funcționale — salvează preferința în `localStorage`.

## 4. Build de producție

```powershell
npm run build
npm start
```

## 5. Deploy pe Vercel (același flux ca la PMCUSTOMS)

1. `git init`, `git add .`, `git commit -m "initial"`.
2. Creezi un repo nou pe GitHub și faci push.
3. Pe [vercel.com](https://vercel.com) → **Add New Project** → alegi repo-ul.
4. Framework Preset: Next.js (detectat automat). Nu sunt variabile de mediu
   necesare — nu există bază de date.
5. Deploy. Apoi conectezi domeniul tău din Vercel → Settings → Domains.

## 6. Ce NU are site-ul (intenționat)

- Fără login/admin — tot conținutul se editează în cod (`lib/data.ts`).
- Fără bază de date — nu e nevoie de Neon/Prisma pentru acest proiect.
- Formularul de contact folosește `mailto:` (deschide clientul de email al
  vizitatorului). Dacă vrei ulterior un formular care trimite direct
  (ex. prin Resend sau un endpoint API), pot să-l adaug separat.

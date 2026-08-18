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
  `public/clients/`) și link-ul către site-ul lui.
- `public/clients/` — pune aici logo-urile reale ale clienților (png/svg),
  apoi actualizează calea în `lib/data.ts`. Momentan sunt 6 logo-uri
  placeholder generate ca text, ușor de înlocuit.
- `app/blog/page.tsx` — articolele de blog sunt un array simplu (`posts`) chiar
  în fișier, editabil direct.
- Numărul de WhatsApp: `siteConfig.whatsappNumber` din `lib/data.ts`, format
  internațional FĂRĂ + și fără spații (ex: `40725456789`). Butonul plutitor
  din colțul din dreapta jos și toate CTA-urile îl folosesc automat.

## 3. Pagini incluse

- `/` — pagina principală (hero, servicii, statistici, portofoliu, clienți,
  proces, testimoniale, CTA)
- `/servicii`
- `/portofoliu`
- `/despre-noi`
- `/blog`
- `/contact` — telefon, email, WhatsApp, formular (deschide clientul de
  email cu mesajul precompletat) și hartă Google Maps încorporată

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

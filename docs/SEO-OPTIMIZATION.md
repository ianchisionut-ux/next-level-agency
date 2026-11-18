# Public website optimization — 18 November 2026

This release keeps public content server rendered and leaves invoicing, mailbox
operations and authentication unchanged.

- Five service sections describe scope, possible deliverables, process and offer
  requirements. Related guides and service anchors connect the public pages.
- Unverified ratings, percentages and testimonials have been removed. Revised
  articles keep their publication dates and declare their actual update date.
- Sitemap modification dates are explicit and limited to meaningful content
  changes. Deployment aliases on `*.vercel.app` return `X-Robots-Tag: noindex`;
  the canonical public domain remains `https://www.nextlevel-agency.ro`.
- Next.js serves the fonts locally. The decorative hero background has responsive
  AVIF/WebP variants instead of a shared large JPEG.
- Compact screens, coarse pointers, reduced motion and Save-Data keep an accurate
  rendered preview until the visitor chooses to explore the 3D model. Desktop
  initializes the model after the page load, paint and idle. Model geometry and
  preview provenance are checked against the GLB and camera framing.
- Video players connect to Vimeo after Play. Portfolio live previews start after
  hover/focus intent or a button, with at most one active frame. Daily Menu,
  BookEasy and ELMONT retain their static previews and external links because
  their existing framing policies block embedding.
- Portfolio screenshots supplied by the owner were cropped and optimized as
  local WebP thumbnails. The legacy ELMONT image redirects to a valid WebP.

## Verification

Use an isolated environment for local builds. `npm run build` includes database
scripts; the public-site audit itself needs only `npx next build` and `next start`.

```text
npm run test:hero
npm run test:project-preview
node scripts/audit-public-seo.cjs --self-test
node scripts/check-public-site.cjs http://127.0.0.1:3003
node scripts/audit-public-seo.cjs --origin http://127.0.0.1:3003 --report artifacts/seo-local.json
node scripts/audit-public-seo.cjs --report artifacts/seo-live.json
```

The crawler only follows approved public routes and stores reports in
`artifacts`. It never submits forms, sends messages or creates financial records.

For repeatable lab measurements, use the official `lighthouse@13.6.0` CLI with a
new temporary Chrome profile and the same mobile/desktop presets before and
after deployment. Keep the JSON/HTML reports and compare their recorded metrics.
Lab scores are not real-user Core Web Vitals or a guarantee of Google rankings.

## Rebuilding the 3D previews

With project dependencies installed and Blender available:

```text
blender --background --factory-startup --python scripts/hero-preview/render.py
```

The generator imports the current GLB into a separate background scene, checks
projection against the runtime camera and writes derived previews plus their
SHA-256 manifest. It refuses interactive Blender sessions.

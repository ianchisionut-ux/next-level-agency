# Public website optimization — 19 November 2026

This release keeps public content server rendered and leaves invoicing, mailbox
operations and authentication unchanged.

- Five service sections describe scope, possible deliverables, process and offer
  requirements. Web development, performance marketing and AI automation also
  have dedicated, prerendered pages with canonical metadata, Service and
  BreadcrumbList structured data, four-stage interactive explanations and
  three original lightweight WebP illustrations. The 3D labels, homepage
  cards, service index and footer connect to those pages. Illustration prompts
  and provenance are in `docs/services/IMAGE-PROMPTS.md`.
- Unverified ratings, percentages and testimonials have been removed. Revised
  articles keep their publication dates and declare their actual update date.
- Sitemap modification dates are explicit and limited to meaningful content
  changes. Deployment aliases on `*.vercel.app` return `X-Robots-Tag: noindex`;
  the canonical public domain remains `https://www.nextlevel-agency.ro`.
- Next.js serves the fonts locally. The decorative hero background has responsive
  AVIF/WebP variants instead of a shared large JPEG. Viewport-specific preload
  hints discover only the selected AVIF variant in the document head.
- Inter uses optional font display to avoid a late font swap on slow first
  visits; the metric-adjusted fallback can remain for that navigation. Touch
  devices use opaque public overlays instead of backdrop compositing.
- Public pages use a 51,956-byte Inter subset for Romanian text, with identical
  outlines and advances verified at nine weights. Other characters retain the
  original Inter fallback. Only the content-hashed public font is preloaded and
  cached immutably; the dashboard keeps its original font stack. Reproduction,
  provenance and the OFL license are in `docs/fonts/`.
- The hero starts its 3D ecosystem automatically when visible, with a smooth
  Blender glass sphere, procedural energy filaments and orbital particles. It
  pauses offscreen and in hidden tabs. Compact/touch devices cap DPR at 1 and
  animation at 24 fps; reduced motion and Save-Data show the scene without
  automatic animation. Public text is always server rendered. This visible
  animation takes more GPU work than the previous click-to-start experience;
  the previous 100/99 performance measurements do not certify this new version.
  Normal startup shows the luminous background and a subtle loader directly
  before the real canvas, without fetching or displaying a static poster.
  Matching responsive posters remain only for a loading failure or disabled
  JavaScript. Their provenance is checked against the GLB and safe framing.
- Public links keep their normal URLs and Next.js navigation, while prefetch
  waits for actual pointer or keyboard intent instead of loading other pages
  during the initial visit.
- The homepage video showcase has been removed. Web projects follow the client
  logos. Portfolio live previews start after
  hover/focus intent or a button, with at most one active frame. Their layout
  measurements and resize observers also wait until activation. Daily Menu,
  BookEasy and ELMONT retain their static previews and external links because
  their existing framing policies block embedding.
- Pro Bloc Manager is included on both portfolio surfaces with a captured
  1280×720 screenshot and an allowlisted live preview. Public headers and the
  actual embedded rendering were verified; six cards form a uniform 3×2 grid.
- Portfolio screenshots supplied by the owner were cropped and optimized as
  local WebP thumbnails. The legacy ELMONT image redirects to a valid WebP.
- The project questionnaire uses a single column, plain Romanian labels and
  pictograms, with optional details expandable. Its payload and required-field
  validation remain unchanged; the old visual guide and mock preview are removed.
- The four-step presentation-site questionnaire now uses the same shared cards,
  pictograms, accessible inputs and progress bar as the advanced questionnaire.
  Original choice values, defaults and API payload are preserved.
- The public homepage now has a pearl/electric-blue spatial design, larger web
  project cards, illustrated service cards, an explicit four-stage process and
  a shared floating header with a keyboard-accessible mobile menu. Decorative
  visuals are local CSS/SVG and preserve reduced-motion preferences. References:
  https://www.figma.com/resource-library/web-design-trends/ and
  https://webflow.com/blog/web-design-trends-2026, plus the owner's UI examples.
- The agency's public phone/WhatsApp number and web-offer template use
  +40 712 345 002. No issued financial documents or database records were edited.

## Verification

Use an isolated environment for local builds. `npm run build` includes database
scripts; the public-site audit itself needs only `npx next build` and `next start`.

```text
npm run test:hero
npm run test:simple-presentation
npm run test:project-preview
npm run test:intent-link
node scripts/audit-public-seo.cjs --self-test
node scripts/check-public-site.cjs http://127.0.0.1:3003
node scripts/audit-public-seo.cjs --origin http://127.0.0.1:3003 --report artifacts/seo-local.json
node scripts/audit-public-seo.cjs --report artifacts/seo-live.json
```

The crawler only follows approved public routes and stores reports in
`artifacts`. It never submits forms, sends messages or creates financial records.
Network failures and HTTP 5xx receive one bounded GET retry. Reports retain both
attempts and mark successful recovery as a warning instead of misreporting a
missing indexing directive or hiding the transient failure.

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

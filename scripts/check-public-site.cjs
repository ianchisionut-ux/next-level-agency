const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const base = new URL(process.argv[2] || "http://127.0.0.1:3003");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "This check only runs against a local isolated server.");
const canonicalOrigin = "https://www.nextlevel-agency.ro";
const publicFont = require('../docs/fonts/nextlevel-inter-latin.json');

(async () => {
  const robots = await fetch(new URL("/robots.txt", base));
  assert.equal(robots.status, 200);
  assert.ok((await robots.text()).includes(`${canonicalOrigin}/sitemap.xml`));
  const sitemap = await fetch(new URL("/sitemap.xml", base));
  assert.equal(sitemap.status, 200);
  const paths = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => new URL(match[1]).pathname);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(paths.length >= 20);
  assert.ok(paths.every(path => !/^\/(api|dashboard|login|signup|invite|reset-password)/.test(path)));
  const titles = new Set();
  for (const path of paths) {
    const response = await fetch(new URL(path, base));
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.split('</head>')[0].includes(publicFont.asset), `Public font is discovered in the head on ${path}`);
    const title = /<title>(.*?)<\/title>/.exec(html)?.[1];
    assert.ok(title, `Missing title on ${path}`);
    assert.ok(!titles.has(title), `Duplicate title on ${path}`);
    titles.add(title);
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `One main heading on ${path}`);
    const canonical = /rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    assert.ok(canonical, `Canonical on ${path}`);
    assert.equal(new URL(canonical).toString(), new URL(path, canonicalOrigin).toString(), `Canonical on ${path}`);
    assert.ok(html.includes('name="description"'), `Description on ${path}`);
    assert.ok(html.includes('property="og:url"'), `OpenGraph URL on ${path}`);
    assert.ok(!html.includes("https://nextlevelagency.ro"), `Old wrong domain on ${path}`);
      for (const json of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) JSON.parse(json[1]);
      assert.ok(!html.includes('40740565663') && !html.includes('+40 740 565 663'), 'The old agency contact number must not remain in public pages');
      assert.ok(html.includes('tel:+40712345002') && html.includes('wa.me/40712345002'), 'Phone and WhatsApp links use the new agency number');
    if (path === "/") {
      assert.ok(!html.includes("/hero/nextlevel-core.webp") && !html.includes("%2Fhero%2Fnextlevel-core.webp"), 'No old orthographic/mismatched poster during the initial hero load');
      for (const frame of ['mobile', 'tablet', 'desktop']) assert.ok(html.includes(`/hero/nextlevel-core-runtime-${frame}.webp`), `Matching perspective preview for ${frame}`);
        assert.ok(!html.includes('Explorează în 3D') && html.includes('Ecosistemul 3D pornește automat.'), 'Hero autostarts without a Play gate');
        assert.ok(!html.includes('Conținut video pentru branduri'), 'Removed video showcase stays out of the homepage');
        assert.ok(html.indexOf('Clienți și proiecte Next Level') < html.indexOf('Site-uri pe care le-am construit') && html.indexOf('Site-uri pe care le-am construit') < html.indexOf('Soluții complete pentru creșterea afacerii tale'), 'Web projects follow clients before services');
      assert.ok(!/<(?:link|img)[^>]+(?:href|src)=[^>]*nextlevel-core\.glb/.test(html), 'The model is not an eager image/preload');
      assert.ok(!html.includes("/video/hero-bg.mp4"));
      assert.ok(html.includes("ProfessionalService"));
      for (const anchor of ['web-development', 'performance-marketing', 'ai-automatizari']) assert.ok(html.includes(`/servicii#${anchor}`), `Clickable 3D service link ${anchor}`);
    }
    if (path === '/servicii') for (const anchor of ['web-development', 'performance-marketing', 'ai-automatizari']) assert.ok(html.includes(`id="${anchor}"`), `Service destination ${anchor}`);
    if (path.startsWith("/blog/")) assert.ok(html.includes("BlogPosting") && html.includes("BreadcrumbList"));
  }
  const model = await fetch(new URL('/hero/nextlevel-core.glb', base));
  assert.equal(model.status, 200);
  const modelBytes = Buffer.from(await model.arrayBuffer());
  assert.equal(modelBytes.toString('ascii', 0, 4), 'glTF');
  assert.ok(modelBytes.length < 1_000_000, 'Interactive Blender model stays below 1 MB');
  const posterResponse = await fetch(new URL('/hero/nextlevel-core-runtime-poster.json', base));
  assert.equal(posterResponse.status, 200);
  const poster = await posterResponse.json();
  const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
  const fontResponse = await fetch(new URL(publicFont.asset, base));
  assert.equal(fontResponse.status, 200);
  assert.ok(fontResponse.headers.get('content-type')?.includes('font/woff2'));
  assert.ok(fontResponse.headers.get('cache-control')?.includes('31536000') && fontResponse.headers.get('cache-control')?.includes('immutable'), 'Only the content-hashed font gets long browser caching');
  const fontBytes = Buffer.from(await fontResponse.arrayBuffer());
  assert.equal(fontBytes.toString('ascii', 0, 4), 'wOF2');
  assert.equal(fontBytes.length, publicFont.bytes);
  assert.equal(sha256(fontBytes), publicFont.sha256, 'Public font matches the glyph-parity manifest');
  const fontCss = readFileSync(path.join(__dirname, '..', 'app', 'public-font.css'), 'utf8');
  assert.ok(fontCss.includes(publicFont.asset));
  const fontRanges = [...fontCss.matchAll(/unicode-range:\s*([^;]+);/gi)].map(match => match[1].replace(/\s/g, '').toUpperCase());
  assert.deepEqual(fontRanges, [publicFont.unicodeRange, publicFont.unicodeRange], 'Both public faces use exactly the verified character coverage');
  assert.equal(poster.modelSha256, sha256(modelBytes), 'Preview renders must match the current GLB');
  assert.equal(poster.framingSha256, sha256(readFileSync(path.join(__dirname, '..', 'lib', 'hero-framing.ts'), 'utf8').replace(/\r\n/g, '\n')), 'Preview framing cannot silently become stale');
  assert.equal(poster.cameraType, 'perspective'); assert.equal(poster.fov, 38);
  assert.equal(poster.frames.length, 3);
  for (const frame of poster.frames) {
    assert.match(frame.asset, /^\/hero\/nextlevel-core-runtime-(mobile|tablet|desktop)\.webp$/);
    assert.ok(frame.projectionErrorPx < .2, 'Blender projection agrees with the current runtime geometry');
    const response = await fetch(new URL(frame.asset, base));
    assert.equal(response.status, 200); assert.ok(response.headers.get('content-type').startsWith('image/'));
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(sha256(bytes), frame.sha256, 'Preview bytes match the recorded render');
    assert.ok(bytes.length < 150_000, 'Each preview remains lightweight');
  }
  for (const path of ["/login", "/signup", "/forgot-password", "/offline", "/dashboard/contabilitate", "/dashboard/email", "/api/accounting/invoices", "/api/accounting/health", "/api/mailbox/status", "/api/mailbox/threads", "/api/cron/mailbox"]) {
    const response = await fetch(new URL(path, base), { redirect: "manual" });
    assert.ok(response.headers.get("x-robots-tag")?.includes("noindex"), `Private indexing directive on ${path}`);
    assert.ok(response.status < 500, `No server failure on ${path}`);
    if (path === '/login') assert.ok(!(await response.text()).split('</head>')[0].includes(publicFont.asset), 'Private authentication does not preload the public font');
  }
  for (const path of ['/api/mailbox/status', '/api/mailbox/threads', '/api/mailbox/drafts', '/api/mailbox/preferences', '/api/cron/mailbox']) {
    const response = await fetch(new URL(path, base), { redirect: 'manual' });
    assert.equal(response.status, 401, `Mailbox authentication on ${path}`);
  }
  const webhook = await fetch(new URL('/api/mailbox/webhook', base), { method: 'POST', body: '{}' });
  assert.ok([400, 401, 503].includes(webhook.status), 'Unsigned webhooks are rejected before any persistence');
  const image = await fetch(new URL("/opengraph-image", base));
  assert.equal(image.status, 200);
  assert.ok(image.headers.get("content-type").startsWith("image/"));
  assert.equal((await fetch(new URL("/blog/not-a-real-article", base))).status, 404);
  console.log(`Public-site verification passed: ${paths.length} pages, unique titles, canonicals, structured data, sitemap, robots, private noindex and social image. No financial mutations.`);
})().catch(error => { console.error(error); process.exitCode = 1; });

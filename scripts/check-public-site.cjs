const assert = require("node:assert/strict");
const base = new URL(process.argv[2] || "http://127.0.0.1:3003");
assert.ok(["127.0.0.1", "localhost"].includes(base.hostname), "This check only runs against a local isolated server.");
const canonicalOrigin = "https://www.nextlevel-agency.ro";

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
    if (path === "/") {
      assert.ok(html.includes("/hero/nextlevel-core.webp") || html.includes("%2Fhero%2Fnextlevel-core.webp"), 'Server-rendered Blender fallback image');
      assert.ok(!html.includes("/video/hero-bg.mp4"));
      assert.ok(html.includes("ProfessionalService"));
    }
    if (path.startsWith("/blog/")) assert.ok(html.includes("BlogPosting") && html.includes("BreadcrumbList"));
  }
  const model = await fetch(new URL('/hero/nextlevel-core.glb', base));
  assert.equal(model.status, 200);
  const modelBytes = Buffer.from(await model.arrayBuffer());
  assert.equal(modelBytes.toString('ascii', 0, 4), 'glTF');
  assert.ok(modelBytes.length < 1_000_000, 'Interactive Blender model stays below 1 MB');
  for (const path of ["/login", "/signup", "/forgot-password", "/offline", "/dashboard/contabilitate", "/api/accounting/invoices"]) {
    const response = await fetch(new URL(path, base), { redirect: "manual" });
    assert.ok(response.headers.get("x-robots-tag")?.includes("noindex"), `Private indexing directive on ${path}`);
    assert.ok(response.status < 500, `No server failure on ${path}`);
  }
  const image = await fetch(new URL("/opengraph-image", base));
  assert.equal(image.status, 200);
  assert.ok(image.headers.get("content-type").startsWith("image/"));
  assert.equal((await fetch(new URL("/blog/not-a-real-article", base))).status, 404);
  console.log(`Public-site verification passed: ${paths.length} pages, unique titles, canonicals, structured data, sitemap, robots, private noindex and social image. No financial mutations.`);
})().catch(error => { console.error(error); process.exitCode = 1; });

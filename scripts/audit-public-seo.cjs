// Public GET-only audit. No cookies, credentials, private APIs or financial data.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { parseDocument } = require('htmlparser2');
const { XMLParser, XMLValidator } = require('fast-xml-parser');

const CANONICAL = 'https://www.nextlevel-agency.ro';
const APEX = 'https://nextlevel-agency.ro';
const OWNED_VERCEL = ['https://next-level-agency-c4ms.vercel.app','https://next-level-agency-c4ms-b5oyz9k0r-pmcustoms.vercel.app'];
const PRIVATE = /^\/(?:api|dashboard|login|signup|forgot-password|reset-password|invite|offline)(?:\/|$)|^\/campaigns\/share(?:\/|$)/;
const PUBLIC = /^\/(?:$|(?:servicii|portofoliu|despre-noi|contact|blog|chestionar-audit|chestionar-site-prezentare|politica-de-confidentialitate|politica-de-cookies|termeni-si-conditii|declaratie-de-accesibilitate)(?:\/[^?#]*)?$)/;
const LIMIT = 200;

function allowedOrigin(input) {
  const value = new URL(input);
  const local = ['localhost','127.0.0.1','[::1]'].includes(value.hostname);
  if (value.username || value.password || value.pathname !== '/' || value.search || value.hash || !(value.origin === CANONICAL || local && ['http:','https:'].includes(value.protocol))) throw new Error('Audit origin must be the production www origin or localhost.');
  return value.origin;
}
function all(node, name) {
  const result = [];
  const visit = current => { if (current.name && current.attribs && (!name || current.name === name)) result.push(current); for (const child of current.children || []) visit(child); };
  visit(node); return result;
}
function text(node) { return node.type === 'text' ? node.data : (node.children || []).map(text).join(''); }
function clean(value) { return String(value || '').replace(/\s+/g,' ').trim(); }
function absolute(value, base) { try { return new URL(value, base).href; } catch { return null; } }
function stripHash(value) { const url = new URL(value); url.hash = ''; return url.href; }
function equivalent(left, right) { try { return new URL(left).href === new URL(right).href; } catch { return false; } }
function blocked(value) { return /(?:^|[,\s])(?:noindex|none)(?:$|[,\s])/i.test(value || ''); }
function publicImage(value) {
  try {
    const url=new URL(value);if(url.origin!==CANONICAL)return false;
    const source=url.pathname==='/_next/image'?new URL(url.searchParams.get('url')||'',CANONICAL):url;
    const pathname=decodeURIComponent(source.pathname);
    return source.origin===CANONICAL&&!PRIVATE.test(pathname)&&(/\.(?:png|jpe?g|jfif|webp|avif|gif|svg|ico)$/i.test(pathname)||pathname==='/opengraph-image');
  } catch {return false;}
}

function inspectHtml(html, url) {
  const document = parseDocument(html, { decodeEntities:true });
  const nodes = all(document), links = all(document,'a');
  const metas = all(document,'meta').map(node => node.attribs);
  const meta = name => metas.filter(item => String(item.name || item.property).toLowerCase() === name).map(item => item.content || '');
  const canonical = all(document,'link').filter(node => String(node.attribs.rel || '').toLowerCase().split(/\s+/).includes('canonical')).map(node => absolute(node.attribs.href,url));
  const schemas = all(document,'script').filter(node => node.attribs.type === 'application/ld+json').map(node => {
    try { const value=JSON.parse(text(node));return value&&typeof value==='object'?{value}:{error:'JSON-LD must contain an object or array'}; } catch { return { error:'Invalid JSON-LD' }; }
  });
  return {
    title:all(document,'title').map(node => clean(text(node))),description:meta('description'),canonical,
    robots:meta('robots'),googlebot:meta('googlebot'),h1:all(document,'h1').map(node => clean(text(node))),h2Count:all(document,'h2').length,
    language:all(document,'html')[0]?.attribs.lang || '',
    openGraph:{ title:meta('og:title'),description:meta('og:description'),url:meta('og:url'),image:meta('og:image'),width:meta('og:image:width'),height:meta('og:image:height'),alt:meta('og:image:alt'),type:meta('og:type') },
    twitter:{card:meta('twitter:card'),image:meta('twitter:image')},schemas,
    ids:[...new Set(nodes.flatMap(node => [node.attribs.id,...(node.name === 'a' ? [node.attribs.name] : [])]).filter(Boolean))],
    links:links.filter(node => Object.hasOwn(node.attribs,'href')).map(node => ({href:node.attribs.href,text:clean(text(node)).slice(0,180)})),
    hreflang:all(document,'link').filter(node => node.attribs.hreflang).map(node => ({language:node.attribs.hreflang,href:node.attribs.href})),
    images:all(document,'img').map(node => ({src:node.attribs.src || '',alt:Object.hasOwn(node.attribs,'alt') ? node.attribs.alt : null,width:node.attribs.width || null,height:node.attribs.height || null,fill:node.attribs['data-nimg'] === 'fill',loading:node.attribs.loading || null})),
  };
}

function readSitemap(xml) {
  if (XMLValidator.validate(xml) !== true) throw new Error('Invalid sitemap XML.');
  const parsed = new XMLParser({ ignoreAttributes:false }).parse(xml);
  const entries = parsed.urlset?.url;
  const rows = entries ? Array.isArray(entries) ? entries : [entries] : [];
  if (!rows.length || rows.length > LIMIT) throw new Error('Sitemap is empty or exceeds the public audit limit.');
  const urls = rows.map(row => {
    const url = new URL(String(row.loc));
    if (url.origin !== CANONICAL || url.search || url.hash || !PUBLIC.test(url.pathname) || PRIVATE.test(url.pathname)) throw new Error('Sitemap contains a noncanonical, private or unsupported URL.');
    return {url:url.href,lastModified:row.lastmod || null};
  });
  if (new Set(urls.map(row => row.url)).size !== urls.length) throw new Error('Sitemap contains duplicate URLs.');
  return urls;
}

async function auditPublicSeo({origin=CANONICAL,fetchRequest=fetch,checkVercel=true} = {}) {
  origin = allowedOrigin(origin);
  const issues = [], cache = new Map(), assets = new Set(), pages = new Map();
  const issue = (severity,code,url,message) => issues.push({severity,code,url,message});
  const mapToTarget = value => { const url = new URL(value); return `${origin}${url.pathname}${url.search}`; };
  const request = async (value, body=true) => {
    const url = new URL(value);
    const permitted = [origin,CANONICAL,APEX,'http://nextlevel-agency.ro',...OWNED_VERCEL].includes(url.origin);
    if (!permitted || url.username || url.password || url.hash) throw new Error('Audit refused an unapproved network target.');
    const key = `${body?'text':'asset'}:${url.href}`;
    if (!cache.has(key)) cache.set(key,(async()=>{
      try {
        const response = await fetchRequest(url.href,{method:'GET',redirect:'manual',credentials:'omit',headers:{'user-agent':'Googlebot'},signal:AbortSignal.timeout(20_000)});
        const headers = Object.fromEntries(['content-type','location','x-robots-tag','cache-control'].map(name => [name,response.headers.get(name)]));
        let content = '';
        if (body) {
          const reader = response.body?.getReader(); let bytes=0; const chunks=[];
          if (reader) try {
            while(true) { const part=await reader.read(); if(part.done)break;bytes+=part.value.byteLength;if(bytes>4*1024*1024){await reader.cancel();throw new Error('Public response exceeds 4 MiB.');}chunks.push(Buffer.from(part.value)); }
            content=Buffer.concat(chunks).toString('utf8');
          } finally {reader.releaseLock();}
        } else await response.body?.cancel();
        return {url:url.href,status:response.status,headers,body:content};
      } catch { return {url:url.href,status:0,headers:{},body:'',error:'Public request failed or exceeded its limit.'}; }
    })());
    return cache.get(key);
  };

  const robots=await request(`${origin}/robots.txt`);
  if(robots.status!==200)issue('error','ROBOTS_HTTP',robots.url,`robots.txt returned ${robots.status}.`);
  if(!robots.body.includes(`Sitemap: ${CANONICAL}/sitemap.xml`))issue('error','ROBOTS_SITEMAP',robots.url,'robots.txt does not declare the production sitemap.');
  if(/^\s*Disallow:\s*\/\s*$/mi.test(robots.body))issue('error','ROBOTS_BLOCK_ALL',robots.url,'robots.txt blocks the entire public site.');
  const sitemap=await request(`${origin}/sitemap.xml`);
  if(sitemap.status!==200)throw new Error(`Sitemap returned ${sitemap.status}; public crawl stopped.`);
  const entries=readSitemap(sitemap.body);
  const queue=entries.map(row=>row.url), seen=new Set(queue);
  const crawl=async value=>{
    const target=mapToTarget(value), response=await request(target);
    const page={url:value,status:response.status,...inspectHtml(response.body,value)};
    pages.set(stripHash(value),page);
    if(response.status!==200){issue('error','PAGE_HTTP',value,`Public page returned ${response.status}.`);return;}
    if(page.title.length!==1||!page.title[0])issue('error','TITLE',value,'Expected one nonempty title.');
    if(page.description.length!==1||!page.description[0])issue('error','DESCRIPTION',value,'Expected one nonempty meta description.');
    if(page.h1.length!==1||!page.h1[0])issue('error','H1',value,'Expected one meaningful primary heading.');
    if(page.canonical.length!==1||!equivalent(page.canonical[0],value))issue('error','CANONICAL',value,'Canonical must identify this production URL without query parameters.');
    if(blocked(response.headers['x-robots-tag'])||[...page.robots,...page.googlebot].some(blocked))issue('error','PUBLIC_NOINDEX',value,'A public sitemap page is marked noindex.');
    if(!/^ro(?:-|$)/i.test(page.language))issue('warning','LANGUAGE',value,'Expected Romanian document language.');
    for(const field of ['title','description','url','image'])if(!page.openGraph[field].length)issue('warning','OPEN_GRAPH',value,`Missing og:${field}.`);
    if(page.openGraph.url.some(url=>!equivalent(url,value)))issue('error','OG_URL',value,'Open Graph URL disagrees with the canonical.');
    if(page.twitter.card[0]!=='summary_large_image')issue('warning','TWITTER_CARD',value,'Large-image social card is missing.');
    for(const schema of page.schemas){
      if(schema.error){issue('error','JSON_LD',value,schema.error);continue;}
      const nodes=Array.isArray(schema.value)?schema.value:schema.value['@graph']||[schema.value];
      if(!Array.isArray(nodes)){issue('error','SCHEMA_GRAPH',value,'Structured-data graph must be an array.');continue;}
      for(const node of nodes){
        if(!node||typeof node!=='object'||!node['@type'])issue('error','SCHEMA_TYPE',value,'Structured-data node has no type.');
        if(node?.['@type']==='BreadcrumbList')for(const [index,item] of (node.itemListElement||[]).entries())if(item.position!==index+1||!absolute(item.item,value))issue('error','BREADCRUMBS',value,'Breadcrumb positions or item URLs are invalid.');
      }
    }
    let skippedPrivateLinks=0,externalLinks=0;
    for(const link of page.links){
      if(!link.href||/^(?:mailto|tel|javascript|data):/i.test(link.href))continue;
      const href=absolute(link.href,value);if(!href){issue('error','LINK_URL',value,'An anchor contains an invalid URL.');continue;}
      const url=new URL(href);if(![CANONICAL,APEX].includes(url.origin)){externalLinks++;continue;}
      if(PRIVATE.test(url.pathname)){skippedPrivateLinks++;continue;}
      if(!PUBLIC.test(url.pathname)){issue('warning','UNSUPPORTED_PUBLIC_LINK',value,`Public link ${url.pathname} is outside the known page routes; it was not fetched.`);continue;}
      const cleanUrl=new URL(url.pathname,CANONICAL).href;
      if(!seen.has(cleanUrl)){if(seen.size>=LIMIT){issue('error','CRAWL_LIMIT',value,'Public link crawl exceeded its limit.');continue;}seen.add(cleanUrl);queue.push(cleanUrl);}
    }
    page.linkCounts={internal:page.links.length-externalLinks-skippedPrivateLinks,external:externalLinks,privateSkipped:skippedPrivateLinks};
    for(const image of page.images){
      if(image.alt===null)issue('error','IMAGE_ALT',value,`Image ${image.src} has no alt attribute.`);
      if(!image.fill&&!(Number(image.width)>0&&Number(image.height)>0))issue('warning','IMAGE_DIMENSIONS',value,`Image ${image.src} has no explicit dimensions; verify its reserved CSS ratio.`);
      const src=absolute(image.src,value);if(!src)continue;const url=new URL(src);
      if(publicImage(url.href))assets.add(url.href);
      else if(url.origin===CANONICAL)issue('warning','IMAGE_SOURCE_SKIPPED',value,'An image source is outside the approved public image paths; it was not fetched.');
    }
    for(const image of [...page.openGraph.image,...page.twitter.image]){const src=absolute(image,value);if(src&&publicImage(src))assets.add(src);}
    for(const alternate of page.hreflang)if(!alternate.language||!absolute(alternate.href,value))issue('error','HREFLANG',value,'Invalid alternate-language URL.');
  };
  for(let offset=0;offset<queue.length;offset+=4)await Promise.all(queue.slice(offset,offset+4).map(crawl));
  const values=[...pages.values()];
  for(const key of ['title','description']){
    const groups=new Map();for(const page of values){const value=page[key][0];if(value){const group=groups.get(value)||[];group.push(page.url);groups.set(value,group);}}
    for(const urls of groups.values())if(urls.length>1)issue('warning',`DUPLICATE_${key.toUpperCase()}`,urls[0],`Shared by ${urls.join(', ')}.`);
  }
  for(const page of values)for(const link of page.links){
    const href=absolute(link.href,page.url);if(!href)continue;const url=new URL(href);
    if(!url.hash||![CANONICAL,APEX].includes(url.origin)||PRIVATE.test(url.pathname)||!PUBLIC.test(url.pathname))continue;
    let fragment;try{fragment=decodeURIComponent(url.hash.slice(1));}catch{issue('error','ANCHOR_ENCODING',page.url,'Fragment encoding is invalid.');continue;}
    if(!fragment)continue;
    const destination=pages.get(new URL(url.pathname,CANONICAL).href);
    if(destination&&!destination.ids.includes(fragment))issue('error','ANCHOR_MISSING',page.url,`Missing destination ${url.pathname}#${fragment}.`);
  }
  const resources=[];
  const imageResource=async url=>{
    let current=mapToTarget(url);const redirects=[],visited=new Set();
    for(let hop=0;hop<4;hop++){
      if(visited.has(current))return {url,status:0,redirects,error:'Image redirect loop.'};
      visited.add(current);const resource=await request(current,false);
      if([301,302,307,308].includes(resource.status)&&resource.headers.location){
        const next=new URL(resource.headers.location,current);
        if(![origin,CANONICAL,APEX].includes(next.origin)||!publicImage(`${CANONICAL}${next.pathname}${next.search}`))return {url,status:resource.status,redirects,error:'Image redirect left approved public image routes.'};
        redirects.push({status:resource.status,path:new URL(current).pathname,destination:next.pathname});
        current=`${origin}${next.pathname}${next.search}`;continue;
      }
      return {url,status:resource.status,contentType:resource.headers['content-type'],finalPath:new URL(current).pathname,redirects};
    }
    return {url,status:0,redirects,error:'Image redirect chain exceeded its limit.'};
  };
  const resourceUrls=[...assets].slice(0,LIMIT);
  if(assets.size>LIMIT)issue('error','ASSET_LIMIT',origin,'Image audit exceeded its limit.');
  for(let offset=0;offset<resourceUrls.length;offset+=4)await Promise.all(resourceUrls.slice(offset,offset+4).map(async url=>{
    const resource=await imageResource(url);resources.push(resource);
    if(resource.status!==200)issue('error','IMAGE_HTTP',url,`Image returned ${resource.status}.`);
    else if(!/^image\//i.test(resource.contentType||''))issue('warning','IMAGE_TYPE',url,'Image response has an unexpected content type.');
  }));
  const legacyImage=await imageResource(`${CANONICAL}/web-projects/elmont.jfif`);
  if(![301,308].includes(legacyImage.redirects[0]?.status)||legacyImage.status!==200||legacyImage.finalPath!=='/web-projects/elmont.webp'||!/^image\//i.test(legacyImage.contentType||''))issue('error','LEGACY_IMAGE_REDIRECT',`${CANONICAL}/web-projects/elmont.jfif`,'The old ELMONT asset must permanently redirect to a valid WebP image.');
  const privateRoutes=[];
  for(const route of ['/login','/signup','/forgot-password','/offline','/dashboard']){
    const response=await request(`${origin}${route}`);privateRoutes.push({path:route,status:response.status,robots:response.headers['x-robots-tag']});
    if(!blocked(response.headers['x-robots-tag']))issue('error','PRIVATE_NOINDEX',route,'Public unauthenticated response lacks the noindex header.');
  }
  const missing=await request(`${origin}/seo-audit-page-does-not-exist`);
  if(missing.status!==404)issue('error','MISSING_STATUS',missing.url,`A nonexistent page returned ${missing.status} instead of 404.`);
  const redirects=[];
  if(origin===CANONICAL)for(const source of [`${APEX}/`,`http://nextlevel-agency.ro/`,`${CANONICAL}/servicii/`]){
    const response=await request(source);const location=response.headers.location;
    redirects.push({url:source,status:response.status,location});
    if(![301,308].includes(response.status)||!location)issue('error','CANONICAL_REDIRECT',source,'Expected a permanent canonical redirect.');
  }
  const vercel=[];
  if(checkVercel&&origin===CANONICAL)for(const alias of OWNED_VERCEL){
    const response=await request(`${alias}/`);
    vercel.push({origin:alias,status:response.status,robots:response.headers['x-robots-tag']});
    if(response.status===200&&!blocked(response.headers['x-robots-tag']))issue('warning','VERCEL_INDEXABLE',alias,'Public Vercel alias lacks noindex; canonical alone is a preference.');
  }
  return {generatedAt:new Date().toISOString(),origin,canonicalOrigin:CANONICAL,summary:{sitemapPages:entries.length,crawledPages:pages.size,images:resources.length,errors:issues.filter(item=>item.severity==='error').length,warnings:issues.filter(item=>item.severity==='warning').length},robots:{status:robots.status,body:robots.body},sitemap:{status:sitemap.status,entries},pages:values,resources,legacyImage,privateRoutes,missingPageStatus:missing.status,redirects,vercel,issues};
}

async function selfTest(){
  assert.equal(allowedOrigin(CANONICAL),CANONICAL);assert.equal(allowedOrigin('http://localhost:3000'),'http://localhost:3000');
  for(const url of ['https://evil.invalid','https://www.nextlevel-agency.ro.evil.invalid','https://user:password@www.nextlevel-agency.ro','https://www.nextlevel-agency.ro/private'])assert.throws(()=>allowedOrigin(url));
  assert.equal(PRIVATE.test('/api/accounting/invoices'),true);assert.equal(PUBLIC.test('/api/accounting/invoices'),false);
  assert.equal(publicImage(`${CANONICAL}/_next/image?url=%2Fapi%2Faccounting%2Finvoices`),false);
  assert.equal(publicImage(`${CANONICAL}/_next/image?url=https%3A%2F%2Fevil.invalid%2Fphoto.png`),false);
  assert.equal(publicImage(`${CANONICAL}/_next/image?url=%2Fweb-projects%2Fexample.png&w=640`),true);
  const page=inspectHtml('<!doctype html><html lang="ro"><head><title>SEO &amp; test</title><meta name="description" content="Exemplu"><link href="https://www.nextlevel-agency.ro/" rel="canonical"><script type="application/ld+json">{"@type":"WebPage"}</script></head><body><h1 id="titlu">Titlu <span>real</span></h1><a href="/#titlu">Link</a><img src="/image.png" alt="" width="10" height="20"></body></html>',CANONICAL+'/');
  assert.equal(page.title[0],'SEO & test');assert.equal(page.h1[0],'Titlu real');assert.equal(page.images[0].alt,'');assert.deepEqual(page.ids,['titlu']);assert.equal(page.schemas[0].value['@type'],'WebPage');
  assert.equal(inspectHtml('<script type="application/ld+json">{bad}</script>',CANONICAL).schemas[0].error,'Invalid JSON-LD');
  assert.equal(readSitemap(`<urlset><url><loc>${CANONICAL}/</loc></url></urlset>`).length,1);
  assert.throws(()=>readSitemap(`<urlset><url><loc>${CANONICAL}/api/accounting/invoices</loc></url></urlset>`));
  assert.equal(blocked('index, follow'),false);assert.equal(blocked('noindex, nofollow'),true);
  const requested=[];
  const fixtureHtml=`<!doctype html><html lang="ro"><head><title>Public fixture</title><meta name="description" content="Fixture description"><link rel="canonical" href="${CANONICAL}/"><meta property="og:title" content="Public fixture"><meta property="og:description" content="Fixture description"><meta property="og:url" content="${CANONICAL}/"><meta property="og:image" content="${CANONICAL}/opengraph-image"><meta name="twitter:card" content="summary_large_image"></head><body><h1 id="titlu">Public fixture</h1><a href="/#titlu">Anchor</a><a href="/api/accounting/invoices/1">Private link</a><img src="/fixture.png" alt="Fixture" width="100" height="80"></body></html>`;
  const result=await auditPublicSeo({origin:'http://localhost:3000',fetchRequest:async(value,options)=>{
    const url=new URL(value);requested.push(url.pathname);assert.equal(url.origin,'http://localhost:3000');assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert.equal(options.credentials,'omit');assert.equal(Object.hasOwn(options.headers,'Authorization'),false);
    if(url.pathname==='/robots.txt')return new Response(`User-Agent: *\nAllow: /\nSitemap: ${CANONICAL}/sitemap.xml\n`);
    if(url.pathname==='/sitemap.xml')return new Response(`<urlset><url><loc>${CANONICAL}/</loc></url></urlset>`);
    if(url.pathname==='/')return new Response(fixtureHtml);
    if(['/fixture.png','/opengraph-image'].includes(url.pathname))return new Response('isolated-fixture',{headers:{'content-type':'image/png'}});
    if(url.pathname==='/web-projects/elmont.jfif')return new Response('',{status:308,headers:{location:'/web-projects/elmont.webp'}});
    if(url.pathname==='/web-projects/elmont.webp')return new Response('isolated-fixture',{headers:{'content-type':'image/webp'}});
    if(['/login','/signup','/forgot-password','/offline','/dashboard'].includes(url.pathname))return new Response('',{headers:{'x-robots-tag':'noindex, nofollow'}});
    if(url.pathname==='/seo-audit-page-does-not-exist')return new Response('',{status:404});
    throw new Error('Unexpected audit target in isolated fixture.');
  }});
  assert.equal(result.summary.errors,0);assert.equal(result.summary.warnings,0);assert.equal(result.pages[0].linkCounts.privateSkipped,1);assert.equal(requested.some(value=>value.startsWith('/api/')),false,'Public audit must never follow private invoice/API links');
  console.log('Public SEO audit self-test passed: HTML/XML parsing, JSON-LD, anchors, image attributes, noindex and strict public-origin/route guards. No network or private data.');
}

async function main(){
  const args=process.argv.slice(2);if(args.length===1&&args[0]==='--self-test')return selfTest();
  let origin=CANONICAL,report;
  for(let index=0;index<args.length;index++){
    if(args[index]==='--origin')origin=allowedOrigin(args[++index]);
    else if(args[index]==='--report')report=args[++index];
    else throw new Error('Usage: node scripts/audit-public-seo.cjs [--origin production-or-localhost] [--report artifacts/report.json]');
  }
  const directory=path.resolve('artifacts');
  const output=path.resolve(report||path.join(directory,`public-seo-${new Date().toISOString().replace(/[:.]/g,'-')}.json`));
  if(!output.startsWith(directory+path.sep)||path.extname(output)!=='.json')throw new Error('Audit report must be a JSON file inside workspace artifacts.');
  const result=await auditPublicSeo({origin});fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));
  const issueCounts={};for(const item of result.issues)issueCounts[item.code]=(issueCounts[item.code]||0)+1;
  console.log(JSON.stringify({report:output,...result.summary,issueCounts,errors:result.issues.filter(item=>item.severity==='error')}));if(result.summary.errors)process.exitCode=1;
}
module.exports={allowedOrigin,inspectHtml,readSitemap,blocked,auditPublicSeo};
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});

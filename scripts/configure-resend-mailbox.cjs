// One-time owner-authorized setup for the exact Next Level mailbox.
// Only the CLI entry point can read the clipboard, after both explicit flags.
// Configuration functions accept injected transports for isolated tests.
const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');
const { promisify } = require('node:util');
const runFile = promisify(execFile);
const DOMAIN = 'nextlevel-agency.ro';
const ADDRESS = `contact@${DOMAIN}`;
const PROJECT = 'prj_6ri9LqB24cKE9OkQxoINYkNEIA07';
const SCOPE = 'pmcustoms';
const WEBHOOK = 'https://www.nextlevel-agency.ro/api/mailbox/webhook';
const EVENTS = ['inbox.email.received','inbox.email.sent','inbox.thread.created','inbox.thread.folder.updated','inbox.thread.labels.updated'];
const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

function providerId(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(value)) throw new Error('Provider returned an invalid configuration identifier.');
  return value;
}

function relativeName(value) {
  const name = String(value || '').trim().toLowerCase().replace(/\.$/, '');
  if (!name || name === '@' || name === DOMAIN) return '';
  const relative = name.endsWith(`.${DOMAIN}`) ? name.slice(0, -DOMAIN.length - 1) : name;
  if (!/^(?:\*\.)?[a-z0-9_-]+(?:\.[a-z0-9_-]+)*$/.test(relative) && relative !== '*') throw new Error('Unsupported DNS record name.');
  if (relative.length > 200) throw new Error('Unsupported DNS record name.');
  return relative;
}

function dnsPlan(records, existing) {
  if (!Array.isArray(records) || !records.length) throw new Error('Resend did not return the required DNS records.');
  if (!Array.isArray(existing)) throw new Error('Vercel DNS records could not be verified.');
  return records.map(record => {
    const type = String(record.type || '').toUpperCase();
    const name = relativeName(record.name);
    const value = String(record.value || '').trim();
    if (!['CNAME','TXT','MX'].includes(type) || name.includes('*') || !value || value.length > 8192 || /[\u0000-\u001f]/.test(value) || (type === 'CNAME' && !name)) throw new Error('Unsupported DNS change; manual review required.');
    if (type !== 'TXT' && !/^[a-z0-9.-]+\.?$/i.test(value)) throw new Error('Invalid DNS target.');
    const priority = record.priority === undefined ? 10 : Number(record.priority);
    if (type === 'MX' && (!Number.isInteger(priority) || priority < 0 || priority > 65535)) throw new Error('Invalid MX priority.');
    const sameName = existing.filter(item => relativeName(item.name) === name);
    const canonical = input => type === 'TXT' ? String(input).replace(/^"|"$/g, '') : String(input).toLowerCase().replace(/\.$/, '');
    const matches = item => String(item.type).toUpperCase() === type && canonical(item.value) === canonical(value) && (type !== 'MX' || Number(item.mxPriority ?? item.priority ?? 10) === priority);
    const same = sameName.some(matches);
    if (sameName.some(item => {
      if (matches(item)) return false;
      const existingType = String(item.type).toUpperCase();
      return (type === 'MX' && existingType === 'MX') || existingType === 'CNAME' || type === 'CNAME' ||
        (type === 'TXT' && /^v=spf1/i.test(value) && existingType === 'TXT' && /^v=spf1/i.test(String(item.value).replace(/^"|"$/g, '')));
    })) throw new Error('Existing mail DNS conflicts with Resend; no replacement is allowed.');
    return { type, name, value, ttl: 60, ...(type === 'MX' ? { mxPriority: priority } : {}), exists: same };
  });
}

// Every supported Resend list uses has_more plus an exclusive ID cursor.
// Unknown pagination fails closed instead of configuring from a partial list.
async function listResend(api, endpoint) {
  if (!['/domains','/inboxes','/webhooks'].includes(endpoint)) throw new Error('Unsupported configuration listing.');
  const found = new Map(), cursors = new Set();
  let after = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (after) query.set('after', after);
    const result = await api(`${endpoint}?${query}`);
    if (!result || !Array.isArray(result.data) || typeof result.has_more !== 'boolean') throw new Error('Resend list pagination could not be verified.');
    for (const item of result.data) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Resend returned an invalid list item.');
      found.set(providerId(item.id), item);
    }
    if (!result.has_more) return [...found.values()];
    const next = providerId(result.data.at(-1)?.id);
    if (cursors.has(next)) throw new Error('Resend list pagination did not advance.');
    cursors.add(next); after = next;
  }
  throw new Error('Resend list exceeds the safe pagination limit; configuration was stopped.');
}

// Vercel v5 returns pagination.next as a JavaScript timestamp for `until`.
async function listVercelDns(vercelApi) {
  const found = new Map(), cursors = new Set();
  let until = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (until !== null) query.set('until', String(until));
    const result = await vercelApi(`/v5/domains/${DOMAIN}/records?${query}`);
    if (!result || !Array.isArray(result.records) || !result.pagination || !Object.hasOwn(result.pagination, 'next')) throw new Error('Vercel DNS pagination could not be verified.');
    for (const item of result.records) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Vercel returned an invalid DNS record.');
      found.set(providerId(item.id), item);
    }
    const next = result.pagination.next;
    if (next === null) return [...found.values()];
    if (!result.records.length || !Number.isSafeInteger(next) || next < 0 || cursors.has(next) || (until !== null && next >= until)) throw new Error('Vercel DNS pagination did not advance.');
    cursors.add(next); until = next;
  }
  throw new Error('Vercel DNS exceeds the safe pagination limit; configuration was stopped.');
}

function domainVerification(domain) {
  const records = Array.isArray(domain?.records) ? domain.records : [];
  const purpose = name => records.filter(record => record.record === name);
  const verified = items => items.length > 0 && items.every(record => record.status === 'verified');
  const receiving = records.filter(record => ['Receiving','Receiving MX'].includes(record.record));
  const sendingVerified = domain?.capabilities?.sending === 'enabled' && verified(purpose('SPF')) && verified(purpose('DKIM'));
  const receivingVerified = domain?.capabilities?.receiving === 'enabled' && receiving.some(record => String(record.type).toUpperCase() === 'MX') && verified(receiving);
  const domainStatus = ['pending','verified','failed','not_started','partially_verified','partially_failed'].includes(domain?.status) ? domain.status : 'unknown';
  return { domainStatus, sendingVerified, receivingVerified, ready: domainStatus === 'verified' && sendingVerified && receivingVerified };
}

function signingSecret(hook) {
  const secret = hook?.signing_secret;
  if (typeof secret !== 'string' || !/^whsec_[A-Za-z0-9+/]+={0,2}$/.test(secret)) throw new Error('Resend did not provide a valid webhook signing secret; configuration was stopped.');
  const encoded = secret.slice(6), bytes = Buffer.from(encoded, 'base64');
  if (bytes.length < 16 || bytes.length > 128 || bytes.toString('base64').replace(/=+$/, '') !== encoded.replace(/=+$/, '')) throw new Error('Resend did not provide a valid webhook signing secret; configuration was stopped.');
  return secret;
}

function productionEncryptionConfigured(metadata) {
  if (!metadata || !Array.isArray(metadata.envs)) throw new Error('Production environment names could not be verified.');
  return metadata.envs.some(item => item.key === 'ENCRYPTION_KEY' && (item.target === 'production' || Array.isArray(item.target) && item.target.includes('production')));
}

function createVercelCli({ npx, spawnProcess = spawn, timeoutMs = 120_000 }) {
  return (args, input) => new Promise((resolve, reject) => {
    let child, timer, output = '', settled = false;
    const fail = message => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      try { child?.kill(); } catch { /* No diagnostics may include credential input. */ }
      reject(new Error(message));
    };
    try {
      child = spawnProcess(process.execPath, [npx, '--yes','vercel@58.4.4', ...args, '--scope', SCOPE], { windowsHide: true, stdio: ['pipe','pipe','pipe'] });
      timer = setTimeout(() => fail('Vercel operation timed out.'), timeoutMs);
      child.stdout.on('data', value => { output += value.toString(); if (output.length > 2_000_000) fail('Vercel returned too much output.'); });
      child.stdout.on('error', () => fail('Vercel output could not be read.'));
      // Discard stderr. Failed credential operations must not echo their input.
      child.stderr.on('error', () => fail('Vercel diagnostics could not be read.'));
      child.stderr.resume();
      child.stdin.on('error', () => fail('Vercel could not accept configuration input.'));
      child.on('error', () => fail('Vercel CLI could not start.'));
      child.on('close', code => {
        if (settled) return;
        if (code !== 0) return fail('Vercel rejected the configuration operation.');
        settled = true; clearTimeout(timer); resolve(output);
      });
      child.stdin.end(input || '');
    } catch { fail('Vercel CLI could not start.'); }
  });
}

function createResendApi(key, fetchRequest = fetch) {
  return async (endpoint, method = 'GET', body) => {
    let response;
    try {
      response = await fetchRequest(`https://api.resend.com${endpoint}`, { method, headers: { Authorization: `Bearer ${key}`, 'Content-Type':'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(20_000) });
    } catch { throw new Error('Resend setup request could not complete. No credentials were printed.'); }
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Resend setup request was rejected (HTTP ${response.status}). Check full-access permissions and plan limits.`);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Resend returned an unexpected response.');
    return result;
  };
}

async function configureMailbox({ api, vercelApi, env, key, hasEncryptionKey, sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)), log = console.log, writeStatus = () => {} }) {
  if (typeof hasEncryptionKey !== 'function' || !(await hasEncryptionKey())) throw new Error('needConfig: production ENCRYPTION_KEY is missing. No configuration changes were made.');
  const domains = await listResend(api, '/domains');
  let domain = domains.find(item => String(item.name).toLowerCase() === DOMAIN);
  if (!domain) domain = await api('/domains', 'POST', { name: DOMAIN, region:'eu-west-1', capabilities:{sending:'enabled',receiving:'enabled'} });
  const domainId = providerId(domain.id);
  const readDomain = async () => {
    const value = await api(`/domains/${domainId}`);
    if (value.id !== domainId || String(value.name).toLowerCase() !== DOMAIN) throw new Error('Resend returned another domain.');
    return value;
  };
  domain = await readDomain();
  if (domain.capabilities?.sending !== 'enabled' || domain.capabilities?.receiving !== 'enabled') {
    await api(`/domains/${domainId}`, 'PATCH', { capabilities:{sending:'enabled',receiving:'enabled'} });
    domain = await readDomain();
  }
  const records = await listVercelDns(vercelApi);
  const plan = dnsPlan(domain.records, records);
  log(JSON.stringify({ domain:DOMAIN, dnsRecords:plan.map(({exists,...record})=>({...record,existing:exists})) }));
  for (const { exists, ...record } of plan) if (!exists) await vercelApi(`/v2/domains/${DOMAIN}/records`, { ...record, comment:'Resend Next Level professional mailbox' });
  await api(`/domains/${domainId}/verify`, 'POST');
  domain = await readDomain();
  for (let attempt = 0; attempt < 24 && !domainVerification(domain).ready; attempt++) {
    log(JSON.stringify({ phase:'dns-verification', ...domainVerification(domain) }));
    await sleep(15_000); domain = await readDomain();
  }
  const verification = domainVerification(domain);
  if (!verification.ready) throw new Error('DNS was configured, but sending and receiving verification is not complete. No email was sent.');

  const inboxes = await listResend(api, '/inboxes');
  let inbox = inboxes.find(item => String(item.email_address || '').toLowerCase() === ADDRESS);
  if (!inbox) {
    if (inboxes.length >= 3) throw new Error('The included inbox allowance is used; a plan decision is required. No paid inbox was created.');
    inbox = await api('/inboxes','POST',{ email_address:ADDRESS,name:'Next Level Contact',from_name:'Next Level Agency' });
  }
  const inboxId = providerId(inbox.id);
  const confirmed = await api(`/inboxes/${inboxId}`);
  if (confirmed.id !== inboxId || String(confirmed.email_address || '').toLowerCase() !== ADDRESS || confirmed.domain_id !== domainId) throw new Error('Mailbox address or domain verification failed.');

  const hooks = (await listResend(api, '/webhooks')).filter(item => item.endpoint === WEBHOOK);
  if (hooks.length > 1) throw new Error('Multiple mailbox webhooks already exist; review is required. No duplicate webhook was created.');
  let hook = hooks[0] || await api('/webhooks','POST',{ endpoint:WEBHOOK,events:EVENTS });
  const webhookId = providerId(hook.id);
  const readHook = async () => {
    const value = await api(`/webhooks/${webhookId}`);
    if (value.id !== webhookId || value.endpoint !== WEBHOOK) throw new Error('Resend returned another webhook.');
    return value;
  };
  const matchesEvents = value => Array.isArray(value.events) && value.events.length === EVENTS.length && EVENTS.every(event => value.events.includes(event));
  hook = await readHook();
  if (hook.status !== 'enabled' || !matchesEvents(hook)) {
    await api(`/webhooks/${webhookId}`,'PATCH',{ endpoint:WEBHOOK,events:EVENTS,status:'enabled' });
    hook = await readHook();
  }
  if (hook.status !== 'enabled' || !matchesEvents(hook)) throw new Error('Webhook activation could not be verified.');
  const secret = signingSecret(hook);
  // Save production variables only after DNS, inbox identity and webhook pass.
  await env('RESEND_API_KEY', key, true);
  await env('EMAIL_FROM', `Next Level Agency <${ADDRESS}>`);
  await env('OFFER_EMAIL_FROM', `Next Level Agency <${ADDRESS}>`);
  await env('RESEND_INBOX_ID', inboxId);
  await env('RESEND_WEBHOOK_SECRET', secret, true);
  const result = { configuredAt:new Date().toISOString(),address:ADDRESS,domainId,inboxId,webhookId,domainStatus:verification.domainStatus,sendingVerified:verification.sendingVerified,receivingVerified:verification.receivingVerified,webhookStatus:hook.status,status:'ready_for_redeployment',emailsSent:0,requiresRedeployment:true };
  await writeStatus(result); log(JSON.stringify(result));
  return result;
}

async function setup() {
  if (!process.argv.includes('--apply') || !process.argv.includes('--from-clipboard')) throw new Error('Requires explicit authorization with --apply --from-clipboard. No clipboard was read.');
  if (process.platform !== 'win32') throw new Error('This setup accepts an owner-copied key through the Windows clipboard only.');
  const copied = await runFile('powershell.exe', ['-NoProfile','-NonInteractive','-Command','Get-Clipboard -Raw'], { windowsHide: true, maxBuffer: 4096, timeout: 15_000 });
  const key = copied.stdout.trim();
  if (!/^re_[A-Za-z0-9_-]{16,256}$/.test(key)) throw new Error('Clipboard does not contain a valid Resend API key. Nothing was configured.');
  const npx = path.join(path.dirname(process.execPath), 'node_modules','npm','bin','npx-cli.js');
  if (!fs.existsSync(npx)) throw new Error('The installed npm CLI could not be located.');
  const cli = createVercelCli({ npx });
  const vercelApi = async (endpoint, body) => {
    const output = await cli(['api', endpoint, '--raw', ...(body ? ['--method','POST','--input','-'] : [])], body ? JSON.stringify(body) : undefined);
    try { return JSON.parse(output); } catch { throw new Error('Vercel returned an unexpected response.'); }
  };
  const env = async (name, value, secret = false) => {
    if (typeof value !== 'string' || !value || /[\r\n\u0000]/.test(value)) throw new Error('Missing setup environment value.');
    await cli(['env','add',name,'production','--project',PROJECT,'--force','--yes',secret ? '--sensitive' : '--no-sensitive'], value);
    console.log(`Configured production ${name}.`);
  };
  const hasEncryptionKey = async () => {
    const output = await cli(['env','ls','production','--project',PROJECT,'--format','json']);
    let metadata;
    try { metadata = JSON.parse(output); } catch { throw new Error('Production environment names could not be verified.'); }
    // Inspect names/targets only. Never access, decrypt, replace or log a value.
    return productionEncryptionConfigured(metadata);
  };
  return configureMailbox({ api:createResendApi(key),vercelApi,env,key,hasEncryptionKey,writeStatus:result => {
    fs.mkdirSync('artifacts',{recursive:true});
    fs.writeFileSync('artifacts/resend-setup-status.json',JSON.stringify(result,null,2));
  } });
}

module.exports = { DOMAIN, ADDRESS, PROJECT, SCOPE, WEBHOOK, EVENTS, relativeName, dnsPlan, listResend, listVercelDns, domainVerification, signingSecret, productionEncryptionConfigured, createVercelCli, createResendApi, configureMailbox };
if (require.main === module) setup().catch(error => { console.error(error.message || 'Resend setup failed. No credentials were printed.'); process.exitCode=1; });

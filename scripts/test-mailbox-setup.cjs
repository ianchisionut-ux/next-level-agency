// All transports are fakes. This test never reads credentials or the clipboard.
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const setup = require('./configure-resend-mailbox.cjs');
const { DOMAIN, ADDRESS, WEBHOOK, EVENTS } = setup;
const fakeKey = 'ISOLATED-API-KEY-NOT-A-CREDENTIAL';
const fakeSecret = `whsec_${Buffer.alloc(24, 19).toString('base64')}`;
const clone = value => JSON.parse(JSON.stringify(value));
const domain = () => ({ id:'domain1',name:DOMAIN,status:'verified',capabilities:{sending:'enabled',receiving:'enabled'},records:[
  {record:'SPF',type:'TXT',name:'send',value:'v=spf1 include:example.invalid ~all',status:'verified'},
  {record:'DKIM',type:'CNAME',name:'resend._domainkey',value:'dkim.example.invalid',status:'verified'},
  {record:'Receiving',type:'MX',name:'',value:'inbound.example.invalid',priority:10,status:'verified'},
] });

function fixture(options = {}) {
  const state = { domain:domain(),dns:[{id:'dns1',name:'',type:'A',value:'192.0.2.5'},{id:'dns2',name:'*',type:'CNAME',value:'website.example.invalid'}],
    inbox:{id:'inbox1',email_address:ADDRESS,domain_id:'domain1'},hook:{id:'hook1',endpoint:WEBHOOK,status:'disabled',events:['email.sent'],signing_secret:fakeSecret},
    calls:[],writes:[],env:[],logs:[],status:[],sleeps:0,domainExists:!options.createDomain,inboxExists:!options.createInbox,hookExists:!options.createHook };
  if (options.pendingMx) state.domain.records[2].status = 'pending';
  if (options.conflict) state.dns.push({id:'dns3',name:'',type:'MX',value:'existing-mail.example.invalid',mxPriority:0});
  if (options.missingSecret) { delete state.hook.signing_secret; state.hook.secret = fakeSecret; }
  if (options.wrongInboxDomain) state.inbox.domain_id = 'different-domain';
  const page = (items, after) => after ? {data:items.slice(1),has_more:false} : {data:items.slice(0,1),has_more:items.length>1};
  const api = async (endpoint, method='GET', body) => {
    state.calls.push({endpoint,method,body:body && clone(body)});
    if (method !== 'GET') state.writes.push({endpoint,method,body:body && clone(body)});
    const url = new URL(endpoint,'https://isolated.invalid'), after = url.searchParams.get('after');
    if (method === 'GET' && ['/domains','/inboxes','/webhooks'].includes(url.pathname)) {
      assert.equal(url.searchParams.get('limit'),'100');
      if (url.pathname === '/domains') return page([{id:'other-domain',name:'other.invalid'},...(state.domainExists?[{id:'domain1',name:DOMAIN}]:[])],after);
      if (url.pathname === '/inboxes') return page(options.fullAllowance ? [1,2,3].map(i=>({id:`other-inbox${i}`,email_address:`other${i}@example.invalid`})) : [{id:'other-inbox',email_address:'other@example.invalid'},...(state.inboxExists?[state.inbox]:[])],after);
      return page([{id:'other-hook',endpoint:'https://other.invalid'},...(state.hookExists?[state.hook]:[]),...(options.duplicateHooks?[{...state.hook,id:'duplicate-hook'}]:[])],after);
    }
    if (endpoint === '/domains' && method === 'POST') { assert.deepEqual(body,{name:DOMAIN,region:'eu-west-1',capabilities:{sending:'enabled',receiving:'enabled'}}); state.domainExists=true; return {id:'domain1'}; }
    if (endpoint === '/domains/domain1' && method === 'GET') return clone(state.domain);
    if (endpoint === '/domains/domain1' && method === 'PATCH') { state.domain.capabilities=clone(body.capabilities); return {id:'domain1'}; }
    if (endpoint === '/domains/domain1/verify' && method === 'POST') return {id:'domain1'};
    if (endpoint === '/inboxes' && method === 'POST') { assert.equal(body.email_address,ADDRESS); state.inboxExists=true; return {id:'inbox1'}; }
    if (endpoint === '/inboxes/inbox1' && method === 'GET') return clone(state.inbox);
    if (endpoint === '/webhooks' && method === 'POST') { state.hookExists=true; Object.assign(state.hook,{status:'enabled',events:clone(body.events)}); return {id:'hook1',signing_secret:fakeSecret}; }
    if (endpoint === '/webhooks/hook1' && method === 'GET') return clone(state.hook);
    if (endpoint === '/webhooks/hook1' && method === 'PATCH') { if (!options.ignoredHookPatch) Object.assign(state.hook,clone(body)); return {id:'hook1'}; }
    throw new Error(`Unexpected mock Resend operation: ${method} ${endpoint}`);
  };
  const vercelApi = async (endpoint, body) => {
    const url = new URL(endpoint,'https://isolated.invalid');
    if (!body) {
      assert.equal(url.pathname,`/v5/domains/${DOMAIN}/records`); assert.equal(url.searchParams.get('limit'),'100');
      const second = url.searchParams.get('until');
      if (second) assert.equal(second,'100');
      return {records:clone(second?state.dns.slice(1):state.dns.slice(0,1)),pagination:{next:second||state.dns.length<2?null:100}};
    }
    assert.equal(endpoint,`/v2/domains/${DOMAIN}/records`);
    state.writes.push({endpoint,method:'POST',body:clone(body)});
    state.dns.push({...clone(body),id:`added${state.dns.length}`});
    if (body.type === 'MX') { assert.equal(body.mxPriority,10); assert.equal(typeof body.mxPriority,'number'); assert.equal(body.name,''); assert.equal('priority' in body,false); }
    return {uid:`added${state.dns.length}`};
  };
  const deps = {api,vercelApi,key:fakeKey,hasEncryptionKey:async()=>!options.missingEncryption,
    env:async(name,value,secret=false)=>{state.env.push({name,value,secret});},log:value=>state.logs.push(value),writeStatus:value=>state.status.push(value),
    sleep:async ms=>{assert.equal(ms,15000);state.sleeps++;} };
  return {state,deps};
}

async function main() {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('Real network is forbidden in this test.'); };
  try {
    assert.equal(setup.relativeName(`*.${DOMAIN}.`),'*');
    assert.equal(setup.relativeName(`resend._domainkey.${DOMAIN}.`),'resend._domainkey');
    assert.throws(()=>setup.dnsPlan([{type:'CNAME',name:'mail',value:'resend.example.invalid'}],[{name:'mail',type:'ALIAS',value:'old.invalid'}]),/conflicts/);
    assert.throws(()=>setup.dnsPlan([{type:'TXT',name:'send',value:'v=spf1 include:new.invalid ~all'}],[{name:'send',type:'TXT',value:'"v=spf1 include:old.invalid ~all"'}]),/conflicts/);
    assert.throws(()=>setup.dnsPlan([domain().records[2]],[{name:'',type:'MX',value:'inbound.example.invalid',mxPriority:10},{name:'',type:'MX',value:'old-mail.invalid',mxPriority:0}]),/conflicts/,'A matching record must not hide another conflicting MX');
    assert.throws(()=>setup.dnsPlan([domain().records[0]],[{name:'send',type:'TXT',value:domain().records[0].value},{name:'send',type:'TXT',value:'v=spf1 include:old.invalid ~all'}]),/conflicts/,'A matching record must not hide a duplicate SPF policy');
    assert.equal(setup.dnsPlan(domain().records,[{name:'*',type:'CNAME',value:'site.invalid'}]).length,3);
    const cnameDomain=domain(); cnameDomain.records[0]={...cnameDomain.records[0],type:'CNAME',value:'spf.example.invalid'};
    assert.equal(setup.domainVerification(cnameDomain).ready,true,'New CNAME authentication retains SPF/DKIM purposes');
    const missingDkim=domain();missingDkim.records=missingDkim.records.filter(r=>r.record!=='DKIM');
    assert.equal(setup.domainVerification(missingDkim).sendingVerified,false);
    const falseStatus=domain();falseStatus.status='partially_verified';assert.equal(setup.domainVerification(falseStatus).ready,false);
    const named={key:'ENCRYPTION_KEY',target:['production']};Object.defineProperty(named,'value',{get(){throw new Error('A credential value was read');}});
    assert.equal(setup.productionEncryptionConfigured({envs:[named]}),true);
    assert.equal(setup.productionEncryptionConfigured({envs:[{key:'ENCRYPTION_KEY',target:['preview']}]}),false);
    assert.throws(()=>setup.signingSecret({secret:fakeSecret}),/signing secret/);
    assert.throws(()=>setup.signingSecret({signing_secret:'whsec_bad'}),/signing secret/);

    const success=fixture();const result=await setup.configureMailbox(success.deps);
    assert.equal(result.receivingVerified,true);assert.equal(result.sendingVerified,true);assert.equal(result.domainStatus,'verified');assert.equal(result.status,'ready_for_redeployment');
    assert.equal(result.emailsSent,0);assert.equal(result.requiresRedeployment,true);
    assert.equal(success.state.writes.filter(c=>c.endpoint==='/inboxes'||c.endpoint==='/webhooks'||c.endpoint==='/domains').length,0,'All existing configuration is found after page one');
    assert.equal(success.state.writes.filter(c=>c.endpoint==='/webhooks/hook1'&&c.method==='PATCH').length,1);
    assert.deepEqual(success.state.hook.events,EVENTS);assert.equal(success.state.hook.status,'enabled');
    assert.equal(success.state.env.length,5);assert.equal(success.state.env.find(e=>e.name==='RESEND_API_KEY').secret,true);assert.equal(success.state.env.find(e=>e.name==='RESEND_WEBHOOK_SECRET').secret,true);
    const logged=JSON.stringify([success.state.logs,success.state.status]);assert.equal(logged.includes(fakeKey),false);assert.equal(logged.includes(fakeSecret),false);
    const writesBefore=success.state.writes.length;await setup.configureMailbox(success.deps);
    assert.equal(success.state.writes.length,writesBefore+1,'A complete rerun only requests DNS verification, without duplicate DNS/inbox/webhook');

    const created=fixture({createDomain:true,createInbox:true,createHook:true});await setup.configureMailbox(created.deps);
    for(const endpoint of ['/domains','/inboxes','/webhooks']) assert.equal(created.state.writes.filter(c=>c.endpoint===endpoint&&c.method==='POST').length,1);
    assert.equal(created.state.writes.some(c=>/billing|subscription|\/emails(?:\/|$)|draft/.test(c.endpoint)),false);
    for(const [options,error] of [[{conflict:true},/conflicts/],[{missingEncryption:true},/needConfig/],[{pendingMx:true},/verification is not complete/],[{missingSecret:true},/signing secret/],[{ignoredHookPatch:true},/activation could not be verified/],[{wrongInboxDomain:true},/domain verification/],[{duplicateHooks:true},/Multiple mailbox webhooks/],[{createInbox:true,fullAllowance:true},/included inbox allowance/]]) {
      const trial=fixture(options);await assert.rejects(()=>setup.configureMailbox(trial.deps),error);
      assert.equal(trial.state.env.length,0,'Failed activation never saves production variables');
      if(options.conflict||options.missingEncryption) assert.equal(trial.state.writes.length,0,'Preflight/conflict failure makes no configuration writes');
      if(options.missingEncryption) assert.equal(trial.state.calls.length,0);
      if(options.pendingMx) {assert.equal(trial.state.sleeps,24);assert.equal(trial.state.calls.some(c=>c.endpoint.startsWith('/inboxes')),false);}
      if(options.fullAllowance) assert.equal(trial.state.writes.some(c=>c.endpoint==='/inboxes'),false);
    }

    await assert.rejects(()=>setup.listResend(async()=>({data:[],has_more:true}),'/domains'),/identifier/);
    await assert.rejects(()=>setup.listResend(async()=>({data:[{id:'stuck'}],has_more:true}),'/webhooks'),/did not advance/);
    await assert.rejects(()=>setup.listResend(async()=>({data:[]}),'/inboxes'),/pagination/);
    let pages=0;await assert.rejects(()=>setup.listResend(async()=>({data:[{id:`page${++pages}`}],has_more:true}),'/domains'),/safe pagination limit/);assert.equal(pages,100);
    await assert.rejects(()=>setup.listVercelDns(async()=>({records:[]})),/pagination/);
    await assert.rejects(()=>setup.listVercelDns(async()=>({records:[{id:'stuck'}],pagination:{next:100}})),/did not advance/);
    pages=0;await assert.rejects(()=>setup.listVercelDns(async()=>({records:[{id:`dns${++pages}`}],pagination:{next:1000-pages}})),/safe pagination limit/);assert.equal(pages,100);

    const goodApi=setup.createResendApi(fakeKey,async(url,options)=>{assert.equal(url,'https://api.resend.com/domains?limit=100');assert.equal(options.headers.Authorization,`Bearer ${fakeKey}`);assert.equal(options.redirect,'error');return new Response(JSON.stringify({data:[],has_more:false}));});
    assert.deepEqual(await goodApi('/domains?limit=100'),{data:[],has_more:false});
    const rejected=setup.createResendApi(fakeKey,async()=>new Response(JSON.stringify({message:fakeKey}),{status:403}));
    await assert.rejects(()=>rejected('/domains'),error=>error.message.includes('HTTP 403')&&!error.message.includes(fakeKey));
    const disconnected=setup.createResendApi(fakeKey,async()=>{throw new Error(fakeKey);});await assert.rejects(()=>disconnected('/domains'),error=>!error.message.includes(fakeKey));

    for(const mode of ['ok','epipe','error','nonzero']) {
      let received='',argsReceived;
      const fakeSpawn=(executable,args,options)=>{
        argsReceived=args;assert.equal(options.windowsHide,true);assert.equal(executable,process.execPath);
        const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.stderr.resume=()=>{};child.stdin=new EventEmitter();child.kill=()=>{};
        child.stdin.end=input=>{received=input;queueMicrotask(()=>{
          if(mode==='epipe')child.stdin.emit('error',new Error(`EPIPE ${fakeKey}`));
          else if(mode==='error')child.emit('error',new Error(fakeKey));
          else {child.emit('exit',mode==='ok'?0:1);child.stdout.emit('data',Buffer.from('{"ok":true}'));child.emit('close',mode==='ok'?0:1);}
        });};return child;
      };
      const cli=setup.createVercelCli({npx:'mock-npx',spawnProcess:fakeSpawn,timeoutMs:1000});
      if(mode==='ok')assert.equal(await cli(['env','add','RESEND_API_KEY'],fakeKey),'{"ok":true}');
      else await assert.rejects(()=>cli(['env','add','RESEND_API_KEY'],fakeKey),error=>!error.message.includes(fakeKey));
      assert.equal(received,fakeKey);assert.equal(argsReceived.some(arg=>arg.includes(fakeKey)),false,'Secrets use stdin, never command arguments');
    }
    console.log('Mailbox setup passed: mock-only full pagination, DNS conflicts, verified sending/receiving, idempotent reuse, webhook repair, encryption preflight, secret redaction and EPIPE. No clipboard, credentials, real network or external writes.');
  } finally {global.fetch=originalFetch;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

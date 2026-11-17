const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const api = {}, messages = [];
let reject = false;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/email.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api, URL, process:{env:{RESEND_API_KEY:'FAKE'}},require(id) {
  if (id !== 'resend') throw new Error('Unexpected email dependency.');
  return { Resend:class {
    constructor() {
      this.emails={send:async message=>{
        messages.push(message);
        return reject?{error:{message:'fake'},data:null}:{error:null,data:{id:'isolated'}};
      }};
    }
  }};
} });
(async()=>{
  await api.sendInvitationEmail({to:'fixture@example.invalid',workspaceName:'<img src=x>',inviterName:'<script>',acceptUrl:'https://www.nextlevel-agency.ro/invite/isolated'});
  assert.ok(messages[0].html.includes('&lt;img src=x&gt;')); assert.ok(!messages[0].html.includes('<script>'));
  await assert.rejects(()=>api.sendPasswordResetEmail({to:'fixture@example.invalid',resetUrl:'javascript:alert(1)'}),/invalid/);
  assert.equal(messages.length,1);
  reject=true;
  await assert.rejects(()=>api.sendInvitationEmail({to:'fixture@example.invalid',workspaceName:'Fixture',inviterName:'Fixture',acceptUrl:'https://www.nextlevel-agency.ro/invite/isolated'}),/acceptat/);
  await assert.rejects(()=>api.sendPasswordResetEmail({to:'fixture@example.invalid',resetUrl:'https://www.nextlevel-agency.ro/reset-password/isolated'}),/acceptat/);
  console.log('Transaction email checks passed: escaped names, safe links and provider error propagation. No email/network access.');
})().catch(error=>{console.error(error);process.exitCode=1});

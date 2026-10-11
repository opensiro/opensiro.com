'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {spawnSync, execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const {decide, verifyLatest} = require('../scripts/index-sync-gate.cjs');
const one = 'a'.repeat(40);
const two = 'b'.repeat(40);
const canonical = 'opensiro/vsm-harness-index';

function snapshot() {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(root,'assets/harness-index/manifest.js'),'utf8'), context);
  return context.window.harnessSnapshot;
}

test('Index commit events are independent of website pushes, with hourly reconciliation retained', () => {
  const site = fs.readFileSync(path.join(root,'.github/workflows/sync-vsm-index.yml'),'utf8');
  assert.match(site,/repository_dispatch:\s*\n\s*types: \["vsm-index-main-updated"\]/);
  assert.match(site,/cron: "17 \* \* \* \*"/);
  assert.match(site,/index-sync-gate\.cjs preflight/);
  assert.match(site,/index-sync-gate\.cjs before-publish/);
  assert.match(site,/git ls-remote https:\/\/github\.com\/opensiro\/vsm-harness-index\.git refs\/heads\/main/);
  assert.match(site,/gh workflow run static\.yml --ref main/);
  assert.match(site,/snapshot-provenance\.cjs --source-sha/);
  assert.match(site,/Check static pages and generated snapshot consistency/);
  assert.match(site,/Verify sync changed only materialized pages/);
});

test('duplicate events skip, while unrelated website changes do not determine Index freshness', () => {
  assert.equal(decide({trigger:'repository_dispatch',notifiedRepo:canonical,notifiedSha:one,sourceSha:one,publishedSha:one}).skip,true);
  assert.equal(decide({trigger:'repository_dispatch',notifiedRepo:canonical,notifiedSha:one,sourceSha:two,publishedSha:one}).skip,false);
  assert.equal(decide({trigger:'schedule',sourceSha:one,publishedSha:one}).skip,false);
  assert.equal(decide({trigger:'push',sourceSha:one,publishedSha:one}).skip,false);
  assert.equal(decide({trigger:'repository_dispatch',notifiedRepo:canonical,notifiedSha:one,sourceSha:two,publishedSha:two}).skip,true);
});

test('rapid Index revisions converge to latest main and stale publication is rejected', () => {
  const plan=decide({trigger:'repository_dispatch',notifiedRepo:canonical,notifiedSha:one,sourceSha:two,publishedSha:one});
  assert.equal(plan.outdatedNotification,true);
  assert.equal(plan.skip,false);
  assert.equal(verifyLatest(two,two),true);
  assert.equal(verifyLatest(one,two),false);
  assert.throws(()=>decide({trigger:'repository_dispatch',notifiedRepo:'attacker/other',notifiedSha:one,sourceSha:one}),/Invalid/);
  assert.throws(()=>decide({trigger:'repository_dispatch',notifiedRepo:canonical,notifiedSha:'not-a-sha',sourceSha:one}),/Invalid/);
  assert.throws(()=>verifyLatest(one,'invalid'),/Invalid/);
});

test('materialized revision manifest tracks exact Index source and snapshot version', () => {
  const result=spawnSync(process.execPath,['scripts/snapshot-provenance.cjs','--check'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const source=fs.readFileSync(path.join(root,'scripts/templates/vsm-index-source.html'),'utf8');
  const indexSha=source.match(/VSM INDEX SOURCE: opensiro\/vsm-harness-index@([a-f0-9]{40})/)[1];
  const record=JSON.parse(fs.readFileSync(path.join(root,'assets/harness-index/source-manifest.json'),'utf8'));
  const data=snapshot();
  assert.equal(record.source_sha,indexSha);
  assert.equal(record.source_repository,canonical);
  assert.equal(record.source_url,'https://github.com/'+canonical+'/tree/'+indexSha);
  assert.equal(record.snapshot_revision,data.revision);
  assert.equal(record.included_assessments,data.entries.length);
  assert.equal(record.all_rows_file,data.fullFile);
});

test('failed generation, mismatched SHA and stale provenance cannot publish', () => {
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'opensiro-source-provenance-'));
  try {
    for(const file of ['scripts/snapshot-provenance.cjs','scripts/templates/vsm-index-source.html','assets/harness-index/manifest.js','assets/harness-index/source-manifest.json']){
      const target=path.join(temp,file);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      fs.copyFileSync(path.join(root,file),target);
    }
    const script=path.join(temp,'scripts/snapshot-provenance.cjs');
    const run=(...args)=>spawnSync(process.execPath,[script,...args],{cwd:temp,encoding:'utf8'});
    assert.equal(run('--check').status,0);
    assert.notEqual(run('--source-sha',one).status,0,'payload/source mismatch must fail');
    const template=path.join(temp,'scripts/templates/vsm-index-source.html');
    fs.writeFileSync(template,fs.readFileSync(template,'utf8').replace(/(VSM INDEX SOURCE: opensiro\/vsm-harness-index@)[a-f0-9]{40}/,'$1'+two));
    assert.notEqual(run('--check').status,0,'manifest must be updated for new source SHA');
    const current=path.join(temp,'assets/harness-index/manifest.js');
    fs.writeFileSync(current,'window.harnessSnapshot={};');
    assert.notEqual(run('--check').status,0,'invalid generator output must fail');
  } finally {
    fs.rmSync(temp,{recursive:true,force:true});
  }
});

test('Henterprise reassessment matches canonical Index after source-driven regeneration', () => {
  const sourceRoot=process.env.CANONICAL_INDEX_ROOT;
  if (!sourceRoot) return;
  const indexSha=execFileSync('git',['-C',sourceRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const provenance=JSON.parse(fs.readFileSync(path.join(root,'assets/harness-index/source-manifest.json'),'utf8'));
  assert.equal(provenance.source_sha,indexSha,'site snapshot must match checkout Index main');
  const assessment=fs.readFileSync(path.join(sourceRoot,'assessments/henterprise.md'),'utf8');
  assert.match(assessment,/^review_ref: 193e8fdac0d17abf833ab68e5179b273a6084e4c$/m);
  for(const key of ['s1','s2','s3','s3_star','s4','s5']) assert.match(assessment,new RegExp('^autonomy_'+key+': A$','m'));
  const found=snapshot().entries.find(e=>e.repository==='https://github.com/humbertobellor/henterprise');
  assert.ok(found,'Henterprise must be included in published snapshot');
  assert.equal(JSON.stringify(found.states),JSON.stringify(['A','A','A','A','A','A']));
  assert.equal(found.a,6);
  assert.equal(found.c,0);
  assert.match(found.ref,/193e8fd/);
  assert.match(found.assessment,/https:\/\/github\.com\/opensiro\/vsm-harness-index\/blob\/[a-f0-9]{40}\/assessments\/henterprise\.md/);
  const all=fs.readFileSync(path.join(root,'assets/harness-index',snapshot().fullFile),'utf8');
  assert.match(all,/humbertobellor\/henterprise/);
  for (const file of ['harness-monitor.html','harness-server.html']) {
    const html=fs.readFileSync(path.join(root,file),'utf8');
    assert.match(html,new RegExp('VSM INDEX SOURCE: opensiro/vsm-harness-index@'+indexSha));
  }
  const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(home,/Henterprise/,'home Index preview must also update when first ranked');
});

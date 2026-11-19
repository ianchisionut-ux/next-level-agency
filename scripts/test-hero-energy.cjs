const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/hero-energy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: api });
let points = 0;
for (const compact of [false, true]) {
  const energy = api.createHeroEnergy(THREE, 1, compact);
  const parent = new THREE.Group(); parent.add(energy.group);
  const resources = new Set(); let disposals = 0;
  energy.group.traverse(object => { for (const resource of [object.geometry, object.material].filter(Boolean)) { if (!resources.has(resource)) { resources.add(resource); resource.addEventListener('dispose', () => disposals++); } } });
  for (const time of [0, .1, 1, 10, 100, 1000]) {
    energy.update(time, .4); energy.group.updateMatrixWorld(true);
    energy.group.traverse(object => {
      const attribute = object.geometry?.getAttribute('position'); if (!attribute) return;
      for (let index = 0; index < attribute.count; index++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(attribute, index).applyMatrix4(object.matrixWorld);
        assert.ok(vertex.toArray().every(Number.isFinite));
        assert.ok(vertex.length() <= 1.7, 'Dynamic particles and filaments stay inside the framing envelope'); points++;
      }
    });
  }
  const rotation = energy.group.children[0].rotation.toArray(); energy.update(1000, .4);
  assert.deepEqual(energy.group.children[0].rotation.toArray(), rotation, 'A paused clock leaves the energy field stationary');
  energy.dispose(); assert.equal(disposals, resources.size, 'Every GPU geometry and material is released'); assert.equal(parent.children.length, 0);
}
console.log(`Hero energy passed: ${points} finite animated vertices inside the safe envelope, compact quality, deterministic pause and complete GPU disposal. No renderer, network or database.`);

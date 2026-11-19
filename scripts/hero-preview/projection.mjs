import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const modelPath = 'public/hero/nextlevel-core.glb';
const framingPath = 'lib/hero-framing.ts';
const bytes = fs.readFileSync(modelPath);
const source = fs.readFileSync(framingPath, 'utf8').replace(/\r\n/g, '\n');
const api = {};
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: api });
const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
const bounds = new THREE.Box3().setFromObject(model.scene);
const scale = 4.8 / Math.max(...bounds.getSize(new THREE.Vector3()).toArray());
model.scene.scale.setScalar(scale);
model.scene.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-scale);
model.scene.updateMatrixWorld(true);
const positions = [];
model.scene.traverse(object => {
  if (!object.isMesh) return;
  const attribute = object.geometry.getAttribute('position');
  for (let i = 0; i < attribute.count; i++) positions.push(new THREE.Vector3().fromBufferAttribute(attribute, i).applyMatrix4(object.matrixWorld));
});
const radius = Math.sqrt(Math.max(...positions.map(point => point.lengthSq()))) * 1.025;
const frames = [];
for (const [name, width, height, wide, transmission] of [['mobile', 412, 528, false, 0], ['tablet', 900, 700, false, 0], ['desktop', 1350, 780, true, .74]]) {
  const framing = api.heroFraming(width, height, radius, wide);
  const camera = new THREE.PerspectiveCamera(api.HERO_FIELD_OF_VIEW, width / height, .1, 200);
  camera.position.set(3, 1.7, 6.9).normalize().multiplyScalar(framing.initialDistance);
  camera.setViewOffset(width, height, framing.offsetX, framing.offsetY, width, height);
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  const pixel = point => { const p = point.clone().project(camera); return [(.5 + p.x * .5) * width, (.5 - p.y * .5) * height]; };
  const pixels = positions.map(pixel);
  const anchors = Object.fromEntries(['NL / Web glass panel', 'NL / Growth bar 5', 'NL / Automation module 1'].map(name => [name, pixel(model.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)).getWorldPosition(new THREE.Vector3()))]));
  frames.push({ name, width, height, wide, transmission, framing, camera: camera.position.toArray(), origin: pixel(new THREE.Vector3()), anchors,
    bounds: [Math.min(...pixels.map(p => p[0])), Math.min(...pixels.map(p => p[1])), Math.max(...pixels.map(p => p[0])), Math.max(...pixels.map(p => p[1]))] });
}
const hash = input => crypto.createHash('sha256').update(input).digest('hex');
console.log(JSON.stringify({ modelSha256: hash(bytes), framingSha256: hash(source), fov: api.HERO_FIELD_OF_VIEW, radius, normalization: { scale, center: bounds.getCenter(new THREE.Vector3()).toArray() }, frames }));

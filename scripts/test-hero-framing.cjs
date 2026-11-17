const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
const api = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/hero-framing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: api });
let projectedPoints = 0;
for (const [width, height, wide] of [[375,440,false],[900,650,false],[1009,720,true],[1265,760,true],[1905,820,true],[3840,1080,true],[256,380,false]]) {
  for (const radius of [0.5, 3.1, 8]) {
    const framing = api.heroFraming(width, height, radius, wide);
    assert.ok(framing.minDistance > radius);
    const camera = new THREE.PerspectiveCamera(api.HERO_FIELD_OF_VIEW, width / height, 0.1, 200);
    camera.setViewOffset(width, height, framing.offsetX, framing.offsetY, width, height);
    for (const distance of [framing.minDistance, framing.initialDistance, framing.maxDistance]) {
      for (const yaw of [0, 0.8, 2, 3.7, 5.2]) for (const polar of [0.35, 1.2, 2.5]) {
        camera.position.setFromSphericalCoords(distance, polar, yaw);
        camera.lookAt(0,0,0); camera.updateMatrixWorld();
        for (let latitude = 0; latitude <= 16; latitude++) for (let longitude = 0; longitude < 32; longitude++) {
          const point = new THREE.Vector3().setFromSphericalCoords(radius, latitude * Math.PI / 16, longitude * Math.PI / 16).project(camera);
          const x = (point.x + 1) * width / 2, y = (1 - point.y) * height / 2;
          assert.ok(x >= framing.left - 0.01 && x <= framing.right + 0.01, `Horizontal clipping at ${width}×${height}`);
          assert.ok(y >= framing.top - 0.01 && y <= framing.bottom + 0.01, `Vertical clipping at ${width}×${height}`);
          assert.ok(point.z > -1 && point.z < 1);
          projectedPoints++;
        }
      }
    }
  }
}
for (const dimensions of [[0,800,3],[1280,0,3],[1280,800,-1],[NaN,800,3]]) assert.throws(()=>api.heroFraming(...dimensions));
console.log(`Hero camera fit passed: ${projectedPoints} sphere projections across responsive sizes, zoom limits and orbital angles. No rendering, network or database.`);

let labelLayouts = 0;
function assertLabels(width, height, wide, anchors, previous = []) {
  const original = JSON.stringify(anchors);
  const rectangles = api.layoutHeroLabels(width, height, anchors, wide, previous);
  const bounds = api.heroLabelBounds(width, height, wide);
  assert.equal(JSON.stringify(anchors), original, 'Projected 3D anchors must never be moved');
  assert.equal(rectangles.length, anchors.length);
  for (let index = 0; index < rectangles.length; index++) {
    const rect = rectangles[index];
    assert.ok(rect.left >= bounds.left - 1e-8 && rect.left + rect.width <= bounds.right + 1e-8, `Label crosses the horizontal safe area at ${width}×${height}`);
    assert.ok(rect.top >= bounds.top - 1e-8 && rect.top + rect.height <= bounds.bottom + 1e-8, `Label crosses the vertical safe area at ${width}×${height}`);
    assert.equal(rect.width, anchors[index].width); assert.equal(rect.height, anchors[index].height);
    for (const other of rectangles.slice(index + 1)) {
      assert.ok(rect.left + rect.width + 8 <= other.left + 1e-8 || other.left + other.width + 8 <= rect.left + 1e-8 || rect.top + rect.height + 8 <= other.top + 1e-8 || other.top + other.height + 8 <= rect.top + 1e-8, `Overlapping service labels at ${width}×${height}`);
    }
    // The existing CSS connector still ends at the measured label, while its
    // origin remains the actual projected mesh position, even after clamping.
    const anchor = anchors[index], endX = rect.left + rect.width / 2, endY = rect.top + rect.height;
    const dx = endX - anchor.x, dy = endY + 25 - anchor.y;
    const length = Math.hypot(dx, 25 - dy), angle = Math.atan2(dx, 25 - dy);
    assert.ok(Math.abs(anchor.x + Math.sin(angle) * length - endX) < 1e-7);
    assert.ok(Math.abs(anchor.y - Math.cos(angle) * length - endY) < 1e-7);
  }
  labelLayouts++;
  return rectangles;
}

// Exact camera projections from the independent review: desktop CSS viewport
// 1024 with a 15px scrollbar, plus the mobile orbital overlap.
assertLabels(1009, 720, true, [
  { x: 798.8109198484954, y: 368.41783709269515, width: 154, height: 50 },
  { x: 702.5613272034252, y: 336.54634955396375, width: 178, height: 50 },
]);
assertLabels(375, 380, false, [
  { x: 245.7069965370088, y: 188.0725140792277, width: 145, height: 43 },
  { x: 145.90586342884254, y: 175.40564580700902, width: 160, height: 43 },
]);
for (const [width, height, wide] of [[256,380,false],[375,380,false],[900,650,false],[1009,720,true],[1265,760,true],[1905,820,true],[3840,1080,true]]) {
  // Completely coincident anchors, plus the conservative pre-observer sizes.
  const center = { x: wide ? width * .75 : width * .5, y: height * .5 };
  assertLabels(width, height, wide, [0,1,2].map(() => ({ ...center, width: 210, height: 64 })));
  let seed = 92821, previous = [];
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let frame = 0; frame < 1000; frame++) {
    const anchors = [0,1,2].map(() => ({ x: (random() * 3 - 1) * width, y: (random() * 3 - 1) * height, width: 110 + random() * 100, height: 38 + random() * 26 }));
    previous = assertLabels(width, height, wide, anchors, previous);
  }
}
const separated = [{ x: 150, y: 300, width: 100, height: 40 }, { x: 700, y: 300, width: 100, height: 40 }];
assert.ok(assertLabels(900, 650, false, separated).every(rect => rect.top === 235), 'Unrelated labels should stay at their anchors');
assert.throws(() => api.layoutHeroLabels(375, 380, [{ x: NaN, y: 10, width: 100, height: 40 }], false));
console.log(`Hero label layout passed: ${labelLayouts} measured-size layouts, concrete desktop/mobile regressions, coincident anchors, bounds, 8px separation and connector geometry. No DOM, rendering, network or database.`);

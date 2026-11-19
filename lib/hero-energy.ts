import type * as Three from "three";

/** Deterministic local geometry. No textures, network requests or post-processing passes. */
export function createHeroEnergy(THREE: typeof Three, radius: number, compact: boolean) {
  const group = new THREE.Group();
  const field = new THREE.Group();
  group.add(field);
  const geometries: Three.BufferGeometry[] = [];
  const materials: Three.Material[] = [];
  const threads: Three.Object3D[] = [];
  const cyan = new THREE.Color(0x00bde7), blue = new THREE.Color(0x2165dc);
  for (let strand = 0; strand < 5; strand++) {
    const vertices: Three.Vector3[] = [];
    for (let index = 0; index <= 128; index++) {
      const phase = index / 128 * Math.PI * 2;
      const latitude = Math.sin(phase * 3 + strand * 1.7) * .62;
      const r = radius * (.43 + .17 * Math.sin(phase * 2 + strand));
      vertices.push(new THREE.Vector3(Math.cos(phase * 2 + strand) * r, Math.sin(phase * 2 + strand) * r, Math.sin(latitude) * radius * .68));
    }
    const path = new THREE.CatmullRomCurve3(vertices, true);
    const geometry = new THREE.TubeGeometry(path, compact ? 80 : 128, radius * .0065, 3, true);
    const material = new THREE.MeshBasicMaterial({ color: strand % 2 ? blue : cyan, transparent: true, opacity: .66, depthWrite: false });
    const thread = new THREE.Mesh(geometry, material);
    thread.rotation.set(strand * .68, strand * .91, strand * .34);
    field.add(thread); threads.push(thread); geometries.push(geometry); materials.push(material);
  }
  const count = compact ? 220 : 600;
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const y = 1 - 2 * (index + .5) / count;
    const angle = index * 2.399963229728653;
    const r = radius * (.32 + .58 * ((index * 37 % count) / count));
    const horizontal = Math.sqrt(1 - y * y);
    positions.set([Math.cos(angle) * horizontal * r, y * r, Math.sin(angle) * horizontal * r], index * 3);
    phases[index] = index * .61803398875;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uSize: { value: compact ? 13 : 17 } },
    transparent: true, depthWrite: false,
    vertexShader: `attribute float aPhase; uniform float uTime; uniform float uSize; varying float vGlow;
      void main(){vec3 p=position; float a=uTime*.22+aPhase*.08; float c=cos(a),s=sin(a); p.xz=mat2(c,-s,s,c)*p.xz; p*=1.+.055*sin(uTime*1.3+aPhase*6.28); vec4 view=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*view; gl_PointSize=clamp(uSize/-view.z,1.,4.5); vGlow=.5+.5*sin(aPhase*6.28+uTime*1.7);}`,
    fragmentShader: `varying float vGlow; void main(){float d=length(gl_PointCoord-.5); if(d>.5)discard; float a=(1.-smoothstep(.06,.5,d))*(.55+vGlow*.4); gl_FragColor=vec4(mix(vec3(.05,.32,.9),vec3(.12,.87,1.),vGlow),a);}`,
  });
  field.add(new THREE.Points(geometry, material)); geometries.push(geometry); materials.push(material);
  const heartGeometry = new THREE.SphereGeometry(radius * .16, 20, 12);
  const heartMaterial = new THREE.MeshBasicMaterial({ color: 0x75e7ff, transparent: true, opacity: .95 });
  const heart = new THREE.Mesh(heartGeometry, heartMaterial);
  group.add(heart); geometries.push(heartGeometry); materials.push(heartMaterial);
  const orbitGeometry = new THREE.BufferGeometry();
  const orbitCount = compact ? 96 : 216;
  const orbitPositions = new Float32Array(orbitCount * 3);
  const orbitPhases = new Float32Array(orbitCount);
  for (let index = 0; index < orbitCount; index++) {
    const ring = index % 3, angle = index / orbitCount * Math.PI * 6;
    const r = radius * (1.36 + ring * .14);
    const point = new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, 0);
    point.applyEuler(new THREE.Euler(.65 + ring * .62, ring * .81, ring * -.31));
    orbitPositions.set(point.toArray(), index * 3); orbitPhases[index] = index / orbitCount;
  }
  orbitGeometry.setAttribute("position", new THREE.BufferAttribute(orbitPositions, 3));
  orbitGeometry.setAttribute("aPhase", new THREE.BufferAttribute(orbitPhases, 1));
  const orbitMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false,
    vertexShader: `attribute float aPhase; uniform float uTime; varying float vAlpha; void main(){vec4 v=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*v; gl_PointSize=clamp(16./-v.z,1.2,3.5); vAlpha=.2+.8*pow(.5+.5*sin(aPhase*18.85-uTime*1.5),5.);}`,
    fragmentShader: `varying float vAlpha; void main(){float d=length(gl_PointCoord-.5); if(d>.5)discard; gl_FragColor=vec4(.02,.48,.82,(1.-smoothstep(.1,.5,d))*vAlpha);}`,
  });
  const orbital = new THREE.Points(orbitGeometry, orbitMaterial);
  group.add(orbital); geometries.push(orbitGeometry); materials.push(orbitMaterial);
  return { group,
    update(time: number, pulse: number) {
      material.uniforms.uTime.value = orbitMaterial.uniforms.uTime.value = time;
      field.rotation.set(Math.sin(time * .11) * .16, time * .12, Math.sin(time * .09) * .12);
      threads.forEach((thread, index) => { thread.rotation.z = index * .34 + time * (index % 2 ? -.09 : .12); });
      orbital.rotation.y = time * .07;
      heart.scale.setScalar(1 + .09 * Math.sin(time * 1.6) + pulse * .25);
      heartMaterial.opacity = .82 + .12 * Math.sin(time * 1.6);
    },
    dispose() { geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); group.removeFromParent(); },
  };
}

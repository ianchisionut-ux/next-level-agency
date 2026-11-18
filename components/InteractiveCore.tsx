"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ArrowUpRight, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import type * as Three from "three";
import { HERO_FIELD_OF_VIEW, heroFraming, layoutHeroLabels, type HeroLabelAnchor, type HeroLabelRect } from "@/lib/hero-framing";

type CoreControls = { pulse: () => void; reset: () => void; rotate: (x: number, y: number) => void; zoom: (factor: number) => void };
export function heroRuntimePolicy(preferences: { compact: boolean; coarse: boolean; reduced: boolean; saveData: boolean }) {
  const manual = preferences.compact || preferences.coarse || preferences.reduced || preferences.saveData;
  return { automatic: !manual, autoRotate: !manual, pixelRatioCap: manual ? 1 : 1.5, environmentSize: manual ? 64 : 128, maxFps: 30, transmissionCap: manual ? 0 : 0.58 };
}
export function shouldAutoStartHero(policy: ReturnType<typeof heroRuntimePolicy>, visible: boolean, loaded: boolean, painted: boolean) {
  return policy.automatic && visible && loaded && painted;
}
const coreServices = [
  { key: "web", title: "Web & App Dev", description: "Experiențe care convertesc", href: "/servicii#web-development", mesh: "NL / Web glass panel" },
  { key: "marketing", title: "Performance Marketing", description: "Campanii. Rezultate. Creștere.", href: "/servicii#performance-marketing", mesh: "NL / Growth bar 5" },
  { key: "automation", title: "AI & Automatizări", description: "Mai mult impact. Mai puțin efort.", href: "/servicii#ai-automatizari", mesh: "NL / Automation module 1" },
] as const;

/** The editable Blender model is loaded only when the hero is near the viewport. */
export default function InteractiveCore() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<CoreControls | null>(null);
  const activate = useRef<(() => void) | null>(null);
  const preloadOnPointer = useRef(false);
  const pausedRef = useRef(false);
  const serviceLabels = useRef<(HTMLDivElement | null)[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [booting, setBooting] = useState(false);
  const [status, setStatus] = useState("Explorează ecosistemul Next Level în 3D.");

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const coarse = window.matchMedia("(pointer: coarse)");
    const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection;
    const readPolicy = () => heroRuntimePolicy({ compact: compact.matches, coarse: coarse.matches, reduced: reduced.matches, saveData: Boolean(connection?.saveData) });
    preloadOnPointer.current = readPolicy().automatic;
    let disposed = false, started = false, visible = false;
    let frame = 0;
    let loaded = document.readyState === "complete", painted = false;
    let paintFrame = 0, paintFrameAfter = 0;
    let idleHandle: number | undefined;
    const nativeIdle = typeof window.requestIdleCallback === "function";
    let release = () => {};
    let schedule = () => {};
    const resetLabels = () => serviceLabels.current.forEach(label => { if (label) label.style.cssText = ""; });

    const init = async () => {
      if (disposed || started) return;
      started = true;
      setBooting(true); setStatus("Se pregătește ecosistemul 3D.");
      const quality = readPolicy();
      pausedRef.current = !quality.autoRotate;
      setPaused(pausedRef.current);
      try {
        const [THREE, { OrbitControls }, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          import("three"), import("three/addons/controls/OrbitControls.js"),
          import("three/addons/loaders/GLTFLoader.js"), import("three/addons/environments/RoomEnvironment.js"),
        ]);
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatioCap));
        renderer.setClearColor(0xffffff, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.domElement.setAttribute("aria-hidden", "true");
        mount.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(HERO_FIELD_OF_VIEW, 1, 0.1, 200);
        camera.position.set(3, 1.7, 6.9);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotateSpeed = 0.55;
        controls.minDistance = 1;
        controls.maxDistance = 100;
        controls.minPolarAngle = 0.35;
        controls.maxPolarAngle = Math.PI - 0.35;
        controls.rotateSpeed = 0.7;
        controls.zoomSpeed = 0.5;
        controls.target.set(0, 0, 0);
        controls.update();
        const stage = new THREE.Group();
        scene.add(stage);
        let sceneRadius = 2.9;
        let wideScene = false;
        let fitted = false;
        let viewportWidth = mount.clientWidth, viewportHeight = mount.clientHeight;
        const labelSizes = coreServices.map(() => ({ width: 210, height: 64 }));
        let previousLabels: HeroLabelRect[] = [];
        const defaultDirection = new THREE.Vector3(3, 1.7, 6.9).normalize();
        const fitView = (reset = false) => {
          const width = viewportWidth, height = viewportHeight;
          if (!width || !height) return;
          wideScene = window.matchMedia("(min-width: 1024px)").matches;
          const framing = heroFraming(width, height, sceneRadius, wideScene);
          const zoomRatio = fitted && !reset ? camera.position.distanceTo(controls.target) / controls.minDistance : framing.initialDistance / framing.minDistance;
          controls.minDistance = framing.minDistance;
          controls.maxDistance = framing.maxDistance;
          camera.aspect = width / height;
          camera.setViewOffset(width, height, framing.offsetX, framing.offsetY, width, height);
          const distance = Math.max(framing.minDistance, Math.min(framing.maxDistance, framing.minDistance * zoomRatio));
          if (reset || !fitted) camera.position.copy(defaultDirection).multiplyScalar(distance);
          else camera.position.sub(controls.target).setLength(distance).add(controls.target);
          controls.update();
          fitted = true;
        };
        const projected = new THREE.Vector3();
        const labelTargets: (Three.Object3D | undefined)[] = [];
        const projectLabels = () => {
          const width = viewportWidth, height = viewportHeight;
          if (!width || !height) return;
          stage.updateMatrixWorld(true);
          camera.updateMatrixWorld();
          const anchors: HeroLabelAnchor[] = [];
          const indices: number[] = [];
          labelTargets.forEach((target, index) => {
            const label = serviceLabels.current[index];
            if (!target || !label) return;
            target.getWorldPosition(projected).project(camera);
            anchors.push({ x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height, ...labelSizes[index] });
            indices.push(index);
          });
          const placed = layoutHeroLabels(width, height, anchors, wideScene, previousLabels);
          previousLabels = placed;
          placed.forEach((rect, index) => {
            const label = serviceLabels.current[indices[index]];
            if (!label) return;
            const anchorX = anchors[index].x, anchorY = anchors[index].y;
            // Three DOM style writes per rendered frame; React stays idle.
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height + 25;
            const dx = x - anchorX, dy = y - anchorY;
            const connectorLength = Math.hypot(dx, 25 - dy);
            const connectorAngle = Math.atan2(dx, 25 - dy) * 180 / Math.PI;
            label.style.cssText = `transform:translate3d(${anchorX.toFixed(2)}px,${anchorY.toFixed(2)}px,0);--label-x:${dx.toFixed(2)}px;--label-y:${dy.toFixed(2)}px;--connector-length:${connectorLength.toFixed(2)}px;--connector-angle:${connectorAngle.toFixed(2)}deg`;
          });
        };
        const environment = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environmentTarget = pmrem.fromScene(environment, 0.04, 0.1, 100, { size: quality.environmentSize });
        scene.environment = environmentTarget.texture;
        environment.dispose();
        pmrem.dispose();
        scene.add(new THREE.HemisphereLight(0xe7f6ff, 0x425a76, 2.1));
        const key = new THREE.DirectionalLight(0xffffff, 4.3);
        key.position.set(4, 6, 4); scene.add(key);
        const cyan = new THREE.PointLight(0x22d3ee, 16, 12);
        cyan.position.set(-2, 1.5, 2.5); scene.add(cyan);
        const rim = new THREE.DirectionalLight(0x99b9ff, 2.6);
        rim.position.set(-3, 2, -2); scene.add(rim);

        // Small additive halos give emissive nodes a soft bloom while keeping
        // the renderer transparent over the white page (no black compositor).
        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = glowCanvas.height = 64;
        const paint = glowCanvas.getContext("2d");
        if (paint) {
          const gradient = paint.createRadialGradient(32, 32, 0, 32, 32, 32);
          gradient.addColorStop(0, "rgba(180,250,255,.9)");
          gradient.addColorStop(0.18, "rgba(34,211,238,.5)");
          gradient.addColorStop(1, "rgba(34,211,238,0)");
          paint.fillStyle = gradient; paint.fillRect(0, 0, 64, 64);
        }
        const glowTexture = new THREE.CanvasTexture(glowCanvas);
        const halos: Three.Sprite[] = [];
        const emissive: { material: Three.MeshStandardMaterial; intensity: number }[] = [];
        let pulseUntil = 0;
        let lastRender = 0;
        let rendering = false;
        let forceRender = true;
        let contextUnavailable = false;
        let released = false;
        const render = (now: number) => {
          frame = 0;
          if (disposed || contextUnavailable || !visible || document.hidden) return;
          if (!forceRender && now - lastRender < 1000 / quality.maxFps) { frame = requestAnimationFrame(render); return; }
          forceRender = false;
          rendering = true;
          const animating = !pausedRef.current && !reduced.matches;
          controls.autoRotate = animating;
          const changed = controls.update(lastRender ? Math.min((now - lastRender) / 1000, 0.1) : 1 / quality.maxFps);
          const pulse = reduced.matches ? 0 : Math.max(0, (pulseUntil - now) / 1000);
          emissive.forEach(({ material, intensity }) => { material.emissiveIntensity = intensity * (1 + pulse * 1.8); });
          halos.forEach((halo, index) => { (halo.material as Three.SpriteMaterial).opacity = 0.28 + pulse * 0.42 + (animating ? Math.sin(now * 0.0015 + index) * 0.055 : 0); });
          renderer.render(scene, camera); projectLabels(); lastRender = now;
          rendering = false;
          if (animating || changed || pulse > 0) frame = requestAnimationFrame(render);
        };
        schedule = () => { if (!rendering) forceRender = true; if (!disposed && !contextUnavailable && visible && !document.hidden && !frame && !rendering) frame = requestAnimationFrame(render); };
        const labelElements = new Map<Element, number>();
        const resize = new ResizeObserver(entries => {
          let resizedStage = false;
          entries.forEach(entry => {
            if (entry.target === mount) {
              viewportWidth = entry.contentRect.width; viewportHeight = entry.contentRect.height;
              resizedStage = true;
            } else {
              const index = labelElements.get(entry.target);
              if (index === undefined) return;
              const borderBox = entry.borderBoxSize?.[0];
              const box = borderBox ? { width: borderBox.inlineSize, height: borderBox.blockSize } : entry.target.getBoundingClientRect();
              if (box.width > 0 && box.height > 0) labelSizes[index] = { width: box.width, height: box.height };
            }
          });
          previousLabels = [];
          if (resizedStage && viewportWidth > 0 && viewportHeight > 0) { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, readPolicy().pixelRatioCap)); renderer.setSize(viewportWidth, viewportHeight, false); fitView(); }
          schedule();
        });
        resize.observe(mount);
        serviceLabels.current.forEach((label, index) => {
          const link = label?.querySelector<HTMLAnchorElement>(".nl-core-service-link");
          if (!link) return;
          labelElements.set(link, index);
          const box = link.getBoundingClientRect();
          if (box.width > 0 && box.height > 0) labelSizes[index] = { width: box.width, height: box.height };
          resize.observe(link, { box: "border-box" });
        });
        controls.addEventListener("change", schedule);
        controls.addEventListener("start", schedule);
        const contextLost = (event: Event) => { event.preventDefault(); contextUnavailable = true; cancelAnimationFrame(frame); frame = 0; api.current = null; resetLabels(); setFailed(true); setReady(false); setStatus("Previzualizarea 3D nu este disponibilă. Se afișează imaginea de rezervă."); };
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        release = () => {
          if (released) return;
          released = true;
          resetLabels();
          cancelAnimationFrame(frame);
          resize.disconnect();
          controls.dispose();
          renderer.domElement.removeEventListener("webglcontextlost", contextLost);
          const geometries = new Set<Three.BufferGeometry>();
          const materials = new Set<Three.Material>();
          stage.traverse(object => {
            if (object instanceof THREE.Mesh) { geometries.add(object.geometry); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)); }
            if (object instanceof THREE.Sprite) materials.add(object.material);
          });
          geometries.forEach(geometry => geometry.dispose());
          materials.forEach(material => material.dispose());
          glowTexture.dispose(); environmentTarget.dispose();
          renderer.dispose(); renderer.domElement.remove();
        };
        const model = await new GLTFLoader().loadAsync("/hero/nextlevel-core.glb");
        if (disposed) {
          model.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose()); } });
          return;
        }
        const bounds = new THREE.Box3().setFromObject(model.scene);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = 4.8 / Math.max(size.x, size.y, size.z);
        model.scene.scale.setScalar(scale);
        model.scene.position.copy(center).multiplyScalar(-scale);
        stage.add(model.scene);
        model.scene.updateMatrixWorld(true);
        const vertex = new THREE.Vector3();
        let radiusSquared = 0;
        model.scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const positions = object.geometry.getAttribute("position");
          for (let index = 0; index < positions.count; index++) {
            vertex.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld);
            radiusSquared = Math.max(radiusSquared, vertex.lengthSq());
          }
        });
        sceneRadius = Math.sqrt(radiusSquared) * 1.025;
        fitView(true);
        coreServices.forEach((service, index) => { labelTargets[index] = model.scene.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(service.mesh)); });
        model.scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;
            material.envMapIntensity = 1.35;
            if (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0) { material.transmission = Math.min(material.transmission, quality.transmissionCap); material.thickness = 0.8; }
            if (material.emissiveIntensity > 0) { material.emissiveIntensity = Math.min(material.emissiveIntensity, 2.3); emissive.push({ material, intensity: material.emissiveIntensity }); }
          });
          if (/Automation.node/i.test(object.name)) {
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3 }));
            halo.scale.setScalar(0.85); object.add(halo); halos.push(halo);
          }
        });
        api.current = {
          pulse: () => { pulseUntil = performance.now() + 1000; schedule(); },
          reset: () => { stage.rotation.set(0, 0, 0); fitView(true); schedule(); },
          rotate: (x, y) => { stage.rotation.y += x; stage.rotation.x += y; schedule(); },
          zoom: factor => { const length = Math.max(controls.minDistance, Math.min(controls.maxDistance, camera.position.length() * factor)); camera.position.setLength(length); controls.update(); schedule(); },
        };
        renderer.render(scene, camera); projectLabels();
        setReady(true); setBooting(false); setStatus("Modelul Blender este interactiv. Trage cu mouse-ul sau degetul pentru rotire.");
        schedule();
      } catch {
        if (!disposed) { release(); setFailed(true); setBooting(false); setStatus("Modelul 3D nu se poate încărca. Se afișează imaginea de rezervă."); }
      }
    };
    const cancelBoot = () => {
      if (idleHandle === undefined) return;
      if (nativeIdle) window.cancelIdleCallback(idleHandle); else window.clearTimeout(idleHandle);
      idleHandle = undefined;
    };
    const scheduleBoot = () => {
      if (disposed || started || document.hidden || idleHandle !== undefined || !shouldAutoStartHero(readPolicy(), visible, loaded, painted)) return;
      const boot = () => { idleHandle = undefined; if (!document.hidden && shouldAutoStartHero(readPolicy(), visible, loaded, painted)) void init(); };
      idleHandle = nativeIdle ? window.requestIdleCallback(boot, { timeout: 2000 }) : window.setTimeout(boot, 350);
    };
    activate.current = () => { cancelBoot(); void init(); };
    const onLoad = () => { loaded = true; scheduleBoot(); };
    window.addEventListener("load", onLoad, { once: true });
    paintFrame = requestAnimationFrame(() => { paintFrameAfter = requestAnimationFrame(() => { painted = true; scheduleBoot(); }); });
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible && !started) scheduleBoot();
      else if (visible) schedule();
      else { cancelBoot(); cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: "0px" });
    intersection.observe(mount);
    const wake = () => { if (document.hidden) { cancelBoot(); cancelAnimationFrame(frame); frame = 0; } else { scheduleBoot(); schedule(); } };
    const motion = () => { preloadOnPointer.current = readPolicy().automatic; if (!readPolicy().automatic) cancelBoot(); else scheduleBoot(); schedule(); };
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", motion);
    compact.addEventListener("change", motion); coarse.addEventListener("change", motion); connection?.addEventListener("change", motion);
    return () => { disposed = true; api.current = null; activate.current = null; cancelBoot(); cancelAnimationFrame(paintFrame); cancelAnimationFrame(paintFrameAfter); intersection.disconnect(); window.removeEventListener("load", onLoad); document.removeEventListener("visibilitychange", wake); reduced.removeEventListener("change", motion); compact.removeEventListener("change", motion); coarse.removeEventListener("change", motion); connection?.removeEventListener("change", motion); release(); };
  }, []);

  function togglePause() {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    api.current?.rotate(0, 0);
  }
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const move: Record<string, [number, number]> = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] };
    if (move[event.key]) { event.preventDefault(); api.current?.rotate(...move[event.key]); }
    else if (event.key === "Home") { event.preventDefault(); api.current?.reset(); }
    else if (event.key === " ") { event.preventDefault(); togglePause(); }
    else if (event.key === "+" || event.key === "=") { event.preventDefault(); api.current?.zoom(0.9); }
    else if (event.key === "-") { event.preventDefault(); api.current?.zoom(1.1); }
  }

  return (
    <div className={`nl-interactive-core ${ready && !failed ? "is-ready" : ""}`}>
      <style>{`.nl-core-fallback.nl-core-runtime-preview{left:0;right:0;width:100%;height:100%;object-position:50% 50%}@media(min-width:1024px){.nl-core-fallback.nl-core-runtime-preview{object-position:75% 50%}}`}</style>
      <div className="nl-core-stage" tabIndex={ready && !failed ? 0 : -1} role="group" aria-label="Ecosistem 3D Next Level, rotire interactivă" aria-describedby="nl-core-help" onKeyDown={keyboard} onPointerEnter={() => { if (preloadOnPointer.current) activate.current?.(); }}>
        <span id="nl-core-help" className="sr-only">Folosește săgețile pentru rotire, plus și minus pentru zoom, Home pentru resetare și spațiu pentru pauză.</span>
        <picture>
          <source media="(min-width: 1024px)" srcSet="/hero/nextlevel-core-runtime-desktop.webp" type="image/webp" />
          <source media="(min-width: 481px)" srcSet="/hero/nextlevel-core-runtime-tablet.webp" type="image/webp" />
          <Image src="/hero/nextlevel-core-runtime-mobile.webp" alt="Previzualizare a modelului Next Level: nucleu, orbite, panou web, automatizări și grafic de marketing" width={412} height={494} unoptimized loading="lazy" fetchPriority="low" className="nl-core-render nl-core-fallback nl-core-runtime-preview" />
        </picture>
        <div ref={host} className="nl-core-canvas" aria-hidden="true" />
        {!ready && !failed && <button type="button" className="nl-core-activate" disabled={booting} onClick={() => activate.current?.()}><Sparkles size={17} aria-hidden="true" />{booting ? "Se pregătește…" : "Explorează în 3D"}</button>}
        <div className="nl-core-services" aria-label="Explorează serviciile din ecosistem">
          {coreServices.map((service, index) => <div key={service.key} ref={element => { serviceLabels.current[index] = element; }} className={`nl-core-service-label nl-core-service-${service.key}`}>
            <span className="nl-core-service-connector" aria-hidden="true" />
            <Link href={service.href} className="nl-core-service-link">
              <span><strong>{service.title}</strong><small>{service.description}</small></span>
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>)}
        </div>
      </div>
      <div className="nl-core-controls">
        <div>
          <button type="button" onClick={() => { api.current?.pulse(); setStatus("Impuls luminos activat în ecosistemul 3D."); }} disabled={!ready || failed} aria-label="Activează impulsul luminos"><Sparkles size={15} aria-hidden="true" /></button>
          <button type="button" onClick={togglePause} disabled={!ready || failed} aria-label={paused ? "Pornește rotirea automată" : "Oprește rotirea automată"} aria-pressed={paused}>{paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}</button>
          <button type="button" onClick={() => api.current?.reset()} disabled={!ready || failed} aria-label="Resetează perspectiva 3D"><RotateCcw size={15} aria-hidden="true" /></button>
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">{status}</p>
    </div>
  );
}

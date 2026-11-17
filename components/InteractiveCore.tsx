"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Hand, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import type * as Three from "three";

type CoreControls = { pulse: () => void; reset: () => void; rotate: (x: number, y: number) => void; zoom: (factor: number) => void };

/** The editable Blender model is loaded only when the hero is near the viewport. */
export default function InteractiveCore() {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<CoreControls | null>(null);
  const pausedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("Se pregătește ecosistemul 3D. Imaginea de rezervă este disponibilă.");

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false, started = false, visible = false;
    let frame = 0;
    let release = () => {};
    let schedule = () => {};

    const init = async () => {
      started = true;
      try {
        const [THREE, { OrbitControls }, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
          import("three"), import("three/addons/controls/OrbitControls.js"),
          import("three/addons/loaders/GLTFLoader.js"), import("three/addons/environments/RoomEnvironment.js"),
        ]);
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0xffffff, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.domElement.setAttribute("aria-hidden", "true");
        mount.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
        camera.position.set(3, 1.7, 6.9);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enablePan = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotateSpeed = 0.55;
        controls.minDistance = 4.7;
        controls.maxDistance = 11;
        controls.minPolarAngle = 0.35;
        controls.maxPolarAngle = Math.PI - 0.35;
        controls.rotateSpeed = 0.7;
        controls.zoomSpeed = 0.5;
        controls.target.set(0, 0, 0);
        controls.update();
        controls.saveState();
        const stage = new THREE.Group();
        scene.add(stage);
        const environment = new RoomEnvironment();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const environmentTarget = pmrem.fromScene(environment, 0.04);
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
        let contextUnavailable = false;
        let released = false;
        const render = (now: number) => {
          frame = 0;
          if (disposed || contextUnavailable || !visible || document.hidden) return;
          rendering = true;
          const animating = !pausedRef.current && !reduced.matches;
          controls.autoRotate = animating;
          const changed = controls.update();
          const pulse = reduced.matches ? 0 : Math.max(0, (pulseUntil - now) / 1000);
          emissive.forEach(({ material, intensity }) => { material.emissiveIntensity = intensity * (1 + pulse * 1.8); });
          halos.forEach((halo, index) => { (halo.material as Three.SpriteMaterial).opacity = 0.28 + pulse * 0.42 + (animating ? Math.sin(now * 0.0015 + index) * 0.055 : 0); });
          if (now - lastRender >= 1000 / 40 || !animating || pulse > 0) {
            renderer.render(scene, camera); lastRender = now;
          }
          rendering = false;
          if (animating || changed || pulse > 0) frame = requestAnimationFrame(render);
        };
        schedule = () => { if (!disposed && !contextUnavailable && visible && !document.hidden && !frame && !rendering) frame = requestAnimationFrame(render); };
        const resize = new ResizeObserver(() => {
          const width = mount.clientWidth, height = mount.clientHeight;
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix(); schedule();
        });
        resize.observe(mount);
        controls.addEventListener("change", schedule);
        controls.addEventListener("start", schedule);
        const contextLost = (event: Event) => { event.preventDefault(); contextUnavailable = true; cancelAnimationFrame(frame); frame = 0; api.current = null; setFailed(true); setReady(false); setStatus("Previzualizarea 3D nu este disponibilă. Imaginea Blender rămâne vizibilă."); };
        renderer.domElement.addEventListener("webglcontextlost", contextLost);
        release = () => {
          if (released) return;
          released = true;
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
        model.scene.traverse(object => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(material => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;
            material.envMapIntensity = 1.35;
            if (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0) { material.transmission = Math.min(material.transmission, 0.58); material.thickness = 0.8; }
            if (material.emissiveIntensity > 0) { material.emissiveIntensity = Math.min(material.emissiveIntensity, 2.3); emissive.push({ material, intensity: material.emissiveIntensity }); }
          });
          if (/Automation.node/i.test(object.name)) {
            const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.3 }));
            halo.scale.setScalar(0.85); object.add(halo); halos.push(halo);
          }
        });
        api.current = {
          pulse: () => { pulseUntil = performance.now() + 1000; schedule(); },
          reset: () => { stage.rotation.set(0, 0, 0); controls.reset(); schedule(); },
          rotate: (x, y) => { stage.rotation.y += x; stage.rotation.x += y; schedule(); },
          zoom: factor => { const length = Math.max(controls.minDistance, Math.min(controls.maxDistance, camera.position.length() * factor)); camera.position.setLength(length); controls.update(); schedule(); },
        };
        renderer.render(scene, camera);
        setReady(true); setStatus("Modelul Blender este interactiv. Trage cu mouse-ul sau degetul pentru rotire.");
        schedule();
      } catch {
        if (!disposed) { release(); setFailed(true); setStatus("Modelul 3D nu se poate încărca. Randarea Blender rămâne disponibilă."); }
      }
    };
    const intersection = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      if (visible && !started) void init();
      else if (visible) schedule();
      else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: "160px" });
    intersection.observe(mount);
    const wake = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else schedule(); };
    const motion = () => { schedule(); };
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", motion);
    return () => { disposed = true; api.current = null; intersection.disconnect(); document.removeEventListener("visibilitychange", wake); reduced.removeEventListener("change", motion); release(); };
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
      <div className="nl-core-stage" tabIndex={0} role="group" aria-label="Ecosistem 3D Next Level, rotire interactivă" aria-describedby="nl-core-help" onKeyDown={keyboard}>
        <Image src="/hero/nextlevel-core.webp" alt="Ecosistem 3D Next Level creat în Blender: nucleu de sticlă, orbite cyan, interfață web, automatizări și grafic de performanță" width={1200} height={1200} priority sizes="(min-width: 1280px) 680px, (min-width: 1024px) 50vw, 100vw" className="nl-core-render nl-core-fallback" />
        <div ref={host} className="nl-core-canvas" aria-hidden="true" />
      </div>
      <div className="nl-core-controls">
        <span id="nl-core-help"><Hand size={13} aria-hidden="true" /> Trage pentru a roti <span className="nl-core-keyboard-help">· săgeți / + / −</span></span>
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

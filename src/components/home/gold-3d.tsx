"use client";

import { useEffect, useRef } from "react";

/** Lingots d'or 3D (three.js) : fond transparent, rotation lente et parallaxe souris. */
export function Gold3D() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    import("three").then((T) => {
      if (disposed) return;
      const W = () => Math.max(1, el.clientWidth);
      const H = () => Math.max(1, el.clientHeight);
      const renderer = new T.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setSize(W(), H());
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFShadowMap;
      Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
      el.appendChild(renderer.domElement);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, W() / H(), 0.1, 100);
      camera.position.set(0, 3.4, 9.2);
      camera.lookAt(0, 0.35, 0);

      // Environnement « studio » pour les reflets du métal
      const env = new T.Scene();
      env.add(new T.Mesh(new T.BoxGeometry(30, 30, 30), new T.MeshBasicMaterial({ color: 0x0b0b0d, side: T.BackSide })));
      const panel = (w: number, h: number, x: number, y: number, z: number, c: number) => {
        const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
        m.position.set(x, y, z);
        m.lookAt(0, 0, 0);
        env.add(m);
      };
      panel(10, 3, 0, 9, 4, 0xffffff);
      panel(4, 10, -10, 3, 2, 0xfff1d6);
      panel(3, 8, 10, 2, -3, 0xffe2a8);
      panel(12, 1.2, 0, -2, 11, 0x9a7a3a);
      panel(6, 2, 4, 6, -10, 0xffffff);
      const pmrem = new T.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(env, 0.02).texture;

      scene.add(new T.AmbientLight(0xffffff, 0.15));
      const key = new T.DirectionalLight(0xfff0d0, 2.2);
      key.position.set(3, 7, 4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
      key.shadow.radius = 6;
      scene.add(key);
      const rim = new T.DirectionalLight(0xd9bc6e, 1.4);
      rim.position.set(-5, 2, -4);
      scene.add(rim);

      // Gravure du dessus des lingots
      const engr = (l1: string, l2: string, l3: string) => {
        const c = document.createElement("canvas");
        c.width = 1024;
        c.height = 512;
        const g = c.getContext("2d")!;
        g.fillStyle = "#e2b860";
        g.fillRect(0, 0, 1024, 512);
        g.strokeStyle = "rgba(90,60,10,.55)";
        g.lineWidth = 6;
        g.strokeRect(40, 40, 944, 432);
        g.fillStyle = "rgba(80,52,8,.75)";
        g.textAlign = "center";
        g.font = "600 92px Georgia, serif";
        g.fillText(l1, 512, 175);
        g.font = "500 64px Georgia, serif";
        g.fillText(l2, 512, 290);
        g.font = "400 46px Georgia, serif";
        g.fillText(l3, 512, 390);
        const t = new T.CanvasTexture(c);
        t.colorSpace = T.SRGBColorSpace;
        t.anisotropy = 8;
        return t;
      };
      const gold = new T.MeshPhysicalMaterial({ color: 0xe3b65a, metalness: 1, roughness: 0.2, clearcoat: 0.4, clearcoatRoughness: 0.15 });

      // Lingot trapézoïdal
      const ingot = (L: number, Wb: number, Wt: number, Hh: number, text: [string, string, string]) => {
        const s = new T.Shape();
        s.moveTo(-Wb / 2, 0);
        s.lineTo(Wb / 2, 0);
        s.lineTo(Wt / 2, Hh);
        s.lineTo(-Wt / 2, Hh);
        s.closePath();
        const geo = new T.ExtrudeGeometry(s, { depth: L, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 4 });
        geo.translate(0, 0, -L / 2);
        const g = new T.Group();
        const m = new T.Mesh(geo, gold);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
        const top = new T.Mesh(
          new T.PlaneGeometry(L * 0.8, Wt * 0.85),
          new T.MeshPhysicalMaterial({ map: engr(...text), metalness: 1, roughness: 0.28, clearcoat: 0.3 }),
        );
        top.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
        top.position.y = Hh + 0.052;
        g.add(top);
        return g;
      };
      const group = new T.Group();
      scene.add(group);
      const t1: [string, string, string] = ["BURKINA OR", "1000 g", "FIN 999,9"];
      const a = ingot(2.6, 1.25, 0.95, 0.48, t1);
      a.position.set(-0.68, 0, 0);
      a.rotation.y = 0.02;
      const b = ingot(2.6, 1.25, 0.95, 0.48, t1);
      b.position.set(0.68, 0, 0.06);
      b.rotation.y = -0.03;
      const c = ingot(2.6, 1.25, 0.95, 0.48, t1);
      c.position.set(0, 0.53, 0.02);
      c.rotation.y = 0.01;
      const d = ingot(1.3, 0.72, 0.56, 0.24, ["BURKINA OR", "100 g", "999,9"]);
      d.position.set(1.55, 0, 2.0);
      d.rotation.y = -0.65;
      const e = ingot(0.8, 0.46, 0.36, 0.12, ["BO", "10 g", "999,9"]);
      e.position.set(-1.6, 0, 1.9);
      e.rotation.y = 0.5;
      group.add(a, b, c, d, e);
      group.position.y = -0.1;

      const ground = new T.Mesh(new T.PlaneGeometry(30, 30), new T.ShadowMaterial({ opacity: 0.55 }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.1;
      ground.receiveShadow = true;
      scene.add(ground);

      // Halo doré en arrière-plan
      const gc = document.createElement("canvas");
      gc.width = gc.height = 256;
      const gg = gc.getContext("2d")!;
      const rg = gg.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, "rgba(217,188,110,.35)");
      rg.addColorStop(1, "rgba(217,188,110,0)");
      gg.fillStyle = rg;
      gg.fillRect(0, 0, 256, 256);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(gc), depthWrite: false, transparent: true }));
      glow.scale.set(9, 6, 1);
      glow.position.set(0, 1, -2.5);
      scene.add(glow);

      let mx = 0, my = 0, tx = 0, ty = 0;
      const onMove = (ev: PointerEvent) => {
        const r = el.getBoundingClientRect();
        tx = (ev.clientX - r.left) / r.width - 0.5;
        ty = (ev.clientY - r.top) / r.height - 0.5;
      };
      window.addEventListener("pointermove", onMove);
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const fit = () => {
        renderer.setSize(W(), H());
        camera.aspect = W() / H();
        camera.position.z = camera.aspect < 0.9 ? 12 : 9.2;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(fit);
      ro.observe(el);
      const t0 = performance.now();
      const loop = () => {
        const t = (performance.now() - t0) / 1000;
        mx += (tx - mx) * 0.05;
        my += (ty - my) * 0.05;
        group.rotation.y = (reduce ? 0 : Math.sin(t * 0.25) * 0.35) + mx * 0.5 - 0.35;
        group.rotation.x = my * 0.08;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      };
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }).catch((err) => console.warn("gold-3d", err));

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  return <div ref={host} className="relative block h-full w-full" aria-hidden="true" />;
}

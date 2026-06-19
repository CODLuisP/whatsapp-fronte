import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 400;
    const H = mount.clientHeight || 300;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 4, 6);
    camera.lookAt(0, 0, 0);

    // Grid
    const grid = new THREE.GridHelper(20, 24, 0x4ade80, 0x4ade80);
    (grid.material as THREE.LineBasicMaterial).transparent = true;
    (grid.material as THREE.LineBasicMaterial).opacity     = 0.12;
    scene.add(grid);

    // Subtle slow scroll animation
    let animId: number;
    let offset = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      offset += 0.003;
      grid.position.z = offset % (20 / 24); // scroll forward continuously
      renderer.render(scene, camera);
    };

    animate();

    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      grid.geometry.dispose();
      (grid.material as THREE.Material).dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className={`absolute inset-0 pointer-events-none ${className}`} />;
}

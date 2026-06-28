import * as THREE from "three";
import type { ShopCategory } from "./types";

const paletteByCategory: Record<ShopCategory, { primary: number; accent: number; shelf: number }> = {
  kiryana: { primary: 0xf4a823, accent: 0xff6b35, shelf: 0x6d421c },
  clothing: { primary: 0xb84d7a, accent: 0x2f8f83, shelf: 0x4a2541 },
  hardware: { primary: 0x4f6673, accent: 0xf4a823, shelf: 0x2d363b },
  other: { primary: 0x2f7d32, accent: 0xf4a823, shelf: 0x35442a },
};

function box(width: number, height: number, depth: number, color: number) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.04 })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function DukaanScene({ category }: { category: ShopCategory }) {
  return (
    <div
      className="dukaan-3d"
      ref={(mount) => {
        if (!mount || mount.dataset.sceneReady === category) return;
        mount.dataset.sceneReady = category;
        mount.innerHTML = "";

        const cleanup = buildScene(mount, category);
        mount.dataset.cleanup = "ready";
        (mount as HTMLDivElement & { cleanupScene?: () => void }).cleanupScene = cleanup;
      }}
      aria-label="animated 3D dukaan preview"
    />
  );
}

function buildScene(mount: HTMLDivElement, category: ShopCategory) {
    if (!mount) return;

    const colors = paletteByCategory[category];
    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / mount.clientHeight, 0.1, 100);
    camera.position.set(4.4, 3.3, 6.2);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.HemisphereLight(0xfff2d4, 0x6b4a2a, 2.1);
    scene.add(ambient);
    const light = new THREE.DirectionalLight(0xffffff, 2.8);
    light.position.set(3, 6, 5);
    light.castShadow = true;
    scene.add(light);

    const group = new THREE.Group();
    scene.add(group);

    const floor = box(5.6, 0.12, 3.4, 0xffe4b5);
    floor.position.y = -0.08;
    group.add(floor);

    const backWall = box(5.2, 2.5, 0.12, 0xfff4df);
    backWall.position.set(0, 1.15, -1.55);
    group.add(backWall);

    const counter = box(4.4, 0.72, 0.86, colors.shelf);
    counter.position.set(0, 0.33, 0.95);
    group.add(counter);

    const awning = box(5.35, 0.28, 0.52, colors.primary);
    awning.position.set(0, 2.58, -1.26);
    group.add(awning);

    for (let i = -2; i <= 2; i += 1) {
      const stripe = box(0.42, 0.34, 0.58, i % 2 === 0 ? colors.accent : 0xfff8ec);
      stripe.position.set(i * 0.52, 2.35, -1.2);
      group.add(stripe);
    }

    for (let row = 0; row < 2; row += 1) {
      const shelf = box(4.25, 0.1, 0.3, colors.shelf);
      shelf.position.set(0, 1.08 + row * 0.62, -1.26);
      group.add(shelf);
      for (let i = 0; i < 6; i += 1) {
        const productColor = [colors.primary, colors.accent, 0x2f7d32, 0x3685c8, 0xf1d16b, 0xd64c4c][i];
        const product = box(0.28, 0.42 + (i % 2) * 0.12, 0.24, productColor);
        product.position.set(-1.75 + i * 0.7, 1.38 + row * 0.62, -1.12);
        group.add(product);
      }
    }

    const micBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.58, 0.18, 48),
      new THREE.MeshStandardMaterial({ color: colors.primary, roughness: 0.45 })
    );
    micBase.position.set(0, 0.82, 0.92);
    group.add(micBase);

    const mic = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.48, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35 })
    );
    mic.position.set(0, 1.13, 0.92);
    mic.castShadow = true;
    group.add(mic);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.025, 12, 72),
      new THREE.MeshStandardMaterial({ color: colors.accent, emissive: colors.accent, emissiveIntensity: 0.18 })
    );
    ring.position.set(0, 0.83, 0.92);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    let frame = 0;
    let animationId = 0;
    const animate = () => {
      frame += 0.01;
      group.rotation.y = Math.sin(frame) * 0.08;
      mic.position.y = 1.13 + Math.sin(frame * 3) * 0.035;
      ring.scale.setScalar(1 + Math.sin(frame * 3) * 0.08);
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
}

import * as THREE from 'three';
import { scene, camera, renderer } from './scene.js';

const BUTTON_DEFS = [
  { color: 0xff4455, x: -0.44 },
  { color: 0x44ff99, x:  0    },
  { color: 0x4499ff, x:  0.44 },
];

export const vrMenu = new THREE.Group();
vrMenu.visible = false;

function buildMenu() {
  // Background panel
  vrMenu.add(new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.75),
    new THREE.MeshBasicMaterial({
      color: 0x0d0d44,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  ));

  // Colour buttons
  BUTTON_DEFS.forEach(({ color, x }) => {
    const btn = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.2),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    btn.position.set(x, 0, 0.001);
    vrMenu.add(btn);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────
export function initVRMenu() {
  buildMenu();
  scene.add(vrMenu);

  renderer.xr.addEventListener('sessionstart', () => { vrMenu.visible = true;  });
  renderer.xr.addEventListener('sessionend',   () => { vrMenu.visible = false; });
}

// ── Per-frame update: billboard, always in front of the headset ───────────
export function updateVRMenu() {
  if (!vrMenu.visible) return;

  vrMenu.quaternion.copy(camera.quaternion);

  const forward = new THREE.Vector3(0, 0, -1.6).applyQuaternion(camera.quaternion);
  vrMenu.position.copy(camera.position).add(forward);
  vrMenu.position.y = camera.position.y - 0.15;
}

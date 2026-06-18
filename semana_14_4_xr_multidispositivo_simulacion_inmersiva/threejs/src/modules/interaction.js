import * as THREE from 'three';
import { camera, renderer } from './scene.js';
import { interactiveObjects } from './objects.js';

const raycaster  = new THREE.Raycaster();
const mouseNDC   = new THREE.Vector2();
const mouseDown  = new THREE.Vector2();

const hintEl = /** @type {HTMLElement} */ (document.getElementById('interact-hint'));
let hintTimeout = null;

// Walk up the scene graph to find the owning interactive mesh
function findInteractiveParent(obj) {
  while (obj && !obj.userData?.interactive) obj = obj.parent;
  return obj ?? null;
}

// ── Core interaction ──────────────────────────────────────────────────────
export function interact(obj) {
  if (!obj) return;

  const color = new THREE.Color().setHSL(Math.random(), 0.95, 0.62);
  obj.material.color.set(color);
  obj.material.emissive.set(color);

  if (obj.userData.zone) obj.userData.zone.material.color.set(color);

  obj.userData.clickTimer = 0;
  if (obj.userData.isCentral) obj.material.emissiveIntensity = 1.0;
}

// ── Mouse events ──────────────────────────────────────────────────────────
export function initInteraction() {
  renderer.domElement.addEventListener('mousedown', e => {
    mouseDown.set(e.clientX, e.clientY);
  });

  // Ignore drags – fire only on genuine clicks (< 8 px delta)
  renderer.domElement.addEventListener('mouseup', e => {
    if (Math.hypot(e.clientX - mouseDown.x, e.clientY - mouseDown.y) >= 8) return;

    mouseNDC.set(
      (e.clientX / window.innerWidth)  *  2 - 1,
      (e.clientY / window.innerHeight) * -2 + 1,
    );
    raycaster.setFromCamera(mouseNDC, camera);

    const hits = raycaster.intersectObjects(interactiveObjects, true);
    if (hits.length) interact(findInteractiveParent(hits[0].object));
  });
}

// ── Crosshair hover hint (polled each frame in desktop mode) ──────────────
export function checkHoverHint() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactiveObjects, true);

  if (hits.length) {
    hintEl.style.opacity = '1';
    clearTimeout(hintTimeout);
  } else {
    hintTimeout = setTimeout(() => { hintEl.style.opacity = '0'; }, 200);
  }
}

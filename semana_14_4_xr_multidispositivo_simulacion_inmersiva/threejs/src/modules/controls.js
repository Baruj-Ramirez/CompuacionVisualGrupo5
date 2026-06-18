import * as THREE from 'three';
import { FlyControls }              from 'three/addons/controls/FlyControls.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { scene, camera, renderer }  from './scene.js';
import { interactiveObjects }       from './objects.js';
import { interact }                 from './interaction.js';

let flyControls;

const modeEl = /** @type {HTMLElement} */ (document.getElementById('mode'));

function findInteractiveParent(obj) {
  while (obj && !obj.userData?.interactive) obj = obj.parent;
  return obj ?? null;
}

// ── XR controllers ────────────────────────────────────────────────────────
function initXRControllers() {
  const factory = new XRControllerModelFactory();

  [0, 1].forEach(idx => {
    const ctrl = renderer.xr.getController(idx);

    ctrl.addEventListener('selectstart', () => {
      const rotMatrix = new THREE.Matrix4().identity().extractRotation(ctrl.matrixWorld);
      const ray       = new THREE.Raycaster();
      ray.ray.origin.setFromMatrixPosition(ctrl.matrixWorld);
      ray.ray.direction.set(0, 0, -1).applyMatrix4(rotMatrix);

      const hits = ray.intersectObjects(interactiveObjects, true);
      if (hits.length) interact(findInteractiveParent(hits[0].object));
    });

    scene.add(ctrl);

    const grip = renderer.xr.getControllerGrip(idx);
    grip.add(factory.createControllerModel(grip));
    scene.add(grip);

    // Visual ray line
    ctrl.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0,   0),
        new THREE.Vector3(0, 0, -12),
      ]),
      new THREE.LineBasicMaterial({ color: 0x8899ff, transparent: true, opacity: 0.45 }),
    ));
  });
}

// ── Mode indicator ────────────────────────────────────────────────────────
function bindModeIndicator() {
  renderer.xr.addEventListener('sessionstart', () => {
    modeEl.textContent       = '🥽  VR Mode';
    modeEl.style.color       = '#ff88ff';
    modeEl.style.borderColor = 'rgba(255,136,255,0.35)';
  });
  renderer.xr.addEventListener('sessionend', () => {
    modeEl.textContent       = 'PC Mode';
    modeEl.style.color       = '#44ff88';
    modeEl.style.borderColor = 'rgba(68,255,136,0.3)';
  });
}

// ── Init ──────────────────────────────────────────────────────────────────
export function initControls() {
  flyControls = new FlyControls(camera, renderer.domElement);
  flyControls.movementSpeed = 5;
  flyControls.rollSpeed     = Math.PI / 10;
  flyControls.dragToLook    = true;
  flyControls.autoForward   = false;

  initXRControllers();
  bindModeIndicator();
}

// ── Per-frame update (skipped while in XR session) ─────────────────────
export function updateControls(delta) {
  if (flyControls && !renderer.xr.isPresenting) flyControls.update(delta);
}

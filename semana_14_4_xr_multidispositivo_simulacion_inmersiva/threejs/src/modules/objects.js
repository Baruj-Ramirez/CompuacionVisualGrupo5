import * as THREE from 'three';
import { scene } from './scene.js';

// ── Palettes ──────────────────────────────────────────────────────────────
const GEOMETRIES = [
  new THREE.BoxGeometry(1.2, 1.2, 1.2),
  new THREE.SphereGeometry(0.72, 36, 36),
  new THREE.TorusGeometry(0.62, 0.26, 18, 100),
  new THREE.ConeGeometry(0.7, 1.5, 36),
  new THREE.OctahedronGeometry(0.85),
  new THREE.DodecahedronGeometry(0.72),
  new THREE.IcosahedronGeometry(0.72),
  new THREE.TetrahedronGeometry(0.85),
];

const PALETTE = [
  0xff4455, 0x44ff99, 0x4499ff, 0xffcc44,
  0xff44cc, 0x44ffff, 0xff9944, 0x99ff44,
];

const RING_COLORS = [0x4455ff, 0x44aaff, 0x44ffee];
const RING_RADII  = [2.8, 3.5, 4.2];
const ORBIT_DIST  = 9;

// ── Exported state ────────────────────────────────────────────────────────
export const interactiveObjects = [];
export let centralObj;

// ── Helpers ───────────────────────────────────────────────────────────────
function buildZoneCircle(position, color) {
  const zone = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 48),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    }),
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set(position.x, 0.02, position.z);
  return zone;
}

function buildRingObject(geo, color, index) {
  const angle = (index / GEOMETRIES.length) * Math.PI * 2;
  const mesh  = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      metalness: 0.45,
      roughness: 0.28,
      emissive:  color,
      emissiveIntensity: 0.12,
    }),
  );
  mesh.position.set(
    Math.cos(angle) * ORBIT_DIST,
    1.6,
    Math.sin(angle) * ORBIT_DIST,
  );
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    interactive:   true,
    originalColor: new THREE.Color(color),
    baseY:         1.6,
    floatOffset:   index * 0.9,
    clickTimer:    -1,
  };

  const zone = buildZoneCircle(mesh.position, color);
  scene.add(zone);
  mesh.userData.zone = zone;
  return mesh;
}

function buildCentralGem() {
  const gem = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.0, 2),
    new THREE.MeshStandardMaterial({
      color:    0xffffff,
      metalness: 0.92,
      roughness: 0.04,
      emissive:  0x3344dd,
      emissiveIntensity: 0.45,
    }),
  );
  gem.position.set(0, 3.2, 0);
  gem.castShadow = true;
  gem.userData   = {
    interactive: true,
    isCentral:   true,
    baseY:       3.2,
    floatOffset: 0,
    clickTimer:  -1,
  };

  // Wireframe shell
  gem.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.08, 2),
    new THREE.MeshBasicMaterial({
      color: 0x6677ff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    }),
  ));

  // Orbit rings
  RING_RADII.forEach((r, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.04, 8, 80),
      new THREE.MeshBasicMaterial({
        color: RING_COLORS[i],
        transparent: true,
        opacity: 0.55,
      }),
    );
    ring.userData.ringIdx = i;
    gem.add(ring);
  });

  return gem;
}

// ── Init ──────────────────────────────────────────────────────────────────
export function initObjects() {
  GEOMETRIES.forEach((geo, i) => {
    const mesh = buildRingObject(geo, PALETTE[i], i);
    scene.add(mesh);
    interactiveObjects.push(mesh);
  });

  centralObj = buildCentralGem();
  scene.add(centralObj);
  interactiveObjects.push(centralObj);
}

// ── Per-frame updates ─────────────────────────────────────────────────────
export function updateObjects(t, delta, camera) {
  _updateRingObjects(t, delta, camera);
  _updateCentralGem(t, delta);
}

function _updateRingObjects(t, delta, camera) {
  interactiveObjects.slice(0, GEOMETRIES.length).forEach(obj => {
    obj.position.y = obj.userData.baseY + Math.sin(t + obj.userData.floatOffset) * 0.28;

    if (obj.userData.clickTimer >= 0) {
      obj.userData.clickTimer += delta;
      const a = obj.userData.clickTimer;
      obj.scale.setScalar(1 + Math.sin(a * Math.PI * 4) * 0.32 * Math.exp(-a * 2.5));
      obj.material.emissiveIntensity = 0.5 + Math.sin(a * Math.PI * 8) * 0.4;
      if (a > 1.6) {
        obj.userData.clickTimer = -1;
        obj.scale.setScalar(1);
        obj.material.emissiveIntensity = 0.12;
      }
      return;
    }

    obj.rotation.x += delta * 0.45;
    obj.rotation.y += delta * 0.75;

    const near  = camera.position.distanceTo(obj.position) < 3.8;
    const tEmit = near ? 0.65 : 0.12;
    const tOpac = near ? 0.55 : 0.12;
    obj.material.emissiveIntensity =
      THREE.MathUtils.lerp(obj.material.emissiveIntensity, tEmit, delta * 5);
    obj.userData.zone.material.opacity =
      THREE.MathUtils.lerp(obj.userData.zone.material.opacity, tOpac, delta * 5);
  });
}

function _updateCentralGem(t, delta) {
  centralObj.rotation.y += delta * 0.35;
  centralObj.rotation.x += delta * 0.18;
  centralObj.position.y  = centralObj.userData.baseY + Math.sin(t * 0.45) * 0.55;

  centralObj.children.forEach(child => {
    if (child.userData.ringIdx !== undefined) {
      const ri = child.userData.ringIdx;
      child.rotation.x = t * (0.30 + ri * 0.18);
      child.rotation.z = t * (0.22 + ri * 0.13);
    }
  });

  if (centralObj.userData.clickTimer >= 0) {
    centralObj.userData.clickTimer += delta;
    const a = centralObj.userData.clickTimer;
    centralObj.rotation.y += delta * 6;
    centralObj.material.emissive.setHSL((t * 0.4 + a * 0.3) % 1, 1, 0.6);
    centralObj.material.emissiveIntensity = 0.9 + Math.sin(a * 12) * 0.1;
    if (a > 2.2) {
      centralObj.userData.clickTimer = -1;
      centralObj.material.emissiveIntensity = 0.45;
    }
  }
}

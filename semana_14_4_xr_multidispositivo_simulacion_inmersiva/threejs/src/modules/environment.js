import * as THREE from 'three';
import { scene } from './scene.js';

const N_STARS = 4000;

function buildStarfield() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N_STARS * 3);
  for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - 0.5) * 500;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.25,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
    }),
  );
}

function buildFloor() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 60, 60),
    new THREE.MeshStandardMaterial({ color: 0x0d0d2a, metalness: 0.15, roughness: 0.9 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  return mesh;
}

function buildGrid() {
  const grid = new THREE.GridHelper(100, 80, 0x2222aa, 0x111155);
  grid.material.transparent = true;
  grid.material.opacity     = 0.55;
  return grid;
}

function buildNebula() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(280, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x110033,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    }),
  );
}

export function initEnvironment() {
  scene.add(buildStarfield());
  scene.add(buildFloor());
  scene.add(buildGrid());
  scene.add(buildNebula());
}

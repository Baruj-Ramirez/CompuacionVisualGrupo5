import * as THREE from 'three';
import { scene } from './scene.js';

const ORBIT_COLORS = [0xff4455, 0x44ffaa, 0x4488ff, 0xffcc44, 0xff44cc];

export const orbitLights = [];

function buildSun() {
  const sun = new THREE.DirectionalLight(0x7788ff, 1.6);
  sun.position.set(12, 22, 10);
  sun.castShadow              = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near      = 0.5;
  sun.shadow.camera.far       = 120;
  sun.shadow.camera.left      = -30;
  sun.shadow.camera.right     =  30;
  sun.shadow.camera.top       =  30;
  sun.shadow.camera.bottom    = -30;
  return sun;
}

export function initLighting() {
  scene.add(new THREE.AmbientLight(0x111133, 0.7));
  scene.add(new THREE.HemisphereLight(0x222266, 0x001122, 0.6));
  scene.add(buildSun());

  ORBIT_COLORS.forEach((color, i) => {
    const light = new THREE.PointLight(color, 3, 22);
    light.userData = {
      angle:  (i / ORBIT_COLORS.length) * Math.PI * 2,
      radius: 9 + (i % 2) * 3,
      speed:  0.28 + i * 0.07,
      height: 3.5 + (i % 3) * 0.8,
    };
    scene.add(light);
    orbitLights.push(light);
  });
}

export function updateLighting(delta) {
  orbitLights.forEach(light => {
    light.userData.angle += delta * light.userData.speed;
    const { angle, radius, height } = light.userData;
    light.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius,
    );
  });
}

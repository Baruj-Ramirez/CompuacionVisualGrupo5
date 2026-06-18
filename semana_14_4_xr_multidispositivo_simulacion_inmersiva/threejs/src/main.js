// webxr-polyfill must be imported and instantiated before any other module
// touches navigator.xr — it patches the API on browsers without native WebXR.
import WebXRPolyfill from 'webxr-polyfill';
new WebXRPolyfill();

import './style.css';

import * as THREE from 'three';
import { scene, camera, renderer }        from './modules/scene.js';
import { createVRButton }                 from './modules/vrButton.js';
import { initEnvironment }                from './modules/environment.js';
import { initLighting,   updateLighting } from './modules/lighting.js';
import { initObjects,    updateObjects  } from './modules/objects.js';
import { initControls,   updateControls } from './modules/controls.js';
import { initInteraction, checkHoverHint } from './modules/interaction.js';
import { initVRMenu,     updateVRMenu   } from './modules/vrMenu.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────
createVRButton();   // async state check; appends button immediately with correct message
initEnvironment();
initLighting();
initObjects();
initControls();
initInteraction();
initVRMenu();

// ── Render loop ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();

renderer.setAnimationLoop(time => {
  const t     = time * 0.001;
  const delta = clock.getDelta();

  updateControls(delta);
  updateLighting(delta);
  updateObjects(t, delta, camera);
  updateVRMenu();

  if (!renderer.xr.isPresenting) checkHoverHint();

  renderer.render(scene, camera);
});

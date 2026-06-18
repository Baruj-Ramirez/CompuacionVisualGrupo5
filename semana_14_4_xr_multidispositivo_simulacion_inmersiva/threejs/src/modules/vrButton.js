import { renderer } from './scene.js';

// ── Button state definitions ───────────────────────────────────────────────
const STATE = {
  enter: {
    text:     'ENTER VR',
    title:    'Click to enter immersive VR mode',
    disabled: false,
    css: {
      background:  'rgba(10, 10, 50, 0.9)',
      color:       '#9999ff',
      border:      '1px solid #4444aa',
      cursor:      'pointer',
      opacity:     '0.85',
    },
  },
  exit: {
    text:     'EXIT VR',
    title:    'Click to leave VR mode',
    disabled: false,
    css: {
      background:  'rgba(50, 10, 50, 0.9)',
      color:       '#ff99ff',
      border:      '1px solid #aa44aa',
      cursor:      'pointer',
      opacity:     '0.9',
    },
  },
  // Friendlier than Three.js's hard "VR NOT SUPPORTED"
  unavailable: {
    title:    'No WebXR VR device detected. Connect a compatible headset to enable VR. The scene is fully explorable in PC mode with WASD + mouse.',
    disabled: true,
    css: {
      background:  'rgba(10, 8, 20, 0.6)',
      color:       '#665577',
      border:      '1px solid #332244',
      cursor:      'default',
      opacity:     '0.5',
    },
  },
};

// ── DOM helpers ───────────────────────────────────────────────────────────
function applyBaseStyles(el) {
  Object.assign(el.style, {
    position:      'fixed',
    bottom:        '28px',
    left:          '50%',
    transform:     'translateX(-50%)',
    padding:       '10px 28px',
    fontSize:      '13px',
    fontFamily:    'Segoe UI, sans-serif',
    letterSpacing: '0.5px',
    borderRadius:  '8px',
    zIndex:        '999',
    transition:    'opacity 0.3s, border-color 0.3s',
  });
}

function applyState(btn, key, customText) {
  const s = STATE[key];
  btn.textContent = customText ?? s.text;
  btn.title       = s.title;
  btn.disabled    = s.disabled;
  Object.assign(btn.style, s.css);
}

// ── Session management ────────────────────────────────────────────────────
let currentSession = null;

function bindSession(btn) {
  btn.onclick = async () => {
    if (currentSession) {
      currentSession.end();
      return;
    }
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
      });
      await renderer.xr.setSession(session);
      currentSession = session;
      applyState(btn, 'exit');

      session.addEventListener('end', () => {
        currentSession = null;
        applyState(btn, 'enter');
        bindSession(btn);
      }, { once: true });
    } catch (err) {
      console.warn('[VRButton] Could not start XR session:', err);
    }
  };
}

// ── Public factory ────────────────────────────────────────────────────────
export function createVRButton() {
  const btn = document.createElement('button');
  applyBaseStyles(btn);
  document.body.appendChild(btn);

  // navigator.xr may be missing entirely (non-HTTPS or unsupported browser)
  if (!('xr' in navigator)) {
    applyState(btn, 'unavailable', 'WebXR Not Available · PC Mode');
    return btn;
  }

  navigator.xr
    .isSessionSupported('immersive-vr')
    .then(supported => {
      if (supported) {
        applyState(btn, 'enter');
        bindSession(btn);
      } else {
        // Desktop without a headset — clear, non-alarming message
        applyState(btn, 'unavailable', 'No VR Device · PC Mode Active');
      }
    })
    .catch(err => {
      console.warn('[VRButton] isSessionSupported error:', err);
      applyState(btn, 'unavailable', 'VR Not Allowed · PC Mode');
    });

  return btn;
}

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ─── GLSL SHADERS ────────────────────────────────────────────────────────────

const vertexShader = /* glsl */ `
  uniform float time;
  uniform vec2  resolution;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vWorldPosition;
  varying vec3  vViewDirection;

  // ── Simplex-like hash ──
  vec3 mod289(vec3 x){ return x - floor(x*(1./289.))*289.; }
  vec4 mod289(vec4 x){ return x - floor(x*(1./289.))*289.; }
  vec4 permute(vec4 x){ return mod289(((x*34.)+1.)*x); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - .85373472095314*r; }

  float snoise(vec3 v){
    const vec2  C = vec2(1./6., 1./3.);
    const vec4  D = vec4(0., .5, 1., 2.);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g  = step(x0.yzx, x0.xyz);
    vec3 l  = 1. - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.,i1.z,i2.z,1.)) +
      i.y + vec4(0.,i1.y,i2.y,1.)) +
      i.x + vec4(0.,i1.x,i2.x,1.));
    float n_ = .142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j  = p - 49.*floor(p*ns.z*ns.z);
    vec4 x_ = floor(j*ns.z);
    vec4 y_ = floor(j - 7.*x_);
    vec4 x  = x_*ns.x + ns.yyyy;
    vec4 y  = y_*ns.x + ns.yyyy;
    vec4 h  = 1. - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.+1.;
    vec4 s1 = floor(b1)*2.+1.;
    vec4 sh = -step(h, vec4(0.));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.);
    m = m*m;
    return 42.*dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main(){
    vUv    = uv;
    vNormal = normalize(normalMatrix * normal);

    // ── Procedural displacement with layered noise ──
    vec3 pos   = position;
    float noise = snoise(pos * 1.8 + vec3(0., 0., time * 0.4)) * 0.18
                + snoise(pos * 3.5 + vec3(time * 0.3, 0., 0.)) * 0.07;
    pos += normal * noise;

    // ── Classic wave deformation ──
    pos.z += sin(pos.x * 5.0 + time) * 0.06;
    pos.y += cos(pos.z * 4.0 + time * 0.7) * 0.04;

    vec4 worldPos  = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    vViewDirection = normalize(cameraPosition - worldPos.xyz);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float time;
  uniform vec2  resolution;
  uniform vec3  rimColor;
  uniform vec3  fresnelColor;
  uniform float fresnelPower;
  uniform float rimPower;

  varying vec2  vUv;
  varying vec3  vNormal;
  varying vec3  vWorldPosition;
  varying vec3  vViewDirection;

  // ── FBM noise (fragment) ──
  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float noise2(vec2 p){
    vec2 i=floor(p), f=fract(p);
    f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p){
    float v=0.,a=.5;
    for(int i=0;i<5;i++){ v+=a*noise2(p); p*=2.1; a*=.5; }
    return v;
  }

  void main(){
    vec3 N  = normalize(vNormal);
    vec3 V  = normalize(vViewDirection);

    // ── 1. Base UV color animated ──
    vec2 animUv = vUv + vec2(sin(time*.3)*.05, cos(time*.2)*.05);
    vec3 baseColor = vec3(
      .5 + .5*sin(animUv.x*6.28 + time),
      .5 + .5*cos(animUv.y*6.28 + time*.7),
      .7
    );

    // ── 2. Procedural noise overlay ──
    float n = fbm(vUv * 4. + vec2(time*.15, time*.1));
    baseColor = mix(baseColor, baseColor * vec3(.4,.7,1.), n * .5);

    // ── 3. Diffuse (N·L) ──
    vec3 light = normalize(vec3(1., 1.5, 2.));
    float diff = dot(N, light) * .5 + .5;
    baseColor *= diff;

    // ── 4. Fresnel effect ──
    float fresnel = pow(1.0 - clamp(dot(N, V), 0., 1.), fresnelPower);
    baseColor += fresnelColor * fresnel * 1.2;

    // ── 5. Rim lighting ──
    vec3 rimDir = normalize(vec3(-1., .5, -1.));
    float rim = pow(1.0 - clamp(dot(N, V), 0., 1.), rimPower);
    rim *= max(0., dot(N, rimDir));
    baseColor += rimColor * rim * 2.5;

    // ── 6. Specular highlight ──
    vec3 H   = normalize(light + V);
    float spec = pow(max(dot(N, H), 0.), 64.);
    baseColor += vec3(1.) * spec * .6;

    // ── 7. Pulsing emission glow ──
    float pulse = .5 + .5*sin(time * 2.1);
    baseColor += fresnelColor * fresnel * pulse * .3;

    // ── 8. Vignette from UV ──
    vec2 uvC = vUv - .5;
    float vign = 1. - dot(uvC, uvC) * 1.5;
    baseColor *= clamp(vign, 0., 1.);

    gl_FragColor = vec4(baseColor, 1.0);
  }
`;

// ─── POST-PROCESSING SHADERS ──────────────────────────────────────────────────

const postVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position, 1.0); }
`;

const postFragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float     time;
  uniform vec2      resolution;
  varying vec2      vUv;

  // ── Chromatic aberration ──
  vec3 chromaticAberration(sampler2D tex, vec2 uv, float amount){
    vec2 dir = (uv - .5) * amount;
    float r = texture2D(tex, uv + dir * 1.0).r;
    float g = texture2D(tex, uv).g;
    float b = texture2D(tex, uv - dir * 1.0).b;
    return vec3(r, g, b);
  }

  // ── CRT scanlines ──
  float scanline(vec2 uv, float count){
    return .97 + .03*sin(uv.y * count);
  }

  // ── Vignette ──
  float vignette(vec2 uv, float strength){
    vec2 d = uv - .5;
    return 1. - dot(d, d) * strength;
  }

  void main(){
    // ── Subtle screen wobble ──
    vec2 uv = vUv;
    uv.x += sin(uv.y * 80. + time * 2.) * 0.0005;

    // ── Chromatic aberration ──
    vec3 col = chromaticAberration(tDiffuse, uv, 0.006);

    // ── Bloom approximation (simple blur) ──
    vec2 px = 1. / resolution;
    vec3 bloom = vec3(0.);
    for(int x=-2;x<=2;x++) for(int y=-2;y<=2;y++){
      bloom += texture2D(tDiffuse, uv + vec2(x,y)*px*2.).rgb;
    }
    bloom /= 25.;
    float lum = dot(bloom, vec3(.2126,.7152,.0722));
    col += bloom * max(0., lum - .6) * 1.4;

    // ── Scanlines ──
    col *= scanline(uv, resolution.y * .5);

    // ── Vignette ──
    col *= vignette(uv, 1.2);

    // ── Tone-map / gamma ──
    col = col / (col + .8);
    col = pow(col, vec3(.45));

    gl_FragColor = vec4(col, 1.0);
  }
`;

// ─── CONTROLS PANEL ──────────────────────────────────────────────────────────

function ControlPanel({ uniforms, setUniforms }) {
  const Row = ({ label, children }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
      <span style={{ width: 130, fontSize: 11, color: "#aac", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </span>
      {children}
    </div>
  );

  const slider = (key, min, max, step = 0.01) => (
    <input
      type="range" min={min} max={max} step={step}
      value={uniforms[key]}
      onChange={e => setUniforms(u => ({ ...u, [key]: parseFloat(e.target.value) }))}
      style={{ accentColor: "#6ef", width: 120 }}
    />
  );

  return (
    <div style={{
      position: "absolute", top: 20, right: 20, zIndex: 10,
      background: "rgba(0,0,8,.82)", border: "1px solid #2a4060",
      borderRadius: 10, padding: "16px 20px", backdropFilter: "blur(12px)",
      boxShadow: "0 0 30px #0af3",
      color: "#cde",
    }}>
      <div style={{ fontSize: 10, letterSpacing: 3, color: "#6ef", marginBottom: 14, fontFamily: "monospace" }}>
        ◈ SHADER CONTROLS
      </div>
      <Row label="Fresnel Power">{slider("fresnelPower", 0.5, 8)}<span style={{ fontSize: 10, color: "#6ef", marginLeft: 6 }}>{uniforms.fresnelPower.toFixed(1)}</span></Row>
      <Row label="Rim Power">{slider("rimPower", 0.5, 8)}<span style={{ fontSize: 10, color: "#6ef", marginLeft: 6 }}>{uniforms.rimPower.toFixed(1)}</span></Row>
      <Row label="Speed">{slider("speed", 0.1, 5, 0.05)}<span style={{ fontSize: 10, color: "#6ef", marginLeft: 6 }}>{uniforms.speed.toFixed(2)}</span></Row>
      <Row label="Mesh Type">
        {["sphere", "torus", "torusknot"].map(m => (
          <button key={m} onClick={() => setUniforms(u => ({ ...u, mesh: m }))}
            style={{
              background: uniforms.mesh === m ? "#0af4" : "transparent",
              border: "1px solid #2a4060", borderRadius: 4, color: "#cde",
              fontSize: 9, padding: "3px 7px", cursor: "pointer", marginRight: 3,
              fontFamily: "monospace", letterSpacing: 1,
            }}>{m}</button>
        ))}
      </Row>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ShaderScene() {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const [uniforms, setUniforms] = useState({
    fresnelPower: 2.5,
    rimPower: 3.0,
    speed: 1.0,
    mesh: "torusknot",
  });
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;

  useEffect(() => {
    const el = mountRef.current;
    const W = el.clientWidth, H = el.clientHeight;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    // ── Scene / Camera ──
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    // ── Render Target for post-processing ──
    const rt = new THREE.WebGLRenderTarget(W, H, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
    });

    // ── Post-processing quad ──
    const postUniforms = {
      tDiffuse:   { value: rt.texture },
      time:       { value: 0 },
      resolution: { value: new THREE.Vector2(W, H) },
    };
    const postMat  = new THREE.ShaderMaterial({ vertexShader: postVertexShader, fragmentShader: postFragmentShader, uniforms: postUniforms });
    const postMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat);
    const postScene = new THREE.Scene();
    const postCam   = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene.add(postMesh);

    // ── Main ShaderMaterial uniforms ──
    const shaderUniforms = {
      time:         { value: 0 },
      resolution:   { value: new THREE.Vector2(W, H) },
      fresnelColor: { value: new THREE.Color(0x00aaff) },
      rimColor:     { value: new THREE.Color(0xff6600) },
      fresnelPower: { value: 2.5 },
      rimPower:     { value: 3.0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: shaderUniforms,
      side: THREE.DoubleSide,
    });

    // ── Geometry ──
    const geometries = {
      sphere:    new THREE.SphereGeometry(1.4, 128, 128),
      torus:     new THREE.TorusGeometry(1.1, 0.45, 128, 200),
      torusknot: new THREE.TorusKnotGeometry(0.9, 0.32, 300, 60),
    };

    let mesh = new THREE.Mesh(geometries[uniforms.mesh], material);
    scene.add(mesh);

    // ── Particles (background) ──
    const pCount = 1200;
    const pPos   = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - .5) * 18;
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x2255aa, size: 0.025, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(pGeo, pMat));

    // ── Resize ──
    const onResize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      renderer.setSize(w, h);
      rt.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      shaderUniforms.resolution.value.set(w, h);
      postUniforms.resolution.value.set(w, h);
    };
    window.addEventListener("resize", onResize);

    // ── Mouse rotation ──
    let mx = 0, my = 0;
    const onMouse = e => {
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width  - .5) * 2;
      my = ((e.clientY - r.top)  / r.height - .5) * 2;
    };
    el.addEventListener("mousemove", onMouse);

    // ── Animation loop ──
    let animId, prevMesh = uniforms.mesh;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t   = clock.getElapsedTime() * uniformsRef.current.speed;
      const cur = uniformsRef.current;

      // swap mesh if type changed
      if (cur.mesh !== prevMesh) {
        scene.remove(mesh);
        mesh = new THREE.Mesh(geometries[cur.mesh], material);
        scene.add(mesh);
        prevMesh = cur.mesh;
      }

      shaderUniforms.time.value         = t;
      shaderUniforms.fresnelPower.value = cur.fresnelPower;
      shaderUniforms.rimPower.value     = cur.rimPower;
      postUniforms.time.value           = t;

      mesh.rotation.y = t * 0.22 + mx * 0.4;
      mesh.rotation.x = Math.sin(t * 0.15) * 0.3 + my * 0.2;

      // render to RT → post-process → screen
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(postScene, postCam);
    };
    animate();

    stateRef.current = { renderer, rt };

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      el.removeEventListener("mousemove", onMouse);
      renderer.dispose();
      rt.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#000508", position: "relative", overflow: "hidden" }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 22, left: 24, zIndex: 10,
        fontFamily: "monospace", letterSpacing: 3, fontSize: 11,
        color: "#4af", textShadow: "0 0 16px #0af",
        userSelect: "none",
      }}>
        ◈ THREE.JS · GLSL SHADER LAB
        <div style={{ fontSize: 9, color: "#446", marginTop: 3, letterSpacing: 2 }}>
          FRESNEL · RIM LIGHT · PROCEDURAL NOISE · POST-FX
        </div>
      </div>

      {/* Shader legend */}
      <div style={{
        position: "absolute", bottom: 20, left: 24, zIndex: 10,
        fontFamily: "monospace", fontSize: 9, color: "#446",
        letterSpacing: 1, lineHeight: 1.8,
      }}>
        {["vertex: wave deform + simplex noise displacement",
          "fragment: fresnel + rim lighting + fbm noise + specular",
          "post: chromatic aberration + bloom + scanlines + vignette"
        ].map((l, i) => <div key={i}>› {l}</div>)}
      </div>

      {/* Canvas mount */}
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {/* Controls */}
      <ControlPanel uniforms={uniforms} setUniforms={setUniforms} />
    </div>
  );
}
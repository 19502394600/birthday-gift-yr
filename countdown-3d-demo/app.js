import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const embeddedMode = new URLSearchParams(window.location.search).get("embedded") === "1";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ua = navigator.userAgent || "";
const platform = navigator.platform || "";
const maxTouchPoints = navigator.maxTouchPoints || 0;
const isIOS = /iPad|iPhone|iPod/i.test(ua) || (platform === "MacIntel" && maxTouchPoints > 1);
const isAppleDesktop = /Macintosh|Mac OS X/i.test(ua) && !isIOS;
const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
const appleDesktopRendering = isAppleDesktop && isSafari;
const hardwareConcurrency = Number(navigator.hardwareConcurrency || 0);
const compactRendering = reducedMotion || isIOS || (!appleDesktopRendering && hardwareConcurrency > 0 && hardwareConcurrency <= 4);
const usePostProcessing = !isIOS && !reducedMotion;
const iosFrameInterval = 1000 / 30;

if (isIOS) document.documentElement.classList.add("ios-performance", "apple-device");
else if (isAppleDesktop) document.documentElement.classList.add("apple-device", "apple-desktop");

const dom = {
  experience: document.getElementById("experience"),
  sceneRoot: document.getElementById("sceneRoot"),
  loadingScreen: document.getElementById("loadingScreen"),
  opening: document.getElementById("opening"),
  startButton: document.getElementById("startButton"),
  countdownHud: document.getElementById("countdownHud"),
  readyLine: document.getElementById("readyLine"),
  phaseLine: document.getElementById("phaseLine"),
  finishPanel: document.getElementById("finishPanel"),
  soundToggle: document.getElementById("soundToggle"),
  soundLabel: document.getElementById("soundLabel"),
  liveCountdown: document.getElementById("liveCountdown"),
  countdownAudio: document.getElementById("countdownAudio"),
  webglFallback: document.getElementById("webglFallback"),
};

const sequence = [
  { type: "ready", text: "你准备好了吗？", duration: 1900 },
  { type: "number", text: "5", duration: 1550 },
  { type: "number", text: "4", duration: 1550 },
  { type: "number", text: "3", duration: 1550 },
  { type: "number", text: "2", duration: 1550 },
  { type: "number", text: "1", duration: 1850, climax: true },
  { type: "final", text: "生日快乐", duration: 2800 },
];

const experienceState = {
  mode: "idle",
  sequenceIndex: 0,
  phaseStartedAt: 0,
  phaseTimer: null,
  muted: false,
  disposed: false,
  dragging: false,
  dragStartX: 0,
  dragStartRotation: 0,
  dragRotation: 0,
  pointerX: 0,
  pointerY: 0,
  cakeTargetX: 1.7,
  cakeReveal: 0,
  cameraTargetZ: window.innerWidth < 700 ? 11.6 : 9.2,
  audioFadeRaf: 0,
  resizeTimer: null,
};

let renderer;
let composer;
let scene;
let camera;
let cake;
let stars;
let crystalField;
let numberSprite;
let numberMaterial;
let numberTexture;
let numberCanvas;
let numberContext;
let keyLight;
let rimLight;
let flameLight;
let halo;
let flames = [];
let animationClock;
let lastRenderAt = 0;

const reusable = {
  geometries: [],
  materials: [],
  textures: [],
};

function registerGeometry(geometry) {
  reusable.geometries.push(geometry);
  return geometry;
}

function registerMaterial(material) {
  reusable.materials.push(material);
  return material;
}

function registerTexture(texture) {
  reusable.textures.push(texture);
  return texture;
}

function createCrystalSurface(options) {
  if (!isIOS) return new THREE.MeshPhysicalMaterial(options);

  const {
    transmission: _transmission,
    thickness: _thickness,
    ior: _ior,
    clearcoat: _clearcoat,
    clearcoatRoughness: _clearcoatRoughness,
    ...fallback
  } = options;

  return new THREE.MeshStandardMaterial({
    ...fallback,
    metalness: Math.min(0.38, (fallback.metalness || 0) + 0.08),
    roughness: Math.max(0.2, fallback.roughness || 0),
    opacity: Math.min(0.9, fallback.opacity === undefined ? 1 : fallback.opacity),
  });
}

function init() {
  try {
    createRenderer();
  } catch (_error) {
    showWebglFallback();
    return;
  }

  createScene();
  createLights();
  createEnvironment();
  createCake();
  createCountdownSprite();
  warmGpuPrograms();
  bindEvents();
  onResize();

  if (embeddedMode) {
    dom.experience.classList.add("is-embedded");
    experienceState.muted = true;
  }

  renderScene();
  animationClock = new THREE.Clock();
  if (!embeddedMode) renderer.setAnimationLoop(renderFrame);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      dom.experience.classList.remove("is-loading");
      dom.experience.classList.add("is-ready");
      if (embeddedMode) window.parent.postMessage({ type: "birthday-countdown:ready" }, window.location.origin);
    });
  });
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer({
    antialias: !embeddedMode && !compactRendering,
    alpha: false,
    powerPreference: isIOS ? "default" : "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getPixelRatioLimit(window.innerWidth)));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.84;
  renderer.shadowMap.enabled = !embeddedMode;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x020611, 1);
  dom.sceneRoot.appendChild(renderer.domElement);
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020611);
  scene.fog = new THREE.FogExp2(0x020611, 0.055);

  camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 1.55, experienceState.cameraTargetZ);
  camera.lookAt(0, 0.2, 0);

  if (!usePostProcessing) return;

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomScale = getBloomResolutionScale(window.innerWidth);
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth * bloomScale, window.innerHeight * bloomScale), getBloomBaseStrength(), 0.44, 0.54);
  bloom.threshold = 0.52;
  bloom.strength = getBloomBaseStrength();
  bloom.radius = appleDesktopRendering ? 0.42 : 0.48;
  composer.addPass(bloom);
  composer.bloomPass = bloom;
}

function createLights() {
  const hemisphere = new THREE.HemisphereLight(0xc8ddff, 0x14071d, 1.15);
  scene.add(hemisphere);

  keyLight = new THREE.SpotLight(0x82b7ff, 42, 24, Math.PI * 0.22, 0.48, 1.2);
  keyLight.position.set(4.5, 7, 5.5);
  keyLight.target.position.set(0, 0.2, 0);
  keyLight.castShadow = !embeddedMode;
  keyLight.shadow.mapSize.set(embeddedMode ? 512 : 1024, embeddedMode ? 512 : 1024);
  scene.add(keyLight, keyLight.target);

  rimLight = new THREE.SpotLight(0xa68cff, 30, 22, Math.PI * 0.28, 0.55, 1.1);
  rimLight.position.set(-5, 4, -2);
  rimLight.target.position.set(0, 0.4, 0);
  scene.add(rimLight, rimLight.target);

  const roseLight = new THREE.PointLight(0xff8fab, 10, 12, 1.7);
  roseLight.position.set(0.8, -0.2, 4.2);
  scene.add(roseLight);

  flameLight = new THREE.PointLight(0xffeefa, 7.4, 7.4, 1.55);
  flameLight.position.set(0.42, 1.76, 1.05);
  scene.add(flameLight);
}

function createEnvironment() {
  const glowTexture = registerTexture(createGlowTexture());

  const haloMaterial = registerMaterial(new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0x7b8cff,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  halo = new THREE.Sprite(haloMaterial);
  halo.position.set(0, 0.35, -2.4);
  halo.scale.set(10, 10, 1);
  scene.add(halo);

  const floorMaterial = registerMaterial(createCrystalSurface({
    color: 0x08182a,
    roughness: 0.18,
    metalness: 0.55,
    transmission: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transparent: true,
    opacity: 0.88,
  }));
  const floor = new THREE.Mesh(registerGeometry(new THREE.CircleGeometry(8.5, isIOS ? 48 : embeddedMode ? 64 : 96)), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.55;
  floor.receiveShadow = true;
  scene.add(floor);

  const ringMaterial = registerMaterial(new THREE.MeshBasicMaterial({
    color: 0x8ea8ff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
  }));
  const floorRing = new THREE.Mesh(registerGeometry(new THREE.TorusGeometry(4.6, 0.016, 8, isIOS ? 72 : embeddedMode ? 96 : 160)), ringMaterial);
  floorRing.rotation.x = Math.PI / 2;
  floorRing.position.y = -1.5;
  scene.add(floorRing);

  stars = createStarField(glowTexture);
  scene.add(stars);

  crystalField = createCrystalField();
  scene.add(crystalField);
}

function createStarField(texture) {
  const count = embeddedMode
    ? (window.innerWidth < 720 ? (isIOS ? 96 : 140) : (appleDesktopRendering ? 220 : compactRendering ? 220 : 300))
    : (window.innerWidth < 720 ? 280 : (compactRendering ? 460 : 620));
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cyan = new THREE.Color(0xb2d7ff);
  const violet = new THREE.Color(0xb7a7ff);

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3;
    let x = THREE.MathUtils.randFloatSpread(18);
    let y = THREE.MathUtils.randFloat(-3.2, 6.2);
    let z = THREE.MathUtils.randFloat(-7, 3.5);

    if (Math.abs(x) < 2.55 && y > -1.35 && y < 2.85 && z > -2.9) {
      const side = Math.random() < 0.5 ? -1 : 1;
      x = side * THREE.MathUtils.randFloat(2.9, 8.8);
      y = THREE.MathUtils.randFloat(-2.8, 5.7);
      z = THREE.MathUtils.randFloat(-6.8, -3.2);
    }

    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    const color = index % 5 === 0 ? violet : cyan;
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  const geometry = registerGeometry(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = registerMaterial(new THREE.PointsMaterial({
    size: 0.075,
    map: texture,
    vertexColors: true,
    transparent: true,
    opacity: 0.54,
    alphaTest: 0.02,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }));
  return new THREE.Points(geometry, material);
}

function createCrystalField() {
  const group = new THREE.Group();
  const count = embeddedMode ? (window.innerWidth < 720 ? (isIOS ? 5 : 6) : 10) : (window.innerWidth < 720 ? 10 : 18);
  const geometry = registerGeometry(new THREE.OctahedronGeometry(0.32, 0));
  const material = registerMaterial(createCrystalSurface({
    color: 0x9fc7ff,
    emissive: 0x0b2858,
    emissiveIntensity: 0.28,
    metalness: 0.1,
    roughness: 0.08,
    transmission: 0.68,
    thickness: 0.9,
    ior: 1.46,
    clearcoat: 1,
    transparent: true,
    opacity: 0.82,
  }));
  const crystals = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 3.4 + (index % 4) * 0.42;
    const heightScale = 0.55 + (index % 5) * 0.14;
    dummy.position.set(Math.cos(angle) * radius, -1.25 + heightScale * 0.2, Math.sin(angle) * radius - 0.8);
    dummy.rotation.set(angle * 0.13, -angle, angle * 0.08);
    dummy.scale.set(0.7, heightScale * 2.2, 0.7);
    dummy.updateMatrix();
    crystals.setMatrixAt(index, dummy.matrix);
  }

  crystals.instanceMatrix.needsUpdate = true;
  group.add(crystals);
  group.position.y = -0.1;
  return group;
}

function createCake() {
  cake = new THREE.Group();
  cake.position.set(experienceState.cakeTargetX, -1.04, 0);
  cake.visible = false;
  cake.scale.setScalar(0.62);
  scene.add(cake);

  const crystalMaterial = registerMaterial(createCrystalSurface({
    color: 0x9fc9ff,
    emissive: 0x08214d,
    emissiveIntensity: 0.16,
    metalness: 0.08,
    roughness: 0.07,
    transmission: 0.78,
    thickness: 1.55,
    ior: 1.48,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  }));
  const crystalWhite = registerMaterial(createCrystalSurface({
    color: 0xe8fdff,
    emissive: 0x20376b,
    emissiveIntensity: 0.18,
    metalness: 0.04,
    roughness: 0.05,
    transmission: 0.82,
    thickness: 1.1,
    ior: 1.42,
    clearcoat: 1,
    transparent: true,
    opacity: 0.9,
  }));
  const innerMaterial = registerMaterial(new THREE.MeshStandardMaterial({
    color: 0x255b75,
    emissive: 0x081d32,
    emissiveIntensity: 0.4,
    roughness: 0.28,
    metalness: 0.16,
    transparent: true,
    opacity: 0.42,
  }));
  const plateMaterial = registerMaterial(createCrystalSurface({
    color: 0xd3e9ff,
    emissive: 0x102b63,
    emissiveIntensity: 0.22,
    metalness: 0.22,
    roughness: 0.1,
    transmission: 0.54,
    thickness: 0.7,
    clearcoat: 1,
    transparent: true,
    opacity: 0.88,
  }));

  const plate = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(2.8, 2.62, 0.16, isIOS ? 36 : embeddedMode ? 48 : 72)), plateMaterial);
  plate.position.y = -0.47;
  plate.castShadow = true;
  plate.receiveShadow = true;
  cake.add(plate);

  addTier({ radius: 2.18, height: 1, y: 0.08, shell: crystalMaterial, core: innerMaterial, trim: crystalWhite, fringeCount: 18 });
  addTier({ radius: 1.48, height: 0.74, y: 0.93, shell: crystalWhite, core: innerMaterial, trim: crystalMaterial, fringeCount: 14 });

  const crownMaterial = registerMaterial(createCrystalSurface({
    color: 0xb59bff,
    emissive: 0x3a176d,
    emissiveIntensity: 0.55,
    metalness: 0.12,
    roughness: 0.04,
    transmission: 0.72,
    thickness: 0.8,
    ior: 1.52,
    clearcoat: 1,
    transparent: true,
    opacity: 0.95,
  }));
  const crown = new THREE.Mesh(registerGeometry(new THREE.IcosahedronGeometry(0.32, 0)), crownMaterial);
  crown.position.set(0, 1.54, -0.22);
  crown.scale.set(1, 1.38, 1);
  cake.add(crown);

  createCandles(crystalWhite, crystalMaterial);
  createPlaque();
}

function addTier({ radius, height, y, shell, core, trim, fringeCount }) {
  const shellMesh = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(radius, radius * 1.02, height, isIOS ? 32 : embeddedMode ? 44 : 64)), shell);
  shellMesh.position.y = y;
  shellMesh.castShadow = true;
  shellMesh.receiveShadow = true;
  cake.add(shellMesh);

  const coreMesh = new THREE.Mesh(registerGeometry(new THREE.CylinderGeometry(radius * 0.84, radius * 0.88, height * 0.76, isIOS ? 24 : embeddedMode ? 32 : 48)), core);
  coreMesh.position.y = y;
  cake.add(coreMesh);

  const topTrim = new THREE.Mesh(registerGeometry(new THREE.TorusGeometry(radius * 0.94, 0.08, 12, isIOS ? 48 : embeddedMode ? 64 : 96)), trim);
  topTrim.rotation.x = Math.PI / 2;
  topTrim.position.y = y + height / 2 - 0.035;
  cake.add(topTrim);

  const bottomTrim = new THREE.Mesh(registerGeometry(new THREE.TorusGeometry(radius * 0.98, 0.055, 10, isIOS ? 48 : embeddedMode ? 64 : 96)), trim);
  bottomTrim.rotation.x = Math.PI / 2;
  bottomTrim.position.y = y - height / 2 + 0.045;
  cake.add(bottomTrim);

  const fringeGeometry = registerGeometry(new THREE.OctahedronGeometry(0.105, 0));
  const fringe = new THREE.InstancedMesh(fringeGeometry, trim, fringeCount);
  const dummy = new THREE.Object3D();
  for (let index = 0; index < fringeCount; index += 1) {
    const angle = (index / fringeCount) * Math.PI * 2;
    dummy.position.set(Math.cos(angle) * radius * 0.91, y + height / 2 + 0.035, Math.sin(angle) * radius * 0.91);
    dummy.rotation.set(0, -angle, angle * 0.18);
    dummy.scale.set(0.72, 1.36, 0.72);
    dummy.updateMatrix();
    fringe.setMatrixAt(index, dummy.matrix);
  }
  fringe.instanceMatrix.needsUpdate = true;
  cake.add(fringe);
}

function createCandles(primaryMaterial, secondaryMaterial) {
  const positions = [-0.72, -0.36, 0, 0.36, 0.72];
  const candleGeometry = registerGeometry(new THREE.CylinderGeometry(0.065, 0.072, 0.58, 8));
  const flameGeometry = registerGeometry(new THREE.OctahedronGeometry(0.105, 0));
  const flameMaterial = registerMaterial(new THREE.MeshBasicMaterial({
    color: 0xe8ffff,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
  }));

  positions.forEach((x, index) => {
    const candle = new THREE.Mesh(candleGeometry, index % 2 === 0 ? primaryMaterial : secondaryMaterial);
    candle.position.set(x, 1.58 + Math.abs(x) * 0.04, 0.16 - Math.abs(x) * 0.07);
    candle.rotation.z = x * -0.08;
    cake.add(candle);

    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.position.set(x, candle.position.y + 0.39, candle.position.z);
    flame.scale.set(0.76, 1.42, 0.76);
    cake.add(flame);
    flames.push(flame);
  });
}

function createPlaque() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = '800 64px Georgia, "Times New Roman", serif';
  context.fillStyle = "rgba(229, 253, 255, 0.96)";
  context.shadowColor = "rgba(132, 170, 255, 0.86)";
  context.shadowBlur = 26;
  context.fillText("FOR YOU", canvas.width / 2, canvas.height / 2);

  const texture = registerTexture(new THREE.CanvasTexture(canvas));
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = registerMaterial(new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  const plaque = new THREE.Mesh(registerGeometry(new THREE.PlaneGeometry(1.62, 0.5)), material);
  plaque.position.set(0, 0.92, 1.49);
  cake.add(plaque);
}

function createCountdownSprite() {
  numberCanvas = document.createElement("canvas");
  numberCanvas.width = 1024;
  numberCanvas.height = 512;
  numberContext = numberCanvas.getContext("2d");
  numberTexture = registerTexture(new THREE.CanvasTexture(numberCanvas));
  numberTexture.colorSpace = THREE.SRGBColorSpace;
  numberMaterial = registerMaterial(new THREE.SpriteMaterial({
    map: numberTexture,
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  }));
  numberSprite = new THREE.Sprite(numberMaterial);
  numberSprite.position.set(0, 2.36, -1.1);
  numberSprite.scale.set(4.4, 2.2, 1);
  scene.add(numberSprite);
}

function drawCountdownText(text, isFinal = false) {
  const context = numberContext;
  const width = numberCanvas.width;
  const height = numberCanvas.height;
  context.clearRect(0, 0, width, height);
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.font = isFinal
    ? '800 176px "Microsoft YaHei", "PingFang SC", sans-serif'
    : '700 382px Georgia, "Times New Roman", serif';

  context.shadowColor = "rgba(126, 170, 255, 0.78)";
  context.shadowBlur = isFinal ? 50 : 70;
  context.strokeStyle = "rgba(196, 249, 255, 0.86)";
  context.lineWidth = isFinal ? 5 : 8;
  context.strokeText(text, width / 2, height / 2 + 8);

  const fill = context.createLinearGradient(0, 90, 0, 430);
  fill.addColorStop(0, "#ffffff");
  fill.addColorStop(0.4, "#dce9ff");
  fill.addColorStop(0.74, "#9dbdff");
  fill.addColorStop(1, "#bca9ff");
  context.fillStyle = fill;
  context.fillText(text, width / 2, height / 2 + 8);

  context.globalAlpha = 0.58;
  context.fillStyle = "#ffffff";
  context.fillText(text, width / 2 - 3, height / 2 + 2);
  context.restore();
  numberTexture.needsUpdate = true;
}

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.18, "rgba(220,233,255,0.9)");
  gradient.addColorStop(0.5, "rgba(126,170,255,0.26)");
  gradient.addColorStop(1, "rgba(126,170,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function bindEvents() {
  dom.startButton.addEventListener("click", startCountdown);
  dom.soundToggle.addEventListener("click", toggleSound);
  window.addEventListener("message", handleParentMessage);
  window.addEventListener("resize", queueResize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("pagehide", disposeExperience, { once: true });

  const canvas = renderer.domElement;
  canvas.addEventListener("pointerdown", (event) => {
    experienceState.dragging = true;
    experienceState.dragStartX = event.clientX;
    experienceState.dragStartRotation = experienceState.dragRotation;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    experienceState.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    experienceState.pointerY = (event.clientY / window.innerHeight) * 2 - 1;
    if (experienceState.dragging) {
      experienceState.dragRotation = experienceState.dragStartRotation + (event.clientX - experienceState.dragStartX) * 0.006;
    }
  });
  canvas.addEventListener("pointerup", () => {
    experienceState.dragging = false;
  });
  canvas.addEventListener("pointercancel", () => {
    experienceState.dragging = false;
  });
}

function warmGpuPrograms() {
  if (!renderer || !scene || !camera || !cake || !numberSprite || !numberMaterial) return;

  const cakeWasVisible = cake.visible;
  const spriteWasVisible = numberSprite.visible;
  const spriteOpacity = numberMaterial.opacity;
  cake.visible = true;
  numberSprite.visible = true;
  numberMaterial.opacity = 0.001;

  try {
    if (typeof renderer.compile === "function") renderer.compile(scene, camera);
    renderScene();
  } catch (_error) {}

  numberMaterial.opacity = spriteOpacity;
  numberSprite.visible = spriteWasVisible;
  cake.visible = cakeWasVisible;
  renderScene();
}

function startCountdown() {
  cancelAnimationFrame(experienceState.audioFadeRaf);
  window.clearTimeout(experienceState.phaseTimer);
  experienceState.mode = "running";
  experienceState.sequenceIndex = 0;
  experienceState.phaseStartedAt = performance.now();
  experienceState.cakeTargetX = 0;
  experienceState.cakeReveal = 0;
  experienceState.cameraTargetZ = getBaseCameraZ() - 0.15;
  cake.visible = false;
  cake.scale.setScalar(0.62);

  dom.opening.classList.add("is-hidden");
  dom.finishPanel.classList.add("is-resetting");
  dom.finishPanel.classList.remove("is-visible");
  dom.finishPanel.setAttribute("aria-hidden", "true");
  void dom.finishPanel.offsetWidth;
  dom.finishPanel.classList.remove("is-resetting");
  dom.countdownHud.classList.add("is-visible");
  dom.countdownHud.setAttribute("aria-hidden", "false");

  dom.countdownAudio.currentTime = 0;
  dom.countdownAudio.volume = 0.62;
  dom.countdownAudio.muted = embeddedMode || experienceState.muted;
  if (!embeddedMode) {
    dom.countdownAudio.play().catch(() => {
      dom.soundLabel.textContent = "BGM READY";
    });
  }

  enterSequencePhase();
}

function handleParentMessage(event) {
  if (!embeddedMode || event.source !== window.parent || event.origin !== window.location.origin) return;
  const type = event.data && event.data.type;

  if (type === "birthday-countdown:start") {
    lastRenderAt = 0;
    if (animationClock) animationClock.start();
    if (renderer) renderer.setAnimationLoop(renderFrame);
    startCountdown();
    return;
  }

  if (type === "birthday-countdown:stop") {
    window.clearTimeout(experienceState.phaseTimer);
    experienceState.phaseTimer = null;
    experienceState.mode = "idle";
    dom.countdownAudio.pause();
    if (renderer) renderer.setAnimationLoop(null);
    return;
  }

  if (type === "birthday-countdown:dispose") {
    disposeExperience();
  }
}

function enterSequencePhase() {
  const phase = sequence[experienceState.sequenceIndex];
  if (!phase) {
    completeCountdown();
    return;
  }

  experienceState.phaseStartedAt = performance.now();
  dom.liveCountdown.textContent = phase.text;
  numberMaterial.opacity = 0;
  experienceState.phaseTimer = window.setTimeout(() => {
    if (experienceState.mode !== "running") return;
    experienceState.sequenceIndex += 1;
    enterSequencePhase();
  }, phase.duration);

  if (phase.type === "ready") {
    dom.readyLine.textContent = phase.text;
    dom.readyLine.classList.remove("is-hidden");
    dom.phaseLine.textContent = "倒计时即将开始";
    return;
  }

  dom.readyLine.classList.add("is-hidden");
  dom.phaseLine.textContent = phase.type === "final" ? "这一刻属于你" : "";
  drawCountdownText(phase.text, phase.type === "final");
  if (phase.type === "final") cake.visible = true;
  const spriteSize = getNumberSpriteSize(phase.type === "final");
  numberSprite.scale.set(spriteSize.width, spriteSize.height, 1);
}

function updateSequence(now) {
  if (experienceState.mode !== "running") return;
  const phase = sequence[experienceState.sequenceIndex];
  if (!phase) return;

  const progress = Math.min(1, (now - experienceState.phaseStartedAt) / phase.duration);
  if (phase.type === "ready") {
    numberMaterial.opacity = 0;
  } else {
    animateCountdownVisual(phase, progress);
  }

}

function animateCountdownVisual(phase, progress) {
  const isFinal = phase.type === "final";
  const spriteSize = getNumberSpriteSize(isFinal);
  const baseWidth = spriteSize.width;
  const baseHeight = spriteSize.height;
  const introEnd = isFinal ? 0.22 : 0.2;
  const exitStart = isFinal ? 0.82 : 0.72;
  let opacity = 1;
  let scale = 1;

  if (progress < introEnd) {
    const local = easeOutCubic(progress / introEnd);
    opacity = local;
    scale = THREE.MathUtils.lerp(0.78, 1, local);
  } else if (progress > exitStart) {
    const local = (progress - exitStart) / (1 - exitStart);
    opacity = 1 - easeInCubic(local);
    scale = THREE.MathUtils.lerp(1, 1.08, local);
  } else {
    scale = 1 + Math.sin((progress - introEnd) * Math.PI) * 0.012;
  }

  numberMaterial.opacity = opacity;
  numberSprite.scale.set(baseWidth * scale, baseHeight * scale, 1);
  numberSprite.position.y = 2.36 + Math.sin(progress * Math.PI) * 0.06;

  if (phase.climax) {
    const climax = smoothstep(0.35, 1, progress);
    experienceState.cameraTargetZ = THREE.MathUtils.lerp(getBaseCameraZ() - 0.15, getClimaxCameraZ(), climax);
    if (composer && composer.bloomPass) composer.bloomPass.strength = THREE.MathUtils.lerp(getBloomBaseStrength(), getBloomClimaxStrength(), climax);
    keyLight.intensity = THREE.MathUtils.lerp(42, 68, climax);
    rimLight.intensity = THREE.MathUtils.lerp(30, 50, climax);
  }

  if (isFinal) {
    const finalLight = smoothstep(0, 0.58, progress);
    experienceState.cakeReveal = smoothstep(0.06, 0.68, progress);
    experienceState.cameraTargetZ = THREE.MathUtils.lerp(getClimaxCameraZ(), getFinalCameraZ(), finalLight);
    if (composer && composer.bloomPass) composer.bloomPass.strength = THREE.MathUtils.lerp(getBloomClimaxStrength(), getBloomFinalStrength(), finalLight);
  }
}

function completeCountdown() {
  window.clearTimeout(experienceState.phaseTimer);
  experienceState.phaseTimer = null;
  experienceState.mode = "finished";
  experienceState.cakeReveal = 1;
  cake.visible = true;
  experienceState.cakeTargetX = window.innerWidth < 700 ? 0 : 1.72;
  experienceState.cameraTargetZ = getBaseCameraZ() - 0.15;
  numberMaterial.opacity = 0;
  dom.countdownHud.classList.remove("is-visible");
  dom.countdownHud.setAttribute("aria-hidden", "true");
  dom.finishPanel.classList.add("is-visible");
  dom.finishPanel.setAttribute("aria-hidden", "false");
  dom.liveCountdown.textContent = "生日快乐，小杨同学";
  fadeAudioTo(0.18, 1200);

  window.dispatchEvent(new CustomEvent("crystal-countdown:complete"));
  if (embeddedMode) window.parent.postMessage({ type: "birthday-countdown:complete" }, window.location.origin);
}

function fadeAudioTo(targetVolume, duration) {
  cancelAnimationFrame(experienceState.audioFadeRaf);
  const startedAt = performance.now();
  const initialVolume = dom.countdownAudio.volume;

  const step = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    dom.countdownAudio.volume = THREE.MathUtils.lerp(initialVolume, targetVolume, easeOutCubic(progress));
    if (progress < 1) experienceState.audioFadeRaf = requestAnimationFrame(step);
  };

  experienceState.audioFadeRaf = requestAnimationFrame(step);
}

function toggleSound() {
  experienceState.muted = !experienceState.muted;
  dom.countdownAudio.muted = experienceState.muted;
  dom.soundToggle.setAttribute("aria-pressed", String(experienceState.muted));
  dom.soundLabel.textContent = experienceState.muted ? "BGM OFF" : "BGM ON";
}

function renderFrame(now) {
  if (experienceState.disposed || document.hidden) return;
  if (isIOS && lastRenderAt && now - lastRenderAt < iosFrameInterval) return;
  lastRenderAt = now;
  const delta = Math.min(animationClock.getDelta(), 0.05);
  const elapsed = animationClock.elapsedTime;
  updateSequence(now);

  const idleSpin = elapsed * (experienceState.mode === "running" ? 0.12 : 0.08);
  const targetRotationY = idleSpin + experienceState.dragRotation + experienceState.pointerX * 0.13;
  cake.rotation.y += (targetRotationY - cake.rotation.y) * Math.min(1, delta * 3.2);
  cake.rotation.x += (-experienceState.pointerY * 0.055 - cake.rotation.x) * Math.min(1, delta * 2.4);
  cake.position.x += (experienceState.cakeTargetX - cake.position.x) * Math.min(1, delta * 2.5);
  const cakeBaseY = window.innerWidth < 700 ? -0.5 : -1.04;
  const revealOffset = THREE.MathUtils.lerp(-0.55, 0, experienceState.cakeReveal);
  const revealScale = THREE.MathUtils.lerp(0.62, 1, easeOutCubic(experienceState.cakeReveal));
  cake.position.y = cakeBaseY + revealOffset + Math.sin(elapsed * 0.9) * 0.035;
  cake.scale.setScalar(revealScale);

  camera.position.x += (experienceState.pointerX * 0.15 - camera.position.x) * Math.min(1, delta * 1.6);
  camera.position.y += (1.55 - experienceState.pointerY * 0.07 - camera.position.y) * Math.min(1, delta * 1.6);
  camera.position.z += (experienceState.cameraTargetZ - camera.position.z) * Math.min(1, delta * 2.2);
  camera.lookAt(0, 0.18, 0);

  stars.rotation.y += delta * 0.008;
  stars.rotation.x = Math.sin(elapsed * 0.08) * 0.02;
  crystalField.rotation.y -= delta * 0.025;
  halo.material.opacity = 0.16 + Math.sin(elapsed * 0.72) * 0.025;
  flameLight.intensity = 7.4 + Math.sin(elapsed * 5.1) * 0.8;

  flames.forEach((flame, index) => {
    const pulse = 1 + Math.sin(elapsed * 6.2 + index * 0.8) * 0.08;
    flame.scale.set(0.76 / pulse, 1.42 * pulse, 0.76 / pulse);
  });

  if (experienceState.mode !== "running") {
    if (composer && composer.bloomPass) composer.bloomPass.strength += (getBloomBaseStrength() - composer.bloomPass.strength) * Math.min(1, delta * 1.4);
    keyLight.intensity += (42 - keyLight.intensity) * Math.min(1, delta * 1.4);
    rimLight.intensity += (30 - rimLight.intensity) * Math.min(1, delta * 1.4);
  }

  renderScene();
}

function renderScene() {
  if (composer) composer.render();
  else renderer.render(scene, camera);
}

function queueResize() {
  window.clearTimeout(experienceState.resizeTimer);
  experienceState.resizeTimer = window.setTimeout(() => {
    experienceState.resizeTimer = null;
    onResize();
  }, 140);
}

function handleVisibilityChange() {
  if (!renderer || experienceState.disposed) return;
  if (document.hidden) {
    renderer.setAnimationLoop(null);
    return;
  }

  if (!animationClock) return;
  animationClock.start();
  if (!embeddedMode || experienceState.mode !== "idle") renderer.setAnimationLoop(renderFrame);
}

function onResize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);
  camera.aspect = width / height;
  camera.fov = width < 700 ? 52 : 38;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, getPixelRatioLimit(width)));
  renderer.setSize(width, height);
  if (composer) composer.setSize(width, height);
  if (composer && composer.bloomPass) {
    const bloomScale = getBloomResolutionScale(width);
    composer.bloomPass.setSize(Math.floor(width * bloomScale), Math.floor(height * bloomScale));
  }

  if (experienceState.mode === "idle") {
    experienceState.cakeTargetX = width < 700 ? 0 : 1.7;
    experienceState.cameraTargetZ = getBaseCameraZ();
  } else if (experienceState.mode === "finished") {
    experienceState.cakeTargetX = width < 700 ? 0 : 1.72;
    experienceState.cameraTargetZ = getBaseCameraZ() - 0.15;
  }
}

function getPixelRatioLimit(width) {
  if (appleDesktopRendering) return embeddedMode ? 1.15 : 1.8;
  if (embeddedMode) return width < 700 || compactRendering ? 1 : 1.15;
  if (compactRendering) return width < 700 ? 1.25 : 1.5;
  return width < 700 ? 1.45 : 1.8;
}

function getBloomResolutionScale(width) {
  if (appleDesktopRendering) return embeddedMode ? 0.66 : 0.94;
  if (embeddedMode) return width < 700 || compactRendering ? 0.58 : 0.66;
  return compactRendering ? 0.76 : 0.94;
}

function getBloomBaseStrength() {
  return 0.5;
}

function getBloomClimaxStrength() {
  return 0.74;
}

function getBloomFinalStrength() {
  return 0.86;
}

function getBaseCameraZ() {
  return window.innerWidth < 700 ? 11.6 : 9.2;
}

function getClimaxCameraZ() {
  return window.innerWidth < 700 ? 10.55 : 8.15;
}

function getFinalCameraZ() {
  return window.innerWidth < 700 ? 10.15 : 7.85;
}

function getNumberSpriteSize(isFinal) {
  if (window.innerWidth < 700) {
    return isFinal ? { width: 5.05, height: 1.8 } : { width: 4.7, height: 2.35 };
  }
  return isFinal ? { width: 7.2, height: 2.55 } : { width: 5.5, height: 2.75 };
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function easeInCubic(value) {
  return Math.pow(value, 3);
}

function smoothstep(edge0, edge1, value) {
  const normalized = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function showWebglFallback() {
  dom.loadingScreen.hidden = true;
  dom.webglFallback.hidden = false;
}

function disposeExperience() {
  if (experienceState.disposed) return;
  experienceState.disposed = true;
  cancelAnimationFrame(experienceState.audioFadeRaf);
  window.clearTimeout(experienceState.phaseTimer);
  window.clearTimeout(experienceState.resizeTimer);
  dom.countdownAudio.pause();
  window.removeEventListener("message", handleParentMessage);
  window.removeEventListener("resize", queueResize);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (renderer) renderer.setAnimationLoop(null);
  if (composer && typeof composer.dispose === "function") composer.dispose();
  reusable.geometries.forEach((geometry) => geometry.dispose());
  reusable.materials.forEach((material) => material.dispose());
  reusable.textures.forEach((texture) => texture.dispose());
  if (renderer) {
    renderer.dispose();
    if (typeof renderer.forceContextLoss === "function") renderer.forceContextLoss();
  }
}

init();

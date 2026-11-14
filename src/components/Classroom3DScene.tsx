import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  Eye,
  Gauge,
  Sparkles,
} from 'lucide-react';

export interface NodeSpec {
  id: string;
  label: string;
  subtitle: string;
  colorHex: string;
}

const NODE_SPECS: Record<string, NodeSpec> = {
  core: {
    id: 'core',
    label: 'JMC Cloud Core',
    subtitle: 'Unified Firestore data engine linking all Grade 6–11 portals',
    colorHex: '#2563EB',
  },
  student: {
    id: 'student',
    label: 'Student Node',
    subtitle: 'Interactive classwork, quizzes, Pomodoro timer & AI study tutor',
    colorHex: '#D97706',
  },
  teacher: {
    id: 'teacher',
    label: 'Teacher Node',
    subtitle: 'Assignments, daily roll calls, term grading & lesson rubrics',
    colorHex: '#059669',
  },
  school: {
    id: 'school',
    label: 'School Admin Node',
    subtitle: 'Classroom codes, rosters, circulars & campus portal governance',
    colorHex: '#2563EB',
  },
  parent: {
    id: 'parent',
    label: 'Parent Node',
    subtitle: 'Live attendance alerts, report cards & family progress tracking',
    colorHex: '#E11D48',
  },
  operator: {
    id: 'operator',
    label: 'Operator & Workspace Node',
    subtitle: 'Apps Script onboarding, Drive archiving & Sheets synchronization',
    colorHex: '#7C3AED',
  },
};

type CameraPresetId = 'overview' | 'core' | 'orbital';

interface CameraPreset {
  id: CameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'overview', label: 'Overview', position: [6.4, 4.1, 7.6], target: [0, 2.35, 0] },
  { id: 'core', label: 'Core Focus', position: [3.3, 2.9, 4.1], target: [0, 2.6, 0] },
  { id: 'orbital', label: 'Top Orbital', position: [0.2, 8.6, 4.2], target: [0, 2.4, 0] },
];

// Pre-allocated math helpers (zero GC inside animation loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _eulerA = new THREE.Euler();
const _scaleVec = new THREE.Vector3(1, 1, 1);
const _mat4A = new THREE.Matrix4();
const _pointerNdc = new THREE.Vector2();

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return true;
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createDialTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 40, cx, cy, size * 0.48);
  grad.addColorStop(0, '#EFF6FF');
  grad.addColorStop(0.65, '#F8FAFC');
  grad.addColorStop(1, '#E2E8F0');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.49, 0, Math.PI * 2);
  ctx.fill();

  // Concentric technical calibration rings
  const rings = [0.46, 0.39, 0.31, 0.22, 0.13];
  rings.forEach((r, idx) => {
    ctx.beginPath();
    ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
    ctx.strokeStyle = idx === 0 ? '#94A3B8' : idx === 2 ? '#3B82F6' : '#CBD5E1';
    ctx.lineWidth = idx === 0 ? 4 : 2;
    ctx.stroke();
  });

  // Degree tick marks around outer perimeter
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const isMajor = i % 6 === 0;
    const rInner = size * (isMajor ? 0.415 : 0.435);
    const rOuter = size * 0.458;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * rInner, cy + Math.sin(angle) * rInner);
    ctx.lineTo(cx + Math.cos(angle) * rOuter, cy + Math.sin(angle) * rOuter);
    ctx.strokeStyle = isMajor ? '#1E40AF' : '#94A3B8';
    ctx.lineWidth = isMajor ? 4 : 1.8;
    ctx.stroke();
  }

  // Cardinal axis lines
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 2;
  for (let a = 0; a < 4; a++) {
    const ang = (a * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (size * 0.13), cy + Math.sin(ang) * (size * 0.13));
    ctx.lineTo(cx + Math.cos(ang) * (size * 0.39), cy + Math.sin(ang) * (size * 0.39));
    ctx.stroke();
  }

  // Sector labels
  ctx.fillStyle = '#1E3A8A';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const labels = ['CAMPUS', 'STEM LAB', 'CLOUD', 'AI TUTOR'];
  labels.forEach((label, idx) => {
    const ang = (idx * Math.PI) / 2 - Math.PI / 2;
    const r = size * 0.35;
    ctx.save();
    ctx.translate(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 24, cx, cy, size * 0.48);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.38)');
  grad.addColorStop(0.45, 'rgba(30, 41, 59, 0.16)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createBrushedMetalRoughnessTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += 2) {
    const shade = 150 + Math.floor(Math.sin(y * 0.7) * 28 + ((y * 37) % 30));
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, size, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => m.dispose());
    } else if (mat) {
      mat.dispose();
    }
  });
}

export const Classroom3DScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [explodeLevel, setExplodeLevel] = useState<number>(0);
  const [activePreset, setActivePreset] = useState<CameraPresetId>('overview');
  const [selectedNode, setSelectedNode] = useState<NodeSpec>(NODE_SPECS.core);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [webglUnsupported, setWebglUnsupported] = useState<boolean>(false);

  // Mutable refs read inside the stable WebGL loop so React state changes never rebuild the canvas
  const isPlayingRef = useRef(isPlaying);
  const speedRef = useRef(speedMultiplier);
  const explodeTargetRef = useRef(explodeLevel);
  const cameraTransitionRef = useRef<{
    active: boolean;
    position: THREE.Vector3;
    target: THREE.Vector3;
  }>({
    active: false,
    position: new THREE.Vector3(...CAMERA_PRESETS[0].position),
    target: new THREE.Vector3(...CAMERA_PRESETS[0].target),
  });
  const selectedNodeIdRef = useRef<string>('core');

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    speedRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    explodeTargetRef.current = explodeLevel;
  }, [explodeLevel]);

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset.id);
    cameraTransitionRef.current.position.set(...preset.position);
    cameraTransitionRef.current.target.set(...preset.target);
    cameraTransitionRef.current.active = true;
  };

  const handleResetScene = () => {
    setIsPlaying(true);
    setSpeedMultiplier(1);
    setExplodeLevel(0);
    setSelectedNode(NODE_SPECS.core);
    selectedNodeIdRef.current = 'core';
    handleSelectPreset(CAMERA_PRESETS[0]);
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      const isSoftwareGl = detectSoftwareWebGL();
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const initWidth = Math.max(container.clientWidth, 320);
      const initHeight = Math.max(container.clientHeight, 320);
      renderer.setSize(initWidth, initHeight);
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const isSoft = isSoftwareGl;
      const maxAniso = renderer.capabilities.getMaxAnisotropy();

      // Scene & Horizon Fog matching bright daylight studio backdrop
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9);
      scene.fog = new THREE.FogExp2(0xf1f5f9, 0.036);

      // Studio Environment Reflections (PMREM + RoomEnvironment)
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = envTexture;
      pmremGenerator.dispose();

      // Camera & OrbitControls
      const camera = new THREE.PerspectiveCamera(42, initWidth / initHeight, 0.1, 80);
      camera.position.set(...CAMERA_PRESETS[0].position);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(...CAMERA_PRESETS[0].target);
      controls.enableDamping = !isSoft;
      controls.dampingFactor = 0.06;
      controls.minDistance = 3.2;
      controls.maxDistance = 16;
      controls.maxPolarAngle = Math.PI * 0.485;
      controls.minPolarAngle = 0.2;
      controls.enablePan = false;
      controls.update();

      // Never fight manual user camera controls
      const onControlsStart = () => {
        cameraTransitionRef.current.active = false;
      };
      controls.addEventListener('start', onControlsStart);

      // Balanced 3-Point Studio Lighting Rig (warm key + cool fill + cool rim)
      const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xcbd5e1, 1.15);
      hemiLight.position.set(0, 12, 0);
      scene.add(hemiLight);

      const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.25);
      keyLight.position.set(6, 10, 6);
      keyLight.castShadow = !isSoft;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 26;
      keyLight.shadow.camera.left = -5.5;
      keyLight.shadow.camera.right = 5.5;
      keyLight.shadow.camera.top = 5.5;
      keyLight.shadow.camera.bottom = -5.5;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.05);
      rimLight.position.set(-6, 5.5, -6);
      scene.add(rimLight);

      // Procedural Textures
      const dialTexture = createDialTexture(maxAniso);
      const shadowTexture = createContactShadowTexture();
      const brushedRoughTex = createBrushedMetalRoughnessTexture(maxAniso);

      // Shared Material Library (varied roughness >= 0.25 & metalness across adjacent surfaces)
      const studioFloorMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9,
        roughness: 0.92,
        metalness: 0.0,
      });
      const brushedSteelMat = new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.88,
        roughness: 0.24,
        roughnessMap: brushedRoughTex,
      });
      const darkAnodizedMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.78,
        roughness: 0.34,
      });
      const satinGoldMat = new THREE.MeshPhysicalMaterial({
        color: 0xd97706,
        metalness: 0.92,
        roughness: 0.18,
        clearcoat: 0.5,
      });
      const cobaltAlloyMat = new THREE.MeshPhysicalMaterial({
        color: 0x2563eb,
        metalness: 0.84,
        roughness: 0.22,
        clearcoat: 0.65,
      });
      const sapphireCrystalMat = new THREE.MeshPhysicalMaterial({
        color: 0x3b82f6,
        metalness: 0.05,
        roughness: 0.06,
        transmission: isSoft ? 0 : 0.72,
        transparent: true,
        opacity: isSoft ? 0.85 : 1.0,
        ior: 1.55,
        thickness: 1.4,
        attenuationColor: new THREE.Color(0x1d4ed8),
        clearcoat: 1.0,
      });
      const glassOuterShellMat = new THREE.MeshPhysicalMaterial({
        color: 0xe0f2fe,
        metalness: 0.0,
        roughness: 0.08,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        clearcoat: 1.0,
      });
      const dialMat = new THREE.MeshStandardMaterial({
        map: dialTexture,
        roughness: 0.58,
        metalness: 0.08,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });

      // Studio Ground & Contact Shadow Grounding
      const groundFloor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), studioFloorMat);
      groundFloor.rotation.x = -Math.PI / 2;
      groundFloor.position.y = 0;
      groundFloor.receiveShadow = true;
      scene.add(groundFloor);

      const contactShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(6.8, 6.8),
        new THREE.MeshBasicMaterial({
          map: shadowTexture,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        })
      );
      contactShadow.rotation.x = -Math.PI / 2;
      contactShadow.position.y = 0.02;
      scene.add(contactShadow);

      // Clickable / Raycastable objects list
      const clickableTargets: THREE.Object3D[] = [];

      // 1) Grounded Stepped Pedestal Assembly (bottom-center at y=0)
      const pedestalGroup = new THREE.Group();
      const lathePts = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(2.38, 0.0),
        new THREE.Vector2(2.38, 0.09),
        new THREE.Vector2(2.24, 0.14),
        new THREE.Vector2(2.05, 0.14),
        new THREE.Vector2(1.98, 0.25),
        new THREE.Vector2(0.0, 0.25),
      ];
      const plinthGeo = new THREE.LatheGeometry(lathePts, 64);
      plinthGeo.computeTangents();
      const plinthMesh = new THREE.Mesh(plinthGeo, darkAnodizedMat);
      plinthMesh.castShadow = true;
      plinthMesh.receiveShadow = true;
      pedestalGroup.add(plinthMesh);

      const dialPlate = new THREE.Mesh(new THREE.CircleGeometry(1.94, 64), dialMat);
      dialPlate.rotation.x = -Math.PI / 2;
      dialPlate.position.y = 0.27;
      dialPlate.receiveShadow = true;
      pedestalGroup.add(dialPlate);

      const pedestalBrassRim = new THREE.Mesh(new THREE.TorusGeometry(2.01, 0.04, 16, 72), satinGoldMat);
      pedestalBrassRim.rotation.x = Math.PI / 2;
      pedestalBrassRim.position.y = 0.25;
      pedestalBrassRim.castShadow = true;
      pedestalGroup.add(pedestalBrassRim);

      // 3 machined vertical support pylons holding the orbital cradle
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.085, 0.62, 16), brushedSteelMat);
        pylon.position.set(Math.cos(angle) * 1.72, 0.56, Math.sin(angle) * 1.72);
        pylon.rotation.z = Math.cos(angle) * 0.26;
        pylon.rotation.x = -Math.sin(angle) * 0.26;
        pylon.castShadow = true;
        pedestalGroup.add(pylon);
      }
      scene.add(pedestalGroup);

      // 2) Central Multi-Part Knowledge Core Assembly
      const coreAssembly = new THREE.Group();
      coreAssembly.position.set(0, 2.55, 0);

      const crystalCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), sapphireCrystalMat);
      crystalCore.userData.nodeId = 'core';
      crystalCore.layers.enable(1);
      crystalCore.castShadow = true;
      clickableTargets.push(crystalCore);
      coreAssembly.add(crystalCore);

      const glassDome = new THREE.Mesh(new THREE.IcosahedronGeometry(0.92, 2), glassOuterShellMat);
      glassDome.renderOrder = 5;
      coreAssembly.add(glassDome);

      const geodesicCage = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.06, 1), 1),
        new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.45 })
      );
      coreAssembly.add(geodesicCage);

      const coreMeridianA = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.028, 14, 64), satinGoldMat);
      coreAssembly.add(coreMeridianA);

      const coreMeridianB = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.024, 14, 64), brushedSteelMat);
      coreMeridianB.rotation.x = Math.PI / 2;
      coreAssembly.add(coreMeridianB);

      scene.add(coreAssembly);

      // 3) Three Articulated Gyroscopic Orbital Rings
      const gyroRings: { group: THREE.Group; baseTiltX: number; baseTiltZ: number; speedY: number; speedX: number; explodeOffset: number }[] = [];

      const createGyroRing = (
        radius: number,
        tube: number,
        primaryMat: THREE.Material,
        accentMat: THREE.Material,
        tiltX: number,
        tiltZ: number,
        speedY: number,
        speedX: number,
        explodeOffset: number
      ) => {
        const ringGroup = new THREE.Group();
        ringGroup.position.set(0, 2.55, 0);
        ringGroup.rotation.set(tiltX, 0, tiltZ);

        const mainRing = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 18, 96), primaryMat);
        mainRing.castShadow = true;
        ringGroup.add(mainRing);

        const innerTrack = new THREE.Mesh(
          new THREE.TorusGeometry(radius - tube * 1.45, tube * 0.42, 12, 84),
          darkAnodizedMat
        );
        ringGroup.add(innerTrack);

        // Dual precision gimbal bearing collars
        for (const sign of [-1, 1]) {
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(tube * 2.1, tube * 2.1, tube * 3.4, 20), accentMat);
          collar.position.set(sign * radius, 0, 0);
          collar.rotation.z = Math.PI / 2;
          collar.castShadow = true;
          ringGroup.add(collar);
        }

        scene.add(ringGroup);
        gyroRings.push({
          group: ringGroup,
          baseTiltX: tiltX,
          baseTiltZ: tiltZ,
          speedY,
          speedX,
          explodeOffset,
        });
      };

      createGyroRing(1.55, 0.048, cobaltAlloyMat, satinGoldMat, 0.48, 0.28, 0.42, 0.14, 0.35);
      createGyroRing(2.05, 0.045, brushedSteelMat, cobaltAlloyMat, -0.58, 0.42, -0.32, 0.18, 0.65);
      createGyroRing(2.58, 0.04, satinGoldMat, brushedSteelMat, 0.25, -0.55, 0.22, -0.12, 0.95);

      // 4) Five Interactive Role Satellites (Composite 3-4 part groups)
      interface SatelliteRecord {
        id: string;
        group: THREE.Group;
        accentRing: THREE.Mesh;
        radius: number;
        speed: number;
        phase: number;
        inclination: number;
      }
      const satellites: SatelliteRecord[] = [];

      const satelliteConfigs: {
        id: string;
        color: number;
        radius: number;
        speed: number;
        phase: number;
        inclination: number;
        shape: 'sphere' | 'octahedron' | 'prism' | 'capsule' | 'dodeca';
      }[] = [
        { id: 'student', color: 0xd97706, radius: 1.72, speed: 0.65, phase: 0.2, inclination: 0.45, shape: 'sphere' },
        { id: 'teacher', color: 0x059669, radius: 2.12, speed: 0.52, phase: 1.45, inclination: -0.52, shape: 'octahedron' },
        { id: 'school', color: 0x2563eb, radius: 2.55, speed: 0.42, phase: 2.7, inclination: 0.32, shape: 'prism' },
        { id: 'parent', color: 0xe11d48, radius: 2.18, speed: 0.48, phase: 3.95, inclination: 0.62, shape: 'capsule' },
        { id: 'operator', color: 0x7c3aed, radius: 2.66, speed: 0.36, phase: 5.2, inclination: -0.35, shape: 'dodeca' },
      ];

      // Extruded hexagonal academic prism shape for School node
      const hexShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const hx = Math.cos(ang) * 0.21;
        const hy = Math.sin(ang) * 0.21;
        if (i === 0) hexShape.moveTo(hx, hy);
        else hexShape.lineTo(hx, hy);
      }
      hexShape.closePath();

      satelliteConfigs.forEach((cfg) => {
        const satGroup = new THREE.Group();

        let bodyGeo: THREE.BufferGeometry;
        if (cfg.shape === 'octahedron') bodyGeo = new THREE.OctahedronGeometry(0.24, 0);
        else if (cfg.shape === 'prism')
          bodyGeo = new THREE.ExtrudeGeometry(hexShape, {
            depth: 0.22,
            bevelEnabled: true,
            bevelThickness: 0.04,
            bevelSize: 0.03,
            bevelSegments: 2,
          });
        else if (cfg.shape === 'capsule') bodyGeo = new THREE.CapsuleGeometry(0.16, 0.18, 6, 16);
        else if (cfg.shape === 'dodeca') bodyGeo = new THREE.DodecahedronGeometry(0.22, 0);
        else bodyGeo = new THREE.SphereGeometry(0.21, 24, 24);

        if (cfg.shape === 'prism') {
          bodyGeo.center();
        }

        const bodyMat = new THREE.MeshPhysicalMaterial({
          color: cfg.color,
          roughness: 0.28,
          metalness: 0.15,
          clearcoat: 0.85,
          emissive: new THREE.Color(cfg.color),
          emissiveIntensity: 0.08,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        bodyMesh.castShadow = true;
        bodyMesh.userData.nodeId = cfg.id;
        bodyMesh.layers.enable(1);
        clickableTargets.push(bodyMesh);
        satGroup.add(bodyMesh);

        // Machined metal equatorial housing collar
        const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 12, 36), brushedSteelMat);
        collarMesh.rotation.x = Math.PI / 2.4;
        satGroup.add(collarMesh);

        // Top finial cap + base pin
        const capMesh = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.12, 12), satinGoldMat);
        capMesh.position.y = 0.27;
        satGroup.add(capMesh);

        scene.add(satGroup);
        satellites.push({
          id: cfg.id,
          group: satGroup,
          accentRing: collarMesh,
          radius: cfg.radius,
          speed: cfg.speed,
          phase: cfg.phase,
          inclination: cfg.inclination,
        });
      });

      // 5) Levitating Architectural Learning Modules (Beveled ExtrudeGeometry Slabs)
      const moduleShape = new THREE.Shape();
      moduleShape.moveTo(-0.2, -0.26);
      moduleShape.lineTo(0.2, -0.26);
      moduleShape.lineTo(0.2, 0.26);
      moduleShape.lineTo(-0.2, 0.26);
      moduleShape.closePath();

      const slabGeo = new THREE.ExtrudeGeometry(moduleShape, {
        depth: 0.05,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.02,
        bevelSegments: 2,
      });
      slabGeo.center();

      interface FloatingModule {
        group: THREE.Group;
        angle: number;
        radius: number;
        baseY: number;
        phase: number;
      }
      const floatingModules: FloatingModule[] = [];
      const moduleColors = [0x3b82f6, 0x10b981, 0xf59e0b, 0x6366f1, 0x06b6d4, 0x8b5cf6];

      for (let i = 0; i < 6; i++) {
        const modGroup = new THREE.Group();
        const coverMat = new THREE.MeshStandardMaterial({
          color: moduleColors[i],
          roughness: 0.45,
          metalness: 0.1,
        });
        const slab = new THREE.Mesh(slabGeo, coverMat);
        slab.castShadow = true;
        modGroup.add(slab);

        const spine = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 0.1), brushedSteelMat);
        spine.position.x = -0.2;
        modGroup.add(spine);

        const pageBlock = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.44, 0.07),
          new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0 })
        );
        pageBlock.position.x = 0.02;
        modGroup.add(pageBlock);

        const angle = (i / 6) * Math.PI * 2;
        scene.add(modGroup);
        floatingModules.push({
          group: modGroup,
          angle,
          radius: 3.35,
          baseY: 1.55 + (i % 2) * 0.55,
          phase: i * 1.1,
        });
      }

      // 6) Instanced Floating Particle Helix (48 crisp polyhedral motes)
      const moteCount = 48;
      const moteGeo = new THREE.OctahedronGeometry(0.055, 0);
      const moteMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.25,
        metalness: 0.65,
      });
      const moteInstanced = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
      moteInstanced.frustumCulled = false;

      const motePalette = [
        new THREE.Color(0x2563eb),
        new THREE.Color(0x059669),
        new THREE.Color(0xd97706),
        new THREE.Color(0x7c3aed),
        new THREE.Color(0x0284c7),
      ];
      for (let i = 0; i < moteCount; i++) {
        moteInstanced.setColorAt(i, motePalette[i % motePalette.length]);
      }
      if (moteInstanced.instanceColor) {
        moteInstanced.instanceColor.needsUpdate = true;
      }
      scene.add(moteInstanced);

      // Pre-warm shaders cleanly on hardware GPUs
      if (!isSoft) {
        renderer.compile(scene, camera);
      }

      // Raycasting for satellite / core click selection (restricted to layer 1)
      const raycaster = new THREE.Raycaster();
      raycaster.layers.set(1);

      let pointerDownX = 0;
      let pointerDownY = 0;

      const onPointerDown = (e: PointerEvent) => {
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
      };

      const onPointerUp = (e: PointerEvent) => {
        const distSq = (e.clientX - pointerDownX) ** 2 + (e.clientY - pointerDownY) ** 2;
        if (distSq > 36) return; // Drag orbit, not click
        const rect = renderer.domElement.getBoundingClientRect();
        _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(_pointerNdc, camera);
        const hits = raycaster.intersectObjects(clickableTargets, false);
        if (hits.length > 0) {
          const nodeId = hits[0].object.userData.nodeId as string | undefined;
          if (nodeId && NODE_SPECS[nodeId]) {
            selectedNodeIdRef.current = nodeId;
            setSelectedNode(NODE_SPECS[nodeId]);
          }
        }
      };

      let lastMoveCheck = 0;
      const onPointerMove = (e: PointerEvent) => {
        const now = performance.now();
        if (now - lastMoveCheck < 50) return;
        lastMoveCheck = now;
        const rect = renderer.domElement.getBoundingClientRect();
        _pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(_pointerNdc, camera);
        const hits = raycaster.intersectObjects(clickableTargets, false);
        renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('pointermove', onPointerMove);

      // ResizeObserver for crisp container responsiveness
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.max(entry.contentRect.width, 280);
          const h = Math.max(entry.contentRect.height, 280);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      resizeObserver.observe(container);

      // Pause loop when scrolled out of viewport
      let isInView = true;
      const intersectionObserver = new IntersectionObserver(
        (entries) => {
          isInView = entries[0]?.isIntersecting ?? true;
        },
        { threshold: 0.05 }
      );
      intersectionObserver.observe(container);

      // Animation loop with exact software-WebGL pacing (afterDraw)
      const clock = new THREE.Clock();
      let simTime = 0;
      let currentExplode = 0;
      let frameId = 0;
      let disposed = false;

      function afterDraw(cb: () => void) {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      }

      const tick = () => {
        if (disposed) return;

        const delta = Math.min(clock.getDelta(), 0.08);
        if (isInView) {
          if (isPlayingRef.current) {
            simTime += delta * speedRef.current;
          }

          // Smooth exponential damping for explode view slider
          currentExplode = THREE.MathUtils.damp(currentExplode, explodeTargetRef.current, 6, delta);

          // Core levitation & dual meridian rotation
          const coreBob = Math.sin(simTime * 1.4) * 0.1;
          coreAssembly.position.y = 2.55 + coreBob + currentExplode * 0.55;
          crystalCore.rotation.y = simTime * 0.7;
          crystalCore.rotation.x = Math.sin(simTime * 0.45) * 0.25;
          const crystalPulse = selectedNodeIdRef.current === 'core' ? 1.06 + Math.sin(simTime * 3) * 0.03 : 1.0;
          crystalCore.scale.setScalar(crystalPulse);
          geodesicCage.rotation.y = -simTime * 0.28;
          geodesicCage.scale.setScalar(1 + currentExplode * 0.28);
          coreMeridianA.rotation.y = simTime * 0.9;
          coreMeridianB.rotation.z = -simTime * 0.75;

          // Gyroscopic orbital rings
          for (let i = 0; i < gyroRings.length; i++) {
            const r = gyroRings[i];
            r.group.position.y = 2.55 + coreBob + currentExplode * r.explodeOffset;
            r.group.rotation.y = simTime * r.speedY;
            r.group.rotation.x = r.baseTiltX + Math.sin(simTime * r.speedX) * 0.16;
            r.group.rotation.z = r.baseTiltZ + Math.cos(simTime * r.speedX * 0.8) * 0.12;
            r.group.scale.setScalar(1 + currentExplode * (0.14 + i * 0.08));
          }

          // 5 Role Satellites orbiting along inclined tracks
          for (let i = 0; i < satellites.length; i++) {
            const sat = satellites[i];
            const ang = simTime * sat.speed + sat.phase;
            const orbitR = sat.radius * (1 + currentExplode * 0.35);
            const sx = Math.cos(ang) * orbitR;
            const sz = Math.sin(ang) * orbitR;
            const sy = 2.55 + Math.sin(ang + sat.phase) * Math.sin(sat.inclination) * orbitR * 0.55 + currentExplode * 0.25;
            sat.group.position.set(sx, sy, sz);
            sat.group.rotation.y = simTime * 1.1 + sat.phase;
            sat.accentRing.rotation.z = simTime * 1.6;
            const isSel = selectedNodeIdRef.current === sat.id;
            const targetScale = isSel ? 1.28 : 1.0;
            const curScale = THREE.MathUtils.damp(sat.group.scale.x, targetScale, 8, delta);
            sat.group.scale.setScalar(curScale);
          }

          // Floating academic slabs
          for (let i = 0; i < floatingModules.length; i++) {
            const mod = floatingModules[i];
            const orbitA = mod.angle + simTime * 0.16;
            const r = mod.radius + currentExplode * 0.95;
            mod.group.position.set(
              Math.cos(orbitA) * r,
              mod.baseY + Math.sin(simTime * 1.3 + mod.phase) * 0.18 + currentExplode * 0.2,
              Math.sin(orbitA) * r
            );
            mod.group.rotation.y = -orbitA + Math.PI / 2;
            mod.group.rotation.x = Math.sin(simTime * 0.8 + mod.phase) * 0.15;
            mod.group.rotation.z = Math.cos(simTime * 0.65 + mod.phase) * 0.1;
          }

          // Instanced polyhedral data motes (zero allocation)
          for (let i = 0; i < moteCount; i++) {
            const frac = i / moteCount;
            const theta = frac * Math.PI * 6 + simTime * (0.28 + (i % 3) * 0.07);
            const r = (2.1 + (i % 7) * 0.28) * (1 + currentExplode * 0.28);
            const y = 0.9 + frac * 3.4 + Math.sin(simTime * 1.5 + i) * 0.14;
            _vec3A.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
            _eulerA.set(simTime + i, simTime * 0.8 + i, 0);
            _quatA.setFromEuler(_eulerA);
            const s = 0.75 + Math.sin(simTime * 2.2 + i) * 0.25;
            _scaleVec.set(s, s, s);
            _mat4A.compose(_vec3A, _quatA, _scaleVec);
            moteInstanced.setMatrixAt(i, _mat4A);
          }
          moteInstanced.instanceMatrix.needsUpdate = true;

          // Smooth damped camera preset transitions
          if (cameraTransitionRef.current.active) {
            const k = 1 - Math.exp(-5.5 * delta);
            camera.position.lerp(cameraTransitionRef.current.position, k);
            controls.target.lerp(cameraTransitionRef.current.target, k);
            _vec3B.copy(camera.position).sub(cameraTransitionRef.current.position);
            if (_vec3B.lengthSq() < 0.001) {
              cameraTransitionRef.current.active = false;
            }
          }

          controls.update();
          renderer.render(scene, camera);
        }

        if (isSoft) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
      };

      if (isSoft) {
        renderer.render(scene, camera);
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }

      return () => {
        disposed = true;
        cancelAnimationFrame(frameId);
        clearTimeout(frameId);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        controls.removeEventListener('start', onControlsStart);
        controls.dispose();
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        dialTexture.dispose();
        shadowTexture.dispose();
        brushedRoughTex.dispose();
        envTexture.dispose();
        disposeObject3D(scene);
        renderer.dispose();
      };
    } catch {
      setWebglUnsupported(true);
      return;
    }
  }, []);

  if (webglUnsupported) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 text-center space-y-2">
        <Sparkles className="w-7 h-7 text-blue-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Interactive 3D Campus Core</h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Hardware-accelerated WebGL is unavailable in this browser session. Enable WebGL to explore the interactive 3D STEM orbital stage.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-[#F1F5F9] overflow-hidden shadow-lg shadow-slate-200/70">
      {/* Isolated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-[380px] sm:h-[460px] lg:h-[500px] select-none touch-none"
        aria-label="Interactive 3D JMC Classroom STEM & Campus Orbital Sculpture"
      />

      {/* Minimal Top-Left Spec Badge (No side-panel occlusion, zero pulsating dots) */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 max-w-[calc(100%-28px)] sm:max-w-sm">
        <div className="inline-flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/95 border border-slate-200 shadow-sm">
          <span
            className="w-2.5 h-2.5 rounded-sm mt-1 shrink-0"
            style={{ backgroundColor: selectedNode.colorHex }}
          />
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-900 font-['Plus_Jakarta_Sans'] truncate">
              {selectedNode.label}
            </div>
            <div className="text-[11px] text-slate-600 leading-snug line-clamp-2">
              {selectedNode.subtitle}
            </div>
          </div>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (Zero backdrop-filter over WebGL) */}
      <div
        className={`absolute bottom-3.5 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[820px] flex flex-col items-center transition-transform duration-300 ${
          dockCollapsed ? 'translate-y-[calc(100%-30px)]' : 'translate-y-0'
        }`}
      >
        {/* Collapse / Expand Toggle Attached to Top Edge */}
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg bg-white border border-b-0 border-slate-200 text-[11px] font-semibold text-slate-700 hover:text-blue-700 shadow-xs transition-colors"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? 'Show 3D Controls' : 'Hide Controls'}</span>
        </button>

        {/* Main Horizontal Control Dock */}
        <div className="w-full rounded-xl bg-white/95 border border-slate-200 shadow-md px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Play / Pause & Reset */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isPlaying
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Animate'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetScene}
              title="Reset 3D View & Orbit"
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Explode View Slider */}
          <div className="flex items-center gap-2 min-w-[150px] flex-1 max-w-[210px]">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <label htmlFor="jmc-3d-explode" className="text-[11px] font-semibold text-slate-600 whitespace-nowrap">
              Expand
            </label>
            <input
              id="jmc-3d-explode"
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={explodeLevel}
              onChange={(e) => setExplodeLevel(parseFloat(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer h-1.5"
            />
          </div>

          {/* Speed Multipliers */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <Gauge className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5 hidden sm:block" />
            {[0.5, 1, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setSpeedMultiplier(spd)}
                className={`px-2 py-1 rounded-md text-[11px] font-bold tabular-nums transition-colors ${
                  speedMultiplier === spd
                    ? 'bg-white text-blue-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Camera Presets */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
            <Eye className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5 hidden sm:block" />
            {CAMERA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                  activePreset === preset.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

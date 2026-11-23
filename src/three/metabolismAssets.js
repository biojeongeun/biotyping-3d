import * as THREE from 'three';
import { glowTexture, makeGlowSprite, makeGameTag } from './treeAssets.js';

/* =========================================================
 * STAGE 4 (세포와 물질대사) 3D 에셋
 * - 단면 절개(Cutaway) 마이토콘드리아 & 엽록체 + 에너지·물질 순환 스트림
 * ========================================================= */

/** 깊은 세포질 우주/현미경 관측소 배경 돔 */
export function buildCellBackdrop() {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(0x06111e) },
      uMid: { value: new THREE.Color(0x0b2234) },
      uBot: { value: new THREE.Color(0x091a28) },
      uWarm: { value: new THREE.Color(0xf97316) },
      uCool: { value: new THREE.Color(0x10b981) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uTime;
      uniform vec3 uTop;
      uniform vec3 uMid;
      uniform vec3 uBot;
      uniform vec3 uWarm;
      uniform vec3 uCool;
      void main() {
        float y = vDir.y * 0.5 + 0.5;
        vec3 col = mix(uBot, uMid, smoothstep(0.0, 0.52, y));
        col = mix(col, uTop, smoothstep(0.48, 1.0, y));

        // 좌측(마이토콘드리아) 은은한 앰버 오라, 우측(엽록체) 은은한 에메랄드 오라
        float leftGlow = smoothstep(0.2, -0.85, vDir.x) * exp(-pow(vDir.y * 2.8, 2.0));
        float rightGlow = smoothstep(-0.2, 0.85, vDir.x) * exp(-pow(vDir.y * 2.8, 2.0));
        float pulse = 0.85 + 0.15 * sin(uTime * 0.6);
        col += uWarm * leftGlow * 0.12 * pulse;
        col += uCool * rightGlow * 0.13 * pulse;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(130, 32, 20), mat);
  dome.renderOrder = -20;
  dome.frustumCulled = false;
  group.add(dome);

  // 배경에 떠다니는 반투명 세포질 소포(vesicle) & 에너지 입자
  const vesicles = [];
  const vGeo = new THREE.SphereGeometry(1, 18, 14);
  for (let i = 0; i < 22; i++) {
    const isLeft = i % 2 === 0;
    const vMat = new THREE.MeshPhysicalMaterial({
      color: isLeft ? 0xfdba74 : 0x6ee7b7,
      emissive: isLeft ? 0x9a3412 : 0x065f46,
      emissiveIntensity: 0.2,
      roughness: 0.15,
      transparent: true,
      opacity: 0.16,
      clearcoat: 1,
    });
    const m = new THREE.Mesh(vGeo, vMat);
    const s = 0.25 + Math.random() * 0.65;
    m.scale.setScalar(s);
    m.position.set((Math.random() - 0.5) * 34, (Math.random() - 0.5) * 14, -7 - Math.random() * 14);
    group.add(m);
    vesicles.push({ mesh: m, baseY: m.position.y, speed: 0.4 + Math.random() * 0.6, phase: Math.random() * 6.28 });
  }

  return { group, skyMat: mat, vesicles };
}

/** 절개형 이중막 껍질 생성 헬퍼 (+Z 쪽으로 열려 있어 내부 구조가 선명히 보임) */
function buildCutawayDoubleShell({ sx, sy, sz, outerColor, outerEmissive, innerColor, rimColor }) {
  const g = new THREE.Group();

  // 외막 (뒷면~측면 감싸는 절개 껍질)
  const outerGeo = new THREE.SphereGeometry(1, 48, 32, Math.PI * 0.88, Math.PI * 1.24);
  const outerShell = new THREE.Mesh(
    outerGeo,
    new THREE.MeshPhysicalMaterial({
      color: outerColor,
      emissive: outerEmissive,
      emissiveIntensity: 0.35,
      roughness: 0.22,
      metalness: 0.1,
      clearcoat: 0.9,
      side: THREE.DoubleSide,
    })
  );
  outerShell.scale.set(sx, sy, sz);
  g.add(outerShell);

  // 내막 (조금 안쪽에 한 겹 더 → 이중막 구조 시각화)
  const innerGeo = new THREE.SphereGeometry(1, 44, 28, Math.PI * 0.9, Math.PI * 1.2);
  const innerShell = new THREE.Mesh(
    innerGeo,
    new THREE.MeshPhysicalMaterial({
      color: innerColor,
      emissive: innerColor,
      emissiveIntensity: 0.28,
      roughness: 0.3,
      side: THREE.DoubleSide,
    })
  );
  innerShell.scale.set(sx * 0.93, sy * 0.9, sz * 0.9);
  g.add(innerShell);

  // 앞쪽 유리질 반투명 피막 (전체 실루엣 유지)
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1.015, 42, 28),
    new THREE.MeshPhysicalMaterial({
      color: rimColor,
      roughness: 0.08,
      metalness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
    })
  );
  glass.scale.set(sx, sy, sz);
  g.add(glass);

  // 절개면 테두리 발광 링
  const rimPts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    rimPts.push(new THREE.Vector3(Math.cos(a) * sx * 0.94, Math.sin(a) * sy * 0.94, sz * 0.34));
  }
  const rimCurve = new THREE.CatmullRomCurve3(rimPts, true);
  const rim = new THREE.Mesh(
    new THREE.TubeGeometry(rimCurve, 64, 0.055, 8, true),
    new THREE.MeshBasicMaterial({
      color: rimColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    })
  );
  g.add(rim);

  return { group: g, outerShell, innerShell, rim };
}

/* =========================================================
 * 1. 마이토콘드리아 (세포호흡)
 * ========================================================= */
export function buildMitochondrion() {
  const g = new THREE.Group();

  const shell = buildCutawayDoubleShell({
    sx: 3.35,
    sy: 1.58,
    sz: 1.65,
    outerColor: 0xea580c,
    outerEmissive: 0x9a3412,
    innerColor: 0xf59e0b,
    rimColor: 0xfdba74,
  });
  g.add(shell.group);

  // 크리스타 (내막의 구불구불한 주름 리본)
  const cristaPts = [
    [-2.55, 0.0],
    [-2.25, 0.72],
    [-1.75, 0.82],
    [-1.65, -0.35],
    [-1.2, -0.45],
    [-1.1, 0.88],
    [-0.55, 0.92],
    [-0.45, -0.42],
    [0.05, -0.48],
    [0.15, 0.92],
    [0.7, 0.88],
    [0.8, -0.42],
    [1.3, -0.38],
    [1.4, 0.78],
    [1.95, 0.68],
    [2.5, 0.05],
    [2.1, -0.78],
    [1.45, -0.92],
    [1.05, 0.15],
    [0.55, 0.18],
    [0.35, -0.95],
    [-0.25, -0.95],
    [-0.45, 0.18],
    [-0.95, 0.15],
    [-1.35, -0.92],
    [-2.1, -0.75],
  ];
  const cristaShape = new THREE.Shape();
  cristaShape.moveTo(cristaPts[0][0], cristaPts[0][1]);
  for (let i = 1; i < cristaPts.length; i++) {
    const prev = cristaPts[i - 1];
    const curr = cristaPts[i];
    const mx = (prev[0] + curr[0]) * 0.5;
    const my = (prev[1] + curr[1]) * 0.5;
    cristaShape.quadraticCurveTo(prev[0], prev[1], mx, my);
  }
  cristaShape.closePath();

  const cristaGeo = new THREE.ExtrudeGeometry(cristaShape, {
    depth: 0.9,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3,
  });
  cristaGeo.translate(0, 0, -0.62);
  const cristaMat = new THREE.MeshPhysicalMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.48,
    roughness: 0.24,
    metalness: 0.12,
    clearcoat: 0.85,
  });
  const crista = new THREE.Mesh(cristaGeo, cristaMat);
  g.add(crista);

  // 기질 내부 TCA 회로 회전 링
  const tcaGroup = new THREE.Group();
  tcaGroup.position.set(1.1, 0.05, 0.58);
  const tcaRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.045, 12, 36),
    new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  const tcaRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.025, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending })
  );
  tcaGroup.add(tcaRing, tcaRing2);
  g.add(tcaGroup);

  // 산화적 인산화 ATP 스파크 오브 (크리스타 표면)
  const atpOrbs = [];
  const orbGeo = new THREE.OctahedronGeometry(0.11, 0);
  const orbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 });
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(orbGeo, orbMat);
    const base = new THREE.Vector3(-1.8 + i * 0.42, Math.sin(i * 1.4) * 0.65, 0.5 + (i % 2) * 0.2);
    m.position.copy(base);
    g.add(m);
    atpOrbs.push({ mesh: m, base, phase: i * 0.7 });
  }

  // 왼쪽 세포질 해당 과정(포도당 육각 결정 → 피루브산 유입)
  const glyGroup = new THREE.Group();
  glyGroup.position.set(-3.6, 0.2, 0.2);
  const glucose = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.14, 6),
    new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.65,
      roughness: 0.15,
      clearcoat: 1,
    })
  );
  glucose.rotation.x = Math.PI / 2;
  const glyGlow = makeGlowSprite(0x38bdf8, 1.9, 0.65);
  glyGroup.add(glucose, glyGlow);
  g.add(glyGroup);

  // 내부 발광 글로우
  const coreGlow = makeGlowSprite(0xf97316, 6.2, 0.45);
  coreGlow.position.set(0, 0, 0.2);
  g.add(coreGlow);

  return { group: g, cristaMat, tcaGroup, atpOrbs, glucose, coreGlow };
}

/* =========================================================
 * 2. 엽록체 (광합성)
 * ========================================================= */
export function buildChloroplast() {
  const g = new THREE.Group();

  const shell = buildCutawayDoubleShell({
    sx: 3.45,
    sy: 1.68,
    sz: 1.75,
    outerColor: 0x059669,
    outerEmissive: 0x064e3b,
    innerColor: 0x10b981,
    rimColor: 0x6ee7b7,
  });
  g.add(shell.group);

  // 그라나(타이라코이드 원반 더미 5개) + 스트로마 라멜라 연결 다리
  const thylaMat = new THREE.MeshPhysicalMaterial({
    color: 0x22c55e,
    emissive: 0x15803d,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.1,
    clearcoat: 0.9,
  });
  const thylaRimMat = new THREE.MeshBasicMaterial({
    color: 0x86efac,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });
  const discGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.11, 24);
  const discRimGeo = new THREE.TorusGeometry(0.46, 0.018, 8, 28);
  discRimGeo.rotateX(Math.PI / 2);

  const granaDefs = [
    { x: -1.75, y: -0.45, z: 0.05, count: 5 },
    { x: -0.82, y: -0.62, z: 0.3, count: 6 },
    { x: 0.28, y: -0.55, z: 0.05, count: 7 },
    { x: 1.35, y: -0.52, z: 0.22, count: 5 },
    { x: -0.25, y: -0.1, z: -0.52, count: 5 },
  ];

  const granaMeshes = [];
  granaDefs.forEach((gd) => {
    const stack = new THREE.Group();
    stack.position.set(gd.x, gd.y, gd.z);
    for (let i = 0; i < gd.count; i++) {
      const y = i * 0.165;
      const disc = new THREE.Mesh(discGeo, thylaMat);
      disc.position.y = y;
      const rim = new THREE.Mesh(discRimGeo, thylaRimMat);
      rim.position.y = y;
      stack.add(disc, rim);
    }
    g.add(stack);
    granaMeshes.push(stack);
  });

  // 스트로마 라멜라 (그라나를 잇는 납작한 막 다리)
  const lamellaMat = new THREE.MeshPhysicalMaterial({
    color: 0x34d399,
    emissive: 0x059669,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  const bridgePairs = [
    [[-1.75, -0.1, 0.05], [-0.82, -0.1, 0.3]],
    [[-0.82, 0.18, 0.3], [0.28, 0.18, 0.05]],
    [[0.28, -0.15, 0.05], [1.35, -0.15, 0.22]],
    [[-0.82, -0.35, 0.3], [-0.25, 0.05, -0.52]],
    [[0.28, 0.35, 0.05], [-0.25, 0.35, -0.52]],
  ];
  bridgePairs.forEach(([a, b]) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(vb, va);
    const len = dir.length();
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, 0.18), lamellaMat);
    bridge.position.copy(va).addScaledVector(dir, 0.5);
    bridge.rotation.y = -Math.atan2(dir.z, dir.x);
    g.add(bridge);
  });

  // 캘빈 회로 (스트로마 우측 회전 에너지 링)
  const calvinGroup = new THREE.Group();
  calvinGroup.position.set(1.75, 0.25, 0.52);
  const cRing1 = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.042, 12, 36),
    new THREE.MeshBasicMaterial({ color: 0xa3e635, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  const cRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.024, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
  );
  calvinGroup.add(cRing1, cRing2);
  g.add(calvinGroup);

  // 엽록소로 쏟아지는 빛에너지 광자(Photon) 입자 스트림
  const photons = [];
  const pCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, 3.6, 0.9),
    new THREE.Vector3(-2.0, 2.0, 0.65),
    new THREE.Vector3(-1.45, 0.65, 0.45),
  ]);
  for (let i = 0; i < 6; i++) {
    const sp = makeGlowSprite(0xfef08a, 0.55, 0.9);
    g.add(sp);
    photons.push({ sprite: sp, offset: i / 6 });
  }

  // 내부 에메랄드 글로우
  const coreGlow = makeGlowSprite(0x10b981, 6.4, 0.45);
  coreGlow.position.set(0, 0, 0.2);
  g.add(coreGlow);

  return { group: g, thylaMat, calvinGroup, photons, pCurve, coreGlow };
}

/* =========================================================
 * 3. 마이토콘드리아 ↔ 엽록체 에너지·물질 순환 스트림
 * ========================================================= */
export function buildCycleStreams() {
  const g = new THREE.Group();

  // 위쪽 호: 엽록체 → 마이토콘드리아 (포도당 + O₂)
  const topCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.2, 1.85, 0.2),
    new THREE.Vector3(1.6, 3.45, 0.4),
    new THREE.Vector3(-1.6, 3.45, 0.4),
    new THREE.Vector3(-4.2, 1.85, 0.2),
  ]);
  const topTube = new THREE.Mesh(
    new THREE.TubeGeometry(topCurve, 44, 0.04, 8),
    new THREE.MeshBasicMaterial({
      color: 0x4ade80,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  g.add(topTube);

  // 아래쪽 호: 마이토콘드리아 → 엽록체 (CO₂ + H₂O)
  const botCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-4.2, -1.75, 0.2),
    new THREE.Vector3(-1.6, -3.25, 0.4),
    new THREE.Vector3(1.6, -3.25, 0.4),
    new THREE.Vector3(4.2, -1.75, 0.2),
  ]);
  const botTube = new THREE.Mesh(
    new THREE.TubeGeometry(botCurve, 44, 0.04, 8),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  g.add(botTube);

  const topOrbs = [];
  const botOrbs = [];
  for (let i = 0; i < 6; i++) {
    const a = makeGlowSprite(0x86efac, 0.65, 0.9);
    g.add(a);
    topOrbs.push({ sprite: a, offset: i / 6 });
    const b = makeGlowSprite(0x7dd3fc, 0.65, 0.9);
    g.add(b);
    botOrbs.push({ sprite: b, offset: i / 6 });
  }

  const topTag = makeGameTag('포도당 + O₂', { accent: '#4ade80', sub: '광합성 산물 → 세포호흡', scale: 0.0044 });
  topTag.position.set(0, 3.9, 0.5);
  const botTag = makeGameTag('CO₂ + H₂O', { accent: '#38bdf8', sub: '세포호흡 산물 → 광합성', scale: 0.0044 });
  botTag.position.set(0, -3.7, 0.5);
  g.add(topTag, botTag);

  return { group: g, topCurve, botCurve, topOrbs, botOrbs, topTube, botTube };
}

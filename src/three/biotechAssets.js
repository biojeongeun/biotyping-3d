import * as THREE from 'three';
import { glowTexture, makeGlowSprite } from './treeAssets.js';

/* =========================================================
 * STAGE 5 (생물의 유전 · 생명공학기술의 활용) 3D 홀로그램 바이오랩 에셋
 * ========================================================= */

/** 미래형 홀로그램 바이오랩 배경 돔 + 부유 데이터 파티클 */
export function buildLabBackdrop() {
  const group = new THREE.Group();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(0x050918) },
      uMid: { value: new THREE.Color(0x0d1b36) },
      uBot: { value: new THREE.Color(0x071224) },
      uAccentA: { value: new THREE.Color(0x38bdf8) },
      uAccentB: { value: new THREE.Color(0x8b5cf6) },
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
      uniform vec3 uAccentA;
      uniform vec3 uAccentB;
      void main() {
        float y = vDir.y * 0.5 + 0.5;
        vec3 col = mix(uBot, uMid, smoothstep(0.0, 0.52, y));
        col = mix(col, uTop, smoothstep(0.48, 1.0, y));
        float arc = exp(-pow((vDir.y - 0.12 - sin(vDir.x * 3.0 + uTime * 0.25) * 0.08) * 6.5, 2.0));
        vec3 glow = mix(uAccentA, uAccentB, 0.5 + 0.5 * sin(vDir.x * 2.5 - uTime * 0.2));
        col += glow * arc * 0.16;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(135, 32, 20), skyMat);
  dome.renderOrder = -20;
  dome.frustumCulled = false;
  group.add(dome);

  // 어두운 반사 바닥 + 발광 동심원
  const floorY = -1.65;
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(70, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x060f1f, roughness: 0.2, metalness: 0.65 })
  );
  floor.position.set(0, floorY, -4);
  group.add(floor);

  // 5개 플랫폼을 잇는 바닥 발광 데이터 도관
  const conduitCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-8.4, floorY + 0.04, 0),
    new THREE.Vector3(-4.2, floorY + 0.04, 0),
    new THREE.Vector3(0, floorY + 0.04, 0),
    new THREE.Vector3(4.2, floorY + 0.04, 0),
    new THREE.Vector3(8.4, floorY + 0.04, 0),
  ]);
  group.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(conduitCurve, 64, 0.045, 6),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
      })
    )
  );

  // 부유하는 홀로그램 입자
  const count = 95;
  const pos = new Float32Array(count * 3);
  const base = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    base[i * 3] = (Math.random() - 0.5) * 30;
    base[i * 3 + 1] = -1 + Math.random() * 11;
    base[i * 3 + 2] = -6 + Math.random() * 10;
  }
  pos.set(base);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      map: glowTexture(),
      color: 0x93c5fd,
      size: 0.42,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(motes);

  return { group, skyMat, motes, moteBase: base };
}

/** 공용 홀로그램 전시 받침대 */
function buildHoloPedestal(colorHex) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x162238, roughness: 0.3, metalness: 0.78 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.38, 0.22, 24), metal);
  base.position.y = -1.54;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.12, 0.032, 10, 42),
    new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -1.42;

  // 은은한 홀로그램 투사 광선
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 128;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  grad.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 128);
  const cone = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 0.9, 3.2, 24, 1, true),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(c),
      color: colorHex,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  cone.position.y = 0.2;
  g.add(base, ring, cone);
  return { group: g, ring };
}

/** 소형 발광 DNA 이중나선 헬퍼 */
function buildMiniHelix({ pairs = 10, radius = 0.34, step = 0.22, colorA = 0x38bdf8, colorB = 0x818cf8 } = {}) {
  const g = new THREE.Group();
  const matA = new THREE.MeshPhysicalMaterial({ color: colorA, emissive: colorA, emissiveIntensity: 0.45, roughness: 0.2, clearcoat: 0.9 });
  const matB = new THREE.MeshPhysicalMaterial({ color: colorB, emissive: colorB, emissiveIntensity: 0.45, roughness: 0.2, clearcoat: 0.9 });
  const rungMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.6 });
  const sGeo = new THREE.SphereGeometry(0.068, 12, 10);
  const rGeo = new THREE.CylinderGeometry(0.022, 0.022, radius * 2, 6);
  const off = ((pairs - 1) * step) / 2;
  for (let i = 0; i < pairs; i++) {
    const a = i * 0.6;
    const y = i * step - off;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    const s1 = new THREE.Mesh(sGeo, matA);
    s1.position.set(x, y, z);
    const s2 = new THREE.Mesh(sGeo, matB);
    s2.position.set(-x, y, -z);
    const rung = new THREE.Mesh(rGeo, rungMat);
    rung.position.set(0, y, 0);
    rung.rotation.z = Math.PI / 2;
    rung.rotation.y = -a;
    g.add(s1, s2, rung);
  }
  return g;
}

/* =========================================================
 * 5개 생명공학기술 3D 홀로그램 전시물
 * ========================================================= */

/** 1. 유전자 재조합 & 플라스미드 */
export function buildPlasmidExhibit() {
  const g = new THREE.Group();
  const ped = buildHoloPedestal(0x38bdf8);
  g.add(ped.group);

  const ringGroup = new THREE.Group();
  ringGroup.position.set(0, 0.78, 0);
  // 메인 플라스미드 고리
  const plasmid = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.095, 16, 48, Math.PI * 1.52),
    new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.55, roughness: 0.18, clearcoat: 0.9 })
  );
  // 삽입된 유용 유전자 (핑크-마젠타 재조합 구간)
  const insert = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.12, 16, 24, Math.PI * 0.44),
    new THREE.MeshPhysicalMaterial({ color: 0xf472b6, emissive: 0xdb2777, emissiveIntensity: 0.85, roughness: 0.15, clearcoat: 1 })
  );
  insert.rotation.z = Math.PI * 1.54;
  // 보조 이중가닥 궤도 링
  const outer = new THREE.Mesh(
    new THREE.TorusGeometry(1.16, 0.02, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending })
  );
  ringGroup.add(plasmid, insert, outer, makeGlowSprite(0xf472b6, 2.5, 0.45));
  g.add(ringGroup);

  return { group: g, animate: (t) => { ringGroup.rotation.y = t * 0.6; ringGroup.rotation.z = Math.sin(t * 0.7) * 0.2; } };
}

/** 2. 제한 효소 & DNA 연결 효소 */
export function buildEnzymeExhibit() {
  const g = new THREE.Group();
  const ped = buildHoloPedestal(0x34d399);
  g.add(ped.group);

  const helix = buildMiniHelix({ pairs: 11, radius: 0.34, step: 0.22, colorA: 0x38bdf8, colorB: 0x34d399 });
  helix.position.set(0, 0.82, 0);
  g.add(helix);

  // 상단: 제한 효소 절단 복합체 (크림슨 링 + 절단 블레이드)
  const restrict = new THREE.Group();
  restrict.position.set(0, 1.48, 0);
  const rRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.055, 12, 32),
    new THREE.MeshPhysicalMaterial({ color: 0xfb7185, emissive: 0xe11d48, emissiveIntensity: 0.75, roughness: 0.2 })
  );
  rRing.rotation.x = Math.PI / 2;
  restrict.add(rRing, makeGlowSprite(0xfb7185, 1.6, 0.55));
  g.add(restrict);

  // 하단: DNA 연결 효소 (에메랄드 봉합 복합체)
  const ligase = new THREE.Group();
  ligase.position.set(0, 0.16, 0);
  const lRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.54, 0.055, 12, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x34d399, emissive: 0x059669, emissiveIntensity: 0.75, roughness: 0.2 })
  );
  lRing.rotation.x = Math.PI / 2;
  ligase.add(lRing, makeGlowSprite(0x34d399, 1.6, 0.55));
  g.add(ligase);

  return {
    group: g,
    animate: (t) => {
      helix.rotation.y = t * 0.55;
      restrict.rotation.y = -t * 1.1;
      ligase.rotation.y = t * 1.1;
      restrict.position.y = 1.48 + Math.sin(t * 2.2) * 0.08;
      ligase.position.y = 0.16 - Math.sin(t * 2.2) * 0.08;
    },
  };
}

/** 3. PCR 열순환 증폭 & 유전자 가위 (CRISPR-Cas9) */
export function buildCrisprPcrExhibit() {
  const g = new THREE.Group();
  const ped = buildHoloPedestal(0xa78bfa);
  g.add(ped.group);

  // 하단: PCR 3중 증폭 DNA + 열순환 링
  const pcrGroup = new THREE.Group();
  pcrGroup.position.set(0, 0.22, 0);
  [-0.58, 0, 0.58].forEach((x, idx) => {
    const h = buildMiniHelix({ pairs: 6, radius: 0.18, step: 0.16, colorA: 0x22d3ee, colorB: 0x38bdf8 });
    h.position.set(x, 0, idx === 1 ? 0.18 : -0.15);
    pcrGroup.add(h);
  });
  const thermalRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.03, 10, 42),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending })
  );
  thermalRing.rotation.x = Math.PI / 2;
  pcrGroup.add(thermalRing);
  g.add(pcrGroup);

  // 상단: CRISPR-Cas9 크리스탈 복합체 + 가이드 RNA 링
  const crispr = new THREE.Group();
  crispr.position.set(0, 1.95, 0);
  const cas9 = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0x8b5cf6,
      emissive: 0x6d28d9,
      emissiveIntensity: 0.65,
      roughness: 0.15,
      metalness: 0.25,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.86,
      flatShading: true,
    })
  );
  const gRna = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.036, 10, 42),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  gRna.rotation.set(Math.PI * 0.38, 0.4, 0);
  const cutBeam = new THREE.Mesh(
    new THREE.TorusGeometry(1.02, 0.02, 8, 42),
    new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending })
  );
  cutBeam.rotation.set(Math.PI * 0.65, -0.5, 0);
  crispr.add(cas9, gRna, cutBeam, makeGlowSprite(0xa78bfa, 2.8, 0.6));
  g.add(crispr);

  return {
    group: g,
    animate: (t) => {
      pcrGroup.rotation.y = t * 0.5;
      thermalRing.position.y = Math.sin(t * 2.5) * 0.42;
      cas9.rotation.y = -t * 0.7;
      gRna.rotation.z = t * 1.2;
      cutBeam.rotation.z = -t * 0.9;
    },
  };
}

/** 4. 줄기세포 & Y자형 단클론 항체 */
export function buildCellAntibodyExhibit() {
  const g = new THREE.Group();
  const ped = buildHoloPedestal(0xfbbf24);
  g.add(ped.group);

  // 하단: 발광 줄기세포 + 분화 위성 세포 3개
  const stem = new THREE.Group();
  stem.position.set(0, 0.3, 0);
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 28, 22),
    new THREE.MeshPhysicalMaterial({ color: 0xfde68a, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.28, depthWrite: false })
  );
  const core = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.28, 0),
    new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.8, roughness: 0.2, flatShading: true })
  );
  const sats = [];
  const satColors = [0x38bdf8, 0x4ade80, 0xf472b6];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 12),
      new THREE.MeshPhysicalMaterial({ color: satColors[i], emissive: satColors[i], emissiveIntensity: 0.6 })
    );
    stem.add(s);
    sats.push(s);
  }
  stem.add(outer, core, makeGlowSprite(0xfbbf24, 2.1, 0.55));
  g.add(stem);

  // 상단: Y자형 단클론 항체
  const ab = new THREE.Group();
  ab.position.set(0, 1.78, 0);
  const abMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.55, roughness: 0.18, clearcoat: 0.95 });
  const tipMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const stemBar = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.52, 8, 12), abMat);
  stemBar.position.y = -0.22;
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 8, 12), abMat);
  armL.position.set(-0.26, 0.22, 0);
  armL.rotation.z = 0.65;
  const armR = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.48, 8, 12), abMat);
  armR.position.set(0.26, 0.22, 0);
  armR.rotation.z = -0.65;
  const tipL = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), tipMat);
  tipL.position.set(-0.46, 0.46, 0);
  const tipR = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), tipMat);
  tipR.position.set(0.46, 0.46, 0);
  ab.add(stemBar, armL, armR, tipL, tipR, makeGlowSprite(0x38bdf8, 2.0, 0.45));
  g.add(ab);

  return {
    group: g,
    animate: (t) => {
      core.rotation.y = t * 0.9;
      sats.forEach((s, i) => {
        const a = t * 1.2 + (i * Math.PI * 2) / 3;
        s.position.set(Math.cos(a) * 0.85, Math.sin(a * 1.5) * 0.2, Math.sin(a) * 0.85);
      });
      ab.rotation.y = Math.sin(t * 0.8) * 0.55;
      ab.position.y = 1.78 + Math.sin(t * 1.8) * 0.08;
    },
  };
}

/** 5. 유전자 치료 (바이러스 벡터 캡시드) & 유전자 변형 생물체 (GMO 바이오 크리스탈) */
export function buildTherapyGmoExhibit() {
  const g = new THREE.Group();
  const ped = buildHoloPedestal(0x4ade80);
  g.add(ped.group);

  // 하단: 바이러스 벡터 캡시드 (20면체 외피 + 내부 정상 유전자 코어)
  const vector = new THREE.Group();
  vector.position.set(0, 0.3, 0);
  const capGeo = new THREE.IcosahedronGeometry(0.52, 0);
  const capBody = new THREE.Mesh(
    capGeo,
    new THREE.MeshPhysicalMaterial({ color: 0x14b8a6, emissive: 0x0f766e, emissiveIntensity: 0.45, roughness: 0.15, transparent: true, opacity: 0.45, flatShading: true })
  );
  const capWire = new THREE.LineSegments(
    new THREE.EdgesGeometry(capGeo),
    new THREE.LineBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.9 })
  );
  const geneCore = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.2, 0.045, 48, 8),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  vector.add(capBody, capWire, geneCore, makeGlowSprite(0x2dd4bf, 2.2, 0.5));
  g.add(vector);

  // 상단: GMO 바이오 결정 (발광 에메랄드 리프-프리즘 + 궤도 링)
  const gmo = new THREE.Group();
  gmo.position.set(0, 1.78, 0);
  const leaf = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42, 0),
    new THREE.MeshPhysicalMaterial({ color: 0x4ade80, emissive: 0x16a34a, emissiveIntensity: 0.65, roughness: 0.14, clearcoat: 1, flatShading: true })
  );
  leaf.scale.set(0.85, 1.45, 0.55);
  const gRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.024, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
  );
  gRing.rotation.x = Math.PI * 0.42;
  gmo.add(leaf, gRing, makeGlowSprite(0x4ade80, 2.1, 0.55));
  g.add(gmo);

  return {
    group: g,
    animate: (t) => {
      vector.rotation.y = t * 0.65;
      geneCore.rotation.x = t * 1.1;
      leaf.rotation.y = -t * 0.8;
      gRing.rotation.z = t * 1.0;
    },
  };
}

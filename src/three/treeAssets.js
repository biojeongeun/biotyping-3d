import * as THREE from 'three';

/* =========================================================
 * STAGE 3 (생명과학 계통수) 게임풍 하이엔드 3D 에셋
 * - 심야 생물발광 성소(Bioluminescent Sanctuary) + RPG 스킬트리 스타일
 * ========================================================= */

let _glowTex = null;
export function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.22, 'rgba(255,255,255,0.75)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _glowTex = new THREE.CanvasTexture(c);
  return _glowTex;
}

export function makeGlowSprite(colorHex, scale = 2.4, opacity = 0.75) {
  const mat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: colorHex,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const s = new THREE.Sprite(mat);
  s.scale.set(scale, scale, 1);
  return s;
}

/** 다크 글래스 네온 게임 태그 스프라이트 (그림판 느낌 제거) */
export function makeGameTag(title, { accent = '#38bdf8', sub = '', scale = 0.0056 } = {}) {
  const w = Math.max(256, title.length * 64 + 100);
  const h = sub ? 132 : 104;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const pad = 10;
  const r = 18;
  const roundRect = (x, y, rw, rh, rad) => {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + rw, y, x + rw, y + rh, rad);
    ctx.arcTo(x + rw, y + rh, x, y + rh, rad);
    ctx.arcTo(x, y + rh, x, y, rad);
    ctx.arcTo(x, y, x + rw, y, rad);
    ctx.closePath();
  };

  // 어두운 반투명 유리 배경
  roundRect(pad, pad, w - pad * 2, h - pad * 2, r);
  const bgGrad = ctx.createLinearGradient(0, pad, 0, h - pad);
  bgGrad.addColorStop(0, 'rgba(12, 24, 42, 0.92)');
  bgGrad.addColorStop(1, 'rgba(6, 14, 26, 0.94)');
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // 얇은 발광 테두리
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent;
  ctx.stroke();

  // 왼쪽 포인트 바
  roundRect(pad + 10, pad + 18, 8, h - pad * 2 - 36, 4);
  ctx.fillStyle = accent;
  ctx.fill();

  // 텍스트
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (sub) {
    ctx.fillStyle = accent;
    ctx.font = '700 24px Pretendard, sans-serif';
    ctx.fillText(sub, w / 2 + 4, pad + 32);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 46px Pretendard, sans-serif';
    ctx.fillText(title, w / 2 + 4, h - pad - 34);
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 48px Pretendard, sans-serif';
    ctx.fillText(title, w / 2 + 4, h / 2 + 2);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })
  );
  sprite.scale.set(w * scale, h * scale, 1);
  sprite.renderOrder = 20;
  return sprite;
}

/** 심야 오로라 하늘 돔 + 별빛 */
export function buildSanctuarySky() {
  const group = new THREE.Group();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTime: { value: 0 },
      uTop: { value: new THREE.Color(0x050b16) },
      uMid: { value: new THREE.Color(0x0b2238) },
      uHorizon: { value: new THREE.Color(0x133b4d) },
      uAuroraA: { value: new THREE.Color(0x14b8a6) },
      uAuroraB: { value: new THREE.Color(0x6366f1) },
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
      uniform vec3 uHorizon;
      uniform vec3 uAuroraA;
      uniform vec3 uAuroraB;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
        col = mix(col, uTop, smoothstep(0.24, 0.8, h));

        // 은은한 오로라 띠
        float wave = sin(vDir.x * 5.0 + uTime * 0.25) * 0.08 + cos(vDir.z * 4.0 - uTime * 0.18) * 0.06;
        float band = exp(-pow((h - 0.32 - wave) * 7.5, 2.0));
        float shimmer = 0.55 + 0.45 * sin(vDir.x * 11.0 - uTime * 0.45);
        vec3 aurora = mix(uAuroraA, uAuroraB, 0.5 + 0.5 * sin(vDir.x * 3.0 + uTime * 0.15));
        col += aurora * band * shimmer * 0.24;

        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 20), skyMat);
  sky.renderOrder = -20;
  sky.frustumCulled = false;
  group.add(sky);

  // 별빛
  const starCount = 260;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.45;
    const r = 115 + Math.random() * 15;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 5;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      map: glowTexture(),
      color: 0xdbeafe,
      size: 0.9,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    })
  );
  group.add(stars);
  return { group, skyMat };
}

/** 고대 성소 바닥 + 석조 제단 + 원경 실루엣 산맥 */
export function buildSanctuaryFloor(rootPos) {
  const g = new THREE.Group();
  const floorY = rootPos.y - 2.2;

  // 어두운 반사 수면/흑요석 바닥
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(110, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x071522,
      roughness: 0.22,
      metalness: 0.55,
    })
  );
  water.position.set(7.5, floorY, -10);
  g.add(water);

  // 원경 산맥 실루엣 (안개 속으로 녹아듦)
  const ridgeMat = new THREE.MeshStandardMaterial({
    color: 0x0d2133,
    roughness: 0.92,
    flatShading: true,
  });
  [
    [-38, -46, 16, 12],
    [-16, -54, 20, 15],
    [10, -58, 22, 17],
    [36, -50, 19, 14],
    [56, -44, 15, 11],
  ].forEach(([x, z, r, h]) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), ridgeMat);
    peak.position.set(x, floorY + h * 0.45, z);
    peak.rotation.y = x * 0.3;
    g.add(peak);
  });

  // 공통 조상 아래 석조 제단 (3단 링 + 발광 룬 링)
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x1b2938,
    roughness: 0.78,
    metalness: 0.22,
    flatShading: true,
  });
  const tiers = [
    [4.4, 4.9, 0.35, 0.17],
    [3.1, 3.5, 0.4, 0.52],
    [2.0, 2.3, 0.42, 0.9],
  ];
  tiers.forEach(([rt, rb, h, dy]) => {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 16), stoneMat);
    step.position.set(rootPos.x, floorY + dy, 0);
    g.add(step);
  });

  // 제단 발광 링
  const runeRings = [];
  [2.5, 3.85, 5.4].forEach((radius, idx) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius - 0.04, radius + 0.04, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: idx === 0 ? 0xfbbf24 : 0x38bdf8,
        transparent: true,
        opacity: idx === 0 ? 0.7 : 0.35,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.position.set(rootPos.x, floorY + (idx === 0 ? 1.12 : idx === 1 ? 0.73 : 0.04), 0);
    g.add(ring);
    runeRings.push(ring);
  });

  return { group: g, runeRings };
}

/** 유기적 고대 나무 줄기 + 뿌리 + 황금 에너지 맥 */
export function buildAncientTrunk(rootPos) {
  const g = new THREE.Group();
  const floorY = rootPos.y - 2.2;
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x262024,
    roughness: 0.88,
    metalness: 0.12,
    flatShading: true,
  });
  const veinMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  // 메인 줄기
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 1.5, 12), barkMat);
  trunk.position.set(rootPos.x, floorY + 1.5, 0);
  g.add(trunk);

  // 뻗어 나가는 6개의 뿌리 + 발광 맥
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.25;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(rootPos.x + dx * 0.25, rootPos.y - 0.15, dz * 0.25),
      new THREE.Vector3(rootPos.x + dx * 1.1, floorY + 1.15, dz * 1.1),
      new THREE.Vector3(rootPos.x + dx * 2.5, floorY + 0.55, dz * 2.5),
      new THREE.Vector3(rootPos.x + dx * 4.0, floorY + 0.12, dz * 4.0),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.16, 7), barkMat));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.04, 6), veinMat));
  }

  // 공통 조상 크리스탈 코어 + 이중 궤도 링
  const coreGroup = new THREE.Group();
  coreGroup.position.copy(rootPos);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.58, 0),
    new THREE.MeshPhysicalMaterial({
      color: 0xfde047,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 1.0,
    })
  );
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.032, 10, 48),
    new THREE.MeshStandardMaterial({ color: 0xfcd34d, emissive: 0xf59e0b, emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.2 })
  );
  ringA.rotation.x = Math.PI * 0.35;
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.024, 10, 48),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.2 })
  );
  ringB.rotation.set(Math.PI * 0.62, Math.PI * 0.25, 0);
  const glow = makeGlowSprite(0xfbbf24, 3.6, 0.85);
  coreGroup.add(crystal, ringA, ringB, glow);
  g.add(coreGroup);

  return { group: g, crystal, ringA, ringB, glow };
}

/** 티어별 크리스탈 노드(3역/6계/문) 생성 */
export function buildCrystalNode(tier, colorHex) {
  const g = new THREE.Group();
  const geo =
    tier === 0
      ? new THREE.DodecahedronGeometry(0.56, 0)
      : tier === 1
      ? new THREE.IcosahedronGeometry(0.46, 0)
      : new THREE.OctahedronGeometry(0.38, 0);

  const core = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.55,
      roughness: 0.14,
      metalness: 0.25,
      clearcoat: 1.0,
      flatShading: true,
    })
  );
  g.add(core);

  // 궤도 링 (3역: 2개, 6계: 1개)
  const rings = [];
  if (tier <= 1) {
    const r1 = new THREE.Mesh(
      new THREE.TorusGeometry(tier === 0 ? 0.82 : 0.66, 0.025, 8, 36),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending })
    );
    r1.rotation.x = Math.PI * 0.4;
    g.add(r1);
    rings.push(r1);
  }
  if (tier === 0) {
    const r2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.98, 0.018, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending })
    );
    r2.rotation.set(Math.PI * 0.65, 0.5, 0);
    g.add(r2);
    rings.push(r2);
  }

  const glow = makeGlowSprite(colorHex, tier === 0 ? 3.2 : tier === 1 ? 2.5 : 2.0, 0.72);
  g.add(glow);
  return { group: g, core, rings, glow };
}

/** 잠겨 있는(미해결) 홀로그램 크리스탈 노드 */
export function buildLockedNode(tier) {
  const g = new THREE.Group();
  const r = tier === 0 ? 0.42 : tier === 1 ? 0.35 : 0.29;
  const geo = new THREE.OctahedronGeometry(r, 0);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.25,
    roughness: 0.35,
    metalness: 0.4,
    transparent: true,
    opacity: 0.68,
    flatShading: true,
  });
  const body = new THREE.Mesh(geo, bodyMat);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.55,
  });
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), wireMat);
  g.add(body, wire);
  return { group: g, body, bodyMat, wireMat };
}

/** 현재 목표 노드를 가리키는 RPG 타겟팅 리티클 */
export function buildTargetReticle() {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.RingGeometry(0.76, 0.84, 6),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const inner = new THREE.Mesh(
    new THREE.RingGeometry(0.56, 0.61, 32),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  // 위로 갈수록 자연스럽게 사라지는 수직 빛 기둥
  const bc = document.createElement('canvas');
  bc.width = 16;
  bc.height = 128;
  const bctx = bc.getContext('2d');
  const bgrad = bctx.createLinearGradient(0, 0, 0, 128);
  bgrad.addColorStop(0, 'rgba(255,255,255,0)');
  bgrad.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  bgrad.addColorStop(1, 'rgba(255,255,255,0.75)');
  bctx.fillStyle = bgrad;
  bctx.fillRect(0, 0, 16, 128);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.5, 4.6, 16, 1, true),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(bc),
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  beam.position.y = 2.1;
  const glow = makeGlowSprite(0xfbbf24, 2.4, 0.55);
  g.add(outer, inner, beam, glow);
  return { group: g, outer, inner, beam };
}

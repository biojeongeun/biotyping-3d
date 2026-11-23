import * as THREE from 'three';
import { glowTexture, makeGlowSprite } from './treeAssets.js';

/* =========================================================
 * STAGE 2 (통합과학 2 - 다윈의 비글호 항해) 세련된 3D 에셋
 * - 황혼빛 대양(Golden-Hour Twilight Ocean) + PBR 재질 + 발광 연출
 * ========================================================= */

const pbr = (color, opts = {}) =>
  new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.45,
    metalness: 0.1,
    ...opts,
  });

/* ---------- 깃발 텍스처 ---------- */
function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#163172';
  ctx.fillRect(0, 0, 160, 96);
  ctx.lineCap = 'butt';
  const diag = (w, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(160, 96);
    ctx.moveTo(160, 0);
    ctx.lineTo(0, 96);
    ctx.stroke();
  };
  diag(20, '#f8fafc');
  diag(8, '#c81e3a');
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 35, 160, 26);
  ctx.fillRect(67, 0, 26, 96);
  ctx.fillStyle = '#c81e3a';
  ctx.fillRect(0, 41, 160, 14);
  ctx.fillRect(73, 0, 14, 96);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- 돛 (바람에 부푼 곡면) ---------- */
function makeSail(w, h, color) {
  const geo = new THREE.PlaneGeometry(w, h, 12, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const nx = (2 * pos.getX(i)) / w;
    const ny = (2 * pos.getY(i)) / h;
    pos.setZ(i, (1 - nx * nx) * (1 - ny * ny * 0.45) * 0.3);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshPhysicalMaterial({
      color,
      emissive: 0x5c3d24,
      emissiveIntensity: 0.08,
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    })
  );
  return { mesh, geo, base: Float32Array.from(pos.array) };
}

/* =========================================================
 * 비글호 + 다윈 (세련된 실루엣 & 따뜻한 황동·목재 PBR)
 * ========================================================= */
export function buildShip() {
  const ship = new THREE.Group();
  const hullMat = pbr(0x5c361d, { roughness: 0.48, clearcoat: 0.25 });
  const trimDark = pbr(0x2f1b0e, { roughness: 0.55 });
  const deckMat = pbr(0xa87c4f, { roughness: 0.62 });
  const brassMat = pbr(0xe5b84b, { roughness: 0.22, metalness: 0.82, clearcoat: 0.6 });
  const cabinMat = pbr(0x3f2616, { roughness: 0.5 });
  const roofMat = pbr(0x7c2d12, { roughness: 0.55 });

  // ----- 선체 -----
  const shape = new THREE.Shape();
  shape.moveTo(-2.15, 0.92);
  shape.lineTo(-1.95, -0.22);
  shape.quadraticCurveTo(-1.7, -0.52, -1.2, -0.52);
  shape.lineTo(1.25, -0.52);
  shape.quadraticCurveTo(2.25, -0.46, 2.68, 0.74);
  shape.lineTo(2.05, 0.56);
  shape.quadraticCurveTo(0.2, 0.26, -1.3, 0.56);
  shape.lineTo(-1.72, 0.92);
  shape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.12,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.08,
    bevelSegments: 3,
    curveSegments: 18,
  });
  hullGeo.translate(0, 0, -0.56);
  ship.add(new THREE.Mesh(hullGeo, hullMat));

  // 황동 띠 & 빛나는 현창
  const winGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe49e });
  [-1, 1].forEach((side) => {
    const z = side * 0.68;
    const band = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.065, 0.03), brassMat);
    band.position.set(0.1, 0.22, z);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.055, 0.03), trimDark);
    band2.position.set(0.0, -0.14, z);
    ship.add(band, band2);
    [-1.1, -0.4, 0.3, 1.0].forEach((x) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 10, 20), brassMat);
      ring.position.set(x, 0.03, z + side * 0.01);
      const glass = new THREE.Mesh(new THREE.CircleGeometry(0.08, 16), winGlowMat);
      glass.position.set(x, 0.03, z + side * 0.015);
      if (side < 0) glass.rotation.y = Math.PI;
      ship.add(ring, glass);
    });
  });

  // 갑판 & 난간
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.05, 0.96), deckMat);
  deck.position.set(0.0, 0.44, 0);
  ship.add(deck);
  [-1, 1].forEach((side) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(3.45, 0.075, 0.055), trimDark);
    rail.position.set(0.2, 0.64, side * 0.53);
    ship.add(rail);
    for (let i = 0; i < 6; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.22, 8), trimDark);
      post.position.set(-1.3 + i * 0.7, 0.53, side * 0.53);
      ship.add(post);
    }
  });

  // 고물 선실 & 따뜻한 등불
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.76, 1.02), cabinMat);
  cabin.position.set(-1.5, 0.85, 0);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.09, 1.18), roofMat);
  roof.position.set(-1.5, 1.28, 0);
  ship.add(cabin, roof);
  [-1, 1].forEach((side) => {
    [-0.25, 0.25].forEach((dx) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.03), winGlowMat);
      win.position.set(-1.5 + dx, 0.9, side * 0.52);
      ship.add(win);
    });
  });
  const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), winGlowMat);
  lantern.position.set(-2.18, 1.15, 0);
  const lanternGlow = makeGlowSprite(0xffb74d, 1.35, 0.85);
  lanternGlow.position.copy(lantern.position);
  ship.add(lantern, lanternGlow);

  // ----- 돛대 / 돛 / 삭구 -----
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.088, 3.95, 12), trimDark);
  mast.position.set(-0.1, 2.38, 0);
  const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.072, 3.05, 12), trimDark);
  fore.position.set(1.25, 1.98, 0);
  const nest = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.2, 14), hullMat);
  nest.position.set(-0.1, 3.92, 0);
  ship.add(mast, fore, nest);

  const yard = (len, x, y) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, len, 8), trimDark);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, y, 0);
    ship.add(m);
  };
  yard(2.18, -0.1, 3.3);
  yard(1.98, -0.1, 1.2);
  yard(1.38, 1.25, 2.74);
  yard(1.28, 1.25, 1.28);

  const sails = [];
  const mainSail = makeSail(1.96, 2.02, 0xfef3dc);
  mainSail.mesh.position.set(-0.1, 2.25, 0.05);
  ship.add(mainSail.mesh);
  sails.push(mainSail);
  const foreSail = makeSail(1.26, 1.42, 0xfce7c8);
  foreSail.mesh.position.set(1.25, 2.0, 0.05);
  ship.add(foreSail.mesh);
  sails.push(foreSail);

  const jibShape = new THREE.Shape();
  jibShape.moveTo(1.32, 2.86);
  jibShape.lineTo(3.05, 0.95);
  jibShape.lineTo(1.36, 0.95);
  jibShape.closePath();
  const jib = new THREE.Mesh(
    new THREE.ShapeGeometry(jibShape),
    new THREE.MeshPhysicalMaterial({ color: 0xfef0d5, roughness: 0.72, side: THREE.DoubleSide })
  );
  jib.position.z = 0.03;
  ship.add(jib);

  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, 1.0, 10), trimDark);
  bowsprit.rotation.z = -1.05;
  bowsprit.position.set(2.68, 0.8, 0);
  ship.add(bowsprit);

  const ropeMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 });
  const rope = (a, b) => {
    ship.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), ropeMat));
  };
  [-0.25, 0.25].forEach((z) => {
    rope([-0.1, 4.02, 0], [2.55, 0.76, z]);
    rope([-0.1, 4.02, 0], [-1.95, 0.95, z]);
    rope([-0.1, 3.72, 0], [0.7, 0.55, z * 2]);
    rope([-0.1, 3.72, 0], [-0.9, 0.55, z * 2]);
  });

  // 깃발
  const flagGeo = new THREE.PlaneGeometry(0.82, 0.48, 12, 1);
  const flag = new THREE.Mesh(flagGeo, new THREE.MeshBasicMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
  flag.position.set(0.34, 4.28, 0);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.62, 8), brassMat);
  pole.position.set(-0.1, 4.22, 0);
  ship.add(flag, pole);
  const flagBase = Float32Array.from(flagGeo.attributes.position.array);

  // 오크통
  [[0.55, 0.28], [0.75, -0.22], [0.2, -0.3]].forEach(([x, z]) => {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.115, 0.3, 12), hullMat);
    barrel.position.set(x, 0.61, z);
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.014, 6, 16), brassMat);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.set(x, 0.61, z);
    ship.add(barrel, hoop);
  });

  // ----- 다윈 (자연스러운 비례의 세련된 탐험가 실루엣) -----
  const dw = new THREE.Group();
  dw.position.set(1.5, 0.45, 0.42);
  dw.scale.setScalar(1.08);

  const coatMat = pbr(0x1e3a5f, { roughness: 0.55 });
  const pantsMat = pbr(0x111827, { roughness: 0.65 });
  const skinMat = pbr(0xeec09b, { roughness: 0.55 });
  const beardMat = pbr(0xdbe2ea, { roughness: 0.78 });
  const hatMat = pbr(0x0f172a, { roughness: 0.4, clearcoat: 0.3 });

  [-1, 1].forEach((side) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.36, 10), pantsMat);
    leg.position.set(0, 0.2, side * 0.07);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.09), trimDark);
    boot.position.set(0.025, 0.04, side * 0.07);
    dw.add(leg, boot);
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.34, 8, 14), coatMat);
  torso.position.set(0, 0.62, 0);
  dw.add(torso);
  [0.72, 0.62, 0.52].forEach((y) => {
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), brassMat);
    btn.position.set(0.142, y, 0);
    dw.add(btn);
  });
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 16), pbr(0xf8fafc, { roughness: 0.6 }));
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0.02, 0.85, 0);
  dw.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 18, 14), skinMat);
  head.position.set(0, 1.02, 0);
  dw.add(head);

  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 12), beardMat);
  beard.position.set(0.05, 0.9, 0);
  beard.scale.set(0.75, 1.15, 0.95);
  dw.add(beard);

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.22, 18), hatMat);
  crown.position.set(0, 1.24, 0);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.024, 22), hatMat);
  brim.position.set(0, 1.14, 0);
  const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.112, 0.036, 18), brassMat);
  hatBand.position.set(0, 1.16, 0);
  dw.add(crown, brim, hatBand);

  // 황동 망원경을 든 팔
  const scope = new THREE.Group();
  scope.position.set(0.06, 0.78, 0.15);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.24, 6, 10), coatMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.16, 0, 0);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), skinMat);
  hand.position.set(0.36, 0, 0);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.46, 12), brassMat);
  tube.rotation.z = Math.PI / 2;
  tube.position.set(0.58, 0, 0);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.06, 14), brassMat);
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.83, 0, 0);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.065, 14),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
  );
  glass.rotation.z = Math.PI / 2;
  glass.position.set(0.83, 0, 0);
  scope.add(arm, hand, tube, lens, glass);
  scope.rotation.z = 0.28;
  dw.add(scope);

  const arm2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 6, 10), coatMat);
  arm2.position.set(0.01, 0.64, -0.17);
  arm2.rotation.x = 0.28;
  dw.add(arm2);

  ship.add(dw);

  ship.userData = { sails, flag: { mesh: flag, geo: flagGeo, base: flagBase }, darwin: dw, scope, head };
  return ship;
}

export function animateShip(ship, t) {
  const u = ship.userData;
  u.sails.forEach((s, idx) => {
    const pos = s.geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = s.base[i * 3];
      const y = s.base[i * 3 + 1];
      pos.setZ(i, s.base[i * 3 + 2] + Math.sin(t * 1.7 + x * 2.2 + y * 1.1 + idx) * 0.04);
    }
    pos.needsUpdate = true;
    s.geo.computeVertexNormals();
  });

  const fp = u.flag.geo.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = u.flag.base[i * 3];
    fp.setZ(i, Math.sin(t * 7 - x * 9) * 0.07 * (0.3 + (x + 0.4)));
  }
  fp.needsUpdate = true;

  u.scope.rotation.y = Math.sin(t * 0.75) * 0.36;
  u.scope.rotation.z = 0.28 + Math.sin(t * 1.1) * 0.05;
  u.head.rotation.y = Math.sin(t * 0.75) * 0.22;
  u.darwin.position.y = 0.45 + Math.sin(t * 1.7) * 0.01;
}

/* =========================================================
 * 갈라파고스 핀치 (자연스러운 비례의 세련된 3D 새)
 * ========================================================= */
export function buildFinch(beak = 1, color = 0x6b5b3e) {
  const g = new THREE.Group();
  const bodyMat = pbr(color, { roughness: 0.55, clearcoat: 0.2 });
  const bellyMat = pbr(new THREE.Color(color).lerp(new THREE.Color(0xf6e6c5), 0.55), { roughness: 0.6 });
  const beakMat = pbr(0xd97706, { roughness: 0.3, clearcoat: 0.5 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14), bodyMat);
  body.scale.set(1.25, 0.92, 0.88);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), bellyMat);
  belly.position.set(0.06, -0.06, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 14), bodyMat);
  head.position.set(0.21, 0.14, 0);
  const beakMesh = new THREE.Mesh(new THREE.ConeGeometry(0.044 * beak, 0.13 * (0.7 + beak * 0.5), 12), beakMat);
  beakMesh.rotation.z = -Math.PI / 2;
  beakMesh.position.set(0.32 + 0.03 * beak, 0.13, 0);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 10), bodyMat);
  tail.rotation.z = Math.PI / 2 + 0.18;
  tail.position.set(-0.34, 0.05, 0);
  g.add(body, belly, head, beakMesh, tail);

  const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, clearcoat: 1.0 });
  const wingMat = pbr(new THREE.Color(color).multiplyScalar(0.72), { roughness: 0.5 });
  const legMat = pbr(0x78350f, { roughness: 0.6 });
  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), eyeMat);
    eye.position.set(0.28, 0.175, side * 0.085);
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), wingMat);
    wing.scale.set(1.15, 0.52, 0.24);
    wing.position.set(-0.04, 0.03, side * 0.17);
    wing.rotation.z = -0.2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), legMat);
    leg.position.set(0.02, -0.25, side * 0.065);
    g.add(eye, wing, leg);
  });
  return g;
}

/* =========================================================
 * 황혼빛 대양 하늘 돔, 태양, 은은한 구름, 갈매기
 * ========================================================= */
export function buildSky({
  top = 0x09162d,
  mid = 0x1b3a63,
  horizon = 0xd98a5b,
} = {}) {
  const group = new THREE.Group();
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      mid: { value: new THREE.Color(mid) },
      horizon: { value: new THREE.Color(horizon) },
      sunDir: { value: new THREE.Vector3(0.42, 0.24, -0.87).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top;
      uniform vec3 mid;
      uniform vec3 horizon;
      uniform vec3 sunDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 c = mix(horizon, mid, smoothstep(0.0, 0.26, h));
        c = mix(c, top, smoothstep(0.22, 0.78, h));
        float sunAmt = max(dot(normalize(vDir), sunDir), 0.0);
        c += vec3(1.0, 0.72, 0.38) * pow(sunAmt, 12.0) * 0.45;
        c += vec3(1.0, 0.92, 0.72) * pow(sunAmt, 96.0) * 0.9;
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(135, 32, 20), mat);
  sky.renderOrder = -20;
  sky.frustumCulled = false;
  group.add(sky);

  // 상단 밤하늘 별빛
  const starCount = 150;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.34;
    const r = 115 + Math.random() * 12;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi) + 8;
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  group.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        map: glowTexture(),
        color: 0xfef3c7,
        size: 0.75,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        fog: false,
        blending: THREE.AdditiveBlending,
      })
    )
  );
  return group;
}

export function buildSun() {
  const s = makeGlowSprite(0xffd28a, 44, 0.82);
  s.material.fog = false;
  return s;
}

export function buildCloud() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe2c7b8,
    emissive: 0x3b2a3e,
    emissiveIntensity: 0.25,
    roughness: 0.95,
    transparent: true,
    opacity: 0.55,
  });
  [
    [0, 0, 0, 2.2],
    [2.1, -0.25, 0.2, 1.5],
    [-2.0, -0.3, -0.1, 1.5],
    [0.9, 0.45, 0, 1.3],
  ].forEach(([x, y, z, r]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat);
    m.position.set(x, y, z);
    m.scale.set(1.3, 0.42, 0.8);
    g.add(m);
  });
  return g;
}

export function buildGull() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6, side: THREE.DoubleSide });
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.14, 0.45);
  shape.lineTo(-0.04, 0.95);
  shape.lineTo(-0.16, 0.45);
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);
  const wingR = new THREE.Mesh(geo, mat);
  const wingL = new THREE.Mesh(geo, mat);
  wingL.scale.z = -1;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat);
  body.scale.set(2.2, 0.75, 0.75);
  g.add(wingR, wingL, body);
  g.userData = { wingR, wingL };
  g.scale.setScalar(1.35);
  return g;
}

/* =========================================================
 * 항구 & 갈라파고스 섬 소품 (세련된 저다각형 PBR)
 * ========================================================= */
export function buildBeaconBuoy() {
  const g = new THREE.Group();
  const baseMat = pbr(0x1e293b, { roughness: 0.35, metalness: 0.65 });
  const brassMat = pbr(0xe5b84b, { roughness: 0.25, metalness: 0.82 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 0.28, 12), baseMat);
  base.position.y = 0.14;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 8, 20), brassMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.28;
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.48, 6), baseMat);
  cage.position.y = 0.52;
  const orbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), orbMat);
  orb.position.y = 0.88;
  const glow = makeGlowSprite(0x38bdf8, 1.35, 0.75);
  glow.position.y = 0.88;
  g.add(base, ring, cage, orb, glow);
  g.userData = { orbMat, glow };
  return g;
}

export function buildPalm(h = 1.8) {
  const g = new THREE.Group();
  const trunkMat = pbr(0x5c3d24, { roughness: 0.82, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.085 - i * 0.012, 0.105 - i * 0.012, h / 4 + 0.03, 8), trunkMat);
    seg.position.set(i * 0.08, (i + 0.5) * (h / 4), 0);
    seg.rotation.z = -0.08;
    g.add(seg);
  }
  const top = new THREE.Group();
  top.position.set(0.32, h, 0);
  for (let i = 0; i < 7; i++) {
    const leafMat = pbr(i % 2 ? 0x166534 : 0x15803d, { roughness: 0.65, flatShading: true });
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 5), leafMat);
    leaf.scale.z = 0.22;
    leaf.position.set(0.52, -0.05, 0);
    leaf.rotation.z = -Math.PI / 2 - 0.45;
    const holder = new THREE.Group();
    holder.rotation.y = (i / 7) * Math.PI * 2;
    holder.add(leaf);
    top.add(holder);
  }
  g.add(top);
  return g;
}

export function buildCactus(h = 0.9) {
  const g = new THREE.Group();
  const mat = pbr(0x1f6e43, { roughness: 0.72, flatShading: true });
  const main = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, h, 6, 8), mat);
  main.position.y = h / 2 + 0.1;
  g.add(main);
  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.22, 6, 8), mat);
    arm.position.set(side * 0.19, h * 0.55 + (side > 0 ? 0.12 : 0), 0);
    g.add(arm);
    const link = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.1, 6, 8), mat);
    link.rotation.z = Math.PI / 2;
    link.position.set(side * 0.095, h * 0.45 + (side > 0 ? 0.12 : 0), 0);
    g.add(link);
  });
  return g;
}

export function buildRock(r = 0.4, color = 0x334155) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), pbr(color, { roughness: 0.88, flatShading: true }));
  m.scale.y = 0.68;
  return m;
}

export function buildLighthouse() {
  const g = new THREE.Group();
  const stoneMat = pbr(0xcbd5e1, { roughness: 0.65 });
  const bandMat = pbr(0x991b1b, { roughness: 0.55 });
  const brassMat = pbr(0xe5b84b, { roughness: 0.25, metalness: 0.8 });
  [stoneMat, bandMat, stoneMat, bandMat].forEach((m, i) => {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.4 - i * 0.048, 0.45 - i * 0.048, 0.65, 16), m);
    seg.position.y = 0.32 + i * 0.65;
    g.add(seg);
  });
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 14), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  lamp.position.y = 2.75;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.42, 14), brassMat);
  cap.position.y = 3.12;
  const glow = makeGlowSprite(0xfde047, 3.6, 0.85);
  glow.position.y = 2.75;
  g.add(lamp, cap, glow);
  return g;
}

export function buildCottage() {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.72, 0.9), pbr(0xd6cfc2, { roughness: 0.8 }));
  wall.position.y = 0.36;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.58, 4), pbr(0x475569, { roughness: 0.75 }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 1.01;
  const win = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.04), new THREE.MeshBasicMaterial({ color: 0xfde68a }));
  win.position.set(0.22, 0.4, 0.46);
  g.add(wall, roof, win);
  return g;
}

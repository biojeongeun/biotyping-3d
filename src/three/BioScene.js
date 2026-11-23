import * as THREE from 'three';
import { TAXONOMY_STAGE } from '../data/taxonomy.js';
import { METABOLISM_STAGE } from '../data/metabolism.js';
import { BIOTECH_STAGE } from '../data/biotech.js';
import {
  buildShip,
  animateShip,
  buildFinch,
  buildSky,
  buildSun,
  buildCloud,
  buildGull,
  buildBeaconBuoy,
  buildPalm,
  buildCactus,
  buildRock,
  buildLighthouse,
  buildCottage,
} from './voyageAssets.js';
import {
  glowTexture,
  makeGlowSprite,
  makeGameTag,
  buildSanctuarySky,
  buildSanctuaryFloor,
  buildAncientTrunk,
  buildCrystalNode,
  buildLockedNode,
  buildTargetReticle,
} from './treeAssets.js';
import {
  buildCellBackdrop,
  buildMitochondrion,
  buildChloroplast,
  buildCycleStreams,
} from './metabolismAssets.js';
import {
  buildLabBackdrop,
  buildPlasmidExhibit,
  buildEnzymeExhibit,
  buildCrisprPcrExhibit,
  buildCellAntibodyExhibit,
  buildTherapyGmoExhibit,
} from './biotechAssets.js';

export class BioScene {
  constructor(canvas) {
    this.canvas = canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xeef3f9);
    this.scene.fog = new THREE.FogExp2(0xeef3f9, 0.018);

    this.camera = new THREE.PerspectiveCamera(
      46,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.camera.position.set(0, 4.5, 14);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.targetCamPos = new THREE.Vector3(0, 4.2, 13.5);
    this.targetLookAt = new THREE.Vector3(0, 0.4, 0);
    this.currentLookAt = new THREE.Vector3(0, 0.4, 0);

    this.stageGroup = new THREE.Group();
    this.scene.add(this.stageGroup);

    this.ambientParticles = [];
    this.animatedParts = [];
    this.clock = new THREE.Clock();

    this.dna = null;
    this.voyage = null;
    this.tree = null;
    this.meta = null;
    this.biotech = null;
    this.grid = null;
    this.isPlaying = false;
    this.activePair = -1;

    this._setupLights();
    this._setupEnvironment();
    this._bindResize();
    this.loadStage('stage1');
    this._animate();
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.25);
    hemi.position.set(0, 20, 0);
    this.scene.add(hemi);
    this.hemi = hemi;

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(8, 14, 10);
    this.scene.add(keyLight);
    this.keyLight = keyLight;

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.75);
    rimLight.position.set(-10, 6, -8);
    this.scene.add(rimLight);

    const fillLight = new THREE.PointLight(0x5eead4, 0.45, 35);
    fillLight.position.set(0, -4, 6);
    this.scene.add(fillLight);
  }

  _setupEnvironment() {
    const grid = new THREE.GridHelper(48, 36, 0xcbd5e1, 0xe2e8f0);
    grid.position.y = -4.2;
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    this.scene.add(grid);
    this.grid = grid;

    const geo = new THREE.SphereGeometry(0.12, 12, 12);
    const colors = [0x93c5fd, 0x99f6e4, 0xc4b5fd, 0xfde68a];
    for (let i = 0; i < 36; i++) {
      const mat = new THREE.MeshPhysicalMaterial({
        color: colors[i % colors.length],
        roughness: 0.25,
        transparent: true,
        opacity: 0.45,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 26,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 18 - 3
      );
      const scale = 0.5 + Math.random() * 1.1;
      mesh.scale.setScalar(scale);
      this.scene.add(mesh);
      this.ambientParticles.push({
        mesh,
        baseY: mesh.position.y,
        speed: 0.4 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  _bindResize() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _clearStage() {
    while (this.stageGroup.children.length > 0) {
      this.stageGroup.remove(this.stageGroup.children[0]);
    }
    this.animatedParts = [];
    this.dna = null;
    this.voyage = null;
    this.tree = null;
    this.meta = null;
    this.biotech = null;
    this.activePair = -1;
  }

  loadStage(stageId) {
    this.isPlaying = false;
    this._clearStage();
    this.stageGroup.rotation.set(0, 0, 0);
    this._setTheme(stageId);
    this.setOverview(stageId);

    switch (stageId) {
      case 'stage1':
        // 시작 화면 미리보기용 샘플 이중나선 (30염기쌍)
        this.buildDNAModel('ATGCGTACCTAGGCTAATCGGATCCGTAAT'.split(''), { revealAll: true });
        break;
      case 'stage2':
        this.buildVoyageScene(10, { preview: true });
        break;
      case 'stage3':
        this.buildTreeScene(TAXONOMY_STAGE, { preview: true });
        break;
      case 'stage4':
        this.buildMetabolismScene(METABOLISM_STAGE, { preview: true });
        break;
      case 'stage5':
        this.buildBiotechScene(BIOTECH_STAGE, { preview: true });
        break;
      default:
        this.buildDNAModel('ATGCGTACCTAGGCTAATCGGATCCGTAAT'.split(''), { revealAll: true });
    }
  }

  /* =========================================================
   * STAGE 1: 통합과학 1 - DNA 이중나선 & 염기 상보적 결합 (A-T, G-C)
   * ========================================================= */
  _baseColor(base) {
    return { A: 0xef4444, T: 0x3b82f6, G: 0x10b981, C: 0xf59e0b }[base] ?? 0x94a3b8;
  }

  _makeLabelSprite(text, color = '#ffffff') {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.font = 'bold 92px Pretendard, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 + 6);
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.44, 0.44, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  _stick(a, b, radius, material) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 8), material);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  /**
   * DNA 이중나선 생성.
   * - 오른쪽 가닥(strand 0): 주어진 염기서열(문제)
   * - 왼쪽 가닥(strand 1): 상보 염기(정답). revealAll=false 이면 '?' 로 비워 둠
   */
  buildDNAModel(sequence, { revealAll = false } = {}) {
    this._clearStage();
    this.stageGroup.rotation.set(0, 0, 0);

    const n = sequence.length;
    const R_BASE = 0.6;
    const R_BACK = 1.05;
    const STEP = 0.36;
    const TWIST = 0.55;
    const offset = ((n - 1) * STEP) / 2;

    const backMats = [
      new THREE.MeshPhysicalMaterial({ color: 0x2563eb, roughness: 0.25, clearcoat: 0.8 }),
      new THREE.MeshPhysicalMaterial({ color: 0x0d9488, roughness: 0.25, clearcoat: 0.8 }),
    ];
    const stickMat = new THREE.MeshStandardMaterial({ color: 0xb6c2d2, roughness: 0.4 });
    const rungMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35 });
    const backGeo = new THREE.SphereGeometry(0.11, 14, 14);
    const baseGeo = new THREE.SphereGeometry(0.22, 24, 24);

    this.dna = { n, sequence: [...sequence], pairs: [] };
    const prevBack = [null, null];

    for (let i = 0; i < n; i++) {
      const angle = i * TWIST;
      const y = i * STEP - offset;
      const dirs = [
        [Math.cos(angle), Math.sin(angle)],
        [-Math.cos(angle), -Math.sin(angle)],
      ];
      const basePositions = [];

      for (let s = 0; s < 2; s++) {
        const [dx, dz] = dirs[s];
        const backPos = new THREE.Vector3(dx * R_BACK, y, dz * R_BACK);
        const basePos = new THREE.Vector3(dx * R_BASE, y, dz * R_BASE);
        basePositions.push(basePos);

        const back = new THREE.Mesh(backGeo, backMats[s]);
        back.position.copy(backPos);
        this.stageGroup.add(back);
        this.stageGroup.add(this._stick(backPos, basePos, 0.035, stickMat));
        if (prevBack[s]) {
          this.stageGroup.add(this._stick(prevBack[s], backPos, 0.05, backMats[s]));
        }
        prevBack[s] = backPos;
      }

      // 수소결합(가운데 연결선)
      this.stageGroup.add(this._stick(basePositions[0], basePositions[1], 0.03, rungMat));

      // 문제 염기 (오른쪽)
      const tplBase = sequence[i];
      const tplMesh = new THREE.Mesh(
        baseGeo,
        new THREE.MeshPhysicalMaterial({ color: this._baseColor(tplBase), roughness: 0.2, clearcoat: 0.85 })
      );
      tplMesh.position.copy(basePositions[0]);
      const tplLabel = this._makeLabelSprite(tplBase);
      tplLabel.position.copy(basePositions[0]);
      this.stageGroup.add(tplMesh, tplLabel);

      // 정답 염기 (왼쪽)
      const compMesh = new THREE.Mesh(
        baseGeo,
        new THREE.MeshPhysicalMaterial({
          color: 0x94a3b8,
          roughness: 0.3,
          transparent: true,
          opacity: 0.55,
        })
      );
      compMesh.position.copy(basePositions[1]);
      const pair = {
        angle,
        y,
        tplLabel,
        compMesh,
        compLabel: this._makeLabelSprite('?', '#475569'),
        solved: false,
        wrongUntil: 0,
        popStart: 0,
      };
      pair.compLabel.position.copy(basePositions[1]);
      this.stageGroup.add(compMesh, pair.compLabel);
      this.dna.pairs.push(pair);
    }

    if (revealAll) {
      for (let i = 0; i < n; i++) this.solvePair(i, true);
    }
  }

  setOverview(stageId = 'stage1') {
    this.activePair = -1;
    if (stageId === 'stage1') {
      this.targetCamPos.set(0, 1.2, 17);
      this.targetLookAt.set(0, 0, 0);
    } else if (stageId === 'stage5') {
      const d = Math.min(36, 20.5 * Math.max(1, 1.7 / this.camera.aspect));
      this.targetCamPos.set(0, 2.2, d);
      this.targetLookAt.set(0, 0.7, 0);
    } else if (stageId === 'stage4') {
      const d = Math.min(34, 19.5 * Math.max(1, 1.7 / this.camera.aspect));
      this.targetCamPos.set(0, 1.4, d);
      this.targetLookAt.set(0, 0.1, 0);
    } else if (stageId === 'stage3') {
      const d = Math.min(50, 30 * Math.max(1, 1.75 / this.camera.aspect));
      this.targetCamPos.set(7.5, 2, d);
      this.targetLookAt.set(7.5, 0.3, 0);
    } else if (stageId === 'stage2') {
      this.targetCamPos.set(0, 7, 27);
      this.targetLookAt.set(0, 0.5, 0);
    } else {
      this.targetCamPos.set(0, 4.2, 13.5);
      this.targetLookAt.set(0, 0.3, 0);
    }
  }

  startDNAGame(sequence) {
    this.buildDNAModel(sequence, { revealAll: false });
    this.isPlaying = true;
    this.setOverview('stage1');
  }

  endDNAGame() {
    this.isPlaying = false;
    this.activePair = -1;
  }

  focusPair(i) {
    if (!this.dna || !this.dna.pairs[i]) return;
    this.activePair = i;
    const p = this.dna.pairs[i];
    this.targetLookAt.set(0, p.y, 0);
    this.targetCamPos.set(0, p.y + 0.5, 7.4);
  }

  solvePair(i, instant = false) {
    const p = this.dna?.pairs[i];
    if (!p || p.solved) return;
    p.solved = true;
    const comp = { A: 'T', T: 'A', G: 'C', C: 'G' }[this.dna.sequence[i]];
    p.compMesh.material.color.setHex(this._baseColor(comp));
    p.compMesh.material.opacity = 1;
    p.compMesh.material.transparent = false;
    p.compMesh.scale.setScalar(1);

    const pos = p.compLabel.position.clone();
    this.stageGroup.remove(p.compLabel);
    p.compLabel.material.map.dispose();
    p.compLabel.material.dispose();
    p.compLabel = this._makeLabelSprite(comp);
    p.compLabel.position.copy(pos);
    this.stageGroup.add(p.compLabel);

    if (!instant) p.popStart = performance.now();
  }

  flashWrong(i) {
    const p = this.dna?.pairs[i];
    if (p) p.wrongUntil = performance.now() + 380;
  }

  _updateDNAVisuals(elapsed) {
    if (!this.dna) return;
    const now = performance.now();
    const v = new THREE.Vector3();
    this.dna.pairs.forEach((p, idx) => {
      // 뒤쪽 염기 글자는 흐리게 표시해 겹침 완화
      [p.tplLabel, p.compLabel].forEach((label) => {
        label.getWorldPosition(v);
        const t = Math.min(1, Math.max(0, (v.z + 1) / 2));
        label.material.opacity = 0.18 + 0.82 * t;
      });

      if (!p.solved) {
        if (now < p.wrongUntil) {
          p.compMesh.material.color.setHex(0xef4444);
          p.compMesh.material.opacity = 0.95;
        } else {
          p.compMesh.material.color.setHex(0x94a3b8);
          p.compMesh.material.opacity = 0.55;
        }
        if (idx === this.activePair) {
          p.compMesh.scale.setScalar(1.25 + Math.sin(elapsed * 7) * 0.12);
        } else {
          p.compMesh.scale.setScalar(1);
        }
      } else if (p.popStart && now - p.popStart < 300) {
        const k = (now - p.popStart) / 300;
        p.compMesh.scale.setScalar(1 + Math.sin(k * Math.PI) * 0.5);
      } else {
        p.compMesh.scale.setScalar(1);
      }
    });
  }


  /* =========================================================
   * STAGE 2: 통합과학 2 - 다윈의 비글호 항해 & 갈라파고스제도
   * ========================================================= */
  _makeTextSprite(text, { w = 512, h = 128, font = 'bold 56px Pretendard, sans-serif', color = '#0f172a', bg = 'rgba(255,255,255,0.92)', border = 'rgba(20,33,61,0.9)', scale = 0.011 } = {}) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const r = 30;
    const pad = 5;
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.arcTo(w - pad, pad, w - pad, h - pad, r);
    ctx.arcTo(w - pad, h - pad, pad, h - pad, r);
    ctx.arcTo(pad, h - pad, pad, pad, r);
    ctx.arcTo(pad, pad, w - pad, pad, r);
    ctx.closePath();
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = border;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2 + 3);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(w * scale, h * scale, 1);
    return sprite;
  }

  _setTheme(stageId) {
    const themes = {
      stage2: { bg: 0x162b46, fog: 0.0095, sky: 0x93c5fd, ground: 0x0b1f33, hemi: 1.0, key: 0xffd29d, keyI: 1.85 },
      stage3: { bg: 0x0b2033, fog: 0.0085, sky: 0x7dd3fc, ground: 0x071826, hemi: 0.95, key: 0xe0f2fe, keyI: 1.35 },
      stage4: { bg: 0x081928, fog: 0.007, sky: 0xa5f3fc, ground: 0x06131f, hemi: 1.05, key: 0xfff7ed, keyI: 1.45 },
      stage5: { bg: 0x071024, fog: 0.0075, sky: 0x93c5fd, ground: 0x050b18, hemi: 1.0, key: 0xe0e7ff, keyI: 1.45 },
    };
    const t = themes[stageId];
    const scenic = Boolean(t);
    const bg = t ? t.bg : 0xeef3f9;
    this.scene.background.setHex(bg);
    this.scene.fog.color.setHex(bg);
    this.scene.fog.density = t ? t.fog : 0.018;
    if (this.grid) this.grid.visible = !scenic;
    this.ambientParticles.forEach((p) => {
      p.mesh.visible = !scenic;
    });
    if (this.hemi) {
      this.hemi.color.setHex(t ? t.sky : 0xffffff);
      this.hemi.groundColor.setHex(t ? t.ground : 0xcbd5e1);
      this.hemi.intensity = t ? t.hemi : 1.25;
    }
    if (this.keyLight) {
      this.keyLight.color.setHex(t ? t.key : 0xffffff);
      this.keyLight.intensity = t ? t.keyI : 1.35;
    }
  }

  buildVoyageScene(count, { preview = false } = {}) {
    this._clearStage();
    this.stageGroup.rotation.set(0, 0, 0);
    this._setTheme('stage2');
    const group = this.stageGroup;

    // 하늘, 해, 구름, 갈매기
    group.add(buildSky());
    const sun = buildSun();
    sun.position.set(38, 26, -85);
    group.add(sun);

    const clouds = [];
    for (let i = 0; i < 11; i++) {
      const cloud = buildCloud();
      cloud.position.set(-85 + i * 17 + (i % 3) * 4, 15 + (i % 4) * 3.2, -55 - (i % 5) * 8);
      cloud.scale.setScalar(1.6 + (i % 3) * 0.8);
      cloud.userData.speed = 0.35 + (i % 4) * 0.12;
      group.add(cloud);
      clouds.push(cloud);
    }
    const gulls = [];
    for (let i = 0; i < 3; i++) {
      const gull = buildGull();
      group.add(gull);
      gulls.push(gull);
    }

    // 바다 (황혼빛을 반사하는 PBR 물결)
    const seaGeo = new THREE.PlaneGeometry(240, 150, 120, 75);
    seaGeo.rotateX(-Math.PI / 2);
    seaGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(seaGeo.attributes.position.count * 3), 3));
    const sea = new THREE.Mesh(
      seaGeo,
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.18,
        metalness: 0.25,
        clearcoat: 0.85,
        flatShading: true,
      })
    );
    sea.position.set(0, -0.05, -45);
    group.add(sea);

    // 항로 (발광 항해 경로)
    const waypoints = [];
    for (let k = 0; k <= count; k++) {
      waypoints.push(new THREE.Vector3(-15 + (k * 24) / count, 0, 1.2 * Math.sin(k * 0.9) + 1.0));
    }
    const curve = new THREE.CatmullRomCurve3(waypoints);
    const routeTube = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(curve.getPoints(48).map((p) => p.clone().setY(0.32))),
        72,
        0.055,
        6
      ),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    group.add(routeTube);

    // 출발 항구 (영국 플리머스 항)
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0x2a4534, roughness: 0.88, flatShading: true });
    const woodMat = new THREE.MeshPhysicalMaterial({ color: 0x6b4423, roughness: 0.65 });
    const hill = new THREE.Mesh(new THREE.SphereGeometry(3.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), cliffMat);
    hill.scale.set(1.3, 0.62, 1);
    hill.position.set(-19.5, -0.1, -1);
    group.add(hill);
    const lighthouse = buildLighthouse();
    lighthouse.position.set(-18.4, 0.9, -1.2);
    group.add(lighthouse);
    const cottage = buildCottage();
    cottage.position.set(-21.2, 1.0, 0.3);
    group.add(cottage);
    const palmPort = buildPalm(1.5);
    palmPort.position.set(-16.6, 0.75, -2.4);
    group.add(palmPort);
    const dock = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 1.2), woodMat);
    dock.position.set(-16.6, 0.2, 1.2);
    group.add(dock);
    [-1, 0, 1].forEach((i) => {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.7, 8), woodMat);
      pile.position.set(-16.6 + i * 1.5, 0.0, 1.75);
      group.add(pile);
    });
    const portLabel = makeGameTag('영국 플리머스 항', { accent: '#fbbf24', sub: 'DEPARTURE', scale: 0.0055 });
    portLabel.position.set(-19.4, 4.9, -2.2);
    group.add(portLabel);

    // 항해 지점 발광 부표(비컨) + 다크글래스 라벨
    const buoys = [];
    for (let k = 0; k < count; k++) {
      const wp = waypoints[k + 1];
      const buoy = buildBeaconBuoy();
      buoy.position.set(wp.x, 0, wp.z - 2.3);
      group.add(buoy);
      const label = makeGameTag(`STEP ${String(k + 1).padStart(2, '0')}`, {
        accent: '#38bdf8',
        scale: 0.0044,
      });
      label.position.set(wp.x, 1.95, wp.z - 2.3);
      group.add(label);
      buoys.push({ group: buoy, label, solved: false });
    }

    // 갈라파고스제도 (현무암 화산섬 + 용암 글로우)
    const rings = [];
    const addRing = (x, z, r, sx = 1.2) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r * 1.0, r * 1.32, 48).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      ring.scale.x = sx;
      ring.position.set(x, 0.35, z);
      group.add(ring);
      rings.push({ mesh: ring, phase: rings.length * 1.1 });
    };
    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x3b3532, roughness: 0.92, flatShading: true });
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x2d5a3c, roughness: 0.85, flatShading: true });
    const islandDefs = [
      { x: 15.5, z: -3, r: 2.6, h: 1.7 },
      { x: 19.2, z: -6.2, r: 3.3, h: 2.8 },
      { x: 21.8, z: -1.2, r: 2.1, h: 1.3 },
      { x: 13.2, z: -8.5, r: 2.0, h: 1.1 },
    ];
    islandDefs.forEach((d) => {
      const rock = new THREE.Mesh(new THREE.SphereGeometry(d.r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), basaltMat);
      rock.scale.set(1.2, d.h / d.r, 1);
      rock.position.set(d.x, -0.1, d.z);
      const grass = new THREE.Mesh(new THREE.SphereGeometry(d.r * 0.88, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), mossMat);
      grass.scale.set(1.2, (d.h / d.r) * 1.05, 1);
      grass.position.set(d.x, -0.05, d.z);
      group.add(rock, grass);
      addRing(d.x, d.z, d.r);
    });
    const volcano = new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.3, 12), basaltMat);
    volcano.position.set(19.2, 2.7, -6.2);
    const crater = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.08, 14),
      new THREE.MeshBasicMaterial({ color: 0xff7a2f })
    );
    crater.position.set(19.2, 3.82, -6.2);
    const lavaGlow = makeGlowSprite(0xf97316, 4.2, 0.72);
    lavaGlow.position.set(19.2, 4.1, -6.2);
    group.add(volcano, crater, lavaGlow);
    [[14.2, -2.9, 1.0], [16.6, -3.6, 0.9], [20.4, -1.0, 0.7], [18.4, -3.8, 1.1]].forEach(([x, z, h]) => {
      const cactus = buildCactus(h);
      cactus.position.set(x, 0.9, z);
      group.add(cactus);
    });
    [[22.6, -1.6], [15.8, -5.4], [13.0, -7.4]].forEach(([x, z], i) => {
      const palm = buildPalm(1.6 + i * 0.2);
      palm.position.set(x, 0.6, z);
      palm.rotation.y = i * 1.7;
      group.add(palm);
    });
    [[16.9, -1.0, 0.45], [20.6, -4.1, 0.55], [11.0, -4.0, 0.4]].forEach(([x, z, r]) => {
      const rk = buildRock(r);
      rk.position.set(x, 0.2, z);
      group.add(rk);
    });
    const islandLabel = makeGameTag('갈라파고스제도', { accent: '#fb923c', sub: 'DESTINATION', scale: 0.0062 });
    islandLabel.position.set(18.5, 6.6, -4);
    group.add(islandLabel);

    // 핀치가 사는 해변 섬
    const beach = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0xd6b984, roughness: 0.92, flatShading: true })
    );
    beach.scale.set(1.6, 0.3, 1.1);
    beach.position.set(12.4, -0.05, 0.4);
    group.add(beach);
    addRing(12.4, 0.4, 1.8, 1.6);
    const palmA = buildPalm(1.7);
    palmA.position.set(14.2, 0.2, -0.4);
    const palmB = buildPalm(1.4);
    palmB.position.set(10.7, 0.2, -0.1);
    palmB.rotation.y = 3;
    group.add(palmA, palmB);
    const beachRock = buildRock(0.35, 0x9aa0a8);
    beachRock.position.set(13.6, 0.25, 1.5);
    group.add(beachRock);

    // 핀치들 (섬마다 먹이가 달라 부리 모양이 서로 다른 핀치)
    const finchDefs = [
      { beak: 2.2, color: 0x6b4f35, x: 11.5, z: 1.0, ry: 0.4 },
      { beak: 0.6, color: 0xb59b3c, x: 12.3, z: 1.5, ry: -0.2 },
      { beak: 1.3, color: 0x7a5c3d, x: 13.0, z: 0.6, ry: 0.9 },
      { beak: 1.7, color: 0x3f4350, x: 13.6, z: 1.2, ry: -0.6 },
      { beak: 0.9, color: 0xc2833a, x: 12.5, z: -0.2, ry: 0.1 },
    ];
    const finches = finchDefs.map((d, i) => {
      const f = buildFinch(d.beak, d.color);
      f.scale.setScalar(1.45);
      f.position.set(d.x, 0.55, d.z);
      f.rotation.y = d.ry;
      f.visible = false;
      group.add(f);
      return { mesh: f, baseY: 0.55, phase: i * 1.3, shownAt: 0 };
    });

    // 배 (+ 다윈)
    const ship = buildShip();
    ship.scale.setScalar(1.1);
    ship.position.copy(waypoints[0]);
    group.add(ship);

    // 물보라 풀
    const wake = [];
    for (let i = 0; i < 22; i++) {
      const w = new THREE.Mesh(
        new THREE.CircleGeometry(0.5, 20).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })
      );
      w.visible = false;
      group.add(w);
      wake.push({ mesh: w, life: 99 });
    }

    this.voyage = {
      count,
      waypoints,
      curve,
      sea,
      seaGeo,
      seaBase: Float32Array.from(seaGeo.attributes.position.array),
      ship,
      buoys,
      finches,
      clouds,
      gulls,
      rings,
      wake,
      wakeTimer: 0,
      progress: 0,
      targetIndex: 0,
      follow: false,
      arrived: false,
      shakeUntil: 0,
    };
    this._updateShipTransform(0);

    if (preview) this.showFinches(true);
  }

  startVoyage(count) {
    this.buildVoyageScene(count, { preview: false });
    this.isPlaying = true;
    this.setOverview('stage2');
  }

  endVoyage() {
    this.isPlaying = false;
    if (this.voyage) this.voyage.follow = false;
  }

  followShip() {
    if (this.voyage) this.voyage.follow = true;
  }

  advanceShip(k) {
    if (this.voyage) this.voyage.targetIndex = k;
  }

  markBuoy(k, term) {
    const b = this.voyage?.buoys[k];
    if (!b || b.solved) return;
    b.solved = true;
    if (b.group.userData?.orbMat) {
      b.group.userData.orbMat.color.setHex(0x4ade80);
      b.group.userData.glow.material.color.setHex(0x4ade80);
    }
    const pos = b.label.position.clone();
    this.stageGroup.remove(b.label);
    b.label.material.map.dispose();
    b.label.material.dispose();
    b.label = makeGameTag(term, {
      accent: '#4ade80',
      sub: `LOG ${String(k + 1).padStart(2, '0')}`,
      scale: 0.0046,
    });
    b.label.position.copy(pos);
    this.stageGroup.add(b.label);
  }

  wrongShake() {
    if (this.voyage) this.voyage.shakeUntil = performance.now() + 500;
  }

  showFinches(visible) {
    if (!this.voyage) return;
    this.voyage.finches.forEach((f) => {
      f.mesh.visible = visible;
      f.shownAt = performance.now();
    });
  }

  arriveAtGalapagos() {
    if (!this.voyage) return;
    this.voyage.arrived = true;
    this.voyage.follow = false;
    this.showFinches(true);
    this.targetCamPos.set(9.0, 3.2, 9.2);
    this.targetLookAt.set(12.6, 1.2, 0.4);
  }

  _updateShipTransform(elapsed) {
    const v = this.voyage;
    if (!v) return;
    const t = Math.min(1, Math.max(0, v.progress / v.count));
    const p = v.curve.getPointAt(t);
    const tan = v.curve.getTangentAt(t);
    const now = performance.now();
    let roll = Math.sin(elapsed * 1.3) * 0.05;
    let shakeX = 0;
    if (now < v.shakeUntil) {
      const k = (v.shakeUntil - now) / 500;
      roll += Math.sin(elapsed * 42) * 0.16 * k;
      shakeX = Math.sin(elapsed * 55) * 0.08 * k;
    }
    v.ship.position.set(p.x + shakeX, 0.3 + Math.sin(elapsed * 1.6) * 0.08, p.z);
    v.ship.rotation.set(Math.sin(elapsed * 0.9) * 0.025, Math.atan2(-tan.z, tan.x), roll, 'YXZ');
  }

  _updateVoyage(dt, elapsed) {
    const v = this.voyage;
    if (!v) return;

    // 바다 물결 + 높이별 색
    const arr = v.seaGeo.attributes.position.array;
    const col = v.seaGeo.attributes.color.array;
    const base = v.seaBase;
    const C = BioScene._seaColors;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i];
      const z = base[i + 2];
      const h =
        Math.sin(x * 0.45 + elapsed * 1.1) * 0.14 +
        Math.cos(z * 0.55 + elapsed * 0.9) * 0.12 +
        Math.sin((x + z) * 0.2 + elapsed * 0.6) * 0.1;
      arr[i + 1] = h;
      const t = Math.min(1, Math.max(0, (h + 0.36) / 0.72));
      let r = C.deep.r + (C.shallow.r - C.deep.r) * t;
      let g = C.deep.g + (C.shallow.g - C.deep.g) * t;
      let b = C.deep.b + (C.shallow.b - C.deep.b) * t;
      if (t > 0.84) {
        const f = ((t - 0.84) / 0.16) * 0.85;
        r += (C.foam.r - r) * f;
        g += (C.foam.g - g) * f;
        b += (C.foam.b - b) * f;
      }
      col[i] = r;
      col[i + 1] = g;
      col[i + 2] = b;
    }
    v.seaGeo.attributes.position.needsUpdate = true;
    v.seaGeo.attributes.color.needsUpdate = true;

    // 배 이동
    const diff = v.targetIndex - v.progress;
    const moving = Math.abs(diff) > 0.03;
    v.progress += Math.abs(diff) < 0.002 ? diff : diff * Math.min(1, dt * 2.4);
    this._updateShipTransform(elapsed);
    animateShip(v.ship, elapsed);

    // 물보라 꼬리
    v.wakeTimer -= dt;
    if (v.wakeTimer <= 0) {
      v.wakeTimer = moving ? 0.07 : 0.4;
      const free = v.wake.find((w) => w.life >= 1.5);
      if (free) {
        v.ship.updateMatrixWorld(true);
        const p = v.ship.localToWorld(new THREE.Vector3(-2.3, 0, (Math.random() - 0.5) * 0.8));
        free.mesh.position.set(p.x, 0.4, p.z);
        free.mesh.visible = true;
        free.life = 0;
      }
    }
    v.wake.forEach((w) => {
      if (w.life >= 1.5) return;
      w.life += dt;
      const k = w.life / 1.5;
      if (k >= 1) {
        w.mesh.visible = false;
        return;
      }
      w.mesh.scale.setScalar(0.5 + k * 2.0);
      w.mesh.material.opacity = 0.6 * (1 - k);
    });

    // 섬 물거품 링, 부표, 구름, 갈매기
    v.rings.forEach((r) => {
      const s = 1 + Math.sin(elapsed * 1.2 + r.phase) * 0.04;
      r.mesh.scale.z = s;
      r.mesh.material.opacity = 0.5 + Math.sin(elapsed * 1.5 + r.phase) * 0.15;
    });
    v.buoys.forEach((b, i) => {
      b.group.position.y = Math.sin(elapsed * 1.5 + i) * 0.08;
      b.group.rotation.z = Math.sin(elapsed * 1.2 + i) * 0.08;
    });
    v.clouds.forEach((c) => {
      c.position.x += dt * c.userData.speed;
      if (c.position.x > 95) c.position.x = -95;
    });
    v.gulls.forEach((g, i) => {
      const a = elapsed * (0.32 + i * 0.05) + i * 2.1;
      const cx = v.ship.position.x + 3;
      const R = 7 + i * 2;
      const x = cx + Math.cos(a) * R;
      const z = -4 + Math.sin(a) * R * 0.55;
      const vx = -Math.sin(a);
      const vz = Math.cos(a) * 0.55;
      g.position.set(x, 6.5 + i * 0.9 + Math.sin(elapsed * 1.3 + i) * 0.4, z);
      g.rotation.y = Math.atan2(-vz, vx);
      const flap = Math.sin(elapsed * 8 + i) * 0.55;
      g.userData.wingR.rotation.x = flap;
      g.userData.wingL.rotation.x = -flap;
    });

    // 핀치 깡총
    const now = performance.now();
    v.finches.forEach((f) => {
      if (!f.mesh.visible) return;
      const pop = Math.min(1, (now - f.shownAt) / 600);
      f.mesh.scale.setScalar(1.45 * pop);
      f.mesh.position.y = f.baseY + Math.abs(Math.sin(elapsed * 3 + f.phase)) * 0.16;
    });

    // 카메라
    if (this.isPlaying && v.follow && !v.arrived) {
      const s = v.ship.position;
      // 화면이 좁을수록 카메라를 더 멀리 (배가 잘리지 않도록)
      const dist = Math.min(24, 12.5 * Math.max(1, 1.75 / this.camera.aspect));
      this.targetCamPos.set(s.x + 2.8, 3.3 + (dist - 12.5) * 0.25, s.z + dist);
      this.targetLookAt.set(s.x + 3.2, 0.3, s.z);
    } else if (!this.isPlaying) {
      this.targetCamPos.set(Math.sin(elapsed * 0.2) * 4, 7, 27);
      this.targetLookAt.set(0, 0.5, 0);
    }
  }


  /* =========================================================
   * STAGE 3: 생명과학 - 생명의 계통수 (생물발광 성소 + RPG 스킬트리 스타일)
   * ========================================================= */
  _branchCurve(a, b) {
    const dy = (b.y - a.y) * 0.52;
    const midZ = (a.z + b.z) * 0.5 + (b.x - a.x) * 0.03;
    return new THREE.CubicBezierCurve3(
      a.clone(),
      new THREE.Vector3(a.x, a.y + dy, midZ),
      new THREE.Vector3(b.x, b.y - dy, midZ),
      b.clone()
    );
  }

  _spawnTreeBurst(pos, colorHex) {
    if (!this.tree) return;
    const group = this.stageGroup;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.48, 36),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.position.copy(pos);
    group.add(ring);

    const sparks = [];
    const geo = new THREE.OctahedronGeometry(0.09, 0);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfef08a : colorHex,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 2.0 + Math.random() * 2.6;
      const vel = new THREE.Vector3(Math.cos(a) * spd, Math.sin(a) * spd + 0.6, (Math.random() - 0.5) * 2.0);
      group.add(m);
      sparks.push({ m, vel });
    }
    this.tree.bursts.push({ ring, sparks, life: 0, maxLife: 0.75 });
  }

  buildTreeScene(stage, { preview = false } = {}) {
    const items = stage.items;
    const rootPos = new THREE.Vector3(stage.rootPos[0], stage.rootPos[1], 0);
    this._clearStage();
    this.stageGroup.rotation.set(0, 0, 0);
    this._setTheme('stage3');
    const group = this.stageGroup;

    // 1. 오로라 하늘 + 별빛
    const skyObj = buildSanctuarySky();
    group.add(skyObj.group);

    // 2. 성소 바닥 + 석조 제단 + 원경 실루엣
    const floorObj = buildSanctuaryFloor(rootPos);
    group.add(floorObj.group);

    // 3. 유기적 고대 나무 줄기 + 뿌리 + 공통 조상 코어
    const trunkObj = buildAncientTrunk(rootPos);
    group.add(trunkObj.group);

    const rootLabel = makeGameTag(stage.rootLabel, {
      accent: '#fbbf24',
      sub: 'ORIGIN',
      scale: 0.006,
    });
    rootLabel.position.set(rootPos.x, rootPos.y - 1.25, 0.8);
    group.add(rootLabel);

    // 4. 부유하는 생물발광 포자(부드러운 원형 글로우 파티클)
    const sporeCount = 110;
    const sporePos = new Float32Array(sporeCount * 3);
    const sporeBase = new Float32Array(sporeCount * 3);
    for (let i = 0; i < sporeCount; i++) {
      sporeBase[i * 3] = -16 + Math.random() * 48;
      sporeBase[i * 3 + 1] = -6 + Math.random() * 14;
      sporeBase[i * 3 + 2] = -8 + Math.random() * 14;
    }
    sporePos.set(sporeBase);
    const sporeGeo = new THREE.BufferGeometry();
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3));
    const spores = new THREE.Points(
      sporeGeo,
      new THREE.PointsMaterial({
        map: glowTexture(),
        color: 0x99f6e4,
        size: 0.55,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    group.add(spores);

    // 5. 노드별 팔레트 & 티어 계산 (3역=0, 6계=1, 식물·동물 문=2)
    const palettes = {
      bacteria: { hex: 0x38bdf8, css: '#38bdf8', sub: '세균' },
      archaea: { hex: 0xa78bfa, css: '#a78bfa', sub: '고세균' },
      eukarya: { hex: 0xfbbf24, css: '#fbbf24', sub: '진핵생물' },
      protist: { hex: 0x2dd4bf, css: '#2dd4bf', sub: '6계' },
      fungi: { hex: 0xfb923c, css: '#fb923c', sub: '6계' },
      plant: { hex: 0x4ade80, css: '#4ade80', sub: '식물' },
      animal: { hex: 0xf87171, css: '#f87171', sub: '동물' },
    };

    const nodePositions = items.map((it, idx) => {
      const tier = it.parent === -1 ? 0 : items[it.parent].parent === -1 ? 1 : 2;
      // 은은한 3D 깊이감을 주어 평면 그림판 느낌 제거
      const z = tier === 0 ? 0.3 : tier === 1 ? -0.35 + (idx % 2) * 0.5 : (idx % 3 - 1) * 0.45;
      return new THREE.Vector3(it.pos[0], it.pos[1], z);
    });

    const nodes = items.map((it, i) => {
      const pal = palettes[it.group];
      const tier = it.parent === -1 ? 0 : items[it.parent].parent === -1 ? 1 : 2;
      const tierLabel = tier === 0 ? '3역' : tier === 1 ? '6계' : pal.sub;
      const pos = nodePositions[i];
      const parentPos = it.parent >= 0 ? nodePositions[it.parent] : rootPos;
      const curve = this._branchCurve(parentPos, pos);

      // 미해결 가이드 라인 (은은한 홀로그램 선)
      const ghost = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 22, 0.032, 6),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      group.add(ghost);

      // 성장 가지 (발광 코어 + 반투명 오라 피복)
      const coreGeo = new THREE.TubeGeometry(curve, 28, tier === 0 ? 0.13 : tier === 1 ? 0.095 : 0.072, 8);
      coreGeo.setDrawRange(0, 0);
      const coreBranch = new THREE.Mesh(
        coreGeo,
        new THREE.MeshStandardMaterial({
          color: pal.hex,
          emissive: pal.hex,
          emissiveIntensity: 0.85,
          roughness: 0.2,
          metalness: 0.15,
        })
      );
      const auraGeo = new THREE.TubeGeometry(curve, 28, tier === 0 ? 0.24 : tier === 1 ? 0.17 : 0.13, 8);
      auraGeo.setDrawRange(0, 0);
      const auraBranch = new THREE.Mesh(
        auraGeo,
        new THREE.MeshBasicMaterial({
          color: pal.hex,
          transparent: true,
          opacity: 0.24,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      group.add(coreBranch, auraBranch);

      // 가지를 타고 올라가는 빛 펄스
      const pulse = makeGlowSprite(pal.hex, 0.72, 0.9);
      pulse.visible = false;
      group.add(pulse);

      // 노드 그룹
      const node = new THREE.Group();
      node.position.copy(pos);

      const locked = buildLockedNode(tier);
      const crystal = buildCrystalNode(tier, pal.hex);
      crystal.group.scale.setScalar(0);
      crystal.group.visible = false;

      const label = makeGameTag(it.term, {
        accent: pal.css,
        sub: tierLabel,
        scale: tier === 2 ? 0.0046 : 0.0052,
      });
      label.position.set(0, tier === 0 ? 1.25 : 1.05, 0.35);
      label.visible = false;

      node.add(locked.group, crystal.group, label);
      group.add(node);

      return {
        item: it,
        tier,
        pal,
        curve,
        node,
        baseX: pos.x,
        baseY: pos.y,
        baseZ: pos.z,
        locked,
        crystal,
        label,
        coreGeo,
        auraGeo,
        pulse,
        pulseOffset: (i * 0.37) % 1,
        state: 'ghost',
        t0: 0,
        bloomStarted: false,
        bloomT0: 0,
      };
    });

    // 6. 현재 목표 타겟팅 리티클
    const reticle = buildTargetReticle();
    reticle.group.visible = false;
    group.add(reticle.group);

    this.tree = {
      stage,
      skyMat: skyObj.skyMat,
      runeRings: floorObj.runeRings,
      trunkObj,
      nodes,
      spores,
      sporeBase,
      reticle,
      bursts: [],
      active: -1,
      follow: false,
      shakeUntil: 0,
      celebrateAt: 0,
    };

    if (preview) nodes.forEach((_, i) => this.growNode(i, true));
  }

  startTree(stage) {
    this.buildTreeScene(stage, { preview: false });
    this.isPlaying = true;
    this.setOverview('stage3');
  }

  endTree() {
    this.isPlaying = false;
    if (this.tree) {
      this.tree.follow = false;
      this.tree.active = -1;
    }
  }

  followNode(i) {
    if (!this.tree) return;
    this.tree.follow = true;
    this.tree.active = i;
  }

  growNode(i, instant = false) {
    const n = this.tree?.nodes[i];
    if (!n || n.state !== 'ghost') return;
    if (instant) {
      n.state = 'bloomed';
      n.bloomStarted = true;
      n.bloomT0 = performance.now() - 1000;
      n.coreGeo.setDrawRange(0, n.coreGeo.index.count);
      n.auraGeo.setDrawRange(0, n.auraGeo.index.count);
      n.locked.group.visible = false;
      n.crystal.group.visible = true;
      n.crystal.group.scale.setScalar(1);
      n.label.visible = true;
      n.pulse.visible = true;
    } else {
      n.state = 'growing';
      n.t0 = performance.now();
    }
  }

  wrongNode() {
    if (this.tree) this.tree.shakeUntil = performance.now() + 500;
  }

  finishTree() {
    if (!this.tree) return;
    this.tree.active = -1;
    this.tree.follow = false;
    this.tree.celebrateAt = performance.now();
    this.setOverview('stage3');
  }

  _updateTree(dt, elapsed) {
    const T = this.tree;
    if (!T) return;
    const now = performance.now();
    const easeOutBack = (b) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(b - 1, 3) + c1 * Math.pow(b - 1, 2);
    };

    // 오로라 & 제단 링 & 공통 조상 코어
    T.skyMat.uniforms.uTime.value = elapsed;
    T.runeRings.forEach((r, idx) => {
      r.material.opacity = (idx === 0 ? 0.55 : 0.25) + Math.sin(elapsed * 2 + idx) * 0.14;
    });
    T.trunkObj.crystal.rotation.y = elapsed * 0.7;
    T.trunkObj.ringA.rotation.z = elapsed * 0.55;
    T.trunkObj.ringB.rotation.y = -elapsed * 0.45;
    T.trunkObj.crystal.material.emissiveIntensity = 0.75 + Math.sin(elapsed * 2.4) * 0.2;

    T.nodes.forEach((n, i) => {
      // 가지 성장 -> 크리스탈 개화 + 파티클 버스트
      if (n.state === 'growing') {
        const k = Math.min(1, (now - n.t0) / 680);
        const count = Math.floor((n.coreGeo.index.count * k) / 3) * 3;
        n.coreGeo.setDrawRange(0, count);
        n.auraGeo.setDrawRange(0, count);
        if (!n.bloomStarted && k >= 0.82) {
          n.bloomStarted = true;
          n.bloomT0 = now;
          n.locked.group.visible = false;
          n.crystal.group.visible = true;
          n.label.visible = true;
          n.pulse.visible = true;
          this._spawnTreeBurst(n.node.position, n.pal.hex);
        }
        if (k >= 1) n.state = 'bloomed';
      }

      if (n.bloomStarted) {
        const b = Math.min(1, (now - n.bloomT0) / 480);
        let s = easeOutBack(b);
        if (T.celebrateAt) {
          const t = (now - T.celebrateAt) / 1000 - i * 0.065;
          if (t > 0 && t < 0.6) s *= 1 + Math.sin((t / 0.6) * Math.PI) * 0.35;
        }
        n.crystal.group.scale.setScalar(Math.max(0, s));
        n.crystal.core.rotation.y = elapsed * 0.65 + i * 0.5;
        n.crystal.rings.forEach((r, ri) => {
          r.rotation.z = elapsed * (ri === 0 ? 0.8 : -0.6) + i;
        });
        // 가지를 따라 흐르는 빛 펄스
        const pt = (elapsed * 0.38 + n.pulseOffset) % 1;
        n.pulse.position.copy(n.curve.getPointAt(pt));
      }

      const isActive = i === T.active && n.state === 'ghost';
      if (n.state === 'ghost') {
        n.locked.body.rotation.y = elapsed * (isActive ? 1.4 : 0.4) + i;
        if (isActive) {
          const flashing = now < T.shakeUntil;
          n.locked.bodyMat.color.setHex(flashing ? 0xef4444 : 0x38bdf8);
          n.locked.bodyMat.emissive.setHex(flashing ? 0xef4444 : 0xfbbf24);
          n.locked.bodyMat.emissiveIntensity = flashing ? 1.1 : 0.65;
          n.locked.wireMat.color.setHex(flashing ? 0xfca5a5 : 0xfde047);
          n.locked.wireMat.opacity = 0.95;
          n.locked.group.scale.setScalar(1.3 + Math.sin(elapsed * 6) * 0.12);
          n.node.position.x = n.baseX + (flashing ? Math.sin(elapsed * 55) * 0.14 : 0);
        } else {
          n.locked.bodyMat.color.setHex(0x1e3a5f);
          n.locked.bodyMat.emissive.setHex(0x0ea5e9);
          n.locked.bodyMat.emissiveIntensity = 0.22;
          n.locked.wireMat.color.setHex(0x7dd3fc);
          n.locked.wireMat.opacity = 0.45;
          n.locked.group.scale.setScalar(1);
          n.node.position.x = n.baseX;
        }
      }
      n.node.position.y = n.baseY + Math.sin(elapsed * 1.5 + i) * 0.06;
    });

    // 타겟 리티클
    const active = T.active >= 0 ? T.nodes[T.active] : null;
    if (active && active.state === 'ghost') {
      T.reticle.group.visible = true;
      T.reticle.group.position.copy(active.node.position);
      T.reticle.outer.rotation.z = elapsed * 0.9;
      T.reticle.inner.rotation.z = -elapsed * 1.3;
      const p = 1.05 + Math.sin(elapsed * 5) * 0.12;
      T.reticle.outer.scale.setScalar(p);
    } else {
      T.reticle.group.visible = false;
    }

    // 파티클 버스트 업데이트
    for (let i = T.bursts.length - 1; i >= 0; i--) {
      const b = T.bursts[i];
      b.life += dt;
      const k = b.life / b.maxLife;
      if (k >= 1) {
        this.stageGroup.remove(b.ring);
        b.ring.geometry.dispose();
        b.ring.material.dispose();
        b.sparks.forEach((sp) => {
          this.stageGroup.remove(sp.m);
          sp.m.material.dispose();
        });
        T.bursts.splice(i, 1);
        continue;
      }
      b.ring.scale.setScalar(1 + k * 4.2);
      b.ring.material.opacity = (1 - k) * 0.9;
      b.sparks.forEach((sp) => {
        sp.m.position.addScaledVector(sp.vel, dt);
        sp.vel.multiplyScalar(0.95);
        sp.m.material.opacity = 1 - k;
        sp.m.scale.setScalar(1 - k * 0.7);
      });
    }

    // 부유하는 생물발광 포자
    const pos = T.spores.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = T.sporeBase[i] + Math.sin(elapsed * 0.5 + i) * 0.9;
      pos[i + 1] = T.sporeBase[i + 1] + ((elapsed * 0.35 + i * 0.13) % 10) * 0.35;
    }
    T.spores.geometry.attributes.position.needsUpdate = true;

    // 카메라
    if (this.isPlaying && T.follow && active) {
      const dist = Math.min(22, 11.5 * Math.max(1, 1.75 / this.camera.aspect));
      const p = active.node.position;
      this.targetCamPos.set(p.x, p.y + 0.85, p.z + dist);
      this.targetLookAt.set(p.x, p.y - 0.65, p.z);
    } else if (!this.isPlaying) {
      const d = Math.min(50, 31 * Math.max(1, 1.75 / this.camera.aspect));
      this.targetCamPos.set(7.5 + Math.sin(elapsed * 0.18) * 3.5, 1.6, d);
      this.targetLookAt.set(7.5, 0.2, 0);
    }
  }

  /* =========================================================
   * STAGE 4: 세포와 물질대사 - 마이토콘드리아(세포호흡) & 엽록체(광합성)
   * ========================================================= */
  buildMetabolismScene(stage, { preview = false } = {}) {
    const items = stage.items;
    this._clearStage();
    this.stageGroup.rotation.set(0, 0, 0);
    this._setTheme('stage4');
    const group = this.stageGroup;

    // 1. 깊은 세포질 관측소 배경 + 소포
    const backdrop = buildCellBackdrop();
    group.add(backdrop.group);

    // 2. 좌측: 3D 절개 마이토콘드리아 / 우측: 3D 절개 엽록체
    const mito = buildMitochondrion();
    mito.group.position.set(-5.6, 0.1, 0);
    mito.group.rotation.y = 0.22;
    group.add(mito.group);

    const chloro = buildChloroplast();
    chloro.group.position.set(5.6, 0.1, 0);
    chloro.group.rotation.y = -0.22;
    group.add(chloro.group);

    // 3. 마이토콘드리아 ↔ 엽록체 에너지·물질 순환 스트림
    const cycle = buildCycleStreams();
    group.add(cycle.group);

    // 4. 부유하는 에너지 입자
    const moteCount = 90;
    const motePos = new Float32Array(moteCount * 3);
    const moteBase = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      moteBase[i * 3] = (Math.random() - 0.5) * 28;
      moteBase[i * 3 + 1] = (Math.random() - 0.5) * 12;
      moteBase[i * 3 + 2] = -4 + Math.random() * 8;
    }
    motePos.set(moteBase);
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    const motes = new THREE.Points(
      moteGeo,
      new THREE.PointsMaterial({
        map: glowTexture(),
        color: 0xdbeafe,
        size: 0.42,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    group.add(motes);

    // 5. 각 개념 위치 핀 & 다크글래스 라벨
    const pins = items.map((it) => {
      const anchor = new THREE.Vector3(...it.anchor);
      const labelPos = anchor.clone().add(new THREE.Vector3(...it.labelOffset));

      // 앵커 → 라벨 연결 가이드 선
      const lineGeo = new THREE.BufferGeometry().setFromPoints([anchor, labelPos]);
      const line = new THREE.Line(
        lineGeo,
        new THREE.LineBasicMaterial({ color: it.color, transparent: true, opacity: 0.55 })
      );
      line.visible = false;
      group.add(line);

      const dot = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshBasicMaterial({ color: it.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      dot.position.copy(anchor);
      dot.visible = false;
      group.add(dot);

      const label = makeGameTag(it.term, {
        accent: it.css,
        sub: it.organelle === 'mito' ? '세포호흡' : '광합성',
        scale: 0.0044,
      });
      label.position.copy(labelPos);
      label.visible = false;
      group.add(label);

      return { item: it, anchor, line, dot, label, solved: false };
    });

    // 6. 현재 문제 타겟 리티클
    const reticle = buildTargetReticle();
    reticle.group.visible = false;
    group.add(reticle.group);

    this.meta = {
      stage,
      skyMat: backdrop.skyMat,
      vesicles: backdrop.vesicles,
      mito,
      chloro,
      cycle,
      motes,
      moteBase,
      pins,
      reticle,
      bursts: [],
      active: -1,
      follow: false,
      shakeUntil: 0,
      solvedCount: 0,
      completed: false,
    };

    if (preview) {
      // 미리보기에서는 두 핵심 소기관 이름만 깔끔히 표시
      this.solveMetabolismPin(0, true);
      this.solveMetabolismPin(6, true);
    }
  }

  startMetabolism(stage) {
    this.buildMetabolismScene(stage, { preview: false });
    this.isPlaying = true;
    this.setOverview('stage4');
  }

  endMetabolism() {
    this.isPlaying = false;
    if (this.meta) {
      this.meta.follow = false;
      this.meta.active = -1;
    }
  }

  focusMetabolismPin(i) {
    if (!this.meta) return;
    this.meta.follow = true;
    this.meta.active = i;
  }

  _spawnMetaBurst(pos, colorHex) {
    if (!this.meta) return;
    const group = this.stageGroup;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.44, 36),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.position.copy(pos);
    group.add(ring);

    const sparks = [];
    const geo = new THREE.OctahedronGeometry(0.085, 0);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfef08a : colorHex,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 1.8 + Math.random() * 2.5;
      const vel = new THREE.Vector3(Math.cos(a) * spd, Math.sin(a) * spd + 0.5, (Math.random() - 0.5) * 1.8);
      group.add(m);
      sparks.push({ m, vel });
    }
    this.meta.bursts.push({ ring, sparks, life: 0, maxLife: 0.72 });
  }

  solveMetabolismPin(i, instant = false) {
    const p = this.meta?.pins[i];
    if (!p || p.solved) return;
    p.solved = true;
    p.line.visible = true;
    p.dot.visible = true;
    p.label.visible = true;
    this.meta.solvedCount += 1;
    if (!instant) this._spawnMetaBurst(p.anchor, p.item.color);
  }

  wrongMetabolism() {
    if (this.meta) this.meta.shakeUntil = performance.now() + 480;
  }

  finishMetabolism() {
    if (!this.meta) return;
    this.meta.active = -1;
    this.meta.follow = false;
    this.meta.completed = true;
    this.setOverview('stage4');
  }

  _updateMetabolism(dt, elapsed) {
    const M = this.meta;
    if (!M) return;
    const now = performance.now();

    M.skyMat.uniforms.uTime.value = elapsed;

    // 배경 소포 부유
    M.vesicles.forEach((v) => {
      v.mesh.position.y = v.baseY + Math.sin(elapsed * v.speed + v.phase) * 0.55;
    });

    // 마이토콘드리아 살아 움직이는 애니메이션
    M.mito.group.position.y = 0.1 + Math.sin(elapsed * 1.05) * 0.12;
    M.mito.tcaGroup.rotation.z = elapsed * 1.4;
    M.mito.tcaGroup.rotation.y = Math.sin(elapsed * 0.9) * 0.35;
    M.mito.glucose.rotation.z = elapsed * 0.8;
    M.mito.cristaMat.emissiveIntensity = 0.42 + Math.sin(elapsed * 2.2) * 0.1 + (M.completed ? 0.25 : 0);
    M.mito.atpOrbs.forEach((o) => {
      o.mesh.position.y = o.base.y + Math.sin(elapsed * 2.6 + o.phase) * 0.18;
      o.mesh.rotation.y = elapsed * 2 + o.phase;
    });

    // 엽록체 살아 움직이는 애니메이션
    M.chloro.group.position.y = 0.1 + Math.sin(elapsed * 1.05 + 1.6) * 0.12;
    M.chloro.calvinGroup.rotation.z = -elapsed * 1.3;
    M.chloro.calvinGroup.rotation.y = Math.cos(elapsed * 0.85) * 0.35;
    M.chloro.thylaMat.emissiveIntensity = 0.45 + Math.sin(elapsed * 2.0 + 1.0) * 0.1 + (M.completed ? 0.25 : 0);
    M.chloro.photons.forEach((ph) => {
      const t = (elapsed * 0.42 + ph.offset) % 1;
      ph.sprite.position.copy(M.chloro.pCurve.getPointAt(t));
      ph.sprite.material.opacity = Math.sin(t * Math.PI) * 0.95;
    });

    // 마이토콘드리아 ↔ 엽록체 순환 스트림
    const speed = M.completed ? 0.42 : 0.24;
    M.cycle.topOrbs.forEach((o) => {
      const t = (elapsed * speed + o.offset) % 1;
      o.sprite.position.copy(M.cycle.topCurve.getPointAt(t));
    });
    M.cycle.botOrbs.forEach((o) => {
      const t = (elapsed * speed + o.offset) % 1;
      o.sprite.position.copy(M.cycle.botCurve.getPointAt(t));
    });
    M.cycle.topTube.material.opacity = M.completed ? 0.65 : 0.32;
    M.cycle.botTube.material.opacity = M.completed ? 0.65 : 0.32;

    // 부유 에너지 입자
    const pos = M.motes.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = M.moteBase[i] + Math.sin(elapsed * 0.4 + i) * 0.6;
      pos[i + 1] = M.moteBase[i + 1] + Math.cos(elapsed * 0.5 + i * 0.7) * 0.5;
    }
    M.motes.geometry.attributes.position.needsUpdate = true;

    // 타겟 리티클
    const activePin = M.active >= 0 ? M.pins[M.active] : null;
    if (activePin && !activePin.solved) {
      const flashing = now < M.shakeUntil;
      M.reticle.group.visible = true;
      M.reticle.group.position.set(
        activePin.anchor.x + (flashing ? Math.sin(elapsed * 55) * 0.14 : 0),
        activePin.anchor.y,
        activePin.anchor.z + 0.15
      );
      M.reticle.outer.rotation.z = elapsed * 0.95;
      M.reticle.inner.rotation.z = -elapsed * 1.35;
      M.reticle.outer.material.color.setHex(flashing ? 0xef4444 : 0xfbbf24);
      M.reticle.outer.scale.setScalar(0.95 + Math.sin(elapsed * 5) * 0.12);
    } else {
      M.reticle.group.visible = false;
    }

    // 버스트 업데이트
    for (let i = M.bursts.length - 1; i >= 0; i--) {
      const b = M.bursts[i];
      b.life += dt;
      const k = b.life / b.maxLife;
      if (k >= 1) {
        this.stageGroup.remove(b.ring);
        b.ring.geometry.dispose();
        b.ring.material.dispose();
        b.sparks.forEach((sp) => {
          this.stageGroup.remove(sp.m);
          sp.m.material.dispose();
        });
        M.bursts.splice(i, 1);
        continue;
      }
      b.ring.scale.setScalar(1 + k * 3.8);
      b.ring.material.opacity = (1 - k) * 0.9;
      b.sparks.forEach((sp) => {
        sp.m.position.addScaledVector(sp.vel, dt);
        sp.vel.multiplyScalar(0.94);
        sp.m.material.opacity = 1 - k;
        sp.m.scale.setScalar(1 - k * 0.7);
      });
    }

    // 카메라
    if (this.isPlaying && M.follow && activePin) {
      const a = activePin.anchor;
      const off = activePin.item.camOffset;
      const dist = Math.min(18, off[2] * Math.max(1, 1.65 / this.camera.aspect));
      this.targetCamPos.set(a.x + off[0], a.y + off[1], a.z + dist);
      this.targetLookAt.set(a.x, a.y - 0.55, a.z);
    } else if (!this.isPlaying) {
      const d = Math.min(34, 19.5 * Math.max(1, 1.7 / this.camera.aspect));
      this.targetCamPos.set(Math.sin(elapsed * 0.18) * 2.2, 1.4, d);
      this.targetLookAt.set(0, 0.1, 0);
    }
  }

  /* =========================================================
   * STAGE 5: 생물의 유전 - 첨단 생명공학 홀로그램 랩
   * ========================================================= */
  buildBiotechScene(stage, { preview = false } = {}) {
    const items = stage.items;
    this._clearStage();
    this.stageGroup.rotation.set(0, 0, 0);
    this._setTheme('stage5');
    const group = this.stageGroup;

    const lab = buildLabBackdrop();
    group.add(lab.group);

    // 5개 홀로그램 플랫폼 배치
    const specs = [
      { x: -8.4, build: buildPlasmidExhibit },
      { x: -4.2, build: buildEnzymeExhibit },
      { x: 0.0, build: buildCrisprPcrExhibit },
      { x: 4.2, build: buildCellAntibodyExhibit },
      { x: 8.4, build: buildTherapyGmoExhibit },
    ];
    const exhibits = specs.map(({ x, build }) => {
      const ex = build();
      ex.group.position.set(x, 0, 0);
      group.add(ex.group);
      return ex;
    });

    // 10개 개념 핀 & 다크글래스 네온 라벨
    const pins = items.map((it) => {
      const anchor = new THREE.Vector3(...it.anchor);
      const labelPos = anchor.clone().add(new THREE.Vector3(...it.labelOffset));

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([anchor, labelPos]),
        new THREE.LineBasicMaterial({ color: it.color, transparent: true, opacity: 0.55 })
      );
      line.visible = false;
      group.add(line);

      const dot = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshBasicMaterial({ color: it.color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
      );
      dot.position.copy(anchor);
      dot.visible = false;
      group.add(dot);

      const label = makeGameTag(it.term, {
        accent: it.css,
        sub: it.station,
        scale: 0.0044,
      });
      label.position.copy(labelPos);
      label.visible = false;
      group.add(label);

      return { item: it, anchor, line, dot, label, solved: false };
    });

    const reticle = buildTargetReticle();
    reticle.group.visible = false;
    group.add(reticle.group);

    this.biotech = {
      stage,
      skyMat: lab.skyMat,
      motes: lab.motes,
      moteBase: lab.moteBase,
      exhibits,
      pins,
      reticle,
      bursts: [],
      active: -1,
      follow: false,
      shakeUntil: 0,
      completed: false,
    };

    if (preview) {
      // 미리보기에서는 중앙 CRISPR-Cas9과 좌우 대표 라벨만 깔끔히 표시
      [0, 5, 9].forEach((idx) => this.solveBiotechPin(idx, true));
    }
  }

  startBiotech(stage) {
    this.buildBiotechScene(stage, { preview: false });
    this.isPlaying = true;
    this.setOverview('stage5');
  }

  endBiotech() {
    this.isPlaying = false;
    if (this.biotech) {
      this.biotech.follow = false;
      this.biotech.active = -1;
    }
  }

  focusBiotechPin(i) {
    if (!this.biotech) return;
    this.biotech.follow = true;
    this.biotech.active = i;
  }

  _spawnBiotechBurst(pos, colorHex) {
    if (!this.biotech) return;
    const group = this.stageGroup;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.44, 36),
      new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    ring.position.copy(pos);
    group.add(ring);

    const sparks = [];
    const geo = new THREE.OctahedronGeometry(0.085, 0);
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xfef08a : colorHex,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 1.8 + Math.random() * 2.5;
      const vel = new THREE.Vector3(Math.cos(a) * spd, Math.sin(a) * spd + 0.5, (Math.random() - 0.5) * 1.8);
      group.add(m);
      sparks.push({ m, vel });
    }
    this.biotech.bursts.push({ ring, sparks, life: 0, maxLife: 0.72 });
  }

  solveBiotechPin(i, instant = false) {
    const p = this.biotech?.pins[i];
    if (!p || p.solved) return;
    p.solved = true;
    p.line.visible = true;
    p.dot.visible = true;
    p.label.visible = true;
    if (!instant) this._spawnBiotechBurst(p.anchor, p.item.color);
  }

  wrongBiotech() {
    if (this.biotech) this.biotech.shakeUntil = performance.now() + 480;
  }

  finishBiotech() {
    if (!this.biotech) return;
    this.biotech.active = -1;
    this.biotech.follow = false;
    this.biotech.completed = true;
    this.setOverview('stage5');
  }

  _updateBiotech(dt, elapsed) {
    const B = this.biotech;
    if (!B) return;
    const now = performance.now();

    B.skyMat.uniforms.uTime.value = elapsed;
    B.exhibits.forEach((ex) => ex.animate(elapsed));

    const pos = B.motes.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i] = B.moteBase[i] + Math.sin(elapsed * 0.45 + i) * 0.65;
      pos[i + 1] = B.moteBase[i + 1] + ((elapsed * 0.3 + i * 0.11) % 8) * 0.25;
    }
    B.motes.geometry.attributes.position.needsUpdate = true;

    const activePin = B.active >= 0 ? B.pins[B.active] : null;
    if (activePin && !activePin.solved) {
      const flashing = now < B.shakeUntil;
      B.reticle.group.visible = true;
      B.reticle.group.position.set(
        activePin.anchor.x + (flashing ? Math.sin(elapsed * 55) * 0.14 : 0),
        activePin.anchor.y,
        activePin.anchor.z + 0.15
      );
      B.reticle.outer.rotation.z = elapsed * 0.95;
      B.reticle.inner.rotation.z = -elapsed * 1.35;
      B.reticle.outer.material.color.setHex(flashing ? 0xef4444 : 0xfbbf24);
      B.reticle.outer.scale.setScalar(0.95 + Math.sin(elapsed * 5) * 0.12);
    } else {
      B.reticle.group.visible = false;
    }

    for (let i = B.bursts.length - 1; i >= 0; i--) {
      const b = B.bursts[i];
      b.life += dt;
      const k = b.life / b.maxLife;
      if (k >= 1) {
        this.stageGroup.remove(b.ring);
        b.ring.geometry.dispose();
        b.ring.material.dispose();
        b.sparks.forEach((sp) => {
          this.stageGroup.remove(sp.m);
          sp.m.material.dispose();
        });
        B.bursts.splice(i, 1);
        continue;
      }
      b.ring.scale.setScalar(1 + k * 3.8);
      b.ring.material.opacity = (1 - k) * 0.9;
      b.sparks.forEach((sp) => {
        sp.m.position.addScaledVector(sp.vel, dt);
        sp.vel.multiplyScalar(0.94);
        sp.m.material.opacity = 1 - k;
        sp.m.scale.setScalar(1 - k * 0.7);
      });
    }

    if (this.isPlaying && B.follow && activePin) {
      const a = activePin.anchor;
      const off = activePin.item.camOffset;
      const dist = Math.min(18, off[2] * Math.max(1, 1.65 / this.camera.aspect));
      this.targetCamPos.set(a.x + off[0], a.y + off[1], a.z + dist);
      this.targetLookAt.set(a.x, a.y - 0.5, a.z);
    } else if (!this.isPlaying) {
      const d = Math.min(36, 20.5 * Math.max(1, 1.7 / this.camera.aspect));
      this.targetCamPos.set(Math.sin(elapsed * 0.16) * 2.8, 2.2, d);
      this.targetLookAt.set(0, 0.7, 0);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    const lerpFactor = this.isPlaying ? 0.07 : 0.04;
    this.camera.position.lerp(this.targetCamPos, lerpFactor);
    this.currentLookAt.lerp(this.targetLookAt, lerpFactor);
    this.camera.lookAt(this.currentLookAt);

    if (this.isPlaying && this.activePair >= 0 && this.dna) {
      // 현재 문제 염기쌍이 화면 정면(가로)에 오도록 이중나선을 회전
      const target = this.dna.pairs[this.activePair].angle;
      let r = this.stageGroup.rotation.y;
      r += Math.PI * 2 * Math.round((target - r) / (Math.PI * 2));
      this.stageGroup.rotation.y = r + (target - r) * 0.08;
    } else if (!this.voyage && !this.tree && !this.meta && !this.biotech) {
      this.stageGroup.rotation.y += dt * 0.16;
    }

    this.animatedParts.forEach((part) => {
      if (part.rotY) part.mesh.rotation.y += dt * part.rotY;
      if (part.rotX) part.mesh.rotation.x += dt * part.rotX;
      if (part.rotZ) part.mesh.rotation.z += dt * part.rotZ;
      if (part.pulse) {
        const s = 1 + Math.sin(elapsed * 4) * 0.12;
        part.mesh.scale.setScalar(s);
      }
    });

    this.ambientParticles.forEach((p) => {
      p.mesh.position.y = p.baseY + Math.sin(elapsed * p.speed + p.phase) * 0.35;
    });

    this._updateDNAVisuals(elapsed);
    this._updateVoyage(dt, elapsed);
    this._updateTree(dt, elapsed);
    this._updateMetabolism(dt, elapsed);
    this._updateBiotech(dt, elapsed);

    this.renderer.render(this.scene, this.camera);
  }
}

BioScene._seaColors = {
  deep: new THREE.Color(0x0b2545),
  shallow: new THREE.Color(0x1b6485),
  foam: new THREE.Color(0xdcf4ff),
};

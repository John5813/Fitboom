/**
 * Kirish sahifasidagi 3D shtanga sahnasi (three.js).
 *
 * Hech qanday tashqi 3D fayl yuklanmaydi — shtanga va disklar koddan
 * yasaladi, yorug'lik aksi ham shu yerda generatsiya qilinadi. Shuning uchun
 * sahna internet sekin bo'lsa ham darhol chiqadi va Spline kabi xizmatga
 * bog'liq emas.
 *
 * Hikoya: bitta shtanga (bitta zal) portlaydi va katta disklar sport
 * buyumlariga aylanadi (ko'p sport turi) -> ular halqa bo'lib aylanadi
 * (bitta xarita) -> yana disklarga aylanib bitta ustunga yig'iladi (bitta
 * valyuta — kredit) -> shtanga qayta yig'iladi.
 *
 * Bu modul React'ni bilmaydi: `frame(progress)` chaqirilganda sahnani
 * chizadi. Scroll, matnlar va hayot sikli — HeroStory.tsx da.
 */
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  LatheGeometry,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  Vector3,
  Euler,
  WebGLRenderer,
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { sceneBlend, smoothstep, stateWeight, type SceneBlend } from "./storyTimeline";
import { buildSportModels, type SportModel } from "./sportObjects";

export interface BarbellScene {
  /** progress: 0..1, time: soniya, dt: oldingi kadrdan beri soniya */
  frame(progress: number, time: number, dt: number): void;
  resize(width: number, height: number): void;
  /** Sichqoncha holati, -1..1 */
  setPointer(x: number, y: number): void;
  dispose(): void;
}

export interface BarbellSceneOptions {
  reducedMotion: boolean;
  lowPower: boolean;
}

/* ───────────────────────── Geometriya ───────────────────────── */

/** Har bir tomondagi disklar: ichkaridan tashqariga */
const PLATE_SPECS = [
  { r: 1.0, t: 0.15, gold: true },
  { r: 1.0, t: 0.15, gold: false },
  { r: 0.82, t: 0.12, gold: true },
  { r: 0.66, t: 0.1, gold: false },
  { r: 0.5, t: 0.08, gold: true },
  { r: 0.38, t: 0.065, gold: false },
];
const PLATE_GAP = 0.012;
const PLATE_START_X = 1.6;
const HOLE_R = 0.105;

/**
 * Disk kesimi: markazdagi gupchak, botiq o'rta qism va qalin gardish.
 * Har nuqta ikki marta yoziladi — shunda burchaklar keskin chiqadi
 * (normalar qo'shni tekisliklar orasida yumshatilmaydi).
 */
function plateGeometry(R: number, t: number, segments: number): BufferGeometry {
  const hr = t / 2;
  const hm = hr * 0.55;
  const hh = hr * 0.85;
  const hub = Math.min(0.3, R * 0.45);
  const rim = Math.min(0.13, R * 0.22);
  const profile: Array<[number, number]> = [
    [HOLE_R, -hh],
    [hub, -hh],
    [hub + 0.05, -hm],
    [R - rim, -hm],
    [R - rim + 0.04, -hr],
    [R - 0.02, -hr],
    [R, -hr + 0.02],
    [R, hr - 0.02],
    [R - 0.02, hr],
    [R - rim + 0.04, hr],
    [R - rim, hm],
    [hub + 0.05, hm],
    [hub, hh],
    [HOLE_R, hh],
    [HOLE_R, -hh],
  ];
  const pts: Vector2[] = [];
  profile.forEach(([x, y], i) => {
    pts.push(new Vector2(x, y));
    if (i > 0 && i < profile.length - 1) pts.push(new Vector2(x, y));
  });
  const g = new LatheGeometry(pts, segments);
  g.computeVertexNormals();
  g.rotateZ(-Math.PI / 2); // aylanish o'qi Y -> X (shtanga o'qi)
  return g;
}

/** X o'qi bo'ylab yotgan silindr */
function rod(radius: number, length: number, segments: number): BufferGeometry {
  const g = new CylinderGeometry(radius, radius, length, segments);
  g.rotateZ(-Math.PI / 2);
  return g;
}

/** Aniq takrorlanadigan tasodifiy sonlar — har ochilishda bir xil portlash */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glowTexture(): Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.2, "rgba(255,226,170,0.9)");
  grd.addColorStop(0.55, "rgba(255,184,90,0.25)");
  grd.addColorStop(1, "rgba(255,170,60,0)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/* ───────────────────────── Pozalar ───────────────────────── */

interface Pose {
  p: Vector3;
  q: Quaternion;
  s: number;
}

const pose = (p: Vector3, q = new Quaternion(), s = 1): Pose => ({ p, q, s });
const qEuler = (x: number, y: number, z: number) =>
  new Quaternion().setFromEuler(new Euler(x, y, z));
/** Shtanga o'qini (X) vertikalga (Y) buradi */
const Q_UPRIGHT = qEuler(0, 0, Math.PI / 2);

/** Har holatda butun modelning burchagi (x, y, z) */
const ROOT_ROT: Array<[number, number, number]> = [
  [0.22, -0.5, 0.06], // yig'ilgan
  [0.12, 0, 0.04], // portlash — buyumlar tomoshabinga qaraydi
  [0.42, 0, 0], // halqa
  [0.28, 0.6, 0], // ustun
  [0.12, 0.35, -0.18], // yakun
];

/** Har holatda kadrga sig'ishi kerak bo'lgan radius */
const FIT_RADIUS = [3.0, 3.05, 4.2, 2.3, 2.45];

/** Tebranish kuchi — tinch holatlarda model "nafas oladi" */
const SWAY = [0.28, 0.16, 0.05, 0.2, 0.3];

const RING_RADIUS = 3.3;

/** Disklar qaysi buyumga aylanadi: disk indeksi -> buyum tartibi */
const MORPH_OF: Record<number, number> = { 0: 0, 1: 1, 2: 2, 6: 3, 7: 4, 8: 5 };

/**
 * Portlashdagi buyumlar joylashuvi — 2 ustun x 3 qator. Telefonda ham,
 * kompyuterda ham (model o'ngga surilgan) matnga tegmaydi.
 */
const CONSTELLATION: Array<[number, number, number]> = [
  [-1.35, 1.95, 0.2],
  [1.4, 1.6, -0.3],
  [-1.5, -0.05, -0.2],
  [1.45, -0.2, 0.3],
  [-1.3, -2.05, 0.0],
  [1.35, -1.95, -0.25],
];

const SPORT_SCALE = 1.02;

function easeOutBack(t: number): number {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * Disk -> buyum aylanish darajasi (0 — disk, 1 — buyum).
 * Buyumlar portlashda paydo bo'ladi, halqada qoladi, ustunda yana disk
 * bo'ladi. `k` — kichik kechikish, hammasi bir vaqtda "otilmasin".
 */
function morphAmount(blend: SceneBlend, k: number): number {
  const M = [0, 1, 1, 0, 0];
  const a = M[blend.from];
  const b = M[blend.to];
  if (a === b) return a;
  const d = k * 0.06;
  return b > a
    ? smoothstep(0.15 + d, 0.6 + d, blend.t)
    : 1 - smoothstep(0.0 + d * 0.5, 0.45 + d * 0.5, blend.t);
}

/* ───────────────────────── Sahna ───────────────────────── */

export function createBarbellScene(
  canvas: HTMLCanvasElement,
  { reducedMotion, lowPower }: BarbellSceneOptions,
): BarbellScene {
  // WebGL bo'lmasa shu yerda xato otiladi — chaqiruvchi zaxira ko'rinishga o'tadi
  const renderer = new WebGLRenderer({
    canvas,
    antialias: !lowPower,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const maxDpr = lowPower ? 1.25 : 2;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.9;

  const camera = new PerspectiveCamera(30, 1, 0.1, 100);

  // Yorug'lik: iliq asosiy, sovuq kontur, portlashda yonadigan markaziy nuqta
  const key = new DirectionalLight(0xffe0ad, 2.4);
  key.position.set(4, 6, 5);
  const rim = new DirectionalLight(0x9fbfff, 1.3);
  rim.position.set(-6, 2, -5);
  const burst = new PointLight(0xffb347, 0, 14, 2);
  burst.position.set(0, 0, 1.2);
  scene.add(key, rim, burst);

  // Materiallar — logotipdagi oltin va kumush
  const gold = new MeshStandardMaterial({ color: 0xdcae62, metalness: 1, roughness: 0.27 });
  const steel = new MeshStandardMaterial({ color: 0xcfd4dc, metalness: 1, roughness: 0.2 });
  const darkSteel = new MeshStandardMaterial({ color: 0x5b616b, metalness: 1, roughness: 0.34 });
  const dial = new MeshStandardMaterial({ color: 0x0d0f14, metalness: 0.4, roughness: 0.35 });

  const root = new Group();
  scene.add(root);

  /* Shtanga (grif + vtulkalar + qulflar) — bitta bo'lak bo'lib harakatlanadi */
  const radial = lowPower ? 32 : 48;
  const bar = new Group();
  bar.add(new Mesh(rod(0.055, 3.0, 24), darkSteel));
  for (const s of [-1, 1]) {
    const collar = new Mesh(rod(0.17, 0.08, radial), gold);
    collar.position.x = s * 1.52;
    const sleeve = new Mesh(rod(0.1, 1.14, radial), steel);
    sleeve.position.x = s * 2.13;
    const lock = new Mesh(rod(0.15, 0.06, radial), gold);
    lock.position.x = s * 2.4;
    const cap = new Mesh(rod(0.108, 0.025, radial), gold);
    cap.position.x = s * 2.7;
    bar.add(collar, sleeve, lock, cap);
  }
  root.add(bar);

  /* Disklar */
  const geoCache = new Map<string, BufferGeometry>();
  const plateSegs = lowPower ? 48 : 72;
  const steelDouble = new MeshStandardMaterial({
    color: 0xcfd4dc,
    metalness: 1,
    roughness: 0.2,
    side: DoubleSide,
  });
  const sports = buildSportModels({ gold, steel, dark: dial, steelDouble });
  interface Plate {
    /** Harakatlanadigan guruh: ichida disk va (bo'lsa) sport buyumi */
    mesh: Group;
    plate: Mesh;
    sport?: SportModel;
    morphIndex: number; // buyum tartibi, buyumi yo'q disklarda -1
    side: number;
    spec: (typeof PLATE_SPECS)[number];
    index: number; // 0..11
  }
  const plates: Plate[] = [];
  for (const side of [-1, 1]) {
    PLATE_SPECS.forEach((spec) => {
      const k = `${spec.r}:${spec.t}`;
      if (!geoCache.has(k)) geoCache.set(k, plateGeometry(spec.r, spec.t, plateSegs));
      const group = new Group();
      const plate = new Mesh(geoCache.get(k)!, spec.gold ? gold : steel);
      group.add(plate);
      const index = plates.length;
      const morphIndex = MORPH_OF[index] ?? -1;
      const sport = morphIndex >= 0 ? sports[morphIndex] : undefined;
      if (sport) {
        sport.object.visible = false;
        sport.object.scale.setScalar(0);
        group.add(sport.object);
      }
      root.add(group);
      plates.push({ mesh: group, plate, sport, morphIndex, side, spec, index });
    });
  }

  /* Statik pozalar: yig'ilgan, portlash, ustun */
  const assembled: Pose[] = [];
  for (const side of [-1, 1]) {
    let x = PLATE_START_X;
    for (const spec of PLATE_SPECS) {
      assembled.push(pose(new Vector3(side * (x + spec.t / 2), 0, 0)));
      x += spec.t + PLATE_GAP;
    }
  }

  const rand = seeded(20260926);
  // Ikki variant: telefonda disklar har tomonga teng uchadi; kompyuterda chap
  // tomonda matn turadi, shuning uchun chapga uchadiganlar orqaga ketadi
  const boom: Pose[] = [];
  const boomWide: Pose[] = [];
  plates.forEach((pl, i) => {
    const dir = new Vector3(
      pl.side * (0.6 + rand() * 0.9),
      (rand() - 0.5) * 2.4,
      (rand() - 0.5) * 2.6,
    ).normalize();
    const dist = 2.2 + rand() * 1.7;
    const q = qEuler(rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI);
    const jx = (rand() - 0.5) * 0.5;
    const jy = (rand() - 0.5) * 0.7;
    const jz = (rand() - 0.5) * 0.3;

    if (pl.morphIndex >= 0) {
      // Buyum: belgilangan joyda, old tomoni kameraga qaragan, tik turadi
      const [cx, cy, cz] = CONSTELLATION[pl.morphIndex];
      const front = pose(new Vector3(cx, cy, cz), qEuler(jx * 0.5, -Math.PI / 2 + jy, jz));
      boom.push(front);
      boomWide.push(pose(front.p.clone(), front.q.clone()));
      return;
    }

    // Kichik disklar — orqa fonda uchib yuradigan parchalar
    const debris = assembled[i].p.clone().multiplyScalar(0.7).addScaledVector(dir, dist * 0.6);
    debris.z -= 2;
    boom.push(pose(debris, q, 0.85));
    const wide = debris.clone();
    if (pl.side < 0) {
      wide.x *= 0.45;
      wide.z -= 1;
    }
    boomWide.push(pose(wide, q.clone(), 0.85));
  });

  // Ustun: katta disk pastda, hammasi grifning yalang'och qismiga kiygiziladi
  const order = [...plates].sort((a, b) => b.spec.r - a.spec.r || a.index - b.index);
  const stackHeight =
    order.reduce((s, pl) => s + pl.spec.t, 0) + PLATE_GAP * (order.length - 1);
  const stack: Pose[] = new Array(plates.length);
  let y = -stackHeight / 2;
  for (const pl of order) {
    y += pl.spec.t / 2;
    stack[pl.index] = pose(new Vector3(0, y, 0), Q_UPRIGHT.clone());
    y += pl.spec.t / 2 + PLATE_GAP;
  }

  // Halqa pozasi har kadrda hisoblanadi (aylanadi)
  const ring: Pose[] = plates.map(() => pose(new Vector3(), new Quaternion()));
  const yAxis = new Vector3(0, 1, 0);
  // Halqada buyumlar va kichik disklar navbatma-navbat turadi
  const ringSlot: number[] = [];
  {
    let obj = 0;
    let small = 1;
    plates.forEach((pl) => {
      if (pl.morphIndex >= 0) {
        ringSlot.push(obj);
        obj += 2;
      } else {
        ringSlot.push(small);
        small += 2;
      }
    });
  }
  function updateRing(time: number, progress: number) {
    const spin = reducedMotion ? 0 : time * 0.22 + progress * 2.5;
    plates.forEach((pl, i) => {
      const a = spin + (ringSlot[i] / plates.length) * Math.PI * 2;
      ring[i].p.set(
        Math.cos(a) * RING_RADIUS,
        Math.sin(a * 2 + time * 0.8) * (reducedMotion ? 0 : 0.14),
        Math.sin(a) * RING_RADIUS,
      );
      // Diskning yuzi tashqariga qaraydi
      ring[i].q.setFromAxisAngle(yAxis, -a);
    });
  }

  const barPoses: Pose[] = [
    pose(new Vector3()),
    // Portlashda grif ikki ustun buyum orasida tik turadi — ularni kesib o'tmaydi
    pose(new Vector3(0, -0.05, -0.9), Q_UPRIGHT.clone(), 0.82),
    pose(new Vector3(), Q_UPRIGHT.clone(), 0.72),
    pose(new Vector3(), Q_UPRIGHT.clone(), 1),
    pose(new Vector3()),
  ];

  function platePose(state: number, i: number): Pose {
    switch (state) {
      case 1:
        return camera.aspect >= 1 ? boomWide[i] : boom[i];
      case 2:
        return ring[i];
      case 3:
        return stack[i];
      default:
        return assembled[i];
    }
  }

  function applyPose(obj: Object3D, a: Pose, b: Pose, t: number) {
    obj.position.lerpVectors(a.p, b.p, t);
    obj.quaternion.slerpQuaternions(a.q, b.q, t);
    obj.scale.setScalar(a.s + (b.s - a.s) * t);
  }

  /* Oltin chang */
  const dotTex = glowTexture();
  const count = lowPower ? 220 : 560;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  const r2 = seeded(7);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (r2() - 0.5) * 18;
    positions[i * 3 + 1] = (r2() - 0.5) * 12;
    positions[i * 3 + 2] = -7 + r2() * 11;
    speeds[i] = 0.08 + r2() * 0.3;
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new BufferAttribute(positions, 3));
  const dustMat = new PointsMaterial({
    size: 0.075,
    map: dotTex,
    color: 0xffc56d,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  });
  const dust = new Points(dustGeo, dustMat);
  scene.add(dust);

  /* Model ortidagi nur */
  const glowMat = new SpriteMaterial({
    map: dotTex,
    color: 0xffa53a,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const glow = new Sprite(glowMat);
  glow.position.set(0, 0, -1.6);
  scene.add(glow);

  /* Kamera va joylashuv */
  let width = 1;
  let height = 1;
  const pointer = new Vector2();
  const pointerSmooth = new Vector2();
  const blendA = new Euler();

  function fitDistance(radius: number): number {
    const vHalf = (camera.fov * Math.PI) / 360;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    return radius / Math.sin(Math.min(vHalf, hHalf));
  }

  function placeCamera(blend: SceneBlend) {
    const portrait = camera.aspect < 1;
    const r =
      FIT_RADIUS[blend.from] + (FIT_RADIUS[blend.to] - FIT_RADIUS[blend.from]) * blend.t;
    const d = fitDistance(r * (portrait ? 1 : 1.04));
    const halfH = d * Math.tan((camera.fov * Math.PI) / 360);
    const halfW = halfH * camera.aspect;
    // Telefonda model yuqoriroqda (matn pastda), kompyuterda o'ngda (matn chapda)
    const ox = portrait ? 0 : camera.aspect > 1.9 ? 0.42 : camera.aspect > 1.25 ? 0.36 : 0.2;
    const oy = portrait ? 0.24 : 0;
    const cx = -ox * halfW;
    const cy = -oy * halfH;
    camera.position.set(cx, cy, d);
    camera.lookAt(cx, cy, 0);
    glow.position.set(0, 0, -1.6);
    glow.scale.setScalar(r * 2.6);
  }

  let disposed = false;

  return {
    frame(progress, time, dt) {
      if (disposed) return;
      const blend = sceneBlend(reducedMotion ? 0 : progress);
      updateRing(time, progress);

      plates.forEach((pl, i) => {
        applyPose(pl.mesh, platePose(blend.from, i), platePose(blend.to, i), blend.t);
        if (!pl.sport) return;
        const m = morphAmount(blend, pl.morphIndex);
        // Avval disk kichrayadi, keyin buyum "otilib" chiqadi va aylanib joyiga tushadi
        const plateScale = 1 - smoothstep(0, 0.5, m);
        pl.plate.scale.setScalar(Math.max(plateScale, 0.0001));
        pl.plate.visible = plateScale > 0.001;
        const grow = smoothstep(0.3, 1, m);
        const objScale = grow > 0 ? SPORT_SCALE * easeOutBack(grow) : 0;
        pl.sport.object.visible = objScale > 0.001;
        if (pl.sport.object.visible) {
          pl.sport.object.scale.setScalar(objScale);
          pl.sport.object.rotation.y = (1 - grow) * 2.4;
          pl.sport.update?.(time);
        }
      });
      applyPose(bar, barPoses[blend.from], barPoses[blend.to], blend.t);

      // Butun model burchagi + nafas + sichqoncha
      const a = ROOT_ROT[blend.from];
      const b = ROOT_ROT[blend.to];
      const sway = reducedMotion
        ? 0
        : SWAY[blend.from] + (SWAY[blend.to] - SWAY[blend.from]) * blend.t;
      pointerSmooth.lerp(pointer, 1 - Math.exp(-dt * 3));
      blendA.set(
        a[0] + (b[0] - a[0]) * blend.t + Math.sin(time * 0.5) * sway * 0.25 + pointerSmooth.y * 0.12,
        a[1] + (b[1] - a[1]) * blend.t + Math.sin(time * 0.35) * sway + pointerSmooth.x * 0.2,
        a[2] + (b[2] - a[2]) * blend.t,
      );
      root.rotation.copy(blendA);

      // Portlash lahzasi: markaziy yorug'lik, nur, chang tarqaladi
      const boomW = stateWeight(blend, 1);
      const flash = Math.sin(Math.min(1, boomW) * Math.PI); // o'tish o'rtasida eng kuchli
      burst.intensity = 55 * flash + 8 * boomW;
      glowMat.opacity = 0.16 + 0.35 * flash + 0.08 * stateWeight(blend, 4);
      dust.scale.setScalar(1 + boomW * 0.9);

      if (!reducedMotion) {
        const pos = dustGeo.attributes.position as BufferAttribute;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < count; i++) {
          let yy = arr[i * 3 + 1] + speeds[i] * dt * (1 + flash * 4);
          if (yy > 6) yy = -6;
          arr[i * 3 + 1] = yy;
        }
        pos.needsUpdate = true;
        dust.rotation.y += dt * 0.02;
      }

      placeCamera(blend);
      renderer.render(scene, camera);
    },

    resize(w, h) {
      width = Math.max(1, w);
      height = Math.max(1, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },

    setPointer(x, y) {
      if (reducedMotion) return;
      pointer.set(x, y);
    },

    dispose() {
      disposed = true;
      const materials = new Set<Material>();
      scene.traverse((o) => {
        const m = o as Mesh;
        // Sprite geometriyasi three.js ichida umumiy — uni o'chirmaymiz
        if (m.geometry && !(o instanceof Sprite)) m.geometry.dispose();
        if (m.material) {
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => materials.add(x));
        }
      });
      materials.forEach((m) => m.dispose());
      dotTex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

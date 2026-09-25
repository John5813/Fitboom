/**
 * Shtanga disklari aylanadigan sport buyumlari.
 *
 * Har biri FitBoom'dagi haqiqiy zal toifasiga mos (shared/categories.ts):
 * gym, boks, suzish, yoga, velosiped, yugurish.
 *
 * Hammasi koddan yasaladi va shtanga bilan bir xil oltin/kumush
 * materialda — rangli "haqiqiy" buyum emas, kubok kabi. Shunda sahna bir
 * butun bo'lib ko'rinadi.
 *
 * Kelishuv: har bir buyum old tomoni bilan +X ga qaraydi (disk o'qi kabi),
 * tik turadi (+Y yuqori) va taxminan 0.9 radiusli sharga sig'adi.
 */
import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Shape,
  SphereGeometry,
  SplineCurve,
  TorusGeometry,
  Vector2,
} from "three";

export interface SportMaterials {
  gold: MeshStandardMaterial;
  steel: MeshStandardMaterial;
  dark: MeshStandardMaterial;
  /** Ochiq sirtlar (tasma) uchun ikki tomonlama po'lat */
  steelDouble: MeshStandardMaterial;
}

export interface SportModel {
  name: string;
  object: Object3D;
  /** Harakatlanadigan qismlar (g'ildirak, strelka) */
  update?: (time: number) => void;
}

/** +Z ga qaratib yasalgan modelni +X ga buradi */
function faceX(inner: Object3D): Group {
  const g = new Group();
  inner.rotation.y += Math.PI / 2;
  g.add(inner);
  return g;
}

function kettlebell(m: SportMaterials): SportModel {
  const g = new Group();
  const profile = [
    [0, -0.6],
    [0.34, -0.6],
    [0.5, -0.53],
    [0.6, -0.33],
    [0.62, -0.08],
    [0.56, 0.14],
    [0.42, 0.29],
    [0.2, 0.37],
    [0, 0.38],
  ].map(([x, y]) => new Vector2(x, y));
  // Spline orqali silliqlanadi — aks holda sirt qirrali bo'lib chiqadi
  const smooth = new SplineCurve(profile).getPoints(48);
  smooth[0].x = 0;
  smooth[smooth.length - 1].x = 0;
  g.add(new Mesh(new LatheGeometry(smooth, 64), m.gold));

  const handle = new Mesh(new TorusGeometry(0.33, 0.07, 16, 56, Math.PI + 0.7), m.steel);
  handle.rotation.z = -0.35;
  handle.position.y = 0.38;
  g.add(handle);
  g.position.y = -0.08;
  return { name: "gym", object: faceX(g) };
}

function boxingGlove(m: SportMaterials): SportModel {
  const g = new Group();
  /*
   * Qo'lqopning asosiy qismi bitta shardan "egib" yasaladi. Bir nechta
   * sharni ustma-ust qo'ysak, metall yaltirashi har birida alohida chiqib,
   * qo'lqop emas, sharlar to'plami bo'lib ko'rinadi.
   * Profil: tepasi keng (barmoqlar), old-past qismi bukilgan mushtga
   * o'xshab bo'rtadi, orqasi tekisroq.
   */
  const mittGeo = new SphereGeometry(1, 64, 48);
  const pos = mittGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    let X = x * 0.5;
    const Y = y * 0.52;
    let Z = z * 0.4;
    X *= 1 + 0.12 * y; // tepasi kengroq
    Z *= 1 + 0.1 * y;
    if (x > 0) X += 0.16 * x * Math.max(0, 0.6 - y); // old-past bo'rtiq (barmoqlar)
    if (x < 0) X *= 0.9; // orqasi tekisroq
    pos.setXYZ(i, X, Y, Z);
  }
  mittGeo.computeVertexNormals();
  const mitt = new Mesh(mittGeo, m.gold);
  mitt.position.set(0.06, 0.2, 0);

  // Bosh barmoq — old qirradan bo'rtib chiqadi (siluetda ko'rinsin)
  const thumb = new Mesh(new CapsuleGeometry(0.155, 0.3, 12, 28), m.gold);
  thumb.scale.set(1, 1, 0.9);
  thumb.rotation.z = -0.32;
  thumb.position.set(0.36, -0.06, 0.2);

  // Bilak qismi: qo'lqopdan torroq, pastda ochiq
  const cuff = new Mesh(new CylinderGeometry(0.29, 0.31, 0.42, 48), m.gold);
  cuff.scale.z = 0.82;
  cuff.position.set(-0.04, -0.46, 0);
  const band = new Mesh(new CylinderGeometry(0.305, 0.305, 0.09, 48, 1, true), m.steelDouble);
  band.scale.z = 0.82;
  band.position.set(-0.04, -0.32, 0);
  const rimBottom = new Mesh(new TorusGeometry(0.31, 0.025, 10, 48), m.steel);
  rimBottom.rotation.x = Math.PI / 2;
  rimBottom.scale.y = 0.82;
  rimBottom.position.set(-0.04, -0.67, 0);

  g.add(mitt, thumb, cuff, band, rimBottom);
  // Oldinga egilgan — zarba berayotgandek
  g.rotation.z = -0.28;
  g.position.set(-0.02, 0.1, 0);
  return { name: "boxing", object: faceX(g) };
}

function lifebuoy(m: SportMaterials): SportModel {
  const g = new Group();
  for (let k = 0; k < 8; k++) {
    const seg = new Mesh(
      new TorusGeometry(0.6, 0.2, 20, 18, Math.PI / 4),
      k % 2 ? m.steel : m.gold,
    );
    seg.rotation.z = (k * Math.PI) / 4;
    g.add(seg);
  }
  return { name: "swimming", object: faceX(g) };
}

function yogaMat(m: SportMaterials): SportModel {
  // O'ralgan gilamcha: Arximed spirali ko'rinishidagi tasma cho'zib chiqariladi
  const th = 0.05;
  const pitch = th + 0.022;
  const turns = 3.1;
  const r0 = 0.1;
  const n = Math.round(turns * 72);
  const inner: Vector2[] = [];
  const outer: Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * turns * Math.PI * 2;
    const r = r0 + (pitch * a) / (Math.PI * 2);
    inner.push(new Vector2(Math.cos(a) * r, Math.sin(a) * r));
    outer.push(new Vector2(Math.cos(a) * (r + th), Math.sin(a) * (r + th)));
  }
  const shape = new Shape([...inner, ...outer.reverse()]);
  const len = 1.3;
  const geo = new ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -len / 2);
  geo.computeVertexNormals();

  const roll = new Group();
  roll.add(new Mesh(geo, m.gold));
  const outerR = r0 + pitch * turns + th;
  // Tasmalar — gilamchaga yopishgan yassi halqa (ochiq silindr)
  const strapGeo = new CylinderGeometry(outerR + 0.006, outerR + 0.006, 0.07, 64, 1, true);
  strapGeo.rotateX(Math.PI / 2);
  for (const z of [-0.36, 0.36]) {
    const strap = new Mesh(strapGeo, m.steelDouble);
    strap.position.z = z;
    roll.add(strap);
  }
  // O'qni qiyalatamiz — spiral uchi ham, uzunligi ham ko'rinsin
  roll.rotation.y = -0.75;
  roll.rotation.x = 0.18;
  return { name: "yoga", object: faceX(roll) };
}

function bikeWheel(m: SportMaterials): SportModel {
  const g = new Group();
  g.add(new Mesh(new TorusGeometry(0.78, 0.075, 16, 72), m.gold));
  g.add(new Mesh(new TorusGeometry(0.7, 0.03, 10, 72), m.steel));
  const hub = new Mesh(new CylinderGeometry(0.075, 0.075, 0.24, 20), m.gold);
  hub.rotation.x = Math.PI / 2;
  g.add(hub);

  const spokes = new Group();
  const spokeGeo = new CylinderGeometry(0.012, 0.012, 0.63, 6);
  spokeGeo.translate(0, 0.385, 0);
  for (let k = 0; k < 18; k++) {
    const s = new Mesh(spokeGeo, m.steel);
    s.rotation.z = (k / 18) * Math.PI * 2;
    s.rotation.y = k % 2 ? 0.05 : -0.05;
    spokes.add(s);
  }
  g.add(spokes);
  return {
    name: "cycling",
    object: faceX(g),
    update: (time) => {
      spokes.rotation.z = -time * 1.4;
    },
  };
}

function stopwatch(m: SportMaterials): SportModel {
  const g = new Group();
  const body = new Mesh(new CylinderGeometry(0.6, 0.6, 0.18, 56), m.gold);
  body.rotation.x = Math.PI / 2;
  const bezel = new Mesh(new TorusGeometry(0.58, 0.045, 12, 56), m.steel);
  bezel.position.z = 0.09;
  const face = new Mesh(new CircleGeometry(0.54, 56), m.dark);
  face.position.z = 0.092;
  g.add(body, bezel, face);

  const tickGeo = new BoxGeometry(0.022, 0.08, 0.01);
  for (let k = 0; k < 12; k++) {
    const t = new Mesh(tickGeo, m.gold);
    const a = (k / 12) * Math.PI * 2;
    t.position.set(Math.sin(a) * 0.45, Math.cos(a) * 0.45, 0.097);
    t.rotation.z = -a;
    g.add(t);
  }

  const minuteGeo = new BoxGeometry(0.032, 0.3, 0.012);
  minuteGeo.translate(0, 0.13, 0);
  const minute = new Mesh(minuteGeo, m.steel);
  minute.position.z = 0.1;
  minute.rotation.z = -0.9;
  const secondGeo = new BoxGeometry(0.016, 0.44, 0.012);
  secondGeo.translate(0, 0.17, 0);
  const second = new Mesh(secondGeo, m.gold);
  second.position.z = 0.108;
  const cap = new Mesh(new CylinderGeometry(0.04, 0.04, 0.03, 16), m.gold);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.115;
  g.add(minute, second, cap);

  // Tepadagi toj, tugma va halqa
  const stem = new Mesh(new CylinderGeometry(0.065, 0.065, 0.14, 20), m.steel);
  stem.position.y = 0.66;
  const button = new Mesh(new CylinderGeometry(0.12, 0.12, 0.07, 28), m.gold);
  button.position.y = 0.76;
  const ring = new Mesh(new TorusGeometry(0.1, 0.028, 10, 32), m.steel);
  ring.position.y = 0.9;
  const side = new Mesh(new CylinderGeometry(0.05, 0.05, 0.12, 16), m.steel);
  side.position.set(0.47, 0.47, 0);
  side.rotation.z = -Math.PI / 4;
  g.add(stem, button, ring, side);
  g.position.y = -0.12;
  return {
    name: "running",
    object: faceX(g),
    update: (time) => {
      second.rotation.z = -time * 2.2;
    },
  };
}

/** Tartib — sahnadagi joylashuv tartibi */
export function buildSportModels(m: SportMaterials): SportModel[] {
  return [kettlebell(m), boxingGlove(m), lifebuoy(m), yogaMat(m), bikeWheel(m), stopwatch(m)];
}

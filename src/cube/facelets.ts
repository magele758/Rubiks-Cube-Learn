// facelet 几何与索引布局。
// 核心思路：每个贴纸由 (3D 位置, 外法向量) 唯一确定。
// 置换表（moves.ts）通过几何旋转这些向量推导，避免手推索引出错。
// 面顺序 U R F D L B，每面行优先(row-major)编号。

import type { Order, Face, Color, CubeState } from './types';
import { FACES } from './types';

export type Vec = readonly [number, number, number];

/** 每面的几何基：法向量、列增方向(uVec)、行增方向(vVec)，三者正交。
 *  侧面 vVec 统一为 -Y，使 U/F/D/B 竖直环上下对齐（标准展开约定）。 */
interface FaceGeom {
  normal: Vec;
  uVec: Vec; // 列 col 增加方向
  vVec: Vec; // 行 row 增加方向
}

const FACE_GEOM: Record<Face, FaceGeom> = {
  U: { normal: [0, 1, 0], uVec: [1, 0, 0], vVec: [0, 0, 1] },
  D: { normal: [0, -1, 0], uVec: [1, 0, 0], vVec: [0, 0, -1] },
  F: { normal: [0, 0, 1], uVec: [1, 0, 0], vVec: [0, -1, 0] },
  B: { normal: [0, 0, -1], uVec: [-1, 0, 0], vVec: [0, -1, 0] },
  R: { normal: [1, 0, 0], uVec: [0, 0, -1], vVec: [0, -1, 0] },
  L: { normal: [-1, 0, 0], uVec: [0, 0, 1], vVec: [0, -1, 0] },
};

/** 网格下标 -> 居中坐标。3阶: {-1,0,1}; 2阶: {-1,1}。 */
function tcoord(i: number, order: Order): number {
  return order === 3 ? i - 1 : 2 * i - 1;
}

export interface FaceletGeom {
  /** 所属面（还原态颜色） */
  face: Face;
  position: Vec;
  normal: Vec;
}

/** 某个阶数下所有贴纸的几何信息，按 facelet 索引排列。 */
export interface CubeGeometry {
  order: Order;
  facelets: FaceletGeom[];
  /** "x,y,z|nx,ny,nz" -> facelet 索引 */
  keyToIndex: Map<string, number>;
}

function vkey(p: Vec, n: Vec): string {
  return `${p[0]},${p[1]},${p[2]}|${n[0]},${n[1]},${n[2]}`;
}

/** 仅按位置分组（同一位置的多个贴纸属于同一个块 cubie）。 */
function pkey(p: Vec): string {
  return `${p[0]},${p[1]},${p[2]}`;
}

const GEOM_CACHE = new Map<Order, CubeGeometry>();

export function geometry(order: Order): CubeGeometry {
  const cached = GEOM_CACHE.get(order);
  if (cached) return cached;
  const facelets: FaceletGeom[] = [];
  const keyToIndex = new Map<string, number>();
  for (const face of FACES) {
    const g = FACE_GEOM[face];
    for (let row = 0; row < order; row++) {
      for (let col = 0; col < order; col++) {
        const c = tcoord(col, order);
        const r = tcoord(row, order);
        const position: Vec = [
          g.normal[0] + g.uVec[0] * c + g.vVec[0] * r,
          g.normal[1] + g.uVec[1] * c + g.vVec[1] * r,
          g.normal[2] + g.uVec[2] * c + g.vVec[2] * r,
        ];
        const idx = facelets.length;
        facelets.push({ face, position, normal: g.normal });
        keyToIndex.set(vkey(position, g.normal), idx);
      }
    }
  }
  const geo: CubeGeometry = { order, facelets, keyToIndex };
  GEOM_CACHE.set(order, geo);
  return geo;
}

/** 贴纸总数：3阶 54，2阶 24。 */
export function faceletCount(order: Order): number {
  return 6 * order * order;
}

/** 某面在 facelets 数组中的起始索引。 */
export function faceStart(face: Face, order: Order): number {
  return FACES.indexOf(face) * order * order;
}

/** 还原态：每个贴纸颜色 = 其所属面字母。 */
export function solved(order: Order): CubeState {
  const geo = geometry(order);
  return { order, facelets: geo.facelets.map((f) => f.face) };
}

/** 是否完全还原。 */
export function isSolved(s: CubeState): boolean {
  const geo = geometry(s.order);
  for (let i = 0; i < s.facelets.length; i++) {
    if (s.facelets[i] !== geo.facelets[i].face) return false;
  }
  return true;
}

// ---- 块（cubie）分组：供求解器按颜色找块 ----

export interface CubieSlot {
  /** 该块在还原态下应有的颜色集合（无序） */
  readonly solvedColors: Color[];
  /** 组成该块的 facelet 索引，与 solvedColors 一一对应 */
  readonly facelets: number[];
  /** 块中心位置（用于判断处于哪一层） */
  readonly position: Vec;
}

interface CubieGroups {
  corners: CubieSlot[];
  edges: CubieSlot[]; // 2阶为空
}

const CUBIE_CACHE = new Map<Order, CubieGroups>();

/** 按位置把贴纸聚成块；3 贴纸=角块，2 贴纸=棱块，1 贴纸=中心(忽略)。 */
export function cubies(order: Order): CubieGroups {
  const cached = CUBIE_CACHE.get(order);
  if (cached) return cached;
  const geo = geometry(order);
  const byPos = new Map<string, number[]>();
  for (let i = 0; i < geo.facelets.length; i++) {
    const k = pkey(geo.facelets[i].position);
    const arr = byPos.get(k) ?? [];
    arr.push(i);
    byPos.set(k, arr);
  }
  const corners: CubieSlot[] = [];
  const edges: CubieSlot[] = [];
  for (const indices of byPos.values()) {
    const slot: CubieSlot = {
      solvedColors: indices.map((i) => geo.facelets[i].face),
      facelets: indices,
      position: geo.facelets[indices[0]].position,
    };
    if (indices.length === 3) corners.push(slot);
    else if (indices.length === 2) edges.push(slot);
  }
  const groups: CubieGroups = { corners, edges };
  CUBIE_CACHE.set(order, groups);
  return groups;
}


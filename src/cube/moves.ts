// 旋转引擎：18 个基本面转的置换表，全部由几何旋转推导。
// 约定：正向面(U/R/F) 顺时针 = 绕其正坐标轴 -90°；
//       负向面(D/L/B) 顺时针 = 绕其正坐标轴 +90°。
// 这与标准 WCA 记号（从面外侧看顺时针）一致，使 Sune 等公式成立。

import type { Order, Move, CubeState, Face, Color } from './types';
import { FACES } from './types';
import { geometry, faceletCount, type Vec } from './facelets';

type Axis = 'x' | 'y' | 'z';

const FACE_AXIS: Record<Face, Axis> = {
  U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z',
};
// 顺时针对应的旋转角符号（绕正坐标轴）
const FACE_SIGN: Record<Face, 1 | -1> = {
  U: -1, R: -1, F: -1, // 正向面
  D: 1, L: 1, B: 1, // 负向面
};
// 该面所在层的坐标符号（位置在哪一侧）
const FACE_SIDE: Record<Face, 1 | -1> = {
  U: 1, R: 1, F: 1, D: -1, L: -1, B: -1,
};

/** 绕坐标轴旋转 ±90°（quarter）。sign=+1 为右手正向。 */
function rotate(v: Vec, axis: Axis, sign: 1 | -1): Vec {
  const [x, y, z] = v;
  if (axis === 'x') {
    // +90: (x,y,z)->(x,-z,y)
    return sign === 1 ? [x, -z, y] : [x, z, -y];
  }
  if (axis === 'y') {
    // +90: (x,y,z)->(z,y,-x)
    return sign === 1 ? [z, y, -x] : [-z, y, x];
  }
  // z, +90: (x,y,z)->(-y,x,z)
  return sign === 1 ? [-y, x, z] : [y, -x, z];
}

function axisComponent(v: Vec, axis: Axis): number {
  return axis === 'x' ? v[0] : axis === 'y' ? v[1] : v[2];
}

const vkey = (p: Vec, n: Vec) => `${p[0]},${p[1]},${p[2]}|${n[0]},${n[1]},${n[2]}`;

/** 生成某基本面转(quarter)的置换：next[i] = prev[perm[i]]。 */
function quarterPerm(face: Face, order: Order): number[] {
  const geo = geometry(order);
  const axis = FACE_AXIS[face];
  const sign = FACE_SIGN[face];
  const side = FACE_SIDE[face];
  const n = faceletCount(order);
  const perm = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    const fl = geo.facelets[i];
    // 不在该层的贴纸保持原位
    if (axisComponent(fl.position, axis) * side <= 0) {
      perm[i] = i;
      continue;
    }
    // 位置 i 的贴纸来自「反向旋转」的源贴纸
    const srcPos = rotate(fl.position, axis, (-sign) as 1 | -1);
    const srcNorm = rotate(fl.normal, axis, (-sign) as 1 | -1);
    const src = geo.keyToIndex.get(vkey(srcPos, srcNorm));
    if (src === undefined) {
      throw new Error(`quarterPerm: no source for facelet ${i} on ${face}`);
    }
    perm[i] = src;
  }
  return perm;
}

function composePerm(a: number[], b: number[]): number[] {
  // 先应用 a 再应用 b：result[i] = a[b[i]]
  return b.map((bi) => a[bi]);
}

function invertPerm(p: number[]): number[] {
  const inv = new Array<number>(p.length);
  for (let i = 0; i < p.length; i++) inv[p[i]] = i;
  return inv;
}

/** order -> move -> 置换表 */
const MOVE_PERM = new Map<Order, Map<Move, number[]>>();

function buildMovePerms(order: Order): Map<Move, number[]> {
  const cached = MOVE_PERM.get(order);
  if (cached) return cached;
  const table = new Map<Move, number[]>();
  for (const face of FACES) {
    const q = quarterPerm(face, order);
    const half = composePerm(q, q);
    const prime = invertPerm(q);
    table.set(face, q);
    table.set(`${face}2`, half);
    table.set(`${face}'`, prime);
  }
  MOVE_PERM.set(order, table);
  return table;
}

function applyPerm(facelets: Color[], perm: number[]): Color[] {
  const out = new Array<Color>(facelets.length);
  for (let i = 0; i < perm.length; i++) out[i] = facelets[perm[i]];
  return out;
}

/** 对状态应用单个 move。 */
export function applyMove(s: CubeState, m: Move): CubeState {
  const table = buildMovePerms(s.order);
  const perm = table.get(m);
  if (!perm) throw new Error(`unknown move: ${m}`);
  return { order: s.order, facelets: applyPerm(s.facelets, perm) };
}

/** 依次应用一串 move。 */
export function applyMoves(s: CubeState, moves: Move[]): CubeState {
  let cur = s;
  for (const m of moves) cur = applyMove(cur, m);
  return cur;
}

/** 求逆序列：反序并对每个 move 取逆（X<->X', X2 不变）。 */
export function invertMoves(moves: Move[]): Move[] {
  const out: Move[] = [];
  for (let i = moves.length - 1; i >= 0; i--) {
    const m = moves[i];
    if (m.endsWith('2')) out.push(m);
    else if (m.endsWith("'")) out.push(m[0]);
    else out.push(`${m}'`);
  }
  return out;
}

/** 把 move 串解析为数组（空格分隔），并规范化。 */
export function parseMoves(seq: string): Move[] {
  return seq.trim().split(/\s+/).filter(Boolean);
}

/** 全部 18 个基本 move（用于打乱器枚举）。 */
export function allMoves(order: Order): Move[] {
  return Array.from(buildMovePerms(order).keys());
}

/** 暴露置换表（供求解器的整数态快速层使用）。 */
export function movePerms(order: Order): Map<Move, number[]> {
  return buildMovePerms(order);
}

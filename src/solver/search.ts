// IDA* 搜索引擎：在「整数态」上做迭代加深搜索，找出把指定 facelet 归位的最短 move 序列。
// 用于 cross / 前两层的逐块插入；最后一层用具名公式宏搜索（见 lastLayer.ts）。

import type { Order, Move, CubeState } from '../cube/types';
import { FACES } from '../cube/types';
import { movePerms } from '../cube/moves';

const FACE_RANK: Record<string, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 };
const OPP: Record<string, string> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

export interface MoveSet {
  order: Order;
  names: Move[];
  perms: number[][]; // 与 names 平行
  faces: string[]; // 每个 move 的面字母
}

const MOVESET_CACHE = new Map<string, MoveSet>();

/** 构造候选 move 集合（可限定只用某些面）。 */
export function buildMoveSet(order: Order, allowedFaces?: string[]): MoveSet {
  const key = `${order}:${allowedFaces?.join('') ?? 'ALL'}`;
  const cached = MOVESET_CACHE.get(key);
  if (cached) return cached;
  const table = movePerms(order);
  const names: Move[] = [];
  const perms: number[][] = [];
  const faces: string[] = [];
  for (const [name, perm] of table) {
    const f = name[0];
    if (allowedFaces && !allowedFaces.includes(f)) continue;
    names.push(name);
    perms.push(perm);
    faces.push(f);
  }
  const ms: MoveSet = { order, names, perms, faces };
  MOVESET_CACHE.set(key, ms);
  return ms;
}

/** CubeState -> 整数态（面索引 0..5）。 */
export function toNumeric(s: CubeState): Int8Array {
  const arr = new Int8Array(s.facelets.length);
  for (let i = 0; i < s.facelets.length; i++) arr[i] = FACES.indexOf(s.facelets[i]);
  return arr;
}

/** 整数态 -> CubeState。 */
export function fromNumeric(order: Order, arr: Int8Array): CubeState {
  return { order, facelets: Array.from(arr, (n) => FACES[n]) };
}

/** facelet 索引 i 的还原态颜色索引（= 所属面索引）。 */
function solvedColor(i: number, n2: number): number {
  return Math.floor(i / n2);
}

export interface SearchOptions {
  maxDepth?: number;
}

/**
 * IDA*：找出使 targets 中所有 facelet 归位的最短 move 序列。
 * @param start 起始整数态
 * @param targets 必须归位的 facelet 索引集合（含此前阶段已归位的，保证不破坏）
 * @returns move 名数组；已满足返回 []；超出 maxDepth 返回 null
 */
export function searchToGoal(
  start: Int8Array,
  targets: number[],
  ms: MoveSet,
  opts: SearchOptions = {},
): Move[] | null {
  const maxDepth = opts.maxDepth ?? 9;
  const N = start.length;
  const n2 = N / 6;
  const targetSolved = targets.map((i) => solvedColor(i, n2));

  const goal = (s: Int8Array): boolean => {
    for (let k = 0; k < targets.length; k++) {
      if (s[targets[k]] !== targetSolved[k]) return false;
    }
    return true;
  };

  if (goal(start)) return [];

  // 预分配每层缓冲，避免 GC
  const stack: Int8Array[] = [];
  for (let d = 0; d <= maxDepth; d++) stack.push(new Int8Array(N));
  stack[0].set(start);

  const movesIdx: number[] = [];
  const faceStack: string[] = [];
  const { names, perms, faces } = ms;
  const M = names.length;

  function dfs(depth: number, limit: number): boolean {
    const cur = stack[depth];
    const pf = faceStack.length ? faceStack[faceStack.length - 1] : '';
    for (let m = 0; m < M; m++) {
      const f = faces[m];
      if (f === pf) continue; // 不连续转同一面
      if (OPP[f] === pf && FACE_RANK[f] < FACE_RANK[pf]) continue; // 对面交换只保留一种顺序
      const next = stack[depth + 1];
      const perm = perms[m];
      for (let i = 0; i < N; i++) next[i] = cur[perm[i]];
      if (depth + 1 === limit) {
        if (goal(next)) {
          movesIdx.push(m);
          return true;
        }
      } else {
        movesIdx.push(m);
        faceStack.push(f);
        if (dfs(depth + 1, limit)) return true;
        faceStack.pop();
        movesIdx.pop();
      }
    }
    return false;
  }

  for (let limit = 1; limit <= maxDepth; limit++) {
    movesIdx.length = 0;
    faceStack.length = 0;
    if (dfs(0, limit)) return movesIdx.map((i) => names[i]);
  }
  return null;
}

/**
 * 谓词版 IDA*：找出使 predicate(state)===true 的最短 move 序列。
 * 用于「把某块送到顶层」这类无法用固定 facelet 集合表达的目标。
 */
export function searchPredicate(
  start: Int8Array,
  predicate: (s: Int8Array) => boolean,
  ms: MoveSet,
  opts: SearchOptions = {},
): Move[] | null {
  const maxDepth = opts.maxDepth ?? 9;
  const N = start.length;
  if (predicate(start)) return [];

  const stack: Int8Array[] = [];
  for (let d = 0; d <= maxDepth; d++) stack.push(new Int8Array(N));
  stack[0].set(start);

  const movesIdx: number[] = [];
  const faceStack: string[] = [];
  const { names, perms, faces } = ms;
  const M = names.length;

  function dfs(depth: number, limit: number): boolean {
    const cur = stack[depth];
    const pf = faceStack.length ? faceStack[faceStack.length - 1] : '';
    for (let m = 0; m < M; m++) {
      const f = faces[m];
      if (f === pf) continue;
      if (OPP[f] === pf && FACE_RANK[f] < FACE_RANK[pf]) continue;
      const next = stack[depth + 1];
      const perm = perms[m];
      for (let i = 0; i < N; i++) next[i] = cur[perm[i]];
      if (depth + 1 === limit) {
        if (predicate(next)) {
          movesIdx.push(m);
          return true;
        }
      } else {
        movesIdx.push(m);
        faceStack.push(f);
        if (dfs(depth + 1, limit)) return true;
        faceStack.pop();
        movesIdx.pop();
      }
    }
    return false;
  }

  for (let limit = 1; limit <= maxDepth; limit++) {
    movesIdx.length = 0;
    faceStack.length = 0;
    if (dfs(0, limit)) return movesIdx.map((i) => names[i]);
  }
  return null;
}

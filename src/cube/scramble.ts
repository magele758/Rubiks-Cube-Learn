// WCA 风格 random-move 打乱器。
// 过滤冗余：不连续转同一面；避免 A oppo(A) A 形式的回退冗余。

import type { Order, Move, Face } from './types';
import { FACES, OPPOSITE } from './types';
import { applyMoves } from './moves';
import { solved } from './facelets';
import type { CubeState } from './types';

const SUFFIX = ['', "'", '2'];

export interface ScrambleResult {
  moves: Move[];
  state: CubeState;
}

function defaultRng(): number {
  return Math.random();
}

/** 生成打乱序列并返回打乱后的状态。
 *  2阶默认仅用 U R F 三面（无中心，三面即可达全状态），长度 9；
 *  3阶用全部六面，长度 20。 */
export function scramble(
  order: Order,
  opts: { length?: number; rng?: () => number } = {},
): ScrambleResult {
  const rng = opts.rng ?? defaultRng;
  const length = opts.length ?? (order === 3 ? 20 : 9);
  const faces: Face[] = order === 3 ? FACES : ['U', 'R', 'F'];

  const moves: Move[] = [];
  let last: Face | null = null;
  let beforeLast: Face | null = null;

  while (moves.length < length) {
    const face = faces[Math.floor(rng() * faces.length)];
    // 不与上一步同面
    if (face === last) continue;
    // 避免 A oppo(A) A：若当前面与上上步同面，且上一步是其对面，则跳过
    if (face === beforeLast && last !== null && last === OPPOSITE[face]) continue;
    const suffix = SUFFIX[Math.floor(rng() * SUFFIX.length)];
    moves.push(`${face}${suffix}`);
    beforeLast = last;
    last = face;
  }

  return { moves, state: applyMoves(solved(order), moves) };
}

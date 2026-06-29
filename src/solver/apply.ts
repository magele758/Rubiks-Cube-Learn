// 整数态上的置换应用工具，以及把 move 序列编译成单一置换。
import type { Order, Move } from '../cube/types';
import { movePerms } from '../cube/moves';

/** 对整数态应用一个置换：out[i] = state[perm[i]]。 */
export function applyMovesNum(state: Int8Array, perm: number[]): Int8Array {
  const N = state.length;
  const out = new Int8Array(N);
  for (let i = 0; i < N; i++) out[i] = state[perm[i]];
  return out;
}

/** 把一串 move 编译成单一等价置换（identity 后依次复合）。 */
export function compileMoves(order: Order, moves: Move[]): number[] {
  const table = movePerms(order);
  const N = 6 * order * order;
  // 起始为恒等置换
  let perm = new Array<number>(N);
  for (let i = 0; i < N; i++) perm[i] = i;
  for (const m of moves) {
    const p = table.get(m);
    if (!p) throw new Error(`compileMoves: unknown move ${m}`);
    // 复合：new[i] = perm[p[i]]（先 perm 后 p）
    const next = new Array<number>(N);
    for (let i = 0; i < N; i++) next[i] = perm[p[i]];
    perm = next;
  }
  return perm;
}

// 最后一层宏搜索：以 (AUF + 具名公式) 为字母表，搜出达成阶段目标的序列。
// 每个应用对应一个教学步（携带公式名）。比逐 case 识别更稳健、必收敛。
import type { Move } from '../cube/types';
import { applyMovesNum } from './apply';
import type { NamedAlg } from './algorithms';

export interface MacroStep {
  alg: NamedAlg | null; // null 表示纯 AUF 调整
  auf: Move[]; // 公式前的 U 调整
  moves: Move[]; // auf + alg.moves
}

export interface MacroSymbol {
  alg: NamedAlg | null;
  auf: Move[];
  perm: number[]; // 该符号对应的整体置换（预编译）
  moves: Move[];
}

const AUF_OPTS: Move[][] = [[], ['U'], ["U'"], ['U2']];

/** 把 AUF + 公式编译成一个置换符号集合。 */
export function buildMacroAlphabet(
  _order: number,
  algs: (NamedAlg | null)[],
  permOf: (moves: Move[]) => number[],
): MacroSymbol[] {
  const out: MacroSymbol[] = [];
  for (const alg of algs) {
    const algMoves = alg ? alg.moves : [];
    for (const auf of AUF_OPTS) {
      if (!alg && auf.length === 0) continue; // 空符号跳过
      const moves = [...auf, ...algMoves];
      out.push({ alg, auf, perm: permOf(moves), moves });
    }
  }
  return out;
}

/**
 * 在宏字母表上做迭代加深搜索，找出使 goal 满足的符号序列。
 * goal 直接在整数态上判定。
 */
export function macroSearch(
  start: Int8Array,
  alphabet: MacroSymbol[],
  goal: (s: Int8Array) => boolean,
  maxDepth = 5,
): MacroStep[] | null {
  if (goal(start)) return [];
  const path: number[] = [];
  const states: Int8Array[] = [start];

  function dfs(depth: number, limit: number): boolean {
    const cur = states[depth];
    for (let a = 0; a < alphabet.length; a++) {
      const next = applyMovesNum(cur, alphabet[a].perm);
      if (depth + 1 === limit) {
        if (goal(next)) {
          path.push(a);
          return true;
        }
      } else {
        path.push(a);
        states[depth + 1] = next;
        if (dfs(depth + 1, limit)) return true;
        states.length = depth + 1;
        path.pop();
      }
    }
    return false;
  }

  for (let limit = 1; limit <= maxDepth; limit++) {
    path.length = 0;
    states.length = 1;
    if (dfs(0, limit)) {
      return path.map((a) => ({
        alg: alphabet[a].alg,
        auf: alphabet[a].auf,
        moves: alphabet[a].moves,
      }));
    }
  }
  return null;
}

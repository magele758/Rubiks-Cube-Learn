// 3x3 / 2x2 主求解器：把各阶段串起来，输出带教学元数据的 Solution。
import type { Order, Move, CubeState } from '../cube/types';
import { applyMoves } from '../cube/moves';
import { isSolved } from '../cube/facelets';
import { cubies } from '../cube/facelets';
import { searchToGoal, buildMoveSet, toNumeric, fromNumeric } from './search';
import { compileMoves } from './apply';
import { buildMacroAlphabet, macroSearch } from './macro';
import {
  crossFacelets, f1lCornerFacelets, f2lEdgeFacelets,
  ollEdgeFacelets, ollFaceFacelets, allFacelets,
} from './goals';
import {
  OLL_EDGE, SUNE, ANTISUNE, PLL_ALGS,
  P2_PLL_ADJ, P2_PLL_DIAG, type NamedAlg,
} from './algorithms';
import type { PhaseId } from './types';

/** 求解中间产物：一步原始记录（教学文案稍后注入）。 */
export interface RawStep {
  phase: PhaseId;
  caseId: string;
  algorithmName: string;
  moves: Move[];
  targetFacelets: number[];
}

const EPS = 0.001;

/** 逐块搜索阶段：对每个槽位（按 facelet 分组），搜出归位序列且不破坏已归位部分。 */
function solveByPieces(
  start: CubeState,
  slotGroups: number[][], // 每个元素是一个块的 facelet 索引
  phase: PhaseId,
  caseId: string,
  algName: string,
  maxDepth: number,
): { steps: RawStep[]; state: CubeState } {
  const ms = buildMoveSet(start.order);
  let cur = start;
  const steps: RawStep[] = [];
  const solvedSoFar: number[] = [];
  for (const slot of slotGroups) {
    const targets = [...solvedSoFar, ...slot];
    const num = toNumeric(cur);
    const moves = searchToGoal(num, targets, ms, { maxDepth });
    if (moves === null) {
      throw new Error(`${phase}: 搜索失败（块 ${slot.join(',')}）`);
    }
    solvedSoFar.push(...slot);
    if (moves.length === 0) continue; // 已就位
    cur = applyMoves(cur, moves);
    steps.push({ phase, caseId, algorithmName: algName, moves, targetFacelets: slot });
  }
  return { steps, state: cur };
}

/** 把 facelet 索引按所属块（同位置）分组。 */
function groupByPiece(order: Order, facelets: number[]): number[][] {
  const geo = cubies(order);
  const all = [...geo.corners, ...geo.edges];
  const groups: number[][] = [];
  for (const slot of all) {
    const inter = slot.facelets.filter((i) => facelets.includes(i));
    if (inter.length > 0) groups.push(inter);
  }
  return groups;
}

/** 宏搜索阶段（最后一层）。 */
function solveByMacro(
  start: CubeState,
  algs: (NamedAlg | null)[],
  goalFacelets: number[],
  phase: PhaseId,
  maxDepth: number,
): { steps: RawStep[]; state: CubeState } {
  const order = start.order;
  const n2 = (6 * order * order) / 6;
  const solvedColor = (i: number) => Math.floor(i / n2);
  const targetCol = goalFacelets.map(solvedColor);
  const goal = (s: Int8Array) => {
    for (let k = 0; k < goalFacelets.length; k++) {
      if (s[goalFacelets[k]] !== targetCol[k]) return false;
    }
    return true;
  };
  const alphabet = buildMacroAlphabet(order, algs, (mv) => compileMoves(order, mv));
  const num = toNumeric(start);
  const macro = macroSearch(num, alphabet, goal, maxDepth);
  if (macro === null) throw new Error(`${phase}: 宏搜索失败`);
  let cur = start;
  const steps: RawStep[] = [];
  for (const ms of macro) {
    if (ms.moves.length === 0) continue;
    cur = applyMoves(cur, ms.moves);
    steps.push({
      phase,
      caseId: ms.alg ? ms.alg.id : `${phase}-auf`,
      algorithmName: ms.alg ? ms.alg.name : '调整顶层(AUF)',
      moves: ms.moves,
      targetFacelets: goalFacelets,
    });
  }
  return { steps, state: cur };
}

export { solveByPieces, groupByPiece, solveByMacro, EPS };
export {
  crossFacelets, f1lCornerFacelets, f2lEdgeFacelets,
  ollEdgeFacelets, ollFaceFacelets, allFacelets,
};
export { OLL_EDGE, SUNE, ANTISUNE, PLL_ALGS, P2_PLL_ADJ, P2_PLL_DIAG };
export { isSolved, fromNumeric };

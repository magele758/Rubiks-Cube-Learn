// 前两层逐块求解：insert-or-eject + 每槽位受限生成元。
// 关键：某槽位的「生成元」= U + 该槽位触及的侧面（= 其还原色去掉 U/D）。
// 分支因子 ~6，干净插入 ≤8 步，搜索 ~50ms；块若埋在别处先 eject 到顶层再 insert。
import type { Order, CubeState, Face } from '../cube/types';
import { FACES } from '../cube/types';
import { applyMoves } from '../cube/moves';
import { cubies, type CubieSlot } from '../cube/facelets';
import {
  searchToGoal, searchPredicate, buildMoveSet, toNumeric, type MoveSet,
} from './search';
import type { RawStep } from './engine';
import type { PhaseId } from './types';

const EPS = 0.001;

interface SlotMeta {
  slot: CubieSlot;
  facelets: number[];
  colorIdx: number[]; // 还原色（面索引），与 facelets 平行
  colorSet: number[]; // 排序后的色集合（判定块身份）
  gen: MoveSet; // 该槽位受限生成元
  isUpper: boolean; // 是否顶层槽位（y>0）
}

const colorToIdx = (c: Face) => FACES.indexOf(c);
const sortNums = (a: number[]) => [...a].sort((x, y) => x - y);

function buildSlotMeta(order: Order, slot: CubieSlot): SlotMeta {
  const sideFaces = slot.solvedColors.filter((c) => c !== 'U' && c !== 'D');
  const gen = buildMoveSet(order, ['U', ...sideFaces]);
  return {
    slot,
    facelets: slot.facelets,
    colorIdx: slot.facelets.map((i) => colorToIdx(slot.solvedColors[slot.facelets.indexOf(i)])),
    colorSet: sortNums(slot.solvedColors.map(colorToIdx)),
    gen,
    isUpper: slot.position[1] > EPS,
  };
}

/** 当前态下，色集合等于 target 的块所在槽位是否在顶层。 */
function pieceIsUpper(arr: Int8Array, slots: SlotMeta[], target: number[]): boolean {
  for (const sm of slots) {
    const cur = sortNums(sm.facelets.map((i) => arr[i]));
    if (cur.length === target.length && cur.every((v, k) => v === target[k])) {
      return sm.isUpper;
    }
  }
  return false;
}

/** 找到持有 target 色集合的槽位。 */
function locateSlot(arr: Int8Array, slots: SlotMeta[], target: number[]): SlotMeta | null {
  for (const sm of slots) {
    const cur = sortNums(sm.facelets.map((i) => arr[i]));
    if (cur.length === target.length && cur.every((v, k) => v === target[k])) return sm;
  }
  return null;
}

/** 顶层判定谓词工厂：preserve 全部 + 目标块进入顶层。 */
function makeEjectPredicate(allSlots: SlotMeta[], target: number[], preserve: number[]) {
  return (arr: Int8Array): boolean => {
    const n2 = arr.length / 6;
    for (const idx of preserve) {
      if (arr[idx] !== Math.floor(idx / n2)) return false;
    }
    return pieceIsUpper(arr, allSlots, target);
  };
}

/**
 * 求解一层（cross 之上的 F1L 角 / F2L 棱）。
 * @param targetSlots 本阶段要归位的槽位（非顶层）
 * @param allSlots 该类型全部槽位（用于定位块）
 * @param prevSolved 此前已归位 facelet（保护）
 */
export function solveLayer(
  start: CubeState,
  targetSlots: CubieSlot[],
  allSlots: CubieSlot[],
  prevSolved: number[],
  phase: PhaseId,
  caseId: string,
  algName: string,
): { steps: RawStep[]; state: CubeState } {
  const order = start.order;
  const allMeta = allSlots.map((s) => buildSlotMeta(order, s));
  const targetMeta = targetSlots.map((s) => buildSlotMeta(order, s));
  let cur = start;
  const steps: RawStep[] = [];
  const solvedSoFar = [...prevSolved];

  for (const tm of targetMeta) {
    const target = tm.colorSet;
    let guard = 0;
    // 已就位？
    const isSolved = () => tm.facelets.every(
      (i, k) => toNumeric(cur)[i] === tm.colorIdx[k],
    );
    while (!isSolved()) {
      if (++guard > 12) throw new Error(`${phase}: 槽位未收敛`);
      const num = toNumeric(cur);
      if (pieceIsUpper(num, allMeta, target)) {
        // 在顶层 → 用本槽生成元插入，保护 solvedSoFar + 本槽
        const moves = searchToGoal(num, [...solvedSoFar, ...tm.facelets], tm.gen, { maxDepth: 10 });
        if (moves === null) throw new Error(`${phase}: 插入搜索失败`);
        if (moves.length) {
          cur = applyMoves(cur, moves);
          steps.push({ phase, caseId, algorithmName: algName, moves, targetFacelets: tm.facelets });
        }
      } else {
        // 埋在某非顶层槽 S → 用 S 的生成元把它顶到顶层，保护 solvedSoFar
        const S = locateSlot(num, allMeta, target);
        if (!S) throw new Error(`${phase}: 找不到目标块`);
        const pred = makeEjectPredicate(allMeta, target, solvedSoFar);
        const moves = searchPredicate(num, pred, S.gen, { maxDepth: 10 });
        if (moves === null) throw new Error(`${phase}: 提取搜索失败`);
        if (moves.length === 0) throw new Error(`${phase}: 提取无进展`);
        cur = applyMoves(cur, moves);
        steps.push({ phase, caseId: `${caseId}-eject`, algorithmName: `${algName}(调出)`, moves, targetFacelets: tm.facelets });
      }
    }
    solvedSoFar.push(...tm.facelets);
  }
  return { steps, state: cur };
}

/** 取某类型槽位（corner/edge）的几何分组。 */
export function cornerSlots(order: Order): CubieSlot[] {
  return cubies(order).corners;
}
export function edgeSlots(order: Order): CubieSlot[] {
  return cubies(order).edges;
}

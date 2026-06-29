// 块（cubie）派生访问器：从 facelet 状态读出棱块/角块的位置与朝向。
// 求解器不维护独立块模型，全部从 facelets 派生，避免双状态同步问题。

import type { CubeState, Color, Face } from './types';
import { geometry, cubies, type Vec, type CubieSlot } from './facelets';

/** 某个物理槽位当前的实况。 */
export interface CubieView {
  /** 该槽位的几何信息（solvedColors=还原态应有颜色，position=槽位中心） */
  slot: CubieSlot;
  /** 当前占据该槽位的块的颜色，按 slot.facelets 顺序排列 */
  current: Color[];
  /** 是否已正确归位（颜色与朝向都对：每个 facelet 颜色==其面字母） */
  solved: boolean;
}

function readSlots(s: CubeState, slots: CubieSlot[]): CubieView[] {
  const geo = geometry(s.order);
  return slots.map((slot) => {
    const current = slot.facelets.map((i) => s.facelets[i]);
    const solved = slot.facelets.every((i) => s.facelets[i] === geo.facelets[i].face);
    return { slot, current, solved };
  });
}

/** 所有棱块槽位实况（2阶为空）。 */
export function readEdges(s: CubeState): CubieView[] {
  return readSlots(s, cubies(s.order).edges);
}

/** 所有角块槽位实况。 */
export function readCorners(s: CubeState): CubieView[] {
  return readSlots(s, cubies(s.order).corners);
}

function sameColorSet(a: readonly Color[], b: readonly Color[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((c, i) => c === sb[i]);
}

/** 找到「带有指定颜色集合」的棱块当前所在槽位实况。 */
export function findEdge(s: CubeState, colors: Color[]): CubieView {
  const v = readEdges(s).find((e) => sameColorSet(e.current, colors));
  if (!v) throw new Error(`findEdge: no edge with colors ${colors.join('')}`);
  return v;
}

/** 找到「带有指定颜色集合」的角块当前所在槽位实况。 */
export function findCorner(s: CubeState, colors: Color[]): CubieView {
  const v = readCorners(s).find((c) => sameColorSet(c.current, colors));
  if (!v) throw new Error(`findCorner: no corner with colors ${colors.join('')}`);
  return v;
}

/** 该槽位在某轴上的坐标符号（-1/0/+1），用于判断处于哪一层。 */
export function axisOf(position: Vec, axis: 'x' | 'y' | 'z'): number {
  const c = axis === 'x' ? position[0] : axis === 'y' ? position[1] : position[2];
  return Math.sign(c);
}

/** 在指定槽位中，某面方向上的贴纸当前颜色。
 *  face 必须是该槽位实际朝外的方向之一。 */
export function colorOnFace(s: CubeState, view: CubieView, face: Face): Color | undefined {
  const geo = geometry(s.order);
  for (const idx of view.slot.facelets) {
    if (geo.facelets[idx].face === face) return s.facelets[idx];
  }
  return undefined;
}

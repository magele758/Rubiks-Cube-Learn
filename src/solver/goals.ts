// 各阶段目标：用几何位置算出「该阶段必须归位的 facelet 索引集合」。
// 约定 D=白底，U=黄顶。
import type { Order } from '../cube/types';
import { geometry } from '../cube/facelets';

const EPS = 0.001;
const isZero = (v: number) => Math.abs(v) < EPS;
const isPos = (v: number) => v > EPS;
const isNeg = (v: number) => v < -EPS;

/** 底层(D, y<0) 棱块的 facelet 索引（cross 目标）。 */
export function crossFacelets(order: Order): number[] {
  const geo = geometry(order);
  const out: number[] = [];
  geo.facelets.forEach((f, i) => {
    const [x, y, z] = f.position;
    // 棱块：恰有一个坐标为 0；底层：y<0
    const zeros = [x, y, z].filter(isZero).length;
    if (zeros === 1 && isNeg(y)) out.push(i);
  });
  return out;
}

/** 底层(D) 角块 facelet（第一层角块目标）。 */
export function f1lCornerFacelets(order: Order): number[] {
  const geo = geometry(order);
  const out: number[] = [];
  geo.facelets.forEach((f, i) => {
    const [x, y, z] = f.position;
    const zeros = [x, y, z].filter(isZero).length;
    if (zeros === 0 && isNeg(y)) out.push(i); // 角块且底层
  });
  return out;
}

/** 中层(y≈0) 棱块 facelet（第二层棱块目标）。3阶专用。 */
export function f2lEdgeFacelets(order: Order): number[] {
  const geo = geometry(order);
  const out: number[] = [];
  geo.facelets.forEach((f, i) => {
    const [x, y, z] = f.position;
    const zeros = [x, y, z].filter(isZero).length;
    if (zeros === 1 && isZero(y)) out.push(i); // 中层棱
  });
  return out;
}

/** 顶面(U) 上的棱块贴纸（黄十字目标：这些贴纸应为黄=U）。 */
export function ollEdgeFacelets(order: Order): number[] {
  const geo = geometry(order);
  const out: number[] = [];
  geo.facelets.forEach((f, i) => {
    const [x, y, z] = f.position;
    const zeros = [x, y, z].filter(isZero).length;
    if (f.face === 'U' && zeros === 1 && isPos(y)) out.push(i);
  });
  return out;
}

/** 整个顶面 U 的贴纸（顶面全黄目标）。 */
export function ollFaceFacelets(order: Order): number[] {
  const geo = geometry(order);
  const out: number[] = [];
  geo.facelets.forEach((f, i) => {
    if (f.face === 'U') out.push(i);
  });
  return out;
}

/** 全部 facelet（完全还原目标）。 */
export function allFacelets(order: Order): number[] {
  const geo = geometry(order);
  return geo.facelets.map((_, i) => i);
}

/** 2阶底层 4 角的 facelet。 */
export function p2Layer1Facelets(order: Order): number[] {
  return f1lCornerFacelets(order);
}

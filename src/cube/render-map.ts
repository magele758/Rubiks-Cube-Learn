// facelet 颜色（面字母）-> 显示色，以及 Three.js 贴纸的 3D 位置/朝向。
import type { Color, Order } from './types';
import { geometry, type Vec } from './facelets';

/** 标准配色（西方配色）：白底黄顶，红橙、绿蓝相对。 */
export const DISPLAY_COLOR: Record<Color, string> = {
  U: '#FFD500', // 上 = 黄
  D: '#FFFFFF', // 下 = 白
  F: '#009E60', // 前 = 绿
  B: '#0051BA', // 后 = 蓝
  R: '#C41E3A', // 右 = 红
  L: '#FF5800', // 左 = 橙
};

/** 中文色名，用于讲解文案。 */
export const COLOR_NAME: Record<Color, string> = {
  U: '黄', D: '白', F: '绿', B: '蓝', R: '红', L: '橙',
};

export interface FaceletRender {
  index: number;
  position: Vec; // 贴纸中心（外移半格便于渲染）
  normal: Vec;
}

/** 提供给渲染层的贴纸几何（位置已沿法向外移，避免与内核重叠）。 */
export function faceletRenders(order: Order): FaceletRender[] {
  const geo = geometry(order);
  return geo.facelets.map((f, index) => ({
    index,
    position: f.position,
    normal: f.normal,
  }));
}

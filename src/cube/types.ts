// 魔方引擎核心类型定义

/** 阶数：2 阶或 3 阶 */
export type Order = 2 | 3;

/** 六个面（也直接用作颜色标识）。
 *  U=上 R=右 F=前 D=下 L=左 B=后 */
export type Face = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

/** 颜色：内部用面字母表示，与朝向无关、便于测试。
 *  还原态下，facelet[i] 的颜色恰等于其所属面的字母。
 *  显示色（白/黄/红/橙/绿/蓝）由 render-map 映射。 */
export type Color = Face;

/** WCA move 记号：基本面转 U/R/F/D/L/B，
 *  加修饰：'（逆时针）、2（180°）。如 "U" "R'" "F2"。 */
export type Move = string;

/** 魔方状态。facelets 是唯一可变状态来源（长度 54 或 24）。 */
export interface CubeState {
  readonly order: Order;
  readonly facelets: Color[];
}

/** 六面固定顺序，决定 facelet 索引分段。 */
export const FACES: Face[] = ['U', 'R', 'F', 'D', 'L', 'B'];

/** 相对面映射，打乱器去冗余时使用。 */
export const OPPOSITE: Record<Face, Face> = {
  U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F',
};

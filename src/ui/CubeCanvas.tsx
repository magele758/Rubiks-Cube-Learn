// 3D 魔方渲染：用 Three.js 把 facelet 状态渲染成立体魔方，
// 支持拖拽旋转视角 + 转层动画。通过 ref 暴露命令式 API 给上层驱动。
import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CubeState, Move, Order } from '../cube/types';
import { faceletRenders, DISPLAY_COLOR } from '../cube/render-map';
import { applyMove } from '../cube/moves';

export interface CubeHandle {
  setStateInstant: (s: CubeState) => void;
  animateMoves: (moves: Move[], stepMs: number) => Promise<void>;
  highlight: (facelets: number[]) => void;
}

// 每个面顺时针旋转对应的世界轴与角度符号（与引擎置换约定一致）。
const FACE_AXIS: Record<string, [number, number, number]> = {
  U: [0, 1, 0], D: [0, 1, 0], R: [1, 0, 0], L: [1, 0, 0], F: [0, 0, 1], B: [0, 0, 1],
};
const FACE_SIGN: Record<string, number> = { U: -1, R: -1, F: -1, D: 1, L: 1, B: 1 };
const FACE_SIDE: Record<string, number> = { U: 1, R: 1, F: 1, D: -1, L: -1, B: -1 };
const AXIS_INDEX: Record<string, number> = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 };

interface Props {
  order: Order;
  initial: CubeState;
}

const round = (v: number) => Math.round(v);
// 网格坐标步长：3阶 {-1,0,1} 步长1；2阶 {-1,1} 步长2。
// gridScale 把网格值映射到世界中心坐标，使「中心间距」两阶数都略大于方块尺寸。
// cubeletSize 为方块物理边长。两者独立，避免单一 pitch 在 2 阶把缝撑开。
const gridScaleOf = (ord: Order) => (ord === 3 ? 1.0 : 0.75); // 中心间距：3阶=1.0，2阶=1.5
const cubeletSizeOf = (ord: Order) => (ord === 3 ? 0.96 : 1.44); // 略小于中心间距，留细缝

export const CubeCanvas = forwardRef<CubeHandle, Props>(function CubeCanvas(
  { order, initial },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneApi = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    cubeGroup: THREE.Group;
    stickerMat: Map<number, THREE.MeshBasicMaterial>;
    cubelets: { group: THREE.Group; grid: [number, number, number] }[];
    state: CubeState;
    raf: number;
  } | null>(null);

  // 初始化场景（只跑一次 / order 变化时重建）
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4, 4, 5.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 4;
    controls.maxDistance = 14;
    controls.rotateSpeed = 0.9;

    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const dir = new THREE.DirectionalLight(0xffffff, 0.4);
    dir.position.set(5, 8, 6);
    scene.add(dir);

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    sceneApi.current = {
      renderer, scene, camera, controls, cubeGroup,
      stickerMat: new Map(), cubelets: [], state: initial, raf: 0,
    };

    buildCubelets(order);

    const animate = () => {
      const api = sceneApi.current;
      if (!api) return;
      api.controls.update();
      api.renderer.render(api.scene, api.camera);
      api.raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      const api = sceneApi.current;
      if (!api || !mount) return;
      const w = mount.clientWidth, h = mount.clientHeight;
      api.camera.aspect = w / h;
      api.camera.updateProjectionMatrix();
      api.renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      const api = sceneApi.current;
      if (api) {
        cancelAnimationFrame(api.raf);
        api.controls.dispose();
        api.renderer.dispose();
        if (api.renderer.domElement.parentNode === mount) {
          mount.removeChild(api.renderer.domElement);
        }
      }
      sceneApi.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  // 构建所有小方块（cubelet）+ 贴纸
  function buildCubelets(ord: Order) {
    const api = sceneApi.current;
    if (!api) return;
    // 清空旧的
    api.cubeGroup.clear();
    api.stickerMat.clear();
    api.cubelets = [];

    const gridScale = gridScaleOf(ord);
    const cubeletSize = cubeletSizeOf(ord);
    const stickerSize = cubeletSize * 0.86;
    const renders = faceletRenders(ord);

    // 按 cubelet 网格分组
    const byCubelet = new Map<string, number[]>();
    for (const r of renders) {
      const g = r.position.map(round) as [number, number, number];
      const key = g.join(',');
      const arr = byCubelet.get(key) ?? [];
      arr.push(r.index);
      byCubelet.set(key, arr);
    }

    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x101216 });
    for (const [key, indices] of byCubelet) {
      const grid = key.split(',').map(Number) as [number, number, number];
      const group = new THREE.Group();
      group.position.set(grid[0] * gridScale, grid[1] * gridScale, grid[2] * gridScale);
      const body = new THREE.Mesh(new THREE.BoxGeometry(cubeletSize, cubeletSize, cubeletSize), bodyMat);
      group.add(body);
      for (const idx of indices) {
        const r = renders[idx];
        const mat = new THREE.MeshBasicMaterial({ color: DISPLAY_COLOR[api.state.facelets[idx]] });
        const sticker = new THREE.Mesh(new THREE.PlaneGeometry(stickerSize, stickerSize), mat);
        const n = r.normal;
        sticker.position.set(n[0] * cubeletSize / 2 + 0.001 * n[0], n[1] * cubeletSize / 2 + 0.001 * n[1], n[2] * cubeletSize / 2 + 0.001 * n[2]);
        sticker.lookAt(sticker.position.clone().add(new THREE.Vector3(n[0], n[1], n[2])));
        group.add(sticker);
        api.stickerMat.set(idx, mat);
      }
      api.cubeGroup.add(group);
      api.cubelets.push({ group, grid });
    }
    recolor(api.state);
  }

  function recolor(s: CubeState) {
    const api = sceneApi.current;
    if (!api) return;
    for (const [idx, mat] of api.stickerMat) {
      mat.color.set(DISPLAY_COLOR[s.facelets[idx]]);
    }
  }

  useImperativeHandle(ref, () => ({
    setStateInstant: (s: CubeState) => {
      const api = sceneApi.current;
      if (!api) return;
      api.state = s;
      for (const c of api.cubelets) c.group.rotation.set(0, 0, 0);
      recolor(s);
    },
    highlight: () => { /* 预留：高亮目标块 */ },
    animateMoves: async (moves: Move[], stepMs: number) => {
      const api = sceneApi.current;
      if (!api) return;
      for (const m of moves) {
        await animateSingle(m, stepMs);
      }
    },
  }));

  // 转层动画：cubelet 永不永久移动。绕 pivot 旋转后复位、按 facelet 重新着色。
  // 因 90° 转层是 facelet 位置的双射，复位后的着色与旋转后画面完全一致，故复位不可见。
  function animateSingle(move: Move, stepMs: number): Promise<void> {
    return new Promise((resolve) => {
      const api = sceneApi.current;
      if (!api) { resolve(); return; }
      const face = move[0];
      const axisVec = FACE_AXIS[face];
      const axisIdx = AXIS_INDEX[face];
      const side = FACE_SIDE[face];
      let turns = 1;
      if (move.endsWith('2')) turns = 2;
      else if (move.endsWith("'")) turns = -1;
      const baseAngle = FACE_SIGN[face] * (Math.PI / 2) * turns;

      // 按固定 grid 选中该层 cubelet（grid 永不改变）
      const selected = api.cubelets.filter((c) => {
        const v = c.grid[axisIdx];
        return side > 0 ? v > 0 : v < 0;
      });

      const pivot = new THREE.Group();
      api.cubeGroup.add(pivot);
      // 用 add（保留 local 坐标），pivot 在原点，世界位置不变
      for (const c of selected) pivot.add(c.group);

      const axis = new THREE.Vector3(axisVec[0], axisVec[1], axisVec[2]);
      const duration = Math.max(60, stepMs);
      const t0 = performance.now();
      const tick = () => {
        const api2 = sceneApi.current;
        if (!api2) { resolve(); return; }
        const t = Math.min(1, (performance.now() - t0) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        pivot.setRotationFromAxisAngle(axis, baseAngle * eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // 收尾：cubelet 交还 cubeGroup（local 坐标不变=复位到家），提交逻辑状态、重着色
          for (const c of selected) {
            api2.cubeGroup.add(c.group);
            c.group.rotation.set(0, 0, 0);
            c.group.position.set(c.grid[0] * gridScaleOf(order), c.grid[1] * gridScaleOf(order), c.grid[2] * gridScaleOf(order));
          }
          api2.cubeGroup.remove(pivot);
          api2.state = applyMove(api2.state, move);
          recolor(api2.state);
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
});

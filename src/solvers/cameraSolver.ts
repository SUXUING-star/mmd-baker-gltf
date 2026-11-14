// src/solvers/cameraSolver.ts
import * as THREE from 'three';
import { ensureQuatContinuity } from './mathUtils';

export interface RawCameraFrame {
  time: number;
  fov: number;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  target?: [number, number, number];
}

export interface SolvedCameraFrame {
  time: number;
  fov: number;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  target?: THREE.Vector3;
}

export interface CameraAnimationData {
  fps: number;
  totalFrames: number;
  duration: number;
  frames: SolvedCameraFrame[];
}

/**
 * 镜头姿态解算与轨迹平滑（复用 5 点高斯与同半球四元数滤波算法）
 */
export function solveCameraFrames(rawFrames: RawCameraFrame[]): SolvedCameraFrame[] {
  const count = rawFrames.length;
  if (count === 0) return [];

  const solved: SolvedCameraFrame[] = [];
  let prevQuat: THREE.Quaternion | undefined;

  for (let i = 0; i < count; i++) {
    const f = rawFrames[i];
    const pos = new THREE.Vector3(f.position[0], f.position[1], f.position[2]);
    const qRaw = new THREE.Quaternion(
      f.quaternion[0],
      f.quaternion[1],
      f.quaternion[2],
      f.quaternion[3]
    );

    const qContinuous = ensureQuatContinuity(qRaw, prevQuat);
    prevQuat = qContinuous.clone();

    const frameResult: SolvedCameraFrame = {
      time: f.time,
      fov: f.fov,
      position: pos,
      quaternion: qContinuous,
    };

    if (f.target) {
      frameResult.target = new THREE.Vector3(f.target[0], f.target[1], f.target[2]);
    }

    solved.push(frameResult);
  }

  // 复用 mathSolver 中的 5 点高斯平滑滤波
  if (count > 4) {
    const smoothedPos = solved.map((s) => s.position.clone());
    for (let i = 0; i < count; i++) {
      const p0 = solved[Math.max(0, i - 2)].position;
      const p1 = solved[Math.max(0, i - 1)].position;
      const p2 = solved[i].position;
      const p3 = solved[Math.min(count - 1, i + 1)].position;
      const p4 = solved[Math.min(count - 1, i + 2)].position;

      smoothedPos[i].x = (p0.x + p1.x * 2 + p2.x * 4 + p3.x * 2 + p4.x) / 10;
      smoothedPos[i].y = (p0.y + p1.y * 2 + p2.y * 4 + p3.y * 2 + p4.y) / 10;
      smoothedPos[i].z = (p0.z + p1.z * 2 + p2.z * 4 + p3.z * 2 + p4.z) / 10;
    }

    // 复用 [1, 3, 6, 3, 1] 同半球四元数加权滤波
    const weights = [1, 3, 6, 3, 1];
    for (let i = 0; i < count; i++) {
      let sx = 0;
      let sy = 0;
      let sz = 0;
      let sw = 0;
      const cQ = solved[i].quaternion;

      for (let offset = -2; offset <= 2; offset++) {
        const idx = Math.max(0, Math.min(count - 1, i + offset));
        const w = weights[offset + 2];
        let q = solved[idx].quaternion.clone();

        if (q.dot(cQ) < 0) {
          q.x = -q.x;
          q.y = -q.y;
          q.z = -q.z;
          q.w = -q.w;
        }

        sx += q.x * w;
        sy += q.y * w;
        sz += q.z * w;
        sw += q.w * w;
      }
      const len = Math.hypot(sx, sy, sz, sw) || 1;
      solved[i].quaternion.set(sx / len, sy / len, sz / len, sw / len);
      solved[i].position.copy(smoothedPos[i]);
    }
  }

  return solved;
}

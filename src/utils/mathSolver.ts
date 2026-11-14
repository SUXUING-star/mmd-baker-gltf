// src/utils/mathSolver.ts
import * as THREE from 'three';
import { solveFingers } from '../solvers/fingerSolver';
import { solveHips } from '../solvers/hipsSolver';
import { solveLimbs } from '../solvers/limbSolver';
import { ensureQuatContinuity, getV, hasBone } from '../solvers/mathUtils';
import { solveSpine } from '../solvers/spineSolver';
import { StandardBone } from '../types/boneMapping';
import { HUMANOID_BONES, HumanoidBoneName, LandmarkData } from '../types/types';
import { applyLoopToLandmarkData, DEFAULT_LOOP_OPTIONS, LoopBlendOptions } from './loopBlender';

export function solveAllHumanoidQuaternions(
  data: LandmarkData,
  loopOptions: LoopBlendOptions = DEFAULT_LOOP_OPTIONS
) {
  // 1. 先在 3D Landmark 级别执行真实的补帧/插帧扩充
  const effectiveData = loopOptions.enabled
    ? applyLoopToLandmarkData(data, loopOptions)
    : data;

  const { frames } = effectiveData;
  if (frames.length === 0) {
    return { times: [], hipsPositions: [], quatTracksData: {} as any };
  }

  const f0 = frames[0].landmarks;
  const restLm = effectiveData.restLandmarks;

  const pPelvis0 = hasBone(f0, StandardBone.Hips)
    ? getV(f0, StandardBone.Hips)
    : getV(f0, StandardBone.Root, new THREE.Vector3(0, 9.5, 0));
  const pPelvis0Y = pPelvis0.y;

  const pLAnkle0Y = getV(f0, StandardBone.LeftFoot, new THREE.Vector3(0, 1.0, 0)).y;
  const pRAnkle0Y = getV(f0, StandardBone.RightFoot, new THREE.Vector3(0, 1.0, 0)).y;
  const ankleBaseY = (pLAnkle0Y + pRAnkle0Y) / 2;

  const mmdLegSpan = Math.max(0.5, pPelvis0Y - ankleBaseY);
  const scaleFactor = 0.87 / mmdLegSpan;

  const times: number[] = [];
  const hipsPositions: number[] = [];
  const quatTracksData: Record<HumanoidBoneName, number[]> = {} as any;

  HUMANOID_BONES.forEach((k) => (quatTracksData[k] = []));
  const prevQuats: Partial<Record<HumanoidBoneName, THREE.Quaternion>> = {};

  // 2. 对包含插帧在内的所有帧重新跑完整的 IK/FK 数学解算
  for (let f = 0; f < frames.length; f++) {
    const frame = frames[f];
    const lm = frame.landmarks;
    times.push(frame.time);

    const hips = solveHips(lm, scaleFactor, ankleBaseY);
    const spine = solveSpine(lm, hips.hipsWorldQ, hips.hipForward, restLm);
    const limbs = solveLimbs(
      lm,
      spine.spineWorldQ,
      hips.hipsWorldQ,
      hips.hipSideOrtho,
      spine.spineUp,
      restLm
    );

    const leftFingers = solveFingers(lm, true);
    const rightFingers = solveFingers(lm, false);

    const localMap = {
      hips: hips.hipsWorldQ,
      ...spine.localRotations,
      ...limbs.localRotations,
      ...leftFingers,
      ...rightFingers,
    } as Record<HumanoidBoneName, THREE.Quaternion>;

    hipsPositions.push(hips.hipsPosition.x, hips.hipsPosition.y, hips.hipsPosition.z);

    HUMANOID_BONES.forEach((k) => {
      const qRaw = localMap[k] || new THREE.Quaternion(0, 0, 0, 1);
      const qContinuous = ensureQuatContinuity(qRaw, prevQuats[k]);
      prevQuats[k] = qContinuous.clone();

      quatTracksData[k].push(qContinuous.x, qContinuous.y, qContinuous.z, qContinuous.w);
    });
  }

  // 5 点高斯滤波平滑：hipsPositions X / Y / Z 全轴
  const frameCount = times.length;
  if (frameCount > 4) {
    for (let axis = 0; axis < 3; axis++) {
      const smoothed = new Float32Array(frameCount);
      for (let i = 0; i < frameCount; i++) {
        const p0 = hipsPositions[Math.max(0, i - 2) * 3 + axis];
        const p1 = hipsPositions[Math.max(0, i - 1) * 3 + axis];
        const p2 = hipsPositions[i * 3 + axis];
        const p3 = hipsPositions[Math.min(frameCount - 1, i + 1) * 3 + axis];
        const p4 = hipsPositions[Math.min(frameCount - 1, i + 2) * 3 + axis];
        smoothed[i] = (p0 + p1 * 2 + p2 * 4 + p3 * 2 + p4) / 10;
      }
      for (let i = 0; i < frameCount; i++) {
        hipsPositions[i * 3 + axis] = smoothed[i];
      }
    }

    // 5 点加权同半球四元数平滑 [1, 3, 6, 3, 1] / 14
    const weights = [1, 3, 6, 3, 1];
    HUMANOID_BONES.forEach((k) => {
      const arr = quatTracksData[k];
      const out = new Float32Array(frameCount * 4);

      for (let i = 0; i < frameCount; i++) {
        const cx = arr[i * 4];
        const cy = arr[i * 4 + 1];
        const cz = arr[i * 4 + 2];
        const cw = arr[i * 4 + 3];

        let sx = 0;
        let sy = 0;
        let sz = 0;
        let sw = 0;

        for (let offset = -2; offset <= 2; offset++) {
          const idx = Math.max(0, Math.min(frameCount - 1, i + offset));
          const w = weights[offset + 2];
          let qx = arr[idx * 4];
          let qy = arr[idx * 4 + 1];
          let qz = arr[idx * 4 + 2];
          let qw = arr[idx * 4 + 3];

          if (qx * cx + qy * cy + qz * cz + qw * cw < 0) {
            qx = -qx;
            qy = -qy;
            qz = -qz;
            qw = -qw;
          }

          sx += qx * w;
          sy += qy * w;
          sz += qz * w;
          sw += qw * w;
        }

        const len = Math.hypot(sx, sy, sz, sw) || 1;
        out[i * 4] = sx / len;
        out[i * 4 + 1] = sy / len;
        out[i * 4 + 2] = sz / len;
        out[i * 4 + 3] = sw / len;
      }

      for (let j = 0; j < out.length; j++) {
        arr[j] = out[j];
      }
    });
  }

  return { times, hipsPositions, quatTracksData };
}

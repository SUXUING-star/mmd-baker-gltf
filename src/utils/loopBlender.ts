// src/utils/loopBlender.ts
import * as THREE from 'three';
import { ensureQuatContinuity } from '../solvers/mathUtils';
import { HUMANOID_BONES, HumanoidBoneName } from '../types/types';

export type LoopBlendMode = 'idle' | 'tail' | 'cyclic';

export interface LoopBlendOptions {
  enabled: boolean;
  mode: LoopBlendMode;
  blendDuration: number;
  blendHipsXZ: boolean;
  headStabilizer?: boolean;
}

export const DEFAULT_LOOP_OPTIONS: LoopBlendOptions = {
  enabled: false,
  mode: 'idle',
  blendDuration: 0.8,
  blendHipsXZ: true,
  headStabilizer: true,
};

/**
 * 将四元数旋转差转换为轴角向量 (RotVector)
 */
function quatToRotVector(q: THREE.Quaternion): THREE.Vector3 {
  const qNorm = q.clone().normalize();
  if (qNorm.w < 0) qNorm.set(-qNorm.x, -qNorm.y, -qNorm.z, -qNorm.w);

  const angle = 2 * Math.acos(THREE.MathUtils.clamp(qNorm.w, -1, 1));
  if (angle < 1e-6) return new THREE.Vector3(0, 0, 0);

  const sinHalf = Math.sin(angle / 2);
  if (Math.abs(sinHalf) < 1e-6) return new THREE.Vector3(0, 0, 0);

  return new THREE.Vector3(
    (qNorm.x / sinHalf) * angle,
    (qNorm.y / sinHalf) * angle,
    (qNorm.z / sinHalf) * angle
  );
}

/**
 * 将轴角向量还原为四元数
 */
function rotVectorToQuat(v: THREE.Vector3): THREE.Quaternion {
  const angle = v.length();
  if (angle < 1e-6) return new THREE.Quaternion().identity();

  const axis = v.clone().divideScalar(angle);
  return new THREE.Quaternion().setFromAxisAngle(axis, angle);
}

export function blendMotionForLoop(
  times: number[],
  hipsPositions: number[],
  quatTracksData: Record<HumanoidBoneName, number[]>,
  options: LoopBlendOptions
): {
  hipsPositions: number[];
  quatTracksData: Record<HumanoidBoneName, number[]>;
} {
  const frameCount = times.length;
  if (!options.enabled || frameCount < 6) {
    return { hipsPositions, quatTracksData };
  }

  const outHips = new Float32Array(hipsPositions);
  const outQuats: Record<HumanoidBoneName, number[]> = {} as any;
  HUMANOID_BONES.forEach((name) => {
    outQuats[name] = [...quatTracksData[name]];
  });

  const startHips = new THREE.Vector3(outHips[0], outHips[1], outHips[2]);
  const endHips = new THREE.Vector3(
    outHips[(frameCount - 1) * 3],
    outHips[(frameCount - 1) * 3 + 1],
    outHips[(frameCount - 1) * 3 + 2]
  );

  const startQuats: Record<HumanoidBoneName, THREE.Quaternion> = {} as any;
  const endQuats: Record<HumanoidBoneName, THREE.Quaternion> = {} as any;

  HUMANOID_BONES.forEach((name) => {
    const track = outQuats[name];
    startQuats[name] = new THREE.Quaternion(track[0], track[1], track[2], track[3]);
    endQuats[name] = new THREE.Quaternion(
      track[(frameCount - 1) * 4],
      track[(frameCount - 1) * 4 + 1],
      track[(frameCount - 1) * 4 + 2],
      track[(frameCount - 1) * 4 + 3]
    );
  });

  // =========================================================================
  // 1. 待机模式 (idle): Hermite 姿态 + 角速度双重对齐 (消除点头断层)
  // =========================================================================
  if (options.mode === 'idle') {
    const duration = times[frameCount - 1] - times[0];
    const dt = duration / (frameCount - 1);

    // 计算全局 Hips 位移差
    const hipsDelta = new THREE.Vector3().subVectors(startHips, endHips);

    // 针对每个骨骼做 Hermite 速度与姿态双重插值
    HUMANOID_BONES.forEach((name) => {
      const track = outQuats[name];
      const q0 = startQuats[name].clone();
      const q1 = new THREE.Quaternion(track[4], track[5], track[6], track[7]);

      const qEndPrev = new THREE.Quaternion(
        track[(frameCount - 2) * 4],
        track[(frameCount - 2) * 4 + 1],
        track[(frameCount - 2) * 4 + 2],
        track[(frameCount - 2) * 4 + 3]
      );
      const qEnd = endQuats[name].clone();

      if (q1.dot(q0) < 0) q1.set(-q1.x, -q1.y, -q1.z, -q1.w);
      if (qEnd.dot(qEndPrev) < 0) qEnd.set(-qEnd.x, -qEnd.y, -qEnd.z, -qEnd.w);
      if (qEnd.dot(q0) < 0) q0.set(-q0.x, -q0.y, -q0.z, -q0.w);

      // 计算首帧角速度 v0 和尾帧角速度 vT
      const v0 = quatToRotVector(q1.clone().multiply(q0.clone().invert())).divideScalar(dt);
      const vT = quatToRotVector(qEnd.clone().multiply(qEndPrev.clone().invert())).divideScalar(dt);

      // 姿态偏差向量 d 与角速度偏差向量 deltaV
      const d = quatToRotVector(q0.clone().multiply(qEnd.clone().invert()));
      const deltaV = new THREE.Vector3().subVectors(v0, vT);

      // 决定过渡帧数 (头部与颈部施加更宽的柔和缓冲区)
      const isHeadOrNeck = name === 'head' || name === 'neck' || name === 'upperChest';
      const blendFrames = isHeadOrNeck
        ? Math.max(6, Math.round((frameCount - 1) * 0.45))
        : Math.max(4, Math.round((frameCount - 1) * 0.3));

      const blendStartIdx = frameCount - blendFrames;

      // 步骤 A: 全局升余弦姿态对齐
      for (let i = 0; i < frameCount; i++) {
        const u = i / (frameCount - 1);
        const w = 0.5 * (1 - Math.cos(Math.PI * u));
        const idx4 = i * 4;

        const qCur = new THREE.Quaternion(track[idx4], track[idx4 + 1], track[idx4 + 2], track[idx4 + 3]);
        const qOffset = rotVectorToQuat(d.clone().multiplyScalar(w));
        qCur.premultiply(qOffset).normalize();

        track[idx4] = qCur.x;
        track[idx4 + 1] = qCur.y;
        track[idx4 + 2] = qCur.z;
        track[idx4 + 3] = qCur.w;
      }

      // 步骤 B: 尾部 Hermite 角速度补偿 (保证最后一帧角速度方向精准等于第一帧)
      for (let i = blendStartIdx; i < frameCount; i++) {
        const s = (i - blendStartIdx + 1) / blendFrames; // s in (0, 1]
        // Hermite 角速度匹配衰减曲线
        const velWeight = (s * s * (3 - 2 * s)) * (s - 1) * dt * blendFrames;

        const idx4 = i * 4;
        const qCur = new THREE.Quaternion(track[idx4], track[idx4 + 1], track[idx4 + 2], track[idx4 + 3]);
        const qVelCorr = rotVectorToQuat(deltaV.clone().multiplyScalar(velWeight));

        qCur.premultiply(qVelCorr).normalize();

        track[idx4] = qCur.x;
        track[idx4 + 1] = qCur.y;
        track[idx4 + 2] = qCur.z;
        track[idx4 + 3] = qCur.w;
      }
    });

    // Hips 位移平滑
    for (let i = 0; i < frameCount; i++) {
      const u = i / (frameCount - 1);
      const w = 0.5 * (1 - Math.cos(Math.PI * u));
      const idx3 = i * 3;

      if (options.blendHipsXZ) {
        outHips[idx3] += hipsDelta.x * w;
        outHips[idx3 + 2] += hipsDelta.z * w;
      }
      outHips[idx3 + 1] += hipsDelta.y * w;
    }
  }
  // =========================================================================
  // 2. 尾部 Crossfade 模式 (tail)
  // =========================================================================
  else if (options.mode === 'tail') {
    const duration = times[frameCount - 1] - times[0];
    const blendSec = Math.min(options.blendDuration, duration * 0.4);
    const blendFrames = Math.max(2, Math.round(blendSec / (duration / frameCount)));
    const blendStartIdx = frameCount - blendFrames;

    for (let i = blendStartIdx; i < frameCount; i++) {
      const progress = (i - blendStartIdx + 1) / blendFrames;
      const weight = 0.5 * (1 - Math.cos(Math.PI * progress));

      const idx3 = i * 3;
      if (options.blendHipsXZ) {
        outHips[idx3] = THREE.MathUtils.lerp(outHips[idx3], startHips.x, weight);
        outHips[idx3 + 2] = THREE.MathUtils.lerp(outHips[idx3 + 2], startHips.z, weight);
      }
      outHips[idx3 + 1] = THREE.MathUtils.lerp(outHips[idx3 + 1], startHips.y, weight);

      HUMANOID_BONES.forEach((name) => {
        const idx4 = i * 4;
        const qCur = new THREE.Quaternion(
          outQuats[name][idx4],
          outQuats[name][idx4 + 1],
          outQuats[name][idx4 + 2],
          outQuats[name][idx4 + 3]
        );
        const qTarget = startQuats[name].clone();

        if (qCur.dot(qTarget) < 0) qTarget.set(-qTarget.x, -qTarget.y, -qTarget.z, -qTarget.w);
        qCur.slerp(qTarget, weight);

        outQuats[name][idx4] = qCur.x;
        outQuats[name][idx4 + 1] = qCur.y;
        outQuats[name][idx4 + 2] = qCur.z;
        outQuats[name][idx4 + 3] = qCur.w;
      });
    }
  }
  // =========================================================================
  // 3. 全局线性模式 (cyclic)
  // =========================================================================
  else {
    const hipsDelta = new THREE.Vector3().subVectors(startHips, endHips);

    HUMANOID_BONES.forEach((name) => {
      const qStart = startQuats[name];
      const qEnd = endQuats[name];
      if (qEnd.dot(qStart) < 0) qStart.set(-qStart.x, -qStart.y, -qStart.z, -qStart.w);
      const qDelta = qStart.clone().multiply(qEnd.clone().invert());

      for (let i = 0; i < frameCount; i++) {
        const t = i / (frameCount - 1);
        const idx4 = i * 4;
        const qCur = new THREE.Quaternion(
          outQuats[name][idx4],
          outQuats[name][idx4 + 1],
          outQuats[name][idx4 + 2],
          outQuats[name][idx4 + 3]
        );

        const qOffset = new THREE.Quaternion().identity().slerp(qDelta, t);
        qCur.premultiply(qOffset).normalize();

        outQuats[name][idx4] = qCur.x;
        outQuats[name][idx4 + 1] = qCur.y;
        outQuats[name][idx4 + 2] = qCur.z;
        outQuats[name][idx4 + 3] = qCur.w;
      }
    });

    for (let i = 0; i < frameCount; i++) {
      const t = i / (frameCount - 1);
      const idx3 = i * 3;
      if (options.blendHipsXZ) {
        outHips[idx3] += hipsDelta.x * t;
        outHips[idx3 + 2] += hipsDelta.z * t;
      }
      outHips[idx3 + 1] += hipsDelta.y * t;
    }
  }

  // 四元数极性连续性保护
  HUMANOID_BONES.forEach((name) => {
    let prev: THREE.Quaternion | undefined;
    const track = outQuats[name];
    for (let i = 0; i < frameCount; i++) {
      const idx4 = i * 4;
      const q = new THREE.Quaternion(track[idx4], track[idx4 + 1], track[idx4 + 2], track[idx4 + 3]);
      const continuous = ensureQuatContinuity(q, prev);
      prev = continuous.clone();
      track[idx4] = continuous.x;
      track[idx4 + 1] = continuous.y;
      track[idx4 + 2] = continuous.z;
      track[idx4 + 3] = continuous.w;
    }
  });

  return {
    hipsPositions: Array.from(outHips),
    quatTracksData: outQuats,
  };
}

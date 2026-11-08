// src/utils/motionTrimmer.ts
import { LandmarkData, LandmarkFrame } from '../types/types';

/**
 * 计算两帧之间特征骨骼的欧氏距离平方和（姿态差异度）
 */
function calculatePoseDistance(frameA: LandmarkFrame, frameB: LandmarkFrame): number {
  let distSqSum = 0;
  let count = 0;

  for (const name in frameA.landmarks) {
    if (frameB.landmarks[name]) {
      const [ax, ay, az] = frameA.landmarks[name];
      const [bx, by, bz] = frameB.landmarks[name];
      const dx = ax - bx;
      const dy = ay - by;
      const dz = az - bz;
      distSqSum += dx * dx + dy * dy + dz * dz;
      count++;
    }
  }

  return count > 0 ? distSqSum / count : Infinity;
}

/**
 * 自动寻找最适合循环的尾帧下标
 * @param landmarkData 烘焙出的全量姿态数据
 * @param startFrameIndex 起始参考帧，默认第 0 帧
 * @param minGapFrames 忽略的最少帧数（避免选到刚开始的微小变动，默认 30 帧即 1 秒）
 */
export function findBestLoopEndFrame(
  landmarkData: LandmarkData,
  startFrameIndex = 0,
  minGapFrames = 30
): { bestFrameIndex: number; bestTime: number; minDistance: number } {
  const frames = landmarkData.frames;
  const totalFrames = frames.length;

  if (totalFrames <= minGapFrames + startFrameIndex) {
    const lastIndex = Math.max(0, totalFrames - 1);
    return {
      bestFrameIndex: lastIndex,
      bestTime: frames[lastIndex]?.time || 0,
      minDistance: 0,
    };
  }

  const refFrame = frames[startFrameIndex];
  let minDistance = Infinity;
  let bestFrameIndex = totalFrames - 1;

  // 在候选区间内寻找姿态最相似（欧氏距离误差最小）的帧
  for (let i = startFrameIndex + minGapFrames; i < totalFrames; i++) {
    const dist = calculatePoseDistance(refFrame, frames[i]);
    if (dist < minDistance) {
      minDistance = dist;
      bestFrameIndex = i;
    }
  }

  return {
    bestFrameIndex,
    bestTime: frames[bestFrameIndex].time,
    minDistance,
  };
}

/**
 * 依据起止帧进行数据裁剪，并将时间轴归零（Time Normalization）
 */
export function trimLandmarkData(
  landmarkData: LandmarkData,
  startFrameIndex: number,
  endFrameIndex: number
): LandmarkData {
  const safeStart = Math.max(0, Math.min(startFrameIndex, landmarkData.frames.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(endFrameIndex, landmarkData.frames.length - 1));

  const slicedFrames = landmarkData.frames.slice(safeStart, safeEnd + 1);
  const baseTime = slicedFrames[0]?.time ?? 0;

  // 将裁剪后的帧时间归零重置
  const normalizedFrames: LandmarkFrame[] = slicedFrames.map((f) => ({
    time: Number((f.time - baseTime).toFixed(3)),
    landmarks: f.landmarks,
  }));

  const totalFrames = normalizedFrames.length;
  const duration = totalFrames > 0 ? normalizedFrames[totalFrames - 1].time : 0;

  return {
    fps: landmarkData.fps,
    totalFrames,
    duration,
    frames: normalizedFrames,
  };
}

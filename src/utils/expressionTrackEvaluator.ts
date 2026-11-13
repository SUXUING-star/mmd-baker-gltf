// src/utils/expressionTrackEvaluator.ts
import { LandmarkData } from '../types/types';

export type ExpressionInterpolation = 'linear' | 'smooth' | 'step';

export interface ExpressionKeyframe {
  frame: number;
  value: number; // 0 ~ 1
}

export interface ExpressionTrack {
  name: string;
  interpolation: ExpressionInterpolation;
  keyframes: ExpressionKeyframe[];
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/**
 * 计算单条表情轨道在指定帧的插值权重 (0~1)
 */
export function evaluateExpressionTrackAtFrame(track: ExpressionTrack, frame: number): number {
  const kfs = track.keyframes;
  if (!kfs || kfs.length === 0) return 0;
  if (frame <= kfs[0].frame) return clamp01(kfs[0].value);
  if (frame >= kfs[kfs.length - 1].frame) return clamp01(kfs[kfs.length - 1].value);

  for (let i = 0; i < kfs.length - 1; i++) {
    const a = kfs[i];
    const b = kfs[i + 1];
    if (frame === a.frame) return clamp01(a.value);
    if (frame === b.frame) return clamp01(b.value);

    if (frame > a.frame && frame < b.frame) {
      if (track.interpolation === 'step') {
        return clamp01(a.value);
      }
      const span = b.frame - a.frame;
      const t = span > 0 ? (frame - a.frame) / span : 0;
      const eased = track.interpolation === 'smooth' ? 0.5 * (1 - Math.cos(Math.PI * t)) : t;
      return clamp01(a.value + (b.value - a.value) * eased);
    }
  }

  return 0;
}

/**
 * 将手调表情轨道合并写入烘焙的 LandmarkData（保留原本已有的 VMD 表情，手调同轨覆盖）
 */
export function mergeExpressionTracksIntoLandmarkData(
  data: LandmarkData,
  tracks: ExpressionTrack[]
): LandmarkData {
  const activeTracks = tracks.filter((t) => t.keyframes.length > 0);
  if (activeTracks.length === 0) return data;

  const frames = data.frames.map((frameObj, frameIdx) => {
    const mergedExpressions: Record<string, number> = {
      ...(frameObj.expressions || {}),
    };

    for (const track of activeTracks) {
      mergedExpressions[track.name] = Number(evaluateExpressionTrackAtFrame(track, frameIdx).toFixed(4));
    }

    return {
      ...frameObj,
      expressions: mergedExpressions,
    };
  });

  return {
    ...data,
    frames,
  };
}

/**
 * 在 [startFrame, endFrame] 区间内自动生成自然眨眼关键帧序列
 */
export function generateAutoBlinkKeyframes(
  startFrame: number,
  endFrame: number,
  fps: number = 30,
  intervalSec: number = 2.8
): ExpressionKeyframe[] {
  if (endFrame <= startFrame) return [];

  const closeFrames = Math.max(1, Math.round(fps * 0.07)); // ~2 帧闭眼
  const holdFrames = Math.max(1, Math.round(fps * 0.03));  // ~1 帧停留
  const openFrames = Math.max(2, Math.round(fps * 0.13));  // ~4 帧睁眼
  const blinkTotalSpan = closeFrames + holdFrames + openFrames;

  const map = new Map<number, number>();
  const put = (f: number, v: number) => {
    const clampedFrame = Math.max(startFrame, Math.min(endFrame, Math.round(f)));
    map.set(clampedFrame, v);
  };

  put(startFrame, 0);
  put(endFrame, 0);

  const totalRange = endFrame - startFrame;
  const intervalFrames = Math.max(blinkTotalSpan + 6, Math.round(fps * intervalSec));

  const centers: number[] = [];
  if (totalRange < intervalFrames) {
    // 片段较短时在正中间生成 1 次眨眼
    if (totalRange >= blinkTotalSpan + 2) {
      centers.push(Math.round(startFrame + totalRange * 0.5));
    }
  } else {
    let cursor = startFrame + Math.round(Math.min(fps * 0.7, totalRange * 0.25));
    while (cursor + holdFrames + openFrames < endFrame) {
      centers.push(cursor);
      cursor += intervalFrames;
    }
  }

  for (const c of centers) {
    const f0 = c - closeFrames;
    const f1 = c;
    const f2 = c + holdFrames;
    const f3 = c + holdFrames + openFrames;
    if (f0 > startFrame && f3 < endFrame) {
      put(f0, 0);
      put(f1, 1);
      put(f2, 1);
      put(f3, 0);
    }
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([frame, value]) => ({ frame, value }));
}

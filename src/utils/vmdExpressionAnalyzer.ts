// src/utils/vmdExpressionAnalyzer.ts
import { LandmarkData } from '../types/types';

export interface VmdExpressionClip {
  startFrame: number;
  endFrame: number;
  peakFrame: number;
  peakWeight: number;
}

export interface VmdExpressionTrackSummary {
  name: string;
  clips: VmdExpressionClip[];
  totalActiveFrames: number;
  maxWeight: number;
}

const ACTIVE_THRESHOLD = 0.01;

/** 统计烘焙数据中每个原生 VMD 表情的激活帧区间（用于 PR 风格时间轴展示） */
export function analyzeVmdExpressions(data: LandmarkData): VmdExpressionTrackSummary[] {
  const trackMap = new Map<
    string,
    {
      clips: VmdExpressionClip[];
      openClip: VmdExpressionClip | null;
      totalActiveFrames: number;
      maxWeight: number;
    }
  >();

  data.frames.forEach((frame, frameIdx) => {
    const exprs = frame.expressions || {};

    // 先关闭本帧未激活的 openClip
    for (const [name, entry] of trackMap.entries()) {
      const w = exprs[name] ?? 0;
      if (w <= ACTIVE_THRESHOLD && entry.openClip) {
        entry.clips.push(entry.openClip);
        entry.openClip = null;
      }
    }

    // 更新或开启本帧激活的 clip
    for (const [name, weight] of Object.entries(exprs)) {
      if (weight <= ACTIVE_THRESHOLD) continue;

      let entry = trackMap.get(name);
      if (!entry) {
        entry = { clips: [], openClip: null, totalActiveFrames: 0, maxWeight: 0 };
        trackMap.set(name, entry);
      }

      entry.totalActiveFrames += 1;
      if (weight > entry.maxWeight) entry.maxWeight = weight;

      if (!entry.openClip) {
        entry.openClip = {
          startFrame: frameIdx,
          endFrame: frameIdx,
          peakFrame: frameIdx,
          peakWeight: weight,
        };
      } else {
        entry.openClip.endFrame = frameIdx;
        if (weight > entry.openClip.peakWeight) {
          entry.openClip.peakWeight = weight;
          entry.openClip.peakFrame = frameIdx;
        }
      }
    }
  });

  const result: VmdExpressionTrackSummary[] = [];
  for (const [name, entry] of trackMap.entries()) {
    if (entry.openClip) {
      entry.clips.push(entry.openClip);
      entry.openClip = null;
    }
    if (entry.clips.length > 0) {
      result.push({
        name,
        clips: entry.clips,
        totalActiveFrames: entry.totalActiveFrames,
        maxWeight: entry.maxWeight,
      });
    }
  }

  // 按首次出现帧排序
  return result.sort((a, b) => a.clips[0].startFrame - b.clips[0].startFrame);
}

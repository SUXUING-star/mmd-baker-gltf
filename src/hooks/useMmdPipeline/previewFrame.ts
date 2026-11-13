import { LandmarkData } from '../../types/types';
import {
    evaluateExpressionTrackAtFrame,
    ExpressionTrack,
} from '../../utils/expressionTrackEvaluator';
import { LoopBlendOptions } from '../../utils/loopBlender';

export interface PreviewFrameParams {
  data: LandmarkData;
  frameIdx: number;
  startFrame: number;
  endFrame: number;
  fps: number;
  loopOptions: LoopBlendOptions;
  expressionTracks: ExpressionTrack[];
}

export interface PreviewFrameResult {
  time: number;
  landmarks: Record<string, [number, number, number]>;
  blendTarget?: { startTime: number; weight: number };
  expressionsOverride?: Record<string, number>;
}

export function evaluatePreviewFrame({
  data,
  frameIdx,
  startFrame,
  endFrame,
  fps,
  loopOptions,
  expressionTracks,
}: PreviewFrameParams): PreviewFrameResult | null {
  const targetFrame = data.frames[frameIdx];
  const startFrameData = data.frames[startFrame];
  const endFrameData = data.frames[endFrame];
  if (!targetFrame || !startFrameData || !endFrameData) return null;

  let blendWeight = 0;
  let blendedLandmarks = targetFrame.landmarks;

  if (loopOptions.enabled && endFrame > startFrame) {
    const loopFrames = endFrame - startFrame + 1;
    const relativeIdx = frameIdx - startFrame;
    const u = Math.max(0, Math.min(1, relativeIdx / (loopFrames - 1)));

    if (loopOptions.mode === 'idle') {
      blendWeight = 0.5 * (1 - Math.cos(Math.PI * u));
      blendedLandmarks = {};

      for (const k in targetFrame.landmarks) {
        const pCur = targetFrame.landmarks[k];
        const pStart = startFrameData.landmarks[k] || pCur;
        const pEnd = endFrameData.landmarks[k] || pCur;
        blendedLandmarks[k] = [
          pCur[0] + (pStart[0] - pEnd[0]) * blendWeight,
          pCur[1] + (pStart[1] - pEnd[1]) * blendWeight,
          pCur[2] + (pStart[2] - pEnd[2]) * blendWeight,
        ];
      }
    } else if (loopOptions.mode === 'tail') {
      const safeFps = fps || 30;
      const blendSec = Math.min(loopOptions.blendDuration, (loopFrames / safeFps) * 0.45);
      const blendFrames = Math.max(2, Math.round(blendSec * safeFps));
      const blendStart = endFrame - blendFrames;

      if (frameIdx >= blendStart && frameIdx <= endFrame) {
        const localU = (frameIdx - blendStart + 1) / blendFrames;
        blendWeight = 0.5 * (1 - Math.cos(Math.PI * localU));
        blendedLandmarks = {};

        for (const k in targetFrame.landmarks) {
          const pCur = targetFrame.landmarks[k];
          const pStart = startFrameData.landmarks[k] || pCur;
          blendedLandmarks[k] = [
            pCur[0] * (1 - blendWeight) + pStart[0] * blendWeight,
            pCur[1] * (1 - blendWeight) + pStart[1] * blendWeight,
            pCur[2] * (1 - blendWeight) + pStart[2] * blendWeight,
          ];
        }
      }
    }
  }

  const activeTracks = expressionTracks.filter((t) => t.keyframes.length > 0);
  let expressionsOverride: Record<string, number> | undefined;
  if (activeTracks.length > 0) {
    expressionsOverride = { ...(targetFrame.expressions || {}) };
    for (const tr of activeTracks) {
      expressionsOverride[tr.name] = evaluateExpressionTrackAtFrame(tr, frameIdx);
    }
  }

  return {
    time: targetFrame.time,
    landmarks: blendedLandmarks,
    blendTarget: blendWeight > 0 ? { startTime: startFrameData.time, weight: blendWeight } : undefined,
    expressionsOverride,
  };
}

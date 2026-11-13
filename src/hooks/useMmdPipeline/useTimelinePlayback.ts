import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LandmarkData } from '../../types/types';
import { ExpressionTrack } from '../../utils/expressionTrackEvaluator';
import { LoopBlendOptions } from '../../utils/loopBlender';
import { findBestLoopEndFrame } from '../../utils/motionTrimmer';
import { evaluatePreviewFrame } from './previewFrame';

export interface TimelineController {
  maxFrames: number;
  fps: number;
  currentFrame: number;
  startFrame: number;
  endFrame: number;
  isPlaying: boolean;
  togglePlay: () => void;
  seek: (frame: number) => void;
  setStart: (frame: number) => void;
  setEnd: (frame: number) => void;
  autoSnapLoopEnd: () => void;
}

export interface TimelineThreeBridge {
  setMmdTime: (
    time: number,
    landmarks?: Record<string, [number, number, number]>,
    blendTarget?: { startTime: number; weight: number },
    expressionsOverride?: Record<string, number>
  ) => void;
}

export function useTimelinePlayback(
  rawLandmarkDataRef: RefObject<LandmarkData | null>,
  threeBridge: TimelineThreeBridge,
  loopOptions: LoopBlendOptions,
  expressionTracks: ExpressionTrack[]
) {
  const [maxFrames, setMaxFrames] = useState<number>(0);
  const [fps, setFps] = useState<number>(30);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const fpsRef = useRef<number>(fps);
  const currentFrameRef = useRef<number>(currentFrame);
  const startFrameRef = useRef<number>(startFrame);
  const endFrameRef = useRef<number>(endFrame);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const loopOptionsRef = useRef<LoopBlendOptions>(loopOptions);
  const expressionTracksRef = useRef<ExpressionTrack[]>(expressionTracks);

  fpsRef.current = fps;
  currentFrameRef.current = currentFrame;
  startFrameRef.current = startFrame;
  endFrameRef.current = endFrame;
  isPlayingRef.current = isPlaying;
  loopOptionsRef.current = loopOptions;
  expressionTracksRef.current = expressionTracks;

  const stopPlayback = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

  const renderFrame = useCallback(
    (frameIdx: number) => {
      const data = rawLandmarkDataRef.current;
      if (!data) return;

      const result = evaluatePreviewFrame({
        data,
        frameIdx,
        startFrame: startFrameRef.current,
        endFrame: endFrameRef.current,
        fps: fpsRef.current,
        loopOptions: loopOptionsRef.current,
        expressionTracks: expressionTracksRef.current,
      });
      if (!result) return;

      threeBridge.setMmdTime(
        result.time,
        result.landmarks,
        result.blendTarget,
        result.expressionsOverride
      );
    },
    [rawLandmarkDataRef, threeBridge]
  );

  // 暂停状态下调整表情轨时，立即刷新当前帧预览
  useEffect(() => {
    expressionTracksRef.current = expressionTracks;
    if (!isPlayingRef.current && rawLandmarkDataRef.current) {
      renderFrame(currentFrameRef.current);
    }
  }, [expressionTracks, rawLandmarkDataRef, renderFrame]);

  const seekToFrame = useCallback(
    (frameIdx: number) => {
      const data = rawLandmarkDataRef.current;
      if (!data) return;
      const safeIdx = Math.max(0, Math.min(frameIdx, data.frames.length - 1));
      currentFrameRef.current = safeIdx;
      setCurrentFrame(safeIdx);
      renderFrame(safeIdx);
    },
    [rawLandmarkDataRef, renderFrame]
  );

  const startPlayback = useCallback(
    (initialFrame?: number) => {
      if (!rawLandmarkDataRef.current || endFrameRef.current <= startFrameRef.current) return;

      stopPlayback();
      if (initialFrame !== undefined) {
        currentFrameRef.current = initialFrame;
        setCurrentFrame(initialFrame);
        renderFrame(initialFrame);
      }

      isPlayingRef.current = true;
      setIsPlaying(true);
      const intervalMs = Math.round(1000 / (fpsRef.current || 30));

      timerRef.current = window.setInterval(() => {
        const start = startFrameRef.current;
        const end = endFrameRef.current;
        let next = currentFrameRef.current + 1;
        if (next > end || next < start) {
          next = start;
        }
        currentFrameRef.current = next;
        setCurrentFrame(next);
        renderFrame(next);
      }, intervalMs);
    },
    [rawLandmarkDataRef, renderFrame, stopPlayback]
  );

  const togglePlay = useCallback(() => {
    if (isPlayingRef.current) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [stopPlayback, startPlayback]);

  const initAndPlay = useCallback(
    (landmarkData: LandmarkData) => {
      const total = landmarkData.totalFrames;
      const defaultEnd =
        total > 30 ? findBestLoopEndFrame(landmarkData, 0, 30).bestFrameIndex : Math.max(0, total - 1);

      fpsRef.current = landmarkData.fps;
      startFrameRef.current = 0;
      endFrameRef.current = defaultEnd;

      setMaxFrames(total);
      setFps(landmarkData.fps);
      setStartFrame(0);
      setEndFrame(defaultEnd);

      startPlayback(0);
    },
    [startPlayback]
  );

  const applyLoopAndRefresh = useCallback(
    (newOptions?: LoopBlendOptions) => {
      if (newOptions) {
        loopOptionsRef.current = newOptions;
      }
      startPlayback(startFrameRef.current);
    },
    [startPlayback]
  );

  const autoSnapLoopEnd = useCallback(() => {
    if (!rawLandmarkDataRef.current) return;
    const { bestFrameIndex } = findBestLoopEndFrame(
      rawLandmarkDataRef.current,
      startFrameRef.current,
      30
    );
    endFrameRef.current = bestFrameIndex;
    setEndFrame(bestFrameIndex);
    seekToFrame(bestFrameIndex);
  }, [rawLandmarkDataRef, seekToFrame]);

  const timeline: TimelineController = useMemo(
    () => ({
      maxFrames,
      fps,
      currentFrame,
      startFrame,
      endFrame,
      isPlaying,
      togglePlay,
      seek: (f: number) => {
        stopPlayback();
        seekToFrame(f);
      },
      setStart: (f: number) => {
        stopPlayback();
        startFrameRef.current = f;
        setStartFrame(f);
        seekToFrame(f);
      },
      setEnd: (f: number) => {
        stopPlayback();
        endFrameRef.current = f;
        setEndFrame(f);
        seekToFrame(f);
      },
      autoSnapLoopEnd,
    }),
    [
      maxFrames,
      fps,
      currentFrame,
      startFrame,
      endFrame,
      isPlaying,
      togglePlay,
      stopPlayback,
      seekToFrame,
      autoSnapLoopEnd,
    ]
  );

  return {
    timeline,
    startFrame,
    endFrame,
    stopPlayback,
    initAndPlay,
    applyLoopAndRefresh,
  };
}

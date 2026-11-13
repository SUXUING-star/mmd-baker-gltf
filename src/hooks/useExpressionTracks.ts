// src/hooks/useExpressionTracks.ts
import { useCallback, useMemo, useState } from 'react';
import { resolveExpressionTarget } from '../types/expressionMapping';
import {
    evaluateExpressionTrackAtFrame,
    ExpressionInterpolation,
    ExpressionKeyframe,
    ExpressionTrack,
    generateAutoBlinkKeyframes,
} from '../utils/expressionTrackEvaluator';

export interface ExpressionTracksController {
  tracks: ExpressionTrack[];
  activeName: string;
  activeTrack: ExpressionTrack;
  customTrackNames: string[];
  setActiveName: (name: string) => void;
  upsertKeyframe: (name: string, frame: number, value: number) => void;
  removeKeyframe: (name: string, frame: number) => void;
  setInterpolation: (name: string, interpolation: ExpressionInterpolation) => void;
  clearTrack: (name: string) => void;
  clearAllTracks: () => void;
  applyAutoBlink: (startFrame: number, endFrame: number, fps: number) => void;
  applyConstantRange: (name: string, startFrame: number, endFrame: number, value: number) => void;
  addCustomTrack: (rawName: string) => void;
  getValueAtFrame: (name: string, frame: number) => number;
}

const DEFAULT_TRACK = (name: string): ExpressionTrack => ({
  name,
  interpolation: 'smooth',
  keyframes: [],
});

export function useExpressionTracks(): ExpressionTracksController {
  const [tracks, setTracks] = useState<ExpressionTrack[]>([]);
  const [activeName, setActiveName] = useState<string>('blink');
  const [customTrackNames, setCustomTrackNames] = useState<string[]>([]);

  const trackMap = useMemo(() => {
    const map = new Map<string, ExpressionTrack>();
    tracks.forEach((t) => map.set(t.name, t));
    return map;
  }, [tracks]);

  const activeTrack = useMemo(() => {
    return trackMap.get(activeName) || DEFAULT_TRACK(activeName);
  }, [trackMap, activeName]);

  const updateTrack = useCallback(
    (name: string, updater: (prev: ExpressionTrack) => ExpressionTrack) => {
      setTracks((prevList) => {
        const idx = prevList.findIndex((t) => t.name === name);
        const base = idx >= 0 ? prevList[idx] : DEFAULT_TRACK(name);
        const next = updater(base);

        // 若无关键帧则清理，保持列表干净
        if (next.keyframes.length === 0) {
          return idx >= 0 ? prevList.filter((_, i) => i !== idx) : prevList;
        }
        if (idx >= 0) {
          const copy = [...prevList];
          copy[idx] = next;
          return copy;
        }
        return [...prevList, next];
      });
    },
    []
  );

  const upsertKeyframe = useCallback(
    (name: string, frame: number, value: number) => {
      const clampedVal = Number(Math.max(0, Math.min(1, value)).toFixed(2));
      const safeFrame = Math.max(0, Math.round(frame));

      updateTrack(name, (prev) => {
        const filtered = prev.keyframes.filter((k) => k.frame !== safeFrame);
        const nextKeyframes: ExpressionKeyframe[] = [...filtered, { frame: safeFrame, value: clampedVal }].sort(
          (a, b) => a.frame - b.frame
        );
        return { ...prev, keyframes: nextKeyframes };
      });
    },
    [updateTrack]
  );

  const removeKeyframe = useCallback(
    (name: string, frame: number) => {
      updateTrack(name, (prev) => ({
        ...prev,
        keyframes: prev.keyframes.filter((k) => k.frame !== frame),
      }));
    },
    [updateTrack]
  );

  const setInterpolation = useCallback(
    (name: string, interpolation: ExpressionInterpolation) => {
      setTracks((prevList) => {
        const idx = prevList.findIndex((t) => t.name === name);
        if (idx < 0) return [...prevList, { name, interpolation, keyframes: [] }];
        const copy = [...prevList];
        copy[idx] = { ...copy[idx], interpolation };
        return copy;
      });
    },
    []
  );

  const clearTrack = useCallback((name: string) => {
    setTracks((prev) => prev.filter((t) => t.name !== name));
  }, []);

  const clearAllTracks = useCallback(() => {
    setTracks([]);
  }, []);

  const applyAutoBlink = useCallback(
    (startFrame: number, endFrame: number, fps: number) => {
      const keyframes = generateAutoBlinkKeyframes(startFrame, endFrame, fps);
      setActiveName('blink');
      updateTrack('blink', (prev) => ({
        ...prev,
        interpolation: 'smooth',
        keyframes,
      }));
    },
    [updateTrack]
  );

  const applyConstantRange = useCallback(
    (name: string, startFrame: number, endFrame: number, value: number) => {
      const clampedVal = Number(Math.max(0, Math.min(1, value)).toFixed(2));
      const safeStart = Math.max(0, Math.round(startFrame));
      const safeEnd = Math.max(safeStart, Math.round(endFrame));
      const keyframes: ExpressionKeyframe[] =
        safeStart === safeEnd
          ? [{ frame: safeStart, value: clampedVal }]
          : [
              { frame: safeStart, value: clampedVal },
              { frame: safeEnd, value: clampedVal },
            ];
      updateTrack(name, (prev) => ({ ...prev, keyframes }));
    },
    [updateTrack]
  );

  const addCustomTrack = useCallback((rawName: string) => {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    const { key, isPreset } = resolveExpressionTarget(trimmed);
    if (!isPreset) {
      setCustomTrackNames((prev) => (prev.includes(key) ? prev : [...prev, key]));
    }
    setActiveName(key);
  }, []);

  const getValueAtFrame = useCallback(
    (name: string, frame: number) => {
      const track = trackMap.get(name);
      return track ? evaluateExpressionTrackAtFrame(track, frame) : 0;
    },
    [trackMap]
  );

  return {
    tracks,
    activeName,
    activeTrack,
    customTrackNames,
    setActiveName,
    upsertKeyframe,
    removeKeyframe,
    setInterpolation,
    clearTrack,
    clearAllTracks,
    applyAutoBlink,
    applyConstantRange,
    addCustomTrack,
    getValueAtFrame,
  };
}

// src/hooks/useMmdPipeline.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18N, Lang } from '../i18n';
import { LandmarkData } from '../types/types';
import { bakePure3DLandmarks } from '../utils/baker';
import { exportFull52HumanoidGLB } from '../utils/glbExporter';
import { findBestLoopEndFrame, trimLandmarkData } from '../utils/motionTrimmer';
import { exportFull52VRMA } from '../utils/vrmaExporter';

export type ExportFormat = 'vrma' | 'glb' | 'both';

export interface DownloadItem {
  url: string;
  filename: string;
}

export interface PipelineDownloadResult {
  glb?: DownloadItem;
  vrma?: DownloadItem;
}

interface ThreeBridge {
  setMmdCamera: () => void;
  setHumanoidCamera: () => void;
  clearCurrentMesh: () => void;
  setupMmdAnimation: (mesh: any, animation: any) => void;
  setMmdTime: (time: number, landmarks?: Record<string, [number, number, number]>) => void;
  updateLandmarks: (mesh: any, landmarks: Record<string, [number, number, number]>) => void;
  renderLandmarksPositions: (landmarks: Record<string, [number, number, number]>) => void;
  loadAndPlayGLB: (url: string) => Promise<void>;
}

type StatusType = 'ready' | 'analyzing' | 'ready_to_export' | 'exporting' | 'complete' | 'error';

export function useMmdPipeline(threeBridge: ThreeBridge, lang: Lang = 'zh') {
  const [statusType, setStatusType] = useState<StatusType>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('both');
  const [downloads, setDownloads] = useState<PipelineDownloadResult | null>(null);

  const rawLandmarkDataRef = useRef<LandmarkData | null>(null);

  const [maxFrames, setMaxFrames] = useState<number>(0);
  const [fps, setFps] = useState<number>(30);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);
  const activeUrlsRef = useRef<string[]>([]);

  const cleanupUrls = () => {
    activeUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    activeUrlsRef.current = [];
  };

  const stopPlayback = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
      cleanupUrls();
    };
  }, [stopPlayback]);

  // 跳转到指定帧，同时更新 3D 模型与红点
  const seekToFrame = useCallback(
    (frameIdx: number) => {
      if (!rawLandmarkDataRef.current) return;
      const frames = rawLandmarkDataRef.current.frames;
      const safeIdx = Math.max(0, Math.min(frameIdx, frames.length - 1));
      setCurrentFrame(safeIdx);
      const targetFrame = frames[safeIdx];
      if (targetFrame) {
        threeBridge.setMmdTime(targetFrame.time, targetFrame.landmarks);
      }
    },
    [threeBridge]
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (!rawLandmarkDataRef.current || endFrame <= startFrame) return;

    setIsPlaying(true);
    const intervalMs = Math.round(1000 / (fps || 30));

    timerRef.current = window.setInterval(() => {
      setCurrentFrame((prev) => {
        let next = prev + 1;
        if (next > endFrame || next < startFrame) {
          next = startFrame;
        }
        const targetFrame = rawLandmarkDataRef.current?.frames[next];
        if (targetFrame) {
          threeBridge.setMmdTime(targetFrame.time, targetFrame.landmarks);
        }
        return next;
      });
    }, intervalMs);
  }, [isPlaying, startFrame, endFrame, fps, threeBridge, stopPlayback]);

  const autoSnapLoopEnd = useCallback(() => {
    if (!rawLandmarkDataRef.current) return;
    const { bestFrameIndex } = findBestLoopEndFrame(rawLandmarkDataRef.current, startFrame, 30);
    setEndFrame(bestFrameIndex);
    seekToFrame(bestFrameIndex);
  }, [startFrame, seekToFrame]);

  const loadMotion = useCallback(
    async (pmxTarget: File | string, vmdTarget: File | string) => {
      try {
        stopPlayback();
        setProcessing(true);
        setDownloads(null);
        cleanupUrls();
        setStatusType('analyzing');

        threeBridge.setMmdCamera();
        threeBridge.clearCurrentMesh();

        const { landmarkData, mesh, animation } = await bakePure3DLandmarks(
          pmxTarget,
          vmdTarget,
          (m, landmarks, prog) => {
            setProgress(prog);
            threeBridge.updateLandmarks(m, landmarks);
          }
        );

        rawLandmarkDataRef.current = landmarkData;
        const total = landmarkData.totalFrames;
        setMaxFrames(total);
        setFps(landmarkData.fps);
        setStartFrame(0);

        let defaultEnd = Math.max(0, total - 1);
        if (total > 30) {
          const { bestFrameIndex } = findBestLoopEndFrame(landmarkData, 0, 30);
          defaultEnd = bestFrameIndex;
        }
        setEndFrame(defaultEnd);
        setCurrentFrame(0);

        // 绑定 Mixer，使得后续可以用 setMmdTime 驱动模型动画
        threeBridge.setupMmdAnimation(mesh, animation);

        setStatusType('ready_to_export');

        // 开启循环播放
        setIsPlaying(true);
        const intervalMs = Math.round(1000 / landmarkData.fps);
        let playIdx = 0;
        timerRef.current = window.setInterval(() => {
          playIdx++;
          if (playIdx > defaultEnd) playIdx = 0;
          setCurrentFrame(playIdx);
          const targetFrame = landmarkData.frames[playIdx];
          if (targetFrame) {
            threeBridge.setMmdTime(targetFrame.time, targetFrame.landmarks);
          }
        }, intervalMs);
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        setStatusType('error');
        setErrorMessage(msg);
      } finally {
        setProcessing(false);
      }
    },
    [threeBridge, stopPlayback]
  );

  const exportMotion = useCallback(
    async (vmdTarget: File | string, format: ExportFormat = exportFormat) => {
      if (!rawLandmarkDataRef.current) return;

      try {
        stopPlayback();
        setProcessing(true);
        setStatusType('exporting');
        threeBridge.setHumanoidCamera();

        const trimmedData = trimLandmarkData(
          rawLandmarkDataRef.current,
          startFrame,
          endFrame
        );

        const baseName =
          typeof vmdTarget === 'string'
            ? 'output_motion'
            : vmdTarget.name.replace(/\.[^/.]+$/, '');

        const result: PipelineDownloadResult = {};

        if (format === 'glb' || format === 'both') {
          const glbBlob = await exportFull52HumanoidGLB(trimmedData);
          const glbUrl = URL.createObjectURL(glbBlob);
          activeUrlsRef.current.push(glbUrl);
          result.glb = { url: glbUrl, filename: `${baseName}_humanoid.glb` };
          await threeBridge.loadAndPlayGLB(glbUrl);
        }

        if (format === 'vrma' || format === 'both') {
          const vrmaBlob = await exportFull52VRMA(trimmedData, {
            title: baseName,
            authors: ['MMD Pipeline Converter'],
          });
          const vrmaUrl = URL.createObjectURL(vrmaBlob);
          activeUrlsRef.current.push(vrmaUrl);
          result.vrma = { url: vrmaUrl, filename: `${baseName}.vrma` };

          if (format === 'vrma') {
            await threeBridge.loadAndPlayGLB(vrmaUrl);
          }
        }

        setDownloads(result);
        setStatusType('complete');
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        setStatusType('error');
        setErrorMessage(msg);
      } finally {
        setProcessing(false);
      }
    },
    [threeBridge, exportFormat, startFrame, endFrame, stopPlayback]
  );

  const status = useMemo(() => {
    const t = I18N[lang];
    switch (statusType) {
      case 'ready':
        return t.statusReady;
      case 'analyzing':
        return t.statusAnalyzing;
      case 'ready_to_export':
        return t.statusReadyToExport;
      case 'exporting':
        return t.statusSolvingHumanoid;
      case 'complete':
        return t.statusComplete;
      case 'error':
        return t.statusError(errorMessage);
    }
  }, [lang, statusType, errorMessage]);

  const downloadFile = (item: DownloadItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.filename;
    a.click();
  };

  return {
    status,
    statusType,
    progress,
    processing,
    exportFormat,
    setExportFormat,
    downloads,
    loadMotion,
    exportMotion,
    downloadFile,
    maxFrames,
    fps,
    currentFrame,
    startFrame,
    setStartFrame,
    endFrame,
    setEndFrame,
    isPlaying,
    togglePlay,
    stopPlayback,
    seekToFrame,
    autoSnapLoopEnd,
  };
}

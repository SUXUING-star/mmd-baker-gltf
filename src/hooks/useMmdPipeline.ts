// src/hooks/useMmdPipeline.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18N, Lang } from '../i18n';
import { LandmarkData } from '../types/types';
import { bakePure3DLandmarks } from '../utils/baker';
import { exportFull52HumanoidGLB } from '../utils/glbExporter';
import { findBestLoopEndFrame, trimLandmarkData } from '../utils/motionTrimmer';
import { exportFull52VRMA, VrmaMetaOptions } from '../utils/vrmaExporter';

export type StatusType = 'ready' | 'analyzing' | 'ready_to_export' | 'exporting' | 'error';

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

export interface MmdPipeline {
  status: string;
  statusType: StatusType;
  progress: number;
  processing: boolean;
  exportingType: string | null;
  // 文件状态
  customPmxFile: File | null;
  vmdFile: File | null;
  activePmxTarget: File | string;
  activeVmdTarget: File | string;
  selectPmx: (file: File | null, extraFiles?: File[]) => void;
  selectVmd: (file: File) => void;
  resetPmx: () => void;
  // 控制核心
  timeline: TimelineController;
  startBake: () => Promise<void>;
  loadDefaultDemo: () => Promise<void>;
  downloadVrma: (metaOptions?: VrmaMetaOptions) => Promise<void>;
  downloadGlb: () => Promise<void>;
  downloadBoth: (metaOptions?: VrmaMetaOptions) => Promise<void>;
}

interface ThreeBridge {
  setMmdCamera: () => void;
  clearCurrentMesh: () => void;
  clearPoints: () => void;
  setupMmdAnimation: (mesh: any, animation: any) => void;
  setMmdTime: (time: number, landmarks?: Record<string, [number, number, number]>) => void;
  updateLandmarks: (mesh: any, landmarks: Record<string, [number, number, number]>) => void;
  renderLandmarksPositions: (landmarks: Record<string, [number, number, number]>) => void;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useMmdPipeline(
  threeBridge: ThreeBridge,
  defaultPmxPath: string,
  defaultVmdPath: string,
  lang: Lang = 'zh'
): MmdPipeline {
  const [statusType, setStatusType] = useState<StatusType>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const [customPmxFile, setCustomPmxFile] = useState<File | null>(null);
  const [customExtraFiles, setCustomExtraFiles] = useState<File[]>([]);
  const [vmdFile, setVmdFile] = useState<File | null>(null);

  const rawLandmarkDataRef = useRef<LandmarkData | null>(null);

  const [maxFrames, setMaxFrames] = useState<number>(0);
  const [fps, setFps] = useState<number>(30);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [startFrame, setStartFrame] = useState<number>(0);
  const [endFrame, setEndFrame] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const timerRef = useRef<number | null>(null);

  const activePmxTarget = useMemo(() => customPmxFile || defaultPmxPath, [customPmxFile, defaultPmxPath]);
  const activeVmdTarget = useMemo(() => vmdFile || defaultVmdPath, [vmdFile, defaultVmdPath]);

  const stopPlayback = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => stopPlayback();
  }, [stopPlayback]);

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
        setStartFrame(f);
        seekToFrame(f);
      },
      setEnd: (f: number) => {
        stopPlayback();
        setEndFrame(f);
        seekToFrame(f);
      },
      autoSnapLoopEnd,
    }),
    [maxFrames, fps, currentFrame, startFrame, endFrame, isPlaying, togglePlay, stopPlayback, seekToFrame, autoSnapLoopEnd]
  );

  // 执行核心烘焙
  const runBake = useCallback(
    async (pmxTarget: File | string, vmdTarget: File | string, extraFiles: File[]) => {
      try {
        stopPlayback();
        setProcessing(true);
        setStatusType('analyzing');
        setProgress(0);

        threeBridge.setMmdCamera();
        threeBridge.clearCurrentMesh();

        const { landmarkData, mesh, animation } = await bakePure3DLandmarks(
          pmxTarget,
          vmdTarget,
          (m, landmarks, prog) => {
            setProgress(prog);
            threeBridge.updateLandmarks(m, landmarks);
          },
          extraFiles
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

        threeBridge.setupMmdAnimation(mesh, animation);
        setStatusType('ready_to_export');

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

  // 用户点击【开始烘焙解算】按钮调用此方法
  const startBake = useCallback(async () => {
    await runBake(activePmxTarget, activeVmdTarget, customExtraFiles);
  }, [runBake, activePmxTarget, activeVmdTarget, customExtraFiles]);

  // 载入默认示例
  const loadDefaultDemo = useCallback(async () => {
    setCustomPmxFile(null);
    setCustomExtraFiles([]);
    setVmdFile(null);
    await runBake(defaultPmxPath, defaultVmdPath, []);
  }, [runBake, defaultPmxPath, defaultVmdPath]);

  const selectPmx = useCallback(
    (file: File | null, extraFiles: File[] = []) => {
      setCustomPmxFile(file);
      setCustomExtraFiles(extraFiles);
      setStatusType('ready');
    },
    []
  );

  const selectVmd = useCallback((file: File) => {
    setVmdFile(file);
    setStatusType('ready');
  }, []);

  const resetPmx = useCallback(() => {
    setCustomPmxFile(null);
    setCustomExtraFiles([]);
    setStatusType('ready');
  }, []);

  const getBaseFilename = useCallback(() => {
    const target = activeVmdTarget;
    return typeof target === 'string'
      ? target.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'motion'
      : target.name.replace(/\.[^/.]+$/, '');
  }, [activeVmdTarget]);

  const downloadVrma = useCallback(
    async (metaOptions?: VrmaMetaOptions) => {
      if (!rawLandmarkDataRef.current) return;
      try {
        setExportingType('vrma');
        const trimmed = trimLandmarkData(rawLandmarkDataRef.current, startFrame, endFrame);
        const blob = await exportFull52VRMA(trimmed, {
          title: metaOptions?.title || getBaseFilename(),
          authors: metaOptions?.authors,
          copyrightInformation: metaOptions?.copyrightInformation,
          licenseUrl: metaOptions?.licenseUrl,
        });
        triggerBrowserDownload(blob, `${getBaseFilename()}_[${startFrame}-${endFrame}].vrma`);
      } catch (err) {
        alert('导出 VRMA 失败: ' + err);
      } finally {
        setExportingType(null);
      }
    },
    [startFrame, endFrame, getBaseFilename]
  );

  const downloadGlb = useCallback(async () => {
    if (!rawLandmarkDataRef.current) return;
    try {
      setExportingType('glb');
      const trimmed = trimLandmarkData(rawLandmarkDataRef.current, startFrame, endFrame);
      const blob = await exportFull52HumanoidGLB(trimmed);
      triggerBrowserDownload(blob, `${getBaseFilename()}_[${startFrame}-${endFrame}].glb`);
    } catch (err) {
      alert('导出 GLB 失败: ' + err);
    } finally {
      setExportingType(null);
    }
  }, [startFrame, endFrame, getBaseFilename]);

  const downloadBoth = useCallback(
    async (metaOptions?: VrmaMetaOptions) => {
      await downloadVrma(metaOptions);
      await downloadGlb();
    },
    [downloadVrma, downloadGlb]
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
      case 'error':
        return t.statusError(errorMessage);
    }
  }, [lang, statusType, errorMessage]);

  return {
    status,
    statusType,
    progress,
    processing,
    exportingType,
    customPmxFile,
    vmdFile,
    activePmxTarget,
    activeVmdTarget,
    selectPmx,
    selectVmd,
    resetPmx,
    timeline,
    startBake,
    loadDefaultDemo,
    downloadVrma,
    downloadGlb,
    downloadBoth,
  };
}

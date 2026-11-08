// src/hooks/useMmdPipeline.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { I18N, Lang } from '../i18n';
import { bakePure3DLandmarks } from '../utils/baker';
import { exportFull52HumanoidGLB } from '../utils/glbExporter';
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
  updateLandmarks: (mesh: any, landmarks: Record<string, [number, number, number]>) => void;
  loadAndPlayGLB: (url: string) => Promise<void>;
}

type PipelineStatusState =
  | { type: 'ready' }
  | { type: 'baking_landmarks' }
  | { type: 'solving_humanoid' }
  | { type: 'complete' }
  | { type: 'error'; message: string };

export function useMmdPipeline(threeBridge: ThreeBridge, lang: Lang = 'zh') {
  const [statusState, setStatusState] = useState<PipelineStatusState>({ type: 'ready' });
  const [progress, setProgress] = useState<number>(0);
  const [baking, setBaking] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('both');
  const [downloads, setDownloads] = useState<PipelineDownloadResult | null>(null);

  const activeUrlsRef = useRef<string[]>([]);
  const cleanupUrls = () => {
    activeUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    activeUrlsRef.current = [];
  };

  useEffect(() => {
    return cleanupUrls;
  }, []);

  // 动态响应式生成多语言状态文本
  const status = useMemo(() => {
    const t = I18N[lang];
    switch (statusState.type) {
      case 'ready':
        return t.statusReady;
      case 'baking_landmarks':
        return t.statusBakingLandmarks;
      case 'solving_humanoid':
        return t.statusSolvingHumanoid;
      case 'complete':
        return t.statusComplete;
      case 'error':
        return t.statusError(statusState.message);
    }
  }, [lang, statusState]);

  const runPipeline = useCallback(
    async (pmxTarget: File | string, vmdTarget: File | string, format: ExportFormat = exportFormat) => {
      try {
        setBaking(true);
        setDownloads(null);
        cleanupUrls();

        setStatusState({ type: 'baking_landmarks' });
        threeBridge.setMmdCamera();
        threeBridge.clearCurrentMesh();

        const landmarkData = await bakePure3DLandmarks(
          pmxTarget,
          vmdTarget,
          (mesh, landmarks, prog) => {
            setProgress(prog);
            threeBridge.updateLandmarks(mesh, landmarks);
          }
        );

        setStatusState({ type: 'solving_humanoid' });
        threeBridge.setHumanoidCamera();

        const baseName =
          typeof vmdTarget === 'string'
            ? 'output_motion'
            : vmdTarget.name.replace(/\.[^/.]+$/, '');

        const result: PipelineDownloadResult = {};

        // 导出 GLB
        if (format === 'glb' || format === 'both') {
          const glbBlob = await exportFull52HumanoidGLB(landmarkData);
          const glbUrl = URL.createObjectURL(glbBlob);
          activeUrlsRef.current.push(glbUrl);
          result.glb = { url: glbUrl, filename: `${baseName}_humanoid.glb` };
          await threeBridge.loadAndPlayGLB(glbUrl);
        }

        // 导出带有 Metadata 的 VRMA
        if (format === 'vrma' || format === 'both') {
          const vrmaBlob = await exportFull52VRMA(landmarkData, {
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
        setStatusState({ type: 'complete' });
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        setStatusState({ type: 'error', message: msg });
      } finally {
        setBaking(false);
      }
    },
    [threeBridge, exportFormat]
  );

  const downloadFile = (item: DownloadItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.filename;
    a.click();
  };

  return {
    status,
    progress,
    baking,
    exportFormat,
    setExportFormat,
    downloads,
    runPipeline,
    downloadFile,
  };
}

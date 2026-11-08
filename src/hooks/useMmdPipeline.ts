// src/hooks/useMmdPipeline.ts
import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useMmdPipeline(threeBridge: ThreeBridge) {
  const [status, setStatus] = useState<string>('就绪：可放入动作文件或直接测试默认动作');
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

  const runPipeline = useCallback(
    async (pmxTarget: File | string, vmdTarget: File | string, format: ExportFormat = exportFormat) => {
      try {
        setBaking(true);
        setDownloads(null);
        cleanupUrls();

        setStatus('1/2 抓取 MMD 动作 3D 世界坐标...');
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

        setStatus('2/2 求解骨骼并导出动画数据...');
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
        setStatus('解算完成！动画已在视口播放，可直接下载对应文件。');
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        setStatus(`错误: ${msg}`);
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

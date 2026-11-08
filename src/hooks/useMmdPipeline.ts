// src/hooks/useMmdPipeline.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { bakePure3DLandmarks } from '../utils/baker';
import { exportFull52HumanoidGLB } from '../utils/glbExporter';

interface ThreeBridge {
  setMmdCamera: () => void;
  setHumanoidCamera: () => void;
  clearCurrentMesh: () => void;
  updateLandmarks: (mesh: any, landmarks: Record<string, [number, number, number]>) => void;
  loadAndPlayGLB: (url: string) => Promise<void>;
}

export function useMmdPipeline(threeBridge: ThreeBridge) {
  const [status, setStatus] = useState<string>('就绪：可拖拽本地文件或直接使用内置演示测试');
  const [progress, setProgress] = useState<number>(0);
  const [baking, setBaking] = useState<boolean>(false);
  const [downloadInfo, setDownloadInfo] = useState<{ url: string; filename: string } | null>(null);

  // 清理 URL 对象防内存泄露
  const activeUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
    };
  }, []);

  const runPipeline = useCallback(async (pmxTarget: File | string, vmdTarget: File | string) => {
    try {
      setBaking(true);
      setDownloadInfo(null);
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

      setStatus('2/2 运行解算引擎并构建 Humanoid GLB...');
      const glbBlob = await exportFull52HumanoidGLB(landmarkData);

      // 解算完成，切换相机到人物高度中心
      threeBridge.setHumanoidCamera();

      // 释放旧的 Blob URL
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);

      const glbUrl = URL.createObjectURL(glbBlob);
      activeUrlRef.current = glbUrl;

      // 视口中载入解算后的 GLB
      await threeBridge.loadAndPlayGLB(glbUrl);

      const filename = typeof pmxTarget === 'string'
        ? 'output_humanoid.glb'
        : `${pmxTarget.name.replace('.pmx', '')}_humanoid.glb`;

      // 仅存储下载元数据，不自动触发下载！
      setDownloadInfo({ url: glbUrl, filename });
      setStatus('解算完成！GLB 已在视口播放，可点击下方按钮下载。');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(`错误: ${msg}`);
    } finally {
      setBaking(false);
    }
  }, [threeBridge]);

  // 手动下载触发器
  const triggerDownload = useCallback(() => {
    if (!downloadInfo) return;
    const a = document.createElement('a');
    a.href = downloadInfo.url;
    a.download = downloadInfo.filename;
    a.click();
  }, [downloadInfo]);

  return {
    status,
    progress,
    baking,
    downloadInfo,
    runPipeline,
    triggerDownload
  };
}

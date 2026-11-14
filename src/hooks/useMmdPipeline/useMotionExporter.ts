// src/hooks/useMmdPipeline/useMotionExporter.ts
import { RefObject, useCallback, useState } from 'react';
import { I18nTexts } from '../../i18n';
import { LandmarkData } from '../../types/types';
import {
    ExpressionTrack,
    mergeExpressionTracksIntoLandmarkData,
} from '../../utils/expressionTrackEvaluator';
import { exportFull52HumanoidGLB } from '../../utils/glbExporter';
import { trimLandmarkData } from '../../utils/motionTrimmer';
import { exportFull52VRMA, VrmaMetaOptions } from '../../utils/vrmaExporter';

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

interface MotionExporterDeps {
  rawLandmarkDataRef: RefObject<LandmarkData | null>;
  expressionTracks: ExpressionTrack[];
  startFrame: number;
  endFrame: number;
  getBaseFilename: () => string;
  t?: I18nTexts;
}

export function useMotionExporter({
  rawLandmarkDataRef,
  expressionTracks,
  startFrame,
  endFrame,
  getBaseFilename,
  t,
}: MotionExporterDeps) {
  const [exportingType, setExportingType] = useState<string | null>(null);

  const runExport = useCallback(
    async (format: 'vrma' | 'glb', buildBlob: (trimmed: LandmarkData) => Promise<Blob>) => {
      if (!rawLandmarkDataRef.current) return;
      try {
        setExportingType(format);
        const withExpressions = mergeExpressionTracksIntoLandmarkData(
          rawLandmarkDataRef.current,
          expressionTracks
        );
        // 此处为全流唯一的 Trimming 裁切出口！
        const trimmed = trimLandmarkData(withExpressions, startFrame, endFrame);
        const blob = await buildBlob(trimmed);
        triggerBrowserDownload(blob, `${getBaseFilename()}_[${startFrame}-${endFrame}].${format}`);
      } catch (err) {
        const errMsg = t
          ? t.exportMotionFail(format.toUpperCase(), String(err))
          : `导出 ${format.toUpperCase()} 失败: ${err}`;
        alert(errMsg);
      } finally {
        setExportingType(null);
      }
    },
    [rawLandmarkDataRef, expressionTracks, startFrame, endFrame, getBaseFilename, t]
  );

  const downloadVrma = useCallback(
    (metaOptions?: VrmaMetaOptions) =>
      runExport('vrma', (trimmed) =>
        exportFull52VRMA(trimmed, {
          title: metaOptions?.title || getBaseFilename(),
          authors: metaOptions?.authors,
          copyrightInformation: metaOptions?.copyrightInformation,
          licenseUrl: metaOptions?.licenseUrl,
        })
      ),
    [runExport, getBaseFilename]
  );

  const downloadGlb = useCallback(
    () => runExport('glb', (trimmed) => exportFull52HumanoidGLB(trimmed)),
    [runExport]
  );

  const downloadBoth = useCallback(
    async (metaOptions?: VrmaMetaOptions) => {
      await downloadVrma(metaOptions);
      await downloadGlb();
    },
    [downloadVrma, downloadGlb]
  );

  return {
    exportingType,
    downloadVrma,
    downloadGlb,
    downloadBoth,
  };
}

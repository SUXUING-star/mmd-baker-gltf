import { useCallback, useMemo, useState } from 'react';
import { I18N, Lang } from '../../i18n';
import { ModelMorphInfo } from '../../types/types';
import { ExpressionTrack } from '../../utils/expressionTrackEvaluator';
import { DEFAULT_LOOP_OPTIONS, LoopBlendOptions } from '../../utils/loopBlender';
import { VmdExpressionTrackSummary } from '../../utils/vmdExpressionAnalyzer';
import { VrmaMetaOptions } from '../../utils/vrmaExporter';
import { BakerThreeBridge, useMmdBaker } from './useMmdBaker';
import { useMmdFiles } from './useMmdFiles';
import { useMotionExporter } from './useMotionExporter';
import {
  TimelineController,
  TimelineThreeBridge,
  useTimelinePlayback,
} from './useTimelinePlayback';

export type StatusType = 'ready' | 'analyzing' | 'ready_to_export' | 'exporting' | 'error';
export type { TimelineController };

export interface MmdPipeline {
  status: string;
  statusType: StatusType;
  progress: number;
  processing: boolean;
  exportingType: string | null;
  customPmxFile: File | null;
  vmdFile: File | null;
  activePmxTarget: File | string;
  activeVmdTarget: File | string;
  availableMorphs: ModelMorphInfo[];
  selectPmx: (file: File | null, extraFiles?: File[]) => void;
  selectVmd: (file: File) => void;
  resetPmx: () => void;
  timeline: TimelineController;
  startBake: () => Promise<void>;
  loadDefaultDemo: () => Promise<void>;
  downloadVrma: (metaOptions?: VrmaMetaOptions) => Promise<void>;
  downloadGlb: () => Promise<void>;
  downloadBoth: (metaOptions?: VrmaMetaOptions) => Promise<void>;
  applyLoopAndRefresh: (newOptions?: LoopBlendOptions) => void;
  vmdExpressionTracks: VmdExpressionTrackSummary[];
  getFrameVmdExpressions: (frame: number) => Record<string, number>;
}

export interface ThreeBridge extends BakerThreeBridge, TimelineThreeBridge {
  clearPoints: () => void;
  renderLandmarksPositions: (landmarks: Record<string, [number, number, number]>) => void;
}

export function useMmdPipeline(
  threeBridge: ThreeBridge,
  defaultPmxPath: string,
  defaultVmdPath: string,
  lang: Lang = 'zh',
  loopOptions: LoopBlendOptions = DEFAULT_LOOP_OPTIONS,
  expressionTracks: ExpressionTrack[] = []
): MmdPipeline {
  const [statusType, setStatusType] = useState<StatusType>('ready');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const markReady = useCallback(() => setStatusType('ready'), []);

  const files = useMmdFiles(defaultPmxPath, defaultVmdPath, markReady);
  const baker = useMmdBaker(threeBridge);
  const playback = useTimelinePlayback(
    baker.rawLandmarkDataRef,
    threeBridge,
    loopOptions,
    expressionTracks
  );
  const exporter = useMotionExporter({
    rawLandmarkDataRef: baker.rawLandmarkDataRef,
    expressionTracks,
    loopOptions,
    startFrame: playback.startFrame,
    endFrame: playback.endFrame,
    getBaseFilename: files.getBaseFilename,
  });

  const runBake = useCallback(
    async (pmxTarget: File | string, vmdTarget: File | string, extraFiles: File[]) => {
      try {
        playback.stopPlayback();
        setStatusType('analyzing');
        const { landmarkData } = await baker.bake(pmxTarget, vmdTarget, extraFiles);
        setStatusType('ready_to_export');
        playback.initAndPlay(landmarkData);
      } catch (err: unknown) {
        console.error(err);
        setStatusType('error');
        setErrorMessage(err instanceof Error ? err.message : String(err));
      }
    },
    [playback, baker]
  );

  const startBake = useCallback(async () => {
    await runBake(files.activePmxTarget, files.activeVmdTarget, files.customExtraFiles);
  }, [runBake, files.activePmxTarget, files.activeVmdTarget, files.customExtraFiles]);

  const loadDefaultDemo = useCallback(async () => {
    files.resetAllToDefault();
    await runBake(defaultPmxPath, defaultVmdPath, []);
  }, [files, runBake, defaultPmxPath, defaultVmdPath]);

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
    progress: baker.progress,
    processing: baker.processing,
    exportingType: exporter.exportingType,
    customPmxFile: files.customPmxFile,
    vmdFile: files.vmdFile,
    activePmxTarget: files.activePmxTarget,
    activeVmdTarget: files.activeVmdTarget,
    availableMorphs: baker.availableMorphs,
    selectPmx: files.selectPmx,
    selectVmd: files.selectVmd,
    resetPmx: files.resetPmx,
    timeline: playback.timeline,
    startBake,
    loadDefaultDemo,
    downloadVrma: exporter.downloadVrma,
    downloadGlb: exporter.downloadGlb,
    downloadBoth: exporter.downloadBoth,
    applyLoopAndRefresh: playback.applyLoopAndRefresh,
    vmdExpressionTracks: baker.vmdExpressionTracks,
    getFrameVmdExpressions: baker.getFrameVmdExpressions,
  };
}

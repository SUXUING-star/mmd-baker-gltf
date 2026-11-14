// src/hooks/useMmdPipeline/useMmdBaker.ts
import { useCallback, useRef, useState } from 'react';
import { LandmarkData, ModelMorphInfo } from '../../types/types';
import { bakePure3DLandmarks, BakerResult, loadPmxMeshOnly } from '../../utils/baker';
import {
    analyzeVmdExpressions,
    VmdExpressionTrackSummary,
} from '../../utils/vmdExpressionAnalyzer';

export interface BakerThreeBridge {
  setMmdCamera: () => void;
  clearCurrentMesh: () => void;
  setupMmdAnimation: (mesh: any, animation?: any) => void;
  updateLandmarks: (mesh: any, landmarks: Record<string, [number, number, number]>) => void;
}

export function useMmdBaker(threeBridge: BakerThreeBridge) {
  const rawLandmarkDataRef = useRef<LandmarkData | null>(null);
  const [availableMorphs, setAvailableMorphs] = useState<ModelMorphInfo[]>([]);
  const [vmdExpressionTracks, setVmdExpressionTracks] = useState<VmdExpressionTrackSummary[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);

  const loadCharacterModel = useCallback(
    async (pmxTarget: File | string, extraFiles: File[]) => {
      try {
        setProcessing(true);
        threeBridge.clearCurrentMesh();
        const mesh = await loadPmxMeshOnly(pmxTarget, extraFiles);
        threeBridge.setupMmdAnimation(mesh);
        return mesh;
      } finally {
        setProcessing(false);
      }
    },
    [threeBridge]
  );

  const bake = useCallback(
    async (
      pmxTarget: File | string,
      vmdTarget: File | string,
      extraFiles: File[]
    ): Promise<BakerResult> => {
      try {
        setProcessing(true);
        setProgress(0);
        setAvailableMorphs([]);
        setVmdExpressionTracks([]);

        threeBridge.setMmdCamera();
        threeBridge.clearCurrentMesh();

        const result = await bakePure3DLandmarks(
          pmxTarget,
          vmdTarget,
          (mesh, landmarks, prog) => {
            setProgress(prog);
            threeBridge.updateLandmarks(mesh, landmarks);
          },
          extraFiles
        );

        rawLandmarkDataRef.current = result.landmarkData;
        setAvailableMorphs(result.landmarkData.availableMorphs || []);
        setVmdExpressionTracks(analyzeVmdExpressions(result.landmarkData));
        threeBridge.setupMmdAnimation(result.mesh, result.animation);

        return result;
      } finally {
        setProcessing(false);
      }
    },
    [threeBridge]
  );

  const getFrameVmdExpressions = useCallback((frame: number): Record<string, number> => {
    return rawLandmarkDataRef.current?.frames[frame]?.expressions || {};
  }, []);

  return {
    rawLandmarkDataRef,
    availableMorphs,
    vmdExpressionTracks,
    getFrameVmdExpressions,
    progress,
    processing,
    loadCharacterModel,
    bake,
  };
}

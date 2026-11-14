// src/hooks/useMmdPipeline/useMmdBaker.ts
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { CameraAnimationData } from '../../solvers/cameraSolver';
import { LandmarkData, ModelMorphInfo } from '../../types/types';
import { bakePure3DLandmarks, BakerResult, loadPmxMeshOnly } from '../../utils/baker';
import { bakeCameraVmd } from '../../utils/cameraBaker';
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

  const clearBakeData = useCallback(() => {
    rawLandmarkDataRef.current = null;
    setAvailableMorphs([]);
    setVmdExpressionTracks([]);
    setProgress(0);
  }, []);

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
        clearBakeData();

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
    [threeBridge, clearBakeData]
  );

  const bakeCamera = useCallback(
    async (
      pmxTarget: File | string,
      vmdTarget: File | string,
      extraFiles: File[],
      onFramePose?: (cam: THREE.PerspectiveCamera, prog: number) => void
    ): Promise<CameraAnimationData> => {
      try {
        setProcessing(true);
        clearBakeData();
        threeBridge.clearCurrentMesh();

        const mesh = await loadPmxMeshOnly(pmxTarget, extraFiles);
        threeBridge.setupMmdAnimation(mesh);

        return await bakeCameraVmd(vmdTarget, (cam, prog) => {
          setProgress(prog);
          onFramePose?.(cam, prog);
        });
      } finally {
        setProcessing(false);
      }
    },
    [threeBridge, clearBakeData]
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
    clearBakeData,
    loadCharacterModel,
    bake,
    bakeCamera,
  };
}

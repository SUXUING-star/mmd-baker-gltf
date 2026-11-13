import { useCallback, useRef, useState } from 'react';
import { LandmarkData, ModelMorphInfo } from '../../types/types';
import { bakePure3DLandmarks, BakerResult } from '../../utils/baker';

export interface BakerThreeBridge {
  setMmdCamera: () => void;
  clearCurrentMesh: () => void;
  setupMmdAnimation: (mesh: any, animation: any) => void;
  updateLandmarks: (mesh: any, landmarks: Record<string, [number, number, number]>) => void;
}

export function useMmdBaker(threeBridge: BakerThreeBridge) {
  const rawLandmarkDataRef = useRef<LandmarkData | null>(null);
  const [availableMorphs, setAvailableMorphs] = useState<ModelMorphInfo[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [processing, setProcessing] = useState<boolean>(false);

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
        threeBridge.setupMmdAnimation(result.mesh, result.animation);

        return result;
      } finally {
        setProcessing(false);
      }
    },
    [threeBridge]
  );

  return {
    rawLandmarkDataRef,
    availableMorphs,
    progress,
    processing,
    bake,
  };
}

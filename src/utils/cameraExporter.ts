// src/utils/cameraExporter.ts
import type { VRMCVRMAnimation } from '@pixiv/types-vrmc-vrm-animation-1.0';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { CameraAnimationData } from '../solvers/cameraSolver';
import { VrmaMetaOptions } from './vrmaExporter';

function buildCameraClipAndScene(
  cameraData: CameraAnimationData,
  startFrame = 0,
  endFrame?: number
): { scene: THREE.Scene; clip: THREE.AnimationClip } {
  const eFrame =
    endFrame !== undefined
      ? Math.min(endFrame, cameraData.frames.length - 1)
      : cameraData.frames.length - 1;
  const sFrame = Math.max(0, Math.min(startFrame, eFrame));
  const subFrames = cameraData.frames.slice(sFrame, eFrame + 1);

  if (subFrames.length === 0) {
    throw new Error('没有可导出的相机帧数据');
  }

  const times: number[] = [];
  const posValues: number[] = [];
  const rotValues: number[] = [];
  const startTime = subFrames[0].time;

  subFrames.forEach((frame) => {
    const relTime = frame.time - startTime;
    times.push(relTime);
    posValues.push(frame.position.x, frame.position.y, frame.position.z);
    rotValues.push(frame.quaternion.x, frame.quaternion.y, frame.quaternion.z, frame.quaternion.w);
  });

  const cameraNode = new THREE.PerspectiveCamera(
    subFrames[0].fov || 45,
    16 / 9,
    0.1,
    1000
  );
  cameraNode.name = 'MainCamera';

  const posTrack = new THREE.VectorKeyframeTrack('MainCamera.position', times, posValues);
  const rotTrack = new THREE.QuaternionKeyframeTrack('MainCamera.quaternion', times, rotValues);

  const clip = new THREE.AnimationClip(
    'CameraAnimation',
    subFrames[subFrames.length - 1].time - startTime,
    [posTrack, rotTrack]
  );

  const scene = new THREE.Scene();
  scene.name = 'CameraScene';
  scene.add(cameraNode);

  return { scene, clip };
}

export async function exportCameraVRMA(
  cameraData: CameraAnimationData,
  metaOptions?: VrmaMetaOptions,
  startFrame = 0,
  endFrame?: number
): Promise<Blob> {
  const { scene, clip } = buildCameraClipAndScene(cameraData, startFrame, endFrame);
  const exporter = new GLTFExporter();

  exporter.register((writer: any) => ({
    name: 'VRMC_vrm_animation',
    afterParse: () => {
      const vrmcAnimation: VRMCVRMAnimation = {
        specVersion: '1.0',
        humanoid: {
          humanBones: {} as any,
        },
      };

      const gltfJson = writer.json;
      gltfJson.asset = gltfJson.asset || {};
      gltfJson.asset.generator = 'MMD-to-Humanoid Solver (Pixiv VRMC_vrm_animation 1.0 Camera)';
      gltfJson.asset.extras = {
        title: metaOptions?.title?.trim() || 'Untitled Camera VRMA Motion',
        authors: metaOptions?.authors && metaOptions.authors.length > 0 ? metaOptions.authors : ['Unknown'],
        copyrightInformation: metaOptions?.copyrightInformation?.trim() || '',
        licenseUrl: metaOptions?.licenseUrl?.trim() || 'https://vrm.dev/licenses/1.0/',
      };

      gltfJson.extensions = gltfJson.extensions || {};
      gltfJson.extensions['VRMC_vrm_animation'] = vrmcAnimation;

      gltfJson.extensionsUsed = gltfJson.extensionsUsed || [];
      if (!gltfJson.extensionsUsed.includes('VRMC_vrm_animation')) {
        gltfJson.extensionsUsed.push('VRMC_vrm_animation');
      }
    },
  }));

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => resolve(new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' })),
      (err) => reject(err),
      { binary: true, animations: [clip] }
    );
  });
}

export async function exportCameraGLB(
  cameraData: CameraAnimationData,
  startFrame = 0,
  endFrame?: number
): Promise<Blob> {
  const { scene, clip } = buildCameraClipAndScene(cameraData, startFrame, endFrame);
  const exporter = new GLTFExporter();

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: 'model/gltf-binary' }));
        } else {
          const jsonStr = JSON.stringify(result);
          resolve(new Blob([jsonStr], { type: 'application/json' }));
        }
      },
      (error) => reject(error),
      {
        binary: true,
        animations: [clip],
      }
    );
  });
}


import * as THREE from 'three';
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
import { LandmarkData, LandmarkFrame, MMD_POINT_NAMES } from '../types/types';

export interface BakerRenderCallback {
  (mesh: THREE.SkinnedMesh, landmarks: Record<string, [number, number, number]>, progress: number): void;
}

export async function bakePure3DLandmarks(
  pmxInput: File | string,
  vmdInput: File | string,
  onFrameRender?: BakerRenderCallback
): Promise<LandmarkData> {
  let pmxUrl: string;
  let vmdUrl: string;
  let isPmxBlob = false;
  let isVmdBlob = false;

  if (typeof pmxInput === 'string') {
    pmxUrl = pmxInput;
  } else {
    pmxUrl = URL.createObjectURL(pmxInput) + '#model.pmx';
    isPmxBlob = true;
  }

  if (typeof vmdInput === 'string') {
    vmdUrl = vmdInput;
  } else {
    vmdUrl = URL.createObjectURL(vmdInput) + '#motion.vmd';
    isVmdBlob = true;
  }

  const manager = new THREE.LoadingManager();

  try {
    const loader = new MMDLoader(manager);

    const mesh = await new Promise<THREE.SkinnedMesh>((resolve, reject) => {
      loader.load(
        pmxUrl,
        (m) => resolve(m),
        undefined,
        (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          reject(new Error(`无法加载 PMX 模型 [${pmxUrl}]: ${msg}`));
        }
      );
    });

    const animation = await new Promise<THREE.AnimationClip>((resolve, reject) => {
      loader.loadAnimation(
        vmdUrl,
        mesh,
        (a) => resolve(a as THREE.AnimationClip),
        undefined,
        (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          reject(new Error(`无法加载 VMD 动作 [${vmdUrl}]: ${msg}`));
        }
      );
    });

    const helper = new MMDAnimationHelper({ afterglow: 0, resetPhysicsOnLoop: false });
    helper.add(mesh, { animation: animation, physics: false, warmup: 0 });

    const boneNodeMap = new Map<string, THREE.Bone>();
    mesh.skeleton.bones.forEach((b) => {
      if ((MMD_POINT_NAMES as readonly string[]).includes(b.name as any)) {
        boneNodeMap.set(b.name, b);
      }
    });

    const fps = 30;
    const dt = 1.0 / fps;
    const totalDuration = animation.duration;
    const totalFrames = Math.ceil(totalDuration * fps);
    const bakedFrames: LandmarkFrame[] = [];
    const worldPos = new THREE.Vector3();

    for (let f = 0; f < totalFrames; f++) {
      helper.update(dt);
      mesh.updateMatrixWorld(true);

      const landmarks: Record<string, [number, number, number]> = {};

      boneNodeMap.forEach((bone, name) => {
        bone.getWorldPosition(worldPos);
        landmarks[name] = [
          Number(worldPos.x.toFixed(4)),
          Number(worldPos.y.toFixed(4)),
          Number(worldPos.z.toFixed(4))
        ];
      });

      bakedFrames.push({
        time: Number((f * dt).toFixed(3)),
        landmarks
      });

      if (onFrameRender) {
        onFrameRender(mesh, landmarks, Math.round((f / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 16));
      }
    }

    return {
      fps,
      totalFrames,
      duration: totalDuration,
      frames: bakedFrames
    };
  } finally {
    if (isPmxBlob) URL.revokeObjectURL(pmxUrl.split('#')[0]);
    if (isVmdBlob) URL.revokeObjectURL(vmdUrl.split('#')[0]);
  }
}

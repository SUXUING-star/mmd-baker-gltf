// src/utils/baker.ts
import * as THREE from 'three';
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
import { resolveModelBones } from '../types/boneMapping';
import { LandmarkData, LandmarkFrame } from '../types/types';

export interface BakerRenderCallback {
  (mesh: THREE.SkinnedMesh, landmarks: Record<string, [number, number, number]>, progress: number): void;
}

export interface BakerResult {
  landmarkData: LandmarkData;
  mesh: THREE.SkinnedMesh;
  animation: THREE.AnimationClip;
}

const BLANK_TEXTURE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export async function bakePure3DLandmarks(
  pmxInput: File | string,
  vmdInput: File | string,
  onFrameRender?: BakerRenderCallback,
  extraFiles?: File[]
): Promise<BakerResult> {
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
  const createdBlobUrls: string[] = [];
  const fileMap = new Map<string, string>();

  if (extraFiles && extraFiles.length > 0) {
    for (const file of extraFiles) {
      const blobUrl = URL.createObjectURL(file);
      createdBlobUrls.push(blobUrl);

      fileMap.set(file.name.toLowerCase(), blobUrl);

      if (file.webkitRelativePath) {
        const normalizedRel = file.webkitRelativePath.toLowerCase().replace(/\\/g, '/');
        fileMap.set(normalizedRel, blobUrl);
        const parts = normalizedRel.split('/');
        if (parts.length > 1) {
          fileMap.set(parts.slice(1).join('/'), blobUrl);
        }
      }
    }
  }

  manager.setURLModifier((url: string) => {
    if (url.includes('#model.pmx') || url.includes('#motion.vmd')) {
      return url;
    }

    const cleanUrl = decodeURIComponent(url).replace(/\\/g, '/');
    const pathname = cleanUrl.replace(/^blob:https?:\/\/[^/]+\//i, '');
    const filename = pathname.split('/').pop()?.toLowerCase() || '';
    const lowerPath = pathname.toLowerCase();

    if (fileMap.has(lowerPath)) {
      return fileMap.get(lowerPath)!;
    }
    if (fileMap.has(filename)) {
      return fileMap.get(filename)!;
    }

    if (/\.(png|jpe?g|bmp|tga|spa|sph|webp|dds)$/i.test(cleanUrl) || cleanUrl.includes('Texture2D') || cleanUrl.includes('tex')) {
      return BLANK_TEXTURE_DATA_URL;
    }

    return url;
  });

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

    // 关键修正：将整棵 Object3D 节点树 `mesh` 传入，深度搜刮多层/两层嵌套下的所有骨骼
    const standardBoneMap = resolveModelBones(mesh);

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

      standardBoneMap.forEach((bone, stdName) => {
        bone.getWorldPosition(worldPos);
        const posArr: [number, number, number] = [
          Number(worldPos.x.toFixed(4)),
          Number(worldPos.y.toFixed(4)),
          Number(worldPos.z.toFixed(4))
        ];
        landmarks[stdName] = posArr;
        landmarks[bone.name] = posArr;
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
      landmarkData: {
        fps,
        totalFrames,
        duration: totalDuration,
        frames: bakedFrames
      },
      mesh,
      animation
    };
  } finally {
    if (isPmxBlob) URL.revokeObjectURL(pmxUrl.split('#')[0]);
    if (isVmdBlob) URL.revokeObjectURL(vmdUrl.split('#')[0]);
    createdBlobUrls.forEach((u) => URL.revokeObjectURL(u));
  }
}

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

/** 1x1 透明 PNG Base64，用于缺失贴图的静默兜底，杜绝 ERR_FILE_NOT_FOUND 报错 */
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

  // 为文件夹中所有伴随文件建立内存索引
  if (extraFiles && extraFiles.length > 0) {
    for (const file of extraFiles) {
      const blobUrl = URL.createObjectURL(file);
      createdBlobUrls.push(blobUrl);

      // 文件名匹配 (例如 tex_bdy.png)
      fileMap.set(file.name.toLowerCase(), blobUrl);

      // 相对路径匹配 (例如 texture2d/tex_bdy.png)
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

  // 拦截贴图资源加载，杜绝任何 404
  manager.setURLModifier((url: string) => {
    if (url.includes('#model.pmx') || url.includes('#motion.vmd')) {
      return url;
    }

    const cleanUrl = decodeURIComponent(url).replace(/\\/g, '/');
    const pathname = cleanUrl.replace(/^blob:https?:\/\/[^/]+\//i, '');
    const filename = pathname.split('/').pop()?.toLowerCase() || '';
    const lowerPath = pathname.toLowerCase();

    // 1. 相对路径命中
    if (fileMap.has(lowerPath)) {
      return fileMap.get(lowerPath)!;
    }
    // 2. 纯文件名命中
    if (fileMap.has(filename)) {
      return fileMap.get(filename)!;
    }

    // 3. 未找到贴图时的兜底：直接返回 1x1 内存图，绝不让浏览器发不存在的 blob 从而报 ERR_FILE_NOT_FOUND
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

    const standardBoneMap = resolveModelBones(mesh.skeleton.bones);

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

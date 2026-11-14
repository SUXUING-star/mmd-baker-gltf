// src/utils/baker.ts
import * as THREE from 'three';
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
import { resolveModelBones } from '../types/boneMapping';
import { resolveExpressionTarget } from '../types/expressionMapping';
import { LandmarkData, LandmarkFrame, ModelMorphInfo } from '../types/types';

export interface BakerRenderCallback {
  (
    mesh: THREE.SkinnedMesh,
    landmarks: Record<string, [number, number, number]>,
    progress: number,
    expressions?: Record<string, number>
  ): void;
}

export interface BakerResult {
  landmarkData: LandmarkData;
  mesh: THREE.SkinnedMesh;
  animation: THREE.AnimationClip;
}

interface ActiveMorphBinding {
  index: number;
  targetKey: string;
}

const BLANK_TEXTURE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORUS5CYII=';

function extractModelMorphs(mesh: THREE.SkinnedMesh): ModelMorphInfo[] {
  const dict = mesh.morphTargetDictionary;
  if (!dict) return [];

  return Object.entries(dict)
    .sort((a, b) => a[1] - b[1])
    .map(([rawName]) => {
      const { key, isPreset } = resolveExpressionTarget(rawName);
      return { rawName, targetKey: key, isPreset };
    });
}

function resolveAnimatedMorphs(mesh: THREE.SkinnedMesh, animation: THREE.AnimationClip): ActiveMorphBinding[] {
  const dict = mesh.morphTargetDictionary;
  if (!dict) return [];

  const animatedIndices = new Set<number>();
  for (const track of animation.tracks) {
    const match = track.name.match(/morphTargetInfluences\[(\d+)\]/);
    if (match) {
      animatedIndices.add(Number(match[1]));
    }
  }

  const bindings: ActiveMorphBinding[] = [];
  for (const [morphName, index] of Object.entries(dict)) {
    if (!animatedIndices.has(index)) continue;
    const { key } = resolveExpressionTarget(morphName);
    bindings.push({ index, targetKey: key });
  }

  return bindings;
}

/**
 * 自动检测并裁剪首尾静态 A-Pose / T-Pose 空白帧，重置时间轴
 */
function cleanRestPoseFrames(
  frames: LandmarkFrame[],
  restLm: Record<string, [number, number, number]>
): LandmarkFrame[] {
  if (frames.length < 10) return frames;

  // 1. 扫描开头是否存在与 Rest Pose 几乎一致的静态 A-Pose 帧
  let startIndex = 0;
  while (startIndex < frames.length - 5) {
    const frameLm = frames[startIndex].landmarks;
    let sumSq = 0;
    let count = 0;

    for (const k in restLm) {
      if (frameLm[k] && restLm[k]) {
        const dx = frameLm[k][0] - restLm[k][0];
        const dy = frameLm[k][1] - restLm[k][1];
        const dz = frameLm[k][2] - restLm[k][2];
        sumSq += dx * dx + dy * dy + dz * dz;
        count++;
      }
    }

    const avgDist = count > 0 ? Math.sqrt(sumSq / count) : 0;
    // 如果与 A-Pose 姿态平均偏差小于 0.008（静止 A-Pose），则自动裁剪
    if (avgDist < 0.008) {
      startIndex++;
    } else {
      break;
    }
  }

  // 2. 扫描结尾是否存在静态 A-Pose 帧
  let endIndex = frames.length - 1;
  while (endIndex > startIndex + 5) {
    const frameLm = frames[endIndex].landmarks;
    let sumSq = 0;
    let count = 0;

    for (const k in restLm) {
      if (frameLm[k] && restLm[k]) {
        const dx = frameLm[k][0] - restLm[k][0];
        const dy = frameLm[k][1] - restLm[k][1];
        const dz = frameLm[k][2] - restLm[k][2];
        sumSq += dx * dx + dy * dy + dz * dz;
        count++;
      }
    }

    const avgDist = count > 0 ? Math.sqrt(sumSq / count) : 0;
    if (avgDist < 0.008) {
      endIndex--;
    } else {
      break;
    }
  }

  // 如果成功裁剪掉了空 A-Pose 帧，重置时间轴起点
  if (startIndex > 0 || endIndex < frames.length - 1) {
    const sliced = frames.slice(startIndex, endIndex + 1);
    const baseTime = sliced[0].time;
    return sliced.map((f) => ({
      ...f,
      time: Number((f.time - baseTime).toFixed(3)),
    }));
  }

  return frames;
}

export async function loadPmxMeshOnly(
  pmxInput: File | string,
  extraFiles?: File[]
): Promise<THREE.SkinnedMesh> {
  let pmxUrl: string;
  let isPmxBlob = false;

  if (typeof pmxInput === 'string') {
    pmxUrl = pmxInput;
  } else {
    pmxUrl = URL.createObjectURL(pmxInput) + '#model.pmx';
    isPmxBlob = true;
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
    if (url.includes('#model.pmx') || url.includes('#motion.vmd') || url.startsWith('data:')) {
      return url;
    }

    if (!url.startsWith('blob:')) {
      return url.replace(/\\/g, '/');
    }

    const cleanUrl = decodeURIComponent(url).replace(/\\/g, '/');
    const pathname = cleanUrl.replace(/^blob:https?:\/\/[^/]+\//i, '').replace(/^\.\//, '');
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
    return mesh;
  } finally {
    if (isPmxBlob) URL.revokeObjectURL(pmxUrl.split('#')[0]);
    createdBlobUrls.forEach((u) => URL.revokeObjectURL(u));
  }
}

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
    if (url.includes('#model.pmx') || url.includes('#motion.vmd') || url.startsWith('data:')) {
      return url;
    }

    if (!url.startsWith('blob:')) {
      return url.replace(/\\/g, '/');
    }

    const cleanUrl = decodeURIComponent(url).replace(/\\/g, '/');
    const pathname = cleanUrl.replace(/^blob:https?:\/\/[^/]+\//i, '').replace(/^\.\//, '');
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

    const initialBonePose = mesh.skeleton.bones.map((b) => ({
      pos: b.position.clone(),
      quat: b.quaternion.clone(),
      scale: b.scale.clone(),
    }));

    const helper = new MMDAnimationHelper({ afterglow: 0, resetPhysicsOnLoop: false });
    helper.add(mesh, { animation: animation, physics: false, warmup: 0 });

    const standardBoneMap = resolveModelBones(mesh);
    const availableMorphs = extractModelMorphs(mesh);
    const activeMorphs = resolveAnimatedMorphs(mesh, animation);

    const worldPos = new THREE.Vector3();
    mesh.updateMatrixWorld(true);
    const restLandmarks: Record<string, [number, number, number]> = {};
    standardBoneMap.forEach((bone, stdName) => {
      bone.getWorldPosition(worldPos);
      const posArr: [number, number, number] = [
        Number(worldPos.x.toFixed(4)),
        Number(worldPos.y.toFixed(4)),
        Number(worldPos.z.toFixed(4)),
      ];
      restLandmarks[stdName] = posArr;
      restLandmarks[bone.name] = posArr;
    });

    const fps = 30;
    const dt = 1.0 / fps;
    const totalDuration = animation.duration;
    const totalFrames = Math.ceil(totalDuration * fps);
    const rawBakedFrames: LandmarkFrame[] = [];

    for (let f = 0; f < totalFrames; f++) {
      helper.update(dt);
      mesh.updateMatrixWorld(true);

      const landmarks: Record<string, [number, number, number]> = {};
      standardBoneMap.forEach((bone, stdName) => {
        bone.getWorldPosition(worldPos);
        const posArr: [number, number, number] = [
          Number(worldPos.x.toFixed(4)),
          Number(worldPos.y.toFixed(4)),
          Number(worldPos.z.toFixed(4)),
        ];
        landmarks[stdName] = posArr;
        landmarks[bone.name] = posArr;
      });

      const expressions: Record<string, number> = {};
      const influences = mesh.morphTargetInfluences;
      if (influences && activeMorphs.length > 0) {
        for (const { index, targetKey } of activeMorphs) {
          const rawWeight = influences[index] ?? 0;
          const clamped = Math.max(0, Math.min(1, rawWeight));
          const prev = expressions[targetKey] ?? 0;
          expressions[targetKey] = Number(Math.min(1, prev + clamped).toFixed(4));
        }
      }

      rawBakedFrames.push({
        time: Number((f * dt).toFixed(3)),
        landmarks,
        ...(activeMorphs.length > 0 ? { expressions } : {}),
      });

      if (onFrameRender) {
        onFrameRender(
          mesh,
          landmarks,
          Math.round((f / totalFrames) * 100),
          activeMorphs.length > 0 ? expressions : undefined
        );
        await new Promise((r) => setTimeout(r, 16));
      }
    }

    helper.remove(mesh);
    initialBonePose.forEach((rest, idx) => {
      const b = mesh.skeleton.bones[idx];
      b.position.copy(rest.pos);
      b.quaternion.copy(rest.quat);
      b.scale.copy(rest.scale);
    });
    if (mesh.morphTargetInfluences) {
      mesh.morphTargetInfluences.fill(0);
    }
    mesh.updateMatrixWorld(true);

    // 自动清除解算开头的静态 A-Pose 空白帧
    const cleanedFrames = cleanRestPoseFrames(rawBakedFrames, restLandmarks);
    const effectiveTotalFrames = cleanedFrames.length;
    const effectiveDuration = effectiveTotalFrames > 0 ? cleanedFrames[effectiveTotalFrames - 1].time : 0;

    return {
      landmarkData: {
        fps,
        totalFrames: effectiveTotalFrames,
        duration: effectiveDuration,
        frames: cleanedFrames,
        restLandmarks,
        availableMorphs,
      },
      mesh,
      animation,
    };
  } finally {
    if (isPmxBlob) URL.revokeObjectURL(pmxUrl.split('#')[0]);
    if (isVmdBlob) URL.revokeObjectURL(vmdUrl.split('#')[0]);
    createdBlobUrls.forEach((u) => URL.revokeObjectURL(u));
  }
}

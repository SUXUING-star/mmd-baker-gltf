// src/utils/cameraBaker.ts
import * as THREE from 'three';
import { MMDAnimationHelper } from 'three/examples/jsm/animation/MMDAnimationHelper.js';
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader.js';
import { CameraAnimationData, RawCameraFrame, solveCameraFrames } from '../solvers/cameraSolver';

export interface CameraBakerRenderCallback {
  (camera: THREE.PerspectiveCamera, progress: number): void;
}

/**
 * 深入解析并控制台打印 VMD 二进制原始数据结构
 */
function logVmdBinaryStructure(buffer: ArrayBuffer) {
  console.group('🔍 === [VMD 二进制数据结构分析] ===');
  try {
    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder('shift-jis');

    console.log(`📦 文件总字节大小: ${buffer.byteLength} bytes`);

    // 1. Header (30 bytes)
    const headerStr = decoder.decode(bytes.subarray(0, 30)).replace(/\0/g, '');
    console.log(`🏷️ VMD Header 标识: "${headerStr}"`);

    // 2. Model Name (20 bytes)
    const modelNameStr = decoder.decode(bytes.subarray(30, 50)).replace(/\0/g, '');
    console.log(`🎭 模型/动作名称: "${modelNameStr}"`);

    let offset = 50;

    // 3. 骨骼帧数量
    if (offset + 4 > buffer.byteLength) {
      console.warn('⚠️ 文件过小，无法读取骨骼帧数量');
      console.groupEnd();
      return;
    }
    const boneCount = view.getUint32(offset, true);
    console.log(`🦴 骨骼关键帧数量 (boneCount): ${boneCount}`);
    offset += 4 + boneCount * 111;

    // 4. 表情帧数量
    if (offset + 4 > buffer.byteLength) {
      console.warn('⚠️ 字节不够，无法读取表情帧数量');
      console.groupEnd();
      return;
    }
    const morphCount = view.getUint32(offset, true);
    console.log(`😊 表情关键帧数量 (morphCount): ${morphCount}`);
    offset += 4 + morphCount * 23;

    // 5. 镜头帧数量
    if (offset + 4 > buffer.byteLength) {
      console.warn('❌ 文件数据已耗尽，末尾未发现镜头帧段落！');
      console.groupEnd();
      return;
    }
    const cameraCount = view.getUint32(offset, true);
    console.log(
      `🎥 镜头关键帧数量 (cameraCount): %c${cameraCount}`,
      'color: #1677ff; font-weight: bold; font-size: 14px;'
    );
    offset += 4;

    if (cameraCount === 0) {
      console.warn(
        '🚨 警告：该 VMD 文件中的镜头关键帧数量 (cameraCount) 为 0！UmaViewer 导出的这个 VMD 文件可能只包含骨骼/表情，或者镜头存放在了其他导出文件中！'
      );
    } else {
      console.log(`📊 打印前 min(10, ${cameraCount}) 个镜头关键帧的物理参数解析表:`);
      const sampleCount = Math.min(10, cameraCount);
      const parsedSampleFrames = [];

      for (let i = 0; i < sampleCount; i++) {
        if (offset + 61 > buffer.byteLength) break;
        const frameNum = view.getUint32(offset, true);
        const distance = view.getFloat32(offset + 4, true);
        const targetX = view.getFloat32(offset + 8, true);
        const targetY = view.getFloat32(offset + 12, true);
        const targetZ = view.getFloat32(offset + 16, true);
        const rotX = view.getFloat32(offset + 20, true); // 弧度
        const rotY = view.getFloat32(offset + 24, true);
        const rotZ = view.getFloat32(offset + 28, true);
        const fov = view.getUint32(offset + 56, true);
        const perspective = view.getUint8(offset + 60);

        parsedSampleFrames.push({
          idx: i,
          frame: frameNum,
          timeSec: (frameNum / 30).toFixed(3) + 's',
          distance: distance.toFixed(2),
          targetPos: `[${targetX.toFixed(2)}, ${targetY.toFixed(2)}, ${targetZ.toFixed(2)}]`,
          rotationDeg: `[${((rotX * 180) / Math.PI).toFixed(1)}°, ${((rotY * 180) / Math.PI).toFixed(1)}°, ${((rotZ * 180) / Math.PI).toFixed(1)}°]`,
          fov,
          perspective: perspective === 0 ? 'Perspective' : 'Orthographic',
        });
        offset += 61;
      }
      console.table(parsedSampleFrames);
    }

    // 6. 检查后续光照等信息
    if (offset + 4 <= buffer.byteLength) {
      const lightCount = view.getUint32(offset, true);
      console.log(`💡 光照关键帧数量 (lightCount): ${lightCount}`);
    }
  } catch (err) {
    console.error('❌ 解析 VMD 二进制结构时发生异常:', err);
  }
  console.groupEnd();
}

export async function bakeCameraVmd(
  vmdInput: File | string,
  onFrameRender?: CameraBakerRenderCallback
): Promise<CameraAnimationData> {
  let vmdUrl: string;
  let isVmdBlob = false;
  let arrayBuffer: ArrayBuffer;

  if (typeof vmdInput === 'string') {
    vmdUrl = vmdInput;
    const res = await fetch(vmdInput);
    arrayBuffer = await res.arrayBuffer();
  } else {
    vmdUrl = URL.createObjectURL(vmdInput) + '#camera.vmd';
    isVmdBlob = true;
    arrayBuffer = await vmdInput.arrayBuffer();
  }

  // 1. 进行控制台二进制结构打印
  console.log('🚀 [cameraBaker] 开始解析上传的 VMD 文件...');
  logVmdBinaryStructure(arrayBuffer);

  const loader = new MMDLoader();
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
  camera.name = 'Camera';

  try {
    const animation = await new Promise<THREE.AnimationClip>((resolve, reject) => {
      loader.loadAnimation(
        vmdUrl,
        camera,
        (a) => resolve(a as THREE.AnimationClip),
        undefined,
        (err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('no keyframes in track') || msg.includes('target.position')) {
            reject(
              new Error(
                '该 .vmd 文件中未检测到镜头（Camera）动画轨道数据！控制台已打印二进制拆解结果，请按 F12 查看。'
              )
            );
          } else {
            reject(new Error(`无法加载 VMD 镜头文件: ${msg}`));
          }
        }
      );
    });

    console.group('🎬 === [Three.js MMDLoader 解析结果] ===');
    console.log('AnimationClip 实例:', animation);
    if (animation && animation.tracks) {
      console.log(`解析出 ${animation.tracks.length} 条 Track 轨道:`);
      animation.tracks.forEach((track, index) => {
        console.log(
          `  [Track ${index}] 名称: "${track.name}", 类型: ${track.ValueTypeName}, 帧数: ${track.times.length}`
        );
        console.log('    times:', track.times);
        console.log('    values:', track.values);
      });
    }
    console.groupEnd();

    if (!animation || !animation.tracks || animation.tracks.length === 0) {
      throw new Error(
        '该 .vmd 文件中未检测到镜头（Camera）动画轨道数据！控制台已打印二进制拆解结果，请按 F12 查看。'
      );
    }

    const helper = new MMDAnimationHelper({ afterglow: 0, resetPhysicsOnLoop: false });
    helper.add(camera, { animation, physics: false, warmup: 0 });

    const fps = 30;
    const dt = 1.0 / fps;
    const totalDuration = animation.duration || 1.0;
    const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));
    const rawFrames: RawCameraFrame[] = [];

    console.log(`⏱️ 开始逐帧采样镜头 Transform (共 ${totalFrames} 帧, 时长 ${totalDuration.toFixed(2)}s)...`);

    for (let f = 0; f < totalFrames; f++) {
      helper.update(dt);
      camera.updateMatrixWorld(true);

      const pos = camera.position;
      const quat = camera.quaternion;

      rawFrames.push({
        time: Number((f * dt).toFixed(3)),
        fov: camera.fov,
        position: [
          Number(pos.x.toFixed(4)),
          Number(pos.y.toFixed(4)),
          Number(pos.z.toFixed(4)),
        ],
        quaternion: [
          Number(quat.x.toFixed(5)),
          Number(quat.y.toFixed(5)),
          Number(quat.z.toFixed(5)),
          Number(quat.w.toFixed(5)),
        ],
      });

      if (onFrameRender) {
        onFrameRender(camera, Math.round((f / totalFrames) * 100));
        await new Promise((r) => setTimeout(r, 16));
      }
    }

    helper.remove(camera);

    console.log('✅ 逐帧采样完成，前 3 帧 Sampling 数据样本:', rawFrames.slice(0, 3));

    const solvedFrames = solveCameraFrames(rawFrames);

    return {
      fps,
      totalFrames,
      duration: totalDuration,
      frames: solvedFrames,
    };
  } catch (err: any) {
    console.error('💥 [cameraBaker] 烘焙过程捕获异常:', err);
    if (err && (err.message?.includes('target.position') || err.message?.includes('no keyframes'))) {
      throw new Error(
        '该 .vmd 文件中未检测到镜头（Camera）动画轨道数据！请按 F12 在控制台查看 VMD 的段落结构与镜头帧数量。'
      );
    }
    throw err;
  } finally {
    if (isVmdBlob) URL.revokeObjectURL(vmdUrl.split('#')[0]);
  }
}

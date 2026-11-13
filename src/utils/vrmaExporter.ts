// src/utils/vrmaExporter.ts
import type { VRMCVRMAnimation } from '@pixiv/types-vrmc-vrm-animation-1.0';
import * as THREE from 'three';
import { HUMANOID_BONES, LandmarkData } from '../types/types';
import {
  buildHumanoidAnimationClipWithTimes,
  buildVrmaExpressionTracks,
  createHumanoidBoneHierarchy,
  exportSceneToBinaryGltf,
} from './humanoidExportBase';
import { DEFAULT_LOOP_OPTIONS, LoopBlendOptions } from './loopBlender';

/** VRMA 元数据配置接口 */
export interface VrmaMetaOptions {
  title?: string;
  authors?: string[];
  copyrightInformation?: string;
  licenseUrl?: string;
}

/**
 * 导出符合 Pixiv 官方 VRMC_vrm_animation 1.0 规范的纯动作文件 (.vrma，含骨骼 + 表情)
 */
export async function exportFull52VRMA(
  json: LandmarkData,
  metaOptions?: VrmaMetaOptions,
  loopOptions: LoopBlendOptions = DEFAULT_LOOP_OPTIONS
): Promise<Blob> {
  const scene = new THREE.Scene();
  const bones = createHumanoidBoneHierarchy();
  scene.add(bones.hips);

  const { clip, times } = buildHumanoidAnimationClipWithTimes(json, 'VRMAnimation', loopOptions);
  const { bindings: exprBindings, tracks: exprTracks } = buildVrmaExpressionTracks(json, times, loopOptions);

  exprBindings.forEach((b) => scene.add(b.node));
  if (exprTracks.length > 0) {
    clip.tracks.push(...exprTracks);
  }

  return exportSceneToBinaryGltf(scene, clip, (exporter) => {
    exporter.register((writer: any) => ({
      name: 'VRMC_vrm_animation',
      afterParse: () => {
        const humanBones: Record<string, { node: number }> = {};
        HUMANOID_BONES.forEach((name) => {
          const bone = bones[name];
          const nodeIndex = bone ? writer.nodeMap.get(bone) : undefined;
          if (nodeIndex !== undefined) {
            humanBones[name] = { node: nodeIndex };
          }
        });

        const presetExpressions: Record<string, { node: number }> = {};
        const customExpressions: Record<string, { node: number }> = {};
        exprBindings.forEach(({ node, expressionName, isPreset }) => {
          const nodeIndex = writer.nodeMap.get(node);
          if (nodeIndex === undefined) return;
          if (isPreset) {
            presetExpressions[expressionName] = { node: nodeIndex };
          } else {
            customExpressions[expressionName] = { node: nodeIndex };
          }
        });

        const hasPreset = Object.keys(presetExpressions).length > 0;
        const hasCustom = Object.keys(customExpressions).length > 0;

        const vrmcAnimation: VRMCVRMAnimation = {
          specVersion: '1.0',
          humanoid: {
            humanBones: humanBones as any,
          },
          ...(hasPreset || hasCustom
            ? {
                expressions: {
                  ...(hasPreset ? { preset: presetExpressions as any } : {}),
                  ...(hasCustom ? { custom: customExpressions } : {}),
                },
              }
            : {}),
        };

        const gltfJson = writer.json;

        gltfJson.asset = gltfJson.asset || {};
        gltfJson.asset.generator = 'MMD-to-Humanoid Solver (Pixiv VRMC_vrm_animation 1.0)';
        gltfJson.asset.extras = {
          title: metaOptions?.title?.trim() || 'Untitled VRMA Motion',
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
  });
}

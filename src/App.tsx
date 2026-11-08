// src/App.tsx
import React, { useRef, useState } from 'react';
import { ExportFormat, useMmdPipeline } from './hooks/useMmdPipeline';
import { useThreeScene } from './hooks/useThreeScene';

const DEFAULT_PMX_PATH = '/ganyu_by_原神/甘雨.pmx';
const DEFAULT_VMD_PATH = '/奶蛙上掌下拳.vmd';

export default function App() {
  const [customPmxFile, setCustomPmxFile] = useState<File | null>(null);
  const [vmdFile, setVmdFile] = useState<File | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const threeBridge = useThreeScene(canvasContainerRef);
  const {
    status,
    progress,
    baking,
    exportFormat,
    setExportFormat,
    downloads,
    runPipeline,
    downloadFile,
  } = useMmdPipeline(threeBridge);

  const activePmxTarget = customPmxFile || DEFAULT_PMX_PATH;

  const handleVmdDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (baking) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.vmd')) {
      setVmdFile(file);
    } else {
      alert('请放入正确的 .vmd 动作文件！');
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '20px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: 12, color: '#222' }}>MMD 动作转 Humanoid / VRMA 动捕解算器</h2>

      {/* 3D 渲染视口 */}
      <div
        ref={canvasContainerRef}
        style={{
          width: '100%',
          height: 460,
          borderRadius: 8,
          border: '1px solid #ddd',
          marginBottom: 14,
          background: '#ffffff',
        }}
      />

      {/* 状态与进度 */}
      <div style={{ padding: '10px 14px', background: '#f0f5ff', borderRadius: 6, marginBottom: 14, fontSize: 14, color: '#1d39c4' }}>
        <strong>解算状态：</strong> {status} {baking && `(${progress}%)`}
      </div>

      {/* 格式选项设置栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: '#fafafa', border: '1px solid #eee', borderRadius: 6, marginBottom: 14 }}>
        <strong style={{ fontSize: 14, color: '#333' }}>导出格式选择：</strong>
        {(['both', 'vrma', 'glb'] as ExportFormat[]).map((fmt) => (
          <label key={fmt} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 14 }}>
            <input
              type="radio"
              name="format"
              value={fmt}
              checked={exportFormat === fmt}
              disabled={baking}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            />
            {fmt === 'both' ? '同时生成 VRMA + GLB' : fmt === 'vrma' ? 'VRM 动画 (.vrma)' : 'Humanoid 模型 (.glb)'}
          </label>
        ))}
      </div>

      {/* 模型与动作投递区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
        <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 14, background: '#fafafa' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>基准绑定模型</span>
          <div style={{ margin: '8px 0', fontSize: 14, fontWeight: 500, color: '#222' }}>
            {customPmxFile ? customPmxFile.name : '默认模型 (甘雨.pmx)'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="pmx-input"
              type="file"
              accept=".pmx"
              style={{ display: 'none' }}
              disabled={baking}
              onChange={(e) => setCustomPmxFile(e.target.files?.[0] || null)}
            />
            <button onClick={() => document.getElementById('pmx-input')?.click()} disabled={baking} style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}>
              {customPmxFile ? '更换其他模型' : '更换自定义模型'}
            </button>
            {customPmxFile && (
              <button onClick={() => setCustomPmxFile(null)} disabled={baking} style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}>
                切回默认模型
              </button>
            )}
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleVmdDrop}
          onClick={() => document.getElementById('vmd-input')?.click()}
          style={{
            border: '2px dashed #1677ff',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            background: vmdFile ? '#f6ffed' : '#fcfcfc',
            cursor: baking ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <input
            id="vmd-input"
            type="file"
            accept=".vmd"
            style={{ display: 'none' }}
            disabled={baking}
            onChange={(e) => setVmdFile(e.target.files?.[0] || null)}
          />
          <h4 style={{ margin: '0 0 6px 0', color: '#1677ff' }}>
            {vmdFile ? `已载入动作: ${vmdFile.name}` : '点击选择 或 拖入待转换的 .vmd 动作文件'}
          </h4>
          <span style={{ fontSize: 12, color: '#888' }}>
            基于当前模型计算 3D 关节点并导出
          </span>
        </div>
      </div>

      {/* 执行按钮 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <button
          disabled={baking || !vmdFile}
          onClick={() => vmdFile && runPipeline(activePmxTarget, vmdFile)}
          style={{
            flex: 2,
            padding: '12px 0',
            background: baking || !vmdFile ? '#ccc' : '#1677ff',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            cursor: baking || !vmdFile ? 'not-allowed' : 'pointer',
          }}
        >
          {baking ? `正在烘焙解算 (${progress}%)...` : '开始转换此动作'}
        </button>

        <button
          disabled={baking}
          onClick={() => runPipeline(DEFAULT_PMX_PATH, DEFAULT_VMD_PATH)}
          style={{
            flex: 1,
            padding: '12px 0',
            background: baking ? '#eee' : '#fff',
            color: baking ? '#999' : '#333',
            fontSize: 14,
            fontWeight: 500,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            cursor: baking ? 'not-allowed' : 'pointer',
          }}
        >
          测试默认动作 (奶蛙上掌下拳)
        </button>
      </div>

      {/* 下载区域 */}
      {downloads && (
        <div style={{ padding: '14px 18px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#389e0d', fontSize: 14, fontWeight: 500 }}>
            ✓ 转换完成，请选择下载格式：
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {downloads.vrma && (
              <button
                onClick={() => downloadFile(downloads.vrma!)}
                style={{
                  padding: '8px 18px',
                  background: '#722ed1',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                下载 VRMA 动作 (.vrma)
              </button>
            )}
            {downloads.glb && (
              <button
                onClick={() => downloadFile(downloads.glb!)}
                style={{
                  padding: '8px 18px',
                  background: '#52c41a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                下载 Humanoid GLB
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

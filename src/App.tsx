// src/App.tsx
import React, { useRef, useState } from 'react';
import { useMmdPipeline } from './hooks/useMmdPipeline';
import { useThreeScene } from './hooks/useThreeScene';

export default function App() {
  const [pmxFile, setPmxFile] = useState<File | null>(null);
  const [vmdFile, setVmdFile] = useState<File | null>(null);

  const demoPmxPath = '/ganyu_by_原神/甘雨.pmx';
  const demoVmdPath = '/奶蛙上掌下拳.vmd';

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const threeBridge = useThreeScene(canvasContainerRef);
  const { status, progress, baking, downloadInfo, runPipeline, triggerDownload } = useMmdPipeline(threeBridge);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'pmx' | 'vmd') => {
    e.preventDefault();
    if (baking) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (type === 'pmx' && file.name.toLowerCase().endsWith('.pmx')) {
      setPmxFile(file);
    } else if (type === 'vmd' && file.name.toLowerCase().endsWith('.vmd')) {
      setVmdFile(file);
    } else {
      alert(`请放入正确的 .${type} 文件！`);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '20px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ marginBottom: 12, color: '#222' }}>MMD 动作转 Humanoid 动捕解算器</h2>

      {/* 3D 渲染画布 */}
      <div
        ref={canvasContainerRef}
        style={{
          width: '100%',
          height: 480,
          borderRadius: 8,
          border: '1px solid #ddd',
          marginBottom: 14,
          background: '#ffffff'
        }}
      />

      {/* 状态栏 */}
      <div style={{ padding: '10px 14px', background: '#f0f5ff', borderRadius: 6, marginBottom: 16, fontSize: 14, color: '#1d39c4' }}>
        <strong>运行状态：</strong> {status} {baking && `(${progress}%)`}
      </div>

      {/* 上传区域 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'pmx')}
          style={{
            border: '2px dashed #1677ff',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            background: pmxFile ? '#f6ffed' : '#fafafa',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('pmx-input')?.click()}
        >
          <input
            id="pmx-input"
            type="file"
            accept=".pmx"
            style={{ display: 'none' }}
            disabled={baking}
            onChange={(e) => setPmxFile(e.target.files?.[0] || null)}
          />
          <h4 style={{ margin: '0 0 6px 0', color: '#1677ff' }}>1. 模型文件 (.pmx)</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
            {pmxFile ? `已选择: ${pmxFile.name}` : '点击选择或拖拽 .pmx 文件至此处'}
          </p>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, 'vmd')}
          style={{
            border: '2px dashed #52c41a',
            borderRadius: 8,
            padding: 16,
            textAlign: 'center',
            background: vmdFile ? '#f6ffed' : '#fafafa',
            cursor: 'pointer'
          }}
          onClick={() => document.getElementById('vmd-input')?.click()}
        >
          <input
            id="vmd-input"
            type="file"
            accept=".vmd"
            style={{ display: 'none' }}
            disabled={baking}
            onChange={(e) => setVmdFile(e.target.files?.[0] || null)}
          />
          <h4 style={{ margin: '0 0 6px 0', color: '#52c41a' }}>2. 动作文件 (.vmd)</h4>
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
            {vmdFile ? `已选择: ${vmdFile.name}` : '点击选择或拖拽 .vmd 文件至此处'}
          </p>
        </div>
      </div>

      {/* 操作按钮区 */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <button
          disabled={baking || !pmxFile || !vmdFile}
          onClick={() => pmxFile && vmdFile && runPipeline(pmxFile, vmdFile)}
          style={{
            flex: 2,
            padding: '12px 0',
            background: baking || !pmxFile || !vmdFile ? '#ccc' : '#1677ff',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            borderRadius: 6,
            cursor: baking || !pmxFile || !vmdFile ? 'not-allowed' : 'pointer'
          }}
        >
          {baking ? `正在解算 (${progress}%)...` : '开始转换上传的文件'}
        </button>

        <button
          disabled={baking}
          onClick={() => runPipeline(demoPmxPath, demoVmdPath)}
          style={{
            flex: 1,
            padding: '12px 0',
            background: baking ? '#eee' : '#fff',
            color: baking ? '#999' : '#555',
            fontSize: 14,
            fontWeight: 500,
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            cursor: baking ? 'not-allowed' : 'pointer'
          }}
        >
          使用内置演示快速测试
        </button>
      </div>

      {/* 手动下载区 */}
      {downloadInfo && (
        <div style={{ padding: '12px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#389e0d', fontSize: 14, fontWeight: 500 }}>
            ✓ 生成成功：{downloadInfo.filename}
          </span>
          <button
            onClick={triggerDownload}
            style={{
              padding: '8px 20px',
              background: '#52c41a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            下载 GLB 文件
          </button>
        </div>
      )}
    </div>
  );
}

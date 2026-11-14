// src/components/DropZoneSection.tsx
import React, { useRef } from 'react';
import { MmdPipeline } from '../hooks/useMmdPipeline';
import { I18nTexts } from '../i18n';

interface DropZoneSectionProps {
  t: I18nTexts;
  pipeline: MmdPipeline;
}

export const DropZoneSection: React.FC<DropZoneSectionProps> = ({ t, pipeline }) => {
  const {
    bakeTargetType,
    setBakeTargetType,
    customPmxFile,
    vmdFile,
    selectPmx,
    selectVmd,
    resetPmx,
    processing,
  } = pipeline;

  const pmxInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const vmdInputRef = useRef<HTMLInputElement>(null);

  const handlePmxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let pmxFile: File | null = null;
    const extraFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.name.toLowerCase().endsWith('.pmx')) {
        if (!pmxFile) pmxFile = f;
        else extraFiles.push(f);
      } else {
        extraFiles.push(f);
      }
    }

    if (pmxFile) {
      selectPmx(pmxFile, extraFiles);
    } else {
      alert(t.pmxAlert);
    }
  };

  const handleVmdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith('.vmd')) {
        selectVmd(file);
      } else {
        alert(t.vmdAlert);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropPmx = (e: React.DragEvent) => {
    e.preventDefault();
    if (processing) return;
    const items = e.dataTransfer.files;
    if (!items || items.length === 0) return;

    let pmxFile: File | null = null;
    const extraFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const f = items[i];
      if (f.name.toLowerCase().endsWith('.pmx')) {
        if (!pmxFile) pmxFile = f;
        else extraFiles.push(f);
      } else {
        extraFiles.push(f);
      }
    }

    if (pmxFile) {
      selectPmx(pmxFile, extraFiles);
    }
  };

  const handleDropVmd = (e: React.DragEvent) => {
    e.preventDefault();
    if (processing) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.vmd')) {
      selectVmd(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 烘焙类型切换：角色动作 vs 镜头动画 */}
      <div style={{ background: '#f3f4f6', padding: 3, borderRadius: 6, display: 'flex' }}>
        <button
          type="button"
          onClick={() => setBakeTargetType('motion')}
          disabled={processing}
          style={{
            flex: 1,
            padding: '7px 0',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            cursor: processing ? 'not-allowed' : 'pointer',
            background: bakeTargetType === 'motion' ? '#ffffff' : 'transparent',
            color: bakeTargetType === 'motion' ? '#1677ff' : '#4b5563',
            boxShadow: bakeTargetType === 'motion' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {t.bakeModeMotion}
        </button>
        <button
          type="button"
          onClick={() => setBakeTargetType('camera')}
          disabled={processing}
          style={{
            flex: 1,
            padding: '7px 0',
            border: 'none',
            borderRadius: 4,
            fontSize: 12,
            fontWeight: 600,
            cursor: processing ? 'not-allowed' : 'pointer',
            background: bakeTargetType === 'camera' ? '#ffffff' : 'transparent',
            color: bakeTargetType === 'camera' ? '#1677ff' : '#4b5563',
            boxShadow: bakeTargetType === 'camera' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {t.bakeModeCamera}
        </button>
      </div>

      {/* PMX 模型选择框（动作与镜头模式均显示，用于指定场景角色） */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, background: '#fafafa' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          {t.baseModel}
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropPmx}
          style={{
            fontSize: 11,
            color: '#6b7280',
            padding: '8px 10px',
            border: '1px dashed #d1d5db',
            borderRadius: 4,
            background: '#ffffff',
            marginBottom: 8,
            textAlign: 'center',
          }}
        >
          {customPmxFile ? customPmxFile.name : t.defaultModelName}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            ref={pmxInputRef}
            type="file"
            accept=".pmx"
            onChange={handlePmxFileChange}
            style={{ display: 'none' }}
          />
          <input
            ref={folderInputRef}
            type="file"
            // @ts-ignore
            webkitdirectory=""
            directory=""
            onChange={handlePmxFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => pmxInputRef.current?.click()}
            disabled={processing}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: 11,
              border: '1px solid #d9d9d9',
              borderRadius: 2,
              cursor: 'pointer',
              background: '#ffffff',
            }}
          >
            {t.customModel}
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={processing}
            style={{
              flex: 1,
              padding: '4px 6px',
              fontSize: 11,
              border: '1px solid #d9d9d9',
              borderRadius: 2,
              cursor: 'pointer',
              background: '#ffffff',
            }}
          >
            {t.selectFolder}
          </button>
          {customPmxFile && (
            <button
              type="button"
              onClick={resetPmx}
              disabled={processing}
              style={{
                padding: '4px 6px',
                fontSize: 11,
                border: '1px solid #ff4d4f',
                color: '#ff4d4f',
                borderRadius: 2,
                cursor: 'pointer',
                background: '#ffffff',
              }}
            >
              {t.resetDefaultModel}
            </button>
          )}
        </div>
      </div>

      {/* VMD 动画拖拽或点击上传区域 */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 10, background: '#fafafa' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
          {bakeTargetType === 'motion' ? 'VMD 角色动作文件' : 'VMD 镜头动作文件'}
        </div>
        <input
          ref={vmdInputRef}
          type="file"
          accept=".vmd"
          onChange={handleVmdFileChange}
          style={{ display: 'none' }}
        />
        <div
          onClick={() => !processing && vmdInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDropVmd}
          style={{
            padding: '16px 12px',
            border: '2px dashed #1677ff',
            borderRadius: 4,
            background: '#ffffff',
            cursor: processing ? 'not-allowed' : 'pointer',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: '#1677ff', marginBottom: 4 }}>
            {vmdFile
              ? t.vmdLoaded(vmdFile.name)
              : bakeTargetType === 'motion'
              ? t.vmdPlaceholder
              : t.cameraVmdPlaceholder}
          </div>
          <div style={{ fontSize: 10, color: '#9ca3af' }}>{t.vmdHint}</div>
        </div>
      </div>
    </div>
  );
};

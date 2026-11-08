// src/components/DropZoneSection.tsx
import React from 'react';

interface DropZoneSectionProps {
  t: any;
  customPmxFile: File | null;
  vmdFile: File | null;
  processing: boolean;
  onSelectPmx: (file: File | null) => void;
  onSelectVmd: (file: File) => void;
  onResetPmx: () => void;
}

export const DropZoneSection: React.FC<DropZoneSectionProps> = ({
  t,
  customPmxFile,
  vmdFile,
  processing,
  onSelectPmx,
  onSelectVmd,
  onResetPmx,
}) => {
  const handleVmdDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (processing) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.vmd')) {
      onSelectVmd(file);
    } else {
      alert(t.vmdAlert);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
      {/* 模型选择 */}
      <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 14, background: '#fafafa' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>{t.baseModel}</span>
        <div style={{ margin: '8px 0', fontSize: 14, fontWeight: 500, color: '#222' }}>
          {customPmxFile ? customPmxFile.name : t.defaultModelName}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            id="pmx-input"
            type="file"
            accept=".pmx"
            style={{ display: 'none' }}
            disabled={processing}
            onChange={(e) => onSelectPmx(e.target.files?.[0] || null)}
          />
          <button
            onClick={() => document.getElementById('pmx-input')?.click()}
            disabled={processing}
            style={{ fontSize: 12, padding: '4px 8px', cursor: processing ? 'not-allowed' : 'pointer' }}
          >
            {customPmxFile ? t.changeModel : t.customModel}
          </button>
          {customPmxFile && (
            <button
              onClick={onResetPmx}
              disabled={processing}
              style={{ fontSize: 12, padding: '4px 8px', cursor: processing ? 'not-allowed' : 'pointer' }}
            >
              {t.resetDefaultModel}
            </button>
          )}
        </div>
      </div>

      {/* VMD 投递与选择 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleVmdDrop}
        onClick={() => document.getElementById('vmd-input')?.click()}
        style={{
          border: '2px dashed #1677ff',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          background: vmdFile ? '#f6ffed' : '#ffffff',
          cursor: processing ? 'not-allowed' : 'pointer',
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
          disabled={processing}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelectVmd(file);
          }}
        />
        <h4 style={{ margin: '0 0 6px 0', color: '#1677ff' }}>
          {vmdFile ? t.vmdLoaded(vmdFile.name) : t.vmdPlaceholder}
        </h4>
        <span style={{ fontSize: 12, color: '#888' }}>{t.vmdHint}</span>
      </div>
    </div>
  );
};

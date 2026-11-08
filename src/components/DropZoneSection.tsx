// src/components/DropZoneSection.tsx
import React, { useRef, useState } from 'react';
import { MmdPipeline } from '../hooks/useMmdPipeline';

interface DropZoneSectionProps {
  t: any;
  pipeline: MmdPipeline;
}

async function findPmxFromEntry(entry: any): Promise<File | null> {
  if (entry.isFile) {
    if (entry.name.toLowerCase().endsWith('.pmx')) {
      return new Promise<File>((resolve) => entry.file((f: File) => resolve(f)));
    }
    return null;
  }
  if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const entries = await new Promise<any[]>((resolve) => {
      dirReader.readEntries((res: any[]) => resolve(res), () => resolve([]));
    });
    for (const child of entries) {
      const pmx = await findPmxFromEntry(child);
      if (pmx) return pmx;
    }
  }
  return null;
}

export const DropZoneSection: React.FC<DropZoneSectionProps> = ({ t, pipeline }) => {
  const { customPmxFile, vmdFile, processing, selectPmx, selectVmd, resetPmx } = pipeline;
  const [isPmxDragging, setIsPmxDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handlePmxDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPmxDragging(false);
    if (processing) return;

    let foundPmx: File | null = null;
    const items = e.dataTransfer.items;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry ? items[i].webkitGetAsEntry() : null;
        if (entry) {
          const file = await findPmxFromEntry(entry);
          if (file) {
            foundPmx = file;
            break;
          }
        }
      }
    }

    if (!foundPmx && e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files);
      const match = files.find((f) => f.name.toLowerCase().endsWith('.pmx'));
      if (match) foundPmx = match;
    }

    if (foundPmx) {
      selectPmx(foundPmx);
    } else {
      alert(t.pmxAlert);
    }
  };

  const handleVmdDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (processing) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.vmd')) {
      selectVmd(file);
    } else {
      alert(t.vmdAlert);
    }
  };

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const pmx = files.find((f) => f.name.toLowerCase().endsWith('.pmx'));
    if (pmx) {
      selectPmx(pmx);
    } else {
      alert(t.pmxAlert);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
      {/* PMX 模型投递区 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!processing) setIsPmxDragging(true);
        }}
        onDragLeave={() => setIsPmxDragging(false)}
        onDrop={handlePmxDrop}
        style={{
          border: isPmxDragging ? '2px dashed #1677ff' : '1px solid #d9d9d9',
          borderRadius: 8,
          padding: 16,
          background: isPmxDragging ? '#f0f5ff' : '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          transition: 'all 0.2s ease',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#666' }}>{t.baseModel}</span>
            {customPmxFile && (
              <span style={{ fontSize: 11, color: '#52c41a', background: '#f6ffed', padding: '1px 6px', borderRadius: 4 }}>
                已自定义
              </span>
            )}
          </div>
          <div style={{ margin: '8px 0', fontSize: 14, fontWeight: 600, color: customPmxFile ? '#1677ff' : '#222', wordBreak: 'break-all' }}>
            {customPmxFile ? customPmxFile.name : t.defaultModelName}
          </div>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 10 }}>{t.pmxDropHint}</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pmx"
          style={{ display: 'none' }}
          disabled={processing}
          onChange={(e) => selectPmx(e.target.files?.[0] || null)}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          style={{ display: 'none' }}
          disabled={processing}
          onChange={handleFolderChange}
        />

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            style={{ fontSize: 12, padding: '5px 10px', borderRadius: 4, cursor: processing ? 'not-allowed' : 'pointer', border: '1px solid #d9d9d9', background: '#fff' }}
          >
            {customPmxFile ? t.changeModel : t.customModel}
          </button>
          <button
            onClick={() => folderInputRef.current?.click()}
            disabled={processing}
            style={{ fontSize: 12, padding: '5px 10px', borderRadius: 4, cursor: processing ? 'not-allowed' : 'pointer', border: '1px solid #d9d9d9', background: '#fff' }}
          >
            {t.selectFolder}
          </button>
          {customPmxFile && (
            <button
              onClick={resetPmx}
              disabled={processing}
              style={{ fontSize: 12, padding: '5px 10px', borderRadius: 4, cursor: processing ? 'not-allowed' : 'pointer', border: '1px solid #ffccc7', background: '#fff2f0', color: '#ff4d4f' }}
            >
              {t.resetDefaultModel}
            </button>
          )}
        </div>
      </div>

      {/* VMD 投递区 */}
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
          transition: 'background 0.2s ease',
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
            if (file) selectVmd(file);
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

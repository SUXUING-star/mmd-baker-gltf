// src/components/DropZoneSection.tsx
import React, { useRef, useState } from 'react';
import { MmdPipeline } from '../hooks/useMmdPipeline';

interface DropZoneSectionProps {
  t: any;
  pipeline: MmdPipeline;
}

async function scanAllEntries(entry: any, fileList: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve) => entry.file((f: File) => resolve(f)));
    fileList.push(file);
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const readAll = async (): Promise<any[]> => {
      let results: any[] = [];
      let batch: any[] = [];
      do {
        batch = await new Promise<any[]>((resolve) => {
          dirReader.readEntries((res: any[]) => resolve(res), () => resolve([]));
        });
        results = results.concat(batch);
      } while (batch.length > 0);
      return results;
    };
    const entries = await readAll();
    for (const child of entries) {
      await scanAllEntries(child, fileList);
    }
  }
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

    const allFiles: File[] = [];
    const items = e.dataTransfer.items;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null;
        if (entry) {
          await scanAllEntries(entry, allFiles);
        }
      }
    }

    if (allFiles.length === 0 && e.dataTransfer.files) {
      allFiles.push(...Array.from(e.dataTransfer.files));
    }

    const foundPmx = allFiles.find((f) => f.name.toLowerCase().endsWith('.pmx'));

    if (foundPmx) {
      selectPmx(foundPmx, allFiles);
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
      selectPmx(pmx, files);
    } else {
      alert(t.pmxAlert);
    }
  };

  return (
    <div className="mmd-dropzone-grid">
      {/* PMX 模型投递区 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!processing) setIsPmxDragging(true);
        }}
        onDragLeave={() => setIsPmxDragging(false)}
        onDrop={handlePmxDrop}
        style={{
          border: isPmxDragging ? '1px dashed #1677ff' : '1px solid #e5e7eb',
          borderRadius: 4,
          padding: 10,
          background: isPmxDragging ? '#f0f5ff' : '#fafafa',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{t.baseModel}</span>
          {customPmxFile && (
            <span style={{ fontSize: 10, color: '#1677ff', background: '#e6f4ff', padding: '1px 5px', borderRadius: 2 }}>
              {t.customBadge}
            </span>
          )}
        </div>

        <div style={{ fontSize: 12, fontWeight: 600, color: customPmxFile ? '#1677ff' : '#111827', wordBreak: 'break-all', lineHeight: 1.3 }}>
          {customPmxFile ? customPmxFile.name : t.defaultModelName}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pmx"
          style={{ display: 'none' }}
          disabled={processing}
          onChange={(e) => {
            const file = e.target.files?.[0] || null;
            selectPmx(file, file ? [file] : []);
          }}
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

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            style={{ flex: 1, fontSize: 11, padding: '4px 6px', borderRadius: 2, cursor: processing ? 'not-allowed' : 'pointer', border: '1px solid #d9d9d9', background: '#ffffff', color: '#374151' }}
          >
            {customPmxFile ? t.changeModel : t.customModel}
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={processing}
            style={{ fontSize: 11, padding: '4px 6px', borderRadius: 2, cursor: processing ? 'not-allowed' : 'pointer', border: '1px solid #d9d9d9', background: '#ffffff', color: '#374151' }}
          >
            {t.selectFolder}
          </button>
          {customPmxFile && (
            <button
              type="button"
              onClick={resetPmx}
              disabled={processing}
              style={{ fontSize: 11, padding: '4px 6px', borderRadius: 2, cursor: processing ? 'not-allowed' : 'pointer', border: '1px solid #d9d9d9', background: '#ffffff', color: '#dc2626' }}
            >
              {t.resetDefaultModel}
            </button>
          )}
        </div>
      </div>

      {/* VMD 动作文件投递区 */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleVmdDrop}
        onClick={() => document.getElementById('vmd-input')?.click()}
        style={{
          border: '1px dashed #1677ff',
          borderRadius: 4,
          padding: 10,
          textAlign: 'center',
          background: vmdFile ? '#f6ffed' : '#ffffff',
          cursor: processing ? 'not-allowed' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 82,
          boxSizing: 'border-box',
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
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1677ff', wordBreak: 'break-all' }}>
          {vmdFile ? t.vmdLoaded(vmdFile.name) : t.vmdPlaceholder}
        </div>
        <span style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{t.vmdHint}</span>
      </div>
    </div>
  );
};

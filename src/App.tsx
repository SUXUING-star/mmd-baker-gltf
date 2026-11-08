// src/App.tsx
import React, { useMemo, useRef, useState } from 'react';
import { ExportFormat, useMmdPipeline } from './hooks/useMmdPipeline';
import { useThreeScene } from './hooks/useThreeScene';
import { detectInitialLanguage, I18N, Lang } from './i18n';

const DEFAULT_PMX_PATH = '/ganyu_by_原神/甘雨.pmx';
const DEFAULT_VMD_PATH = '/奶蛙上掌下拳.vmd';

export default function App() {
  const [lang, setLang] = useState<Lang>(detectInitialLanguage);
  const [customPmxFile, setCustomPmxFile] = useState<File | null>(null);
  const [vmdFile, setVmdFile] = useState<File | null>(null);

  const t = useMemo(() => I18N[lang], [lang]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const threeBridge = useThreeScene(canvasContainerRef);
  // 传入 lang 参数，状态文字便会跟随语言切换实时变化
  const {
    status,
    progress,
    baking,
    exportFormat,
    setExportFormat,
    downloads,
    runPipeline,
    downloadFile,
  } = useMmdPipeline(threeBridge, lang);

  const activePmxTarget = customPmxFile || DEFAULT_PMX_PATH;

  const switchLanguage = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem('app_lang', newLang);
  };

  const handleVmdDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (baking) return;
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.toLowerCase().endsWith('.vmd')) {
      setVmdFile(file);
    } else {
      alert(t.vmdAlert);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '20px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* 头部：标题与右上角语言切换 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, color: '#222', fontSize: 20 }}>{t.title}</h2>
        <div style={{ display: 'flex', gap: 4, background: '#f0f0f0', padding: 3, borderRadius: 6 }}>
          <button
            onClick={() => switchLanguage('zh')}
            style={{
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              background: lang === 'zh' ? '#1677ff' : 'transparent',
              color: lang === 'zh' ? '#fff' : '#666',
              fontWeight: lang === 'zh' ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            中文
          </button>
          <button
            onClick={() => switchLanguage('en')}
            style={{
              border: 'none',
              borderRadius: 4,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              background: lang === 'en' ? '#1677ff' : 'transparent',
              color: lang === 'en' ? '#fff' : '#666',
              fontWeight: lang === 'en' ? 600 : 400,
              transition: 'all 0.2s',
            }}
          >
            English
          </button>
        </div>
      </div>

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
        <strong>{t.statusLabel}</strong> {status} {baking && `(${progress}%)`}
      </div>

      {/* 格式选项设置栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 14px', background: '#fafafa', border: '1px solid #eee', borderRadius: 6, marginBottom: 14 }}>
        <strong style={{ fontSize: 14, color: '#333' }}>{t.exportFormatLabel}</strong>
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
            {fmt === 'both' ? t.formatBoth : fmt === 'vrma' ? t.formatVrma : t.formatGlb}
          </label>
        ))}
      </div>

      {/* 模型与动作投递区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 16 }}>
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
              disabled={baking}
              onChange={(e) => setCustomPmxFile(e.target.files?.[0] || null)}
            />
            <button onClick={() => document.getElementById('pmx-input')?.click()} disabled={baking} style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}>
              {customPmxFile ? t.changeModel : t.customModel}
            </button>
            {customPmxFile && (
              <button onClick={() => setCustomPmxFile(null)} disabled={baking} style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}>
                {t.resetDefaultModel}
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
            {vmdFile ? t.vmdLoaded(vmdFile.name) : t.vmdPlaceholder}
          </h4>
          <span style={{ fontSize: 12, color: '#888' }}>
            {t.vmdHint}
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
          {baking ? t.bakingProgress(progress) : t.startConvert}
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
          {t.testDefaultBtn}
        </button>
      </div>

      {/* 下载区域 */}
      {downloads && (
        <div style={{ padding: '14px 18px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#389e0d', fontSize: 14, fontWeight: 500 }}>
            {t.convertComplete}
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
                {t.downloadVrma}
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
                {t.downloadGlb}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

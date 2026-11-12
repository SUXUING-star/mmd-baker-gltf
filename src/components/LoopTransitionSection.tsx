// src/components/LoopTransitionSection.tsx
import React, { useEffect, useState } from 'react';
import { useLoopOptions } from '../hooks/useLoopOptions';
import { I18nTexts } from '../i18n';
import { LoopBlendMode, LoopBlendOptions } from '../utils/loopBlender';

interface Props {
  t: I18nTexts;
  loopState: ReturnType<typeof useLoopOptions>;
  disabled?: boolean;
  isBaked?: boolean;
  onApply?: (options: LoopBlendOptions) => void;
}

export const LoopTransitionSection: React.FC<Props> = ({
  t,
  loopState,
  disabled,
  isBaked = false,
  onApply,
}) => {
  if (!isBaked) return null;

  const { loopOptions, setLoopOptions } = loopState;

  // 本地草稿状态
  const [draft, setDraft] = useState<LoopBlendOptions>(loopOptions);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    setDraft(loopOptions);
    setIsDirty(false);
  }, [loopOptions]);

  const updateDraft = <K extends keyof LoopBlendOptions>(
    key: K,
    value: LoopBlendOptions[K]
  ) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setIsDirty(true);
  };

  const handleConfirm = () => {
    setLoopOptions(draft);
    setIsDirty(false);
    if (onApply) {
      onApply(draft);
    }
  };

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: 16,
      }}
    >
      {/* 标题栏与总开关 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: draft.enabled ? 12 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🔁</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
            {t.loopSectionTitle}
          </span>
          {isDirty && (
            <span
              style={{
                fontSize: 11,
                color: '#d97706',
                background: '#fef3c7',
                padding: '2px 6px',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              未应用更改
            </span>
          )}
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <input
            type="checkbox"
            checked={draft.enabled}
            disabled={disabled}
            onChange={(e) => updateDraft('enabled', e.target.checked)}
          />
          {t.enableLoopBlend}
        </label>
      </div>

      {/* 详细参数面板 */}
      {draft.enabled && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            paddingTop: 10,
            borderTop: '1px dashed #cbd5e1',
          }}
        >
          {/* 模式选择 */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>
              {t.loopModeLabel}
            </label>
            <select
              value={draft.mode}
              disabled={disabled}
              onChange={(e) => updateDraft('mode', e.target.value as LoopBlendMode)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                fontSize: 12,
                background: '#fff',
                color: '#1e293b',
              }}
            >
              <option value="idle">{t.loopModeIdle}</option>
              <option value="tail">{t.loopModeTail}</option>
              <option value="cyclic">{t.loopModeCyclic}</option>
            </select>
          </div>

          {/* 过渡时长滑块 */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#475569', marginBottom: 4 }}>
              {t.loopDurationLabel}: {draft.blendDuration.toFixed(2)}s
            </label>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.05}
              value={draft.blendDuration}
              disabled={disabled || draft.mode === 'cyclic'}
              onChange={(e) => updateDraft('blendDuration', parseFloat(e.target.value))}
              style={{ width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}
            />
          </div>

          {/* 选项与生效确认按钮 */}
          <div
            style={{
              gridColumn: 'span 2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 6,
              paddingTop: 8,
              borderTop: '1px dashed #e2e8f0',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={draft.blendHipsXZ}
                disabled={disabled}
                onChange={(e) => updateDraft('blendHipsXZ', e.target.checked)}
              />
              {t.blendHipsXZLabel}
            </label>

            {/* 生效确认按钮 */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={disabled}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                fontWeight: 700,
                color: '#ffffff',
                background: isDirty ? '#2563eb' : '#059669',
                border: 'none',
                borderRadius: 4,
                cursor: disabled ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                transition: 'all 0.2s ease',
              }}
            >
              {isDirty ? '⚡ 生效确认并刷新 3D 渲染' : '✓ 已应用于 3D 渲染'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

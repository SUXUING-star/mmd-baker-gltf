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
  const { loopOptions, setLoopOptions } = loopState;

  const [draft, setDraft] = useState<LoopBlendOptions>(loopOptions);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    setDraft(loopOptions);
    setIsDirty(false);
  }, [loopOptions]);

  if (!isBaked) return null;

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
        background: '#fafafa',
        border: '1px solid #e5e7eb',
        borderRadius: 4,
        padding: 12,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: draft.enabled ? 10 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>
            {t.loopSectionTitle}
          </span>
          {isDirty && (
            <span style={{ fontSize: 10, color: '#1677ff', background: '#e6f4ff', padding: '1px 5px', borderRadius: 2 }}>
              {t.loopDirtyBadge}
            </span>
          )}
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12 }}>
          <input
            type="checkbox"
            checked={draft.enabled}
            disabled={disabled}
            onChange={(e) => updateDraft('enabled', e.target.checked)}
          />
          {t.enableLoopBlend}
        </label>
      </div>

      {draft.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8, borderTop: '1px dashed #d9d9d9' }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#4b5563', marginBottom: 3 }}>
              {t.loopModeLabel}
            </label>
            <select
              value={draft.mode}
              disabled={disabled}
              onChange={(e) => updateDraft('mode', e.target.value as LoopBlendMode)}
              style={{ width: '100%', padding: '4px 6px', borderRadius: 2, border: '1px solid #d9d9d9', fontSize: 12, background: '#fff' }}
            >
              <option value="mirror">{t.loopModeMirror}</option>
              <option value="cyclic">{t.loopModeCyclic}</option>
              <option value="idle">{t.loopModeIdle}</option>
              <option value="tail">{t.loopModeTail}</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#4b5563', marginBottom: 3 }}>
              {t.loopDurationLabel}: {draft.blendDuration.toFixed(2)}s
            </label>
            <input
              type="range"
              min={0.2}
              max={2.0}
              step={0.05}
              value={draft.blendDuration}
              disabled={disabled}
              onChange={(e) => updateDraft('blendDuration', parseFloat(e.target.value))}
              style={{ width: '100%', cursor: disabled ? 'not-allowed' : 'pointer' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#374151', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={draft.blendHipsXZ}
              disabled={disabled}
              onChange={(e) => updateDraft('blendHipsXZ', e.target.checked)}
            />
            {t.blendHipsXZLabel}
          </label>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={disabled}
            style={{
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#ffffff',
              background: '#1677ff',
              border: 'none',
              borderRadius: 2,
              cursor: disabled ? 'not-allowed' : 'pointer',
              marginTop: 2,
            }}
          >
            {isDirty ? t.loopApplyBtn : t.loopAppliedBtn}
          </button>
        </div>
      )}
    </div>
  );
};

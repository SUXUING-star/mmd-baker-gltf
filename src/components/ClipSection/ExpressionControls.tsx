import React, { useMemo, useState } from 'react';
import { ExpressionTracksController } from '../../hooks/useExpressionTracks';
import { TimelineController } from '../../hooks/useMmdPipeline';
import { I18nTexts } from '../../i18n';
import { VRM_PRESET_EXPRESSIONS } from '../../types/expressionMapping';
import { ModelMorphInfo } from '../../types/types';
import { evaluateExpressionTrackAtFrame, ExpressionInterpolation } from '../../utils/expressionTrackEvaluator';
import { VmdExpressionTrackSummary } from '../../utils/vmdExpressionAnalyzer';

interface ExpressionControlsProps {
  t: I18nTexts;
  timeline: TimelineController;
  exprState: ExpressionTracksController;
  availableMorphs: ModelMorphInfo[];
  vmdExpressionTracks: VmdExpressionTrackSummary[];
  disabled: boolean;
}

export const ExpressionControls: React.FC<ExpressionControlsProps> = ({
  t,
  timeline,
  exprState,
  availableMorphs,
  vmdExpressionTracks,
  disabled,
}) => {
  const [customInput, setCustomInput] = useState('');
  const { currentFrame, startFrame, endFrame, seek } = timeline;
  const { activeName, activeTrack, tracks, customTrackNames } = exprState;

  const { presetRawNamesMap, modelCustomNames } = useMemo(() => {
    const presetMap = new Map<string, string[]>();
    const customSet = new Set<string>();
    for (const m of availableMorphs) {
      if (m.isPreset) {
        const list = presetMap.get(m.targetKey) || [];
        if (!list.includes(m.rawName)) list.push(m.rawName);
        presetMap.set(m.targetKey, list);
      } else {
        customSet.add(m.targetKey);
      }
    }
    return { presetRawNamesMap: presetMap, modelCustomNames: Array.from(customSet) };
  }, [availableMorphs]);

  const vmdActiveSet = useMemo(() => new Set(vmdExpressionTracks.map((tr) => tr.name)), [vmdExpressionTracks]);

  const trackCountMap = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((tr) => map.set(tr.name, tr.keyframes.length));
    return map;
  }, [tracks]);

  const currentValue = useMemo(() => evaluateExpressionTrackAtFrame(activeTrack, currentFrame), [activeTrack, currentFrame]);
  const hasKf = useMemo(() => activeTrack.keyframes.some((k) => k.frame === currentFrame), [activeTrack, currentFrame]);
  const extraUserTracks = useMemo(() => customTrackNames.filter((n) => !modelCustomNames.includes(n)), [customTrackNames, modelCustomNames]);

  const handleAddCustom = () => {
    if (!customInput.trim()) return;
    exprState.addCustomTrack(customInput);
    setCustomInput('');
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
      {/* 当前帧权重滑块与插值操作 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#ffffff', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 320px' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', minWidth: 92 }}>
            {t.exprFrameValueLabel(currentFrame)}
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            disabled={disabled}
            value={currentValue}
            onChange={(e) => exprState.upsertKeyframe(activeName, currentFrame, Number(e.target.value))}
            style={{ flex: 1, cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#1677ff', minWidth: 38 }}>
            {currentValue.toFixed(2)}
          </span>
          {[0, 0.5, 1].map((v) => (
            <button
              key={v}
              type="button"
              disabled={disabled}
              onClick={() => exprState.upsertKeyframe(activeName, currentFrame, v)}
              style={{ padding: '3px 7px', fontSize: 11, borderRadius: 4, border: '1px solid #d1d5db', background: '#f9fafb', cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
              {v}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 12, color: '#4b5563' }}>{t.exprInterpLabel}</label>
          <select
            disabled={disabled}
            value={activeTrack.interpolation}
            onChange={(e) => exprState.setInterpolation(activeName, e.target.value as ExpressionInterpolation)}
            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db' }}
          >
            <option value="smooth">{t.exprInterpSmooth}</option>
            <option value="linear">{t.exprInterpLinear}</option>
            <option value="step">{t.exprInterpStep}</option>
          </select>
          <button
            type="button"
            disabled={disabled || !hasKf}
            onClick={() => exprState.removeKeyframe(activeName, currentFrame)}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #fca5a5', background: hasKf ? '#fef2f2' : '#f9fafb', color: hasKf ? '#dc2626' : '#9ca3af', cursor: disabled || !hasKf ? 'not-allowed' : 'pointer' }}
          >
            {t.exprDeleteKfBtn}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => exprState.applyConstantRange(activeName, startFrame, endFrame, currentValue || 1)}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', background: '#ffffff', cursor: disabled ? 'not-allowed' : 'pointer' }}
          >
            {t.exprFillRangeBtn}
          </button>
          <button
            type="button"
            disabled={disabled || activeTrack.keyframes.length === 0}
            onClick={() => exprState.clearTrack(activeName)}
            style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', background: '#ffffff', cursor: disabled || activeTrack.keyframes.length === 0 ? 'not-allowed' : 'pointer' }}
          >
            {t.exprClearTrackBtn}
          </button>
        </div>
      </div>

      {/* VRM 预设表情 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {VRM_PRESET_EXPRESSIONS.map((name) => {
          const kfCount = trackCountMap.get(name) || 0;
          const hasVmd = vmdActiveSet.has(name);
          const isSelected = activeName === name;
          const rawMatches = presetRawNamesMap.get(name);
          const exists = !!rawMatches?.length;
          const label = t.exprPresetLabels[name] || name;

          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              onClick={() => exprState.setActiveName(name)}
              title={exists ? `${label} -> ${rawMatches.join(', ')}` : label}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                fontSize: 12,
                cursor: disabled ? 'not-allowed' : 'pointer',
                border: isSelected ? '1px solid #1677ff' : kfCount > 0 ? '1px solid #34d399' : hasVmd ? '1px solid #38bdf8' : '1px solid #d1d5db',
                background: isSelected ? '#1677ff' : kfCount > 0 ? '#ecfdf5' : exists ? '#ffffff' : '#f3f4f6',
                color: isSelected ? '#ffffff' : kfCount > 0 ? '#065f46' : exists ? '#111827' : '#9ca3af',
                fontWeight: isSelected || kfCount > 0 || hasVmd ? 600 : 400,
              }}
            >
              {hasVmd && !isSelected ? '● ' : ''}
              {label}
              {exists ? ` (${rawMatches[0]})` : ''}
              {kfCount > 0 ? ` [${kfCount}]` : ''}
            </button>
          );
        })}
      </div>

      {/* 模型专属自定义 Morph */}
      {(modelCustomNames.length > 0 || extraUserTracks.length > 0) && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 96, overflowY: 'auto', padding: 8, background: '#ffffff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          {[...modelCustomNames, ...extraUserTracks].map((name) => {
            const kfCount = trackCountMap.get(name) || 0;
            const hasVmd = vmdActiveSet.has(name);
            const isSelected = activeName === name;
            return (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => exprState.setActiveName(name)}
                style={{
                  padding: '3px 9px',
                  borderRadius: 999,
                  fontSize: 11,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  border: isSelected ? '1px solid #1677ff' : kfCount > 0 ? '1px solid #34d399' : hasVmd ? '1px solid #38bdf8' : '1px solid #d1d5db',
                  background: isSelected ? '#1677ff' : kfCount > 0 ? '#ecfdf5' : '#f9fafb',
                  color: isSelected ? '#ffffff' : kfCount > 0 ? '#065f46' : '#374151',
                  fontWeight: isSelected || kfCount > 0 || hasVmd ? 600 : 400,
                }}
              >
                {hasVmd && !isSelected ? '● ' : ''}
                {name}
                {kfCount > 0 ? ` [${kfCount}]` : ''}
              </button>
            );
          })}
        </div>
      )}

      {/* 手动追加自定义表情名 & 当前轨道关键帧胶囊 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 8 }}>
        <input
          type="text"
          value={customInput}
          disabled={disabled}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          placeholder={t.exprCustomPlaceholder}
          style={{ width: 150, padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db' }}
        />
        <button
          type="button"
          disabled={disabled || !customInput.trim()}
          onClick={handleAddCustom}
          style={{ padding: '4px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #d1d5db', background: '#ffffff', cursor: disabled || !customInput.trim() ? 'not-allowed' : 'pointer' }}
        >
          +
        </button>

        {activeTrack.keyframes.map((kf) => (
          <span
            key={kf.frame}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 7px',
              borderRadius: 6,
              fontSize: 11,
              background: kf.frame === currentFrame ? '#dbeafe' : '#ffffff',
              border: kf.frame === currentFrame ? '1px solid #3b82f6' : '1px solid #e5e7eb',
            }}
          >
            <button type="button" onClick={() => seek(kf.frame)} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 11, cursor: 'pointer', color: '#1f2937', fontWeight: 600 }}>
              F{kf.frame}: {kf.value.toFixed(2)}
            </button>
            <button type="button" disabled={disabled} onClick={() => exprState.removeKeyframe(activeName, kf.frame)} style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', color: '#ef4444' }}>
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

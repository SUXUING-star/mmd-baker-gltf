// src/components/ExpressionTrackSection.tsx
import React, { useMemo, useState } from 'react';
import { ExpressionTracksController } from '../hooks/useExpressionTracks';
import { TimelineController } from '../hooks/useMmdPipeline';
import { I18nTexts } from '../i18n';
import { VRM_PRESET_EXPRESSIONS } from '../types/expressionMapping';
import { ModelMorphInfo } from '../types/types';
import { evaluateExpressionTrackAtFrame, ExpressionInterpolation } from '../utils/expressionTrackEvaluator';

interface ExpressionTrackSectionProps {
  t: I18nTexts;
  exprState: ExpressionTracksController;
  timeline: TimelineController;
  availableMorphs: ModelMorphInfo[];
  isBaked: boolean;
  disabled: boolean;
}

const SVG_WIDTH = 860;
const SVG_HEIGHT = 110;
const PAD_X = 12;
const PAD_Y = 12;

export const ExpressionTrackSection: React.FC<ExpressionTrackSectionProps> = ({
  t,
  exprState,
  timeline,
  availableMorphs,
  isBaked,
  disabled,
}) => {
  const [customInput, setCustomInput] = useState('');

  const { maxFrames, currentFrame, startFrame, endFrame, fps } = timeline;
  const { activeName, activeTrack, tracks, customTrackNames } = exprState;

  const totalSpan = Math.max(1, maxFrames - 1);
  const frameToX = (f: number) => PAD_X + (f / totalSpan) * (SVG_WIDTH - PAD_X * 2);
  const valToY = (v: number) => PAD_Y + (1 - v) * (SVG_HEIGHT - PAD_Y * 2);

  // 统计模型自身哪些 VRM 预设存在，以及有哪些模型自带自定义 Morph
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

    return {
      presetRawNamesMap: presetMap,
      modelCustomNames: Array.from(customSet),
    };
  }, [availableMorphs]);

  const trackCountMap = useMemo(() => {
    const map = new Map<string, number>();
    tracks.forEach((tr) => map.set(tr.name, tr.keyframes.length));
    return map;
  }, [tracks]);

  const currentValue = useMemo(
    () => evaluateExpressionTrackAtFrame(activeTrack, currentFrame),
    [activeTrack, currentFrame]
  );

  const hasKeyframeAtCurrent = useMemo(
    () => activeTrack.keyframes.some((k) => k.frame === currentFrame),
    [activeTrack, currentFrame]
  );

  const curvePath = useMemo(() => {
    if (!isBaked || maxFrames <= 0 || activeTrack.keyframes.length === 0) return '';
    const sampleStep = Math.max(1, Math.floor(maxFrames / 220));
    const points: string[] = [];
    for (let f = 0; f < maxFrames; f += sampleStep) {
      const v = evaluateExpressionTrackAtFrame(activeTrack, f);
      points.push(`${f === 0 ? 'M' : 'L'} ${frameToX(f).toFixed(1)} ${valToY(v).toFixed(1)}`);
    }
    const lastF = maxFrames - 1;
    const lastV = evaluateExpressionTrackAtFrame(activeTrack, lastF);
    points.push(`L ${frameToX(lastF).toFixed(1)} ${valToY(lastV).toFixed(1)}`);
    return points.join(' ');
  }, [isBaked, maxFrames, activeTrack]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isBaked || disabled || maxFrames <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const ratio = Math.max(0, Math.min(1, (relX - PAD_X) / (SVG_WIDTH - PAD_X * 2)));
    const targetFrame = Math.round(ratio * totalSpan);
    timeline.seek(targetFrame);
  };

  const handleAddCustom = () => {
    if (!customInput.trim()) return;
    exprState.addCustomTrack(customInput);
    setCustomInput('');
  };

  const extraUserTracks = useMemo(
    () => customTrackNames.filter((n) => !modelCustomNames.includes(n)),
    [customTrackNames, modelCustomNames]
  );

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 10,
        border: '1px solid #e5e7eb',
        background: '#fafafa',
        opacity: isBaked ? 1 : 0.65,
      }}
    >
      {/* 标题与全局快捷操作 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{t.exprSectionTitle}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{t.exprSectionDesc}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={!isBaked || disabled}
            onClick={() => exprState.applyAutoBlink(startFrame, endFrame, fps)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #93c5fd',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: 12,
              fontWeight: 600,
              cursor: !isBaked || disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {t.exprAutoBlinkBtn}
          </button>
          <button
            type="button"
            disabled={!isBaked || disabled || tracks.length === 0}
            onClick={exprState.clearAllTracks}
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 12,
              cursor: !isBaked || disabled || tracks.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {t.exprClearAllBtn}
          </button>
        </div>
      </div>

      {!isBaked ? (
        <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>{t.exprNeedBakeHint}</div>
      ) : (
        <>
          {/* 模型自带 Morph 检测摘要 */}
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              fontSize: 12,
              color: '#0369a1',
            }}
          >
            {availableMorphs.length > 0
              ? t.exprModelMorphSummary(availableMorphs.length, presetRawNamesMap.size, modelCustomNames.length)
              : t.exprModelNoMorphHint}
          </div>

          {/* 1. VRM 1.0 预设表情轨（附带当前模型原始 Morph 名） */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {VRM_PRESET_EXPRESSIONS.map((name) => {
              const kfCount = trackCountMap.get(name) || 0;
              const isSelected = activeName === name;
              const rawMatches = presetRawNamesMap.get(name);
              const existsOnModel = !!rawMatches && rawMatches.length > 0;
              const label = t.exprPresetLabels[name] || name;
              const liveVal = exprState.getValueAtFrame(name, currentFrame);

              return (
                <button
                  key={name}
                  type="button"
                  disabled={disabled}
                  onClick={() => exprState.setActiveName(name)}
                  title={existsOnModel ? `${label} -> ${rawMatches.join(', ')}` : label}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    border: isSelected ? '1px solid #1677ff' : kfCount > 0 ? '1px solid #34d399' : '1px solid #d1d5db',
                    background: isSelected ? '#1677ff' : kfCount > 0 ? '#ecfdf5' : existsOnModel ? '#ffffff' : '#f3f4f6',
                    color: isSelected ? '#ffffff' : kfCount > 0 ? '#065f46' : existsOnModel ? '#111827' : '#9ca3af',
                    fontWeight: isSelected || kfCount > 0 ? 600 : 400,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span>
                    {label}
                    {existsOnModel ? ` (${rawMatches[0]})` : ''}
                  </span>
                  {kfCount > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 5px',
                        borderRadius: 999,
                        background: isSelected ? 'rgba(255,255,255,0.25)' : '#d1fae5',
                      }}
                    >
                      {kfCount} · {liveVal.toFixed(2)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 2. 模型自带自定义表情清单（可滚动折叠，点击即选） */}
          {(modelCustomNames.length > 0 || extraUserTracks.length > 0) && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                {t.exprModelCustomLabel}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 6,
                  maxHeight: 112,
                  overflowY: 'auto',
                  padding: 8,
                  background: '#ffffff',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                }}
              >
                {[...modelCustomNames, ...extraUserTracks].map((name) => {
                  const kfCount = trackCountMap.get(name) || 0;
                  const isSelected = activeName === name;
                  const liveVal = exprState.getValueAtFrame(name, currentFrame);

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
                        border: isSelected ? '1px solid #1677ff' : kfCount > 0 ? '1px solid #34d399' : '1px solid #d1d5db',
                        background: isSelected ? '#1677ff' : kfCount > 0 ? '#ecfdf5' : '#f9fafb',
                        color: isSelected ? '#ffffff' : kfCount > 0 ? '#065f46' : '#374151',
                        fontWeight: isSelected || kfCount > 0 ? 600 : 400,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span>{name}</span>
                      {kfCount > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '0 4px',
                            borderRadius: 999,
                            background: isSelected ? 'rgba(255,255,255,0.25)' : '#d1fae5',
                          }}
                        >
                          {kfCount} · {liveVal.toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 手动追加额外自定义表情名 */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 8 }}>
            <input
              type="text"
              value={customInput}
              disabled={disabled}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              placeholder={t.exprCustomPlaceholder}
              style={{
                width: 160,
                padding: '4px 8px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #d1d5db',
              }}
            />
            <button
              type="button"
              disabled={disabled || !customInput.trim()}
              onClick={handleAddCustom}
              style={{
                padding: '4px 10px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #d1d5db',
                background: '#ffffff',
                cursor: disabled || !customInput.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              +
            </button>
          </div>

          {/* 3. 可视化关键帧曲线面板 */}
          <div
            style={{
              marginTop: 12,
              background: '#ffffff',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              padding: '8px 8px 4px',
            }}
          >
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              onClick={handleSvgClick}
              style={{ width: '100%', height: 110, display: 'block', cursor: 'crosshair', userSelect: 'none' }}
            >
              <rect
                x={frameToX(startFrame)}
                y={PAD_Y}
                width={Math.max(2, frameToX(endFrame) - frameToX(startFrame))}
                height={SVG_HEIGHT - PAD_Y * 2}
                fill="#eff6ff"
              />

              {[0, 0.5, 1].map((v) => (
                <line
                  key={v}
                  x1={PAD_X}
                  y1={valToY(v)}
                  x2={SVG_WIDTH - PAD_X}
                  y2={valToY(v)}
                  stroke={v === 0.5 ? '#f3f4f6' : '#e5e7eb'}
                  strokeDasharray={v === 0.5 ? '4 4' : undefined}
                />
              ))}

              {curvePath && <path d={curvePath} fill="none" stroke="#1677ff" strokeWidth={2.2} />}

              {activeTrack.keyframes.map((kf) => {
                const isAtPlayhead = kf.frame === currentFrame;
                return (
                  <circle
                    key={kf.frame}
                    cx={frameToX(kf.frame)}
                    cy={valToY(kf.value)}
                    r={isAtPlayhead ? 6 : 4.5}
                    fill={isAtPlayhead ? '#ef4444' : '#ffffff'}
                    stroke={isAtPlayhead ? '#991b1b' : '#1677ff'}
                    strokeWidth={2}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      timeline.seek(kf.frame);
                    }}
                  />
                );
              })}

              <line
                x1={frameToX(currentFrame)}
                y1={4}
                x2={frameToX(currentFrame)}
                y2={SVG_HEIGHT - 4}
                stroke="#ef4444"
                strokeWidth={1.6}
              />
            </svg>
          </div>

          {/* 4. 当前帧调节 & 插值方式 */}
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: '#ffffff',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}
          >
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

              {[0, 0.5, 1].map((presetVal) => (
                <button
                  key={presetVal}
                  type="button"
                  disabled={disabled}
                  onClick={() => exprState.upsertKeyframe(activeName, currentFrame, presetVal)}
                  style={{
                    padding: '3px 7px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: '1px solid #d1d5db',
                    background: '#f9fafb',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {presetVal}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, color: '#4b5563' }}>{t.exprInterpLabel}</label>
              <select
                disabled={disabled}
                value={activeTrack.interpolation}
                onChange={(e) =>
                  exprState.setInterpolation(activeName, e.target.value as ExpressionInterpolation)
                }
                style={{
                  padding: '4px 8px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                }}
              >
                <option value="smooth">{t.exprInterpSmooth}</option>
                <option value="linear">{t.exprInterpLinear}</option>
                <option value="step">{t.exprInterpStep}</option>
              </select>

              <button
                type="button"
                disabled={disabled || !hasKeyframeAtCurrent}
                onClick={() => exprState.removeKeyframe(activeName, currentFrame)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #fca5a5',
                  background: hasKeyframeAtCurrent ? '#fef2f2' : '#f9fafb',
                  color: hasKeyframeAtCurrent ? '#dc2626' : '#9ca3af',
                  cursor: disabled || !hasKeyframeAtCurrent ? 'not-allowed' : 'pointer',
                }}
              >
                {t.exprDeleteKfBtn}
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => exprState.applyConstantRange(activeName, startFrame, endFrame, currentValue || 1)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {t.exprFillRangeBtn}
              </button>

              <button
                type="button"
                disabled={disabled || activeTrack.keyframes.length === 0}
                onClick={() => exprState.clearTrack(activeName)}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  cursor: disabled || activeTrack.keyframes.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {t.exprClearTrackBtn}
              </button>
            </div>
          </div>

          {/* 5. 当前轨道关键帧胶囊列表 */}
          {activeTrack.keyframes.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {activeTrack.keyframes.map((kf) => (
                <span
                  key={kf.frame}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontSize: 11,
                    background: kf.frame === currentFrame ? '#dbeafe' : '#ffffff',
                    border: kf.frame === currentFrame ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => timeline.seek(kf.frame)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      fontSize: 11,
                      cursor: 'pointer',
                      color: '#1f2937',
                      fontWeight: 600,
                    }}
                  >
                    F{kf.frame}: {kf.value.toFixed(2)}
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => exprState.removeKeyframe(activeName, kf.frame)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      color: '#ef4444',
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

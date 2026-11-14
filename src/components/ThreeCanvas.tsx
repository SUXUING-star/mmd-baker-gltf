// src/components/ThreeCanvas.tsx
import React from 'react';
import { ViewMode } from '../hooks/useThreeScene';
import { I18nTexts } from '../i18n';

interface ThreeCanvasProps {
  t: I18nTexts;
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewMode?: ViewMode;
  onToggleViewMode?: (mode: ViewMode) => void;
  isCameraMode?: boolean;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  t,
  containerRef,
  viewMode = 'camera',
  onToggleViewMode,
  isCameraMode = false,
}) => {
  return (
    <div style={{ position: 'relative', width: '100%', height: 380, borderRadius: 6, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {isCameraMode && onToggleViewMode && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            padding: 3,
            borderRadius: 6,
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          }}
        >
          <button
            type="button"
            onClick={() => onToggleViewMode('camera')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: viewMode === 'camera' ? '#1677ff' : 'transparent',
              color: viewMode === 'camera' ? '#ffffff' : '#374151',
              transition: 'all 0.2s',
            }}
          >
            {t.viewModeCamera}
          </button>
          <button
            type="button"
            onClick={() => onToggleViewMode('orbit')}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 600,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: viewMode === 'orbit' ? '#1677ff' : 'transparent',
              color: viewMode === 'orbit' ? '#ffffff' : '#374151',
              transition: 'all 0.2s',
            }}
          >
            {t.viewModeOrbit}
          </button>
        </div>
      )}
    </div>
  );
};

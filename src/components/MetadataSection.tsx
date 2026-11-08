// src/components/MetadataSection.tsx
import React from 'react';
import { VrmaMetadataState } from '../hooks/useVrmaMetadata';

interface MetadataSectionProps {
  t: any;
  meta: VrmaMetadataState;
  disabled?: boolean;
}

export const MetadataSection: React.FC<MetadataSectionProps> = ({ t, meta, disabled = false }) => {
  const { metadata, updateField } = meta;

  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 14, background: '#fafafa', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>{t.metadataTitle}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
            {t.metaTitle}
          </label>
          <input
            type="text"
            value={metadata.title}
            placeholder={t.metaTitlePlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('title', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
            {t.metaAuthors}
          </label>
          <input
            type="text"
            value={metadata.authors}
            placeholder={t.metaAuthorsPlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('authors', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
            {t.metaCopyright}
          </label>
          <input
            type="text"
            value={metadata.copyrightInformation}
            placeholder={t.metaCopyrightPlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('copyrightInformation', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
            {t.metaLicense}
          </label>
          <input
            type="text"
            value={metadata.licenseUrl}
            placeholder={t.metaLicensePlaceholder}
            disabled={disabled}
            onChange={(e) => updateField('licenseUrl', e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12, border: '1px solid #d9d9d9', borderRadius: 4 }}
          />
        </div>
      </div>
    </div>
  );
};

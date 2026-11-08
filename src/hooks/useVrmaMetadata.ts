// src/hooks/useVrmaMetadata.ts
import { useCallback, useEffect, useState } from 'react';
import type { VrmaMetaOptions } from '../utils/vrmaExporter';

export interface VrmaMetadataForm {
  title: string;
  authors: string;
  copyrightInformation: string;
  licenseUrl: string;
}

export interface VrmaMetadataState {
  metadata: VrmaMetadataForm;
  updateField: <K extends keyof VrmaMetadataForm>(field: K, value: VrmaMetadataForm[K]) => void;
  getVrmaMetaOptions: () => VrmaMetaOptions;
}

const LOCALSTORAGE_META_KEY = 'vrma_metadata_settings';

const DEFAULT_METADATA: VrmaMetadataForm = {
  title: 'Converted VRMA Motion',
  authors: '',
  copyrightInformation: '',
  licenseUrl: 'https://vrm.dev/licenses/1.0/',
};

export function useVrmaMetadata(): VrmaMetadataState {
  const [metadata, setMetadata] = useState<VrmaMetadataForm>(() => {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_META_KEY);
      if (saved) return { ...DEFAULT_METADATA, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to parse metadata from localStorage', e);
    }
    return DEFAULT_METADATA;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCALSTORAGE_META_KEY, JSON.stringify(metadata));
    } catch (e) {
      console.warn('Failed to save metadata to localStorage', e);
    }
  }, [metadata]);

  const updateField = useCallback(
    <K extends keyof VrmaMetadataForm>(field: K, value: VrmaMetadataForm[K]) => {
      setMetadata((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const getVrmaMetaOptions = useCallback((): VrmaMetaOptions => {
    return {
      title: metadata.title.trim() || undefined,
      authors: metadata.authors
        ? metadata.authors
            .split(/[,，\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      copyrightInformation: metadata.copyrightInformation.trim() || undefined,
      licenseUrl: metadata.licenseUrl.trim() || undefined,
    };
  }, [metadata]);

  return {
    metadata,
    updateField,
    getVrmaMetaOptions,
  };
}

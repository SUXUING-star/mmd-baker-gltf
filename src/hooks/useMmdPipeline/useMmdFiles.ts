import { useCallback, useMemo, useState } from 'react';

export function useMmdFiles(
  defaultPmxPath: string,
  defaultVmdPath: string,
  onFilesChanged?: () => void
) {
  const [customPmxFile, setCustomPmxFile] = useState<File | null>(null);
  const [customExtraFiles, setCustomExtraFiles] = useState<File[]>([]);
  const [vmdFile, setVmdFile] = useState<File | null>(null);

  const activePmxTarget = useMemo(
    () => customPmxFile || defaultPmxPath,
    [customPmxFile, defaultPmxPath]
  );
  const activeVmdTarget = useMemo(
    () => vmdFile || defaultVmdPath,
    [vmdFile, defaultVmdPath]
  );

  const selectPmx = useCallback(
    (file: File | null, extraFiles: File[] = []) => {
      setCustomPmxFile(file);
      setCustomExtraFiles(extraFiles);
      onFilesChanged?.();
    },
    [onFilesChanged]
  );

  const selectVmd = useCallback(
    (file: File) => {
      setVmdFile(file);
      onFilesChanged?.();
    },
    [onFilesChanged]
  );

  const resetPmx = useCallback(() => {
    setCustomPmxFile(null);
    setCustomExtraFiles([]);
    onFilesChanged?.();
  }, [onFilesChanged]);

  const resetAllToDefault = useCallback(() => {
    setCustomPmxFile(null);
    setCustomExtraFiles([]);
    setVmdFile(null);
  }, []);

  const getBaseFilename = useCallback(() => {
    return typeof activeVmdTarget === 'string'
      ? activeVmdTarget.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'motion'
      : activeVmdTarget.name.replace(/\.[^/.]+$/, '');
  }, [activeVmdTarget]);

  return {
    customPmxFile,
    customExtraFiles,
    vmdFile,
    activePmxTarget,
    activeVmdTarget,
    selectPmx,
    selectVmd,
    resetPmx,
    resetAllToDefault,
    getBaseFilename,
  };
}

// src/hooks/useLoopOptions.ts
import { useState } from 'react';
import { DEFAULT_LOOP_OPTIONS, LoopBlendOptions } from '../utils/loopBlender';

export function useLoopOptions() {
  const [loopOptions, setLoopOptions] = useState<LoopBlendOptions>(DEFAULT_LOOP_OPTIONS);

  const updateOption = <K extends keyof LoopBlendOptions>(key: K, value: LoopBlendOptions[K]) => {
    setLoopOptions((prev) => ({ ...prev, [key]: value }));
  };

  return {
    loopOptions,
    updateOption,
    setLoopOptions,
  };
}

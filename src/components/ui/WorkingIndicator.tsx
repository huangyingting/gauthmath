'use client';

import React, { useEffect, useState } from 'react';
import { useI18n } from '@/components/i18n/LanguageProvider';

export function WorkingIndicator({ label = 'Working through your question...' }: { label?: string }) {
  const { t } = useI18n();
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="working-indicator" role="status" data-testid="working-indicator">
      <span className="working-dots" aria-hidden="true"><i /><i /><i /></span>
      <span>{t(label)}</span>
      {seconds > 0 && <span className="ml-auto whitespace-nowrap opacity-60" aria-hidden="true">{seconds}s</span>}
    </div>
  );
}

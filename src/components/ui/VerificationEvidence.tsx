'use client';

import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { useI18n } from '@/components/i18n/LanguageProvider';
import type { VerificationStatus } from '@/lib/math-engine/solver';

export function VerificationEvidence({ status = 'unverified', detail }: { status?: VerificationStatus; detail?: string }) {
  const { t } = useI18n();
  const checked = status === 'verified';
  return (
    <details className="verification-evidence" data-testid="verification-evidence" data-status={status}>
      <summary>
        {checked ? <ShieldCheck className="h-4 w-4" /> : <Info className="h-4 w-4" />}
        <span>{t(checked ? 'Checked by calculation' : status === 'approximated' ? 'Numerical approximation' : 'Not independently verified')}</span>
        <span className="ml-auto text-[10px] font-normal opacity-70">{t('See evidence')}</span>
      </summary>
      <p className="mt-3 text-xs leading-6 text-atelier-muted">{t(detail || 'No independent verification detail is available.')}</p>
      <p className="mt-2 text-[10px] text-atelier-muted">{t('Verification applies to the calculation, not to every AI-generated explanation.')}</p>
    </details>
  );
}

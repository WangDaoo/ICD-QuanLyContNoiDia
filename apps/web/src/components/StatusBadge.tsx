import React from 'react';
import {
  businessHint,
  businessLabel,
  businessTone,
  TONE_CLASSES,
  type BusinessDomain,
  type BusinessTone,
} from '../lib/business-labels';

interface StatusBadgeProps {
  domain: BusinessDomain;
  value: string | boolean | null | undefined;
  /** Override the tone from the dictionary (e.g. highlight an overdue row). */
  tone?: BusinessTone;
  className?: string;
}

/**
 * Shows a backend status/type code as a Vietnamese pill.
 * The raw code stays available in the tooltip for support staff.
 */
export function StatusBadge({ domain, value, tone, className = '' }: StatusBadgeProps) {
  const label = businessLabel(domain, value);
  const hint = businessHint(domain, value);
  const rawCode = value === null || value === undefined ? '' : String(value);
  const title = [hint, rawCode && rawCode !== label ? `Mã: ${rawCode}` : ''].filter(Boolean).join(' · ');
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold ring-1 ring-inset ${TONE_CLASSES[tone ?? businessTone(domain, value)]} ${className}`.trim()}
      title={title || undefined}
    >
      {label}
    </span>
  );
}

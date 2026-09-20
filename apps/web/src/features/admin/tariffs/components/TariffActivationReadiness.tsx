import React from 'react';
import {
  REQUIRED_TARIFF_SERVICE_TYPES,
  getServiceTypeLabel,
} from '../tariff.constants';
import type {
  CreateTariffRuleInput,
  TariffActivationReadiness,
  TariffRule,
  TariffServiceTypeCode,
} from '../tariff.types';

type RuleLike = TariffRule | CreateTariffRuleInput;

export function evaluateTariffReadiness(rules: RuleLike[]): TariffActivationReadiness {
  const coveredGenericServices = new Set<TariffServiceTypeCode>();

  rules.forEach((rule) => {
    if (rule.containerType === 'ALL') {
      coveredGenericServices.add(rule.serviceTypeCode);
    }
  });

  const missingServiceTypes = REQUIRED_TARIFF_SERVICE_TYPES.filter(
    (code) => !coveredGenericServices.has(code),
  );

  return {
    ready: missingServiceTypes.length === 0,
    missingServiceTypes,
  };
}

type Props = {
  rules: RuleLike[];
  compact?: boolean;
};

export const TariffActivationReadinessBadge: React.FC<Props> = ({
  rules,
  compact = false,
}) => {
  const readiness = evaluateTariffReadiness(rules);

  if (compact) {
    if (readiness.ready) {
      return (
        <span className="icd-badge icd-badge--ready">
          Ready for Activation
        </span>
      );
    }

    return (
      <span className="icd-badge icd-badge--not-ready">
        Missing {readiness.missingServiceTypes.length} Generic Rules
      </span>
    );
  }

  return (
    <div
      className={`icd-readiness ${
        readiness.ready ? 'icd-readiness--ready' : 'icd-readiness--pending'
      }`}
    >
      <div className="icd-readiness__header">
        <div className="icd-readiness__status-title">
          {readiness.ready
            ? 'Tariff is ready for activation'
            : 'Generic pricing rules incomplete'}
        </div>
        <div className="icd-readiness__caption">
          Required 5 baseline generic services (`ALL`)
        </div>
      </div>

      <div className="icd-readiness__matrix">
        {REQUIRED_TARIFF_SERVICE_TYPES.map((serviceCode) => {
          const isCovered = !readiness.missingServiceTypes.includes(serviceCode);
          return (
            <div
              key={serviceCode}
              className={`icd-readiness__item ${
                isCovered ? 'is-covered' : 'is-missing'
              }`}
            >
              <span className="icd-readiness__item-icon">
                {isCovered ? '✓' : '✗'}
              </span>
              <span className="icd-readiness__item-label">
                {getServiceTypeLabel(serviceCode)}
              </span>
              <span className="icd-readiness__item-pill">
                {isCovered ? 'Generic ALL' : 'Missing'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

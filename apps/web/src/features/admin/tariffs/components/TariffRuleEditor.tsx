import React, { useState } from 'react';
import {
  TARIFF_CONTAINER_LABEL,
  TARIFF_CONTAINER_TYPES,
  getServiceTypeLabel,
} from '../tariff.constants';
import type {
  CreateTariffRuleInput,
  TariffContainerType,
  TariffServiceType,
  TariffServiceTypeCode,
} from '../tariff.types';

type Props = {
  serviceTypes: TariffServiceType[];
  rules: CreateTariffRuleInput[];
  onChange: (rules: CreateTariffRuleInput[]) => void;
};

export const TariffRuleEditor: React.FC<Props> = ({
  serviceTypes,
  rules,
  onChange,
}) => {
  const [selectedServiceCode, setSelectedServiceCode] =
    useState<TariffServiceTypeCode>('RECEPTION');
  const [containerType, setContainerType] =
    useState<TariffContainerType>('ALL');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [freeDays, setFreeDays] = useState<string>('');
  const [minQuantity, setMinQuantity] = useState<string>('');
  const [maxQuantity, setMaxQuantity] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleAddRule = () => {
    setError(null);
    const parsedPrice = Number(unitPrice);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Unit price must be a valid non-negative number.');
      return;
    }

    const matchedService = serviceTypes.find(
      (s) => s.code === selectedServiceCode,
    );

    const duplicate = rules.some(
      (r) =>
        r.serviceTypeCode === selectedServiceCode &&
        r.containerType === containerType,
    );

    if (duplicate) {
      setError(
        `Rule for ${selectedServiceCode} and ${containerType} already exists. Remove or edit existing rule.`,
      );
      return;
    }

    const newRule: CreateTariffRuleInput = {
      serviceTypeId: matchedService?.id ?? undefined,
      serviceTypeCode: selectedServiceCode,
      containerType,
      unitPrice: parsedPrice,
      freeDays: freeDays ? Number(freeDays) : undefined,
      minQuantity: minQuantity ? Number(minQuantity) : undefined,
      maxQuantity: maxQuantity ? Number(maxQuantity) : undefined,
    };

    onChange([...rules, newRule]);
    setUnitPrice('');
    setFreeDays('');
    setMinQuantity('');
    setMaxQuantity('');
  };

  const handleRemoveRule = (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="icd-tariff-rules-editor">
      <div className="icd-tariff-rules-editor__form">
        <h4>Add Pricing Rule</h4>
        <div className="icd-form-grid">
          <div className="icd-form-group">
            <label>Service Type</label>
            <select
              value={selectedServiceCode}
              onChange={(e) =>
                setSelectedServiceCode(
                  e.target.value as TariffServiceTypeCode,
                )
              }
            >
              {serviceTypes.map((st) => (
                <option key={st.code} value={st.code}>
                  {st.name || getServiceTypeLabel(st.code)} ({st.code})
                </option>
              ))}
            </select>
          </div>

          <div className="icd-form-group">
            <label>Container Type</label>
            <select
              value={containerType}
              onChange={(e) =>
                setContainerType(e.target.value as TariffContainerType)
              }
            >
              {TARIFF_CONTAINER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TARIFF_CONTAINER_LABEL[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="icd-form-group">
            <label>Unit Price (VND)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 50000"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
            />
          </div>

          <div className="icd-form-group">
            <label>Free Days (optional)</label>
            <input
              type="number"
              min="0"
              placeholder="e.g. 5"
              value={freeDays}
              onChange={(e) => setFreeDays(e.target.value)}
            />
          </div>

          <div className="icd-form-group">
            <label>Min Quantity (optional)</label>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={minQuantity}
              onChange={(e) => setMinQuantity(e.target.value)}
            />
          </div>

          <div className="icd-form-group">
            <label>Max Quantity (optional)</label>
            <input
              type="number"
              min="0"
              placeholder="optional"
              value={maxQuantity}
              onChange={(e) => setMaxQuantity(e.target.value)}
            />
          </div>
        </div>

        {error && <div className="icd-form-error">{error}</div>}

        <button
          type="button"
          className="icd-button icd-button--secondary"
          onClick={handleAddRule}
        >
          + Add Rule
        </button>
      </div>

      <div className="icd-tariff-rules-table-container">
        <h5>Defined Rules ({rules.length})</h5>
        {rules.length === 0 ? (
          <p className="icd-muted">No rules added yet.</p>
        ) : (
          <table className="icd-table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Container</th>
                <th>Price</th>
                <th>Free Days</th>
                <th>Quantity Bounds</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, index) => (
                <tr key={`${r.serviceTypeCode}-${r.containerType}-${index}`}>
                  <td>
                    <strong>{getServiceTypeLabel(r.serviceTypeCode)}</strong>
                    <span className="icd-muted"> ({r.serviceTypeCode})</span>
                  </td>
                  <td>
                    <span
                      className={`icd-badge ${
                        r.containerType === 'ALL'
                          ? 'icd-badge--accent'
                          : 'icd-badge--neutral'
                      }`}
                    >
                      {TARIFF_CONTAINER_LABEL[r.containerType] || r.containerType}
                    </span>
                  </td>
                  <td>{r.unitPrice.toLocaleString()} VND</td>
                  <td>{r.freeDays !== undefined && r.freeDays !== null ? `${r.freeDays} days` : '—'}</td>
                  <td>
                    {r.minQuantity !== undefined || r.maxQuantity !== undefined
                      ? `${r.minQuantity ?? 0} - ${r.maxQuantity ?? '∞'}`
                      : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="icd-button icd-button--sm icd-button--danger"
                      onClick={() => handleRemoveRule(index)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

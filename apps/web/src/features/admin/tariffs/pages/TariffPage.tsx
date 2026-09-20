import React, { useEffect, useState } from 'react';
import { tariffApi } from '../api/tariff.api';
import {
  TariffActivationReadinessBadge,
  evaluateTariffReadiness,
} from '../components/TariffActivationReadiness';
import { TariffRuleEditor } from '../components/TariffRuleEditor';
import {
  TARIFF_CONTAINER_LABEL,
  getServiceTypeLabel,
} from '../tariff.constants';
import type {
  CreateTariffRuleInput,
  Tariff,
  TariffServiceType,
  TariffStatus,
} from '../tariff.types';
import './Tariff.css';

export const TariffPage: React.FC = () => {
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [serviceTypes, setServiceTypes] = useState<TariffServiceType[]>([]);
  const [activeTab, setActiveTab] = useState<'LIST' | 'CREATE'>('LIST');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState<string>('');
  const [effectiveFrom, setEffectiveFrom] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [rules, setRules] = useState<CreateTariffRuleInput[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const snapshot = await tariffApi.getSnapshot();
      setTariffs(snapshot.tariffs);
      setServiceTypes(snapshot.serviceTypes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tariffs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tariff name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await tariffApi.create({
        name: name.trim(),
        effectiveFrom,
        effectiveTo: effectiveTo || undefined,
        rules,
      });
      setActionMessage('Tariff created successfully as DRAFT.');
      setName('');
      setEffectiveTo('');
      setRules([]);
      setActiveTab('LIST');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create tariff');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (tariffId: string) => {
    try {
      setSaving(true);
      setError(null);
      await tariffApi.activate(tariffId);
      setActionMessage('Tariff activated successfully.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to activate tariff');
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async (tariffId: string) => {
    try {
      setSaving(true);
      setError(null);
      await tariffApi.retire(tariffId);
      setActionMessage('Tariff retired successfully.');
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to retire tariff');
    } finally {
      setSaving(false);
    }
  };

  const filteredTariffs = tariffs.filter((t) => {
    if (filterStatus === 'ALL') return true;
    return t.status.toUpperCase() === filterStatus;
  });

  return (
    <div className="icd-tariff-page">
      <div className="icd-tariff-header">
        <div>
          <h2>Tariff Management</h2>
          <p className="icd-muted">
            Manage pricing tariffs and service rules for ICD operations
          </p>
        </div>
        <div className="icd-tariff-tabs">
          <button
            type="button"
            className={`icd-tab-btn ${activeTab === 'LIST' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('LIST')}
          >
            Tariff Catalog
          </button>
          <button
            type="button"
            className={`icd-tab-btn ${activeTab === 'CREATE' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('CREATE')}
          >
            + New Tariff
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="icd-alert icd-alert--success">
          {actionMessage}
          <button
            type="button"
            className="icd-alert__close"
            onClick={() => setActionMessage(null)}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="icd-alert icd-alert--error">
          {error}
          <button
            type="button"
            className="icd-alert__close"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}

      {activeTab === 'CREATE' ? (
        <div className="icd-tariff-card">
          <h3>Create New Tariff (DRAFT)</h3>
          <form onSubmit={handleCreateTariff}>
            <div className="icd-form-grid">
              <div className="icd-form-group">
                <label>Tariff Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Standard ICD Tariff 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="icd-form-group">
                <label>Effective From *</label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  required
                />
              </div>

              <div className="icd-form-group">
                <label>Effective To (Optional)</label>
                <input
                  type="date"
                  value={effectiveTo}
                  onChange={(e) => setEffectiveTo(e.target.value)}
                />
              </div>
            </div>

            <TariffActivationReadinessBadge rules={rules} />

            <TariffRuleEditor
              serviceTypes={serviceTypes}
              rules={rules}
              onChange={setRules}
            />

            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="icd-button icd-button--primary"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Create Tariff'}
              </button>
              <button
                type="button"
                className="icd-button icd-button--secondary"
                onClick={() => setActiveTab('LIST')}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span>Filter Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ width: '160px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="RETIRED">RETIRED</option>
            </select>
          </div>

          {loading ? (
            <p>Loading tariffs...</p>
          ) : filteredTariffs.length === 0 ? (
            <div className="icd-card icd-muted">No tariffs found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredTariffs.map((t) => {
                const readiness = evaluateTariffReadiness(t.rules);
                const status = t.status.toUpperCase() as TariffStatus;

                return (
                  <div
                    key={t.id}
                    className={`icd-tariff-card icd-tariff-card--${status.toLowerCase()}`}
                  >
                    <div className="icd-tariff-card__header">
                      <div>
                        <div className="icd-tariff-card__title">
                          <h4>{t.name}</h4>
                          <span
                            className={`icd-badge ${
                              status === 'ACTIVE'
                                ? 'icd-badge--ready'
                                : status === 'DRAFT'
                                  ? 'icd-badge--accent'
                                  : 'icd-badge--neutral'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <p className="icd-muted" style={{ margin: '4px 0 0 0' }}>
                          Effective: {t.effectiveFrom || 'Immediate'} →{' '}
                          {t.effectiveTo || 'Indefinite'}
                          {t.createdByName && ` · Created by: ${t.createdByName}`}
                        </p>
                      </div>

                      <div className="icd-tariff-card__actions">
                        {status === 'DRAFT' && (
                          <button
                            type="button"
                            className="icd-button icd-button--sm icd-button--primary"
                            disabled={!readiness.ready || saving}
                            onClick={() => handleActivate(t.id)}
                            title={
                              readiness.ready
                                ? 'Activate this tariff'
                                : 'Generic rules missing for 5 core services'
                            }
                          >
                            Activate
                          </button>
                        )}
                        {status === 'ACTIVE' && (
                          <button
                            type="button"
                            className="icd-button icd-button--sm icd-button--secondary"
                            disabled={saving}
                            onClick={() => handleRetire(t.id)}
                          >
                            Retire
                          </button>
                        )}
                      </div>
                    </div>

                    <TariffActivationReadinessBadge rules={t.rules} />

                    <div className="icd-tariff-rules-table-container">
                      <h6>Rules ({t.rules.length})</h6>
                      {t.rules.length === 0 ? (
                        <p className="icd-muted">No rules configured.</p>
                      ) : (
                        <table className="icd-table">
                          <thead>
                            <tr>
                              <th>Service</th>
                              <th>Container Type</th>
                              <th>Unit Price</th>
                              <th>Free Days</th>
                              <th>Quantity Bounds</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.rules.map((r, i) => (
                              <tr key={r.id ?? i}>
                                <td>
                                  <strong>
                                    {r.serviceTypeName ||
                                      getServiceTypeLabel(r.serviceTypeCode)}
                                  </strong>
                                  <span className="icd-muted">
                                    {' '}
                                    ({r.serviceTypeCode})
                                  </span>
                                </td>
                                <td>
                                  <span
                                    className={`icd-badge ${
                                      r.containerType === 'ALL'
                                        ? 'icd-badge--accent'
                                        : 'icd-badge--neutral'
                                    }`}
                                  >
                                    {TARIFF_CONTAINER_LABEL[r.containerType] ||
                                      r.containerType}
                                  </span>
                                </td>
                                <td>{r.unitPrice.toLocaleString()} VND</td>
                                <td>
                                  {r.freeDays !== null && r.freeDays !== undefined
                                    ? `${r.freeDays} days`
                                    : '—'}
                                </td>
                                <td>
                                  {r.minQuantity !== null || r.maxQuantity !== null
                                    ? `${r.minQuantity ?? 0} - ${r.maxQuantity ?? '∞'}`
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

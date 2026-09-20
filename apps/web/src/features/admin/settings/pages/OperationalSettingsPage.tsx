import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  operationalSettingsApi,
} from '../api/operational-settings.api';

import type {
  OperationalSetting,
  OperationalSettingDefinition,
  OperationalSettingKey,
} from '../operational-setting.types';

import './OperationalSettings.css';

const DEFINITIONS: OperationalSettingDefinition[] = [
  {
    key: 'FREE_STORAGE_DAYS',
    label: 'Miễn phí lưu kho',
    description:
      'Số ngày container được lưu kho miễn phí trước khi phát sinh phí Storage.',
    unit: 'day',
    defaultValue: 5,
  },
  {
    key: 'GATE_PASS_TTL_HOURS',
    label: 'Thời hạn Phiếu ra cổng',
    description:
      'Khoảng thời gian Gate Pass còn hiệu lực kể từ lúc phát hành.',
    unit: 'hour',
    defaultValue: 24,
  },
  {
    key: 'GATE_IN_SLA_MINUTES',
    label: 'SLA Gate-in',
    description:
      'Ngưỡng thời gian vận hành dùng để theo dõi tiến độ tiếp nhận container.',
    unit: 'minute',
    defaultValue: 120,
  },
  {
    key: 'YARD_ASSIGN_SLA_MINUTES',
    label: 'SLA xếp vị trí bãi',
    description:
      'Ngưỡng thời gian từ khi container vào bãi đến khi được gán vị trí.',
    unit: 'minute',
    defaultValue: 60,
  },
  {
    key: 'OVERDUE_DEBT_DAYS',
    label: 'Ngưỡng công nợ quá hạn',
    description:
      'Số ngày dùng để cảnh báo Invoice / công nợ quá hạn.',
    unit: 'day',
    defaultValue: 30,
  },
];

function getUnitLabel(
  unit: OperationalSettingDefinition['unit'],
): string {
  switch (unit) {
    case 'day':
      return 'ngày';
    case 'hour':
      return 'giờ';
    case 'minute':
      return 'phút';
    default:
      return '';
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('vi-VN');
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'body' in error) {
    const body = (
      error as {
        body?: {
          error?: {
            message?: string;
          };
          message?: string | string[];
        };
      }
    ).body;

    if (body?.error?.message) {
      return body.error.message;
    }
    if (typeof body?.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Không thể xử lý Operational Settings.';
}

export function OperationalSettingsPage() {
  const [settings, setSettings] = useState<OperationalSetting[]>([]);
  const [values, setValues] = useState<Record<OperationalSettingKey, string>>({
    FREE_STORAGE_DAYS: '5',
    GATE_PASS_TTL_HOURS: '24',
    GATE_IN_SLA_MINUTES: '120',
    YARD_ASSIGN_SLA_MINUTES: '60',
    OVERDUE_DEBT_DAYS: '30',
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<OperationalSettingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await operationalSettingsApi.list();
      setSettings(result);

      setValues((current) => {
        const next = { ...current };
        for (const definition of DEFINITIONS) {
          const setting = result.find((item) => item.key === definition.key);
          next[definition.key] = String(
            setting?.value ?? definition.defaultValue,
          );
        }
        return next;
      });
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settingMap = useMemo(
    () => new Map(settings.map((setting) => [setting.key, setting])),
    [settings],
  );

  const changedKeys = useMemo(() => {
    const changed = new Set<OperationalSettingKey>();

    for (const definition of DEFINITIONS) {
      const persisted =
        settingMap.get(definition.key)?.value ?? definition.defaultValue;
      const draft = Number(values[definition.key]);

      if (Number.isFinite(draft) && draft !== persisted) {
        changed.add(definition.key);
      }
    }

    return changed;
  }, [settingMap, values]);

  function validateValue(key: OperationalSettingKey): number | null {
    const raw = values[key].trim();

    if (!raw) {
      setError('Giá trị không được để trống.');
      return null;
    }

    const parsed = Number(raw);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      setError('Operational Setting phải là số nguyên.');
      return null;
    }

    if (parsed < 0) {
      setError('Operational Setting không được nhỏ hơn 0.');
      return null;
    }

    return parsed;
  }

  async function save(key: OperationalSettingKey) {
    const value = validateValue(key);
    if (value === null) {
      return;
    }

    const definition = DEFINITIONS.find((item) => item.key === key);
    if (!definition) {
      return;
    }

    try {
      setSavingKey(key);
      setError(null);
      setSuccess(null);

      await operationalSettingsApi.update(key, { value });

      setSuccess(
        `Đã cập nhật ${definition.label}: ${value} ${getUnitLabel(
          definition.unit,
        )}.`,
      );

      await load();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSavingKey(null);
    }
  }

  function resetDraft(definition: OperationalSettingDefinition) {
    const persisted =
      settingMap.get(definition.key)?.value ?? definition.defaultValue;

    setValues((current) => ({
      ...current,
      [definition.key]: String(persisted),
    }));
  }

  if (loading) {
    return (
      <div className="operational-settings-state">
        <div className="operational-settings-spinner" />
        <strong>Đang tải Operational Settings</strong>
      </div>
    );
  }

  return (
    <div className="operational-settings-page">
      <div className="operational-settings-toolbar">
        <div>
          <span>ADMIN CENTER · CONFIG</span>
          <h2>Operational Settings</h2>
          <p>
            Cấu hình các tham số vận hành dùng bởi Billing, Gate Pass, SLA và Reports.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
        >
          ↻ Làm mới
        </button>
      </div>

      {error && (
        <div className="operational-settings-message operational-settings-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      {success && (
        <div className="operational-settings-message operational-settings-message--success">
          <strong>✓</strong>
          {success}
        </div>
      )}

      <section className="operational-settings-summary">
        <article>
          <span>SETTINGS</span>
          <strong>{DEFINITIONS.length}</strong>
          <small>RC1 managed keys</small>
        </article>

        <article>
          <span>UNSAVED</span>
          <strong>{changedKeys.size}</strong>
          <small>thay đổi phía Web</small>
        </article>

        <article>
          <span>SOURCE OF TRUTH</span>
          <strong className="operational-settings-source">BACKEND</strong>
          <small>`/admin/settings`</small>
        </article>
      </section>

      <section className="operational-settings-grid">
        {DEFINITIONS.map((definition) => {
          const persisted = settingMap.get(definition.key);
          const changed = changedKeys.has(definition.key);
          const saving = savingKey === definition.key;

          return (
            <article
              key={definition.key}
              className={[
                'operational-setting-card',
                changed ? 'operational-setting-card--changed' : '',
              ].join(' ')}
            >
              <div className="operational-setting-card__header">
                <div>
                  <span>{definition.key}</span>
                  <h3>{definition.label}</h3>
                </div>

                {changed && (
                  <strong className="operational-setting-unsaved">
                    UNSAVED
                  </strong>
                )}
              </div>

              <p className="operational-setting-description">
                {definition.description}
              </p>

              <label className="operational-setting-value">
                <span>Giá trị</span>

                <div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={values[definition.key]}
                    disabled={saving}
                    onChange={(event) => {
                      setValues((current) => ({
                        ...current,
                        [definition.key]: event.target.value,
                      }));
                      setSuccess(null);
                    }}
                  />

                  <strong>{getUnitLabel(definition.unit)}</strong>
                </div>
              </label>

              <div className="operational-setting-meta">
                <div>
                  <span>Giá trị mặc định</span>
                  <strong>
                    {definition.defaultValue}{' '}
                    {getUnitLabel(definition.unit)}
                  </strong>
                </div>

                <div>
                  <span>Giá trị hiện tại</span>
                  <strong>
                    {persisted?.value ?? definition.defaultValue}{' '}
                    {getUnitLabel(definition.unit)}
                  </strong>
                </div>

                <div>
                  <span>Cập nhật lần cuối</span>
                  <strong>{formatDateTime(persisted?.updatedAt)}</strong>
                </div>

                {persisted?.updatedByName && (
                  <div>
                    <span>Người cập nhật</span>
                    <strong>{persisted.updatedByName}</strong>
                  </div>
                )}
              </div>

              <div className="operational-setting-actions">
                <button
                  type="button"
                  disabled={!changed || saving}
                  onClick={() => resetDraft(definition)}
                >
                  Hoàn tác
                </button>

                <button
                  type="button"
                  className="operational-setting-save"
                  disabled={!changed || saving}
                  onClick={() => {
                    void save(definition.key);
                  }}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="operational-settings-warning">
        <strong>Thay đổi có ảnh hưởng nghiệp vụ</strong>
        <p>
          Các giá trị này được backend sử dụng cho rule vận hành.
          Frontend không tự tính lại Storage, Gate Pass expiry, SLA hay overdue debt bằng
          cấu hình riêng.
        </p>
      </section>
    </div>
  );
}

export default OperationalSettingsPage;

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  partnerClientApi,
} from '../api/partner-client.api';

import {
  ApiKeyRevealModal,
} from '../components/ApiKeyRevealModal';

import type {
  PartnerApiClient,
  PartnerApiKeyReveal,
} from '../partner-client.types';

import '../../partner-gateway/PartnerGatewayAdmin.css';

const SCOPES = [
  'handover.read',
  'handover.accept',
  'handover.transit',
  'handover.confirm_warehouse',
  'handover.failure',
];

function formatDateTime(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? '—'
    : date.toLocaleString(
        'vi-VN',
      );
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể xử lý Partner API Client.';
}

export function PartnerClientListPage() {
  const [
    clients,
    setClients,
  ] =
    useState<
      PartnerApiClient[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    status,
    setStatus,
  ] = useState('ALL');

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);

  const [
    partnerCode,
    setPartnerCode,
  ] = useState('');

  const [
    partnerName,
    setPartnerName,
  ] = useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    scopes,
    setScopes,
  ] =
    useState<string[]>([
      'handover.read',
    ]);

  const [
    reveal,
    setReveal,
  ] =
    useState<
      PartnerApiKeyReveal | null
    >(null);

  const [
    revealAction,
    setRevealAction,
  ] = useState<
    'CREATE' | 'ROTATE'
  >('CREATE');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    actionId,
    setActionId,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null);

  const load =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          setClients(
            await partnerClientApi.list(),
          );
        } catch (
          loadError
        ) {
          setError(
            getErrorMessage(
              loadError,
            ),
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return clients.filter(
        (client) => {
          if (
            status !==
              'ALL' &&
            client.status !==
              status
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            client.partnerCode,
            client.partnerName,
            client.description,
          ].some(
            (value) =>
              value
                ?.toUpperCase()
                .includes(
                  needle,
                ) ?? false,
          );
        },
      );
    }, [
      clients,
      search,
      status,
    ]);

  const stats =
    useMemo(
      () => ({
        total:
          clients.length,

        active:
          clients.filter(
            (client) =>
              client.status ===
              'ACTIVE',
          ).length,

        revoked:
          clients.filter(
            (client) =>
              client.status ===
              'REVOKED',
          ).length,
      }),
      [clients],
    );

  function toggleScope(
    scope: string,
  ) {
    setScopes(
      (current) =>
        current.includes(
          scope,
        )
          ? current.filter(
              (item) =>
                item !== scope,
            )
          : [
              ...current,
              scope,
            ],
    );
  }

  async function create(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !partnerCode.trim() ||
      !partnerName.trim()
    ) {
      setError(
        'Partner Code và Partner Name là bắt buộc.',
      );

      return;
    }

    if (
      scopes.length === 0
    ) {
      setError(
        'Partner phải có ít nhất một scope.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const result =
        await partnerClientApi.create(
          {
            partnerCode,
            partnerName,
            description,
            scopes,
          },
        );

      setRevealAction(
        'CREATE',
      );

      setReveal(result);

      setPartnerCode('');
      setPartnerName('');
      setDescription('');

      setScopes([
        'handover.read',
      ]);

      setShowCreate(false);

      await load();
    } catch (
      createError
    ) {
      setError(
        getErrorMessage(
          createError,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function rotate(
    client:
      PartnerApiClient,
  ) {
    const confirmed =
      window.confirm(
        `Rotate API Key của ${client.partnerName}?\n\nKey cũ sẽ bị vô hiệu hóa theo policy backend.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(
        client.id,
      );

      setError(null);
      setSuccess(null);

      const result =
        await partnerClientApi.rotate(
          client.id,
        );

      setRevealAction(
        'ROTATE',
      );

      setReveal(result);

      await load();
    } catch (
      rotateError
    ) {
      setError(
        getErrorMessage(
          rotateError,
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  async function revoke(
    client:
      PartnerApiClient,
  ) {
    const confirmed =
      window.confirm(
        `Thu hồi API Client ${client.partnerCode}?\n\nRequest mới của Partner sẽ bị chặn. Lịch sử API Log không bị xóa.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(
        client.id,
      );

      setError(null);

      await partnerClientApi.revoke(
        client.id,
      );

      setSuccess(
        `Đã revoke ${client.partnerName}.`,
      );

      await load();
    } catch (
      revokeError
    ) {
      setError(
        getErrorMessage(
          revokeError,
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  if (loading) {
    return (
      <div className="partner-admin-state">
        <div className="partner-admin-spinner" />

        <strong>
          Đang tải Partner API Clients
        </strong>
      </div>
    );
  }

  return (
    <div className="partner-admin-page">
      <div className="partner-admin-toolbar">
        <div>
          <span>
            ADMIN · M2M SECURITY
          </span>

          <h2>
            Partner API Clients
          </h2>

          <p>
            Quản lý machine identity,
            scopes và API Key cho hệ
            thống Logistics Partner.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setShowCreate(
              true,
            )
          }
        >
          + Tạo API Client
        </button>
      </div>

      {error && (
        <div className="partner-admin-message partner-admin-message--error">
          <strong>!</strong>

          {error}
        </div>
      )}

      {success && (
        <div className="partner-admin-message partner-admin-message--success">
          <strong>✓</strong>

          {success}
        </div>
      )}

      <section className="partner-admin-kpis">
        <article>
          <span>
            TỔNG CLIENT
          </span>

          <strong>
            {stats.total}
          </strong>
        </article>

        <article>
          <span>
            ACTIVE
          </span>

          <strong>
            {stats.active}
          </strong>
        </article>

        <article>
          <span>
            REVOKED
          </span>

          <strong>
            {stats.revoked}
          </strong>
        </article>
      </section>

      <section className="partner-admin-panel">
        <div className="partner-admin-filterbar">
          <input
            type="search"
            placeholder="Partner code, tên đối tác..."
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target
                  .value,
              )
            }
          />

          <select
            value={status}
            onChange={(
              event,
            ) =>
              setStatus(
                event.target
                  .value,
              )
            }
          >
            <option value="ALL">
              Tất cả trạng thái
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="REVOKED">
              Revoked
            </option>
          </select>
        </div>

        <div className="partner-admin-table-wrapper">
          <table className="partner-admin-table">
            <thead>
              <tr>
                <th>
                  PARTNER
                </th>

                <th>
                  API KEY
                </th>

                <th>
                  SCOPES
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  CREATED
                </th>

                <th>
                  LAST REQUEST
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (client) => (
                  <tr
                    key={
                      client.id
                    }
                  >
                    <td>
                      <Link
                        to={`/admin/partner-clients/${encodeURIComponent(
                          client.id,
                        )}`}
                      >
                        {
                          client.partnerName
                        }
                      </Link>

                      <small>
                        {
                          client.partnerCode
                        }
                      </small>
                    </td>

                    <td>
                      <code>
                        ****
                        {client.keyLast4 ??
                          '----'}
                      </code>
                    </td>

                    <td>
                      <div className="partner-scope-list">
                        {client.scopes.map(
                          (scope) => (
                            <span
                              key={
                                scope
                              }
                            >
                              {scope}
                            </span>
                          ),
                        )}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`partner-client-status partner-client-status--${client.status.toLowerCase()}`}
                      >
                        {
                          client.status
                        }
                      </span>
                    </td>

                    <td>
                      {formatDateTime(
                        client.createdAt,
                      )}
                    </td>

                    <td>
                      {formatDateTime(
                        client.lastRequestAt,
                      )}
                    </td>

                    <td>
                      <div className="partner-admin-row-actions">
                        <Link
                          to={`/admin/partner-clients/${encodeURIComponent(
                            client.id,
                          )}`}
                        >
                          Detail
                        </Link>

                        {client.status ===
                          'ACTIVE' && (
                          <>
                            <button
                              type="button"
                              disabled={
                                actionId ===
                                client.id
                              }
                              onClick={() => {
                                void rotate(
                                  client,
                                );
                              }}
                            >
                              Rotate
                            </button>

                            <button
                              type="button"
                              disabled={
                                actionId ===
                                client.id
                              }
                              onClick={() => {
                                void revoke(
                                  client,
                                );
                              }}
                            >
                              Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showCreate && (
        <div className="partner-admin-backdrop">
          <form
            className="partner-admin-modal"
            onSubmit={(
              event,
            ) => {
              void create(
                event,
              );
            }}
          >
            <div className="partner-admin-modal__heading">
              <div>
                <span>
                  NEW MACHINE IDENTITY
                </span>

                <h3>
                  Tạo Partner API Client
                </h3>
              </div>

              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  setShowCreate(
                    false,
                  )
                }
              >
                ×
              </button>
            </div>

            <label>
              <span>
                Partner Code *
              </span>

              <input
                value={
                  partnerCode
                }
                disabled={
                  submitting
                }
                placeholder="ABC_LOGISTICS"
                onChange={(
                  event,
                ) =>
                  setPartnerCode(
                    event.target
                      .value
                      .toUpperCase(),
                  )
                }
              />
            </label>

            <label>
              <span>
                Partner Name *
              </span>

              <input
                value={
                  partnerName
                }
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setPartnerName(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span>
                Mô tả
              </span>

              <textarea
                rows={3}
                value={
                  description
                }
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setDescription(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <fieldset>
              <legend>
                Allowed Scopes *
              </legend>

              {SCOPES.map(
                (scope) => (
                  <label
                    key={
                      scope
                    }
                    className="partner-scope-checkbox"
                  >
                    <input
                      type="checkbox"
                      checked={
                        scopes.includes(
                          scope,
                        )
                      }
                      disabled={
                        submitting
                      }
                      onChange={() =>
                        toggleScope(
                          scope,
                        )
                      }
                    />

                    <span>
                      {scope}
                    </span>
                  </label>
                ),
              )}
            </fieldset>

            <div className="partner-admin-modal__actions">
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={() =>
                  setShowCreate(
                    false,
                  )
                }
              >
                Hủy
              </button>

              <button
                type="submit"
                className="partner-primary-button"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? 'Đang tạo...'
                  : 'Tạo API Client'}
              </button>
            </div>
          </form>
        </div>
      )}

      {reveal && (
        <ApiKeyRevealModal
          apiKey={
            reveal.apiKey
          }
          partnerName={
            reveal.client
              .partnerName
          }
          action={
            revealAction
          }
          onClose={() => {
            /*
             * Plaintext key bị bỏ khỏi
             * component state ngay khi
             * user đóng dialog.
             */
            setReveal(null);
          }}
        />
      )}
    </div>
  );
}

export default PartnerClientListPage;

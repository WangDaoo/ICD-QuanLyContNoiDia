import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  ediApi,
} from '../api/edi.api';

import type {
  EdiAcknowledgement,
  EdiInboundReceipt,
  EdiOperationalAlert,
  EdiOutboxMessage,
} from '../edi.types';

import './EdiOperations.css';

type EdiTab =
  | 'OUTBOX'
  | 'ACK'
  | 'RECEIPTS'
  | 'ALERTS';

type SelectedDetail =
  | {
      type: 'OUTBOX';
      value:
        EdiOutboxMessage;
    }
  | {
      type: 'ACK';
      value:
        EdiAcknowledgement;
    }
  | {
      type: 'RECEIPT';
      value:
        EdiInboundReceipt;
    }
  | {
      type: 'ALERT';
      value:
        EdiOperationalAlert;
    }
  | null;

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error ===
      'object' &&
    error !== null &&
    'body' in error
  ) {
    const body =
      (
        error as {
          body?: {
            error?: {
              message?: string;
            };

            message?:
              | string
              | string[];
          };
        }
      ).body;

    if (
      body?.error?.message
    ) {
      return body.error
        .message;
    }

    if (
      typeof body?.message ===
      'string'
    ) {
      return body.message;
    }

    if (
      Array.isArray(
        body?.message,
      )
    ) {
      return body.message.join(
        ', ',
      );
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể xử lý EDI.';
}

function formatDateTime(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  ).format(date);
}

function jsonText(
  value: unknown,
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return '—';
  }

  if (
    typeof value ===
    'string'
  ) {
    return value;
  }

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}

function statusTone(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'SENT':
    case 'PROCESSED':
    case 'ACCEPTED':
    case 'RESOLVED':
    case 'MATCHED':
      return 'success';

    case 'PROCESSING':
    case 'ACKNOWLEDGED':
    case 'PENDING':
      return 'primary';

    case 'FAILED':
    case 'REJECTED':
    case 'DEAD':
    case 'QUARANTINED':
    case 'PARTY_MISMATCH':
      return 'danger';

    case 'OPEN':
    case 'WARNING':
    case 'UNMATCHED':
      return 'warning';

    default:
      return 'neutral';
  }
}

function severityTone(
  severity: string,
): string {
  switch (
    severity.toUpperCase()
  ) {
    case 'CRITICAL':
    case 'ERROR':
      return 'danger';

    case 'WARNING':
      return 'warning';

    default:
      return 'neutral';
  }
}

function StatusBadge({
  value,
  severity = false,
}: {
  value: string;
  severity?: boolean;
}) {
  return (
    <span
      className={[
        'edi-status',
        `edi-status--${
          severity
            ? severityTone(value)
            : statusTone(value)
        }`,
      ].join(' ')}
    >
      {value}
    </span>
  );
}

export function EdiOperationsPage() {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<EdiTab>(
      'OUTBOX',
    );

  const [
    outbox,
    setOutbox,
  ] =
    useState<
      EdiOutboxMessage[]
    >([]);

  const [
    acknowledgements,
    setAcknowledgements,
  ] =
    useState<
      EdiAcknowledgement[]
    >([]);

  const [
    receipts,
    setReceipts,
  ] =
    useState<
      EdiInboundReceipt[]
    >([]);

  const [
    alerts,
    setAlerts,
  ] =
    useState<
      EdiOperationalAlert[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState('ALL');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    globalBusy,
    setGlobalBusy,
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

  const [
    selected,
    setSelected,
  ] =
    useState<SelectedDetail>(
      null,
    );

  const load =
    useCallback(
      async (
        refresh = false,
      ) => {
        try {
          if (refresh) {
            setRefreshing(
              true,
            );
          } else {
            setLoading(
              true,
            );
          }

          setError(null);

          const [
            outboxResult,
            ackResult,
            receiptResult,
            alertResult,
          ] =
            await Promise.all([
              ediApi.getOutbox(),
              ediApi.getAcknowledgements(),
              ediApi.getReceipts(),
              ediApi.getAlerts(),
            ]);

          setOutbox(
            outboxResult,
          );

          setAcknowledgements(
            ackResult,
          );

          setReceipts(
            receiptResult,
          );

          setAlerts(
            alertResult,
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
          setRefreshing(
            false,
          );
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setFilter('ALL');
    setSelected(null);
  }, [activeTab]);

  const stats =
    useMemo(
      () => ({
        pending:
          outbox.filter(
            (item) =>
              item.status ===
                'PENDING' ||
              item.status ===
                'PROCESSING',
          ).length,

        failed:
          outbox.filter(
            (item) =>
              item.status ===
                'FAILED' ||
              item.status ===
                'DEAD',
          ).length,

        sent:
          outbox.filter(
            (item) =>
              item.status ===
              'SENT',
          ).length,

        rejected:
          acknowledgements.filter(
            (item) =>
              item.businessStatus ===
                'REJECTED' ||
              item.businessStatus ===
                'ERROR',
          ).length,

        activeAlerts:
          alerts.filter(
            (item) =>
              item.status !==
              'RESOLVED',
          ).length,
      }),
      [
        outbox,
        acknowledgements,
        alerts,
      ],
    );

  const filteredOutbox =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return outbox.filter(
        (item) => {
          if (
            filter !==
              'ALL' &&
            item.status !==
              filter
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            item.messageType,
            item.eventType,
            item.containerNumber,
            item.shippingLineName,
            item.shippingLineCode,
            item.externalReference,
            item.outboundMessageReference,
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
      outbox,
      search,
      filter,
    ]);

  const filteredAcks =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return acknowledgements.filter(
        (item) => {
          if (
            filter !==
              'ALL' &&
            item.businessStatus !==
              filter &&
            item.correlationStatus !==
              filter
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            item.type,
            item.containerNumber,
            item.shippingLineName,
            item.shippingLineCode,
            item.messageReference,
            item.acknowledgedMessageReference,
            item.errorCode,
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
      acknowledgements,
      search,
      filter,
    ]);

  const filteredReceipts =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return receipts.filter(
        (item) => {
          if (
            filter !==
              'ALL' &&
            item.status !==
              filter
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            item.fileName,
            item.messageType,
            item.shippingLineName,
            item.shippingLineCode,
            item.transport,
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
      receipts,
      search,
      filter,
    ]);

  const filteredAlerts =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return alerts.filter(
        (item) => {
          if (
            filter !==
              'ALL' &&
            item.status !==
              filter &&
            item.severity !==
              filter
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            item.title,
            item.message,
            item.code,
            item.sourceType,
            item.containerNumber,
            item.shippingLineName,
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
      alerts,
      search,
      filter,
    ]);

  async function runAction(
    id: string | null,
    callback:
      () => Promise<void>,
    message: string,
  ) {
    try {
      if (id) {
        setActionId(id);
      } else {
        setGlobalBusy(true);
      }

      setError(null);
      setSuccess(null);

      await callback();

      setSuccess(message);

      await load(true);
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setActionId(null);
      setGlobalBusy(false);
    }
  }

  function handleRetry(
    item:
      EdiOutboxMessage,
  ) {
    void runAction(
      item.id,

      () =>
        ediApi.retryOutbox(
          item.id,
        ),

      `Đã đưa EDI message ${item.id} vào retry queue.`,
    );
  }

  function handleAcknowledge(
    alert:
      EdiOperationalAlert,
  ) {
    void runAction(
      alert.id,

      () =>
        ediApi.acknowledgeAlert(
          alert.id,
        ),

      'EDI incident đã được acknowledge.',
    );
  }

  function handleResolve(
    alert:
      EdiOperationalAlert,
  ) {
    void runAction(
      alert.id,

      () =>
        ediApi.resolveAlert(
          alert.id,
        ),

      'EDI incident đã được resolve.',
    );
  }

  if (
    loading &&
    outbox.length === 0
  ) {
    return (
      <div className="edi-state">
        <div className="edi-spinner" />

        <strong>
          Đang tải EDI Operations
        </strong>
      </div>
    );
  }

  return (
    <div className="edi-page">
      <div className="edi-toolbar">
        <div>
          <span>
            INTEGRATIONS
          </span>

          <h2>
            EDI Operations
          </h2>

          <p>
            CODECO delivery,
            CONTRL/APERAK,
            inbound receipts và
            operational incidents.
          </p>
        </div>

        <div className="edi-toolbar__actions">
          <button
            type="button"
            disabled={
              refreshing ||
              globalBusy
            }
            onClick={() => {
              void load(true);
            }}
          >
            ↻{' '}
            {refreshing
              ? 'Đang tải'
              : 'Làm mới'}
          </button>

          <button
            type="button"
            disabled={
              globalBusy
            }
            onClick={() => {
              void runAction(
                null,

                () =>
                  ediApi.dispatch(),

                'Đã trigger EDI dispatcher.',
              );
            }}
          >
            ▶ Dispatch
          </button>
        </div>
      </div>

      {error && (
        <div className="edi-message edi-message--error">
          <strong>!</strong>

          {error}
        </div>
      )}

      {success && (
        <div className="edi-message edi-message--success">
          <strong>✓</strong>

          {success}
        </div>
      )}

      <section className="edi-kpis">
        <article>
          <span>
            PENDING / PROCESSING
          </span>

          <strong>
            {stats.pending}
          </strong>

          <small>
            Chờ transport
          </small>
        </article>

        <article>
          <span>
            SENT
          </span>

          <strong>
            {stats.sent}
          </strong>

          <small>
            Delivery thành công
          </small>
        </article>

        <article className="edi-kpi--danger">
          <span>
            FAILED / DEAD
          </span>

          <strong>
            {stats.failed}
          </strong>

          <small>
            Cần kiểm tra transport
          </small>
        </article>

        <article className="edi-kpi--danger">
          <span>
            ACK REJECT / ERROR
          </span>

          <strong>
            {stats.rejected}
          </strong>

          <small>
            Partner application
          </small>
        </article>

        <article className="edi-kpi--warning">
          <span>
            ACTIVE ALERTS
          </span>

          <strong>
            {stats.activeAlerts}
          </strong>

          <small>
            Incident chưa resolve
          </small>
        </article>
      </section>

      <section className="edi-separation-note">
        <div>
          <strong>
            Transport Status
          </strong>

          <span>
            `SENT` = ICD đã gửi
            thành công qua
            MOCK/HTTPS/SFTP.
          </span>
        </div>

        <b>≠</b>

        <div>
          <strong>
            Application ACK
          </strong>

          <span>
            `ACCEPTED/REJECTED`
            = kết quả nghiệp vụ từ
            CONTRL/APERAK.
          </span>
        </div>
      </section>

      <section className="edi-console">
        <div className="edi-tabs">
          <button
            type="button"
            className={
              activeTab ===
              'OUTBOX'
                ? 'edi-tab edi-tab--active'
                : 'edi-tab'
            }
            onClick={() =>
              setActiveTab(
                'OUTBOX',
              )
            }
          >
            Outbox
            <span>
              {
                outbox.length
              }
            </span>
          </button>

          <button
            type="button"
            className={
              activeTab ===
              'ACK'
                ? 'edi-tab edi-tab--active'
                : 'edi-tab'
            }
            onClick={() =>
              setActiveTab(
                'ACK',
              )
            }
          >
            ACK
            <span>
              {
                acknowledgements
                  .length
              }
            </span>
          </button>

          <button
            type="button"
            className={
              activeTab ===
              'RECEIPTS'
                ? 'edi-tab edi-tab--active'
                : 'edi-tab'
            }
            onClick={() =>
              setActiveTab(
                'RECEIPTS',
              )
            }
          >
            Inbound Receipts
            <span>
              {
                receipts.length
              }
            </span>
          </button>

          <button
            type="button"
            className={
              activeTab ===
              'ALERTS'
                ? 'edi-tab edi-tab--active'
                : 'edi-tab'
            }
            onClick={() =>
              setActiveTab(
                'ALERTS',
              )
            }
          >
            Alerts
            <span>
              {
                stats.activeAlerts
              }
            </span>
          </button>
        </div>

        <div className="edi-filterbar">
          <div className="edi-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Tìm container, shipping line, reference, message..."
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
          </div>

          {activeTab ===
            'OUTBOX' && (
            <select
              value={filter}
              onChange={(
                event,
              ) =>
                setFilter(
                  event.target
                    .value,
                )
              }
            >
              <option value="ALL">
                Tất cả status
              </option>

              <option value="PENDING">
                Pending
              </option>

              <option value="PROCESSING">
                Processing
              </option>

              <option value="SENT">
                Sent
              </option>

              <option value="FAILED">
                Failed
              </option>

              <option value="DEAD">
                Dead
              </option>
            </select>
          )}

          {activeTab ===
            'ACK' && (
            <select
              value={filter}
              onChange={(
                event,
              ) =>
                setFilter(
                  event.target
                    .value,
                )
              }
            >
              <option value="ALL">
                Tất cả ACK
              </option>

              <option value="ACCEPTED">
                Accepted
              </option>

              <option value="REJECTED">
                Rejected
              </option>

              <option value="ERROR">
                Error
              </option>

              <option value="MATCHED">
                Matched
              </option>

              <option value="UNMATCHED">
                Unmatched
              </option>

              <option value="PARTY_MISMATCH">
                Party mismatch
              </option>
            </select>
          )}

          {activeTab ===
            'RECEIPTS' && (
            <>
              <select
                value={filter}
                onChange={(
                  event,
                ) =>
                  setFilter(
                    event.target
                      .value,
                  )
                }
              >
                <option value="ALL">
                  Tất cả receipt
                </option>

                <option value="PROCESSING">
                  Processing
                </option>

                <option value="PROCESSED">
                  Processed
                </option>

                <option value="QUARANTINED">
                  Quarantined
                </option>

                <option value="FAILED">
                  Failed
                </option>
              </select>

              <button
                type="button"
                className="edi-secondary-action"
                disabled={
                  globalBusy
                }
                onClick={() => {
                  void runAction(
                    null,

                    () =>
                      ediApi.pollSftp(),

                    'Đã trigger inbound SFTP poll.',
                  );
                }}
              >
                Poll SFTP
              </button>
            </>
          )}

          {activeTab ===
            'ALERTS' && (
            <>
              <select
                value={filter}
                onChange={(
                  event,
                ) =>
                  setFilter(
                    event.target
                      .value,
                  )
                }
              >
                <option value="ALL">
                  Tất cả incident
                </option>

                <option value="OPEN">
                  Open
                </option>

                <option value="ACKNOWLEDGED">
                  Acknowledged
                </option>

                <option value="RESOLVED">
                  Resolved
                </option>

                <option value="CRITICAL">
                  Critical
                </option>

                <option value="ERROR">
                  Error
                </option>

                <option value="WARNING">
                  Warning
                </option>
              </select>

              <button
                type="button"
                className="edi-secondary-action"
                disabled={
                  globalBusy
                }
                onClick={() => {
                  void runAction(
                    null,

                    () =>
                      ediApi.syncAlerts(),

                    'EDI Alerts đã sync từ source-of-truth.',
                  );
                }}
              >
                Sync Alerts
              </button>
            </>
          )}
        </div>

        {activeTab ===
          'OUTBOX' && (
          <div className="edi-table-wrapper">
            <table className="edi-table">
              <thead>
                <tr>
                  <th>
                    MESSAGE
                  </th>

                  <th>
                    CONTAINER
                  </th>

                  <th>
                    SHIPPING LINE
                  </th>

                  <th>
                    TRANSPORT
                  </th>

                  <th>
                    STATUS
                  </th>

                  <th>
                    RETRY
                  </th>

                  <th>
                    CREATED / SENT
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredOutbox.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        <strong>
                          {
                            item.messageType
                          }
                        </strong>

                        <small>
                          {item.eventType ??
                            item.outboundMessageReference ??
                            item.id}
                        </small>
                      </td>

                      <td>
                        {item.visitId &&
                        item.containerNumber ? (
                          <Link
                            to={`/containers/${encodeURIComponent(
                              item.visitId,
                            )}`}
                            className="edi-container-link"
                          >
                            {
                              item.containerNumber
                            }
                          </Link>
                        ) : (
                          item.containerNumber ??
                          '—'
                        )}
                      </td>

                      <td>
                        {item.shippingLineName ??
                          item.shippingLineCode ??
                          '—'}
                      </td>

                      <td>
                        {item.transport ??
                          '—'}
                      </td>

                      <td>
                        <StatusBadge
                          value={
                            item.status
                          }
                        />
                      </td>

                      <td>
                        <strong>
                          {
                            item.retryCount
                          }
                        </strong>

                        {item.maxRetries !==
                          null &&
                          item.maxRetries !==
                            undefined && (
                          <small>
                            /{' '}
                            {
                              item.maxRetries
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        {formatDateTime(
                          item.createdAt,
                        )}

                        {item.sentAt && (
                          <small>
                            Sent:{' '}
                            {formatDateTime(
                              item.sentAt,
                            )}
                          </small>
                        )}
                      </td>

                      <td>
                        <div className="edi-row-actions">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({
                                type:
                                  'OUTBOX',

                                value:
                                  item,
                              })
                            }
                          >
                            Detail
                          </button>

                          {(
                            item.status ===
                              'FAILED' ||
                            item.status ===
                              'DEAD'
                          ) && (
                            <button
                              type="button"
                              className="edi-row-actions__retry"
                              disabled={
                                actionId ===
                                item.id
                              }
                              onClick={() =>
                                handleRetry(
                                  item,
                                )
                              }
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab ===
          'ACK' && (
          <div className="edi-table-wrapper">
            <table className="edi-table">
              <thead>
                <tr>
                  <th>
                    TYPE
                  </th>

                  <th>
                    APPLICATION
                  </th>

                  <th>
                    CORRELATION
                  </th>

                  <th>
                    SHIPPING LINE
                  </th>

                  <th>
                    MESSAGE REF
                  </th>

                  <th>
                    ACTION / ERROR
                  </th>

                  <th>
                    RECEIVED
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredAcks.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        <strong>
                          {item.type}
                        </strong>
                      </td>

                      <td>
                        <StatusBadge
                          value={
                            item.businessStatus
                          }
                        />
                      </td>

                      <td>
                        <StatusBadge
                          value={
                            item.correlationStatus
                          }
                        />
                      </td>

                      <td>
                        {item.shippingLineName ??
                          item.shippingLineCode ??
                          '—'}
                      </td>

                      <td>
                        <strong className="edi-mono">
                          {item.acknowledgedMessageReference ??
                            item.messageReference ??
                            '—'}
                        </strong>
                      </td>

                      <td>
                        {item.actionCode ??
                          item.errorCode ??
                          '—'}

                        {item.errorMessage && (
                          <small className="edi-error-text">
                            {
                              item.errorMessage
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        {formatDateTime(
                          item.receivedAt ??
                            item.createdAt,
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="edi-detail-button"
                          onClick={() =>
                            setSelected({
                              type:
                                'ACK',

                              value:
                                item,
                            })
                          }
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab ===
          'RECEIPTS' && (
          <div className="edi-table-wrapper">
            <table className="edi-table">
              <thead>
                <tr>
                  <th>
                    FILE / SOURCE
                  </th>

                  <th>
                    SHIPPING LINE
                  </th>

                  <th>
                    TRANSPORT
                  </th>

                  <th>
                    MESSAGE
                  </th>

                  <th>
                    STATUS
                  </th>

                  <th>
                    RECEIVED
                  </th>

                  <th>
                    ERROR
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredReceipts.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                    >
                      <td>
                        <strong>
                          {item.fileName ??
                            item.id}
                        </strong>
                      </td>

                      <td>
                        {item.shippingLineName ??
                          item.shippingLineCode ??
                          '—'}
                      </td>

                      <td>
                        {item.transport ??
                          '—'}
                      </td>

                      <td>
                        {item.messageType ??
                          '—'}
                      </td>

                      <td>
                        <StatusBadge
                          value={
                            item.status
                          }
                        />
                      </td>

                      <td>
                        {formatDateTime(
                          item.receivedAt,
                        )}
                      </td>

                      <td>
                        {item.quarantineReason ??
                          item.errorMessage ??
                          '—'}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="edi-detail-button"
                          onClick={() =>
                            setSelected({
                              type:
                                'RECEIPT',

                              value:
                                item,
                            })
                          }
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab ===
          'ALERTS' && (
          <div className="edi-alert-list">
            {filteredAlerts.length ===
            0 ? (
              <div className="edi-empty">
                <span>✓</span>

                <strong>
                  Không có EDI
                  incident phù hợp
                </strong>
              </div>
            ) : (
              filteredAlerts.map(
                (alert) => (
                  <article
                    key={
                      alert.id
                    }
                    className={[
                      'edi-alert-card',
                      `edi-alert-card--${severityTone(
                        alert.severity,
                      )}`,
                    ].join(
                      ' ',
                    )}
                  >
                    <div className="edi-alert-card__severity">
                      <StatusBadge
                        value={
                          alert.severity
                        }
                        severity
                      />

                      <span>
                        ×
                        {
                          alert.occurrenceCount
                        }
                      </span>
                    </div>

                    <div className="edi-alert-card__main">
                      <div>
                        <strong>
                          {
                            alert.title
                          }
                        </strong>

                        {alert.code && (
                          <span className="edi-mono">
                            {
                              alert.code
                            }
                          </span>
                        )}
                      </div>

                      <p>
                        {alert.message ??
                          'EDI operational incident'}
                      </p>

                      <div className="edi-alert-card__meta">
                        <span>
                          Source:{' '}
                          {alert.sourceType ??
                            '—'}
                        </span>

                        <span>
                          Container:{' '}
                          {alert.containerNumber ??
                            '—'}
                        </span>

                        <span>
                          Shipping Line:{' '}
                          {alert.shippingLineName ??
                            '—'}
                        </span>

                        <span>
                          Last seen:{' '}
                          {formatDateTime(
                            alert.lastSeenAt,
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="edi-alert-card__status">
                      <StatusBadge
                        value={
                          alert.status
                        }
                      />
                    </div>

                    <div className="edi-alert-card__actions">
                      <button
                        type="button"
                        onClick={() =>
                          setSelected({
                            type:
                              'ALERT',

                            value:
                              alert,
                          })
                        }
                      >
                        Detail
                      </button>

                      {alert.status ===
                        'OPEN' && (
                        <button
                          type="button"
                          disabled={
                            actionId ===
                            alert.id
                          }
                          onClick={() =>
                            handleAcknowledge(
                              alert,
                            )
                          }
                        >
                          Acknowledge
                        </button>
                      )}

                      {alert.status !==
                        'RESOLVED' && (
                        <button
                          type="button"
                          className="edi-alert-card__resolve"
                          disabled={
                            actionId ===
                            alert.id
                          }
                          onClick={() =>
                            handleResolve(
                              alert,
                            )
                          }
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </article>
                ),
              )
            )}
          </div>
        )}
      </section>

      {selected && (
        <div
          className="edi-detail-backdrop"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelected(
                null,
              );
            }
          }}
        >
          <div className="edi-detail-panel">
            <div className="edi-detail-panel__heading">
              <div>
                <span>
                  EDI DETAIL
                </span>

                <h3>
                  {selected.type}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelected(
                    null,
                  )
                }
              >
                ×
              </button>
            </div>

            {selected.type ===
              'OUTBOX' && (
              <>
                <div className="edi-detail-summary">
                  <div>
                    <span>
                      Message
                    </span>

                    <strong>
                      {
                        selected.value
                          .messageType
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Status
                    </span>

                    <StatusBadge
                      value={
                        selected.value
                          .status
                      }
                    />
                  </div>

                  <div>
                    <span>
                      Transport
                    </span>

                    <strong>
                      {selected.value
                        .transport ??
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Retry
                    </span>

                    <strong>
                      {
                        selected.value
                          .retryCount
                      }
                    </strong>
                  </div>
                </div>

                <section className="edi-detail-section">
                  <strong>
                    References
                  </strong>

                  <pre>
                    {jsonText({
                      id:
                        selected.value
                          .id,

                      idempotencyKey:
                        selected.value
                          .idempotencyKey,

                      interchangeReference:
                        selected.value
                          .outboundInterchangeReference,

                      messageReference:
                        selected.value
                          .outboundMessageReference,

                      externalReference:
                        selected.value
                          .externalReference,

                      responseStatus:
                        selected.value
                          .responseStatus,
                    })}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Last Error /
                    Response
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .lastError ??
                        selected.value
                          .responseBody,
                    )}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Routing Snapshot
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .routingSnapshot,
                    )}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Canonical Payload
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .payload,
                    )}
                  </pre>
                </section>
              </>
            )}

            {selected.type ===
              'ACK' && (
              <>
                <div className="edi-detail-summary">
                  <div>
                    <span>
                      Type
                    </span>

                    <strong>
                      {
                        selected.value
                          .type
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Application
                    </span>

                    <StatusBadge
                      value={
                        selected.value
                          .businessStatus
                      }
                    />
                  </div>

                  <div>
                    <span>
                      Correlation
                    </span>

                    <StatusBadge
                      value={
                        selected.value
                          .correlationStatus
                      }
                    />
                  </div>
                </div>

                <section className="edi-detail-section">
                  <strong>
                    Correlation
                  </strong>

                  <pre>
                    {jsonText({
                      outboxMessageId:
                        selected.value
                          .outboxMessageId,

                      receivedInterchange:
                        selected.value
                          .interchangeReference,

                      receivedMessage:
                        selected.value
                          .messageReference,

                      acknowledgedInterchange:
                        selected.value
                          .acknowledgedInterchangeReference,

                      acknowledgedMessage:
                        selected.value
                          .acknowledgedMessageReference,

                      actionCode:
                        selected.value
                          .actionCode,

                      errorCode:
                        selected.value
                          .errorCode,

                      errorMessage:
                        selected.value
                          .errorMessage,
                    })}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Parsed
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .parsed,
                    )}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Raw CONTRL /
                    APERAK
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .rawContent,
                    )}
                  </pre>
                </section>
              </>
            )}

            {selected.type ===
              'RECEIPT' && (
              <>
                <div className="edi-detail-summary">
                  <div>
                    <span>
                      Status
                    </span>

                    <StatusBadge
                      value={
                        selected.value
                          .status
                      }
                    />
                  </div>

                  <div>
                    <span>
                      Transport
                    </span>

                    <strong>
                      {selected.value
                        .transport ??
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <span>
                      File
                    </span>

                    <strong>
                      {selected.value
                        .fileName ??
                        '—'}
                    </strong>
                  </div>
                </div>

                <section className="edi-detail-section">
                  <strong>
                    Receipt Metadata
                  </strong>

                  <pre>
                    {jsonText({
                      contentHash:
                        selected.value
                          .contentHash,

                      receivedAt:
                        selected.value
                          .receivedAt,

                      processedAt:
                        selected.value
                          .processedAt,

                      archivedAt:
                        selected.value
                          .archivedAt,

                      quarantineReason:
                        selected.value
                          .quarantineReason,

                      errorMessage:
                        selected.value
                          .errorMessage,
                    })}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Parsed
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .parsed,
                    )}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Raw Content
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .rawContent,
                    )}
                  </pre>
                </section>
              </>
            )}

            {selected.type ===
              'ALERT' && (
              <>
                <div className="edi-detail-summary">
                  <div>
                    <span>
                      Severity
                    </span>

                    <StatusBadge
                      value={
                        selected.value
                          .severity
                      }
                      severity
                    />
                  </div>

                  <div>
                    <span>
                      Lifecycle
                    </span>

                    <StatusBadge
                      value={
                        selected.value
                          .status
                      }
                    />
                  </div>

                  <div>
                    <span>
                      Occurrences
                    </span>

                    <strong>
                      {
                        selected.value
                          .occurrenceCount
                      }
                    </strong>
                  </div>
                </div>

                <section className="edi-detail-section">
                  <strong>
                    Incident
                  </strong>

                  <pre>
                    {jsonText({
                      id:
                        selected.value
                          .id,

                      code:
                        selected.value
                          .code,

                      title:
                        selected.value
                          .title,

                      message:
                        selected.value
                          .message,

                      sourceType:
                        selected.value
                          .sourceType,

                      sourceId:
                        selected.value
                          .sourceId,

                      fingerprint:
                        selected.value
                          .fingerprint,

                      firstSeenAt:
                        selected.value
                          .firstSeenAt,

                      lastSeenAt:
                        selected.value
                          .lastSeenAt,

                      acknowledgedAt:
                        selected.value
                          .acknowledgedAt,

                      resolvedAt:
                        selected.value
                          .resolvedAt,
                    })}
                  </pre>
                </section>

                <section className="edi-detail-section">
                  <strong>
                    Context
                  </strong>

                  <pre>
                    {jsonText(
                      selected.value
                        .context,
                    )}
                  </pre>
                </section>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EdiOperationsPage;

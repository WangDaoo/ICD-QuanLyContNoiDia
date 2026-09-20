import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  gatePassApi,
} from '../api/gate-pass.api';

import {
  GatePassReadinessPanel,
} from '../components/GatePassReadinessPanel';

import type {
  GateOutResult,
  GatePassScanResult,
} from '../gate-pass.types';

import './GatePass.css';

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

  return 'Không thể xử lý Gate-out.';
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

  return date.toLocaleString(
    'vi-VN',
  );
}

export function GateOutPage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const navigate =
    useNavigate();

  const [
    scanValue,
    setScanValue,
  ] =
    useState(
      searchParams.get(
        'code',
      ) ?? '',
    );

  const [
    scanned,
    setScanned,
  ] =
    useState<
      GatePassScanResult | null
    >(null);

  const [
    result,
    setResult,
  ] =
    useState<
      GateOutResult | null
    >(null);

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  async function handleScan(
    event?:
      FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    if (
      !scanValue.trim()
    ) {
      setError(
        'Vui lòng quét QR hoặc nhập Gate Pass code.',
      );

      return;
    }

    try {
      setScanning(true);
      setError(null);
      setScanned(null);

      const scanResult =
        await gatePassApi.scan(
          scanValue,
        );

      setScanned(
        scanResult,
      );
    } catch (
      scanError
    ) {
      setError(
        getErrorMessage(
          scanError,
        ),
      );
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    if (
      scanValue.trim()
    ) {
      void handleScan();
    }
    // Chỉ auto scan lúc mở page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGateOut() {
    if (!scanned) {
      return;
    }

    if (
      scanned.gatePass.status !==
      'ACTIVE'
    ) {
      setError(
        `Gate Pass đang ở trạng thái ${scanned.gatePass.status}.`,
      );

      return;
    }

    if (
      scanned.readiness &&
      !scanned.readiness.ready
    ) {
      setError(
        'Container hiện có blocker. Không thể Gate-out.',
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Xác nhận Gate-out container ${
          scanned.containerNumber ??
          scanned.visitId
        }?\n\nThao tác này sẽ chuyển Container Visit sang EXITED.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const gateOutResult =
        await gatePassApi.gateOut(
          {
            gatePassId:
              scanned.gatePass.id,

            scanValue:
              scanValue.trim(),
          },
        );

      setResult(
        gateOutResult,
      );
    } catch (
      gateOutError
    ) {
      setError(
        getErrorMessage(
          gateOutError,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="gate-out-success">
        <div className="gate-out-success__icon">
          ✓
        </div>

        <span>
          GATE-OUT COMPLETED
        </span>

        <h2>
          Container đã rời ICD
        </h2>

        <p>
          Container{' '}
          <strong>
            {result.containerNumber ??
              scanned?.containerNumber ??
              result.visitId}
          </strong>{' '}
          đã chuyển sang trạng thái{' '}
          <strong>
            {
              result.containerStatus
            }
          </strong>.
        </p>

        <div className="gate-out-success__summary">
          <div>
            <span>
              Gate Pass
            </span>

            <strong>
              {result.gatePassStatus ??
                'USED'}
            </strong>
          </div>

          <div>
            <span>
              Gate-out At
            </span>

            <strong>
              {formatDateTime(
                result.gateOutAt,
              )}
            </strong>
          </div>
        </div>

        <div className="gate-out-success__actions">
          <button
            type="button"
            onClick={() =>
              navigate(
                '/gate-out',
                {
                  replace: true,
                },
              )
            }
          >
            Scan container khác
          </button>

          <Link
            to={`/containers/${encodeURIComponent(
              result.visitId,
            )}`}
          >
            Container Detail →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="gate-out-page">
      <div className="gate-out-toolbar">
        <div>
          <span>
            GATE OPERATIONS
          </span>

          <h2>
            Gate-out
          </h2>

          <p>
            Scan QR Phiếu ra cổng,
            kiểm tra lại trạng thái và
            xác nhận container rời ICD.
          </p>
        </div>

        <Link
          to="/gate-pass"
        >
          Phiếu ra cổng →
        </Link>
      </div>

      {error && (
        <div className="gate-pass-message gate-pass-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <form
        className="gate-out-scan"
        onSubmit={(
          event,
        ) => {
          void handleScan(
            event,
          );
        }}
      >
        <div className="gate-out-scan__visual">
          <span>▦</span>

          <strong>
            QR SCANNER
          </strong>

          <small>
            Web hỗ trợ scanner dạng
            keyboard wedge hoặc nhập
            token/code thủ công.
          </small>
        </div>

        <div className="gate-out-scan__input">
          <label>
            <span>
              QR Token / Gate Pass
              Code
            </span>

            <input
              autoFocus
              type="text"
              value={
                scanValue
              }
              disabled={
                scanning ||
                submitting
              }
              placeholder="Scan QR hoặc nhập GP-..."
              onChange={(
                event,
              ) => {
                setScanValue(
                  event.target
                    .value,
                );

                setScanned(null);
                setError(null);
              }}
            />
          </label>

          <button
            type="submit"
            disabled={
              scanning ||
              !scanValue.trim()
            }
          >
            {scanning
              ? 'Đang kiểm tra...'
              : 'Kiểm tra Gate Pass'}
          </button>
        </div>
      </form>

      {scanned && (
        <>
          <section className="gate-out-pass">
            <div className="gate-out-pass__header">
              <div>
                <span>
                  GATE PASS
                </span>

                <h3>
                  {scanned.gatePass
                    .code ??
                    scanned.gatePass
                      .id}
                </h3>
              </div>

              <strong>
                {
                  scanned.gatePass
                    .status
                }
              </strong>
            </div>

            <div className="gate-out-pass__grid">
              <div>
                <span>
                  Container
                </span>

                <strong>
                  {scanned.containerNumber ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Container Status
                </span>

                <strong>
                  {scanned.containerStatus ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Yard Position
                </span>

                <strong>
                  {scanned.yardPosition ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Xe lấy hàng
                </span>

                <strong>
                  {scanned.gatePass
                    .vehiclePlate ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Người nhận
                </span>

                <strong>
                  {scanned.gatePass
                    .receiverName ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  CMND/CCCD
                </span>

                <strong>
                  {scanned.gatePass
                    .receiverIdNumber ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Hết hạn
                </span>

                <strong>
                  {formatDateTime(
                    scanned.gatePass
                      .expiresAt,
                  )}
                </strong>
              </div>
            </div>
          </section>

          {scanned.readiness && (
            <GatePassReadinessPanel
              readiness={
                scanned.readiness
              }
            />
          )}

          <section className="gate-out-confirm">
            <div>
              <strong>
                Xác nhận Gate-out
              </strong>

              <p>
                Backend sẽ re-check
                Gate Pass, billing,
                Yard Operations,
                Inspection và
                Operational Hold ngay
                trước transaction.
              </p>
            </div>

            <button
              type="button"
              disabled={
                submitting ||
                scanned.gatePass
                  .status !==
                  'ACTIVE' ||
                (
                  scanned.readiness !==
                    null &&
                  scanned.readiness !==
                    undefined &&
                  !scanned.readiness
                    .ready
                )
              }
              onClick={() => {
                void handleGateOut();
              }}
            >
              {submitting
                ? 'Đang Gate-out...'
                : 'Xác nhận Container rời ICD'}
            </button>
          </section>
        </>
      )}
    </div>
  );
}

export default GateOutPage;

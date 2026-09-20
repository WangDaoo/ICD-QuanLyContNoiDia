import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  manifestApi,
} from '../api/manifest.api';

import {
  ManifestTree,
} from '../components/ManifestTree';

import type {
  ManifestDetail,
} from '../manifest.types';

import './Manifests.css';

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
    },
  ).format(date);
}

function InfoRow({
  label,
  value,
}: {
  label: string;

  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div className="manifest-info-row">
      <span>
        {label}
      </span>

      <strong>
        {value ?? '—'}
      </strong>
    </div>
  );
}

export function ManifestDetailPage() {
  const params =
    useParams<{
      manifestId: string;
    }>();

  const navigate =
    useNavigate();

  const manifestId =
    params.manifestId;

  const [
    detail,
    setDetail,
  ] =
    useState<
      ManifestDetail | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const load =
    useCallback(
      async () => {
        if (!manifestId) {
          return;
        }

        try {
          setLoading(true);
          setError(null);

          setDetail(
            await manifestApi.getDetail(
              manifestId,
            ),
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Không thể tải Manifest.',
          );
        } finally {
          setLoading(false);
        }
      },
      [manifestId],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const counts =
    useMemo(() => {
      if (!detail) {
        return {
          mbl: 0,
          hbl: 0,
          containers: 0,
        };
      }

      const hbl =
        detail.masterBls.reduce(
          (
            total,
            mbl,
          ) =>
            total +
            mbl.houseBls.length,
          0,
        );

      const containers =
        detail.masterBls.reduce(
          (
            total,
            mbl,
          ) =>
            total +
            mbl.houseBls.reduce(
              (
                hblTotal,
                houseBl,
              ) =>
                hblTotal +
                houseBl
                  .containers
                  .length,
              0,
            ),
          0,
        );

      return {
        mbl:
          detail.masterBls
            .length,

        hbl,
        containers,
      };
    }, [detail]);

  if (
    loading &&
    !detail
  ) {
    return (
      <div className="manifest-state">
        <div className="manifest-spinner" />

        <strong>
          Đang tải Manifest
        </strong>
      </div>
    );
  }

  if (
    error &&
    !detail
  ) {
    return (
      <div className="manifest-state">
        <strong>
          Không thể tải Manifest
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  return (
    <div className="manifest-detail-page">
      <div className="manifest-detail-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/manifests',
            )
          }
        >
          ← Manifest
        </button>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
        >
          ↻ Làm mới
        </button>
      </div>

      <section className="manifest-hero">
        <div>
          <span>
            MANIFEST
          </span>

          <h2>
            {
              detail.manifestNumber
            }
          </h2>

          <p>
            {[
              detail.vesselName,
              detail.voyageNumber,
              detail.shippingLineName,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="manifest-hero__status">
          <span>
            TRẠNG THÁI
          </span>

          <strong>
            {detail.status}
          </strong>
        </div>
      </section>

      <div className="manifest-detail-grid">
        <main className="manifest-detail-main">
          <section className="manifest-card">
            <div className="manifest-card__heading">
              <div>
                <span>
                  DOCUMENT TREE
                </span>

                <h3>
                  Master BL → House BL
                  → Container
                </h3>
              </div>

              <div className="manifest-tree-summary">
                <span>
                  {counts.mbl}{' '}
                  MBL
                </span>

                <span>
                  {counts.hbl}{' '}
                  HBL
                </span>

                <span>
                  {counts.containers}{' '}
                  Container
                </span>
              </div>
            </div>

            <ManifestTree
              masterBls={
                detail.masterBls
              }
            />
          </section>
        </main>

        <aside className="manifest-detail-sidebar">
          <section className="manifest-card">
            <div className="manifest-card__heading">
              <div>
                <span>
                  MANIFEST INFO
                </span>

                <h3>
                  Thông tin chuyến
                </h3>
              </div>
            </div>

            <InfoRow
              label="Manifest No."
              value={
                detail.manifestNumber
              }
            />

            <InfoRow
              label="Shipping Line"
              value={
                detail.shippingLineName
              }
            />

            <InfoRow
              label="Vessel"
              value={
                detail.vesselName
              }
            />

            <InfoRow
              label="Voyage"
              value={
                detail.voyageNumber
              }
            />

            <InfoRow
              label="ETA"
              value={formatDateTime(
                detail.eta,
              )}
            />

            <InfoRow
              label="ATA"
              value={formatDateTime(
                detail.ata,
              )}
            />
          </section>

          <section className="manifest-card">
            <div className="manifest-card__heading">
              <div>
                <span>
                  RECORD
                </span>

                <h3>
                  Metadata
                </h3>
              </div>
            </div>

            <InfoRow
              label="Created"
              value={formatDateTime(
                detail.createdAt,
              )}
            />

            <InfoRow
              label="Updated"
              value={formatDateTime(
                detail.updatedAt,
              )}
            />

            <InfoRow
              label="Status"
              value={
                detail.status
              }
            />
          </section>

          {detail.notes && (
            <section className="manifest-card">
              <div className="manifest-card__heading">
                <div>
                  <span>
                    NOTES
                  </span>

                  <h3>
                    Ghi chú
                  </h3>
                </div>
              </div>

              <p className="manifest-notes">
                {
                  detail.notes
                }
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default ManifestDetailPage;

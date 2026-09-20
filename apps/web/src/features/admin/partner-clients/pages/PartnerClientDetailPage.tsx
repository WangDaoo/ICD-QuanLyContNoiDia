import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
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

export function PartnerClientDetailPage() {
  const params =
    useParams<{
      clientId: string;
    }>();

  const navigate =
    useNavigate();

  const clientId =
    params.clientId;

  const [
    client,
    setClient,
  ] =
    useState<
      PartnerApiClient | null
    >(null);

  const [
    reveal,
    setReveal,
  ] =
    useState<
      PartnerApiKeyReveal | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busy,
    setBusy,
  ] = useState(false);

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
        if (!clientId) {
          return;
        }

        try {
          setLoading(true);
          setError(null);

          setClient(
            await partnerClientApi.getById(
              clientId,
            ),
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Không thể tải Partner Client.',
          );
        } finally {
          setLoading(false);
        }
      },
      [clientId],
    );

  useEffect(() => {
    void load();
  }, [load]);

  async function rotate() {
    if (!client) {
      return;
    }

    if (
      !window.confirm(
        `Rotate key của ${client.partnerName}?`,
      )
    ) {
      return;
    }

    try {
      setBusy(true);

      const result =
        await partnerClientApi.rotate(
          client.id,
        );

      setReveal(
        result,
      );

      await load();
    } catch (
      rotateError
    ) {
      setError(
        rotateError instanceof
          Error
          ? rotateError.message
          : 'Không thể rotate key.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!client) {
      return;
    }

    if (
      !window.confirm(
        'Revoke sẽ chặn ngay request mới của Partner. Tiếp tục?',
      )
    ) {
      return;
    }

    try {
      setBusy(true);

      await partnerClientApi.revoke(
        client.id,
      );

      await load();
    } catch (
      revokeError
    ) {
      setError(
        revokeError instanceof
          Error
          ? revokeError.message
          : 'Không thể revoke client.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="partner-admin-state">
        <div className="partner-admin-spinner" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="partner-admin-state">
        <strong>
          Không tìm thấy Partner API Client
        </strong>

        <span>
          {error}
        </span>
      </div>
    );
  }

  return (
    <div className="partner-admin-page">
      <div className="partner-admin-detail-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/admin/partner-clients',
            )
          }
        >
          ← Partner Clients
        </button>

        <div>
          {client.status ===
            'ACTIVE' && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void rotate();
                }}
              >
                Rotate Key
              </button>

              <button
                type="button"
                className="partner-danger-button"
                disabled={busy}
                onClick={() => {
                  void revoke();
                }}
              >
                Revoke
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="partner-admin-message partner-admin-message--error">
          {error}
        </div>
      )}

      <section className="partner-client-hero">
        <div>
          <span>
            PARTNER API CLIENT
          </span>

          <h2>
            {
              client.partnerName
            }
          </h2>

          <p>
            {
              client.partnerCode
            }
          </p>
        </div>

        <div>
          <span>
            KEY
          </span>

          <code>
            ****
            {client.keyLast4 ??
              '----'}
          </code>
        </div>

        <div>
          <span>
            STATUS
          </span>

          <strong>
            {client.status}
          </strong>
        </div>
      </section>

      <div className="partner-client-detail-grid">
        <section className="partner-admin-panel partner-admin-card">
          <h3>
            Scopes
          </h3>

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
        </section>

        <section className="partner-admin-panel partner-admin-card">
          <h3>
            Security Metadata
          </h3>

          <dl>
            <div>
              <dt>
                Created
              </dt>

              <dd>
                {formatDateTime(
                  client.createdAt,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Last rotation
              </dt>

              <dd>
                {formatDateTime(
                  client.rotatedAt,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Revoked
              </dt>

              <dd>
                {formatDateTime(
                  client.revokedAt,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Last request
              </dt>

              <dd>
                {formatDateTime(
                  client.lastRequestAt,
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="partner-admin-security-note">
        <strong>
          Plaintext API Key không tồn tại trên màn này.
        </strong>

        <p>
          ICD chỉ lưu hash và
          last4. Nếu Partner làm
          mất key, phải Rotate để
          cấp key mới.
        </p>
      </section>

      <Link
        className="partner-log-link"
        to={`/admin/partner-api-logs?partnerApiClientId=${encodeURIComponent(
          client.id,
        )}`}
      >
        Xem Partner API Logs →
      </Link>

      {reveal && (
        <ApiKeyRevealModal
          apiKey={
            reveal.apiKey
          }
          partnerName={
            reveal.client.partnerName
          }
          action="ROTATE"
          onClose={() =>
            setReveal(null)
          }
        />
      )}
    </div>
  );
}

export default PartnerClientDetailPage;

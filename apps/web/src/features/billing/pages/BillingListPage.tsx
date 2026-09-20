import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  containerApi,
} from '../../containers/api/container.api';

import type {
  ContainerListItem,
} from '../../containers/container.types';

import './Billing.css';

export function BillingListPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  const [
    items,
    setItems,
  ] =
    useState<
      ContainerListItem[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState('');

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

  const requestedVisitId =
    searchParams.get(
      'visitId',
    );

  useEffect(() => {
    if (
      requestedVisitId
    ) {
      navigate(
        `/billing/${encodeURIComponent(
          requestedVisitId,
        )}`,
        {
          replace: true,
        },
      );
    }
  }, [
    requestedVisitId,
    navigate,
  ]);

  const load =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          const containers =
            await containerApi.list();

          setItems(
            containers.filter(
              (item) =>
                item.status ===
                  'IN_YARD' ||
                item.status ===
                  'GATE_PASS_ISSUED' ||
                item.status ===
                  'EXITED',
            ),
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Không thể tải Billing.',
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

      if (!needle) {
        return items;
      }

      return items.filter(
        (item) =>
          [
            item.containerNumber,
            item.consigneeName,
            item.hblNumber,
            item.mblNumber,
          ].some(
            (value) =>
              value
                ?.toUpperCase()
                .includes(
                  needle,
                ) ?? false,
          ),
      );
    }, [
      items,
      search,
    ]);

  if (loading) {
    return (
      <div className="billing-state">
        <div className="billing-spinner" />

        <strong>
          Đang tải Billing
        </strong>
      </div>
    );
  }

  return (
    <div className="billing-page">
      <div className="billing-toolbar">
        <div>
          <h2>
            Billing
          </h2>

          <p>
            Service Order, Invoice
            và Payment của container.
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
        <div className="billing-message billing-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <section className="billing-list-panel">
        <div className="billing-list-search">
          <span>⌕</span>

          <input
            type="search"
            placeholder="Container, consignee, HBL, MBL..."
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
          />

          <small>
            {filtered.length}
            {' container'}
          </small>
        </div>

        <div className="billing-container-list">
          {filtered.map(
            (item) => (
              <article
                key={
                  item.visitId
                }
              >
                <div>
                  <strong>
                    {
                      item.containerNumber
                    }
                  </strong>

                  <span>
                    {[
                      item.size,
                      item.type,
                      item.consigneeName,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>

                <span className="billing-container-status">
                  {item.status}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/billing/${encodeURIComponent(
                        item.visitId,
                      )}`,
                    )
                  }
                >
                  Billing →
                </button>
              </article>
            ),
          )}
        </div>
      </section>
    </div>
  );
}

export default BillingListPage;

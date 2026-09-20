import {
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import type {
  ManifestMasterBl,
} from '../manifest.types';

type ManifestTreeProps = {
  masterBls:
    ManifestMasterBl[];
};

export function ManifestTree({
  masterBls,
}: ManifestTreeProps) {
  const [
    expandedMbl,
    setExpandedMbl,
  ] =
    useState<
      Record<string, boolean>
    >({});

  const [
    expandedHbl,
    setExpandedHbl,
  ] =
    useState<
      Record<string, boolean>
    >({});

  if (
    masterBls.length === 0
  ) {
    return (
      <div className="manifest-tree-empty">
        <span>▤</span>

        <strong>
          Chưa có Bill of Lading
        </strong>

        <small>
          MBL/HBL sẽ xuất hiện
          tại đây khi được khai
          báo cho Manifest.
        </small>
      </div>
    );
  }

  return (
    <div className="manifest-tree">
      {masterBls.map(
        (mbl) => {
          const mblOpen =
            expandedMbl[
              mbl.id
            ] ?? true;

          return (
            <div
              key={mbl.id}
              className="manifest-tree__mbl"
            >
              <button
                type="button"
                className="manifest-tree__node manifest-tree__node--mbl"
                onClick={() =>
                  setExpandedMbl(
                    (
                      current,
                    ) => ({
                      ...current,

                      [mbl.id]:
                        !mblOpen,
                    }),
                  )
                }
              >
                <span className="manifest-tree__toggle">
                  {mblOpen
                    ? '−'
                    : '+'}
                </span>

                <span className="manifest-tree__node-icon">
                  M
                </span>

                <div>
                  <strong>
                    {
                      mbl.number
                    }
                  </strong>

                  <small>
                    Master Bill
                    of Lading
                    {mbl.shippingLineName
                      ? ` · ${mbl.shippingLineName}`
                      : ''}
                  </small>
                </div>

                <span className="manifest-tree__count">
                  {
                    mbl
                      .houseBls
                      .length
                  }{' '}
                  HBL
                </span>
              </button>

              {mblOpen && (
                <div className="manifest-tree__children">
                  {mbl.houseBls
                    .length ===
                  0 ? (
                    <div className="manifest-tree__placeholder">
                      Chưa có House
                      BL.
                    </div>
                  ) : (
                    mbl.houseBls.map(
                      (hbl) => {
                        const hblOpen =
                          expandedHbl[
                            hbl.id
                          ] ??
                          true;

                        return (
                          <div
                            key={
                              hbl.id
                            }
                            className="manifest-tree__hbl"
                          >
                            <button
                              type="button"
                              className="manifest-tree__node manifest-tree__node--hbl"
                              onClick={() =>
                                setExpandedHbl(
                                  (
                                    current,
                                  ) => ({
                                    ...current,

                                    [hbl.id]:
                                      !hblOpen,
                                  }),
                                )
                              }
                            >
                              <span className="manifest-tree__toggle">
                                {hblOpen
                                  ? '−'
                                  : '+'}
                              </span>

                              <span className="manifest-tree__node-icon">
                                H
                              </span>

                              <div>
                                <strong>
                                  {
                                    hbl.number
                                  }
                                </strong>

                                <small>
                                  {hbl.consigneeName ??
                                    'House Bill of Lading'}
                                </small>
                              </div>

                              <span className="manifest-tree__count">
                                {
                                  hbl
                                    .containers
                                    .length
                                }{' '}
                                cont
                              </span>
                            </button>

                            {hblOpen && (
                              <div className="manifest-tree__containers">
                                {hbl.containers
                                  .length ===
                                0 ? (
                                  <div className="manifest-tree__placeholder">
                                    Chưa
                                    có
                                    container.
                                  </div>
                                ) : (
                                  hbl.containers.map(
                                    (
                                      container,
                                    ) => (
                                      <div
                                        key={
                                          container.id
                                        }
                                        className="manifest-tree__container"
                                      >
                                        <span className="manifest-tree__container-icon">
                                          ▣
                                        </span>

                                        <div>
                                          {container.visitId ? (
                                            <Link
                                              to={`/containers/${encodeURIComponent(
                                                container.visitId,
                                              )}`}
                                            >
                                              {
                                                container.containerNumber
                                              }
                                            </Link>
                                          ) : (
                                            <strong>
                                              {
                                                container.containerNumber
                                              }
                                            </strong>
                                          )}

                                          <small>
                                            {[
                                              container.size,
                                              container.type,
                                              container.isoCode,
                                            ]
                                              .filter(
                                                Boolean,
                                              )
                                              .join(
                                                ' · ',
                                              ) ||
                                              'Container'}
                                          </small>
                                        </div>

                                        {container.status && (
                                          <span className="manifest-tree__status">
                                            {
                                              container.status
                                            }
                                          </span>
                                        )}
                                      </div>
                                    ),
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )
                  )}
                </div>
              )}
            </div>
          );
        },
      )}
    </div>
  );
}
export default ManifestTree;

import type {
  GatePassBlockerCode,
  GatePassReadiness,
} from '../gate-pass.types';

type GatePassReadinessPanelProps = {
  readiness:
    GatePassReadiness;
};

type ReadinessCheck = {
  label: string;

  blockerCodes:
    GatePassBlockerCode[];
};

const CHECKS:
  ReadinessCheck[] = [
    {
      label:
        'Container đang IN_YARD',

      blockerCodes: [
        'CONTAINER_NOT_IN_YARD',
      ],
    },
    {
      label:
        'Đã có Yard Position',

      blockerCodes: [
        'NO_YARD_POSITION',
      ],
    },
    {
      label:
        'Billing hoàn tất',

      blockerCodes: [
        'NO_BILLING',
        'BILLING_INCOMPLETE',
        'BILLING_CONFIGURATION_MISSING',
        'UNBILLED_SERVICES',
      ],
    },
    {
      label:
        'Không có Yard Operation active',

      blockerCodes: [
        'ACTIVE_YARD_OPERATION',
      ],
    },
    {
      label:
        'Không có Inspection HOLD',

      blockerCodes: [
        'INSPECTION_HOLD',
      ],
    },
    {
      label:
        'Không có Operational Hold',

      blockerCodes: [
        'OPERATIONAL_HOLD',
      ],
    },
  ];

function getBlockerLabel(
  code: string,
): string {
  switch (code) {
    case 'CONTAINER_NOT_IN_YARD':
      return 'Container chưa ở trạng thái IN_YARD.';

    case 'NO_YARD_POSITION':
      return 'Container chưa có vị trí Yard hợp lệ.';

    case 'NO_BILLING':
      return 'Container chưa có Billing flow.';

    case 'BILLING_INCOMPLETE':
      return 'Billing chưa hoàn tất thanh toán.';

    case 'BILLING_CONFIGURATION_MISSING':
      return 'Thiếu cấu hình tariff/service pricing.';

    case 'UNBILLED_SERVICES':
      return 'Còn dịch vụ phát sinh chưa được bill.';

    case 'ACTIVE_YARD_OPERATION':
      return 'Còn Yard Operation đang active.';

    case 'INSPECTION_HOLD':
      return 'Container có Inspection HOLD.';

    case 'OPERATIONAL_HOLD':
      return 'Container có Operational Hold active.';

    default:
      return code;
  }
}

export function GatePassReadinessPanel({
  readiness,
}: GatePassReadinessPanelProps) {
  const blockerCodes =
    new Set(
      readiness.blockers.map(
        (blocker) =>
          blocker.code,
      ),
    );

  const knownCodes =
    new Set(
      CHECKS.flatMap(
        (check) =>
          check.blockerCodes,
      ),
    );

  const unknownBlockers =
    readiness.blockers.filter(
      (blocker) =>
        !knownCodes.has(
          blocker.code,
        ),
    );

  return (
    <section
      className={[
        'gate-pass-readiness',
        readiness.ready
          ? 'gate-pass-readiness--ready'
          : 'gate-pass-readiness--blocked',
      ].join(' ')}
    >
      <div className="gate-pass-readiness__heading">
        <div>
          <span>
            READINESS CHECK
          </span>

          <h3>
            Điều kiện cấp Phiếu
            ra cổng
          </h3>
        </div>

        <strong>
          {readiness.ready
            ? 'READY'
            : 'BLOCKED'}
        </strong>
      </div>

      <div className="gate-pass-readiness__checks">
        {CHECKS.map(
          (check) => {
            const failedCodes =
              check.blockerCodes.filter(
                (code) =>
                  blockerCodes.has(
                    code,
                  ),
              );

            const passed =
              failedCodes.length ===
              0;

            return (
              <article
                key={
                  check.label
                }
                className={
                  passed
                    ? 'gate-pass-check gate-pass-check--pass'
                    : 'gate-pass-check gate-pass-check--fail'
                }
              >
                <span>
                  {passed
                    ? '✓'
                    : '×'}
                </span>

                <div>
                  <strong>
                    {check.label}
                  </strong>

                  {!passed && (
                    <small>
                      {failedCodes
                        .map(
                          getBlockerLabel,
                        )
                        .join(' ')}
                    </small>
                  )}
                </div>
              </article>
            );
          },
        )}
      </div>

      {readiness.blockers.length >
        0 && (
        <div className="gate-pass-blockers">
          <strong>
            Blockers backend
          </strong>

          {readiness.blockers.map(
            (
              blocker,
              index,
            ) => (
              <article
                key={`${blocker.code}-${index}`}
              >
                <span>
                  {
                    blocker.code
                  }
                </span>

                <p>
                  {blocker.message ??
                    getBlockerLabel(
                      blocker.code,
                    )}
                </p>
              </article>
            ),
          )}
        </div>
      )}

      {unknownBlockers.length >
        0 && (
        <small className="gate-pass-readiness__note">
          Có blocker bổ sung từ
          backend ngoài nhóm UI
          chuẩn. Frontend không tự
          bỏ qua blocker này.
        </small>
      )}
    </section>
  );
}

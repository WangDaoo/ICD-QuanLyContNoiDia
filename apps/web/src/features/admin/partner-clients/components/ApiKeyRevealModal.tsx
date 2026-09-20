import {
  useState,
} from 'react';

type ApiKeyRevealModalProps = {
  apiKey: string;

  partnerName: string;

  action:
    | 'CREATE'
    | 'ROTATE';

  onClose: () => void;
};

export function ApiKeyRevealModal({
  apiKey,
  partnerName,
  action,
  onClose,
}: ApiKeyRevealModalProps) {
  const [
    copied,
    setCopied,
  ] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(
        apiKey,
      );

      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="partner-key-backdrop">
      <section
        className="partner-key-modal"
        role="dialog"
        aria-modal="true"
      >
        <div className="partner-key-modal__icon">
          🔑
        </div>

        <span>
          {action ===
          'CREATE'
            ? 'API CLIENT CREATED'
            : 'API KEY ROTATED'}
        </span>

        <h2>
          API Key mới
        </h2>

        <p>
          Key của{' '}
          <strong>
            {partnerName}
          </strong>{' '}
          chỉ được hiển thị đúng
          một lần.
        </p>

        <div className="partner-key-warning">
          <strong>
            Lưu key ngay bây giờ.
          </strong>

          <span>
            Sau khi đóng cửa sổ
            này, hệ thống không thể
            hiển thị plaintext key
            lần nữa.
          </span>
        </div>

        <div className="partner-key-value">
          <code>
            {apiKey}
          </code>

          <button
            type="button"
            onClick={() => {
              void copy();
            }}
          >
            {copied
              ? '✓ Đã sao chép'
              : 'Sao chép'}
          </button>
        </div>

        <div className="partner-key-modal__rules">
          <span>
            • Không đưa key vào URL.
          </span>

          <span>
            • Không lưu key trong source code.
          </span>

          <span>
            • Partner gửi key bằng header X-API-Key.
          </span>
        </div>

        <button
          type="button"
          className="partner-key-close"
          onClick={onClose}
        >
          Tôi đã lưu key — Đóng
        </button>
      </section>
    </div>
  );
}

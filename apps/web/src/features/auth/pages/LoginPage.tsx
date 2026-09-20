import {
  FormEvent,
  useState,
} from 'react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';

import './LoginPage.css';

type AuthContextShape = {
  login: (input: {
    email: string;
    password: string;
  }) => Promise<void>;
};

type RouterState = {
  from?: {
    pathname?: string;
  };
};

type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
  message?: string | string[];
};

function getErrorStatus(
  error: unknown,
): number | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return error.status;
  }

  return undefined;
}

function getErrorBody(
  error: unknown,
): ApiErrorBody | undefined {
  if (
    typeof error !== 'object' ||
    error === null
  ) {
    return undefined;
  }

  if (
    'body' in error &&
    typeof error.body === 'object' &&
    error.body !== null
  ) {
    return error.body as ApiErrorBody;
  }

  if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response
  ) {
    return (
      error.response as {
        data?: ApiErrorBody;
      }
    ).data;
  }

  return undefined;
}

function getLoginErrorMessage(
  error: unknown,
): string {
  const status =
    getErrorStatus(error);

  const body =
    getErrorBody(error);

  if (body?.error?.message) {
    return body.error.message;
  }

  if (
    typeof body?.message === 'string'
  ) {
    return body.message;
  }

  if (
    Array.isArray(body?.message) &&
    body.message.length > 0
  ) {
    return body.message.join(', ');
  }

  if (status === 401) {
    return 'Email hoặc mật khẩu không chính xác.';
  }

  if (status === 403) {
    return 'Tài khoản không có quyền truy cập hệ thống.';
  }

  if (
    error instanceof TypeError
  ) {
    return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.';
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return 'Đăng nhập không thành công. Vui lòng thử lại.';
}

export function LoginPage() {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const auth =
    useAuth() as AuthContextShape;

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null,
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setErrorMessage(
        'Vui lòng nhập email.',
      );

      return;
    }

    if (!password) {
      setErrorMessage(
        'Vui lòng nhập mật khẩu.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      await auth.login({
        email: normalizedEmail,
        password,
      });

      const state =
        location.state as
          | RouterState
          | null;

      const returnPath =
        state?.from?.pathname;

      navigate(
        returnPath &&
          returnPath !== '/login'
          ? returnPath
          : '/',
        {
          replace: true,
        },
      );
    } catch (error) {
      setErrorMessage(
        getLoginErrorMessage(
          error,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="icd-login">
      <section className="icd-login__brand-panel">
        <div className="icd-login__brand-content">
          <div className="icd-login__brand">
            <div className="icd-login__brand-mark">
              ICD
            </div>

            <div className="icd-login__brand-copy">
              <strong>
                ICD Management
              </strong>

              <span>
                Inland Container Depot
              </span>
            </div>
          </div>

          <div className="icd-login__hero">
            <span className="icd-login__eyebrow">
              ICD OPERATIONS PLATFORM
            </span>

            <h1>
              Quản lý vận hành
              <br />
              container nội địa
            </h1>

            <p>
              Điều phối xuyên suốt từ
              Manifest, Gate-in, Yard,
              Billing đến Gate-out và
              bàn giao đối tác.
            </p>
          </div>

          <div className="icd-login__flow">
            <div className="icd-login__flow-item">
              <span>01</span>

              <div>
                <strong>
                  Tiếp nhận
                </strong>

                <small>
                  Manifest · Truck
                  Visit · Gate-in
                </small>
              </div>
            </div>

            <div className="icd-login__flow-line" />

            <div className="icd-login__flow-item">
              <span>02</span>

              <div>
                <strong>
                  Vận hành bãi
                </strong>

                <small>
                  Yard · Inspection ·
                  Movement
                </small>
              </div>
            </div>

            <div className="icd-login__flow-line" />

            <div className="icd-login__flow-item">
              <span>03</span>

              <div>
                <strong>
                  Hoàn tất
                </strong>

                <small>
                  Billing · Gate Pass ·
                  Gate-out
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="icd-login__brand-footer">
          <span>
            ICD Management System
          </span>

          <span>
            v1.7
          </span>
        </div>
      </section>

      <main className="icd-login__main">
        <div className="icd-login__mobile-brand">
          <div className="icd-login__brand-mark">
            ICD
          </div>

          <div>
            <strong>
              ICD Management
            </strong>

            <span>
              Inland Container Depot
            </span>
          </div>
        </div>

        <div className="icd-login-card">
          <div className="icd-login-card__heading">
            <span className="icd-login-card__eyebrow">
              ĐĂNG NHẬP HỆ THỐNG
            </span>

            <h2>
              Chào mừng trở lại
            </h2>

            <p>
              Sử dụng tài khoản ICD
              được cấp để tiếp tục.
            </p>
          </div>

          <form
            className="icd-login-form"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            {errorMessage && (
              <div
                className="icd-login-form__error"
                role="alert"
              >
                <div className="icd-login-form__error-icon">
                  !
                </div>

                <span>
                  {errorMessage}
                </span>
              </div>
            )}

            <label className="icd-login-field">
              <span className="icd-login-field__label">
                Email
              </span>

              <div className="icd-login-field__control">
                <span className="icd-login-field__icon">
                  @
                </span>

                <input
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  placeholder="name@icd.local"
                  value={email}
                  disabled={submitting}
                  onChange={(event) => {
                    setEmail(
                      event.target.value,
                    );

                    if (
                      errorMessage
                    ) {
                      setErrorMessage(
                        null,
                      );
                    }
                  }}
                />
              </div>
            </label>

            <label className="icd-login-field">
              <span className="icd-login-field__label">
                Mật khẩu
              </span>

              <div className="icd-login-field__control">
                <span className="icd-login-field__icon">
                  ●
                </span>

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  disabled={submitting}
                  onChange={(event) => {
                    setPassword(
                      event.target.value,
                    );

                    if (
                      errorMessage
                    ) {
                      setErrorMessage(
                        null,
                      );
                    }
                  }}
                />

                <button
                  type="button"
                  className="icd-login-field__toggle"
                  disabled={submitting}
                  aria-label={
                    showPassword
                      ? 'Ẩn mật khẩu'
                      : 'Hiện mật khẩu'
                  }
                  onClick={() =>
                    setShowPassword(
                      (value) =>
                        !value,
                    )
                  }
                >
                  {showPassword
                    ? 'Ẩn'
                    : 'Hiện'}
                </button>
              </div>
            </label>

            <button
              type="submit"
              className="icd-login-form__submit"
              disabled={submitting}
            >
              {submitting && (
                <span
                  className="icd-login-form__spinner"
                  aria-hidden="true"
                />
              )}

              <span>
                {submitting
                  ? 'Đang đăng nhập...'
                  : 'Đăng nhập'}
              </span>

              {!submitting && (
                <span
                  className="icd-login-form__arrow"
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </button>
          </form>

          <div className="icd-login-card__security">
            <span className="icd-login-card__security-icon">
              ✓
            </span>

            <span>
              Phiên đăng nhập được xác
              thực và phân quyền bởi hệ
              thống ICD.
            </span>
          </div>
        </div>

        <footer className="icd-login__main-footer">
          ICD Management · Internal
          Operations
        </footer>
      </main>
    </div>
  );
}

export default LoginPage;

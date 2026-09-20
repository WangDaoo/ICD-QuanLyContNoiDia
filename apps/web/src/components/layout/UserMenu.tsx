import {
  useEffect,
  useRef,
  useState,
} from 'react';

export type ShellUser = {
  id?: string;
  name?: string;
  email?: string;
  icdId?: string;
  roleCodes?: string[];
  permissionCodes?: string[];
};

type UserMenuProps = {
  user: ShellUser | null;
  onLogout: () => void | Promise<void>;
};

function getInitials(
  name?: string,
): string {
  if (!name) {
    return 'U';
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'U';
  }

  if (words.length === 1) {
    return (
      words[0]
        ?.slice(0, 2)
        .toUpperCase() ?? 'U'
    );
  }

  return [
    words[0]?.[0],
    words[words.length - 1]?.[0],
  ]
    .filter(Boolean)
    .join('')
    .toUpperCase();
}

export function UserMenu({
  user,
  onLogout,
}: UserMenuProps) {
  const [open, setOpen] =
    useState(false);

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  useEffect(() => {
    function handleOutsideClick(
      event: MouseEvent,
    ) {
      if (
        !containerRef.current?.contains(
          event.target as Node,
        )
      ) {
        setOpen(false);
      }
    }

    document.addEventListener(
      'mousedown',
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick,
      );
    };
  }, []);

  const mainRole =
    user?.roleCodes?.[0] ??
    'USER';

  async function handleLogout() {
    setOpen(false);

    await onLogout();
  }

  return (
    <div
      ref={containerRef}
      className="icd-user-menu"
    >
      <button
        type="button"
        className="icd-user-menu__trigger"
        onClick={() =>
          setOpen((value) => !value)
        }
      >
        <span className="icd-user-menu__avatar">
          {getInitials(user?.name)}
        </span>

        <span className="icd-user-menu__identity">
          <strong>
            {user?.name ??
              'Người dùng'}
          </strong>

          <span>{mainRole}</span>
        </span>

        <span
          className={[
            'icd-user-menu__chevron',
            open
              ? 'icd-user-menu__chevron--open'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="icd-user-menu__panel">
          <div className="icd-user-menu__profile">
            <div className="icd-user-menu__profile-avatar">
              {getInitials(user?.name)}
            </div>

            <div>
              <strong>
                {user?.name ??
                  'Người dùng'}
              </strong>

              <span>
                {user?.email ?? ''}
              </span>
            </div>
          </div>

          <div className="icd-user-menu__separator" />

          <div className="icd-user-menu__meta">
            <span>ICD Site</span>

            <strong>
              {user?.icdId ??
                'ICD01'}
            </strong>
          </div>

          <div className="icd-user-menu__meta">
            <span>Vai trò</span>

            <strong>
              {mainRole}
            </strong>
          </div>

          <div className="icd-user-menu__separator" />

          <button
            type="button"
            className="icd-user-menu__logout"
            onClick={() => {
              void handleLogout();
            }}
          >
            <span>⇥</span>
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

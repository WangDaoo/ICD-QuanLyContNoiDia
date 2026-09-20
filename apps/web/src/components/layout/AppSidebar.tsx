import { NavLink } from 'react-router-dom';

import {
  navigationGroups,
  type NavigationItem,
} from '../../navigation/navigation.config';

type AppSidebarProps = {
  collapsed: boolean;
  permissionCodes?: string[];
  onNavigate?: () => void;
};

function canDisplayItem(
  item: NavigationItem,
  permissionCodes: string[],
): boolean {
  if (!item.permission) {
    return true;
  }

  return permissionCodes.includes(
    item.permission,
  );
}

export function AppSidebar({
  collapsed,
  permissionCodes = [],
  onNavigate,
}: AppSidebarProps) {
  return (
    <aside
      className={[
        'icd-sidebar',
        collapsed
          ? 'icd-sidebar--collapsed'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="icd-sidebar__brand">
        <div className="icd-sidebar__brand-mark">
          ICD
        </div>

        {!collapsed && (
          <div className="icd-sidebar__brand-copy">
            <strong>
              ICD Management
            </strong>

            <span>
              Inland Container Depot
            </span>
          </div>
        )}
      </div>

      <nav className="icd-sidebar__navigation">
        {navigationGroups.map(
          (group) => {
            const visibleItems =
              group.items.filter((item) =>
                canDisplayItem(
                  item,
                  permissionCodes,
                ),
              );

            if (
              visibleItems.length === 0
            ) {
              return null;
            }

            return (
              <section
                key={group.key}
                className="icd-sidebar__group"
              >
                {!collapsed && (
                  <div className="icd-sidebar__group-title">
                    {group.label}
                  </div>
                )}

                <div className="icd-sidebar__items">
                  {visibleItems.map(
                    (item) => (
                      <NavLink
                        key={item.key}
                        to={item.path}
                        end={item.end}
                        onClick={
                          onNavigate
                        }
                        title={
                          collapsed
                            ? item.label
                            : undefined
                        }
                        className={({
                          isActive,
                        }) =>
                          [
                            'icd-sidebar__item',
                            isActive
                              ? 'icd-sidebar__item--active'
                              : '',
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(' ')
                        }
                      >
                        <span className="icd-sidebar__icon">
                          {
                            item.icon
                          }
                        </span>

                        {!collapsed && (
                          <span className="icd-sidebar__label">
                            {
                              item.label
                            }
                          </span>
                        )}
                      </NavLink>
                    ),
                  )}
                </div>
              </section>
            );
          },
        )}
      </nav>

      {!collapsed && (
        <div className="icd-sidebar__footer">
          <div className="icd-sidebar__footer-dot" />

          <div>
            <strong>
              ICD Management
            </strong>

            <span>
              Backend RC1
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

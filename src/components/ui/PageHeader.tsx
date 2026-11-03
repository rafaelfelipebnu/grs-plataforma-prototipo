import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './Layout.module.css';
import { Icon } from './Icon';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumb?: BreadcrumbItem[];
  description?: ReactNode;
  actions?: ReactNode;
}

/** Page Title (22px) + Breadcrumb do SDS. */
export function PageHeader({ title, breadcrumb = [], description, actions }: PageHeaderProps) {
  return (
    <div className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        {breadcrumb.length > 0 && (
          <nav aria-label="Trilha de navegação">
            <ol className={styles.breadcrumb}>
              <li>
                <Link to="/" aria-label="Início">
                  <Icon name="home" />
                </Link>
              </li>
              {breadcrumb.map((item, i) => (
                <Fragment key={`${item.label}-${i}`}>
                  <li aria-hidden="true" className={styles.breadcrumbSep}>
                    <Icon name="chevron-right" />
                  </li>
                  <li>
                    {item.to && i < breadcrumb.length - 1 ? (
                      <Link to={item.to}>{item.label}</Link>
                    ) : (
                      <span className={styles.breadcrumbCurrent} aria-current={i === breadcrumb.length - 1 ? 'page' : undefined}>
                        {item.label}
                      </span>
                    )}
                  </li>
                </Fragment>
              ))}
            </ol>
          </nav>
        )}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.pageDescription}>{description}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </div>
  );
}

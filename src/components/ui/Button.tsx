import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './Button.module.css';
import { Icon } from './Icon';
import { NumberBadge } from './Badge';

type Variant = 'primary' | 'secondary' | 'link' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'default' | 'small';
  /** Ícone Font Awesome à esquerda (SDS recomenda botão com ícone). */
  icon?: string;
  /** Ícone à direita (não usar junto com `icon`). */
  iconRight?: string;
  loading?: boolean;
  block?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'default', icon, iconRight, loading, block, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  const classes = [styles.button, styles[variant], size === 'small' && styles.small, block && styles.block, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Icon name="circle-o-notch" spin /> : icon ? <Icon name={icon} /> : null}
      {children}
      {!loading && iconRight && <Icon name={iconRight} />}
    </button>
  );
});

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  /** Rótulo acessível obrigatório (também usado como tooltip). */
  label: string;
  badge?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, badge, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={[styles.iconButton, className].filter(Boolean).join(' ')} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
      {badge !== undefined && badge > 0 && (
        <span className={styles.iconButtonBadge}>
          <NumberBadge count={badge} />
        </span>
      )}
    </button>
  );
});

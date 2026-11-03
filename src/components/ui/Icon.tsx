import type { CSSProperties } from 'react';

interface IconProps {
  /** Nome do ícone Font Awesome 4.7 sem o prefixo "fa-" (ex.: "bell"). */
  name: string;
  className?: string;
  /** Rótulo acessível; sem rótulo o ícone é decorativo. */
  label?: string;
  spin?: boolean;
  fixedWidth?: boolean;
  style?: CSSProperties;
}

/** Ícone do SDS (Font Awesome 4.7). */
export function Icon({ name, className, label, spin, fixedWidth, style }: IconProps) {
  const classes = ['fa', `fa-${name}`, spin && 'fa-spin', fixedWidth && 'fa-fw', className].filter(Boolean).join(' ');
  return label ? (
    <i className={classes} role="img" aria-label={label} title={label} style={style} />
  ) : (
    <i className={classes} aria-hidden="true" style={style} />
  );
}

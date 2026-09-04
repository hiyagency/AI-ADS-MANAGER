import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; to?: string; variant?: 'primary' | 'secondary' }

export function Button({ children, to, variant = 'primary', className = '', ...props }: Props) {
  const classes = `button button--${variant} ${className}`
  if (to) return <Link className={classes} to={to}>{children}</Link>
  return <button className={classes} {...props}>{children}</button>
}

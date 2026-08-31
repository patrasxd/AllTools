import React from 'react'

export interface BadgeProps {
  children: React.ReactNode
  size?: 'sm' | 'md'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  size = 'sm',
  className = '',
}) => {
  return (
    <span className={`badge ${className}`}>
      {children}
    </span>
  )
}

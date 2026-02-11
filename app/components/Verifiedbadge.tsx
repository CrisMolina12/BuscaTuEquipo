import { CheckCircle2 } from "lucide-react"

interface VerifiedBadgeProps {
  verified?: boolean
  badgeType?: 'none' | 'basic' | 'premium'
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export default function VerifiedBadge({ 
  verified = false, 
  badgeType = 'basic',
  size = 'md',
  showText = false,
  className = ""
}: VerifiedBadgeProps) {
  if (!verified) return null

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const badgeColors = {
    basic: 'text-blue-500',
    premium: 'text-amber-500',
    none: 'text-blue-500'
  }

  const iconSize = sizeClasses[size]
  const textSize = textSizeClasses[size]
  const color = badgeColors[badgeType]

  if (showText) {
    return (
      <span className={`inline-flex items-center gap-1 ${textSize} font-semibold ${color} ${className}`}>
        <CheckCircle2 className={iconSize} fill="currentColor" />
        <span>Verificado</span>
      </span>
    )
  }

  return (
    <span title={`Club verificado${badgeType === 'premium' ? ' Premium' : ''}`}>
      <CheckCircle2 
        className={`${iconSize} ${color} ${className}`}
        fill="currentColor"
      />
    </span>
  )
}
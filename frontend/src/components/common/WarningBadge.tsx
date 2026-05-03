interface Props {
  level: 'error' | 'warning' | 'info'
  msg: string
}

const COLORS = {
  error:   { bg: '#FEE2E2', text: '#DC2626' },
  warning: { bg: '#FEF3C7', text: '#D97706' },
  info:    { bg: '#EEF2FF', text: '#6366F1' },
}

export default function WarningBadge({ level, msg }: Props) {
  const c = COLORS[level]
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
      style={{ background: c.bg, color: c.text }}
    >
      {level === 'error' ? '⚠️' : level === 'warning' ? '⚡' : 'ℹ️'} {msg}
    </div>
  )
}

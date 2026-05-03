interface Props {
  title: string
  score: number // 0~100
  warnings: string[]
  color?: string
}

export default function RiskScore({ title, score, warnings, color }: Props) {
  const getColor = () => {
    if (score >= 70) return '#E84040'
    if (score >= 40) return '#F59E0B'
    return '#10B981'
  }

  const c = color || getColor()

  return (
    <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
      <p className="text-[#64748B] text-xs mb-3">{title}</p>
      {/* 게이지 바 */}
      <div className="w-full bg-[#1E2230] rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: c }}
        />
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-2xl font-bold" style={{ color: c }}>{score}</span>
        <span className="text-xs text-[#64748B]">/ 100</span>
      </div>
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-[#F59E0B]">⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}

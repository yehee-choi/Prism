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
    <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
      <p className="text-[#767586] text-xs mb-3">{title}</p>
      <div className="w-full bg-[#f5f2fe] rounded-full h-2 mb-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${score}%`, background: c }}
        />
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-2xl font-bold" style={{ color: c }}>{score}</span>
        <span className="text-xs text-[#767586]">/ 100</span>
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

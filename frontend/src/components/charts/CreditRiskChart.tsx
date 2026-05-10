interface Props {
  currentRatio?: number
  interestCoverage?: number
  dso?: number
  debtRatio?: number
}

export default function CreditRiskChart({ currentRatio, interestCoverage, dso, debtRatio }: Props) {
  const indicators = [
    { name: '유동비율', value: currentRatio, benchmark: 100, unit: '%', danger: (v: number) => v < 100 },
    { name: '이자보상배율', value: interestCoverage, benchmark: 1, unit: '배', danger: (v: number) => v < 1 },
    { name: 'DSO', value: dso, benchmark: 75, unit: '일', danger: (v: number) => v > 75 },
    { name: '부채비율', value: debtRatio, benchmark: 200, unit: '%', danger: (v: number) => v > 200 },
  ].filter(i => i.value !== undefined)

  if (indicators.length === 0) return null

  const getBarWidth = (name: string, value: number): number => {
    switch (name) {
      // 높을수록 좋음 → 값이 클수록 막대 길어짐
      case '유동비율':
        return Math.min(100, (value / 300) * 100)       // 300% 이상이면 최대
      case '이자보상배율':
        return Math.min(100, (value / 10) * 100)        // 10배 이상이면 최대
      // 낮을수록 좋음 → 값이 클수록 막대 길어짐 (위험도 표현)
      case 'DSO':
        return Math.min(100, (value / 150) * 100)       // 150일이면 최대 위험
      case '부채비율':
        return Math.min(100, (value / 400) * 100)       // 400%이면 최대 위험
      default:
        return Math.min(100, (value / (200)) * 100)
    }
  }

  return (
    <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
      <p className="text-[#1b1b23] text-sm font-medium mb-4">신용 위험 지표</p>
      <div className="flex flex-col gap-4">
        {indicators.map((ind, i) => {
          const isDanger = ind.danger(ind.value!)
          const color = isDanger ? '#E84040' : '#10B981'
          const barWidth = getBarWidth(ind.name, ind.value!)
          return (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[#767586]">{ind.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color }}>
                    {ind.value!.toFixed(1)}{ind.unit}
                  </span>
                  <span className="text-xs text-[#c7c4d7]">기준 {ind.benchmark}{ind.unit}</span>
                </div>
              </div>
              <div className="w-full bg-[#f5f2fe] rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${barWidth}%`, background: color }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
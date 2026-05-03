import ReactApexChart from 'react-apexcharts'

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

  return (
    <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
      <p className="text-[#E2E8F0] text-sm font-medium mb-4">신용 위험 지표</p>
      <div className="flex flex-col gap-4">
        {indicators.map((ind, i) => {
          const isDanger = ind.danger(ind.value!)
          const color = isDanger ? '#E84040' : '#10B981'
          return (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[#64748B]">{ind.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color }}>
                    {ind.value!.toFixed(1)}{ind.unit}
                  </span>
                  <span className="text-xs text-[#2E3648]">기준 {ind.benchmark}{ind.unit}</span>
                </div>
              </div>
              <div className="w-full bg-[#1E2230] rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${Math.min(100, (ind.value! / (ind.benchmark * 2)) * 100)}%`,
                    background: color
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

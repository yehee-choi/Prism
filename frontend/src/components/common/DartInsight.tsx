interface Disclosure {
  title: string
  date: string
  sentiment: '호재' | '악재' | '중립'
  reason: string
}

interface Props {
  data: any
  loading: boolean
}

const SENTIMENT_STYLE = {
  '호재': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-400' },
  '악재': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
  '중립': { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-[#464554]', dot: 'bg-[#464554]' },
}

export default function DartInsight({ data, loading }: Props) {
  if (loading) return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-[#4648d4] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#464554] text-sm">DART 공시 분석 중...</p>
      </div>
    </div>
  )

  if (!data || !data.success) return null

  const overallStyle = SENTIMENT_STYLE[data.overall as keyof typeof SENTIMENT_STYLE] || SENTIMENT_STYLE['중립']

  return (
    <div className="glass-card rounded-xl p-6 relative overflow-hidden">
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#4648d4]/5 blur-[80px] rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#4648d4]/20 border border-[#4648d4]/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#4648d4]">feed</span>
          </div>
          <div>
            <h3 className="text-[#1b1b23] font-bold" style={{fontFamily:'Manrope'}}>DART 공시 분석</h3>
            <p className="text-[#767586] text-xs">{data.corp_name} · 최근 공시 자동 요약</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${overallStyle.bg} ${overallStyle.border}`}>
          <div className={`w-2 h-2 rounded-full ${overallStyle.dot}`} />
          <span className={`text-xs font-bold ${overallStyle.text}`}>{data.overall}</span>
        </div>
      </div>

      {/* 요약 */}
      {data.summary && (
        <div className="bg-white/80 rounded-lg p-3 mb-4 border border-[#c7c4d7]">
          <p className="text-[#1b1b23] text-sm">{data.summary}</p>
        </div>
      )}

      {/* 공시 목록 */}
      {data.items && (
        <div className="flex flex-col gap-2 mb-4">
          {data.items.map((item: Disclosure, i: number) => {
            const style = SENTIMENT_STYLE[item.sentiment] || SENTIMENT_STYLE['중립']
            return (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} ${style.border}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[#1b1b23] text-xs font-medium truncate">{item.title}</p>
                    <span className={`text-[10px] font-bold flex-shrink-0 ${style.text}`}>{item.sentiment}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[#767586] text-[11px]">{item.reason}</p>
                    <p className="text-[#767586] text-[10px] font-mono flex-shrink-0">{item.date}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 액션 권고 */}
      {data.action && (
        <div className="flex items-center gap-3 pt-3 border-t border-[#c7c4d7]">
          <span className="material-symbols-outlined text-[#4648d4] text-sm">recommend</span>
          <p className="text-[#4648d4] text-xs"><span className="font-bold">권고:</span> {data.action}</p>
        </div>
      )}
    </div>
  )
}

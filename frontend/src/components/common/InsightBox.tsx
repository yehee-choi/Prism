interface Props {
  insight: string
  loading: boolean
}

export default function InsightBox({ insight, loading }: Props) {
  return (
    <div className="glass-card rounded p-6 relative overflow-hidden" style={{
      background: 'rgba(255, 255, 255, 0.7)',
      backdropFilter: 'blur(20px)',
      border: '1px solid #c7c4d7'
    }}>
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#4648d4]/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded bg-[#4648d4]/20 border border-[#4648d4]/40 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#4648d4] text-2xl">auto_awesome</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-[#1b1b23] font-manrope">AI Insights</h3>
            <span className="px-2 py-0.5 bg-[#4648d4]/20 text-[#4648d4] text-[10px] font-bold rounded uppercase tracking-widest">
              Skills.md Engine
            </span>
          </div>
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-[#4648d4] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#464554] text-sm">인사이트 생성 중...</p>
            </div>
          ) : insight ? (
            <>
              <p className="text-[#1b1b23] text-sm leading-relaxed">{insight}</p>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#767586] uppercase tracking-widest">Powered by</span>
                  <span className="text-[10px] font-mono text-[#4648d4]">Claude Sonnet</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-[#767586] text-sm">데이터를 입력하면 AI 인사이트가 자동 생성됩니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

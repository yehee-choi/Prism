interface Props {
  insight: string
  loading: boolean
}

export default function InsightBox({ insight, loading }: Props) {
  return (
    <div className="glass-card rounded p-6 relative overflow-hidden" style={{
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(20px)',
      border: '1px solid #334155'
    }}>
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
      <div className="flex items-start gap-4 relative z-10">
        <div className="w-12 h-12 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-indigo-400 text-2xl">auto_awesome</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-white font-manrope">AI Insights</h3>
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded uppercase tracking-widest">
              Skills.md Engine
            </span>
          </div>
          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">인사이트 생성 중...</p>
            </div>
          ) : insight ? (
            <>
              <p className="text-slate-300 text-sm leading-relaxed">{insight}</p>
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Powered by</span>
                  <span className="text-[10px] font-mono text-indigo-400">Claude Sonnet</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">데이터를 입력하면 AI 인사이트가 자동 생성됩니다.</p>
          )}
        </div>
      </div>
    </div>
  )
}

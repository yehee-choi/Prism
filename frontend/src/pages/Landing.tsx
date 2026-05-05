import { useNavigate } from 'react-router-dom'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="bg-[#13131b] text-[#e4e1ed] overflow-x-hidden min-h-screen">
      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-20 bg-slate-900/60 backdrop-blur-md border-b border-slate-800/50 shadow-2xl shadow-black/50">
        <div className="flex items-center gap-8">
          <img src="/logo.png" alt="Prism" className="h-14" />
          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: 'Investor', role: 'stock', active: true },
              { label: 'Manager', role: 'fund', active: false },
              { label: 'Accountant', role: 'financial', active: false },
              { label: 'Analyst', role: 'analyst', active: false },
            ].map(item => (
              <button key={item.role} onClick={() => navigate(`/dashboard/${item.role}`)}
                className={`font-manrope text-sm tracking-tight px-1 h-14 flex items-center transition-colors ${item.active ? 'text-indigo-400 font-bold border-b-2 border-indigo-500' : 'text-slate-400 font-medium hover:bg-slate-800/50 hover:text-white px-3 py-1 rounded'
                  }`} style={{ fontFamily: 'Manrope' }}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">search</span>
            <input className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs w-64 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-white placeholder:text-slate-600" placeholder="Global Search..." type="text" />
          </div>
          <div className="flex items-center gap-3">
            <button className="material-symbols-outlined text-slate-400 hover:text-white transition-colors">notifications</button>
            <button className="material-symbols-outlined text-slate-400 hover:text-white transition-colors">settings</button>
            <button className="material-symbols-outlined text-indigo-400">account_circle</button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="min-h-screen flex flex-col items-center justify-center px-6 relative prism-grid">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-500 rounded-full opacity-15 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-[#25a475] rounded-full opacity-15 blur-[80px] pointer-events-none" />

        {/* Hero */}
        <section className="max-w-6xl mx-auto relative z-10 text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img src="/logo.png" alt="Prism" className="h-16" />
            <span className="text-[56px] font-black text-white tracking-tight" style={{ fontFamily: 'Manrope' }}>Prism</span>
          </div>
          <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            어떤 형태의 투자 데이터든 업로드하면 — 직군에 맞는 분석 대시보드를 즉시 제공합니다.<br />
            Bloomberg급 분석을 파일 하나로.
          </p>
        </section>

        {/* Role Cards */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
          {[
            {
              role: 'stock', label: 'Stock Investor', icon: 'trending_up',
              desc: '수급 분석, 공매도 잔고, 지배구조 리스크, 이상 거래량 조기 경보',
              btnClass: 'bg-indigo-600 hover:bg-indigo-500 text-white',
              borderHover: 'hover:border-indigo-500/50',
              iconBg: 'bg-indigo-500/10 border-indigo-500/30',
              iconColor: 'text-indigo-400',
            },
            {
              role: 'fund', label: 'Fund Manager', icon: 'leaderboard',
              desc: '팩터 노출도, 위험조정수익률, BM 초과수익, 컴플라이언스 모니터링',
              btnClass: 'bg-[#25a475] hover:bg-[#68dba9] text-[#003825]',
              borderHover: 'hover:border-[#25a475]/50',
              iconBg: 'bg-[#25a475]/10 border-[#25a475]/30',
              iconColor: 'text-[#68dba9]',
            },
            {
              role: 'financial', label: 'Accountant', icon: 'account_balance',
              desc: '거래처 부도 조기경보, PE 대주주 리스크, DSO 벤치마크, 차입구조 위험도',
              btnClass: 'bg-amber-600 hover:bg-amber-500 text-white',
              borderHover: 'hover:border-amber-500/50',
              iconBg: 'bg-amber-500/10 border-amber-500/30',
              iconColor: 'text-amber-500',
            },
            {
              role: 'analyst', label: 'Analyst', icon: 'query_stats',
              desc: 'PER·PBR 밴드 차트, 컨센서스 EPS 리비전, 업종 상대 밸류에이션 비교',
              btnClass: 'bg-[#b66dff] hover:bg-[#ddb8ff] text-[#400071]',
              borderHover: 'hover:border-[#b66dff]/50',
              iconBg: 'bg-[#b66dff]/10 border-[#b66dff]/30',
              iconColor: 'text-[#ddb8ff]',
            },
          ].map(card => (
            <div key={card.role}
              className={`group relative bg-slate-900/40 backdrop-blur-xl border border-slate-800 p-6 rounded-xl overflow-hidden ${card.borderHover} transition-all duration-300 cursor-pointer`}
              onClick={() => navigate(`/dashboard/${card.role}`)}>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[100px]">{card.icon}</span>
              </div>
              <div className="relative z-10">
                <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center mb-6 border`}>
                  <span className={`material-symbols-outlined ${card.iconColor}`}>{card.icon}</span>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-2" style={{ fontFamily: 'Manrope' }}>{card.label}</h3>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed">{card.desc}</p>
                <button className={`w-full py-3 ${card.btnClass} text-sm font-bold tracking-tight rounded-lg transition-colors active:scale-95`} style={{ fontFamily: 'Manrope' }}>
                  Select Role
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="fixed bottom-0 w-full border-t border-slate-800 pt-6 pb-6 bg-[#13131b]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <span className="text-lg font-bold tracking-tighter text-indigo-400" style={{ fontFamily: 'Manrope' }}>Prism Financial</span>
              <p className="text-slate-500 text-sm mt-2">© 2026 Prism Financial Services. All rights reserved.</p>
            </div>
            <div className="flex gap-8">
              <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#">Privacy Policy</a>
              <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#">Terms of Service</a>
              <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#">Contact Support</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

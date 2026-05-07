import { useState } from 'react'
import { usePdfExport } from '../hooks/usePdfExport'
import { useParams, useNavigate } from 'react-router-dom'
import Loading from '../components/common/Loading'
import WarningBadge from '../components/common/WarningBadge'
import InsightBox from '../components/common/InsightBox'
import StockDashboard from '../components/dashboards/StockDashboard'
import FinancialDashboard from '../components/dashboards/FinancialDashboard'
import FundDashboard from '../components/dashboards/FundDashboard'
import AnalystDashboard from '../components/dashboards/AnalystDashboard'
import { uploadFile, analyzeData, fetchStockOhlcv, fetchStockInvestor, generateInsight, fetchDartInsight } from '../api'
import DartInsight from '../components/common/DartInsight'

type Role = 'stock' | 'fund' | 'financial' | 'analyst'

const ROLE_CONFIG = {
  stock: { label: 'Stock Investor', icon: 'trending_up', color: '#6366F1' },
  fund: { label: 'Fund Manager', icon: 'leaderboard', color: '#059669' },
  financial: { label: 'Accountant', icon: 'account_balance', color: '#D97706' },
  analyst: { label: 'Analyst', icon: 'query_stats', color: '#9333EA' },
}

export default function Dashboard() {
  const { role } = useParams()
  const navigate = useNavigate()
  const currentRole = (role as Role) || 'stock'
  const config = ROLE_CONFIG[currentRole]

  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [insightLoading, setInsightLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [analyzeResult, setAnalyzeResult] = useState<any>(null)
  const [insight, setInsight] = useState('')
  const [ohlcv, setOhlcv] = useState<any[]>([])
  const [investorData, setInvestorData] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])
  const [companyName, setCompanyName] = useState('')
  const [dartData, setDartData] = useState<any>(null)
  const [dartLoading, setDartLoading] = useState(false)

  const { exportPdf } = usePdfExport()
  const [exporting, setExporting] = useState(false)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const handleExportPdf = async () => {
    setExporting(true)
    const label = companyName || ticker || currentRole
    await exportPdf('dashboard-content', `prism-${currentRole}-${label}`)
    setExporting(false)
  }
  const fetchInsight = async (metrics: any, role: string, dt: string) => {
    setInsightLoading(true)
    try {
      const result = await generateInsight(metrics, role, dt)
      setInsight(result.insight || '')
    } catch (e) { console.error(e) }
    setInsightLoading(false)
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setInsight('')
    try {
      const result = await uploadFile(file)
      setUploadResult(result)
      setWarnings(result.warnings || [])
      if (result.success && result.data) {
        const analysis = await analyzeData(result.data, currentRole)
        setAnalyzeResult(analysis)
        if (result.data[0]?.close) setOhlcv(result.data)
        await fetchInsight(analysis.metrics, currentRole, result.data_type)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleTicker = async () => {
    if (!ticker) return
    setLoading(true)
    setInsight('')
    try {
      const today = new Date()
      const end = today.toISOString().slice(0, 10).replace(/-/g, '')
      const prev = new Date(today)
      prev.setFullYear(prev.getFullYear() - 1)
      const start = prev.toISOString().slice(0, 10).replace(/-/g, '')

      const [ohlcvResult, investorResult] = await Promise.all([
        fetchStockOhlcv(ticker, start, end),
        fetchStockInvestor(ticker, start, end),
      ])

      if (ohlcvResult.success && ohlcvResult.data) {
        setOhlcv(ohlcvResult.data)
        setCompanyName(ticker)
        const analysis = await analyzeData(ohlcvResult.data, currentRole)
        setAnalyzeResult(analysis)
        await fetchInsight(analysis.metrics, currentRole, 'stock')
      }
      if (investorResult.success && investorResult.data) {
        setInvestorData(investorResult.data)
      }
      setWarnings([])
      // DART 공시 분석
      setDartLoading(true)
      const dart = await fetchDartInsight(ticker)
      setDartData(dart)
      setDartLoading(false)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const renderDashboard = () => {
    if (!analyzeResult) return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <span className="material-symbols-outlined text-[80px] text-[#c7c4d7]">query_stats</span>
        <p className="text-[#767586] text-sm">종목코드를 입력하거나 파일을 업로드해주세요</p>
        <p className="text-[#767586] text-xs">CSV · Excel · JSON 모든 형태 지원</p>
      </div>
    )
    const metrics = analyzeResult.metrics
    return (
      <div className="flex flex-col gap-6">
        {(() => {
          switch (currentRole) {
            case 'stock': return <StockDashboard metrics={metrics} ohlcv={ohlcv} investorData={investorData} />
            case 'fund': return <FundDashboard metrics={metrics} ohlcv={ohlcv} />
            case 'financial': return <FinancialDashboard metrics={metrics} dartData={dartData} />
            case 'analyst': return <AnalystDashboard metrics={metrics} ohlcv={ohlcv} />
            default: return null
          }
        })()}
        <InsightBox insight={insight} loading={insightLoading} />
        <DartInsight data={dartData} loading={dartLoading} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcf8ff] text-[#1b1b23]">
      {/* 상단 헤더 - 로고 + 직군 탭만 */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#c7c4d7]/50 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-6 h-14">
          <button onClick={() => navigate('/')}>
            <img src="/logo.png" alt="Prism" className="h-8" />
          </button>
          <div className="flex items-center gap-3">
            {/* notifications 버튼 */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(v => !v); setShowSettings(false) }}
                className="material-symbols-outlined text-[#464554] hover:text-[#1b1b23] transition-colors"
              >notifications</button>
              {showNotifications && (
                <div className="absolute right-0 top-10 w-72 bg-white border border-[#c7c4d7] rounded-xl shadow-xl z-50 p-4">
                  <p className="text-xs font-bold text-[#1b1b23] uppercase tracking-widest mb-3">알림</p>
                  {warnings.length > 0 ? warnings.map((w: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-[#c7c4d7] last:border-0">
                      <span className="material-symbols-outlined text-[#D97706] text-sm mt-0.5">warning</span>
                      <p className="text-xs text-[#464554]">{w.msg}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-[#767586]">새 알림이 없습니다</p>
                  )}
                </div>
              )}
            </div>
            {analyzeResult && (
              <button
                onClick={handleExportPdf}
                disabled={exporting}
                className="flex items-center gap-1 px-3 py-1.5 bg-[#4648d4] text-white text-xs font-bold rounded-lg hover:bg-[#2f2ebe] transition-all disabled:opacity-50"
                style={{ fontFamily: 'Manrope' }}
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                {exporting ? '생성 중...' : 'PDF 내보내기'}
              </button>
            )}
            {/* settings 버튼 */}
            <div className="relative">
              <button
                onClick={() => { setShowSettings(v => !v); setShowNotifications(false) }}
                className="material-symbols-outlined text-[#464554] hover:text-[#1b1b23] transition-colors"
              >settings</button>
              {showSettings && (
                <div className="absolute right-0 top-10 w-64 bg-white border border-[#c7c4d7] rounded-xl shadow-xl z-50 p-4">
                  <p className="text-xs font-bold text-[#1b1b23] uppercase tracking-widest mb-3">설정</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#464554]">무위험수익률</p>
                      <span className="text-xs font-bold text-[#4648d4]">3.5%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#464554]">연율화 기준</p>
                      <span className="text-xs font-bold text-[#4648d4]">252일</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#464554]">금액 단위</p>
                      <span className="text-xs font-bold text-[#4648d4]">억원</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-[#464554]">색상 기준</p>
                      <span className="text-xs font-bold text-[#4648d4]">한국 (상승=적색)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button className="material-symbols-outlined text-[#4648d4]">account_circle</button>
          </div>
        </div>
        {/* 직군 탭 */}
        <div className="flex items-center px-6 border-t border-[#c7c4d7]/50">
          {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([r, c]) => (
            <button key={r} onClick={() => navigate(`/dashboard/${r}`)}
              className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all ${r === currentRole
                ? 'border-[#4648d4] text-[#4648d4]'
                : 'border-transparent text-[#767586] hover:text-[#1b1b23]'
                }`} style={{ fontFamily: 'Manrope' }}>
              <span className="material-symbols-outlined text-sm">{c.icon}</span>
              {c.label}
            </button>
          ))}
          <div className="ml-auto">
            <span className="text-[10px] text-[#c7c4d7] font-mono">Skills.md v0.1</span>
          </div>
        </div>
      </header>

      {/* 본문 - 좌측 입력 패널 + 우측 대시보드 */}
      <div className="pt-[120px] flex min-h-screen">

        {/* 좌측 입력 패널 (30%) */}
        <div className="w-[20%] min-h-[calc(100vh-105px)] border-r border-[#c7c4d7] p-8 flex flex-col gap-8 bg-white/80">

          {/* 현재 직군 표시 */}
          <div className="bg-[#4648d4]/10 border border-[#4648d4]/20 rounded-xl p-4">
            <p className="text-[11px] font-bold text-[#4648d4] uppercase tracking-widest mb-2">Current Role</p>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl" style={{ color: config.color }}>{config.icon}</span>
              <span className="text-lg font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>{config.label}</span>
            </div>
          </div>

          {/* 종목코드 입력 */}
          <div>
            <p className="text-sm font-bold text-[#1b1b23] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>
              종목코드 입력
            </p>
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767586]">search</span>
              <input
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTicker()}
                placeholder="005930, 000660..."
                className="w-full bg-[#f5f2fe] border border-[#c7c4d7] rounded-xl pl-12 pr-4 py-4 text-base focus:border-[#4648d4] focus:outline-none transition-all text-[#1b1b23] placeholder:text-[#767586]"
              />
            </div>
            <button onClick={handleTicker}
              className="w-full bg-[#4648d4] hover:bg-[#2f2ebe] text-white font-bold py-4 rounded-xl text-base transition-all active:scale-95 shadow-lg shadow-[#4648d4]/20"
              style={{ fontFamily: 'Manrope' }}>
              조회
            </button>
          </div>

          {/* 구분선 */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-[#c7c4d7]" />
            <span className="text-[#767586] text-sm">또는</span>
            <div className="flex-1 h-px bg-[#c7c4d7]" />
          </div>

          {/* 파일 업로드 */}
          <div>
            <p className="text-sm font-bold text-[#1b1b23] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>
              파일 업로드
            </p>
            <label className="block w-full border-2 border-dashed border-[#c7c4d7] rounded-xl p-8 text-center cursor-pointer hover:border-[#4648d4] transition-colors group">
              <span className="material-symbols-outlined text-4xl text-[#767586] group-hover:text-[#4648d4] transition-colors block mb-2">upload_file</span>
              <p className="text-base text-[#464554] font-medium mb-1">클릭하여 파일 업로드</p>
              <p className="text-sm text-[#767586]">CSV · Excel · JSON</p>
              <input type="file" accept=".csv,.xlsx,.xls,.json,.pdf" onChange={handleFile} className="hidden" />
            </label>
          </div>

          {/* 파싱 결과 */}
          {uploadResult && (
            <div className="border border-[#c7c4d7] rounded-xl p-4 bg-white/80">
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">파싱 결과</p>
              <p className="text-base text-[#1b1b23] font-mono mb-1">{uploadResult.row_count}행 · {uploadResult.data_type}</p>
              {uploadResult.ai_mapped_columns && Object.keys(uploadResult.ai_mapped_columns).length > 0 && (
                <p className="text-sm text-[#4648d4]">✨ AI 매핑 {Object.keys(uploadResult.ai_mapped_columns).length}개 컬럼</p>
              )}
              {warnings.map((w: any, i: number) => (
                <div key={i} className="mt-2"><WarningBadge level={w.level} msg={w.msg} /></div>
              ))}
            </div>
          )}

          {/* 조회 결과 정보 */}
          {companyName && (
            <div className="border border-[#c7c4d7] rounded-xl p-4 bg-white/80">
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">조회 종목</p>
              <p className="text-xl font-bold text-[#1b1b23] font-mono">{companyName}</p>
              <p className="text-sm text-[#4648d4] mt-1">KRX Live Data</p>
            </div>
          )}
        </div>

        {/* 우측 대시보드 (70%) */}
        <div id="dashboard-content" className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
          {loading ? <Loading /> : renderDashboard()}
        </div>
      </div>

      {/* FAB */}
      <label className="fixed bottom-8 right-8 w-14 h-14 bg-[#4648d4] rounded-full shadow-2xl shadow-[#4648d4]/40 flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer">
        <span className="material-symbols-outlined text-3xl">add</span>
        <input type="file" accept=".csv,.xlsx,.xls,.json,.pdf" onChange={handleFile} className="hidden" />
      </label>
    </div>
  )
}

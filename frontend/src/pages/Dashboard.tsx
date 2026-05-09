import { useEffect, useRef, useState } from 'react'
import { usePdfExport } from '../hooks/usePdfExport'
import { useParams, useNavigate } from 'react-router-dom'
import Loading from '../components/common/Loading'
import WarningBadge from '../components/common/WarningBadge'
import InsightBox from '../components/common/InsightBox'
import StockDashboard from '../components/dashboards/StockDashboard'
import FinancialDashboard from '../components/dashboards/FinancialDashboard'
import FundDashboard from '../components/dashboards/FundDashboard'
import AnalystDashboard from '../components/dashboards/AnalystDashboard'
import {
  uploadFile,
  analyzeData,
  fetchStockOhlcv,
  fetchStockInvestor,
  generateInsight,
  fetchDartFull,
  searchStock,
  type StockSearchResult,
} from '../api'
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  const [stockSearchResults, setStockSearchResults] = useState<StockSearchResult[]>([])
  const [stockSearchLoading, setStockSearchLoading] = useState(false)
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false)
  const stockSearchRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const keyword = ticker.trim()

    if (!keyword) {
      setStockSearchResults([])
      setStockDropdownOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setStockSearchLoading(true)
      try {
        const results = await searchStock(keyword)
        setStockSearchResults(results)
        setStockDropdownOpen(results.length > 0)
      } catch (e) {
        console.error(e)
        setStockSearchResults([])
        setStockDropdownOpen(false)
      } finally {
        setStockSearchLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [ticker])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        stockSearchRef.current &&
        !stockSearchRef.current.contains(e.target as Node)
      ) {
        setStockDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportPdf = async () => {
    setExporting(true)
    const label = companyName || ticker || currentRole
    await exportPdf('dashboard-content', `prism-${currentRole}-${label}`)
    setExporting(false)
  }
  const fetchInsight = async (metrics: any, role: string, dt: string, extraData: any = null, extraContext: any = null) => {
    setInsightLoading(true)
    try {
      const result = await generateInsight(metrics, role, dt, extraData, extraContext)
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
        await fetchInsight(analysis.metrics, currentRole, result.data_type, result.extra_data, result.extra_context)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleTicker = async (inputTicker?: string, inputName?: string) => {
    let target = inputTicker || ticker
    if (!target) return

    // 숫자가 아니면 (회사명 직접 입력) → 코드 먼저 검색
    if (!/^\d+$/.test(target.trim())) {
      try {
        const results = await searchStock(target.trim())
        if (results.length === 0) {
          alert(`"${target}"에 해당하는 종목을 찾을 수 없습니다.`)
          return
        }
        // 첫 번째 결과로 자동 선택
        inputName = inputName || results[0].name
        target = results[0].ticker
        setTicker(target)
      } catch (e) {
        console.error(e)
        return
      }
    }

    if (inputName) setCompanyName(inputName)
    else if (!inputName) setCompanyName(target) // 코드 직접 입력 시 임시 표시

    setStockDropdownOpen(false)
    setLoading(true)
    setInsight('')

    try {
      const today = new Date()
      const end = today.toISOString().slice(0, 10).replace(/-/g, '')
      const prev = new Date(today)
      prev.setFullYear(prev.getFullYear() - 1)
      const start = prev.toISOString().slice(0, 10).replace(/-/g, '')

      const [ohlcvResult, investorResult] = await Promise.all([
        fetchStockOhlcv(target, start, end),
        fetchStockInvestor(target, start, end),
      ])

      if (ohlcvResult.success && ohlcvResult.data) {
        setOhlcv(ohlcvResult.data)
        const analysis = await analyzeData(ohlcvResult.data, currentRole)
        setAnalyzeResult(analysis)


        setDartLoading(true)
        // 변경 — DART 먼저 받고 insight에 전달
        const dart = await fetchDartFull(target)
        setDartData(dart)
        setDartLoading(false)

        await fetchInsight(analysis.metrics, currentRole, 'stock', null, {
          file_summary: dart.corp_name ? `${dart.corp_name} DART 공시 데이터` : null,
          text_analysis: dart.summary ? { '공시요약': dart.summary } : {},
          anomalies: dart.pe_detected ? [`PE 대주주 감지: ${dart.pe_keywords?.join(', ')}`] : [],
        })
      }
      if (investorResult.success && investorResult.data) {
        setInvestorData(investorResult.data)
      }
      setWarnings([])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const renderDashboard = () => {
    if (!analyzeResult) return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <span className="material-symbols-outlined text-[80px] text-[#c7c4d7]">query_stats</span>
        <div className="text-center">
          <p className="text-[#767586] text-sm mb-1">종목코드를 입력하거나 파일을 업로드해주세요</p>
          <p className="text-[#767586] text-xs">CSV · Excel · JSON 모든 형태 지원</p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs text-[#767586] uppercase tracking-widest font-bold">빠른 데모</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { code: '005930', name: '삼성전자', desc: '반도체 · 대형주' },
              { code: '000660', name: 'SK하이닉스', desc: '반도체 · 대형주' },
              { code: '035420', name: 'NAVER', desc: '플랫폼 · IT' },
              { code: '005380', name: '현대차', desc: '자동차 · 제조' },
            ].map(stock => (
              <button
                key={stock.code}
                onClick={() => handleTicker(stock.code)}
                className="flex flex-col items-center px-6 py-4 bg-white border border-[#c7c4d7] rounded-xl hover:border-[#4648d4] hover:shadow-md transition-all group"
              >
                <span className="text-sm font-bold text-[#1b1b23] group-hover:text-[#4648d4]" style={{ fontFamily: 'Manrope' }}>{stock.name}</span>
                <span className="text-xs text-[#767586]">{stock.desc}</span>
                <span className="text-[10px] text-[#c7c4d7] font-mono mt-1">{stock.code}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
    const metrics = analyzeResult.metrics
    return (
      <div className="flex flex-col gap-6">
        {(() => {
          switch (currentRole) {
            case 'stock': return <StockDashboard metrics={metrics} ohlcv={ohlcv} investorData={investorData} dartData={dartData} />
            case 'fund': return <FundDashboard metrics={metrics} ohlcv={ohlcv} dartData={dartData} />
            case 'financial': return <FinancialDashboard metrics={metrics} dartData={dartData} />
            case 'analyst': return <AnalystDashboard metrics={metrics} ohlcv={ohlcv} dartData={dartData} />
            default: return null
          }
        })()}
        <InsightBox insight={insight} loading={insightLoading} />
        <DartInsight data={dartData} loading={dartLoading} />
      </div>
    )
  }

  // 사이드바 내부 콘텐츠 (데스크톱 + 모바일 공용)
  const renderSidebar = (onSearch?: () => void) => (
    <div className="flex flex-col gap-6">
      {/* 현재 직군 */}
      <div className="bg-[#4648d4]/10 border border-[#4648d4]/20 rounded-xl p-4">
        <p className="text-[11px] font-bold text-[#4648d4] uppercase tracking-widest mb-2">Current Role</p>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl" style={{ color: config.color }}>{config.icon}</span>
          <span className="text-lg font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>{config.label}</span>
        </div>
      </div>

      {/* 종목 검색 */}
      <div>
        <p className="text-sm font-bold text-[#1b1b23] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>
          종목코드 입력
        </p>
        <div ref={stockSearchRef} className="relative mb-3">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767586] z-10">search</span>
          <input
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            onFocus={() => { if (stockSearchResults.length > 0) setStockDropdownOpen(true) }}
            onKeyDown={e => e.key === 'Enter' && handleTicker()}
            placeholder="삼성전자, 005930..."
            className="w-full bg-[#f5f2fe] border border-[#c7c4d7] rounded-xl pl-12 pr-12 py-4 text-base focus:border-[#4648d4] focus:outline-none transition-all text-[#1b1b23] placeholder:text-[#767586]"
          />
          {stockSearchLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#c7c4d7] border-t-[#4648d4] rounded-full animate-spin" />
            </div>
          )}
          {stockDropdownOpen && stockSearchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-white border border-[#c7c4d7] rounded-xl shadow-xl overflow-hidden">
              {stockSearchResults.map(item => (
                <button key={item.ticker} type="button"
                  onClick={() => {
                    setTicker(item.ticker)
                    setStockDropdownOpen(false)
                    handleTicker(item.ticker, item.name)
                    onSearch?.()
                  }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f5f2fe] transition-all"
                >
                  <span className="text-sm font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>{item.name}</span>
                  <span className="text-xs text-[#767586] font-mono">{item.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { handleTicker(); onSearch?.() }}
          className="w-full bg-[#4648d4] hover:bg-[#2f2ebe] text-white font-bold py-4 rounded-xl text-base transition-all active:scale-95 shadow-lg shadow-[#4648d4]/20"
          style={{ fontFamily: 'Manrope' }}
        >
          조회
        </button>
      </div>

      {/* 추천 종목 칩 */}
      <div className="flex flex-wrap gap-2">
        {[
          { code: '005930', name: '삼성전자' },
          { code: '000660', name: 'SK하이닉스' },
          { code: '035420', name: 'NAVER' },
          { code: '005380', name: '현대차' },
        ].map(stock => (
          <button key={stock.code}
            onClick={() => { handleTicker(stock.code); onSearch?.() }}
            className="px-3 py-1.5 bg-[#f5f2fe] border border-[#c7c4d7] rounded-lg text-xs text-[#464554] hover:border-[#4648d4] hover:text-[#4648d4] transition-all"
            style={{ fontFamily: 'Manrope' }}
          >
            {stock.name}
          </button>
        ))}
      </div>

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
        <label className="block w-full border-2 border-dashed border-[#c7c4d7] rounded-xl p-6 text-center cursor-pointer hover:border-[#4648d4] transition-colors group">
          <span className="material-symbols-outlined text-4xl text-[#767586] group-hover:text-[#4648d4] transition-colors block mb-2">upload_file</span>
          <p className="text-sm text-[#464554] font-medium mb-1">클릭하여 파일 업로드</p>
          <p className="text-xs text-[#767586]">CSV · Excel · JSON</p>
          <input type="file" accept=".csv,.xlsx,.xls,.json,.pdf" onChange={e => { handleFile(e); onSearch?.() }} className="hidden" />
        </label>
      </div>

      {uploadResult && (
        <div className="border border-[#c7c4d7] rounded-xl p-4 bg-white/80">
          <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">파싱 결과</p>
          <p className="text-sm text-[#1b1b23] font-mono mb-1">{uploadResult.row_count}행 · {uploadResult.data_type}</p>
          {uploadResult.ai_mapped_columns && Object.keys(uploadResult.ai_mapped_columns).length > 0 && (
            <p className="text-sm text-[#4648d4]">✨ AI 매핑 {Object.keys(uploadResult.ai_mapped_columns).length}개 컬럼</p>
          )}
          {warnings.map((w: any, i: number) => (
            <div key={i} className="mt-2"><WarningBadge level={w.level} msg={w.msg} /></div>
          ))}
        </div>
      )}

      {companyName && (
        <div className="border border-[#c7c4d7] rounded-xl p-4 bg-white/80">
          <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">조회 종목</p>
          <p className="text-xl font-bold text-[#1b1b23] font-mono">{companyName}</p>
          <p className="text-sm text-[#4648d4] mt-1">KRX Live Data</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fcf8ff] text-[#1b1b23]">

      {/* 모바일 검색 오버레이 */}
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col md:hidden">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-[#c7c4d7] flex-shrink-0">
            <button onClick={() => setMobileSearchOpen(false)}
              className="material-symbols-outlined text-[#464554]">arrow_back</button>
            <p className="font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>종목 검색</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {renderSidebar(() => setMobileSearchOpen(false))}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#c7c4d7]/50 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <button onClick={() => navigate('/')}>
            <img src="/logo.png" alt="Prism" className="h-8" />
          </button>
          <div className="flex items-center gap-2 md:gap-3">
            {/* 모바일 검색 버튼 */}
            <button onClick={() => setMobileSearchOpen(true)}
              className="md:hidden material-symbols-outlined text-[#4648d4]">search</button>

            <div className="relative">
              <button onClick={() => { setShowNotifications(v => !v); setShowSettings(false) }}
                className="material-symbols-outlined text-[#464554] hover:text-[#1b1b23] transition-colors">notifications</button>
              {showNotifications && (
                <div className="absolute right-0 top-10 w-72 bg-white border border-[#c7c4d7] rounded-xl shadow-xl z-50 p-4">
                  <p className="text-xs font-bold text-[#1b1b23] uppercase tracking-widest mb-3">알림</p>
                  {warnings.length > 0 ? warnings.map((w: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 py-2 border-b border-[#c7c4d7] last:border-0">
                      <span className="material-symbols-outlined text-[#D97706] text-sm mt-0.5">warning</span>
                      <p className="text-xs text-[#464554]">{w.msg}</p>
                    </div>
                  )) : <p className="text-xs text-[#767586]">새 알림이 없습니다</p>}
                </div>
              )}
            </div>
            {analyzeResult && (
              <button onClick={handleExportPdf} disabled={exporting}
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-[#4648d4] text-white text-xs font-bold rounded-lg hover:bg-[#2f2ebe] transition-all disabled:opacity-50"
                style={{ fontFamily: 'Manrope' }}>
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                {exporting ? '생성 중...' : 'PDF'}
              </button>
            )}
            <div className="relative">
              <button onClick={() => { setShowSettings(v => !v); setShowNotifications(false) }}
                className="material-symbols-outlined text-[#464554] hover:text-[#1b1b23] transition-colors">settings</button>
              {showSettings && (
                <div className="absolute right-0 top-10 w-64 bg-white border border-[#c7c4d7] rounded-xl shadow-xl z-50 p-4">
                  <p className="text-xs font-bold text-[#1b1b23] uppercase tracking-widest mb-3">설정</p>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: '무위험수익률', value: '3.5%' },
                      { label: '연율화 기준', value: '252일' },
                      { label: '금액 단위', value: '억원' },
                      { label: '색상 기준', value: '한국 (상승=적색)' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between">
                        <p className="text-xs text-[#464554]">{s.label}</p>
                        <span className="text-xs font-bold text-[#4648d4]">{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button className="material-symbols-outlined text-[#4648d4]">account_circle</button>
          </div>
        </div>

        {/* 직군 탭 - 모바일에서 가로 스크롤 */}
        <div className="flex items-center border-t border-[#c7c4d7]/50 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center px-4 md:px-6 flex-shrink-0 w-full">
            {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([r, c]) => (
              <button key={r} onClick={() => navigate(`/dashboard/${r}`)}
                className={`flex items-center gap-1.5 px-3 md:px-5 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex-shrink-0 ${r === currentRole
                  ? 'border-[#4648d4] text-[#4648d4]'
                  : 'border-transparent text-[#767586] hover:text-[#1b1b23]'
                  }`} style={{ fontFamily: 'Manrope' }}>
                <span className="material-symbols-outlined text-sm">{c.icon}</span>
                <span className="hidden sm:inline">{c.label}</span>
                <span className="sm:hidden">{c.label.split(' ')[0]}</span>
              </button>
            ))}
            <div className="ml-auto flex-shrink-0 pr-2">
              <span className="text-[10px] text-[#c7c4d7] font-mono hidden md:inline">Skills.md v0.1</span>
            </div>
          </div>
        </div>
      </header>

      {/* 본문 */}
      <div className="pt-[112px] flex min-h-screen">

        {/* 데스크톱 사이드바 */}
        <div className="hidden md:flex w-[22%] xl:w-[20%] min-h-[calc(100vh-105px)] border-r border-[#c7c4d7] p-6 flex-col gap-6 bg-white/80 overflow-y-auto">
          {renderSidebar()}
        </div>

        {/* 메인 대시보드 */}
        <div id="dashboard-content" className="flex-1 p-4 md:p-6 overflow-y-auto">
          {loading ? <Loading /> : renderDashboard()}
        </div>
      </div>

      {/* 데스크톱 FAB (파일 업로드) */}
      <label className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-[#4648d4] rounded-full shadow-2xl shadow-[#4648d4]/40 items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer">
        <span className="material-symbols-outlined text-3xl">add</span>
        <input type="file" accept=".csv,.xlsx,.xls,.json,.pdf" onChange={handleFile} className="hidden" />
      </label>

      {/* 모바일 FAB (검색) */}
      <button
        onClick={() => setMobileSearchOpen(true)}
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#4648d4] rounded-full shadow-2xl shadow-[#4648d4]/40 flex items-center justify-center text-white active:scale-95 transition-all z-50"
      >
        <span className="material-symbols-outlined text-2xl">search</span>
      </button>
    </div>
  )
}

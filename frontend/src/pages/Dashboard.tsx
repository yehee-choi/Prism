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
import DartInsight from '../components/common/DartInsight'
import { fmt } from '../utils/fmt'
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

type Role = 'stock' | 'fund' | 'financial' | 'analyst'

const ROLE_CONFIG = {
  stock: { label: 'Stock Investor', icon: 'trending_up', color: '#6366F1' },
  fund: { label: 'Fund Manager', icon: 'leaderboard', color: '#059669' },
  financial: { label: 'Accountant', icon: 'account_balance', color: '#D97706' },
  analyst: { label: 'Analyst', icon: 'query_stats', color: '#9333EA' },
}

// ── PDF 리포트 헬퍼 ───────────────────────────────────────────
const R = {
  row: (label: string, value: string, warn?: boolean) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0edf8' }}>
      <span style={{ fontSize: 11, color: '#767586' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: warn ? '#E84040' : '#1b1b23' }}>{value}</span>
    </div>
  ),
  kpi: (label: string, value: string, sub?: string, color?: string) => (
    <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: '10px 14px', background: '#faf9fe' }}>
      <div style={{ fontSize: 10, color: '#767586', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || '#1b1b23' }}>{value}</div>
      {sub && <div style={{ fontSize: 9, color: '#a0a0b0', marginTop: 2 }}>{sub}</div>}
    </div>
  ),
  section: (title: string, children: React.ReactNode, accent?: string) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: accent || '#4648d4' }} />
        <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1b1b23', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</h2>
      </div>
      {children}
    </div>
  ),
  grid: (cols: number, children: React.ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 8 }}>
      {children}
    </div>
  ),
  badge: (text: string, color: string) => (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${color}18`, color }}>{text}</span>
  ),
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
    if (!analyzeResult) return
    if (uploadResult) {
      fetchInsight(analyzeResult.metrics, currentRole, uploadResult.data_type || 'unknown', uploadResult.extra_data, uploadResult.extra_context)
    } else if (dartData) {
      fetchInsight(analyzeResult.metrics, currentRole, 'stock', null, {
        file_summary: dartData.corp_name ? `${dartData.corp_name} DART 공시 데이터` : null,
        text_analysis: dartData.summary ? { 공시요약: dartData.summary } : {},
        anomalies: dartData.pe_detected ? [`PE 대주주 감지: ${dartData.pe_keywords?.join(', ')}`] : [],
      })
    }
  }, [currentRole])

  useEffect(() => {
    const keyword = ticker.trim()
    if (!keyword) { setStockSearchResults([]); setStockDropdownOpen(false); return }
    const timer = setTimeout(async () => {
      setStockSearchLoading(true)
      try {
        const results = await searchStock(keyword)
        setStockSearchResults(results)
        setStockDropdownOpen(results.length > 0)
      } catch (e) {
        setStockSearchResults([]); setStockDropdownOpen(false)
      } finally { setStockSearchLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [ticker])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stockSearchRef.current && !stockSearchRef.current.contains(e.target as Node)) setStockDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportPdf = async () => {
    setExporting(true)
    const label = companyName || ticker || currentRole
    await exportPdf('pdf-report-content', `prism-${currentRole}-${label}`)
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
    setLoading(true); setInsight('')
    try {
      const result = await uploadFile(file)
      setUploadResult(result)
      setWarnings(result.warnings || [])
      if (result.success && result.data) {
        const analysis = await analyzeData(result.data, currentRole)
        setAnalyzeResult(analysis)
        if (result.data[0]?.close) setOhlcv(result.data)
        const identifiedTicker = result.identified_ticker
        const identifiedName = result.identified_name
        if (identifiedTicker || identifiedName) {
          setDartLoading(true)
          try {
            const dart = await fetchDartFull(identifiedTicker || identifiedName)
            setDartData(dart)
          } catch (e) { console.error(e) }
          setDartLoading(false)
        }
        await fetchInsight(analysis.metrics, currentRole, result.data_type, result.extra_data, result.extra_context)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleTicker = async (inputTicker?: string, inputName?: string) => {
    let target = inputTicker || ticker
    if (!target) return
    if (!/^\d+$/.test(target.trim())) {
      try {
        const results = await searchStock(target.trim())
        if (results.length === 0) { alert(`"${target}"에 해당하는 종목을 찾을 수 없습니다.`); return }
        inputName = inputName || results[0].name
        target = results[0].ticker
        setTicker(target)
      } catch (e) { console.error(e); return }
    }
    if (inputName) setCompanyName(inputName)
    else setCompanyName(target)
    setStockDropdownOpen(false); setLoading(true); setInsight('')
    try {
      const today = new Date()
      const end = today.toISOString().slice(0, 10).replace(/-/g, '')
      const prev = new Date(today); prev.setFullYear(prev.getFullYear() - 1)
      const start = prev.toISOString().slice(0, 10).replace(/-/g, '')
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
      const endYesterday = yesterday.toISOString().slice(0, 10).replace(/-/g, '')
      const [ohlcvResult, investorResult, kospiRes] = await Promise.all([
        fetchStockOhlcv(target, start, end),
        fetchStockInvestor(target, start, end),
        fetch(`https://prism-production-fee9.up.railway.app/stock/kospi?start=${start}&end=${endYesterday}`).then(r => r.json()),
      ])
      if (ohlcvResult.success && ohlcvResult.data) {
        setOhlcv(ohlcvResult.data)
        const analysis = await analyzeData(ohlcvResult.data, currentRole, kospiRes.success ? kospiRes.returns : [])
        setAnalyzeResult(analysis)
        setDartLoading(true)
        const dart = await fetchDartFull(target)
        setDartData(dart)
        setDartLoading(false)
        await fetchInsight(analysis.metrics, currentRole, 'stock', null, {
          file_summary: dart.corp_name ? `${dart.corp_name} DART 공시 데이터` : null,
          text_analysis: dart.summary ? { 공시요약: dart.summary } : {},
          anomalies: dart.pe_detected ? [`PE 대주주 감지: ${dart.pe_keywords?.join(', ')}`] : [],
        })
      }
      if (investorResult.success && investorResult.data) setInvestorData(investorResult.data)
      setWarnings([])
    } catch (e) { console.error(e); setDartLoading(false) }
    setLoading(false)
  }

  const renderDashboard = () => {
    if (!analyzeResult) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6">
          <span className="material-symbols-outlined text-[80px] text-[#c7c4d7]">query_stats</span>
          <div className="text-center">
            <p className="text-[#767586] text-sm mb-1">종목코드를 입력하거나 파일을 업로드해주세요</p>
            <p className="text-[#767586] text-xs">CSV · Excel · JSON · PDF 모든 형태 지원</p>
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
                <button key={stock.code} onClick={() => handleTicker(stock.code, stock.name)}
                  className="flex flex-col items-center px-6 py-4 bg-white border border-[#c7c4d7] rounded-xl hover:border-[#4648d4] hover:shadow-md transition-all group">
                  <span className="text-sm font-bold text-[#1b1b23] group-hover:text-[#4648d4]" style={{ fontFamily: 'Manrope' }}>{stock.name}</span>
                  <span className="text-xs text-[#767586]">{stock.desc}</span>
                  <span className="text-[10px] text-[#c7c4d7] font-mono mt-1">{stock.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    }
    const metrics = analyzeResult.metrics
    return (
      <div className="flex flex-col gap-6">
        {(() => {
          switch (currentRole) {
            case 'stock': return <StockDashboard metrics={metrics} ohlcv={ohlcv} investorData={investorData} dartData={dartData} />
            case 'fund': return <FundDashboard metrics={metrics} ohlcv={ohlcv} dartData={dartData} />
            case 'financial': return <FinancialDashboard metrics={metrics} dartData={dartData} rawData={uploadResult?.data} />
            case 'analyst': return <AnalystDashboard metrics={metrics} ohlcv={ohlcv} dartData={dartData} />
            default: return null
          }
        })()}
        <InsightBox insight={insight} loading={insightLoading} />
        <DartInsight data={dartData} loading={dartLoading} />
      </div>
    )
  }

  const renderSidebar = (onSearch?: () => void) => (
    <div className="flex flex-col gap-6">
      <div className="bg-[#4648d4]/10 border border-[#4648d4]/20 rounded-xl p-4">
        <p className="text-[11px] font-bold text-[#4648d4] uppercase tracking-widest mb-2">Current Role</p>
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl" style={{ color: config.color }}>{config.icon}</span>
          <span className="text-lg font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>{config.label}</span>
        </div>
      </div>

      <div>
        <p className="text-sm font-bold text-[#1b1b23] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>종목코드 입력</p>
        <div ref={stockSearchRef} className="relative mb-3">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#767586] z-10">search</span>
          <input value={ticker} onChange={e => setTicker(e.target.value)}
            onFocus={() => { if (stockSearchResults.length > 0) setStockDropdownOpen(true) }}
            onKeyDown={e => e.key === 'Enter' && handleTicker()}
            placeholder="삼성전자, 005930..."
            className="w-full bg-[#f5f2fe] border border-[#c7c4d7] rounded-xl pl-12 pr-12 py-4 text-base focus:border-[#4648d4] focus:outline-none transition-all text-[#1b1b23] placeholder:text-[#767586]" />
          {stockSearchLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-[#c7c4d7] border-t-[#4648d4] rounded-full animate-spin" />
            </div>
          )}
          {stockDropdownOpen && stockSearchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 bg-white border border-[#c7c4d7] rounded-xl shadow-xl overflow-hidden">
              {stockSearchResults.map(item => (
                <button key={item.ticker} type="button"
                  onClick={() => { setTicker(item.ticker); setStockDropdownOpen(false); handleTicker(item.ticker, item.name); onSearch?.() }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f5f2fe] transition-all">
                  <span className="text-sm font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>{item.name}</span>
                  <span className="text-xs text-[#767586] font-mono">{item.ticker}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => { handleTicker(); onSearch?.() }}
          className="w-full bg-[#4648d4] hover:bg-[#2f2ebe] text-white font-bold py-4 rounded-xl text-base transition-all active:scale-95 shadow-lg shadow-[#4648d4]/20"
          style={{ fontFamily: 'Manrope' }}>조회</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ code: '005930', name: '삼성전자' }, { code: '000660', name: 'SK하이닉스' }, { code: '035420', name: 'NAVER' }, { code: '005380', name: '현대차' }].map(stock => (
          <button key={stock.code} onClick={() => { handleTicker(stock.code, stock.name); onSearch?.() }}
            className="px-3 py-1.5 bg-[#f5f2fe] border border-[#c7c4d7] rounded-lg text-xs text-[#464554] hover:border-[#4648d4] hover:text-[#4648d4] transition-all"
            style={{ fontFamily: 'Manrope' }}>{stock.name}</button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-[#c7c4d7]" />
        <span className="text-[#767586] text-sm">또는</span>
        <div className="flex-1 h-px bg-[#c7c4d7]" />
      </div>

      <div>
        <p className="text-sm font-bold text-[#1b1b23] uppercase tracking-widest mb-3" style={{ fontFamily: 'Manrope' }}>파일 업로드</p>
        <label className="block w-full border-2 border-dashed border-[#c7c4d7] rounded-xl p-6 text-center cursor-pointer hover:border-[#4648d4] transition-colors group">
          <span className="material-symbols-outlined text-4xl text-[#767586] group-hover:text-[#4648d4] transition-colors block mb-2">upload_file</span>
          <p className="text-sm text-[#464554] font-medium mb-1">클릭하여 파일 업로드</p>
          <p className="text-xs text-[#767586]">CSV · Excel · JSON · PDF</p>
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
          {warnings.map((w: any, i: number) => (<div key={i} className="mt-2"><WarningBadge level={w.level} msg={w.msg} /></div>))}
          {uploadResult.dart_supplement?.corp_name && (
            <p className="text-sm text-[#4648d4] mt-1">
              🔗 DART 자동 보완: {uploadResult.dart_supplement.corp_name}
              <span className="text-xs text-[#767586] ml-1">({uploadResult.dart_supplement.columns_added?.length}개 항목)</span>
            </p>
          )}
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

  // ── PDF 리포트 렌더링 ─────────────────────────────────────────
  const renderPdfReport = () => {
    if (!analyzeResult) return null
    const m = analyzeResult.metrics
    const financial = dartData?.financial
    const getIS = (name: string) => financial?.is_?.find((r: any) => r.account === name || r.account.startsWith(name))
    const getBS = (name: string) => financial?.bs?.find((r: any) => r.account === name || r.account.startsWith(name))
    const revenue = getIS('매출액') || getIS('수익(매출액)')
    const opIncome = getIS('영업이익') || getIS('영업이익(손실)')
    const netIncome = getIS('당기순이익') || getIS('당기순이익(손실)')
    const totalAssets = getBS('자산총계')
    const totalLiab = getBS('부채총계')
    const totalEquity = getBS('자본총계')
    const currentAsset = getBS('유동자산')
    const currentLiab = getBS('유동부채')
    const accentColor = config.color

    return (
      <div id="pdf-report-content" style={{ width: 794, background: '#fff', color: '#1b1b23', fontFamily: 'sans-serif', padding: 0 }}>

        {/* 헤더 */}
        <div style={{ background: '#1b1b23', color: '#fff', padding: '32px 40px 24px', marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: '#a0a0c0', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Prism Investment Report</div>
              <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>{companyName || ticker || 'Investment Analysis'}</div>
              {ticker && <div style={{ fontSize: 12, color: '#a0a0c0', marginTop: 4 }}>{ticker} · KRX</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, padding: '4px 12px', border: `1px solid ${accentColor}`, borderRadius: 99, marginBottom: 8, display: 'inline-block' }}>{config.label}</div>
              <div style={{ fontSize: 10, color: '#a0a0c0', display: 'block' }}>Generated {new Date().toISOString().slice(0, 10)}</div>
              <div style={{ fontSize: 10, color: '#a0a0c0' }}>Skills.md v0.1</div>
            </div>
          </div>
        </div>

        {/* 경보 배너 */}
        {warnings.length > 0 && (
          <div style={{ background: '#FEF3C7', borderLeft: '4px solid #F59E0B', padding: '10px 40px', fontSize: 11, color: '#92400E' }}>
            ⚠️ 데이터 품질 경고: {warnings.map((w: any) => w.msg).join(' · ')}
          </div>
        )}

        <div style={{ padding: '28px 40px' }}>

          {/* AI Executive Summary */}
          {R.section('AI Executive Summary', (
            <div style={{ background: '#f5f2fe', borderRadius: 10, padding: '14px 16px', borderLeft: `3px solid ${accentColor}` }}>
              <div style={{ fontSize: 10, color: accentColor, fontWeight: 700, marginBottom: 6 }}>POWERED BY CLAUDE SONNET · SKILLS.MD ENGINE</div>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: '#1b1b23', margin: 0 }}>{insight || 'AI 인사이트가 생성되지 않았습니다.'}</p>
            </div>
          ), accentColor)}

          {/* 직군별 핵심 KPI */}
          {R.section('핵심 지표', (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {/* 수익률 */}
              {m?.returns?.simple_return != null && R.kpi('단순 수익률', fmt.pct(m.returns.simple_return), '1년', m.returns.simple_return > 0 ? '#E84040' : '#3B82F6')}
              {m?.returns?.cagr != null && R.kpi('CAGR', fmt.pct(m.returns.cagr), '연평균', m.returns.cagr > 0 ? '#E84040' : '#3B82F6')}
              {m?.risk?.mdd != null && R.kpi('MDD', fmt.pct(m.risk.mdd), '최대낙폭', '#3B82F6')}
              {m?.risk?.volatility != null && R.kpi('변동성', fmt.pct(m.risk.volatility), '연율화')}
              {m?.risk_adjusted?.sharpe != null && R.kpi('샤프지수', fmt.num(m.risk_adjusted.sharpe, 2), '기준 1 이상', m.risk_adjusted.sharpe >= 1 ? '#10B981' : '#F59E0B')}
              {m?.risk_adjusted?.calmar != null && R.kpi('칼마 비율', fmt.num(m.risk_adjusted.calmar, 2), '기준 1 이상')}
              {m?.credit_risk?.current_ratio != null && R.kpi('유동비율', `${m.credit_risk.current_ratio.toFixed(1)}%`, '기준 100%↑', m.credit_risk.current_ratio >= 100 ? '#10B981' : '#E84040')}
              {m?.credit_risk?.interest_coverage != null && R.kpi('이자보상배율', `${m.credit_risk.interest_coverage.toFixed(2)}배`, '기준 1배↑', m.credit_risk.interest_coverage >= 1 ? '#10B981' : '#E84040')}
              {m?.valuation?.roe != null && R.kpi('ROE', `${m.valuation.roe.toFixed(1)}%`, '자본수익률', m.valuation.roe > 0 ? '#10B981' : '#E84040')}
              {m?.valuation?.operating_margin != null && R.kpi('영업이익률', `${m.valuation.operating_margin.toFixed(1)}%`, '수익성')}
              {m?.valuation?.debt_ratio != null && R.kpi('부채비율', `${m.valuation.debt_ratio.toFixed(1)}%`, '기준 200%↓', m.valuation.debt_ratio <= 200 ? '#10B981' : '#E84040')}
              {m?.credit_risk?.dso != null && R.kpi('DSO', `${m.credit_risk.dso.toFixed(1)}일`, '기준 75일↓', m.credit_risk.dso <= 75 ? '#10B981' : '#E84040')}
            </div>
          ), accentColor)}

          {/* DART 재무제표 */}
          {financial?.year && (
            R.section(`재무제표 요약 (${financial.year}년 DART 사업보고서)`, (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* 손익계산서 */}
                <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#767586', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>손익계산서 (IS)</div>
                  {[
                    { label: '매출액', data: revenue },
                    { label: '영업이익', data: opIncome },
                    { label: '당기순이익', data: netIncome },
                  ].filter(r => r.data).map(({ label, data }) => {
                    const yoy = data.current && data.prior && data.prior !== 0
                      ? ((data.current - data.prior) / Math.abs(data.prior) * 100) : null
                    return (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0edf8' }}>
                        <span style={{ fontSize: 11, color: '#767586' }}>{label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {yoy !== null && <span style={{ fontSize: 10, fontWeight: 700, color: yoy >= 0 ? '#10B981' : '#E84040' }}>{yoy >= 0 ? '▲' : '▼'}{Math.abs(yoy).toFixed(1)}%</span>}
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{data.current_fmt}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* 재무상태표 */}
                <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#767586', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>재무상태표 (BS)</div>
                  {[
                    { label: '자산총계', data: totalAssets },
                    { label: '부채총계', data: totalLiab },
                    { label: '자본총계', data: totalEquity },
                    { label: '유동자산', data: currentAsset },
                    { label: '유동부채', data: currentLiab },
                  ].filter(r => r.data).map(({ label, data }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0edf8' }}>
                      <span style={{ fontSize: 11, color: '#767586' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{data.current_fmt}</span>
                    </div>
                  ))}
                </div>
                {/* 현금흐름표 */}
                {financial.cf && financial.cf.length > 0 && (
                  <div style={{ gridColumn: '1 / -1', border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#767586', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>현금흐름표 (CF)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {financial.cf.slice(0, 3).map((item: any) => (
                        <div key={item.account} style={{ background: '#f8f7fc', borderRadius: 6, padding: '8px 10px' }}>
                          <div style={{ fontSize: 10, color: '#767586', marginBottom: 3 }}>{item.account}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: (item.current ?? 0) >= 0 ? '#10B981' : '#E84040' }}>{item.current_fmt}</div>
                          {item.prior_fmt && item.prior_fmt !== '-' && <div style={{ fontSize: 10, color: '#a0a0b0' }}>전년 {item.prior_fmt}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ), accentColor)
          )}

          {/* 알트만 Z-Score (Accountant) */}
          {currentRole === 'financial' && (() => {
            if (!totalAssets?.current || !totalLiab?.current || !opIncome?.current || !revenue?.current || !totalEquity?.current || !currentAsset?.current || !currentLiab?.current) return null
            const wc = currentAsset.current - currentLiab.current
            const ta = totalAssets.current
            const z = (1.2 * (wc / ta) + 1.4 * (totalEquity.current / ta) + 3.3 * (opIncome.current / ta) + 0.6 * (totalEquity.current / totalLiab.current) + 1.0 * (revenue.current / ta))
            const zRound = Math.round(z * 100) / 100
            const zColor = zRound >= 2.99 ? '#10B981' : zRound >= 1.81 ? '#F59E0B' : '#E84040'
            const zLabel = zRound >= 2.99 ? '안전' : zRound >= 1.81 ? '주의 (회색지대)' : '위험'
            return R.section('부도 조기경보 — 알트만 Z-Score', (
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: '#f8f7fc', borderRadius: 10, padding: '16px 20px' }}>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: zColor }}>{zRound}</div>
                  <div style={{ fontSize: 11, color: '#767586' }}>Z-Score</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: zColor, marginBottom: 6 }}>{zLabel}</div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#767586' }}>
                    <span>● 2.99↑ 안전</span>
                    <span>● 1.81~2.99 주의</span>
                    <span>● 1.81↓ 위험</span>
                  </div>
                </div>
              </div>
            ), accentColor)
          })()}

          {/* 밸류에이션 (Analyst) */}
          {currentRole === 'analyst' && (m?.valuation?.per != null || m?.valuation?.pbr != null) && (
            R.section('밸류에이션 포지션', (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {m.valuation.per != null && (
                  <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#767586', marginBottom: 4 }}>PER</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.valuation.per <= 15 ? '#4648d4' : '#E84040' }}>{m.valuation.per.toFixed(1)}x</div>
                    <div style={{ fontSize: 10, color: '#a0a0b0' }}>{m.valuation.per <= 8 ? '저평가' : m.valuation.per <= 15 ? '적정' : m.valuation.per <= 25 ? '주의' : '고평가'}</div>
                  </div>
                )}
                {m.valuation.pbr != null && (
                  <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 10, color: '#767586', marginBottom: 4 }}>PBR</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.valuation.pbr <= 2 ? '#4648d4' : '#E84040' }}>{m.valuation.pbr.toFixed(2)}x</div>
                    <div style={{ fontSize: 10, color: '#a0a0b0' }}>{m.valuation.pbr <= 1 ? '저평가' : m.valuation.pbr <= 2 ? '적정' : '고평가'}</div>
                  </div>
                )}
              </div>
            ), accentColor)
          )}

          {/* 배당 정보 */}
          {dartData?.dividends?.year && (
            R.section(`배당 정보 (${dartData.dividends.year}년)`, (
              <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                {[
                  { label: '주당 현금배당금', value: dartData.dividends.cash_per_share ? `${Number(String(dartData.dividends.cash_per_share).replace(/,/g, '')).toLocaleString()}원` : null },
                  { label: '배당수익률', value: dartData.dividends.yield_rate ? `${dartData.dividends.yield_rate}%` : null },
                  { label: '배당성향', value: dartData.dividends.payout_ratio ? `${dartData.dividends.payout_ratio}%` : null },
                ].filter(r => r.value).map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0edf8' }}>
                    <span style={{ fontSize: 11, color: '#767586' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{value}</span>
                  </div>
                ))}
              </div>
            ), accentColor)
          )}

          {/* 대주주 현황 */}
          {dartData?.shareholders && dartData.shareholders.length > 0 && (
            R.section('대주주 현황', (
              <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                {dartData.pe_detected && (
                  <div style={{ background: '#FEE2E2', borderRadius: 6, padding: '6px 10px', marginBottom: 8, fontSize: 11, color: '#DC2626', fontWeight: 700 }}>
                    ⚠️ PE 대주주 감지 — 엑시트 리스크 주의: {dartData.pe_keywords?.join(', ')}
                  </div>
                )}
                {dartData.shareholders.slice(0, 5).map((sh: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0edf8' }}>
                    <span style={{ fontSize: 11, color: '#1b1b23' }}>{sh.name} {sh.relation && <span style={{ color: '#767586', fontSize: 10 }}>({sh.relation})</span>}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#4648d4' }}>{sh.ratio}%</span>
                  </div>
                ))}
              </div>
            ), accentColor)
          )}

          {/* 임원 현황 */}
          {dartData?.executives && dartData.executives.length > 0 && (
            R.section('임원 현황', (
              <div style={{ border: '1px solid #e8e5f5', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                  {dartData.executives.slice(0, 6).map((ex: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: i % 2 === 0 ? '#faf9fe' : '#fff', borderRadius: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#1b1b23' }}>{ex.name}</span>
                      <span style={{ fontSize: 10, color: '#767586' }}>{ex.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            ), accentColor)
          )}

          {/* DART 공시 분석 */}
          {dartData?.success && dartData?.items && (
            R.section('DART 공시 분석', (
              <div>
                {dartData.summary && (
                  <div style={{ background: '#f8f7fc', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 12, color: '#1b1b23', lineHeight: 1.6 }}>
                    {dartData.summary}
                  </div>
                )}
                {dartData.items.map((item: any, i: number) => {
                  const colors: any = { '호재': '#E84040', '악재': '#3B82F6', '중립': '#767586' }
                  const c = colors[item.sentiment] || '#767586'
                  return (
                    <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #f0edf8', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: c, minWidth: 28 }}>{item.sentiment}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#1b1b23' }}>{item.title}</div>
                        <div style={{ fontSize: 10, color: '#767586' }}>{item.reason} · {item.date}</div>
                      </div>
                    </div>
                  )
                })}
                {dartData.action && (
                  <div style={{ marginTop: 8, fontSize: 11, color: '#4648d4', fontWeight: 600 }}>💡 권고: {dartData.action}</div>
                )}
              </div>
            ), accentColor)
          )}

          {/* 푸터 */}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e8e5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 10, color: '#767586' }}>Generated by Prism · AI Investment Analysis Platform · Skills.md v0.1</div>
            <div style={{ fontSize: 10, color: '#767586' }}>본 리포트는 AI 분석 결과이며 투자 권유가 아닙니다.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fcf8ff] text-[#1b1b23]">
      {mobileSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col md:hidden">
          <div className="flex items-center gap-3 px-4 h-14 border-b border-[#c7c4d7] flex-shrink-0">
            <button onClick={() => setMobileSearchOpen(false)} className="material-symbols-outlined text-[#464554]">arrow_back</button>
            <p className="font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>종목 검색</p>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{renderSidebar(() => setMobileSearchOpen(false))}</div>
        </div>
      )}

      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#c7c4d7]/50 shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <button onClick={() => navigate('/')}><img src="/logo.png" alt="Prism" className="h-8" /></button>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setMobileSearchOpen(true)} className="md:hidden material-symbols-outlined text-[#4648d4]">search</button>
            <div className="relative">
              <button onClick={() => { setShowNotifications(v => !v); setShowSettings(false) }} className="material-symbols-outlined text-[#464554] hover:text-[#1b1b23] transition-colors">notifications</button>
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
              <button onClick={() => { setShowSettings(v => !v); setShowNotifications(false) }} className="material-symbols-outlined text-[#464554] hover:text-[#1b1b23] transition-colors">settings</button>
              {showSettings && (
                <div className="absolute right-0 top-10 w-64 bg-white border border-[#c7c4d7] rounded-xl shadow-xl z-50 p-4">
                  <p className="text-xs font-bold text-[#1b1b23] uppercase tracking-widest mb-3">설정</p>
                  <div className="flex flex-col gap-3">
                    {[{ label: '무위험수익률', value: '3.5%' }, { label: '연율화 기준', value: '252일' }, { label: '금액 단위', value: '억원' }, { label: '색상 기준', value: '한국 (상승=적색)' }].map(s => (
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
        <div className="flex items-center border-t border-[#c7c4d7]/50 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <div className="flex items-center px-4 md:px-6 flex-shrink-0 w-full">
            {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([r, c]) => (
              <button key={r} onClick={() => navigate(`/dashboard/${r}`)}
                className={`flex items-center gap-1.5 px-3 md:px-5 py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex-shrink-0 ${r === currentRole ? 'border-[#4648d4] text-[#4648d4]' : 'border-transparent text-[#767586] hover:text-[#1b1b23]'}`}
                style={{ fontFamily: 'Manrope' }}>
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

      <div className="pt-[112px] flex min-h-screen">
        <div className="hidden md:flex w-[22%] xl:w-[20%] min-h-[calc(100vh-105px)] border-r border-[#c7c4d7] p-6 flex-col gap-6 bg-white/80 overflow-y-auto">
          {renderSidebar()}
        </div>
        <div id="dashboard-content" className="flex-1 p-4 md:p-6 overflow-y-auto">
          {loading ? <Loading /> : renderDashboard()}
        </div>
      </div>

      <label className="hidden md:flex fixed bottom-8 right-8 w-14 h-14 bg-[#4648d4] rounded-full shadow-2xl shadow-[#4648d4]/40 items-center justify-center text-white hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer">
        <span className="material-symbols-outlined text-3xl">add</span>
        <input type="file" accept=".csv,.xlsx,.xls,.json,.pdf" onChange={handleFile} className="hidden" />
      </label>

      <button onClick={() => setMobileSearchOpen(true)} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-[#4648d4] rounded-full shadow-2xl shadow-[#4648d4]/40 flex items-center justify-center text-white active:scale-95 transition-all z-50">
        <span className="material-symbols-outlined text-2xl">search</span>
      </button>

      {/* PDF 리포트 (숨김 영역) */}
      <div className="fixed left-[-9999px] top-0">
        {renderPdfReport()}
      </div>
    </div>
  )
}
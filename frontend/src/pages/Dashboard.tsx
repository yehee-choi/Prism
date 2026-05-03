import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { uploadFile, analyzeData, fetchStockOhlcv, fetchStockInvestor } from '../api'
import Loading from '../components/common/Loading'
import WarningBadge from '../components/common/WarningBadge'
import StockDashboard from '../components/dashboards/StockDashboard'
import FinancialDashboard from '../components/dashboards/FinancialDashboard'
import FundDashboard from '../components/dashboards/FundDashboard'
import AnalystDashboard from '../components/dashboards/AnalystDashboard'

type Role = 'stock' | 'fund' | 'financial' | 'analyst'

const ROLE_LABELS: Record<Role, string> = {
  stock: '주식 투자자',
  fund: '펀드매니저',
  financial: '회계/재무담당',
  analyst: '애널리스트',
}

const ROLE_COLORS: Record<Role, string> = {
  stock: '#6366F1',
  fund: '#059669',
  financial: '#D97706',
  analyst: '#9333EA',
}

export default function Dashboard() {
  const { role } = useParams()
  const navigate = useNavigate()
  const currentRole = (role as Role) || 'stock'
  const color = ROLE_COLORS[currentRole]

  const [ticker, setTicker] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<any>(null)
  const [analyzeResult, setAnalyzeResult] = useState<any>(null)
  const [ohlcv, setOhlcv] = useState<any[]>([])
  const [investorData, setInvestorData] = useState<any[]>([])
  const [warnings, setWarnings] = useState<any[]>([])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const result = await uploadFile(file)
      setUploadResult(result)
      setWarnings(result.warnings || [])
      if (result.success && result.data) {
        const analysis = await analyzeData(result.data, currentRole)
        setAnalyzeResult(analysis)
        if (result.data[0]?.close) setOhlcv(result.data)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const handleTicker = async () => {
    if (!ticker) return
    setLoading(true)
    try {
      const today = new Date()
      const end = today.toISOString().slice(0,10).replace(/-/g,'')
      const prev = new Date(today)
      prev.setFullYear(prev.getFullYear() - 1)
      const start = prev.toISOString().slice(0,10).replace(/-/g,'')

      const [ohlcvResult, investorResult] = await Promise.all([
        fetchStockOhlcv(ticker, start, end),
        fetchStockInvestor(ticker, start, end),
      ])

      if (ohlcvResult.success && ohlcvResult.data) {
        setOhlcv(ohlcvResult.data)
        const analysis = await analyzeData(ohlcvResult.data, currentRole)
        setAnalyzeResult(analysis)
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
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-6xl">📊</div>
        <p className="text-[#64748B] text-sm">종목코드를 입력하거나 파일을 업로드해주세요</p>
      </div>
    )
    const metrics = analyzeResult.metrics
    switch (currentRole) {
      case 'stock':
        return <StockDashboard metrics={metrics} ohlcv={ohlcv} investorData={investorData} />
      case 'fund':
        return <FundDashboard metrics={metrics} ohlcv={ohlcv} />
      case 'financial':
        return <FinancialDashboard metrics={metrics} />
      case 'analyst':
        return <AnalystDashboard metrics={metrics} ohlcv={ohlcv} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-white">
      <div className="border-b border-[#1E2230] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-[#64748B] hover:text-white text-sm">
            ← Prism
          </button>
          <div className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: color + '22', color }}>
            {ROLE_LABELS[currentRole]}
          </div>
        </div>
        <span className="text-[#1E2230] text-xs font-mono">Skills.md v0.1</span>
      </div>

      <div className="flex h-[calc(100vh-57px)]">
        <div className="w-64 border-r border-[#1E2230] p-4 flex flex-col gap-4">
          <div>
            <p className="text-[#64748B] text-xs mb-2 uppercase tracking-wider">종목코드</p>
            <div className="flex gap-2">
              <input
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTicker()}
                placeholder="005930"
                className="flex-1 bg-[#111318] border border-[#1E2230] rounded-lg px-3 py-2 text-sm text-white placeholder-[#2E3648] focus:outline-none focus:border-[#6366F1]"
              />
              <button onClick={handleTicker}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: color }}>
                조회
              </button>
            </div>
          </div>

          <div>
            <p className="text-[#64748B] text-xs mb-2 uppercase tracking-wider">파일 업로드</p>
            <label className="block w-full border border-dashed border-[#1E2230] rounded-lg p-4 text-center cursor-pointer hover:border-[#6366F1] transition-colors">
              <p className="text-[#64748B] text-xs">CSV · Excel · JSON</p>
              <p className="text-[#2E3648] text-xs mt-1">클릭하여 업로드</p>
              <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleFile} className="hidden" />
            </label>
          </div>

          {uploadResult && (
            <div className="border border-[#1E2230] rounded-lg p-3">
              <p className="text-xs text-[#64748B] mb-1">파싱 결과</p>
              <p className="text-xs text-white">{uploadResult.row_count}행 · {uploadResult.data_type}</p>
              {warnings.map((w: any, i: number) => (
                <div key={i} className="mt-1">
                  <WarningBadge level={w.level} msg={w.msg} />
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto">
            <p className="text-[#64748B] text-xs mb-2 uppercase tracking-wider">직군 전환</p>
            {(['stock','fund','financial','analyst'] as Role[]).map(r => (
              <button key={r} onClick={() => navigate(`/dashboard/${r}`)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs mb-1 transition-colors"
                style={{
                  background: r === currentRole ? color + '22' : 'transparent',
                  color: r === currentRole ? color : '#64748B',
                }}>
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? <Loading /> : renderDashboard()}
        </div>
      </div>
    </div>
  )
}

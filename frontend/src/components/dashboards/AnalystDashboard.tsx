import KpiCard from '../common/KpiCard'
import StockChart from '../charts/StockChart'

interface Props {
  metrics: any
  ohlcv: any[]
}

export default function AnalystDashboard({ metrics, ohlcv }: Props) {
  const returns = metrics?.returns
  const risk = metrics?.risk
  const valuation = metrics?.valuation

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {returns && <>
          <KpiCard label="단순 수익률" value={`${(returns.simple_return * 100).toFixed(2)}%`} positive={returns.simple_return > 0} />
          <KpiCard label="CAGR" value={`${(returns.cagr * 100).toFixed(2)}%`} positive={returns.cagr > 0} />
        </>}
        {risk && <>
          <KpiCard label="MDD" value={`${(risk.mdd * 100).toFixed(2)}%`} color="#3B82F6" />
          <KpiCard label="변동성" value={`${(risk.volatility * 100).toFixed(2)}%`} />
        </>}
        {valuation?.roe !== undefined && (
          <KpiCard label="ROE" value={`${valuation.roe.toFixed(1)}%`} positive={valuation.roe > 0} />
        )}
        {valuation?.operating_margin !== undefined && (
          <KpiCard label="영업이익률" value={`${valuation.operating_margin.toFixed(1)}%`} positive={valuation.operating_margin > 0} />
        )}
      </div>

      {/* 밸류에이션 섹션 */}
      <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
        <p className="text-[#E2E8F0] text-sm font-medium mb-3">밸류에이션 분석</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[#64748B] mb-1">PER 밴드</p>
            <p className="text-xs text-[#2E3648]">재무제표 파일 업로드 시 자동 산출</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B] mb-1">PBR 밴드</p>
            <p className="text-xs text-[#2E3648]">과거 5년 밴드 vs 현재 위치</p>
          </div>
          <div>
            <p className="text-xs text-[#64748B] mb-1">컨센서스 EPS</p>
            <p className="text-xs text-[#2E3648]">리비전 추이 자동 감지</p>
          </div>
        </div>
      </div>

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
    </div>
  )
}

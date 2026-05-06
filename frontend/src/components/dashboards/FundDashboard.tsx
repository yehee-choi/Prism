import KpiCard from '../common/KpiCard'
import StockChart from '../charts/StockChart'

interface Props {
  metrics: any
  ohlcv: any[]
}

export default function FundDashboard({ metrics, ohlcv }: Props) {
  const returns = metrics?.returns
  const risk = metrics?.risk
  const riskAdj = metrics?.risk_adjusted
  const portfolioRisk = metrics?.portfolio_risk  // 추가

  const warnings: string[] = []
  if (riskAdj?.sharpe !== undefined && riskAdj.sharpe < 0) warnings.push('샤프지수 음수 — 무위험자산 수익률 미달')
  if (risk?.mdd && Math.abs(risk.mdd) > 0.2) warnings.push(`MDD ${(risk.mdd * 100).toFixed(1)}% — 위험 관리 필요`)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {returns && <>
          <KpiCard label="누적 수익률" value={`${(returns.cumulative_return * 100).toFixed(2)}%`} positive={returns.cumulative_return > 0} />
          <KpiCard label="CAGR" value={`${(returns.cagr * 100).toFixed(2)}%`} positive={returns.cagr > 0} />
        </>}
        {riskAdj && <>
          <KpiCard label="샤프지수" value={riskAdj.sharpe.toFixed(2)} positive={riskAdj.sharpe > 1} sub="기준 1 이상" />
          <KpiCard label="연율화 수익률" value={`${(riskAdj.ann_return * 100).toFixed(2)}%`} positive={riskAdj.ann_return > 0} />
          {/* 칼마 비율 추가 */}
          {riskAdj.calmar !== undefined && (
            <KpiCard label="칼마 비율" value={riskAdj.calmar.toFixed(2)} positive={riskAdj.calmar > 1} sub="기준 1 이상" />
          )}
        </>}
        {risk && <>
          <KpiCard label="MDD" value={`${(risk.mdd * 100).toFixed(2)}%`} color="#3B82F6" />
          <KpiCard label="연율화 변동성" value={`${(risk.volatility * 100).toFixed(2)}%`} />
        </>}
        {/* portfolio_risk 카드 추가 */}
        {portfolioRisk && <>
          {portfolioRisk.beta !== undefined && (
            <KpiCard label="베타 (β)" value={portfolioRisk.beta.toFixed(2)} positive={portfolioRisk.beta < 1} sub="기준 1 미만" />
          )}
          {portfolioRisk.tracking_error !== undefined && (
            <KpiCard label="Tracking Error" value={`${(portfolioRisk.tracking_error * 100).toFixed(2)}%`} />
          )}
        </>}
      </div>

      {/* 컴플라이언스 */}
      <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
        <p className="text-[#E2E8F0] text-sm font-medium mb-3">컴플라이언스 모니터링</p>
        {warnings.length > 0 ? (
          <div className="flex flex-col gap-2">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-[#F59E0B]">⚠️ {w}</p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#10B981]">✅ 위험 신호 없음</p>
        )}
        <div className="mt-3 pt-3 border-t border-[#1E2230]">
          <p className="text-xs text-[#64748B]">단일 종목 편입 한도 15% 초과 감지 · BM 대비 초과수익 추이</p>
        </div>
      </div>

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
    </div>
  )
}
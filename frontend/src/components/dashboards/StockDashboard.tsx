import KpiCard from '../common/KpiCard'
import RiskScore from '../common/RiskScore'
import StockChart from '../charts/StockChart'
import InvestorChart from '../charts/InvestorChart'

interface Props {
  metrics: any
  ohlcv: any[]
  investorData: any[]
  dartData?: any
}

export default function StockDashboard({ metrics, ohlcv, investorData, dartData }: Props) {
  const returns = metrics?.returns
  const risk = metrics?.risk
  const riskAdj = metrics?.risk_adjusted
  const technical = metrics?.technical
  const dividends = dartData?.dividends

  const mddScore = risk?.mdd ? Math.min(100, Math.abs(risk.mdd) * 200) : 0
  const volScore = risk?.volatility ? Math.min(100, risk.volatility * 150) : 0
  const riskScore = Math.round((mddScore + volScore) / 2)

  const warnings: string[] = []
  if (risk?.mdd && Math.abs(risk.mdd) > 0.2) warnings.push(`MDD ${(risk.mdd * 100).toFixed(1)}% — 최대낙폭 경보`)
  if (risk?.volatility && risk.volatility > 0.4) warnings.push(`변동성 ${(risk.volatility * 100).toFixed(1)}% — 고위험 구간`)
  if (technical?.rsi && technical.rsi > 70) warnings.push(`RSI ${technical.rsi} — 과매수 구간`)
  if (technical?.rsi && technical.rsi < 30) warnings.push(`RSI ${technical.rsi} — 과매도 구간`)
  if (technical?.cross_signal === '데드크로스') warnings.push('데드크로스 감지 — 매도 신호')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {returns && <>
          <KpiCard label="단순 수익률" value={`${(returns.simple_return * 100).toFixed(2)}%`} positive={returns.simple_return > 0} />
          <KpiCard label="CAGR" value={`${(returns.cagr * 100).toFixed(2)}%`} positive={returns.cagr > 0} />
        </>}
        {risk && <>
          <KpiCard label="MDD" value={`${(risk.mdd * 100).toFixed(2)}%`} color="#3B82F6" />
          <KpiCard label="변동성 (연율)" value={`${(risk.volatility * 100).toFixed(2)}%`} />
        </>}
        {riskAdj && <KpiCard label="샤프지수" value={riskAdj.sharpe.toFixed(2)} positive={riskAdj.sharpe > 1} />}
        {technical && <>
          <KpiCard label="RSI (14)" value={technical.rsi ? `${technical.rsi}` : 'N/A'} positive={technical.rsi < 70} />
          <KpiCard label="RSI 신호" value={technical.rsi_signal || 'N/A'} positive={technical.rsi_signal === '과매도'} />
          <KpiCard label="크로스 신호" value={technical.cross_signal || 'N/A'} positive={technical.cross_signal === '골든크로스'} />
        </>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <RiskScore title="종합 리스크 스코어" score={riskScore} warnings={warnings} />
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#767586] text-xs mb-3">VaR (95%)</p>
          {risk?.var_95 !== undefined && <>
            <p className="text-2xl font-bold text-[#3B82F6]">{(risk.var_95 * 100).toFixed(2)}%</p>
            <p className="text-xs text-[#767586] mt-1">하루 최대 손실 예상 (95% 신뢰구간)</p>
          </>}
        </div>
      </div>

      {/* 배당 현황 */}
      {dividends && Object.keys(dividends).length > 0 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
            배당 현황 <span className="text-[10px] text-[#767586] font-normal ml-1">DART {dividends.year}년 사업보고서</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {dividends.cash_per_share && dividends.cash_per_share !== '-' && (
              <div>
                <p className="text-xs text-[#767586] mb-1">주당 현금배당금</p>
                <p className="text-lg font-bold text-[#1b1b23]">{Number(dividends.cash_per_share).toLocaleString()}원</p>
                {dividends.prior_cash_per_share && dividends.prior_cash_per_share !== '-' && (
                  <p className="text-xs text-[#767586]">전년 {Number(dividends.prior_cash_per_share).toLocaleString()}원</p>
                )}
              </div>
            )}
            {dividends.yield_rate && dividends.yield_rate !== '-' && (
              <div>
                <p className="text-xs text-[#767586] mb-1">배당수익률</p>
                <p className="text-lg font-bold text-[#10B981]">{dividends.yield_rate}%</p>
                {dividends.prior_yield_rate && dividends.prior_yield_rate !== '-' && (
                  <p className="text-xs text-[#767586]">전년 {dividends.prior_yield_rate}%</p>
                )}
              </div>
            )}
            {dividends.payout_ratio && dividends.payout_ratio !== '-' && (
              <div>
                <p className="text-xs text-[#767586] mb-1">현금배당성향</p>
                <p className="text-lg font-bold text-[#4648d4]">{dividends.payout_ratio}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
      {investorData.length > 0 && <InvestorChart data={investorData} />}
    </div>
  )
}

import KpiCard from '../common/KpiCard'
import RiskScore from '../common/RiskScore'
import StockChart from '../charts/StockChart'
import InvestorChart from '../charts/InvestorChart'

interface Props {
  metrics: any
  ohlcv: any[]
  investorData: any[]
}

export default function StockDashboard({ metrics, ohlcv, investorData }: Props) {
  const returns = metrics?.returns
  const risk = metrics?.risk
  const riskAdj = metrics?.risk_adjusted
  const technical = metrics?.technical

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
      <div className="grid grid-cols-3 gap-4">
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
      <div className="grid grid-cols-2 gap-4">
        <RiskScore title="종합 리스크 스코어" score={riskScore} warnings={warnings} />
        <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
          <p className="text-[#64748B] text-xs mb-3">VaR (95%)</p>
          {risk?.var_95 !== undefined && <>
            <p className="text-2xl font-bold text-[#3B82F6]">{(risk.var_95 * 100).toFixed(2)}%</p>
            <p className="text-xs text-[#64748B] mt-1">하루 최대 손실 예상 (95% 신뢰구간)</p>
          </>}
        </div>
      </div>
      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
      {investorData.length > 0 && <InvestorChart data={investorData} />}
    </div>
  )
}
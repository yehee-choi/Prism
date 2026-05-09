import KpiCard from '../common/KpiCard'
import RiskScore from '../common/RiskScore'
import StockChart from '../charts/StockChart'
import InvestorChart from '../charts/InvestorChart'
import { fmt } from '../../utils/fmt'

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
  const valuation = metrics?.valuation
  const credit = metrics?.credit_risk
  const dividends = dartData?.dividends

  const mddScore = risk?.mdd ? Math.min(100, Math.abs(risk.mdd) * 200) : 0
  const volScore = risk?.volatility ? Math.min(100, risk.volatility * 150) : 0
  const riskScore = Math.round((mddScore + volScore) / 2)

  const warnings: string[] = []
  if (risk?.mdd && Math.abs(risk.mdd) > 0.2) warnings.push(`MDD ${fmt.pct(risk.mdd)} — 최대낙폭 경보`)
  if (risk?.volatility && risk.volatility > 0.4) warnings.push(`변동성 ${fmt.pct(risk.volatility)} — 고위험 구간`)
  if (technical?.rsi && technical.rsi > 70) warnings.push(`RSI ${technical.rsi} — 과매수 구간`)
  if (technical?.rsi && technical.rsi < 30) warnings.push(`RSI ${technical.rsi} — 과매도 구간`)
  if (technical?.cross_signal === '데드크로스') warnings.push('데드크로스 감지 — 매도 신호')
  if (credit?.current_ratio && credit.current_ratio < 100) warnings.push(`유동비율 ${fmt.num(credit.current_ratio, 1)}% — 유동성 위험`)

  const hasReturns = fmt.hasValue(returns) && returns?.simple_return != null
  const hasRisk = fmt.hasValue(risk) && risk?.mdd != null
  const hasRiskAdj = fmt.hasValue(riskAdj) && riskAdj?.sharpe != null
  const hasTechnical = fmt.hasValue(technical)
  const hasFinancial = fmt.hasValue(valuation) || fmt.hasValue(credit)

  return (
    <div className="flex flex-col gap-6">
      {!hasReturns && !hasRisk && (
        <div className="bg-[#f5f2fe] border border-[#c7c4d7] rounded-xl p-4 text-center">
          <p className="text-sm text-[#767586]">주가(종가) 데이터가 없어 수익률·위험 지표를 계산할 수 없습니다.</p>
          <p className="text-xs text-[#c7c4d7] mt-1">종목코드 조회 또는 OHLCV 포함 파일을 업로드해주세요.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {hasReturns && <>
          <KpiCard label="단순 수익률" value={fmt.pct(returns.simple_return)} positive={returns.simple_return > 0} />
          <KpiCard label="CAGR" value={fmt.pct(returns.cagr)} positive={returns.cagr > 0} />
        </>}
        {hasRisk && <>
          <KpiCard label="MDD" value={fmt.pct(risk.mdd)} color="#3B82F6" />
          <KpiCard label="변동성 (연율)" value={fmt.pct(risk.volatility)} />
        </>}
        {hasRiskAdj && <KpiCard label="샤프지수" value={fmt.num(riskAdj.sharpe)} positive={riskAdj.sharpe > 1} />}
        {hasTechnical && <>
          <KpiCard label="RSI (14)" value={technical.rsi ? `${technical.rsi}` : 'N/A'} positive={technical.rsi < 70} />
          <KpiCard label="RSI 신호" value={technical.rsi_signal || 'N/A'} positive={technical.rsi_signal === '과매도'} />
          <KpiCard label="크로스 신호" value={technical.cross_signal || 'N/A'} positive={technical.cross_signal === '골든크로스'} />
        </>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <RiskScore title="종합 리스크 스코어" score={riskScore} warnings={warnings} />
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#767586] text-xs mb-3">VaR (95%)</p>
          {risk?.var_95 != null
            ? <>
                <p className="text-2xl font-bold text-[#3B82F6]">{fmt.pct(risk.var_95)}</p>
                <p className="text-xs text-[#767586] mt-1">하루 최대 손실 예상 (95% 신뢰구간)</p>
              </>
            : <p className="text-sm text-[#c7c4d7]">주가 데이터 필요</p>
          }
        </div>
      </div>

      {/* 재무 데이터 있으면 표시 (주식 투자자 관점) */}
      {hasFinancial && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">재무 지표 — 투자 리스크 점검</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {valuation?.operating_margin != null && (
              <KpiCard label="영업이익률" value={fmt.num(valuation.operating_margin, 1) + '%'} positive={valuation.operating_margin > 0} sub="수익성" />
            )}
            {valuation?.roe != null && (
              <KpiCard label="ROE" value={fmt.num(valuation.roe, 1) + '%'} positive={valuation.roe > 0} sub="자본수익률" />
            )}
            {valuation?.debt_ratio != null && (
              <KpiCard label="부채비율" value={fmt.num(valuation.debt_ratio, 1) + '%'} positive={valuation.debt_ratio <= 200} sub="기준 200% 이하" />
            )}
            {credit?.current_ratio != null && (
              <KpiCard label="유동비율" value={fmt.num(credit.current_ratio, 1) + '%'} positive={credit.current_ratio >= 100} sub="기준 100% 이상" />
            )}
            {credit?.interest_coverage != null && (
              <KpiCard label="이자보상배율" value={fmt.num(credit.interest_coverage, 2) + '배'} positive={credit.interest_coverage >= 1} sub="기준 1배 이상" />
            )}
            {credit?.dso != null && (
              <KpiCard label="DSO" value={fmt.num(credit.dso, 1) + '일'} positive={credit.dso <= 75} sub="기준 75일 이하" />
            )}
          </div>
        </div>
      )}

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
              </div>
            )}
            {dividends.yield_rate && dividends.yield_rate !== '-' && (
              <div>
                <p className="text-xs text-[#767586] mb-1">배당수익률</p>
                <p className="text-lg font-bold text-[#10B981]">{dividends.yield_rate}%</p>
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
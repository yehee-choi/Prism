import KpiCard from '../common/KpiCard'
import StockChart from '../charts/StockChart'
import { fmt } from '../../utils/fmt'

interface Props {
  metrics: any
  ohlcv: any[]
  dartData?: any
}

export default function FundDashboard({ metrics, ohlcv, dartData }: Props) {
  const returns = metrics?.returns
  const risk = metrics?.risk
  const riskAdj = metrics?.risk_adjusted
  const portfolioRisk = metrics?.portfolio_risk
  const valuation = metrics?.valuation
  const credit = metrics?.credit_risk
  const shareholders = dartData?.shareholders as any[] | undefined
  const shares = dartData?.shares

  const hasReturns = fmt.hasValue(returns) && returns?.cumulative_return != null
  const hasRisk = fmt.hasValue(risk) && risk?.mdd != null
  const hasRiskAdj = fmt.hasValue(riskAdj) && riskAdj?.sharpe != null
  const hasFinancial = fmt.hasValue(valuation) || fmt.hasValue(credit)

  const warnings: string[] = []
  if (hasRiskAdj && riskAdj.sharpe < 0) warnings.push('샤프지수 음수 — 무위험자산 수익률 미달')
  if (hasRisk && Math.abs(risk.mdd) > 0.2) warnings.push(`MDD ${fmt.pct(risk.mdd)} — 위험 관리 필요`)
  if (credit?.current_ratio && credit.current_ratio < 100) warnings.push(`유동비율 ${fmt.num(credit.current_ratio, 1)}% — 편입 부적격 신호`)

  return (
    <div className="flex flex-col gap-6">
      {!hasReturns && !hasRisk && !hasFinancial && (
        <div className="bg-[#f5f2fe] border border-[#c7c4d7] rounded-xl p-4 text-center">
          <p className="text-sm text-[#767586]">수익률 계산에 필요한 주가(종가) 데이터가 없습니다.</p>
          <p className="text-xs text-[#c7c4d7] mt-1">종목코드 조회 또는 NAV/종가 포함 파일을 업로드해주세요.</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {hasReturns && <>
          <KpiCard label="누적 수익률" value={fmt.pct(returns.cumulative_return)} positive={returns.cumulative_return > 0} />
          <KpiCard label="CAGR" value={fmt.pct(returns.cagr)} positive={returns.cagr > 0} />
        </>}
        {hasRiskAdj && <>
          <KpiCard label="샤프지수" value={fmt.num(riskAdj.sharpe)} positive={riskAdj.sharpe > 1} sub="기준 1 이상" />
          <KpiCard label="연율화 수익률" value={fmt.pct(riskAdj.ann_return)} positive={riskAdj.ann_return > 0} />
          {riskAdj.calmar != null && (
            <KpiCard label="칼마 비율" value={fmt.num(riskAdj.calmar)} positive={riskAdj.calmar > 1} sub="기준 1 이상" />
          )}
        </>}
        {hasRisk && <>
          <KpiCard label="MDD" value={fmt.pct(risk.mdd)} color="#3B82F6" />
          <KpiCard label="연율화 변동성" value={fmt.pct(risk.volatility)} />
        </>}
        {portfolioRisk && <>
          {portfolioRisk.beta != null && (
            <KpiCard label="베타 (β)" value={fmt.num(portfolioRisk.beta)} positive={portfolioRisk.beta < 1} sub="기준 1 미만" />
          )}
          {portfolioRisk.tracking_error != null && (
            <KpiCard label="Tracking Error" value={fmt.pct(portfolioRisk.tracking_error)} />
          )}
        </>}
      </div>

      <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
        <p className="text-[#1b1b23] text-sm font-medium mb-3">컴플라이언스 모니터링</p>
        {warnings.length > 0 ? (
          <div className="flex flex-col gap-2">
            {warnings.map((w, i) => <p key={i} className="text-xs text-[#F59E0B]">⚠️ {w}</p>)}
          </div>
        ) : (
          <p className="text-xs text-[#10B981]">✅ 위험 신호 없음</p>
        )}
        <div className="mt-3 pt-3 border-t border-[#c7c4d7]">
          {portfolioRisk?.max_weight != null ? (
            portfolioRisk.max_weight > 0.15
              ? <p className="text-xs text-[#EF4444] font-bold">⚠️ 단일 종목 최대 편입 비중 {fmt.pct(portfolioRisk.max_weight, 1)} — 15% 한도 초과</p>
              : <p className="text-xs text-[#10B981]">✅ 단일 종목 편입 비중 {fmt.pct(portfolioRisk.max_weight, 1)} — 한도 내</p>
          ) : (
            <p className="text-xs text-[#767586]">단일 종목 편입 한도 15% 초과 감지 · BM 대비 초과수익 추이</p>
          )}
        </div>
      </div>

      {/* 재무 데이터 있으면 표시 (펀드매니저 관점) */}
      {hasFinancial && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">재무 건전성 — 편입 적합성 판단</p>
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
              <KpiCard label="유동비율" value={fmt.num(credit.current_ratio, 1) + '%'} positive={credit.current_ratio >= 100} sub="편입 적합성" />
            )}
            {credit?.interest_coverage != null && (
              <KpiCard label="이자보상배율" value={fmt.num(credit.interest_coverage, 2) + '배'} positive={credit.interest_coverage >= 1} sub="부채 상환 능력" />
            )}
            {credit?.dso != null && (
              <KpiCard label="DSO" value={fmt.num(credit.dso, 1) + '일'} positive={credit.dso <= 75} sub="현금흐름 품질" />
            )}
          </div>
        </div>
      )}

      {shareholders && shareholders.length > 0 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#1b1b23] text-sm font-bold" style={{ fontFamily: 'Manrope' }}>대주주 현황</p>
            {dartData?.pe_detected && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs text-[#EF4444] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] inline-block" /> PE 감지
              </span>
            )}
          </div>
          <div className="flex flex-col divide-y divide-[#f0edf8]">
            {shareholders.slice(0, 8).map((sh: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[#1b1b23] font-medium">{sh.name}</span>
                  {sh.relation && <span className="ml-2 text-xs text-[#767586]">{sh.relation}</span>}
                </div>
                {sh.ratio && (
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-[#f0edf8] rounded-full overflow-hidden">
                      <div className="h-full bg-[#4648d4] rounded-full" style={{ width: `${Math.min(100, parseFloat(sh.ratio) * 3)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-[#4648d4] w-12 text-right">{sh.ratio}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {shares && shares.items && shares.items.length > 0 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
            주식 발행 현황 <span className="text-[10px] text-[#767586] font-normal ml-1">{shares.year}년</span>
          </p>
          <div className="flex flex-col gap-3">
            {shares.items.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <span className="text-[#767586] font-medium">{item.type}</span>
                <div><p className="text-[#767586]">발행총수</p><p className="font-bold text-[#1b1b23]">{Number(item.total_issued?.replace(/,/g, '') || 0).toLocaleString()}</p></div>
                <div><p className="text-[#767586]">자기주식</p><p className="font-bold text-[#F59E0B]">{Number(item.treasury?.replace(/,/g, '') || 0).toLocaleString()}</p></div>
                <div><p className="text-[#767586]">유통주식</p><p className="font-bold text-[#10B981]">{Number(item.float?.replace(/,/g, '') || 0).toLocaleString()}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
    </div>
  )
}
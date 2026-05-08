import KpiCard from '../common/KpiCard'
import StockChart from '../charts/StockChart'

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
  const shareholders = dartData?.shareholders as any[] | undefined
  const shares = dartData?.shares

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
          {riskAdj.calmar !== undefined && (
            <KpiCard label="칼마 비율" value={riskAdj.calmar.toFixed(2)} positive={riskAdj.calmar > 1} sub="기준 1 이상" />
          )}
        </>}
        {risk && <>
          <KpiCard label="MDD" value={`${(risk.mdd * 100).toFixed(2)}%`} color="#3B82F6" />
          <KpiCard label="연율화 변동성" value={`${(risk.volatility * 100).toFixed(2)}%`} />
        </>}
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
      <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
        <p className="text-[#1b1b23] text-sm font-medium mb-3">컴플라이언스 모니터링</p>
        {warnings.length > 0 ? (
          <div className="flex flex-col gap-2">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-[#F59E0B]">⚠️ {w}</p>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#10B981]">✅ 위험 신호 없음</p>
        )}
        <div className="mt-3 pt-3 border-t border-[#c7c4d7]">
          {portfolioRisk?.max_weight !== undefined ? (
            portfolioRisk.max_weight > 0.15 ? (
              <p className="text-xs text-[#EF4444] font-bold">
                ⚠️ 단일 종목 최대 편입 비중 {(portfolioRisk.max_weight * 100).toFixed(1)}% — 15% 한도 초과
              </p>
            ) : (
              <p className="text-xs text-[#10B981]">
                ✅ 단일 종목 편입 비중 {(portfolioRisk.max_weight * 100).toFixed(1)}% — 한도 내
              </p>
            )
          ) : (
            <p className="text-xs text-[#767586]">단일 종목 편입 한도 15% 초과 감지 · BM 대비 초과수익 추이</p>
          )}
        </div>
      </div>

      {/* 대주주 현황 */}
      {shareholders && shareholders.length > 0 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#1b1b23] text-sm font-bold" style={{ fontFamily: 'Manrope' }}>대주주 현황</p>
            {dartData?.pe_detected && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-200 rounded-full text-xs text-[#EF4444] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] inline-block" />
                PE 감지
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
                <div className="flex items-center gap-3">
                  {sh.ratio && (
                    <>
                      <div className="w-24 h-1.5 bg-[#f0edf8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4648d4] rounded-full"
                          style={{ width: `${Math.min(100, parseFloat(sh.ratio) * 3)}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-[#4648d4] w-12 text-right">{sh.ratio}%</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 주식 발행 현황 */}
      {shares && shares.items && shares.items.length > 0 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
            주식 발행 현황 <span className="text-[10px] text-[#767586] font-normal ml-1">{shares.year}년</span>
          </p>
          <div className="flex flex-col gap-3">
            {shares.items.map((item: any, i: number) => (
              <div key={i} className="grid grid-cols-4 gap-2 text-xs">
                <span className="text-[#767586] font-medium">{item.type}</span>
                <div>
                  <p className="text-[#767586]">발행총수</p>
                  <p className="font-bold text-[#1b1b23]">{Number(item.total_issued?.replace(/,/g, '') || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[#767586]">자기주식</p>
                  <p className="font-bold text-[#F59E0B]">{Number(item.treasury?.replace(/,/g, '') || 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[#767586]">유통주식</p>
                  <p className="font-bold text-[#10B981]">{Number(item.float?.replace(/,/g, '') || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
    </div>
  )
}

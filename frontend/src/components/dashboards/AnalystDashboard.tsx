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
  const targetPrice = metrics?.target_price

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

      {/* 목표주가 & 투자의견 */}
      {targetPrice && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">목표주가 · 투자의견</p>
          <div className="grid grid-cols-4 gap-4">
            {targetPrice.target_price !== undefined && (
              <KpiCard
                label="목표주가"
                value={`${targetPrice.target_price.toLocaleString()}원`}
                positive={targetPrice.upside > 0}
              />
            )}
            {targetPrice.current_per !== undefined && (
              <KpiCard
                label="현재 PER"
                value={`${targetPrice.current_per.toFixed(1)}x`}
                positive={targetPrice.current_per > 0}
                sub="배수"
              />
            )}
            {targetPrice.upside !== undefined && (
              <KpiCard
                label="상승여력"
                value={`${targetPrice.upside.toFixed(1)}%`}
                positive={targetPrice.upside > 0}
                color={targetPrice.upside >= 20 ? '#10B981' : targetPrice.upside < 0 ? '#EF4444' : undefined}
                sub={targetPrice.upside >= 20 ? '강력 매수 구간' : targetPrice.upside < 0 ? '하락 위험' : undefined}
              />
            )}
            {targetPrice.opinion !== undefined && (
              <KpiCard
                label="투자의견"
                value={targetPrice.opinion}
                positive={['매수', 'BUY', '적극매수'].includes(targetPrice.opinion)}
                color={
                  ['매수', 'BUY', '적극매수'].includes(targetPrice.opinion) ? '#10B981'
                    : ['중립', 'HOLD', '보유'].includes(targetPrice.opinion) ? '#F59E0B'
                      : '#EF4444'
                }
              />
            )}
          </div>
        </div>
      )}

      {/* 추가 밸류에이션 멀티플 */}
      {(valuation?.ev_ebitda !== undefined || valuation?.psr !== undefined) && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">밸류에이션 멀티플</p>
          <div className="grid grid-cols-4 gap-4">
            {valuation.ev_ebitda !== undefined && (
              <KpiCard
                label="EV/EBITDA"
                value={`${valuation.ev_ebitda.toFixed(1)}x`}
                sub="기준 10x 이하"
                positive={valuation.ev_ebitda <= 10}
              />
            )}
            {valuation.psr !== undefined && (
              <KpiCard
                label="PSR"
                value={`${valuation.psr.toFixed(2)}x`}
                sub="기준 1x 이하"
                positive={valuation.psr <= 1}
              />
            )}
          </div>
        </div>
      )}

      {/* 밸류에이션 섹션 */}
      <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
        <p className="text-[#1b1b23] text-sm font-medium mb-3">밸류에이션 분석</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[#767586] mb-1">PER 밴드</p>
            {valuation?.per !== undefined ? (
              <p className="text-sm font-bold text-[#1b1b23]">{valuation.per.toFixed(1)}x</p>
            ) : (
              <p className="text-xs text-[#c7c4d7]">재무제표 파일 업로드 시 자동 산출</p>
            )}
          </div>
          <div>
            <p className="text-xs text-[#767586] mb-1">PBR 밴드</p>
            {valuation?.pbr !== undefined ? (
              <p className="text-sm font-bold text-[#1b1b23]">{valuation.pbr.toFixed(2)}x</p>
            ) : (
              <p className="text-xs text-[#c7c4d7]">과거 5년 밴드 vs 현재 위치</p>
            )}
          </div>
          <div>
            <p className="text-xs text-[#767586] mb-1">컨센서스 EPS</p>
            {valuation?.eps !== undefined ? (
              <p className="text-sm font-bold text-[#1b1b23]">{valuation.eps.toLocaleString()}원</p>
            ) : (
              <p className="text-xs text-[#c7c4d7]">리비전 추이 자동 감지</p>
            )}
          </div>
        </div>
      </div>

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
    </div>
  )
}

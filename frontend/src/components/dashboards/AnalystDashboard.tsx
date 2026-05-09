import KpiCard from '../common/KpiCard'
import StockChart from '../charts/StockChart'
import { fmt } from '../../utils/fmt'

interface Props {
  metrics: any
  ohlcv: any[]
  dartData?: any
}

export default function AnalystDashboard({ metrics, ohlcv, dartData }: Props) {
  const returns = metrics?.returns
  const risk = metrics?.risk
  const valuation = metrics?.valuation
  const credit = metrics?.credit_risk
  const targetPrice = metrics?.target_price
  const executives = dartData?.executives as any[] | undefined
  const shareholders = dartData?.shareholders as any[] | undefined
  const financial = dartData?.financial
  const dividends = dartData?.dividends

  const hasReturns = fmt.hasValue(returns) && returns?.simple_return != null
  const hasRisk = fmt.hasValue(risk) && risk?.mdd != null
  const hasFinancial = fmt.hasValue(valuation) || fmt.hasValue(credit)

  const getIS = (name: string) =>
    financial?.is_?.find((r: any) => r.account === name || r.account.startsWith(name))

  const revenue = getIS('매출액') || getIS('수익(매출액)')
  const opIncome = getIS('영업이익')
  const netIncome = getIS('당기순이익')

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {hasReturns && <>
          <KpiCard label="단순 수익률" value={fmt.pct(returns.simple_return)} positive={returns.simple_return > 0} />
          <KpiCard label="CAGR" value={fmt.pct(returns.cagr)} positive={returns.cagr > 0} />
        </>}
        {hasRisk && <>
          <KpiCard label="MDD" value={fmt.pct(risk.mdd)} color="#3B82F6" />
          <KpiCard label="변동성" value={fmt.pct(risk.volatility)} />
        </>}
        {valuation?.roe != null && (
          <KpiCard label="ROE" value={fmt.num(valuation.roe, 1) + '%'} positive={valuation.roe > 0} />
        )}
        {valuation?.operating_margin != null && (
          <KpiCard label="영업이익률" value={fmt.num(valuation.operating_margin, 1) + '%'} positive={valuation.operating_margin > 0} />
        )}
      </div>

      {/* 재무 데이터 있으면 표시 (애널리스트 관점) */}
      {hasFinancial && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">재무 지표 — 밸류에이션 판단 근거</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {valuation?.debt_ratio != null && (
              <KpiCard label="부채비율" value={fmt.num(valuation.debt_ratio, 1) + '%'} positive={valuation.debt_ratio <= 200} sub="재무 레버리지" />
            )}
            {credit?.current_ratio != null && (
              <KpiCard label="유동비율" value={fmt.num(credit.current_ratio, 1) + '%'} positive={credit.current_ratio >= 100} sub="단기 안전성" />
            )}
            {credit?.interest_coverage != null && (
              <KpiCard label="이자보상배율" value={fmt.num(credit.interest_coverage, 2) + '배'} positive={credit.interest_coverage >= 1} sub="부채 상환 능력" />
            )}
            {valuation?.ev_ebitda != null && (
              <KpiCard label="EV/EBITDA" value={fmt.num(valuation.ev_ebitda, 1) + 'x'} positive={valuation.ev_ebitda <= 10} sub="기준 10x 이하" />
            )}
            {valuation?.psr != null && (
              <KpiCard label="PSR" value={fmt.num(valuation.psr, 2) + 'x'} positive={valuation.psr <= 1} sub="기준 1x 이하" />
            )}
            {credit?.dso != null && (
              <KpiCard label="DSO" value={fmt.num(credit.dso, 1) + '일'} positive={credit.dso <= 75} sub="매출채권 회수" />
            )}
          </div>
        </div>
      )}

      {(financial?.year || dividends?.year) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {financial?.year && (
            <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
              <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
                재무 요약 <span className="text-[10px] text-[#767586] font-normal">{financial.year}년</span>
              </p>
              <div className="flex flex-col divide-y divide-[#f0edf8]">
                {[
                  { label: '매출액', data: revenue },
                  { label: '영업이익', data: opIncome },
                  { label: '당기순이익', data: netIncome },
                ].filter(r => r.data).map(({ label, data }) => {
                  const yoy = data.current && data.prior && data.prior !== 0
                    ? ((data.current - data.prior) / Math.abs(data.prior) * 100)
                    : null
                  return (
                    <div key={label} className="flex items-center justify-between py-2">
                      <span className="text-xs text-[#767586]">{label}</span>
                      <div className="flex items-center gap-3">
                        {yoy !== null && (
                          <span className={`text-[10px] font-bold ${yoy >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                            {yoy >= 0 ? '▲' : '▼'}{Math.abs(yoy).toFixed(1)}%
                          </span>
                        )}
                        <span className="text-sm font-bold text-[#1b1b23]">{data.current_fmt}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {dividends?.year && (
            <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
              <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
                배당 정보 <span className="text-[10px] text-[#767586] font-normal">{dividends.year}년</span>
              </p>
              <div className="flex flex-col gap-3">
                {dividends.cash_per_share && dividends.cash_per_share !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">주당 현금배당금</span>
                    <span className="text-sm font-bold text-[#1b1b23]">{Number(dividends.cash_per_share).toLocaleString()}원</span>
                  </div>
                )}
                {dividends.yield_rate && dividends.yield_rate !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">배당수익률</span>
                    <span className="text-sm font-bold text-[#10B981]">{dividends.yield_rate}%</span>
                  </div>
                )}
                {dividends.payout_ratio && dividends.payout_ratio !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">배당성향</span>
                    <span className="text-sm font-bold text-[#4648d4]">{dividends.payout_ratio}%</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {targetPrice && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">목표주가 · 투자의견</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {targetPrice.target_price != null && (
              <KpiCard label="목표주가" value={`${targetPrice.target_price.toLocaleString()}원`} positive={targetPrice.upside > 0} />
            )}
            {targetPrice.current_per != null && (
              <KpiCard label="현재 PER" value={fmt.num(targetPrice.current_per, 1) + 'x'} positive={targetPrice.current_per > 0} sub="배수" />
            )}
            {targetPrice.upside != null && (
              <KpiCard label="상승여력" value={fmt.num(targetPrice.upside, 1) + '%'} positive={targetPrice.upside > 0}
                color={targetPrice.upside >= 20 ? '#10B981' : targetPrice.upside < 0 ? '#EF4444' : undefined}
                sub={targetPrice.upside >= 20 ? '강력 매수 구간' : targetPrice.upside < 0 ? '하락 위험' : undefined} />
            )}
            {targetPrice.opinion != null && (
              <KpiCard label="투자의견" value={targetPrice.opinion}
                positive={['매수', 'BUY', '적극매수'].includes(targetPrice.opinion)}
                color={['매수', 'BUY', '적극매수'].includes(targetPrice.opinion) ? '#10B981'
                  : ['중립', 'HOLD', '보유'].includes(targetPrice.opinion) ? '#F59E0B' : '#EF4444'} />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {executives && executives.length > 0 && (
          <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
            <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>임원 현황</p>
            <div className="flex flex-col divide-y divide-[#f0edf8]">
              {executives.slice(0, 6).map((ex: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-[#1b1b23] font-medium">{ex.name}</span>
                    {ex.registered && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-[#4648d4]/10 text-[#4648d4] rounded font-bold">등기</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-[#464554]">{ex.title}</p>
                    {ex.job && <p className="text-[10px] text-[#767586]">{ex.job}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {shareholders && shareholders.length > 0 && (
          <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
            <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>대주주 현황</p>
            <div className="flex flex-col divide-y divide-[#f0edf8]">
              {shareholders.slice(0, 6).map((sh: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-[#1b1b23] font-medium">{sh.name}</span>
                    {sh.relation && <span className="ml-2 text-xs text-[#767586]">{sh.relation}</span>}
                  </div>
                  {sh.ratio && <span className="text-sm font-bold text-[#4648d4]">{sh.ratio}%</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
        <p className="text-[#1b1b23] text-sm font-medium mb-3">밸류에이션 분석</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[#767586] mb-1">PER 밴드</p>
            {valuation?.per != null
              ? <p className="text-sm font-bold text-[#1b1b23]">{fmt.num(valuation.per, 1)}x</p>
              : <p className="text-xs text-[#c7c4d7]">재무제표 파일 업로드 시 자동 산출</p>}
          </div>
          <div>
            <p className="text-xs text-[#767586] mb-1">PBR 밴드</p>
            {valuation?.pbr != null
              ? <p className="text-sm font-bold text-[#1b1b23]">{fmt.num(valuation.pbr, 2)}x</p>
              : <p className="text-xs text-[#c7c4d7]">과거 5년 밴드 vs 현재 위치</p>}
          </div>
          <div>
            <p className="text-xs text-[#767586] mb-1">컨센서스 EPS</p>
            {valuation?.eps != null
              ? <p className="text-sm font-bold text-[#1b1b23]">{valuation.eps.toLocaleString()}원</p>
              : <p className="text-xs text-[#c7c4d7]">리비전 추이 자동 감지</p>}
          </div>
        </div>
      </div>

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
    </div>
  )
}
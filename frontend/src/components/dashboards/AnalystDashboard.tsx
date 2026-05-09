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
  const targetPrice = metrics?.target_price
  const executives = dartData?.executives as any[] | undefined
  const shareholders = dartData?.shareholders as any[] | undefined
  const financial = dartData?.financial
  const dividends = dartData?.dividends

  const hasReturns = fmt.hasValue(returns) && returns?.simple_return != null
  const hasRisk = fmt.hasValue(risk) && risk?.mdd != null

  const hasAnalystFinancial =
    valuation?.roe != null ||
    valuation?.operating_margin != null ||
    valuation?.ev_ebitda != null ||
    valuation?.debt_ratio != null

  const getIS = (name: string) =>
    financial?.is_?.find((r: any) => r.account === name || r.account.startsWith(name))

  const revenue = getIS('매출액') || getIS('수익(매출액)')
  const opIncome = getIS('영업이익')
  const netIncome = getIS('당기순이익')

  const marketNarratives: string[] = []

  if (returns?.simple_return > 15) {
    marketNarratives.push(
      '최근 주가 상승세가 강하게 나타나며 시장 기대감이 반영되고 있습니다.'
    )
  }

  if (returns?.simple_return < -10) {
    marketNarratives.push(
      '최근 주가 하락폭이 커지며 투자심리 위축 가능성이 존재합니다.'
    )
  }

  if (valuation?.roe > 15) {
    marketNarratives.push(
      'ROE가 높은 수준을 유지하며 자본 효율성이 우수한 것으로 평가됩니다.'
    )
  }

  if (valuation?.operating_margin > 15) {
    marketNarratives.push(
      '영업이익률 개선 흐름이 지속되며 수익성 기대가 확대되고 있습니다.'
    )
  }

  if (targetPrice?.upside > 20) {
    marketNarratives.push(
      `현재 목표주가 기준 ${fmt.num(targetPrice.upside, 1)}% 상승여력이 존재합니다.`
    )
  }

  if (targetPrice?.upside < 0) {
    marketNarratives.push(
      '목표주가 기준 상승여력이 제한적이며 단기 밸류에이션 부담이 존재합니다.'
    )
  }

  if (valuation?.debt_ratio > 200) {
    marketNarratives.push(
      '재무 레버리지가 높은 수준으로 재무 안정성 점검이 필요합니다.'
    )
  }

  if (risk?.volatility > 0.4) {
    marketNarratives.push(
      '주가 변동성이 높은 구간으로 단기 투자 리스크에 유의할 필요가 있습니다.'
    )
  }

  if (marketNarratives.length === 0) {
    marketNarratives.push(
      '현재 재무 및 주가 흐름상 중립적인 밸류에이션 구간으로 판단됩니다.'
    )
  }

  const perPosition =
    valuation?.per == null
      ? null
      : valuation.per <= 8
        ? {
            label: '저평가 구간',
            color: 'text-[#10B981]',
            bg: 'bg-[#10B981]/10',
            width: '25%',
          }
        : valuation.per <= 15
          ? {
              label: '적정 가치 구간',
              color: 'text-[#4648d4]',
              bg: 'bg-[#4648d4]/10',
              width: '55%',
            }
          : {
              label: '고평가 구간',
              color: 'text-[#EF4444]',
              bg: 'bg-[#EF4444]/10',
              width: '85%',
            }

  const pbrPosition =
    valuation?.pbr == null
      ? null
      : valuation.pbr <= 1
        ? {
            label: '저평가',
            color: 'text-[#10B981]',
            bg: 'bg-[#10B981]/10',
            width: '20%',
          }
        : valuation.pbr <= 3
          ? {
              label: '중립',
              color: 'text-[#4648d4]',
              bg: 'bg-[#4648d4]/10',
              width: '55%',
            }
          : {
              label: '고평가',
              color: 'text-[#EF4444]',
              bg: 'bg-[#EF4444]/10',
              width: '85%',
            }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {hasReturns && (
          <>
            <KpiCard
              label="단순 수익률"
              value={fmt.pct(returns.simple_return)}
              positive={returns.simple_return > 0}
            />
            <KpiCard
              label="CAGR"
              value={fmt.pct(returns.cagr)}
              positive={returns.cagr > 0}
            />
          </>
        )}

        {hasRisk && (
          <>
            <KpiCard label="MDD" value={fmt.pct(risk.mdd)} color="#3B82F6" />
            <KpiCard label="변동성" value={fmt.pct(risk.volatility)} />
          </>
        )}
      </div>

      {hasAnalystFinancial && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">밸류에이션 판단 근거</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {valuation?.roe != null && (
              <KpiCard
                label="ROE"
                value={fmt.num(valuation.roe, 1) + '%'}
                positive={valuation.roe > 0}
                sub="자본 효율성"
              />
            )}

            {valuation?.operating_margin != null && (
              <KpiCard
                label="영업이익률"
                value={fmt.num(valuation.operating_margin, 1) + '%'}
                positive={valuation.operating_margin > 0}
                sub="수익성"
              />
            )}

            {valuation?.ev_ebitda != null && (
              <KpiCard
                label="EV/EBITDA"
                value={fmt.num(valuation.ev_ebitda, 1) + 'x'}
                positive={valuation.ev_ebitda <= 10}
                sub="기준 10x 이하"
              />
            )}

            {valuation?.debt_ratio != null && (
              <KpiCard
                label="부채비율"
                value={fmt.num(valuation.debt_ratio, 1) + '%'}
                positive={valuation.debt_ratio <= 200}
                sub="재무 레버리지"
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1">Market Narrative</p>
          <p className="text-xs text-[#767586] mb-4">
            시장 기대감과 리스크 요인을 자동 해석합니다.
          </p>

          <div className="flex flex-col gap-3">
            {marketNarratives.map((item, idx) => (
              <div key={idx} className="bg-[#f8f7fc] rounded-lg px-3 py-3">
                <p className="text-xs text-[#4b5563] leading-relaxed">
                  • {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1">Valuation Position</p>
          <p className="text-xs text-[#767586] mb-4">
            현재 밸류에이션 위치를 구간 기준으로 해석합니다.
          </p>

          <div className="flex flex-col gap-5">
            {valuation?.per != null && perPosition && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[#767586]">PER</p>
                  <div className={`text-xs font-bold px-2 py-1 rounded ${perPosition.bg} ${perPosition.color}`}>
                    {perPosition.label}
                  </div>
                </div>

                <div className="relative w-full h-2 rounded-full bg-[#ece9f7] overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-[#4648d4] rounded-full"
                    style={{ width: perPosition.width }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[#767586]">저평가</span>
                  <span className="text-xs font-bold text-[#1b1b23]">
                    {fmt.num(valuation.per, 1)}x
                  </span>
                  <span className="text-[10px] text-[#767586]">고평가</span>
                </div>
              </div>
            )}

            {valuation?.pbr != null && pbrPosition && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-[#767586]">PBR</p>
                  <div className={`text-xs font-bold px-2 py-1 rounded ${pbrPosition.bg} ${pbrPosition.color}`}>
                    {pbrPosition.label}
                  </div>
                </div>

                <div className="relative w-full h-2 rounded-full bg-[#ece9f7] overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-[#10B981] rounded-full"
                    style={{ width: pbrPosition.width }}
                  />
                </div>

                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-[#767586]">저평가</span>
                  <span className="text-xs font-bold text-[#1b1b23]">
                    {fmt.num(valuation.pbr, 2)}x
                  </span>
                  <span className="text-[10px] text-[#767586]">고평가</span>
                </div>
              </div>
            )}

            {valuation?.eps != null && (
              <div className="bg-[#f8f7fc] rounded-lg p-3">
                <p className="text-xs text-[#767586] mb-1">Consensus EPS</p>
                <p className="text-lg font-bold text-[#1b1b23]">
                  {valuation.eps.toLocaleString()}원
                </p>
                <p className="text-[10px] text-[#767586] mt-1">
                  시장 기대 이익 기준
                </p>
              </div>
            )}

            {valuation?.per == null && valuation?.pbr == null && valuation?.eps == null && (
              <p className="text-xs text-[#c7c4d7]">
                재무제표 또는 밸류에이션 데이터 업로드 시 자동 산출됩니다.
              </p>
            )}
          </div>
        </div>
      </div>

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
                  const yoy =
                    data.current && data.prior && data.prior !== 0
                      ? ((data.current - data.prior) / Math.abs(data.prior)) * 100
                      : null

                  return (
                    <div key={label} className="flex items-center justify-between py-2">
                      <span className="text-xs text-[#767586]">{label}</span>
                      <div className="flex items-center gap-3">
                        {yoy !== null && (
                          <span className={`text-[10px] font-bold ${yoy >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                            {yoy >= 0 ? '▲' : '▼'}
                            {Math.abs(yoy).toFixed(1)}%
                          </span>
                        )}
                        <span className="text-sm font-bold text-[#1b1b23]">
                          {data.current_fmt}
                        </span>
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
                    <span className="text-sm font-bold text-[#1b1b23]">
                      {Number(dividends.cash_per_share).toLocaleString()}원
                    </span>
                  </div>
                )}

                {dividends.yield_rate && dividends.yield_rate !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">배당수익률</span>
                    <span className="text-sm font-bold text-[#10B981]">
                      {dividends.yield_rate}%
                    </span>
                  </div>
                )}

                {dividends.payout_ratio && dividends.payout_ratio !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">배당성향</span>
                    <span className="text-sm font-bold text-[#4648d4]">
                      {dividends.payout_ratio}%
                    </span>
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
              <KpiCard
                label="목표주가"
                value={`${targetPrice.target_price.toLocaleString()}원`}
                positive={targetPrice.upside > 0}
              />
            )}

            {targetPrice.current_per != null && (
              <KpiCard
                label="현재 PER"
                value={fmt.num(targetPrice.current_per, 1) + 'x'}
                positive={targetPrice.current_per > 0}
                sub="배수"
              />
            )}

            {targetPrice.upside != null && (
              <KpiCard
                label="상승여력"
                value={fmt.num(targetPrice.upside, 1) + '%'}
                positive={targetPrice.upside > 0}
                color={targetPrice.upside >= 20 ? '#10B981' : targetPrice.upside < 0 ? '#EF4444' : undefined}
                sub={targetPrice.upside >= 20 ? '강력 매수 구간' : targetPrice.upside < 0 ? '하락 위험' : undefined}
              />
            )}

            {targetPrice.opinion != null && (
              <KpiCard
                label="투자의견"
                value={targetPrice.opinion}
                positive={['매수', 'BUY', '적극매수'].includes(targetPrice.opinion)}
                color={
                  ['매수', 'BUY', '적극매수'].includes(targetPrice.opinion)
                    ? '#10B981'
                    : ['중립', 'HOLD', '보유'].includes(targetPrice.opinion)
                      ? '#F59E0B'
                      : '#EF4444'
                }
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {executives && executives.length > 0 && (
          <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
            <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
              임원 현황
            </p>

            <div className="flex flex-col divide-y divide-[#f0edf8]">
              {executives.slice(0, 6).map((ex: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-[#1b1b23] font-medium">{ex.name}</span>
                    {ex.registered && (
                      <span className="ml-1.5 text-[9px] px-1.5 py-0.5 bg-[#4648d4]/10 text-[#4648d4] rounded font-bold">
                        등기
                      </span>
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
            <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
              대주주 현황
            </p>

            <div className="flex flex-col divide-y divide-[#f0edf8]">
              {shareholders.slice(0, 6).map((sh: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm text-[#1b1b23] font-medium">{sh.name}</span>
                    {sh.relation && (
                      <span className="ml-2 text-xs text-[#767586]">{sh.relation}</span>
                    )}
                  </div>

                  {sh.ratio && (
                    <span className="text-sm font-bold text-[#4648d4]">
                      {sh.ratio}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {ohlcv.length > 0 && <StockChart data={ohlcv} />}
    </div>
  )
}
import KpiCard from '../common/KpiCard'
import StockChart from '../charts/StockChart'
import { fmt } from '../../utils/fmt'

interface Props {
  metrics: any
  ohlcv: any[]
  dartData?: any
}

// 콤마 포함 문자열 → 숫자 안전 변환
const safeNum = (v: any): string => {
  if (v == null || v === '-' || v === '') return '-'
  const num = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(num) ? num.toLocaleString() : String(v)
}

const safeFloat = (v: any): number | null => {
  if (v == null || v === '-' || v === '') return null
  const num = Number(String(v).replace(/,/g, '').trim())
  return Number.isFinite(num) ? num : null
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
  const shares = dartData?.shares

  const hasReturns = fmt.hasValue(returns) && returns?.simple_return != null
  const hasRisk = fmt.hasValue(risk) && risk?.mdd != null

  const getIS = (name: string) =>
    financial?.is_?.find((r: any) => r.account === name || r.account.startsWith(name))
  const getBS = (name: string) =>
    financial?.bs?.find((r: any) => r.account === name || r.account.startsWith(name))

  const revenue = getIS('매출액') || getIS('수익(매출액)')
  const opIncome = getIS('영업이익') || getIS('영업이익(손실)')
  const netIncome = getIS('당기순이익') || getIS('당기순이익(손실)')
  const totalEquity = getBS('자본총계')
  const totalAssets = getBS('자산총계')
  const totalLiab = getBS('부채총계')

  // 현재주가 — ohlcv 마지막 종가
  const currentPrice = ohlcv.length > 0 ? ohlcv[ohlcv.length - 1]?.close : null

  // 발행주식수 — dartData.shares 보통주 유통주식
  const floatShares = (() => {
    const item = shares?.items?.find((s: any) => s.type === '보통주')
    if (!item) return null
    const n = Number(String(item.float ?? item.total_issued ?? '').replace(/,/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  })()

  // EPS, BPS 직접 계산
  const dartEPS = netIncome?.current != null && floatShares != null
    ? netIncome.current / floatShares : null
  const dartBPS = totalEquity?.current != null && floatShares != null
    ? totalEquity.current / floatShares : null

  // PER, PBR 직접 계산
  const dartPER = currentPrice != null && dartEPS != null && dartEPS > 0
    ? currentPrice / dartEPS : null
  const dartPBR = currentPrice != null && dartBPS != null && dartBPS > 0
    ? currentPrice / dartBPS : null

  // ROE, 영업이익률
  const dartROE = netIncome?.current != null && totalEquity?.current != null && totalEquity.current !== 0
    ? netIncome.current / totalEquity.current * 100 : null
  const dartOperatingMargin = opIncome?.current != null && revenue?.current != null && revenue.current !== 0
    ? opIncome.current / revenue.current * 100 : null
  const dartDebtRatio = totalLiab?.current != null && totalEquity?.current != null && totalEquity.current !== 0
    ? totalLiab.current / totalEquity.current * 100 : null

  // ROA
  const dartROA = netIncome?.current != null && totalAssets?.current != null && totalAssets.current !== 0
    ? netIncome.current / totalAssets.current * 100 : null

  // 파일 업로드 계산값 우선, 없으면 DART 직접 계산값
  const per = valuation?.per ?? dartPER
  const pbr = valuation?.pbr ?? dartPBR
  const roe = valuation?.roe ?? dartROE
  const roa = dartROA
  const operatingMargin = valuation?.operating_margin ?? dartOperatingMargin
  const debtRatio = valuation?.debt_ratio ?? dartDebtRatio
  const eps = dartEPS
  const bps = dartBPS

  const hasValuation = per != null || pbr != null || roe != null || operatingMargin != null

  // PER 구간 판정
  const perPosition = per == null ? null
    : per <= 8 ? { label: '저평가', color: '#10B981', bg: '#10B98118', width: '20%' }
    : per <= 15 ? { label: '적정', color: '#4648d4', bg: '#4648d418', width: '55%' }
    : per <= 25 ? { label: '주의', color: '#F59E0B', bg: '#F59E0B18', width: '75%' }
    : { label: '고평가', color: '#E84040', bg: '#E8404018', width: '90%' }

  // PBR 구간 판정
  const pbrPosition = pbr == null ? null
    : pbr <= 1 ? { label: '저평가', color: '#10B981', bg: '#10B98118', width: '20%' }
    : pbr <= 2 ? { label: '적정', color: '#4648d4', bg: '#4648d418', width: '50%' }
    : pbr <= 4 ? { label: '주의', color: '#F59E0B', bg: '#F59E0B18', width: '75%' }
    : { label: '고평가', color: '#E84040', bg: '#E8404018', width: '90%' }

  // Market Narrative — 수치 기반 자동 생성
  const marketNarratives: string[] = []
  if (per != null) {
    if (per <= 8) marketNarratives.push(`PER ${per.toFixed(1)}x — 업종 대비 저평가 구간, 매수 매력 존재`)
    else if (per <= 15) marketNarratives.push(`PER ${per.toFixed(1)}x — 적정 밸류에이션 구간`)
    else marketNarratives.push(`PER ${per.toFixed(1)}x — 고평가 구간, 이익 성장 지속 여부 확인 필요`)
  }
  if (pbr != null) {
    if (pbr <= 1) marketNarratives.push(`PBR ${pbr.toFixed(2)}x — 자산 대비 저평가, 청산가치 이하 거래 중`)
    else if (pbr > 3) marketNarratives.push(`PBR ${pbr.toFixed(2)}x — 자산 대비 프리미엄 높음, 성장 기대 선반영`)
  }
  if (roe != null) {
    if (roe >= 15) marketNarratives.push(`ROE ${roe.toFixed(1)}% — 자본 효율성 우수, 지속적 주주가치 창출`)
    else if (roe < 5) marketNarratives.push(`ROE ${roe.toFixed(1)}% — 자본 수익성 저조, 수익성 개선 모니터링 필요`)
  }
  if (operatingMargin != null) {
    if (operatingMargin >= 15) marketNarratives.push(`영업이익률 ${operatingMargin.toFixed(1)}% — 업종 내 높은 수익성, 원가 경쟁력 보유`)
    else if (operatingMargin < 5) marketNarratives.push(`영업이익률 ${operatingMargin.toFixed(1)}% — 수익성 압박, 원가 구조 점검 필요`)
  }
  if (returns?.simple_return != null) {
    if (returns.simple_return > 0.3) marketNarratives.push(`1년 수익률 ${(returns.simple_return * 100).toFixed(1)}% — 강한 모멘텀, 추세 지속 여부 주시`)
    else if (returns.simple_return < -0.1) marketNarratives.push(`1년 수익률 ${(returns.simple_return * 100).toFixed(1)}% — 주가 부진, 반등 트리거 확인 필요`)
  }
  if (risk?.volatility != null && risk.volatility > 0.4)
    marketNarratives.push(`연율화 변동성 ${(risk.volatility * 100).toFixed(1)}% — 고변동성 구간, 단기 리스크 주의`)
  if (debtRatio != null && debtRatio > 200)
    marketNarratives.push(`부채비율 ${debtRatio.toFixed(1)}% — 재무 레버리지 과다, 신용 리스크 점검 필요`)

  if (marketNarratives.length === 0)
    marketNarratives.push('현재 재무 및 주가 흐름상 중립적 밸류에이션 구간으로 판단됩니다.')

  return (
    <div className="flex flex-col gap-6">

      {/* KPI — 수익률/위험 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {hasReturns && <>
          <KpiCard label="단순 수익률" value={fmt.pct(returns.simple_return)} positive={returns.simple_return > 0} />
          <KpiCard label="CAGR" value={fmt.pct(returns.cagr)} positive={returns.cagr > 0} />
        </>}
        {hasRisk && <>
          <KpiCard label="MDD" value={fmt.pct(risk.mdd)} color="#3B82F6" />
          <KpiCard label="변동성" value={fmt.pct(risk.volatility)} />
        </>}
      </div>

      {/* 밸류에이션 핵심 KPI */}
      {hasValuation && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {per != null && <KpiCard label="PER" value={`${per.toFixed(1)}x`} positive={per <= 15} sub="기준 15x 이하" />}
          {pbr != null && <KpiCard label="PBR" value={`${pbr.toFixed(2)}x`} positive={pbr <= 2} sub="기준 2x 이하" />}
          {roe != null && <KpiCard label="ROE" value={`${roe.toFixed(1)}%`} positive={roe >= 10} sub="기준 10% 이상" />}
          {roa != null && <KpiCard label="ROA" value={`${roa.toFixed(1)}%`} positive={roa >= 5} sub="기준 5% 이상" />}
          {operatingMargin != null && <KpiCard label="영업이익률" value={`${operatingMargin.toFixed(1)}%`} positive={operatingMargin > 0} sub="수익성" />}
          {debtRatio != null && <KpiCard label="부채비율" value={`${debtRatio.toFixed(1)}%`} positive={debtRatio <= 200} sub="재무안정성" />}
          {eps != null && <KpiCard label="EPS" value={`${Math.round(eps).toLocaleString()}원`} positive={eps > 0} sub="주당순이익" />}
          {bps != null && <KpiCard label="BPS" value={`${Math.round(bps).toLocaleString()}원`} positive={bps > 0} sub="주당순자산" />}
        </div>
      )}

      {/* Market Narrative + Valuation Position */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1">Market Narrative</p>
          <p className="text-xs text-[#767586] mb-4">수치 기반 시장 해석 자동 생성</p>
          <div className="flex flex-col gap-2">
            {marketNarratives.map((item, idx) => (
              <div key={idx} className="bg-[#f8f7fc] rounded-lg px-3 py-2.5">
                <p className="text-xs text-[#4b5563] leading-relaxed">• {item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1">Valuation Position</p>
          <p className="text-xs text-[#767586] mb-4">현재 밸류에이션 구간 해석</p>
          <div className="flex flex-col gap-5">
            {per != null && perPosition && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#767586]">PER</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ color: perPosition.color, background: perPosition.bg }}>
                    {perPosition.label}
                  </span>
                </div>
                <div className="relative w-full h-2 rounded-full bg-[#ece9f7] overflow-hidden">
                  <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ width: perPosition.width, background: perPosition.color }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[#767586]">저평가</span>
                  <span className="text-xs font-bold text-[#1b1b23]">{per.toFixed(1)}x</span>
                  <span className="text-[10px] text-[#767586]">고평가</span>
                </div>
              </div>
            )}
            {pbr != null && pbrPosition && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#767586]">PBR</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ color: pbrPosition.color, background: pbrPosition.bg }}>
                    {pbrPosition.label}
                  </span>
                </div>
                <div className="relative w-full h-2 rounded-full bg-[#ece9f7] overflow-hidden">
                  <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ width: pbrPosition.width, background: pbrPosition.color }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-[#767586]">저평가</span>
                  <span className="text-xs font-bold text-[#1b1b23]">{pbr.toFixed(2)}x</span>
                  <span className="text-[10px] text-[#767586]">고평가</span>
                </div>
              </div>
            )}
            {eps != null && (
              <div className="bg-[#f8f7fc] rounded-lg p-3">
                <p className="text-xs text-[#767586] mb-1">EPS (주당순이익)</p>
                <p className="text-lg font-bold text-[#1b1b23]">{Math.round(eps).toLocaleString()}원</p>
                {bps != null && (
                  <p className="text-xs text-[#767586] mt-1">BPS {Math.round(bps).toLocaleString()}원</p>
                )}
              </div>
            )}
            {per == null && pbr == null && eps == null && (
              <p className="text-xs text-[#c7c4d7]">종목코드 조회 시 DART 데이터로 자동 산출됩니다.</p>
            )}
          </div>
        </div>
      </div>

      {/* 재무 요약 + 배당 */}
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
                    ? ((data.current - data.prior) / Math.abs(data.prior)) * 100 : null
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
                    <span className="text-sm font-bold text-[#1b1b23]">
                      {safeNum(dividends.cash_per_share)}원
                    </span>
                  </div>
                )}
                {dividends.yield_rate && dividends.yield_rate !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">배당수익률</span>
                    <span className="text-sm font-bold text-[#10B981]">{dividends.yield_rate}%</span>
                  </div>
                )}
                {dividends.prior_yield_rate && dividends.prior_yield_rate !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">전년 배당수익률</span>
                    <span className="text-sm font-bold text-[#767586]">{dividends.prior_yield_rate}%</span>
                  </div>
                )}
                {dividends.payout_ratio && dividends.payout_ratio !== '-' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#767586]">배당성향</span>
                    <span className="text-sm font-bold text-[#4648d4]">{dividends.payout_ratio}%</span>
                  </div>
                )}
                {(() => {
                  const cashPerShare = safeFloat(dividends.cash_per_share)
                  if (cashPerShare && currentPrice) {
                    const impliedYield = (cashPerShare / currentPrice * 100).toFixed(2)
                    return (
                      <div className="flex justify-between items-center pt-1 border-t border-[#f0edf8]">
                        <span className="text-xs text-[#767586]">현재가 기준 배당수익률</span>
                        <span className="text-sm font-bold text-[#4648d4]">{impliedYield}%</span>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 목표주가 */}
      {targetPrice && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">목표주가 · 투자의견</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {targetPrice.target_price != null && (
              <KpiCard label="목표주가" value={`${targetPrice.target_price.toLocaleString()}원`} positive={targetPrice.upside > 0} />
            )}
            {targetPrice.current_per != null && (
              <KpiCard label="현재 PER" value={`${targetPrice.current_per.toFixed(1)}x`} positive={targetPrice.current_per > 0} sub="배수" />
            )}
            {targetPrice.upside != null && (
              <KpiCard label="상승여력" value={`${targetPrice.upside.toFixed(1)}%`} positive={targetPrice.upside > 0}
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

      {/* 대주주 현황 + 임원 현황 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {shareholders && shareholders.length > 0 && (
          <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
            <p className="text-[#1b1b23] text-sm font-bold mb-3" style={{ fontFamily: 'Manrope' }}>
              대주주 현황
              {dartData?.pe_detected && (
                <span className="ml-2 text-[10px] px-2 py-0.5 bg-red-50 text-[#EF4444] border border-red-200 rounded-full font-bold">PE 감지</span>
              )}
            </p>
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
                    {ex.job && <p className="text-[10px] text-[#767586] max-w-[160px] truncate">{ex.job}</p>}
                  </div>
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
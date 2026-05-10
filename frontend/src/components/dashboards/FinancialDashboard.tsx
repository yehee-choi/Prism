import KpiCard from '../common/KpiCard'
import CreditRiskChart from '../charts/CreditRiskChart'
import RiskScore from '../common/RiskScore'

interface Props {
  metrics: any
  dartData?: any
  rawData?: any[]
}

export default function FinancialDashboard({ metrics, dartData, rawData: _rawData }: Props)  {
  const valuation = metrics?.valuation
  const credit = metrics?.credit_risk
  const cashflow = metrics?.cashflow
  const financial = dartData?.financial

  const getIS = (name: string) =>
    financial?.is_?.find((r: any) => r.account === name || r.account.startsWith(name))

  const getBS = (name: string) =>
    financial?.bs?.find((r: any) => r.account === name || r.account.startsWith(name))

  const revenue = getIS('매출액') || getIS('수익(매출액)')
  const opIncome = getIS('영업이익') || getIS('영업이익(손실)')
  const netIncome = getIS('당기순이익') || getIS('당기순이익(손실)')
  const totalAssets = getBS('자산총계')
  const totalLiab = getBS('부채총계')
  const totalEquity = getBS('자본총계')
  const currentAsset = getBS('유동자산')
  const currentLiab = getBS('유동부채')

  // DART BS/IS 데이터로 지표 직접 계산 (파일 업로드 없이 종목코드 조회 시)
  const dartCurrentRatio =
    currentAsset?.current != null && currentLiab?.current != null && currentLiab.current !== 0
      ? currentAsset.current / currentLiab.current * 100
      : undefined

  const dartDebtRatio =
    totalLiab?.current != null && totalEquity?.current != null && totalEquity.current !== 0
      ? totalLiab.current / totalEquity.current * 100
      : undefined

  const dartOperatingMargin =
    revenue?.current != null && opIncome?.current != null && revenue.current !== 0
      ? opIncome.current / revenue.current * 100
      : undefined

  const dartROE =
    netIncome?.current != null && totalEquity?.current != null && totalEquity.current !== 0
      ? netIncome.current / totalEquity.current * 100
      : undefined

  // 파일 업로드 계산값 우선, 없으면 DART 직접 계산값 사용
  const currentRatio = credit?.current_ratio ?? dartCurrentRatio
  const debtRatio = valuation?.debt_ratio ?? dartDebtRatio
  const operatingMargin = valuation?.operating_margin ?? dartOperatingMargin
  const roe = valuation?.roe ?? dartROE
  const interestCoverage = credit?.interest_coverage
  const dso = credit?.dso

  // 부도 조기경보 warnings
  const warnings: string[] = []
  if (currentRatio !== undefined && currentRatio < 100)
    warnings.push(`유동비율 ${currentRatio.toFixed(1)}% — 유동성 위험`)
  if (interestCoverage !== undefined && interestCoverage < 1)
    warnings.push(`이자보상배율 ${interestCoverage.toFixed(2)}배 — 이자 미충당`)
  if (dso !== undefined && dso > 75)
    warnings.push(`DSO ${dso.toFixed(1)}일 — 매출채권 회수 지연`)
  if (cashflow?.ccc !== undefined && cashflow.ccc > 90)
    warnings.push(`CCC ${cashflow.ccc.toFixed(1)}일 — 운전자본 회수 지연`)
  if (debtRatio !== undefined && debtRatio > 200)
    warnings.push(`부채비율 ${debtRatio.toFixed(1)}% — 레버리지 과다`)

  const score = Math.min(100, warnings.length * 25)

  return (
    <div className="flex flex-col gap-6">

      {/* DART 실제 재무제표 */}
      {financial && financial.year && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
            재무제표 핵심 수치
            <span className="text-[10px] text-[#767586] font-normal ml-2">DART {financial.year}년 사업보고서</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {/* 손익계산서 */}
            <div>
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">손익계산서 (IS)</p>
              <div className="flex flex-col divide-y divide-[#f0edf8]">
                {[
                  { label: '매출액', data: revenue },
                  { label: '영업이익', data: opIncome },
                  { label: '당기순이익', data: netIncome },
                ].filter(r => r.data).map(({ label, data }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-xs text-[#767586]">{label}</span>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${(data.current ?? 0) >= 0 ? 'text-[#1b1b23]' : 'text-[#EF4444]'}`}>
                        {data.current_fmt}
                      </span>
                      {data.prior_fmt && data.prior_fmt !== '-' && (
                        <p className="text-[10px] text-[#767586]">전년 {data.prior_fmt}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* 재무상태표 */}
            <div>
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">재무상태표 (BS)</p>
              <div className="flex flex-col divide-y divide-[#f0edf8]">
                {[
                  { label: '자산총계', data: totalAssets },
                  { label: '부채총계', data: totalLiab },
                  { label: '자본총계', data: totalEquity },
                ].filter(r => r.data).map(({ label, data }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-xs text-[#767586]">{label}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#1b1b23]">{data.current_fmt}</span>
                      {data.prior_fmt && data.prior_fmt !== '-' && (
                        <p className="text-[10px] text-[#767586]">전년 {data.prior_fmt}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 현금흐름표 */}
          {financial.cf && financial.cf.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#f0edf8]">
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">현금흐름표 (CF)</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {financial.cf.slice(0, 3).map((item: any) => (
                  <div key={item.account} className="bg-[#f5f2fe] rounded-lg p-3">
                    <p className="text-[10px] text-[#767586] mb-1">{item.account}</p>
                    <p className={`text-sm font-bold ${(item.current ?? 0) >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {item.current_fmt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI 카드 — DART 직접 계산값 포함 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {currentRatio !== undefined && (
          <KpiCard label="유동비율" value={`${currentRatio.toFixed(1)}%`}
            positive={currentRatio >= 100} sub="기준 100% 이상" />
        )}
        {debtRatio !== undefined && (
          <KpiCard label="부채비율" value={`${debtRatio.toFixed(1)}%`}
            positive={debtRatio <= 200} sub="기준 200% 이하" />
        )}
        {operatingMargin !== undefined && (
          <KpiCard label="영업이익률" value={`${operatingMargin.toFixed(1)}%`}
            positive={operatingMargin > 0} sub="수익성" />
        )}
        {roe !== undefined && (
          <KpiCard label="ROE" value={`${roe.toFixed(1)}%`}
            positive={roe > 0} sub="자본수익률" />
        )}
        {interestCoverage !== undefined && (
          <KpiCard label="이자보상배율" value={`${interestCoverage.toFixed(2)}배`}
            positive={interestCoverage >= 1} sub="기준 1배 이상" />
        )}
        {dso !== undefined && (
          <KpiCard label="DSO" value={`${dso.toFixed(1)}일`}
            positive={dso <= 75} sub="기준 75일 이하" />
        )}
      </div>

      {/* 현금흐름 지표 — 파일 업로드 시에만 표시 */}
      {cashflow && (cashflow.ocf !== undefined || cashflow.ccc !== undefined) && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">현금흐름 지표</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {cashflow.ocf !== undefined && (
              <KpiCard label="OCF"
                value={
                  Math.abs(cashflow.ocf) >= 1_000_000_000_000
                    ? `${(cashflow.ocf / 1_000_000_000_000).toFixed(1)}조`
                    : Math.abs(cashflow.ocf) >= 100_000_000
                    ? `${(cashflow.ocf / 100_000_000).toFixed(0)}억`
                    : `${(cashflow.ocf / 1_000_000).toFixed(0)}백만`
                }
                positive={cashflow.ocf > 0} sub="영업현금흐름" />
            )}
            {cashflow.ccc !== undefined && (
              <KpiCard label="CCC" value={`${cashflow.ccc.toFixed(1)}일`}
                positive={cashflow.ccc <= 90}
                color={cashflow.ccc > 90 ? '#F59E0B' : undefined}
                sub={cashflow.ccc > 90 ? '⚠️ 기준 90일 초과' : '기준 90일 이하'} />
            )}
            {cashflow.dpo !== undefined && (
              <KpiCard label="DPO" value={`${cashflow.dpo.toFixed(1)}일`}
                positive={cashflow.dpo >= 30} sub="기준 30일 이상" />
            )}
          </div>
        </div>
      )}

      {/* 부도 조기경보 + PE 리스크 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <RiskScore title="부도 조기경보 스코어" score={score} warnings={warnings} />
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-medium mb-3">PE 대주주 리스크</p>
          {dartData?.pe_detected ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <p className="text-xs text-[#EF4444] font-bold">PE 대주주 감지 — 엑시트 리스크 주의</p>
              </div>
              {dartData.pe_keywords?.map((kw: string, i: number) => (
                <p key={i} className="text-xs text-[#767586] ml-6">· {kw}</p>
              ))}
            </div>
          ) : dartData?.success ? (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <p className="text-xs text-[#767586]">PE 대주주 미감지 — 정상</p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#c7c4d7]" />
              <p className="text-xs text-[#767586]">종목코드 조회 시 DART 공시 자동 분석</p>
            </div>
          )}
          <p className="text-xs text-[#c7c4d7] mt-2">사모펀드 · PEF · 인베스트먼트 키워드 감지</p>
        </div>
      </div>

      {/* 신용위험 바 차트 */}
      <CreditRiskChart
        currentRatio={currentRatio}
        interestCoverage={interestCoverage}
        dso={dso}
        debtRatio={debtRatio}
      />
    </div>
  )
}
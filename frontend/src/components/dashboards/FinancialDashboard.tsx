import KpiCard from '../common/KpiCard'
import CreditRiskChart from '../charts/CreditRiskChart'
import RiskScore from '../common/RiskScore'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props {
  metrics: any
  dartData?: any
  rawData?: any[]  // 파일 업로드 시 시계열 데이터
}

export default function FinancialDashboard({ metrics, dartData, rawData }: Props) {
  const valuation = metrics?.valuation
  const credit = metrics?.credit_risk
  const cashflow = metrics?.cashflow
  const financial = dartData?.financial

  const warnings: string[] = credit?.warnings ?? []
  if (cashflow?.ccc !== undefined && cashflow.ccc > 90) {
    warnings.push(`CCC ${cashflow.ccc.toFixed(1)}일 — 운전자본 회수 지연`)
  }
  const score = Math.min(100, warnings.length * 35)

  const getIS = (name: string) =>
    financial?.is_?.find((r: any) => r.account === name || r.account.startsWith(name))

  const getBS = (name: string) =>
    financial?.bs?.find((r: any) => r.account === name || r.account.startsWith(name))

  const revenue = getIS('매출액') || getIS('수익(매출액)')
  const opIncome = getIS('영업이익')
  const netIncome = getIS('당기순이익')
  const totalAssets = getBS('자산총계')
  const totalLiab = getBS('부채총계')
  const totalEquity = getBS('자본총계')

  // 시계열 차트 데이터 구성 (파일 업로드 시)
  const timeSeriesData = rawData && rawData.length >= 2
    ? rawData
        .filter(row => row.date)
        .map(row => {
          const currentAsset = Number(row.current_asset) || 0
          const currentLiability = Number(row.current_liability) || 0
          const opInc = Number(row.operating_income) || 0
          const interestExp = Number(row.interest_expense) || 0
          const rev = Number(row.revenue) || 0
          const ar = Number(row.accounts_receivable) || 0
          const totalDebt = Number(row.total_debt) || 0
          const equity = Number(row.equity) || 1

          return {
            year: row.date?.slice(0, 4) || '',
            유동비율: currentLiability !== 0 ? Math.round(currentAsset / currentLiability * 100 * 10) / 10 : null,
            이자보상배율: interestExp !== 0 ? Math.round(opInc / interestExp * 100) / 100 : null,
            부채비율: equity !== 0 ? Math.round(totalDebt / Math.abs(equity) * 100 * 10) / 10 : null,
          }
        })
        .filter(d => d.year)
    : null

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

      {/* KPI 카드: 유동비율, 이자보상배율, DSO, 부채비율 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {credit?.current_ratio !== undefined && (
          <KpiCard label="유동비율" value={`${credit.current_ratio.toFixed(1)}%`}
            positive={credit.current_ratio >= 100} sub="기준 100% 이상" />
        )}
        {credit?.interest_coverage !== undefined && (
          <KpiCard label="이자보상배율" value={`${credit.interest_coverage.toFixed(2)}배`}
            positive={credit.interest_coverage >= 1} sub="기준 1배 이상" />
        )}
        {credit?.dso !== undefined && (
          <KpiCard label="DSO" value={`${credit.dso.toFixed(1)}일`}
            positive={credit.dso <= 75} sub="기준 75일 이하" />
        )}
        {valuation?.debt_ratio !== undefined && (
          <KpiCard label="부채비율" value={`${valuation.debt_ratio.toFixed(1)}%`}
            positive={valuation.debt_ratio <= 200} sub="기준 200% 이하" />
        )}
      </div>

      {/* 시계열 악화 추이 차트 */}
      {timeSeriesData && timeSeriesData.length >= 2 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
            재무 지표 추이
          </p>
          <p className="text-xs text-[#767586] mb-4">연도별 유동비율 · 이자보상배율 · 부채비율 변화</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0edf8" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#767586' }} />
              <YAxis tick={{ fontSize: 11, fill: '#767586' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #c7c4d7', fontSize: 12 }}
                formatter={(value: any, name: string) => {
                  if (name === '이자보상배율') return [`${value}배`, name]
                  return [`${value}%`, name]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* 유동비율 기준선 100% */}
              <ReferenceLine y={100} stroke="#E84040" strokeDasharray="4 4" label={{ value: '유동비율 기준 100%', fontSize: 10, fill: '#E84040' }} />
              {/* 이자보상배율 기준선 1배 */}
              <ReferenceLine y={1} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: '이자보상 기준 1배', fontSize: 10, fill: '#F59E0B' }} />
              <Line type="monotone" dataKey="유동비율" stroke="#4648d4" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
              <Line type="monotone" dataKey="이자보상배율" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
              <Line type="monotone" dataKey="부채비율" stroke="#E84040" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {cashflow && (
        <div className="flex flex-col gap-3">
          <p className="text-[#1b1b23] text-sm font-medium">현금흐름 지표</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {cashflow.ocf !== undefined && (
              <KpiCard label="OCF"
                value={Math.abs(cashflow.ocf) >= 1_000_000_000_000
                  ? `${(cashflow.ocf / 1_000_000_000_000).toFixed(1)}조`
                  : Math.abs(cashflow.ocf) >= 100_000_000
                  ? `${(cashflow.ocf / 100_000_000).toFixed(0)}억`
                  : `${(cashflow.ocf / 1_000_000).toFixed(0)}백만`}
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

      <CreditRiskChart
        currentRatio={credit?.current_ratio}
        interestCoverage={credit?.interest_coverage}
        dso={credit?.dso}
        debtRatio={valuation?.debt_ratio}
      />
    </div>
  )
}
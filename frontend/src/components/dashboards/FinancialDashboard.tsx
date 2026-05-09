import KpiCard from '../common/KpiCard'
import CreditRiskChart from '../charts/CreditRiskChart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props {
  metrics: any
  dartData?: any
  rawData?: any[]
}

export default function FinancialDashboard({ metrics, dartData, rawData }: Props) {
  const valuation = metrics?.valuation
  const credit = metrics?.credit_risk
  const cashflow = metrics?.cashflow
  const financial = dartData?.financial

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

  const timeSeriesData = rawData && rawData.length >= 2
    ? rawData
      .filter(row => row.date)
      .map(row => {
        const currentAsset = Number(row.current_asset) || 0
        const currentLiability = Number(row.current_liability) || 0
        const opInc = Number(row.operating_income) || 0
        const interestExp = Number(row.interest_expense) || 0
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

  const accountingFlags: {
    level: 'danger' | 'warning' | 'safe'
    text: string
  }[] = []

  if (cashflow?.ocf < 0) {
    accountingFlags.push({
      level: 'danger',
      text: '영업현금흐름 음수',
    })
  }

  if (credit?.interest_coverage < 1) {
    accountingFlags.push({
      level: 'danger',
      text: '이자보상배율 1 미만',
    })
  }

  if (valuation?.debt_ratio > 300) {
    accountingFlags.push({
      level: 'warning',
      text: '부채비율 300% 초과',
    })
  }

  if (cashflow?.ccc > 90) {
    accountingFlags.push({
      level: 'warning',
      text: `CCC ${cashflow.ccc.toFixed(1)}일 — 운전자본 부담`,
    })
  }

  if (credit?.current_ratio >= 100) {
    accountingFlags.push({
      level: 'safe',
      text: '유동비율 안정',
    })
  }

  if (cashflow?.ocf > 0) {
    accountingFlags.push({
      level: 'safe',
      text: '영업현금흐름 양호',
    })
  }

  if (accountingFlags.length === 0) {
    accountingFlags.push({
      level: 'safe',
      text: '특이 재무 리스크 없음',
    })
  }

  const cashflowCommentary: string[] = []

  if (cashflow?.ocf < 0) {
    cashflowCommentary.push(
      '영업현금흐름이 음수로 현금창출력이 저하되고 있습니다.'
    )
  }

  if (cashflow?.ocf > 0) {
    cashflowCommentary.push(
      '영업현금흐름이 양수로 본업에서 현금을 창출하고 있습니다.'
    )
  }

  if (cashflow?.ccc > 90) {
    cashflowCommentary.push(
      `CCC가 ${cashflow.ccc.toFixed(1)}일로 운전자본 회수 기간이 길어지고 있습니다.`
    )
  }

  if (credit?.interest_coverage < 1) {
    cashflowCommentary.push(
      '이자보상배율이 1배 미만으로 이자상환 부담이 존재합니다.'
    )
  }

  if (
    cashflow?.ocf > 0 &&
    credit?.interest_coverage >= 1 &&
    valuation?.debt_ratio <= 200
  ) {
    cashflowCommentary.push(
      '현금흐름과 재무안정성이 전반적으로 양호한 상태입니다.'
    )
  }

  if (cashflowCommentary.length === 0) {
    cashflowCommentary.push(
      '현재 제공된 지표 기준으로 현금흐름상 특이 리스크는 제한적입니다.'
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {financial && financial.year && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
            재무제표 핵심 수치
            <span className="text-[10px] text-[#767586] font-normal ml-2">
              DART {financial.year}년 사업보고서
            </span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div>
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">
                손익계산서 (IS)
              </p>
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
                        <p className="text-[10px] text-[#767586]">
                          전년 {data.prior_fmt}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">
                재무상태표 (BS)
              </p>
              <div className="flex flex-col divide-y divide-[#f0edf8]">
                {[
                  { label: '자산총계', data: totalAssets },
                  { label: '부채총계', data: totalLiab },
                  { label: '자본총계', data: totalEquity },
                ].filter(r => r.data).map(({ label, data }) => (
                  <div key={label} className="flex items-center justify-between py-2">
                    <span className="text-xs text-[#767586]">{label}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-[#1b1b23]">
                        {data.current_fmt}
                      </span>
                      {data.prior_fmt && data.prior_fmt !== '-' && (
                        <p className="text-[10px] text-[#767586]">
                          전년 {data.prior_fmt}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {financial.cf && financial.cf.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#f0edf8]">
              <p className="text-xs font-bold text-[#767586] uppercase tracking-widest mb-2">
                현금흐름표 (CF)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {financial.cf.slice(0, 3).map((item: any) => (
                  <div key={item.account} className="bg-[#f5f2fe] rounded-lg p-3">
                    <p className="text-[10px] text-[#767586] mb-1">
                      {item.account}
                    </p>
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {credit?.current_ratio !== undefined && (
          <KpiCard
            label="유동비율"
            value={`${credit.current_ratio.toFixed(1)}%`}
            positive={credit.current_ratio >= 100}
            sub="기준 100% 이상"
          />
        )}

        {credit?.interest_coverage !== undefined && (
          <KpiCard
            label="이자보상배율"
            value={`${credit.interest_coverage.toFixed(2)}배`}
            positive={credit.interest_coverage >= 1}
            sub="기준 1배 이상"
          />
        )}

        {credit?.dso !== undefined && (
          <KpiCard
            label="DSO"
            value={`${credit.dso.toFixed(1)}일`}
            positive={credit.dso <= 75}
            sub="기준 75일 이하"
          />
        )}

        {valuation?.debt_ratio !== undefined && (
          <KpiCard
            label="부채비율"
            value={`${valuation.debt_ratio.toFixed(1)}%`}
            positive={valuation.debt_ratio <= 200}
            sub="기준 200% 이하"
          />
        )}
      </div>

      {timeSeriesData && timeSeriesData.length >= 2 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1" style={{ fontFamily: 'Manrope' }}>
            재무 지표 추이
          </p>
          <p className="text-xs text-[#767586] mb-4">
            연도별 유동비율 · 이자보상배율 · 부채비율 변화
          </p>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0edf8" />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#767586' }} />
              <YAxis tick={{ fontSize: 11, fill: '#767586' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #c7c4d7', fontSize: 12 }}
                formatter={(value, name) => {
                  const label = String(name ?? '')
                  const displayValue = value == null ? '-' : value

                  if (label === '이자보상배율') {
                    return [`${displayValue}배`, label]
                  }

                  return [`${displayValue}%`, label]
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine
                y={100}
                stroke="#E84040"
                strokeDasharray="4 4"
                label={{ value: '유동비율 기준 100%', fontSize: 10, fill: '#E84040' }}
              />
              <ReferenceLine
                y={1}
                stroke="#F59E0B"
                strokeDasharray="4 4"
                label={{ value: '이자보상 기준 1배', fontSize: 10, fill: '#F59E0B' }}
              />
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
              <KpiCard
                label="OCF"
                value={
                  Math.abs(cashflow.ocf) >= 1_000_000_000_000
                    ? `${(cashflow.ocf / 1_000_000_000_000).toFixed(1)}조`
                    : Math.abs(cashflow.ocf) >= 100_000_000
                      ? `${(cashflow.ocf / 100_000_000).toFixed(0)}억`
                      : `${(cashflow.ocf / 1_000_000).toFixed(0)}백만`
                }
                positive={cashflow.ocf > 0}
                sub="영업현금흐름"
              />
            )}

            {cashflow.ccc !== undefined && (
              <KpiCard
                label="CCC"
                value={`${cashflow.ccc.toFixed(1)}일`}
                positive={cashflow.ccc <= 90}
                color={cashflow.ccc > 90 ? '#F59E0B' : undefined}
                sub={cashflow.ccc > 90 ? '⚠️ 기준 90일 초과' : '기준 90일 이하'}
              />
            )}

            {cashflow.dpo !== undefined && (
              <KpiCard
                label="DPO"
                value={`${cashflow.dpo.toFixed(1)}일`}
                positive={cashflow.dpo >= 30}
                sub="기준 30일 이상"
              />
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1">
            Accounting Red Flags
          </p>
          <p className="text-xs text-[#767586] mb-4">
            회계 관점에서 주요 위험 신호를 자동 점검합니다.
          </p>

          <div className="flex flex-col gap-2">
            {accountingFlags.map((flag, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${
                  flag.level === 'danger'
                    ? 'bg-red-50 border-red-200'
                    : flag.level === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    flag.level === 'danger'
                      ? 'bg-red-500'
                      : flag.level === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500'
                  }`}
                />

                <p
                  className={`text-xs font-medium ${
                    flag.level === 'danger'
                      ? 'text-red-700'
                      : flag.level === 'warning'
                        ? 'text-yellow-700'
                        : 'text-emerald-700'
                  }`}
                >
                  {flag.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
          <p className="text-[#1b1b23] text-sm font-bold mb-1">
            Cash Flow Commentary
          </p>
          <p className="text-xs text-[#767586] mb-4">
            현금창출력과 운전자본 부담을 해석합니다.
          </p>

          <div className="flex flex-col gap-3">
            {cashflowCommentary.map((comment, idx) => (
              <div key={idx} className="bg-[#f8f7fc] rounded-lg px-3 py-3">
                <p className="text-xs text-[#4b5563] leading-relaxed">
                  {comment}
                </p>
              </div>
            ))}
          </div>
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
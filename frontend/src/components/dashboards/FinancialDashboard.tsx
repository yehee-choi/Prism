import KpiCard from '../common/KpiCard'
import CreditRiskChart from '../charts/CreditRiskChart'
import RiskScore from '../common/RiskScore'

interface Props {
  metrics: any
}

export default function FinancialDashboard({ metrics }: Props) {
  const valuation = metrics?.valuation
  const credit = metrics?.credit_risk
  const cashflow = metrics?.cashflow  // 추가

  const warnings: string[] = credit?.warnings ?? []

  // CCC 경고 추가
  if (cashflow?.ccc !== undefined && cashflow.ccc > 90) {
    warnings.push(`CCC ${cashflow.ccc.toFixed(1)}일 — 운전자본 회수 지연`)
  }

  const score = Math.min(100, warnings.length * 35)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-4">
        {credit?.current_ratio !== undefined && (
          <KpiCard label="유동비율"
            value={`${credit.current_ratio.toFixed(1)}%`}
            positive={credit.current_ratio >= 100}
            sub="기준 100% 이상" />
        )}
        {credit?.interest_coverage !== undefined && (
          <KpiCard label="이자보상배율"
            value={`${credit.interest_coverage.toFixed(2)}배`}
            positive={credit.interest_coverage >= 1}
            sub="기준 1배 이상" />
        )}
        {credit?.dso !== undefined && (
          <KpiCard label="DSO"
            value={`${credit.dso.toFixed(1)}일`}
            positive={credit.dso <= 75}
            sub="기준 75일 이하" />
        )}
        {valuation?.debt_ratio !== undefined && (
          <KpiCard label="부채비율"
            value={`${valuation.debt_ratio.toFixed(1)}%`}
            positive={valuation.debt_ratio <= 200}
            sub="기준 200% 이하" />
        )}
        {valuation?.operating_margin !== undefined && (
          <KpiCard label="영업이익률"
            value={`${valuation.operating_margin.toFixed(1)}%`}
            positive={valuation.operating_margin > 0} />
        )}
        {valuation?.roe !== undefined && (
          <KpiCard label="ROE"
            value={`${valuation.roe.toFixed(1)}%`}
            positive={valuation.roe > 0} />
        )}
      </div>

      {/* 현금흐름 지표 — cashflow 데이터 추가 */}
      {cashflow && (
        <div className="flex flex-col gap-3">
          <p className="text-[#E2E8F0] text-sm font-medium">현금흐름 지표</p>
          <div className="grid grid-cols-4 gap-4">
            {cashflow.ocf !== undefined && (
              <KpiCard
                label="OCF"
                value={
                  cashflow.ocf >= 1_000_000
                    ? `${(cashflow.ocf / 1_000_000).toFixed(1)}조`
                    : cashflow.ocf >= 1_000
                    ? `${(cashflow.ocf / 1_000).toFixed(1)}억`
                    : `${cashflow.ocf.toFixed(0)}백만`
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

      <div className="grid grid-cols-2 gap-4">
        <RiskScore
          title="부도 조기경보 스코어"
          score={score}
          warnings={warnings}
        />
        <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
          <p className="text-[#E2E8F0] text-sm font-medium mb-3">PE 대주주 리스크</p>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-[#10B981]" />
            <p className="text-xs text-[#64748B]">종목코드 조회 시 DART 공시 자동 분석</p>
          </div>
          <p className="text-xs text-[#2E3648] mt-2">
            사모펀드 · PEF · 인베스트먼트 키워드 감지
          </p>
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
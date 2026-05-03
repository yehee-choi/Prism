import ReactApexChart from 'react-apexcharts'

interface Props {
  data: any[]
}

export default function InvestorChart({ data }: Props) {
  if (!data || data.length === 0) return null

  const dates = data.map(d => new Date(d.date).getTime())
  const foreign = data.map(d => d.foreign_net || 0)
  const institution = data.map(d => d.institution_net || 0)

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'line',
      background: '#111318',
      toolbar: { show: false },
      foreColor: '#64748B',
    },
    title: {
      text: '수급 분석 — 외국인 · 기관 순매수',
      style: { color: '#E2E8F0', fontSize: '14px' },
    },
    stroke: { width: 2, curve: 'smooth' },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#64748B' } },
      axisBorder: { color: '#1E2230' },
    },
    yaxis: {
      labels: {
        style: { colors: '#64748B' },
        formatter: (v) => `${(v / 1000).toFixed(0)}K`,
      },
    },
    grid: { borderColor: '#1E2230' },
    colors: ['#E84040', '#3B82F6'],
    legend: {
      labels: { colors: '#64748B' },
    },
    tooltip: { theme: 'dark' },
  }

  return (
    <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
      <ReactApexChart
        type="line"
        series={[
          { name: '외국인 순매수', data: dates.map((x, i) => ({ x, y: foreign[i] })) },
          { name: '기관 순매수', data: dates.map((x, i) => ({ x, y: institution[i] })) },
        ]}
        options={options}
        height={250}
      />
    </div>
  )
}

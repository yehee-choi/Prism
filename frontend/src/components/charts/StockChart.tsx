import ReactApexChart from 'react-apexcharts'

interface Props {
  data: any[]
}

export default function StockChart({ data }: Props) {
  const candleData = data
    .filter(d => d.open && d.high && d.low && d.close)
    .map(d => ({
      x: new Date(d.date).getTime(),
      y: [d.open, d.high, d.low, d.close],
    }))

  const volumeData = data
    .filter(d => d.volume)
    .map(d => ({
      x: new Date(d.date).getTime(),
      y: d.volume,
    }))

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: 'candlestick',
      background: '#111318',
      toolbar: { show: false },
      foreColor: '#64748B',
    },
    title: {
      text: '주가 차트',
      style: { color: '#E2E8F0', fontSize: '14px' },
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#64748B' } },
      axisBorder: { color: '#1E2230' },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { style: { colors: '#64748B' } },
    },
    grid: { borderColor: '#1E2230' },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#E84040',
          downward: '#3B82F6',
        },
      },
    },
    tooltip: {
      theme: 'dark',
    },
  }

  const volumeOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      background: '#111318',
      toolbar: { show: false },
      foreColor: '#64748B',
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#64748B' } },
      axisBorder: { color: '#1E2230' },
    },
    yaxis: {
      labels: {
        style: { colors: '#64748B' },
        formatter: (v) => `${(v / 1000000).toFixed(0)}M`,
      },
    },
    grid: { borderColor: '#1E2230' },
    colors: ['#6366F1'],
    tooltip: { theme: 'dark' },
    title: {
      text: '거래량',
      style: { color: '#E2E8F0', fontSize: '14px' },
    },
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
        <ReactApexChart
          type="candlestick"
          series={[{ data: candleData }]}
          options={options}
          height={320}
        />
      </div>
      {volumeData.length > 0 && (
        <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
          <ReactApexChart
            type="bar"
            series={[{ name: '거래량', data: volumeData }]}
            options={volumeOptions}
            height={160}
          />
        </div>
      )}
    </div>
  )
}

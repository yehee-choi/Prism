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
      background: '#ffffff',
      toolbar: { show: false },
      foreColor: '#767586',
    },
    title: {
      text: '주가 차트',
      style: { color: '#1b1b23', fontSize: '14px' },
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#767586' } },
      axisBorder: { color: '#c7c4d7' },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { style: { colors: '#767586' } },
    },
    grid: { borderColor: '#c7c4d7' },
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#E84040',
          downward: '#3B82F6',
        },
      },
    },
    tooltip: {
      theme: 'light',
    },
  }

  const volumeOptions: ApexCharts.ApexOptions = {
    chart: {
      type: 'bar',
      background: '#ffffff',
      toolbar: { show: false },
      foreColor: '#767586',
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#767586' } },
      axisBorder: { color: '#c7c4d7' },
    },
    yaxis: {
      labels: {
        style: { colors: '#767586' },
        formatter: (v) => `${(v / 1000000).toFixed(0)}M`,
      },
    },
    grid: { borderColor: '#c7c4d7' },
    colors: ['#4648d4'],
    tooltip: { theme: 'light' },
    title: {
      text: '거래량',
      style: { color: '#1b1b23', fontSize: '14px' },
    },
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
        <ReactApexChart
          type="candlestick"
          series={[{ data: candleData }]}
          options={options}
          height={320}
        />
      </div>
      {volumeData.length > 0 && (
        <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
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

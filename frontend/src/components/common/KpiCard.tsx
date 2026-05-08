interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
  positive?: boolean
}

export default function KpiCard({ label, value, sub, color, positive }: Props) {
  const valueColor = positive === undefined
    ? '#1b1b23'
    : positive
    ? '#E84040'
    : '#3B82F6'

  return (
    <div className="bg-white border border-[#c7c4d7] rounded-xl p-4">
      <p className="text-[#767586] text-xs mb-2">{label}</p>
      <p className="text-xl md:text-2xl font-bold" style={{ color: color || valueColor }}>
        {value}
      </p>
      {sub && <p className="text-[#767586] text-xs mt-1">{sub}</p>}
    </div>
  )
}

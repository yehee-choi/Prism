interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
  positive?: boolean
}

export default function KpiCard({ label, value, sub, color, positive }: Props) {
  const valueColor = positive === undefined
    ? '#E2E8F0'
    : positive
    ? '#E84040'
    : '#3B82F6'

  return (
    <div className="bg-[#111318] border border-[#1E2230] rounded-xl p-4">
      <p className="text-[#64748B] text-xs mb-2">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || valueColor }}>
        {value}
      </p>
      {sub && <p className="text-[#64748B] text-xs mt-1">{sub}</p>}
    </div>
  )
}

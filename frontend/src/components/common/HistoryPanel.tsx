import { useEffect, useState } from 'react'
import { supabase, type History } from '../../lib/supabase'

interface Props {
  onSelect: (history: History) => void
}

const ROLE_LABELS: any = {
  stock: 'Stock Investor',
  fund: 'Fund Manager',
  financial: 'Accountant',
  analyst: 'Analyst',
}

export default function HistoryPanel({ onSelect }: Props) {
  const [histories, setHistories] = useState<History[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistories()
  }, [])

  const fetchHistories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('histories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!error && data) setHistories(data)
    setLoading(false)
  }

  const deleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await supabase.from('histories').delete().eq('id', id)
    setHistories(prev => prev.filter(h => h.id !== id))
  }

  const ROLE_COLORS: any = {
    stock: '#6366F1',
    fund: '#059669',
    financial: '#D97706',
    analyst: '#9333EA',
  }

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-4 h-4 border-2 border-[#c7c4d7] border-t-[#4648d4] rounded-full animate-spin" />
    </div>
  )

  if (histories.length === 0) return (
    <div className="text-center py-8">
      <span className="material-symbols-outlined text-4xl text-[#c7c4d7]">history</span>
      <p className="text-xs text-[#767586] mt-2">저장된 조회 기록이 없어요</p>
    </div>
  )

  return (
    <div className="flex flex-col gap-2">
      {histories.map(h => (
        <div
          key={h.id}
          onClick={() => onSelect(h)}
          className="group flex items-start justify-between gap-2 p-3 bg-white border border-[#c7c4d7] rounded-xl hover:border-[#4648d4] cursor-pointer transition-all"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: ROLE_COLORS[h.role], background: `${ROLE_COLORS[h.role]}18` }}>
                {ROLE_LABELS[h.role]}
              </span>
            </div>
            <p className="text-sm font-bold text-[#1b1b23] truncate">{h.company_name || h.ticker}</p>
            {h.ticker && h.company_name && (
              <p className="text-[10px] text-[#767586] font-mono">{h.ticker}</p>
            )}
            <p className="text-[10px] text-[#767586]">{new Date(h.created_at).toLocaleDateString('ko-KR')}</p>
          </div>
          <button
            onClick={e => deleteHistory(h.id, e)}
            className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-sm text-[#767586] hover:text-[#E84040] transition-all flex-shrink-0"
          >
            delete
          </button>
        </div>
      ))}
    </div>
  )
}
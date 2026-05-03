import { useNavigate } from 'react-router-dom'

type Role = 'stock' | 'fund' | 'financial' | 'analyst'

interface RoleInfo {
  id: Role
  label: string
  desc: string
  color: string
  bg: string
}

const ROLES: RoleInfo[] = [
  {
    id: 'stock',
    label: '주식 투자자',
    desc: '수급 분석 · 공매도 · 지배구조 리스크',
    color: '#6366F1',
    bg: '#EEF2FF',
  },
  {
    id: 'fund',
    label: '펀드매니저',
    desc: '팩터 노출도 · 샤프지수 · 컴플라이언스',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    id: 'financial',
    label: '회계/재무담당',
    desc: '부도 조기경보 · DSO · 차입구조 위험',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    id: 'analyst',
    label: '애널리스트',
    desc: 'PER·PBR 밴드 · 컨센서스 리비전',
    color: '#9333EA',
    bg: '#FDF4FF',
  },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center px-6">
      <div className="mb-3 text-xs tracking-[4px] text-[#6366F1] uppercase font-mono">
        Investment Dashboard
      </div>
      <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">
        Prism
      </h1>
      <p className="text-[#64748B] text-sm mb-16 text-center">
        직군을 선택하면 맞춤형 투자 분석 대시보드를 제공합니다
      </p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-16">
        {ROLES.map((role) => (
          <button
            key={role.id}
            onClick={() => navigate(`/dashboard/${role.id}`)}
            className="group text-left p-6 rounded-2xl border border-[#1E2230] bg-[#111318] transition-all duration-200"
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = role.color
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#1E2230'
            }}
          >
            <div
              className="inline-block text-xs font-bold px-2 py-1 rounded-md mb-3"
              style={{ background: role.bg, color: role.color }}
            >
              {role.label}
            </div>
            <p className="text-[#64748B] text-xs leading-relaxed">{role.desc}</p>
          </button>
        ))}
      </div>

      <p className="text-[#1E2230] text-xs font-mono">
        Prism v0.1 · Skills.md 기반 자동 분석
      </p>
    </div>
  )
}

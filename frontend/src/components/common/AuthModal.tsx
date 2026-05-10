import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Props {
  onClose: () => void
}

export default function AuthModal({ onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose()
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('가입 확인 이메일을 보냈습니다. 이메일을 확인해주세요.')
      }
    } catch (e: any) {
      setError(e.message || '오류가 발생했습니다.')
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1b1b23]" style={{ fontFamily: 'Manrope' }}>
              {mode === 'login' ? '로그인' : '회원가입'}
            </h2>
            <p className="text-xs text-[#767586] mt-1">조회 히스토리를 저장하고 불러올 수 있어요</p>
          </div>
          <button onClick={onClose} className="material-symbols-outlined text-[#767586] hover:text-[#1b1b23]">close</button>
        </div>

        {/* 입력 */}
        <div className="flex flex-col gap-3 mb-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-[#f5f2fe] border border-[#c7c4d7] rounded-xl px-4 py-3 text-sm focus:border-[#4648d4] focus:outline-none text-[#1b1b23] placeholder:text-[#767586]"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="w-full bg-[#f5f2fe] border border-[#c7c4d7] rounded-xl px-4 py-3 text-sm focus:border-[#4648d4] focus:outline-none text-[#1b1b23] placeholder:text-[#767586]"
          />
        </div>

        {/* 에러/성공 메시지 */}
        {error && <p className="text-xs text-[#E84040] mb-3">{error}</p>}
        {success && <p className="text-xs text-[#10B981] mb-3">{success}</p>}

        {/* 버튼 */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#4648d4] hover:bg-[#2f2ebe] text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50 mb-3"
          style={{ fontFamily: 'Manrope' }}
        >
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>

        {/* 모드 전환 */}
        <p className="text-xs text-center text-[#767586]">
          {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
            className="ml-1 text-[#4648d4] font-bold hover:underline"
          >
            {mode === 'login' ? '회원가입' : '로그인'}
          </button>
        </p>
      </div>
    </div>
  )
}
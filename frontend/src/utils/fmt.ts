/**
 * 숫자 안전 포맷 유틸
 * undefined / null / NaN 이면 fallback 반환
 */

export const fmt = {
  pct: (v: any, digits = 2, fallback = 'N/A') => {
    const n = Number(v)
    return isFinite(n) ? `${(n * 100).toFixed(digits)}%` : fallback
  },
  num: (v: any, digits = 2, fallback = 'N/A') => {
    const n = Number(v)
    return isFinite(n) ? n.toFixed(digits) : fallback
  },
  won: (v: any, fallback = 'N/A') => {
    const n = Number(v)
    if (!isFinite(n)) return fallback
    if (Math.abs(n) >= 1_000_000_000_000) return `${(n / 1_000_000_000_000).toFixed(1)}조`
    if (Math.abs(n) >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억`
    return n.toLocaleString()
  },
  // 객체가 있고 실제 숫자 값이 하나라도 있는지 확인
  hasValue: (obj: any) => {
    if (!obj || typeof obj !== 'object') return false
    return Object.values(obj).some(v => v !== null && v !== undefined && v !== '' && isFinite(Number(v)))
  }
}
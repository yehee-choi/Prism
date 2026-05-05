const BASE_URL = 'http://localhost:8000'

// 파일 업로드
export async function uploadFile(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/upload/`, {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

// 지표 분석
export async function analyzeData(data: any[], role: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, role }),
  })
  return res.json()
}

// 주식 시세 수집
export async function fetchStockOhlcv(ticker: string, start: string, end: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/stock/ohlcv/${ticker}?start=${start}&end=${end}`)
  return res.json()
}

// 수급 데이터
export async function fetchStockInvestor(ticker: string, start: string, end: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/stock/investor/${ticker}?start=${start}&end=${end}`)
  return res.json()
}

// 전체 수집
export async function collectAll(ticker: string, periodDays: number = 365): Promise<any> {
  const res = await fetch(`${BASE_URL}/stock/collect/${ticker}?period_days=${periodDays}`)
  return res.json()
}

// AI 인사이트 생성
export async function generateInsight(metrics: any, role: string, dataType: string = 'unknown'): Promise<any> {
  const res = await fetch(`${BASE_URL}/insight/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metrics, role, data_type: dataType }),
  })
  return res.json()
}

// DART 공시 분석
export async function fetchDartInsight(ticker: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/dart/insight/${ticker}`)
  return res.json()
}

const BASE_URL = 'https://prism-production-fee9.up.railway.app'

export async function uploadFile(file: File): Promise<any> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE_URL}/upload/`, {
    method: 'POST',
    body: formData,
  })
  return res.json()
}

export async function analyzeData(data: any[], role: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, role }),
  })
  return res.json()
}

export async function fetchStockOhlcv(ticker: string, start: string, end: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/stock/ohlcv/${ticker}?start=${start}&end=${end}`)
  return res.json()
}

export async function fetchStockInvestor(ticker: string, start: string, end: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/stock/investor/${ticker}?start=${start}&end=${end}`)
  return res.json()
}

export async function collectAll(ticker: string, periodDays: number = 365): Promise<any> {
  const res = await fetch(`${BASE_URL}/stock/collect/${ticker}?period_days=${periodDays}`)
  return res.json()
}

// ── extra_context 파라미터 추가 ──────────────────────────────
export async function generateInsight(
  metrics: any,
  role: string,
  dataType: string = 'unknown',
  extraData: any = null,
  extraContext: any = null,   // ← 신규
): Promise<any> {
  const res = await fetch(`${BASE_URL}/insight/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      metrics,
      role,
      data_type: dataType,
      extra_data: extraData,
      extra_context: extraContext,  // ← 신규
    }),
  })
  return res.json()
}

export async function fetchDartInsight(ticker: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/dart/insight/${ticker}`)
  return res.json()
}

export async function fetchDartFull(ticker: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/dart/full/${ticker}`)
  return res.json()
}

export type StockSearchResult = {
  ticker: string
  name: string
}

export async function searchStock(query: string): Promise<StockSearchResult[]> {
  if (!query.trim()) return []
  const res = await fetch(`${BASE_URL}/stock/search?q=${encodeURIComponent(query)}`)
  return res.json()
}
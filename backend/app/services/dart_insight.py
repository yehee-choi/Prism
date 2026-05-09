import os
import json
import requests
import anthropic
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
DART_KEY = lambda: os.getenv("DART_API_KEY", "")

# ── 타임아웃 상수 ────────────────────────────────────────────
DART_TIMEOUT = 8          # 개별 DART API 타임아웃 (초)
PARALLEL_TIMEOUT = 12     # 병렬 작업 전체 대기 최대 (초)


# ── 공통 헬퍼 ────────────────────────────────────────────────
def _dart(endpoint: str, params: dict) -> dict:
    params["crtfc_key"] = DART_KEY()
    try:
        r = requests.get(
            f"https://opendart.fss.or.kr/api/{endpoint}",
            params=params,
            timeout=DART_TIMEOUT,   # ← 기존 15 → 8로 단축
        )
        return r.json()
    except requests.exceptions.Timeout:
        return {"status": "error", "message": "DART API 타임아웃"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


def _parse_amount(s):
    if not s:
        return None
    try:
        return int(str(s).replace(",", "").replace(" ", ""))
    except Exception:
        return None


def _fmt(v) -> str:
    if v is None:
        return "-"
    abs_v = abs(v)
    sign = "-" if v < 0 else ""
    if abs_v >= 1_000_000_000_000:
        return f"{sign}{abs_v / 1_000_000_000_000:.1f}조"
    if abs_v >= 100_000_000:
        return f"{sign}{abs_v / 100_000_000:.0f}억"
    if abs_v >= 10_000:
        return f"{sign}{abs_v / 10_000:.0f}만"
    return f"{sign}{abs_v:,}"


# ── 공시 목록 (dart_fss → OpenAPI 직접 호출로 교체) ─────────
def get_recent_disclosures(corp_code: str, limit: int = 5) -> list:
    """
    dart_fss 라이브러리 대신 DART OpenAPI 직접 호출.
    타임아웃 제어 가능 + 의존성 제거.
    """
    try:
        data = _dart("list.json", {
            "corp_code": corp_code,
            "bgn_de": "20240101",
            "page_count": limit,
            "sort": "date",
            "sort_mth": "desc",
        })
        if data.get("status") != "000" or not data.get("list"):
            return []
        return [
            {
                "title": item.get("report_nm", "").strip(),
                "date": item.get("rcept_dt", ""),
                "corp_name": item.get("corp_name", ""),
            }
            for item in data["list"][:limit]
        ]
    except Exception as e:
        print(f"[공시 수집 오류] {e}")
        return []


def summarize_disclosures_with_claude(ticker: str, corp_name: str, disclosures: list) -> dict:
    if not disclosures:
        return {"success": False, "error": "공시 데이터 없음"}

    lines = "\n".join(f"- [{d['date']}] {d['title']}" for d in disclosures)
    prompt = f"""다음은 {corp_name}({ticker})의 최근 공시 목록입니다.

{lines}

각 공시를 분석하여 아래 JSON 형식으로만 응답하세요:
{{
  "overall": "긍정 또는 부정 또는 중립",
  "summary": "전체 공시 흐름 한줄 요약 (30자 이내)",
  "items": [
    {{
      "title": "공시 제목",
      "date": "날짜",
      "sentiment": "호재 또는 악재 또는 중립",
      "reason": "판단 근거 한줄 (20자 이내)"
    }}
  ],
  "action": "투자자/담당자 관점에서 다음 행동 권고 (30자 이내)"
}}"""

    try:
        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
        )
        text = msg.content[0].text.strip()
        if "```" in text:
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return {"success": True, **json.loads(text)}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── 재무제표 ─────────────────────────────────────────────────
_BS_KEYS = {"자산총계", "부채총계", "자본총계", "유동자산", "비유동자산", "유동부채", "비유동부채"}
_IS_KEYS = {"매출액", "수익(매출액)", "영업이익", "영업이익(손실)", "당기순이익", "당기순이익(손실)"}
_CF_PARTIAL = ["영업활동", "투자활동", "재무활동"]


def get_financial_data(corp_code: str) -> dict:
    for year in ["2025", "2024", "2023"]:
        data = _dart("fnlttSinglAcnt.json", {
            "corp_code": corp_code, "bsns_year": year, "reprt_code": "11011"
        })
        if data.get("status") == "000" and data.get("list"):
            return _parse_financials(data["list"], year)
    return {}


def _parse_financials(items: list, year: str) -> dict:
    bs, is_, cf = [], [], []
    seen = {"BS": set(), "IS": set(), "CF": set()}

    for item in items:
        nm = item.get("account_nm", "")
        sj = item.get("sj_div", "")
        curr = _parse_amount(item.get("thstrm_amount"))
        prior = _parse_amount(item.get("frmtrm_amount"))
        entry = {"account": nm, "current": curr, "prior": prior,
                 "current_fmt": _fmt(curr), "prior_fmt": _fmt(prior)}

        if sj == "BS" and nm in _BS_KEYS and nm not in seen["BS"]:
            bs.append(entry); seen["BS"].add(nm)
        elif sj in ("IS", "CIS") and nm in _IS_KEYS and nm not in seen["IS"]:
            is_.append(entry); seen["IS"].add(nm)
        elif sj == "CF" and any(k in nm for k in _CF_PARTIAL) and nm not in seen["CF"]:
            cf.append(entry); seen["CF"].add(nm)

    return {"year": year, "bs": bs, "is_": is_, "cf": cf}


# ── 대주주 현황 ───────────────────────────────────────────────
def get_major_shareholders(corp_code: str) -> list:
    for year in ["2025", "2024", "2023"]:
        data = _dart("majorstock.json", {
            "corp_code": corp_code, "bsns_year": year, "reprt_code": "11011"
        })
        if data.get("status") == "000" and data.get("list"):
            result = []
            seen = set()
            for item in data["list"]:
                nm = item.get("nm", "").strip()
                ratio = item.get("trmend_posesn_stock_qota_rt", "").strip()
                relate = item.get("relate", "").strip()
                if nm and nm not in seen:
                    result.append({"name": nm, "relation": relate, "ratio": ratio})
                    seen.add(nm)
            return result
    return []


# ── 임원 현황 ─────────────────────────────────────────────────
def get_executives(corp_code: str) -> list:
    for year in ["2025", "2024", "2023"]:
        data = _dart("exctvSttus.json", {
            "corp_code": corp_code, "bsns_year": year, "reprt_code": "11011"
        })
        if data.get("status") == "000" and data.get("list"):
            return [
                {
                    "name": item.get("nm", "").strip(),
                    "title": item.get("ofcps", "").strip(),
                    "job": item.get("chrg_job", "").strip(),
                    "registered": item.get("rgist_exctv_at", "") == "Y",
                }
                for item in data["list"]
                if item.get("nm", "").strip()
            ][:10]
    return []


# ── 배당 현황 ─────────────────────────────────────────────────
def get_dividends(corp_code: str) -> dict:
    for year in ["2025", "2024", "2023"]:
        data = _dart("alotMatter.json", {
            "corp_code": corp_code, "bsns_year": year, "reprt_code": "11011"
        })
        if data.get("status") == "000" and data.get("list"):
            result: dict = {"year": year}
            for item in data["list"]:
                se = item.get("se", "")
                if "주당 현금배당금" in se:
                    result["cash_per_share"] = item.get("thstrm", "-")
                    result["prior_cash_per_share"] = item.get("frmtrm", "-")
                elif "시가배당율" in se or "배당수익률" in se:
                    result["yield_rate"] = item.get("thstrm", "-")
                    result["prior_yield_rate"] = item.get("frmtrm", "-")
                elif "현금배당성향" in se:
                    result["payout_ratio"] = item.get("thstrm", "-")
            return result
    return {}


# ── 주식 발행 현황 ────────────────────────────────────────────
def get_share_issuance(corp_code: str) -> dict:
    for year in ["2025", "2024", "2023"]:
        data = _dart("stockTotqySttus.json", {
            "corp_code": corp_code, "bsns_year": year, "reprt_code": "11011"
        })
        if data.get("status") == "000" and data.get("list"):
            result: dict = {"year": year, "items": []}
            for item in data["list"]:
                se = item.get("se", "").strip()
                if not se:
                    continue
                result["items"].append({
                    "type": se,
                    "total_issued": item.get("istc_totqy", "-"),
                    "treasury": item.get("tesstk_co", "-"),
                    "float": item.get("distb_stock_co", "-"),
                })
            return result
    return {}


# ── 통합 엔트리포인트 ────────────────────────────────────────
def get_dart_insight(ticker: str) -> dict:
    """기존 호환성 유지용 (공시 요약만)"""
    from app.services.corp_cache import get_corp_code, get_corp_name
    corp_code = get_corp_code(ticker)
    if not corp_code:
        return {"success": False, "error": "종목코드에 해당하는 기업을 찾을 수 없습니다"}

    corp_name = get_corp_name(ticker) or ticker
    disclosures = get_recent_disclosures(corp_code)
    if not disclosures:
        return {"success": False, "error": "최근 공시를 찾을 수 없습니다", "corp_name": corp_name}

    summary = summarize_disclosures_with_claude(ticker, corp_name, disclosures)
    return {"success": True, "corp_name": corp_name, "ticker": ticker,
            "disclosures": disclosures, **summary}


def get_full_dart_data(ticker: str) -> dict:
    """모든 DART 데이터를 병렬로 수집하여 반환"""
    from app.services.corp_cache import get_corp_code, get_corp_name
    corp_code = get_corp_code(ticker)
    if not corp_code:
        return {"success": False, "error": "종목코드에 해당하는 기업을 찾을 수 없습니다"}

    corp_name = get_corp_name(ticker) or ticker

    tasks = {
        "disclosures": lambda: get_recent_disclosures(corp_code),
        "financial": lambda: get_financial_data(corp_code),
        "shareholders": lambda: get_major_shareholders(corp_code),
        "executives": lambda: get_executives(corp_code),
        "dividends": lambda: get_dividends(corp_code),
        "shares": lambda: get_share_issuance(corp_code),
    }

    results: dict = {}
    # ↓ PARALLEL_TIMEOUT으로 전체 병렬 블록 제한
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(fn): key for key, fn in tasks.items()}
        for fut in as_completed(futures, timeout=PARALLEL_TIMEOUT):
            key = futures[fut]
            try:
                results[key] = fut.result()
            except Exception as e:
                print(f"[{key} 수집 실패] {e}")
                results[key] = None

    # 완료되지 않은 태스크 None 처리
    for key in tasks:
        if key not in results:
            print(f"[{key}] 타임아웃으로 미완료 → None 처리")
            results[key] = None

    # 공시 Claude 요약
    disclosures = results.get("disclosures") or []
    if disclosures:
        summary = summarize_disclosures_with_claude(ticker, corp_name, disclosures)
    else:
        summary = {"success": False, "error": "공시 없음"}

    # PE 대주주 감지
    PE_KEYWORDS = ["인베스트먼트", "파트너스", "사모", "PEF", "펀드", "PE", "캐피탈"]
    pe_detected = False
    pe_keywords_found = []
    for sh in (results.get("shareholders") or []):
        nm = sh.get("name", "")
        hits = [kw for kw in PE_KEYWORDS if kw in nm]
        if hits:
            pe_detected = True
            pe_keywords_found.append(nm)

    return {
        "success": True,
        "corp_name": corp_name,
        "ticker": ticker,
        "corp_code": corp_code,
        "disclosures": disclosures,
        **summary,
        "financial": results.get("financial") or {},
        "shareholders": results.get("shareholders") or [],
        "pe_detected": pe_detected,
        "pe_keywords": pe_keywords_found,
        "executives": results.get("executives") or [],
        "dividends": results.get("dividends") or {},
        "shares": results.get("shares") or {},
    }
import os
import json
import requests
import anthropic
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
DART_KEY = lambda: os.getenv("DART_API_KEY", "")

DART_TIMEOUT = 8
PARALLEL_TIMEOUT = 12


def _dart(endpoint: str, params: dict) -> dict:
    params["crtfc_key"] = DART_KEY()
    try:
        r = requests.get(
            f"https://opendart.fss.or.kr/api/{endpoint}",
            params=params,
            timeout=DART_TIMEOUT,
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


def get_recent_disclosures(corp_code: str, limit: int = 5) -> list:
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


_BS_KEYS = {
    # 주요 합계
    "자산총계", "부채총계", "자본총계",
    "유동자산", "비유동자산", "유동부채", "비유동부채",
    # DSO 계산용
    "매출채권", "매출채권및기타채권", "매출채권및기타유동채권",
    # 재고자산
    "재고자산",
    # 차입금
    "단기차입금", "장기차입금", "사채", "유동성장기부채",
}
_IS_KEYS = {
    "매출액", "수익(매출액)",
    "영업이익", "영업이익(손실)",
    "당기순이익", "당기순이익(손실)",
    # 이자보상배율 계산용
    "이자비용", "금융비용", "금융원가",
}
_CF_PARTIAL = ["영업활동", "투자활동", "재무활동", "현금흐름"]


def get_financial_data(corp_code: str) -> dict:
    for year in ["2025", "2024", "2023"]:
        # fnlttSinglAcntAll: 전체 계정과목 반환 (매출채권, 재고자산, 이자비용 등 포함)
        data = _dart("fnlttSinglAcntAll.json", {
            "corp_code": corp_code,
            "bsns_year": year,
            "reprt_code": "11011",
            "fs_div": "CFS",   # 연결재무제표
        })
        if data.get("status") == "000" and data.get("list"):
            return _parse_financials(data["list"], year)
        # 연결재무제표 없으면 별도재무제표 시도
        data = _dart("fnlttSinglAcntAll.json", {
            "corp_code": corp_code,
            "bsns_year": year,
            "reprt_code": "11011",
            "fs_div": "OFS",   # 별도재무제표
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


# ── 배당 현황 (강화된 버전) ───────────────────────────────────
def get_dividends(corp_code: str) -> dict:
    """
    DART alotMatter API의 se 컬럼값이 버전/종목마다 다를 수 있어서
    부분 문자열 매칭(in) 방식으로 처리.
    매칭 실패 시 디버그 로그로 실제 se 값 출력.
    """
    for year in ["2025", "2024", "2023"]:
        data = _dart("alotMatter.json", {
            "corp_code": corp_code, "bsns_year": year, "reprt_code": "11011"
        })
        if data.get("status") == "000" and data.get("list"):
            items = data["list"]

            # 디버그: 실제 se 값 출력 (배포 후 로그로 확인)
            se_values = [item.get("se", "") for item in items]
            print(f"[배당 DEBUG] corp_code={corp_code} year={year} se값들: {se_values}")

            result: dict = {"year": year}

            for item in items:
                se = item.get("se", "").strip()
                thstrm = item.get("thstrm", "-").strip() or "-"
                frmtrm = item.get("frmtrm", "-").strip() or "-"

                # 주당 현금배당금
                # 실제 DART 값: '주당 현금배당금(원)', '주당현금배당금(원)' 등
                if any(k in se for k in ["주당 현금배당금", "주당현금배당금", "주당배당금"]):
                    if "cash_per_share" not in result:
                        result["cash_per_share"] = thstrm
                        result["prior_cash_per_share"] = frmtrm

                # 배당수익률
                # 실제 DART 값: '현금배당수익률(%)', '시가배당율', '배당수익률(%)' 등
                elif any(k in se for k in ["현금배당수익률", "시가배당율", "시가배당률", "배당수익률", "배당율", "배당률"]):
                    if "yield_rate" not in result:
                        result["yield_rate"] = thstrm
                        result["prior_yield_rate"] = frmtrm

                # 현금배당성향
                # 실제 DART 값: '(연결)현금배당성향(%)', '현금배당성향(%)' 등
                elif any(k in se for k in ["현금배당성향", "배당성향"]):
                    if "payout_ratio" not in result:
                        result["payout_ratio"] = thstrm

            # 실제로 값이 하나라도 들어왔으면 반환
            has_data = any(
                result.get(k) and result.get(k) != "-"
                for k in ["cash_per_share", "yield_rate", "payout_ratio"]
            )
            if has_data:
                return result
            else:
                # 매칭된 값이 없으면 se 값들을 result에 담아서 반환 (프론트에서 확인용)
                print(f"[배당 WARNING] 매칭 실패. 실제 se 값들: {se_values}")
                result["_debug_se_values"] = se_values
                return result

    return {}


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


def get_dart_insight(ticker: str) -> dict:
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
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(fn): key for key, fn in tasks.items()}
        for fut in as_completed(futures, timeout=PARALLEL_TIMEOUT):
            key = futures[fut]
            try:
                results[key] = fut.result()
            except Exception as e:
                print(f"[{key} 수집 실패] {e}")
                results[key] = None

    for key in tasks:
        if key not in results:
            print(f"[{key}] 타임아웃으로 미완료 → None 처리")
            results[key] = None

    disclosures = results.get("disclosures") or []
    if disclosures:
        summary = summarize_disclosures_with_claude(ticker, corp_name, disclosures)
    else:
        summary = {"success": False, "error": "공시 없음"}

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
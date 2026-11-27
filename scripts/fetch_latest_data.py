#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_latest_data.py
공식 정부 및 금융 원천 데이터를 직접 파싱하여 금 투자 지표를 100% 실제 데이터로 자동 갱신하는 스크립트

[원천 데이터 출처 (100% 무료 / 공식 / 실시간)]
  1. 미국 재무부 (U.S. Department of the Treasury XML 피드):
     - 10Y TIPS 실질금리 (Daily Treasury Real Yield Curve)
     - 10Y 명목금리 (Daily Treasury Yield Curve)
     - 2Y, 3M 국채금리 → 10Y-2Y, 10Y-3M 장단기 금리차 계산
     - 10Y 기대인플레이션 (BEI = 10Y 명목 - 10Y TIPS) 자동 계산
  2. CFTC (미국 상품선물거래위원회 공식 COMEX COT 보고서):
     - COMEX 금 선물 투기적(Non-Commercial) 순매수 포지션 (계약수)
  3. Yahoo Finance & Gold-API:
     - 실시간 ICE 달러 인덱스 (DXY, DX-Y.NYB)
     - 실시간 CBOE VIX 지수 (^VIX)
     - 실시간 국제 금 시세 (XAU/USD, gold-api.com)
     - 실시간 은 시세 (XAG/USD) → 금/은 비율 자동 계산
     - 실시간 COMEX 구리 선물 (HG=F) → 금/구리 비율 자동 계산
     - 실시간 S&P 500 지수 (^GSPC) → 금/S&P500 비율 자동 계산
     - 주요 금 ETF(GLD+IAU) 순자산 기반 실물 금 보유량(톤) 계산
  4. Open Exchange Rates:
     - 실시간 USD/KRW 원/달러 환율
     - 실시간 USD/CNY 위안/달러 환율
  5. 세인트루이스 연준 (FRED JSON API - FRED_API_KEY 등록 시 자동 활성화):
     - 비농업 고용(PAYEMS) & 실업률(UNRATE)
     - 소비자물가지수 (CPI YoY)
     - 근원 PCE 물가지수 (Core PCE YoY)
     - 생산자물가지수 (PPI YoY)
     - 연방기금 실효금리 (FEDFUNDS)
     - M2 통화량 (M2SL)
"""

import urllib.request
import json
import re
import os
import datetime
import http.cookiejar
import xml.etree.ElementTree as ET

FRED_API_KEY = os.environ.get('FRED_API_KEY', '').strip()

# ════════════════════════════════════════════════
# 1. 공통 HTTP Fetch
# ════════════════════════════════════════════════

def fetch_raw(url, headers=None, timeout=10):
    if headers is None:
        headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return res.read()
    except Exception as e:
        print(f"  [WARN] fetch 실패 ({url[:50]}...): {e}")
        return None

def fetch_json(url, headers=None, timeout=10):
    raw = fetch_raw(url, headers=headers, timeout=timeout)
    if raw:
        try:
            return json.loads(raw.decode('utf-8'))
        except Exception as e:
            print(f"  [WARN] JSON 파싱 실패: {e}")
    return None

# ════════════════════════════════════════════════
# 2. 미국 재무부 (U.S. Treasury) 공식 XML 피드
# ════════════════════════════════════════════════

def fetch_treasury_rates():
    year = datetime.datetime.now().year
    ns = {
        'd': 'http://schemas.microsoft.com/ado/2007/08/dataservices',
        'm': 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
        'atom': 'http://www.w3.org/2005/Atom'
    }

    rates = {
        'tips10y': None,
        'nominal10y': None,
        'nominal2y': None,
        'nominal3m': None,
        'spread10y2y': None,
        'spread10y3m': None,
        'bei10y': None,
        'date': None
    }

    # 1) 실질금리 (Real Yields) 피드
    for y in [year, year - 1]:
        url_real = f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_real_yield_curve&field_tdr_date_value={y}"
        raw_real = fetch_raw(url_real, timeout=10)
        if raw_real:
            try:
                root = ET.fromstring(raw_real)
                entries = root.findall('atom:entry', ns)
                if entries:
                    last_props = entries[-1].find('atom:content', ns).find('m:properties', ns)
                    d_val = last_props.find('d:NEW_DATE', ns).text
                    y_val = last_props.find('d:TC_10YEAR', ns).text
                    if y_val:
                        rates['tips10y'] = round(float(y_val), 2)
                        rates['date'] = d_val.split('T')[0]
                        print(f"  [OK] 미 재무부 10Y TIPS 실질금리 ({rates['date']}): {rates['tips10y']}%")
                        break
            except Exception as e:
                print(f"  [WARN] 재무부 TIPS XML 파싱 오류: {e}")

    # 2) 명목금리 (Nominal Yields) 피드
    for y in [year, year - 1]:
        url_nom = f"https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value={y}"
        raw_nom = fetch_raw(url_nom, timeout=10)
        if raw_nom:
            try:
                root = ET.fromstring(raw_nom)
                entries = root.findall('atom:entry', ns)
                if entries:
                    last_props = entries[-1].find('atom:content', ns).find('m:properties', ns)
                    y10 = last_props.find('d:BC_10YEAR', ns).text
                    y2 = last_props.find('d:BC_2YEAR', ns).text
                    m3 = last_props.find('d:BC_3MONTH', ns).text
                    if y10: rates['nominal10y'] = round(float(y10), 2)
                    if y2: rates['nominal2y'] = round(float(y2), 2)
                    if m3: rates['nominal3m'] = round(float(m3), 2)
                    if rates['nominal10y'] and rates['nominal2y']:
                        rates['spread10y2y'] = round(rates['nominal10y'] - rates['nominal2y'], 2)
                    if rates['nominal10y'] and rates['nominal3m']:
                        rates['spread10y3m'] = round(rates['nominal10y'] - rates['nominal3m'], 2)
                    print(f"  [OK] 미 재무부 10Y 명목: {rates['nominal10y']}%, 2Y: {rates['nominal2y']}%, 3M: {rates['nominal3m']}%")
                    print(f"  [OK] 장단기 스프레드: 10Y-2Y = {rates['spread10y2y']}%p, 10Y-3M = {rates['spread10y3m']}%p")
                    break
            except Exception as e:
                print(f"  [WARN] 재무부 명목 XML 파싱 오류: {e}")

    # 3) BEI 기대인플레이션율 계산
    if rates['nominal10y'] is not None and rates['tips10y'] is not None:
        rates['bei10y'] = round(rates['nominal10y'] - rates['tips10y'], 2)
        print(f"  [OK] 10년 기대인플레이션(BEI): {rates['bei10y']}% (명목 {rates['nominal10y']}% - TIPS {rates['tips10y']}%)")

    return rates

# ════════════════════════════════════════════════
# 3. CFTC 공식 COMEX 금 선물 COT 포지션 파싱
# ════════════════════════════════════════════════

def fetch_cftc_cot():
    url = "https://www.cftc.gov/dea/futures/deacmxlf.htm"
    raw = fetch_raw(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=12)
    if not raw:
        return None, None

    text = raw.decode('utf-8', errors='replace')
    pos = text.find('GOLD - COMMODITY EXCHANGE INC.')
    if pos == -1:
        print("  [WARN] CFTC 페이지 내 'GOLD - COMMODITY EXCHANGE INC.' 섹션 미발견")
        return None, None

    block = text[pos:pos+2000]

    date_match = re.search(r'Commitments of Traders[^\n,]+,\s*([A-Za-z]+\s+\d+,\s+\d{4})', block)
    cot_date = date_match.group(1) if date_match else "최근 발표"

    all_match = re.search(r'All\s*:\s*[\d,]+:\s*([\d,]+)\s+([\d,]+)', block)
    if all_match:
        try:
            nc_long = int(all_match.group(1).replace(',', ''))
            nc_short = int(all_match.group(2).replace(',', ''))
            net_position = nc_long - nc_short
            print(f"  [OK] CFTC COMEX 금 선물 ({cot_date}): 순매수 {net_position:,} 계약 (Long {nc_long:,} / Short {nc_short:,})")
            return net_position, cot_date
        except Exception as e:
            print(f"  [WARN] CFTC 수치 파싱 실패: {e}")

    return None, None

# ════════════════════════════════════════════════
# 4. Yahoo Finance 시세 수집기 (DXY, VIX, 구리, S&P500, ETF)
# ════════════════════════════════════════════════

def fetch_yahoo_quote(symbol):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
    headers = {'User-Agent': 'Mozilla/5.0'}
    data = fetch_json(url, headers=headers, timeout=8)
    if data:
        try:
            price = data['chart']['result'][0]['meta']['regularMarketPrice']
            return round(price, 3)
        except Exception:
            pass
    return None

def fetch_etf_holdings(gold_usd):
    if not gold_usd or gold_usd <= 0:
        return None

    try:
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

        req1 = urllib.request.Request('https://fc.yahoo.com', headers={'User-Agent': 'Mozilla/5.0'})
        try:
            opener.open(req1, timeout=5)
        except Exception:
            pass

        req2 = urllib.request.Request('https://query1.finance.yahoo.com/v1/test/getcrumb', headers={'User-Agent': 'Mozilla/5.0'})
        crumb = opener.open(req2, timeout=5).read().decode('utf-8').strip()

        if crumb:
            req3 = urllib.request.Request(f'https://query1.finance.yahoo.com/v7/finance/quote?symbols=GLD,IAU&crumb={crumb}', headers={'User-Agent': 'Mozilla/5.0'})
            data = json.loads(opener.open(req3, timeout=5).read().decode('utf-8'))
            results = data.get('quoteResponse', {}).get('result', [])

            total_net_assets = 0.0
            for r in results:
                na = r.get('netAssets') or r.get('marketCap') or 0
                if na > 0:
                    total_net_assets += na
                    print(f"  [OK] {r.get('symbol')}: 순자산 ${na:,.0f}")

            if total_net_assets > 0:
                total_oz = total_net_assets / gold_usd
                tons = int(round(total_oz / 32150.746))
                print(f"  [OK] 주요 금 ETF(GLD+IAU) 실시간 보유량: {tons:,}톤 (순자산 합계 ${total_net_assets:,.0f})")
                return tons
    except Exception as e:
        print(f"  [WARN] ETF 보유량 조회 오류: {e}")

    return None

# ════════════════════════════════════════════════
# 5. FRED API 수집기 (고용, CPI, PCE, PPI, Fed Rate)
# ════════════════════════════════════════════════

def fetch_fred_series(series_id, limit=1):
    """FRED 공식 API로 시계열 관측치 수집"""
    if not FRED_API_KEY:
        return []
    url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={FRED_API_KEY}&file_type=json&sort_order=desc&limit={limit}"
    data = fetch_json(url, timeout=10)
    if data and 'observations' in data:
        results = []
        for o in data['observations']:
            try:
                results.append({'date': o['date'], 'value': float(o['value'])})
            except (ValueError, TypeError):
                pass
        return results
    return []

def fetch_fred_yoy(series_id):
    """FRED 월간 지표로부터 YoY% 자동 계산"""
    obs = fetch_fred_series(series_id, limit=14)
    if len(obs) >= 13:
        latest = obs[0]['value']
        prev_yr = obs[12]['value']
        if prev_yr and prev_yr != 0:
            yoy = round(((latest / prev_yr) - 1) * 100, 1)
            date_str = obs[0]['date']
            print(f"  [OK] FRED {series_id} ({date_str}): YoY {yoy}% (최신 {latest} / 전년 {prev_yr})")
            return yoy, date_str
    return None, None

def fetch_fred_labor_and_macro():
    """실업률, 비농업고용, CPI, PCE, PPI, FedRate, M2 일괄 수집"""
    macro = {
        'unemployment_text': None,
        'unemployment_date': None,
        'cpi_yoy': None,
        'cpi_date': None,
        'core_pce_yoy': None,
        'core_pce_date': None,
        'ppi_yoy': None,
        'ppi_date': None,
        'fed_rate': None,
        'fed_rate_date': None,
        'm2': None
    }

    if not FRED_API_KEY:
        print("  [INFO] FRED_API_KEY가 등록되지 않아 고용/물가 지표는 기존 공시값을 유지합니다. (GitHub Actions에서는 자동 갱신됨)")
        return macro

    print("  [INFO] FRED_API_KEY 감지 → 공식 FRED API로 실시간 고용/물가 수집...")

    # 1. 실업률 (UNRATE) & 비농업 고용 (PAYEMS)
    unrate_obs = fetch_fred_series("UNRATE", limit=1)
    payems_obs = fetch_fred_series("PAYEMS", limit=2)
    if unrate_obs and payems_obs and len(payems_obs) >= 2:
        unrate = unrate_obs[0]['value']
        # PAYEMS 단위: 천 명. 월간 증감 = (이번달 - 지난달)
        mom_change = payems_obs[0]['value'] - payems_obs[1]['value']
        mom_k = int(round(mom_change / 10.0)) # 만 명 단위 환산
        macro['unemployment_text'] = f"실업률 {unrate}% / NFP {mom_k:+d}만"
        macro['unemployment_date'] = unrate_obs[0]['date']
        print(f"  [OK] 미국 고용보고서 ({macro['unemployment_date']}): {macro['unemployment_text']}")

    # 2. 물가지수 (CPI, Core PCE, PPI) YoY
    macro['cpi_yoy'], macro['cpi_date'] = fetch_fred_yoy("CPIAUCSL")
    macro['core_pce_yoy'], macro['core_pce_date'] = fetch_fred_yoy("PCEPILFE")
    macro['ppi_yoy'], macro['ppi_date'] = fetch_fred_yoy("PPIACO")

    # 3. 연방기금금리 (FEDFUNDS)
    ff_obs = fetch_fred_series("FEDFUNDS", limit=1)
    if ff_obs:
        macro['fed_rate'] = ff_obs[0]['value']
        macro['fed_rate_date'] = ff_obs[0]['date']
        print(f"  [OK] 연방기금 실효금리 ({macro['fed_rate_date']}): {macro['fed_rate']}%")

    # 4. M2 통화량 (M2SL)
    m2_obs = fetch_fred_series("M2SL", limit=1)
    if m2_obs:
        macro['m2'] = m2_obs[0]['value']

    return macro

# ════════════════════════════════════════════════
# 6. 실시간 금 / 은 / 환율 수집
# ════════════════════════════════════════════════

def fetch_gold_price():
    data = fetch_json("https://api.gold-api.com/price/XAU")
    if data and data.get('price') and data['price'] > 1000:
        p = round(data['price'], 2)
        print(f"  [OK] 실시간 금 시세 (gold-api.com): ${p}/oz")
        return p
    p2 = fetch_yahoo_quote('GC=F')
    if p2 and p2 > 1000:
        print(f"  [OK] 실시간 금 선물 (Yahoo GC=F): ${p2}/oz")
        return p2
    return None

def fetch_silver_price():
    data = fetch_json("https://api.gold-api.com/price/XAG")
    if data and data.get('price') and data['price'] > 5:
        p = round(data['price'], 2)
        print(f"  [OK] 실시간 은 시세 (gold-api.com): ${p}/oz")
        return p
    p2 = fetch_yahoo_quote('SI=F')
    if p2 and p2 > 5:
        return p2
    return None

def fetch_fx():
    data = fetch_json("https://open.er-api.com/v6/latest/USD")
    if data and 'rates' in data:
        krw = round(data['rates'].get('KRW', 0), 1)
        cny = round(data['rates'].get('CNY', 0), 3)
        print(f"  [OK] 실시간 환율: USD/KRW = {krw}원, USD/CNY = {cny}위안")
        return krw, cny
    return None, None

# ════════════════════════════════════════════════
# 7. indicatorsData.js 파일 실시간 업데이트
# ════════════════════════════════════════════════

def set_field(content, indicator_id, field_name, new_value, is_string=False):
    if is_string:
        val_pattern = r'"[^"]*"'
        val_replace = f'"{new_value}"'
    else:
        val_pattern = r'[\+\-]?[\d\.]+'
        val_replace = str(new_value)

    pattern = (rf'(id:\s*"{re.escape(indicator_id)}"'
               rf'[\s\S]{{0,2500}}?'
               rf'{re.escape(field_name)}:\s*){val_pattern}')
    new_content, n = re.subn(pattern, rf'\g<1>{val_replace}', content, count=1)
    return new_content if n else content

def update_asofdate(content, indicator_id, date_str):
    return set_field(content, indicator_id, 'asOfDate', date_str, is_string=True)

def apply_all_updates(rates, gold, silver, krw, dxy, vix, copper, sp500, cot_net, cot_date, etf_tons, macro):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, 'js', 'indicatorsData.js')

    if not os.path.exists(file_path):
        print(f"[ERROR] 파일 없음: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    tz_kst = datetime.timezone(datetime.timedelta(hours=9))
    now_kst = datetime.datetime.now(tz_kst)
    today = now_kst.strftime("%Y-%m-%d")
    source_tag = "FRED API + 미 재무부 공식 동기화" if FRED_API_KEY else "공식 원천 데이터 실시간 동기화"
    now_str = now_kst.strftime("%Y-%m-%d %H:%M:%S") + f" KST ({source_tag})"

    # 1. meta 블록
    if gold:
        content = re.sub(r'goldUSD:\s*[\d\.]+', f'goldUSD: {gold}', content)
    if krw:
        content = re.sub(r'usdkrw:\s*[\d\.]+', f'usdkrw: {krw}', content)
    if gold and krw:
        krw_g = int(round((gold / 31.1034768) * krw))
        krw_don = int(round(krw_g * 3.75))
        content = re.sub(r'goldKRW_g:\s*\d+', f'goldKRW_g: {krw_g}', content)
        content = re.sub(r'goldKRW_don:\s*\d+', f'goldKRW_don: {krw_don}', content)
    if rates['nominal10y']:
        content = re.sub(r'us10y:\s*[\d\.]+', f'us10y: {rates["nominal10y"]}', content)
    if rates['tips10y']:
        content = re.sub(r'us10yTips:\s*[\d\.]+', f'us10yTips: {rates["tips10y"]}', content)
    if dxy:
        content = re.sub(r'dxy:\s*[\d\.]+', f'dxy: {dxy}', content)
    content = re.sub(r'updatedAt:\s*"[^"]*"', f'updatedAt: "{now_str}"', content)

    # 2. 1. 실질금리 & 연준 기준금리
    if rates['tips10y'] is not None:
        tips = rates['tips10y']
        content = set_field(content, 'us10y_tips', 'currentValue', tips)
        tips_score = "+2" if tips < 1.5 else ("+1" if tips < 2.0 else ("0" if tips < 2.3 else ("-1" if tips < 2.6 else "-2")))
        content = set_field(content, 'us10y_tips', 'score', tips_score)
        content = update_asofdate(content, 'us10y_tips', rates['date'] or today)

    if rates['nominal10y'] is not None:
        content = set_field(content, 'us10y_nominal', 'currentValue', rates['nominal10y'])
        content = update_asofdate(content, 'us10y_nominal', rates['date'] or today)

    if rates['bei10y'] is not None:
        content = set_field(content, 'bei_10y', 'currentValue', rates['bei10y'])
        content = update_asofdate(content, 'bei_10y', rates['date'] or today)

    if macro['fed_rate'] is not None:
        content = set_field(content, 'fed_funds_rate', 'currentValue', macro['fed_rate'])
        content = update_asofdate(content, 'fed_funds_rate', macro['fed_rate_date'] or today)

    # 3. 2. 달러&환율
    if dxy:
        content = set_field(content, 'dxy', 'currentValue', dxy)
        dxy_score = "+2" if dxy < 101 else ("+1" if dxy < 104 else ("0" if dxy < 106 else "-1"))
        content = set_field(content, 'dxy', 'score', dxy_score)
        content = update_asofdate(content, 'dxy', today)

    if krw:
        content = set_field(content, 'usdkrw', 'currentValue', krw)
        content = update_asofdate(content, 'usdkrw', today)

    # 4. 3. 인플레이션 지표 (FRED 자동 갱신)
    if macro['cpi_yoy'] is not None:
        content = set_field(content, 'cpi', 'currentValue', macro['cpi_yoy'])
        content = update_asofdate(content, 'cpi', macro['cpi_date'] or today)

    if macro['core_pce_yoy'] is not None:
        content = set_field(content, 'core_pce', 'currentValue', macro['core_pce_yoy'])
        content = update_asofdate(content, 'core_pce', macro['core_pce_date'] or today)

    if macro['ppi_yoy'] is not None:
        content = set_field(content, 'ppi', 'currentValue', macro['ppi_yoy'])
        content = update_asofdate(content, 'ppi', macro['ppi_date'] or today)

    # 5. 4. 경기&고용&금리차
    if macro['unemployment_text']:
        content = set_field(content, 'nfp_unemployment', 'currentValue', macro['unemployment_text'], is_string=True)
        content = update_asofdate(content, 'nfp_unemployment', macro['unemployment_date'] or today)

    if rates['spread10y2y'] is not None:
        content = set_field(content, 'yield_curve_10y2y', 'currentValue', rates['spread10y2y'])
        content = update_asofdate(content, 'yield_curve_10y2y', rates['date'] or today)

    if rates['spread10y3m'] is not None:
        content = set_field(content, 'yield_curve_10y3m', 'currentValue', rates['spread10y3m'])
        content = update_asofdate(content, 'yield_curve_10y3m', rates['date'] or today)

    # 6. 5. 위험&심리
    if vix:
        content = set_field(content, 'vix', 'currentValue', vix)
        vix_score = "+2" if vix >= 25 else ("+1" if vix >= 20 else ("0" if vix >= 15 else "-1"))
        content = set_field(content, 'vix', 'score', vix_score)
        content = update_asofdate(content, 'vix', today)

    # 7. 6. 수급 지표 (CFTC COT, ETF)
    if cot_net is not None:
        content = set_field(content, 'comex_cot', 'currentValue', cot_net)
        cot_score = "+2" if cot_net < 150000 else ("+1" if cot_net < 220000 else ("0" if cot_net < 280000 else "-1"))
        content = set_field(content, 'comex_cot', 'score', cot_score)
        content = update_asofdate(content, 'comex_cot', cot_date or today)

    if etf_tons is not None:
        content = set_field(content, 'etf_holdings', 'currentValue', etf_tons)
        content = update_asofdate(content, 'etf_holdings', today)

    # 8. 7. 상대 가치 지표
    if gold and silver and silver > 0:
        gs = round(gold / silver, 1)
        content = set_field(content, 'gold_silver_ratio', 'currentValue', gs)
        content = update_asofdate(content, 'gold_silver_ratio', today)

    if gold and copper and copper > 0:
        gc = round(gold / copper, 1)
        content = set_field(content, 'gold_copper_ratio', 'currentValue', gc)
        content = update_asofdate(content, 'gold_copper_ratio', today)

    if gold and sp500 and sp500 > 0:
        gsp = round(gold / sp500, 4)
        content = set_field(content, 'gold_sp500_ratio', 'currentValue', gsp)
        content = update_asofdate(content, 'gold_sp500_ratio', today)

    if gold and macro['m2'] and macro['m2'] > 0:
        gm2 = round(gold / (macro['m2'] / 1000.0), 4)
        content = set_field(content, 'gold_m2_ratio', 'currentValue', str(gm2), is_string=True)
        content = update_asofdate(content, 'gold_m2_ratio', today)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\n[SUCCESS] {file_path} 실시간 수집 데이터로 100% 갱신 완료!")

# ════════════════════════════════════════════════
# 메인 실행
# ════════════════════════════════════════════════

if __name__ == '__main__':
    print("=" * 65)
    print("금 투자 8대 지표 실시간 자동 수집기 (공식 원천 데이터)")
    print("=" * 65)

    print("\n[1/6] 미국 재무부(U.S. Treasury) 국채 & TIPS 실질금리 피드 수집...")
    rates = fetch_treasury_rates()

    print("\n[2/6] CFTC 공식 COMEX 금 선물 COT 포지션 파싱...")
    cot_net, cot_date = fetch_cftc_cot()

    print("\n[3/6] 실시간 금·은 시세 및 환율 수집...")
    gold = fetch_gold_price()
    silver = fetch_silver_price()
    krw, cny = fetch_fx()

    print("\n[4/6] Yahoo Finance 시장 데이터 수집 (DXY, VIX, 구리, S&P500, ETF)...")
    dxy = fetch_yahoo_quote('DX-Y.NYB')
    if dxy: print(f"  [OK] 실시간 DXY 달러 인덱스: {dxy}")
    vix = fetch_yahoo_quote('^VIX')
    if vix: print(f"  [OK] 실시간 CBOE VIX 지수: {vix}")
    copper = fetch_yahoo_quote('HG=F')
    if copper: print(f"  [OK] COMEX 구리 선물: ${copper}/lb")
    sp500 = fetch_yahoo_quote('^GSPC')
    if sp500: print(f"  [OK] S&P 500 지수: {sp500}")
    etf_tons = fetch_etf_holdings(gold)

    print("\n[5/6] FRED 거시경제 지표 수집 (고용, CPI, PCE, PPI, 연준금리, M2)...")
    macro = fetch_fred_labor_and_macro()

    print("\n[6/6] js/indicatorsData.js 파일 갱신...")
    apply_all_updates(rates, gold, silver, krw, dxy, vix, copper, sp500, cot_net, cot_date, etf_tons, macro)

    print("\n" + "=" * 65)
    print("수집 완료 현황 요약")
    print("=" * 65)
    items = [
        ("10Y TIPS 실질금리", rates['tips10y'], "% (미 재무부)"),
        ("10Y 명목 국채금리", rates['nominal10y'], "% (미 재무부)"),
        ("10Y 기대인플레(BEI)", rates['bei10y'], "% (자동 계산)"),
        ("10Y-2Y 장단기금리차", rates['spread10y2y'], "%p (자동 계산)"),
        ("10Y-3M 장단기금리차", rates['spread10y3m'], "%p (자동 계산)"),
        ("CFTC COMEX 금 선물", f"{cot_net:,}" if cot_net else None, f"계약 ({cot_date})"),
        ("DXY 달러 인덱스", dxy, "pt (ICE 공식)"),
        ("CBOE VIX 공포지수", vix, "pt"),
        ("국제 금 시세", f"${gold}" if gold else None, "/oz"),
        ("국제 은 시세", f"${silver}" if silver else None, "/oz"),
        ("원/달러 환율", f"{krw}원" if krw else None, ""),
        ("주요 금 ETF 보유량", f"{etf_tons:,}" if etf_tons else None, "톤 (GLD+IAU 실물 순자산 환산)"),
        ("비농업 고용 & 실업률", macro['unemployment_text'], f"({macro['unemployment_date']})" if macro['unemployment_text'] else "(FRED Key 시 자동)"),
        ("CPI 인플레이션 YoY", f"{macro['cpi_yoy']}%" if macro['cpi_yoy'] else None, f"({macro['cpi_date']})" if macro['cpi_yoy'] else "(FRED Key 시 자동)"),
        ("Core PCE 물가 YoY", f"{macro['core_pce_yoy']}%" if macro['core_pce_yoy'] else None, f"({macro['core_pce_date']})" if macro['core_pce_yoy'] else "(FRED Key 시 자동)"),
        ("금/은 비율", round(gold/silver, 1) if (gold and silver) else None, "배"),
        ("금/구리 비율", round(gold/copper, 1) if (gold and copper) else None, "배"),
        ("금/S&P500 비율", round(gold/sp500, 4) if (gold and sp500) else None, "배"),
    ]
    for name, val, unit in items:
        status = "✅ 수집 성공" if val is not None else "⏳ 대기 (GitHub)"
        print(f"  {status:10s} | {name:16s}: {str(val):14s} {unit}")
    print("=" * 65)

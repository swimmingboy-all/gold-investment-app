#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_latest_data.py
GitHub Actions에서 매일 평일 자동 실행되어 최신 시장 데이터 및 거시 지표를 수집하고
js/indicatorsData.js 파일을 자동으로 갱신하는 스크립트

GitHub Secrets에 'FRED_API_KEY'를 등록하면 공식 FRED API를 우선 사용합니다.
"""

import urllib.request
import json
import re
import os
import datetime

FRED_API_KEY = os.environ.get('FRED_API_KEY', '').strip()

def fetch_json(url, headers=None):
    if headers is None:
        headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def fetch_exchange_rate():
    """USD/KRW 실시간 환율 수집"""
    data = fetch_json("https://open.er-api.com/v6/latest/USD")
    if data and 'rates' in data and 'KRW' in data['rates']:
        krw = round(data['rates']['KRW'], 1)
        print(f"[OK] USD/KRW 환율: {krw}원")
        return krw
    return None

def fetch_gold_price():
    """실시간 금 시세 (USD/oz) 수집 (PAXG 1:1 페깅 금 현물)"""
    data = fetch_json("https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,tether-gold&vs_currencies=usd")
    if data:
        paxg = data.get('pax-gold', {}).get('usd')
        xaut = data.get('tether-gold', {}).get('usd')
        price = paxg or xaut
        if price and price > 1500:
            print(f"[OK] 국제 금 시세: ${price}/oz")
            return round(price, 2)
    return None

def fetch_fred_series(series_id):
    """
    FRED 데이터 수집:
    1) GitHub Secrets에 FRED_API_KEY가 등록되어 있으면 공식 JSON API 사용
    2) 없으면 공개 CSV 엔드포인트 자동 폴백
    """
    if FRED_API_KEY:
        api_url = f"https://api.stlouisfed.org/fred/series/observations?series_id={series_id}&api_key={FRED_API_KEY}&file_type=json&sort_order=desc&limit=1"
        data = fetch_json(api_url)
        if data and 'observations' in data and len(data['observations']) > 0:
            obs = data['observations'][0]
            try:
                val = float(obs['value'])
                print(f"[OK] FRED API {series_id} ({obs['date']}): {val}")
                return val
            except (ValueError, TypeError):
                pass

    # 백업: FRED CSV 엔드포인트
    csv_url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    try:
        req = urllib.request.Request(csv_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as res:
            lines = res.read().decode('utf-8').strip().split('\n')
            for line in reversed(lines):
                parts = line.strip().split(',')
                if len(parts) == 2 and parts[1] != '.' and parts[1] != '':
                    val = float(parts[1])
                    print(f"[OK] FRED CSV {series_id} ({parts[0]}): {val}")
                    return val
    except Exception as e:
        print(f"Error fetching FRED {series_id}: {e}")
    return None

def update_indicators_file(usdkrw, gold_usd, tips, us10y, bei, t10y2y, vix, cpi):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, 'js', 'indicatorsData.js')

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    source_tag = "GitHub Secrets FRED API 자동 갱신" if FRED_API_KEY else "GitHub Actions 자동 갱신"
    now_str = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M") + f" KST ({source_tag})"

    # 1. meta 영역 업데이트
    if gold_usd:
        content = re.sub(r'goldUSD:\s*[\d\.]+', f'goldUSD: {gold_usd}', content)
    if usdkrw:
        content = re.sub(r'usdkrw:\s*[\d\.]+', f'usdkrw: {usdkrw}', content)
    if gold_usd and usdkrw:
        krw_g = int(round((gold_usd / 31.1034768) * usdkrw))
        krw_don = int(round(krw_g * 3.75))
        content = re.sub(r'goldKRW_g:\s*\d+', f'goldKRW_g: {krw_g}', content)
        content = re.sub(r'goldKRW_don:\s*\d+', f'goldKRW_don: {krw_don}', content)
    if us10y:
        content = re.sub(r'us10y:\s*[\d\.]+', f'us10y: {us10y}', content)
    if tips:
        content = re.sub(r'us10yTips:\s*[\d\.]+', f'us10yTips: {tips}', content)

    content = re.sub(r'updatedAt:\s*"[^"]*"', f'updatedAt: "{now_str}"', content)

    # 2. 카테고리 내부 indicators 업데이트
    if tips:
        content = re.sub(r'(id:\s*"us10y_tips"[\s\S]*?currentValue:\s*)[\d\.]+', rf'\g<1>{tips}', content)
    if us10y:
        content = re.sub(r'(id:\s*"us10y_nominal"[\s\S]*?currentValue:\s*)[\d\.]+', rf'\g<1>{us10y}', content)
    if bei:
        content = re.sub(r'(id:\s*"bei_10y"[\s\S]*?currentValue:\s*)[\d\.]+', rf'\g<1>{bei}', content)
    if usdkrw:
        content = re.sub(r'(id:\s*"usdkrw"[\s\S]*?currentValue:\s*)[\d\.]+', rf'\g<1>{usdkrw}', content)
    if t10y2y:
        content = re.sub(r'(id:\s*"yield_curve_10y2y"[\s\S]*?currentValue:\s*)[\+\-]?[\d\.]+', rf'\g<1>{t10y2y}', content)
    if vix:
        content = re.sub(r'(id:\s*"vix"[\s\S]*?currentValue:\s*)[\d\.]+', rf'\g<1>{vix}', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[SUCCESS] {file_path} 파일이 최신 통계로 갱신되었습니다.")

if __name__ == '__main__':
    print("=== 금 투자 지표 자동 수집기 시작 ===")
    if FRED_API_KEY:
        print("[INFO] GitHub Secrets에 등록된 FRED_API_KEY를 사용하여 공식 연준 API를 호출합니다.")
    else:
        print("[INFO] 등록된 FRED_API_KEY가 없습니다. 공공 엔드포인트를 사용합니다.")

    krw = fetch_exchange_rate()
    gold = fetch_gold_price()
    tips = fetch_fred_series("DFII10")  # 10년 TIPS 실질금리
    us10y = fetch_fred_series("DGS10")  # 10년 명목 국채금리
    bei = fetch_fred_series("T10YIE")   # 10년 기대인플레 BEI
    t10y2y = fetch_fred_series("T10Y2Y") # 10Y-2Y 장단기 금리차
    vix = fetch_fred_series("VIXCLS")    # CBOE VIX 변동성 지수
    cpi = None

    update_indicators_file(krw, gold, tips, us10y, bei, t10y2y, vix, cpi)
    print("=== 수집 완료 ===")

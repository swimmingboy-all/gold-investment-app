#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_latest_data.py
GitHub Actions에서 매일 평일 자동 실행되어 최신 시장 데이터 및 거시 지표를 수집하고
js/indicatorsData.js 파일을 자동으로 갱신하는 스크립트
"""

import urllib.request
import json
import re
import os
import datetime

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

def fetch_fred_csv_latest(series_id):
    """FRED에서 무료로 제공하는 실시간 CSV 데이터 다운로드 (API 키 불필요)"""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as res:
            lines = res.read().decode('utf-8').strip().split('\n')
            for line in reversed(lines):
                parts = line.strip().split(',')
                if len(parts) == 2 and parts[1] != '.' and parts[1] != '':
                    val = float(parts[1])
                    print(f"[OK] FRED {series_id} ({parts[0]}): {val}")
                    return val
    except Exception as e:
        print(f"Error fetching FRED {series_id}: {e}")
    return None

def update_indicators_file(usdkrw, gold_usd, tips, us10y, bei, t10y2y):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(base_dir, 'js', 'indicatorsData.js')

    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    now_str = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))).strftime("%Y-%m-%d %H:%M") + " KST (GitHub Actions 자동 갱신)"

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

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"[SUCCESS] {file_path} 파일이 최신 통계로 갱신되었습니다.")

if __name__ == '__main__':
    print("=== 금 투자 지표 자동 수집기 시작 ===")
    krw = fetch_exchange_rate()
    gold = fetch_gold_price()
    tips = fetch_fred_csv_latest("DFII10")  # 10년 TIPS 실질금리
    us10y = fetch_fred_csv_latest("DGS10")  # 10년 명목 국채금리
    bei = fetch_fred_csv_latest("T10YIE")   # 10년 기대인플레 BEI
    t10y2y = fetch_fred_csv_latest("T10Y2Y") # 10Y-2Y 장단기 금리차

    update_indicators_file(krw, gold, tips, us10y, bei, t10y2y)
    print("=== 수집 완료 ===")

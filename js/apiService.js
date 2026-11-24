/**
 * apiService.js
 * 실시간 금 시세, 환율 및 거시경제 공공 API 연동 모듈
 */

const GoldApiService = {
    // 로컬 스토리지에 저장된 FRED API 키
    getFredApiKey() {
        return localStorage.getItem('gold_fred_api_key') || '';
    },

    setFredApiKey(key) {
        localStorage.setItem('gold_fred_api_key', key.trim());
    },

    /**
     * 실시간 환율 (USD/KRW) 조회
     * Open Exchange Rates 무료 공용 엔드포인트 활용 (API 키 불필요)
     */
    async fetchUsdKrw() {
        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!res.ok) throw new Error('환율 API 응답 오류');
            const data = await res.json();
            if (data && data.rates && data.rates.KRW) {
                return {
                    success: true,
                    rate: Math.round(data.rates.KRW * 10) / 10,
                    time: data.time_last_update_utc
                };
            }
        } catch (e) {
            console.warn('USD/KRW 실시간 조회 실패, 기본값 유지:', e);
        }
        return { success: false, rate: null };
    },

    /**
     * 실시간 국제 금 시세 (XAU/USD) 조회
     * 실물 금 1:1 페깅 자산(PAXG, XAUT)의 전 세계 24시간 실시간 시세 활용 (API 키 불필요)
     */
    async fetchLiveGoldPrice() {
        try {
            // CoinGecko의 실시간 금 토큰(PAX Gold - 실물 1트로이온스 금 보관증) 가격 조회
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold,tether-gold&vs_currencies=usd');
            if (res.ok) {
                const data = await res.json();
                const paxgPrice = data['pax-gold']?.usd;
                const xautPrice = data['tether-gold']?.usd;
                const goldPrice = paxgPrice || xautPrice;
                if (goldPrice && goldPrice > 1500) {
                    return {
                        success: true,
                        goldUSD: Math.round(goldPrice * 100) / 100
                    };
                }
            }
        } catch (e) {
            console.warn('실시간 금 시세 1차 API 조회 실패:', e);
        }

        // 백업 엔드포인트
        try {
            const res2 = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=PAXGUSDT');
            if (res2.ok) {
                const data2 = await res2.json();
                const p = parseFloat(data2.price);
                if (p && p > 1500) {
                    return { success: true, goldUSD: Math.round(p * 100) / 100 };
                }
            }
        } catch (e) {
            console.warn('실시간 금 시세 백업 API 조회 실패:', e);
        }

        return { success: false, goldUSD: null };
    },

    /**
     * FRED (세인트루이스 연준) API를 통한 공식 거시경제 최신 지표 조회
     * (사용자가 무료 API 키를 등록했을 때 활성화)
     */
    async fetchFredSeries(seriesId) {
        const apiKey = this.getFredApiKey();
        if (!apiKey) return null;

        try {
            // FRED API 엔드포인트 (JSON)
            const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.observations && data.observations.length > 0) {
                    const obs = data.observations[0];
                    const val = parseFloat(obs.value);
                    if (!isNaN(val)) {
                        return { value: val, date: obs.date };
                    }
                }
            }
        } catch (e) {
            console.warn(`FRED API 조회 실패 (${seriesId}):`, e);
        }
        return null;
    },

    /**
     * 모든 실시간 데이터 일괄 동기화 실행
     */
    async syncAllLiveData() {
        const results = {
            updatedItems: [],
            errors: []
        };

        // 1. 환율 동기화
        const fx = await this.fetchUsdKrw();
        if (fx.success && fx.rate) {
            GOLD_DATA.meta.usdkrw = fx.rate;
            results.updatedItems.push(`원/달러 환율 (${fx.rate.toLocaleString()}원)`);

            // 달러 및 환율 카테고리 내 수치도 반영
            const usdkrwInd = GOLD_DATA.categories.dollar.indicators.find(i => i.id === 'usdkrw');
            if (usdkrwInd) {
                usdkrwInd.currentValue = fx.rate;
            }
        }

        // 2. 금 시세 동기화
        const gold = await this.fetchLiveGoldPrice();
        if (gold.success && gold.goldUSD) {
            GOLD_DATA.meta.goldUSD = gold.goldUSD;
            // 국내 금값(1g, 돈당) 재계산 (국제금값 / 31.1035g * 환율)
            const krwPerGram = Math.round((gold.goldUSD / 31.1034768) * GOLD_DATA.meta.usdkrw);
            const krwPerDon = Math.round(krwPerGram * 3.75);
            GOLD_DATA.meta.goldKRW_g = krwPerGram;
            GOLD_DATA.meta.goldKRW_don = krwPerDon;
            results.updatedItems.push(`국제 금 시세 ($${gold.goldUSD.toLocaleString()}/oz)`);
        }

        // 3. FRED API 키가 있는 경우 연준 지표 동기화
        if (this.getFredApiKey()) {
            // 10년 TIPS 실질금리 (DFII10)
            const tips = await this.fetchFredSeries('DFII10');
            if (tips) {
                GOLD_DATA.meta.us10yTips = tips.value;
                const tipsInd = GOLD_DATA.categories.realRate.indicators.find(i => i.id === 'us10y_tips');
                if (tipsInd) tipsInd.currentValue = tips.value;
                results.updatedItems.push(`10년 TIPS 실질금리 (${tips.value}%)`);
            }

            // 10년 명목 국채금리 (DGS10)
            const dgs10 = await this.fetchFredSeries('DGS10');
            if (dgs10) {
                GOLD_DATA.meta.us10y = dgs10.value;
                const dgsInd = GOLD_DATA.categories.realRate.indicators.find(i => i.id === 'us10y_nominal');
                if (dgsInd) dgsInd.currentValue = dgs10.value;
                results.updatedItems.push(`10년 명목국채 (${dgs10.value}%)`);
            }

            // 10년 기대인플레 (T10YIE)
            const bei = await this.fetchFredSeries('T10YIE');
            if (bei) {
                const beiInd = GOLD_DATA.categories.realRate.indicators.find(i => i.id === 'bei_10y');
                if (beiInd) beiInd.currentValue = bei.value;
                results.updatedItems.push(`10년 기대인플레 (${bei.value}%)`);
            }

            // 장단기 금리차 (T10Y2Y)
            const t10y2y = await this.fetchFredSeries('T10Y2Y');
            if (t10y2y) {
                const ycInd = GOLD_DATA.categories.macroLabor.indicators.find(i => i.id === 'yield_curve_10y2y');
                if (ycInd) ycInd.currentValue = t10y2y.value;
                results.updatedItems.push(`10Y-2Y 금리차 (${t10y2y.value}%p)`);
            }
        }

        // 업데이트 일시 갱신
        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} (실시간 API 동기화됨)`;
        GOLD_DATA.meta.updatedAt = timeStr;

        return results;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoldApiService;
}

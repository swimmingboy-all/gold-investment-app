/**
 * apiService.js
 * 실시간 금 시세 및 환율 자동 동기화 모듈 (API 키 불필요)
 * 거시경제 지표(TIPS, BEI 등)는 GitHub Actions가 Secrets를 통해 매일 자동 갱신합니다.
 */

const GoldApiService = {
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

        // 2차 백업 엔드포인트 (Binance PAXG)
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
     * 모든 실시간 데이터 일괄 동기화 실행
     */
    async syncAllLiveData() {
        const results = {
            updatedItems: [],
            errors: []
        };

        // 1. 실시간 환율 동기화
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

        // 2. 실시간 국제 금 시세 동기화
        const gold = await this.fetchLiveGoldPrice();
        if (gold.success && gold.goldUSD) {
            GOLD_DATA.meta.goldUSD = gold.goldUSD;
            // 국내 금값(1g, 돈당) 자동 계산 (국제금값 / 31.1035g * 환율)
            const krwPerGram = Math.round((gold.goldUSD / 31.1034768) * GOLD_DATA.meta.usdkrw);
            const krwPerDon = Math.round(krwPerGram * 3.75);
            GOLD_DATA.meta.goldKRW_g = krwPerGram;
            GOLD_DATA.meta.goldKRW_don = krwPerDon;
            results.updatedItems.push(`국제 금 시세 ($${gold.goldUSD.toLocaleString()}/oz)`);
            results.updatedItems.push(`국내 금값 환산 (g당 ${krwPerGram.toLocaleString()}원 / 돈당 ${krwPerDon.toLocaleString()}원)`);
        }

        // 업데이트 일시 갱신 (초 단위 정밀 기록)
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} (실시간 동기화)`;
        GOLD_DATA.meta.updatedAt = timeStr;

        return results;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoldApiService;
}

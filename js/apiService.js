/**
 * apiService.js
 * 100% 무료, CORS 완벽 지원, 무제한 공용 엔드포인트 기반 실시간 시세 동기화 모듈
 * (API 키 불필요, 한국 브라우저/ISP 접속 완벽 호환, 8초 타임아웃 안전망 장착)
 */

// 타임아웃 지원 안전 Fetch 헬퍼
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

const GoldApiService = {
    /**
     * 1. 실시간 원/달러 환율 (USD/KRW) 조회
     * 다중 엔드포인트 백업 적용 (Open Exchange Rates -> Frankfurter)
     */
    async fetchUsdKrw() {
        // 1차 시도: Open Exchange Rates (CORS *, 무료, 실시간 갱신)
        try {
            const res = await fetchWithTimeout('https://open.er-api.com/v6/latest/USD');
            if (res.ok) {
                const data = await res.json();
                if (data && data.rates && data.rates.KRW) {
                    const rate = Math.round(data.rates.KRW * 10) / 10;
                    return { success: true, rate };
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 1차 환율 API 실패, 백업 시도:', e);
        }

        // 2차 백업: Frankfurter (유럽중앙은행 공식 연동)
        try {
            const res2 = await fetchWithTimeout('https://api.frankfurter.app/latest?from=USD&to=KRW');
            if (res2.ok) {
                const data2 = await res2.json();
                if (data2 && data2.rates && data2.rates.KRW) {
                    const rate = Math.round(data2.rates.KRW * 10) / 10;
                    return { success: true, rate };
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 2차 환율 API 실패:', e);
        }

        return { success: false, rate: null };
    },

    /**
     * 2. 실시간 국제 금 시세 (XAU/USD) 조회
     * 다중 엔드포인트 백업 (gold-api.com -> goldprice.org -> alyawmgold -> coingecko)
     */
    async fetchLiveGoldPrice() {
        // 1차 시도: gold-api.com (CORS *, 24시간 실시간 순수 XAU 시세)
        try {
            const res = await fetchWithTimeout('https://api.gold-api.com/price/XAU');
            if (res.ok) {
                const data = await res.json();
                if (data && data.price && data.price > 1000) {
                    return { success: true, goldUSD: Math.round(data.price * 100) / 100 };
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 1차 금 시세 API 실패, 2차 시도:', e);
        }

        // 2차 시도: data-asg.goldprice.org
        try {
            const res = await fetchWithTimeout('https://data-asg.goldprice.org/dbXRates/USD');
            if (res.ok) {
                const data = await res.json();
                if (data && data.items && data.items.length > 0 && data.items[0].xauPrice) {
                    const price = parseFloat(data.items[0].xauPrice);
                    if (price > 1000) {
                        return { success: true, goldUSD: Math.round(price * 100) / 100 };
                    }
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 2차 금 시세 API 실패, 3차 시도:', e);
        }

        // 3차 시도: alyawmgold.com
        try {
            const res = await fetchWithTimeout('https://alyawmgold.com/api/v1/spot/latest?country=USD');
            if (res.ok) {
                const data = await res.json();
                const price = parseFloat(data.price || data.gold_price || (data.data && data.data.price));
                if (price > 1000) {
                    return { success: true, goldUSD: Math.round(price * 100) / 100 };
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 3차 금 시세 API 실패, 4차 시도:', e);
        }

        // 4차 시도: CoinGecko (PAXG 1:1 금 페깅)
        try {
            const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=pax-gold&vs_currencies=usd');
            if (res.ok) {
                const data = await res.json();
                const p = data['pax-gold']?.usd;
                if (p && p > 1000) {
                    return { success: true, goldUSD: Math.round(p * 100) / 100 };
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 4차 금 시세 API 실패:', e);
        }

        return { success: false, goldUSD: null };
    },

    /**
     * 3. 실시간 국제 은 시세 (XAG/USD) 조회 (금/은 비율 산출용)
     */
    async fetchLiveSilverPrice() {
        // 1차 시도: gold-api.com XAG
        try {
            const res = await fetchWithTimeout('https://api.gold-api.com/price/XAG');
            if (res.ok) {
                const data = await res.json();
                if (data && data.price && data.price > 10) {
                    return { success: true, silverUSD: Math.round(data.price * 100) / 100 };
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 1차 은 시세 API 실패, 2차 시도:', e);
        }

        // 2차 시도: CoinGecko KAG (Kinesis Silver)
        try {
            const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=kinesis-silver&vs_currencies=usd');
            if (res.ok) {
                const data = await res.json();
                const p = data['kinesis-silver']?.usd;
                if (p && p > 10) {
                    return { success: true, silverUSD: Math.round(p * 100) / 100 };
                }
            }
        } catch (e) {
            console.warn('[GoldApiService] 2차 은 시세 API 실패:', e);
        }

        return { success: false, silverUSD: null };
    },

    /**
     * 4. 전체 실시간 데이터 종합 동기화
     * 원/달러 환율, 국제 금값, 국내 금값(g/돈), 금/은 비율을 원클릭으로 일괄 갱신
     */
    async syncAllLiveData() {
        const results = {
            updatedItems: [],
            errors: []
        };

        // 병렬로 API 호출 진행
        const [krwRes, goldRes, silverRes] = await Promise.allSettled([
            this.fetchUsdKrw(),
            this.fetchLiveGoldPrice(),
            this.fetchLiveSilverPrice()
        ]);

        // 1. 환율 반영
        if (krwRes.status === 'fulfilled' && krwRes.value && krwRes.value.success) {
            const newRate = krwRes.value.rate;
            const prevRate = GOLD_DATA.meta.usdkrw;
            GOLD_DATA.meta.usdkrw = newRate;

            // 카테고리 데이터 내 indicator도 동기화
            if (GOLD_DATA.categories && GOLD_DATA.categories.dollar) {
                const usdkrwInd = GOLD_DATA.categories.dollar.indicators.find(i => i.id === 'usdkrw');
                if (usdkrwInd) {
                    usdkrwInd.prevValue = prevRate;
                    usdkrwInd.currentValue = newRate;
                    usdkrwInd.change = Math.round((newRate - prevRate) * 10) / 10;
                }
            }
            results.updatedItems.push(`원/달러 환율: ${newRate.toLocaleString()}원`);
        } else {
            results.errors.push('원/달러 환율');
        }

        // 2. 금 시세 반영 & 국내 금값 재계산
        if (goldRes.status === 'fulfilled' && goldRes.value && goldRes.value.success) {
            const newGoldUSD = goldRes.value.goldUSD;
            GOLD_DATA.meta.goldUSD = newGoldUSD;

            // 국내 금값(1g, 돈당) 실시간 재계산: (국제금값 / 31.1034768g) * 환율
            const krwPerGram = Math.round((newGoldUSD / 31.1034768) * GOLD_DATA.meta.usdkrw);
            const krwPerDon = Math.round(krwPerGram * 3.75);
            GOLD_DATA.meta.goldKRW_g = krwPerGram;
            GOLD_DATA.meta.goldKRW_don = krwPerDon;

            results.updatedItems.push(`국제 금 시세: $${newGoldUSD.toLocaleString()}/oz`);
            results.updatedItems.push(`국내 금값: g당 ${krwPerGram.toLocaleString()}원 (돈당 ${krwPerDon.toLocaleString()}원)`);
        } else {
            results.errors.push('국제 금 시세');
        }

        // 3. 은 시세 기반 금/은 비율(Gold-Silver Ratio) 실시간 갱신
        if (silverRes.status === 'fulfilled' && silverRes.value && silverRes.value.success) {
            const silverUSD = silverRes.value.silverUSD;
            const gsRatio = Math.round((GOLD_DATA.meta.goldUSD / silverUSD) * 10) / 10;
            if (GOLD_DATA.categories && GOLD_DATA.categories.relativeValuation) {
                const gsInd = GOLD_DATA.categories.relativeValuation.indicators.find(i => i.id === 'gold_silver_ratio');
                if (gsInd) {
                    gsInd.currentValue = gsRatio;
                }
            }
            results.updatedItems.push(`실시간 금/은 비율: ${gsRatio}배 (은 $${silverUSD})`);
        }

        // 업데이트 일시 갱신 (초 단위 정밀 기록)
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} (실시간 갱신됨)`;
        GOLD_DATA.meta.updatedAt = timeStr;

        return results;
    }
};

// 브라우저 window 객체 및 Node 환경 지원
if (typeof window !== 'undefined') {
    window.GoldApiService = GoldApiService;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoldApiService;
}

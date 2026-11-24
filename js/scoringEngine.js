/**
 * scoringEngine.js
 * 금 투자 종합 매수/매도 시그널 산출 및 분석 리포트 생성 엔진
 */

const GoldScoringEngine = {
    // 기본 가중치 프로필
    defaultWeights: {
        realRate: 30,       // 실질 금리 (가장 중요)
        dollar: 20,         // 달러 & 환율
        supplyDemand: 20,   // 수급 지표 (중앙은행, ETF 등)
        macroLabor: 15,     // 경기 & 고용 & 금리차
        riskSentiment: 15,  // 위험 & 심리
        inflation: 0,       // 인플레이션은 실질금리에 이미 반영되거나 보조 가중치로 선택 가능
        relativeValuation: 0 // 밸류에이션 보조
    },

    // 프리셋 가중치 설정
    presets: {
        balanced: {
            name: "균형 추천형 (기본)",
            weights: { realRate: 30, dollar: 20, supplyDemand: 20, macroLabor: 15, riskSentiment: 15, inflation: 0, relativeValuation: 0 },
            description: "실질금리와 달러, 중앙은행 수급을 균형 있게 고려하는 전문가 추천 기본 모델입니다."
        },
        realRateFocused: {
            name: "실질금리 집중형",
            weights: { realRate: 50, dollar: 20, supplyDemand: 10, macroLabor: 10, riskSentiment: 10, inflation: 0, relativeValuation: 0 },
            description: "금의 역사적 최대 결정 요인인 TIPS 및 통화정책 기조에 가중치를 극대화한 모델입니다."
        },
        structuralSupply: {
            name: "수급 & 탈달러형",
            weights: { realRate: 20, dollar: 20, supplyDemand: 40, macroLabor: 10, riskSentiment: 10, inflation: 0, relativeValuation: 0 },
            description: "전 세계 중앙은행의 탈달러 금 매입과 ETF 자금 유입 등 실물 수급을 최우선으로 평가합니다."
        },
        crisisHedge: {
            name: "위험 & 침체 방어형",
            weights: { realRate: 20, dollar: 15, supplyDemand: 15, macroLabor: 25, riskSentiment: 25, inflation: 0, relativeValuation: 0 },
            description: "장단기 금리차 역전 후 경기 침체 및 지정학 리스크 폭발 시의 안전자산 프리미엄을 중시합니다."
        }
    },

    /**
     * 카테고리별 개별 점수 및 종합 점수 계산
     * @param {Object} customWeights - 사용자 정의 가중치
     * @param {Object} indicatorOverrides - What-If 시뮬레이션용 지표 변경값
     */
    calculateScore(customWeights = null, indicatorOverrides = {}) {
        const weights = customWeights || { ...this.defaultWeights };
        const categories = GOLD_DATA.categories;
        const categoryScores = {};
        const indicatorDetails = [];

        // 1. 카테고리별 점수 계산 (-100 ~ +100 스케일)
        let totalWeightedScore = 0;
        let totalWeightApplied = 0;

        for (const [catKey, catData] of Object.entries(categories)) {
            let catSum = 0;
            let catCount = 0;

            catData.indicators.forEach(ind => {
                let score = ind.score;
                // What-If 오버라이드가 있을 경우 적용
                if (indicatorOverrides[ind.id] !== undefined) {
                    score = this.evaluateOverride(ind.id, indicatorOverrides[ind.id]);
                }

                catSum += score;
                catCount++;

                indicatorDetails.push({
                    categoryId: catKey,
                    categoryName: catData.name,
                    id: ind.id,
                    name: ind.name,
                    score: score,
                    impact: score > 0 ? "bullish" : (score < 0 ? "bearish" : "neutral"),
                    currentValue: indicatorOverrides[ind.id] !== undefined ? indicatorOverrides[ind.id] : ind.currentValue,
                    unit: ind.unit,
                    explanation: ind.explanation
                });
            });

            // 개별 카테고리 평균 점수 (-2 ~ +2) -> (-100 ~ +100)으로 스케일링
            const catAvg = catCount > 0 ? (catSum / catCount) : 0;
            const catScore100 = Math.round((catAvg / 2) * 100);

            categoryScores[catKey] = {
                id: catKey,
                name: catData.name,
                importance: catData.importance,
                score: catScore100, // -100 ~ +100
                rawAvg: catAvg,
                weight: weights[catKey] || 0
            };

            // 가중치 적용 합산
            const weight = weights[catKey] || 0;
            if (weight > 0) {
                totalWeightedScore += catScore100 * (weight / 100);
                totalWeightApplied += weight;
            }
        }

        // 가중치 합계가 100이 아닐 경우 정규화
        const finalScore = totalWeightApplied > 0 
            ? Math.round(totalWeightedScore * (100 / totalWeightApplied))
            : 0;

        // 2. 판정 결과 도출
        const signal = this.getSignalClassification(finalScore);

        // 3. 핵심 호재 및 악재 요인 추출 (Top Drivers)
        const sortedIndicators = [...indicatorDetails].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
        const bullishDrivers = indicatorDetails.filter(i => i.score > 0).sort((a, b) => b.score - a.score).slice(0, 4);
        const bearishRisks = indicatorDetails.filter(i => i.score < 0).sort((a, b) => a.score - b.score).slice(0, 3);

        // 4. 투자 전략 및 국내 투자자 특화 액션플랜 생성
        const actionPlan = this.generateActionPlan(finalScore, signal, categoryScores);

        return {
            finalScore, // -100 ~ +100
            signal,     // Strong Buy, Buy, Neutral, Sell, Strong Sell
            categoryScores,
            indicatorDetails,
            bullishDrivers,
            bearishRisks,
            actionPlan,
            appliedWeights: weights,
            evaluatedAt: new Date().toLocaleDateString('ko-KR')
        };
    },

    /**
     * 점수에 따른 신호 분류
     */
    getSignalClassification(score) {
        if (score >= 60) {
            return {
                type: "STRONG_BUY",
                korean: "적극 매수 (Strong Buy)",
                badgeClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
                color: "#10b981",
                icon: "trending-up",
                summary: "실질금리 하락, 중앙은행 수급, 거시환경이 완벽한 시너지를 내는 최상의 매수 국면입니다. 포트폴리오 내 비중 확대를 강력 권고합니다.",
                recommendation: "신규 자금 적극 투입 및 분할 매수보다 적극적인 비중 확대가 유리한 시점"
            };
        } else if (score >= 20) {
            return {
                type: "BUY",
                korean: "매수 / 비중 확대 (Buy)",
                badgeClass: "bg-teal-500/20 text-teal-300 border-teal-500/40",
                color: "#14b8a6",
                icon: "arrow-up-right",
                summary: "대부분의 거시 지표가 금에 우호적입니다. 단기 변동성을 활용한 눌림목 분할 매수 전략이 매우 유효합니다.",
                recommendation: "조정 시마다 3~4회에 걸친 분할 매수(DCA)를 통해 금 비중 15~20% 확보 권장"
            };
        } else if (score >= -19) {
            return {
                type: "HOLD",
                korean: "중립 / 관망 (Hold & Watch)",
                badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
                color: "#f59e0b",
                icon: "minus",
                summary: "상승 요인(중앙은행 매입 등)과 하방 압력(달러 반등, 실질금리 저항 등)이 팽팽히 맞서는 균형 구간입니다.",
                recommendation: "신규 대규모 매수는 자제하고, 기존 보유 물량을 유지하며 주요 경제지표(FOMC/CPI) 발표를 관망"
            };
        } else if (score >= -59) {
            return {
                type: "SELL",
                korean: "매도 / 비중 축소 (Reduce / Sell)",
                badgeClass: "bg-orange-500/20 text-orange-400 border-orange-500/40",
                color: "#f97316",
                icon: "arrow-down-right",
                summary: "실질금리 상승 또는 달러 강세 압력으로 금 가격의 단기 조정 압력이 우세합니다. 수익 실현이 유리합니다.",
                recommendation: "고점 분할 차익실현을 통해 현금 비중을 확보하고 단기 지지선 확인 후 재진입 모색"
            };
        } else {
            return {
                type: "STRONG_SELL",
                korean: "적극 매도 / 현금화 (Strong Sell)",
                badgeClass: "bg-rose-500/20 text-rose-400 border-rose-500/40",
                color: "#f43f5e",
                icon: "trending-down",
                summary: "긴축 재강화, 실질금리 급등, 달러 초강세 등 금에 극도로 불리한 거시 역풍이 몰아치는 국면입니다.",
                recommendation: "금 포지션을 대폭 축소하고 리스크 관리에 집중하며 안전 채권/현금 비중 확대"
            };
        }
    },

    /**
     * 상세 투자 가이드 및 액션 플랜 텍스트 생성
     */
    generateActionPlan(score, signal, catScores) {
        const isKrwAdvantage = GOLD_DATA.meta.usdkrw >= 1350;
        const realRateScore = catScores.realRate ? catScores.realRate.score : 0;
        const supplyScore = catScores.supplyDemand ? catScores.supplyDemand.score : 0;

        let domesticStrategy = "";
        if (isKrwAdvantage) {
            domesticStrategy = `현재 원/달러 환율이 ${GOLD_DATA.meta.usdkrw}원의 고환율 구간입니다. 국내 금 투자자는 국제 금 가격 상승분 외에도 **환율 방어 및 환차익 프리미엄(KRW 환산 효과)**을 동시에 누릴 수 있는 매우 유리한 환경입니다. KRX 금시장(비과세 혜택)을 통한 매수가 가장 권장됩니다.`;
        } else {
            domesticStrategy = `환율이 안정권에 있어 순수한 국제 금 가격(XAU/USD) 변동에 수렴하는 투자 전략이 적합합니다.`;
        }

        const coreRationales = [
            `**실질금리 환경 (기여도 1위)**: 실질금리 지표 점수가 ${realRateScore > 0 ? '+' : ''}${realRateScore}점으로, 금의 보유 기회비용이 낮아 금값의 구조적 상승을 강력하게 견인하고 있습니다.`,
            `**구조적 수급 (하방 안전판)**: 각국 중앙은행의 탈달러 외환보유액 다변화(연 1,000톤 이상 순매입)와 글로벌 금 ETF 유입세가 탄탄한 가격 하한선을 구축하고 있습니다.`,
            `**지정학 및 거시 리스크**: 장단기 금리차 정상화 이후의 잠재적 경기 둔화와 지정학 긴장이 지속적인 안전자산 프리미엄을 유지시키고 있습니다.`
        ];

        return {
            domesticStrategy,
            coreRationales,
            targetAllocation: score >= 60 ? "15% ~ 25%" : (score >= 20 ? "10% ~ 15%" : (score >= -19 ? "5% ~ 10%" : "0% ~ 5%")),
            timingAdvice: score >= 20 
                ? "단기 급등 시 추격 매수보다는 20일 이동평균선 부근이나 주요 지표 발표 직후 단기 눌림목에서 분할 매수하는 것이 이상적입니다."
                : "지지선 이탈 여부를 확인하기 전까지는 신규 진입을 서두르지 않는 것이 안전합니다."
        };
    },

    /**
     * What-If 시뮬레이션용 지표 변경값에 따른 동적 점수 평가
     */
    evaluateOverride(indicatorId, val) {
        const num = parseFloat(val);
        if (isNaN(num)) return 0;

        switch (indicatorId) {
            case "us10y_tips":
                // 10년 TIPS 금리: 1.5% 미만 (+2), 1.5~2.0% (+1), 2.0~2.3% (0), 2.3~2.6% (-1), 2.6% 초과 (-2)
                if (num < 1.5) return +2;
                if (num < 2.0) return +1;
                if (num < 2.3) return 0;
                if (num < 2.6) return -1;
                return -2;

            case "dxy":
                // 달러인덱스: 100 이하 (+2), 100~103 (+1), 103~105 (0), 105~107 (-1), 107 초과 (-2)
                if (num < 101) return +2;
                if (num < 103.5) return +1;
                if (num < 105) return 0;
                if (num < 107) return -1;
                return -2;

            case "usdkrw":
                // 원달러 환율: 국내 금값 관점에서는 높을수록 원화 환산 가격에 유리
                if (num >= 1400) return +2;
                if (num >= 1350) return +1;
                if (num >= 1300) return 0;
                return -1;

            case "central_bank_net_buys":
                // 분기 톤수: 250톤 이상 (+2), 200~250 (+1), 150~200 (0), 150 미만 (-1)
                if (num >= 250) return +2;
                if (num >= 200) return +1;
                if (num >= 150) return 0;
                return -1;

            case "cpi":
                // CPI YoY: 3.5% 이상 (+2), 2.5~3.5% (+1), 2.0~2.5% (0), 2.0% 미만 (0)
                if (num >= 3.5) return +2;
                if (num >= 2.5) return +1;
                return 0;

            case "vix":
                // VIX: 25 이상 (+2), 20~25 (+1), 15~20 (0), 15 미만 (0)
                if (num >= 25) return +2;
                if (num >= 20) return +1;
                return 0;

            default:
                return +1;
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoldScoringEngine;
}

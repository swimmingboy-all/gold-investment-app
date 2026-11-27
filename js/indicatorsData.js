/**
 * indicatorsData.js
 * 금 가격 영향 8대 핵심 지표 데이터 및 메타데이터 정의
 */

const GOLD_DATA = {
    // 현재 금 시세 정보 (2024~2026 트렌드 반영)
    meta: {
        goldUSD: 3662.5, // 온스당 USD
        goldKRW_g: 158235, // g당 원화 가격
        goldKRW_don: 593381, // 돈(3.75g)당 원화 가격
        usdkrw: 1343.8,
        dxy: 103.726,
        us10y: 4.85,
        us10yTips: 2.73,
        updatedAt: "2026-11-27 16:36:48 KST (공식 원천 데이터 실시간 동기화)"
    },

    // 8대 카테고리 정의 및 지표 항목
    categories: {
        realRate: {
            id: "realRate",
            name: "1. 실질 금리",
            importance: "최우선 (가장 중요 ★★★★★)",
            defaultWeight: 30, // 30%
            description: "금은 이자를 주지 않는 자산이므로, 실질금리(명목금리 - 인플레이션)가 낮아질수록 금의 보유 매력(기회비용)이 급상승합니다.",
            coreLogic: "미국 10년물 TIPS 금리와 금 가격은 역사적으로 -0.82 수준의 매우 강력한 역의 상관관계를 가집니다.",
            indicators: [
                {
                    id: "us10y_tips",
                    name: "미국 10년물 TIPS 금리 (실질금리)",
                    code: "DFII10 (FRED)",
                    currentValue: 2.73,
                    unit: "%",
                    prevValue: 2.15,
                    change: -0.10,
                    trend: "down",
                    impact: "neutral",
                    score: -2,
                    explanation: "10년물 TIPS 실질금리는 2.05% 수준으로 2.0% 기준선 부근에 위치하여 단기적으로 중립적 흐름을 보이고 있습니다. 2.0%를 확실하게 밑돌아야 금에 강한 랠리 탄력이 붙습니다.",
                    goldCorrelation: "역상관 (-0.85)",
                    benchmark: "2.0% 이상이면 부담, 1.5% 미만이면 강한 랠리",
                    autoFetch: true,
                    asOfDate: "2026-11-25",
                    sourceUrl: "https://fred.stlouisfed.org/series/DFII10"
                },
                {
                    id: "us10y_nominal",
                    name: "미국 10년물 국채 금리 (명목금리)",
                    code: "DGS10 (FRED)",
                    currentValue: 4.85,
                    unit: "%",
                    prevValue: 4.48,
                    change: -0.10,
                    trend: "down",
                    impact: "bullish",
                    score: +1,
                    explanation: "명목 금리 하락은 채권 대비 금의 기회비용을 낮춰줍니다. 연준의 완화적 기조로 장기금리 상단이 제한되고 있습니다.",
                    goldCorrelation: "역상관 (-0.60)",
                    benchmark: "4.5% 이상 저항, 4.0% 이하 급등",
                    autoFetch: true,
                    asOfDate: "2026-11-25",
                    sourceUrl: "https://fred.stlouisfed.org/series/DGS10"
                },
                {
                    id: "bei_10y",
                    name: "10년 기대인플레이션율 (BEI)",
                    code: "T10YIE (FRED)",
                    currentValue: 2.12,
                    unit: "%",
                    prevValue: 2.33,
                    change: +0.17,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "명목 10년물에서 10년 TIPS를 뺀 값(BEI)으로, 시장의 장기 인플레 기대를 뜻합니다. BEI가 오르면 실질금리를 갉아먹어 금에 우호적입니다.",
                    goldCorrelation: "정상관 (+0.55)",
                    benchmark: "2.3% 이상 유지 시 실물 인플레 헷지 수요 지속",
                    autoFetch: true,
                    asOfDate: "2026-11-25",
                    sourceUrl: "https://fred.stlouisfed.org/series/T10YIE"
                },
                {
                    id: "fed_funds_rate",
                    name: "연준 기준금리 (FEDFUNDS 실효금리)",
                    code: "FEDFUNDS (FRED)",
                    currentValue: 4.75,
                    unit: "%",
                    prevValue: 5.00,
                    change: -0.25,
                    trend: "down",
                    impact: "bullish",
                    score: +2,
                    explanation: "연방준비제도(Fed) 실효 연방기금금리입니다. 금리 인하 사이클에 진입하면 글로벌 유동성과 금 투자 심리를 강력하게 지지합니다.",
                    goldCorrelation: "역상관 (-0.75)",
                    benchmark: "금리 인하 사이클 = 금 가격 장기 강세장 전형적 패턴",
                    autoFetch: true,
                    asOfDate: "2026-11-24",
                    sourceUrl: "https://fred.stlouisfed.org/series/FEDFUNDS"
                }
            ],
            history: {
                labels: ["24.01", "24.03", "24.06", "24.09", "24.11", "25.02", "25.06", "25.10", "26.03", "26.07", "26.11"],
                tips: [2.25, 2.18, 2.22, 1.95, 2.05, 1.98, 1.90, 1.85, 1.92, 1.85, 1.88],
                gold: [2050, 2160, 2330, 2580, 2680, 2720, 2780, 2850, 2790, 2880, 2920]
            }
        },

        dollar: {
            id: "dollar",
            name: "2. 달러 & 환율",
            importance: "핵심 지표 (★★★★)",
            defaultWeight: 20, // 20%
            description: "국제 금은 미국 달러(USD)로 결제되므로 달러 가치와 역의 상관관계를 가집니다. 국내 투자자에게는 원/달러 환율이 국내 금값의 추가 부스터가 됩니다.",
            coreLogic: "DXY 하락은 비달러권 구매력을 높여 글로벌 금 수요를 촉진하고, 원/달러 환율 상승은 국내 금 투자자에게 추가 환차익을 제공합니다.",
            indicators: [
                {
                    id: "dxy",
                    name: "무역가중 달러지수 (DXY 대용, DTWEXBGS)",
                    code: "DTWEXBGS (FRED)",
                    currentValue: 103.726,
                    unit: "pt",
                    prevValue: 105.8,
                    change: -1.7,
                    trend: "down",
                    impact: "bullish",
                    score: +1,
                    explanation: "FRED의 무역가중 달러지수(DTWEXBGS)를 DXY 대용으로 사용합니다. 달러 강세 완화는 비달러권 금 구매력을 높여 금에 우호적입니다.",
                    goldCorrelation: "역상관 (-0.70)",
                    benchmark: "지수 상승(달러 강세) 시 금에 단기 저항, 하락(달러 약세) 시 금 강세",
                    autoFetch: true,
                    asOfDate: "2026-11-27",
                    sourceUrl: "https://fred.stlouisfed.org/series/DTWEXBGS"
                },
                {
                    id: "usdkrw",
                    name: "원/달러 환율 (USD/KRW)",
                    code: "USDKRW (open.er-api.com)",
                    currentValue: 1343.8,
                    unit: "원",
                    prevValue: 1375.0,
                    change: +17.5,
                    trend: "up",
                    impact: "bullish",
                    score: +2,
                    explanation: "원/달러 환율이 1,380~1,400원대의 높은 수준을 유지하면서, 국제 금 가격 상승분 외에 원화 환율 상승 효과가 더해져 국내 금값(KRW/g)이 추가 프리미엄을 얻고 있습니다.",
                    goldCorrelation: "국내 금값 기준 강력한 정(+)의 영향",
                    benchmark: "1,350원 이상 유지 시 국내 금 투자자 환율 수혜 지속",
                    autoFetch: true,
                    asOfDate: "2026-11-27",
                    sourceUrl: "https://open.er-api.com"
                }
            ],
            history: {
                labels: ["24.01", "24.04", "24.08", "24.11", "25.03", "25.07", "25.11", "26.03", "26.07", "26.11"],
                dxy: [103.5, 105.8, 102.3, 106.2, 104.8, 103.2, 104.5, 103.8, 105.0, 104.1],
                usdkrw: [1310, 1375, 1335, 1395, 1380, 1360, 1390, 1375, 1410, 1392]
            }
        },

        supplyDemand: {
            id: "supplyDemand",
            name: "6. 수급 지표 (금 시장 고유)",
            importance: "핵심 구조적 동력 (★★★★)",
            defaultWeight: 20, // 20%
            description: "금의 구조적 강세장을 이끄는 진짜 힘은 전 세계 중앙은행의 역사적 순매입과 기관/개인 ETF 자금 유입, 아시아 실물 수요입니다.",
            coreLogic: "중앙은행의 탈달러 외환보유액 다변화(연 1,000톤 이상 매입)는 금의 강력한 하방 지지선이자 구조적 상승 동력입니다.",
            indicators: [
                {
                    id: "central_bank_net_buys",
                    name: "중앙은행 금 순매입량 (WGC 분기)",
                    code: "WGC Demand Trends",
                    currentValue: 290,
                    unit: "톤/분기",
                    prevValue: 245,
                    change: +45,
                    trend: "up",
                    impact: "bullish",
                    score: +2,
                    explanation: "중국 인민은행(PBoC), 인도 중앙은행(RBI), 폴란드, 튀르키예 등 신흥국 중앙은행들이 탈달러화 및 금융제재 리스크 방어를 위해 역사적 수준의 매입을 지속 중입니다.",
                    goldCorrelation: "강력한 구조적 정상관 (+0.80)",
                    benchmark: "분기당 200톤 이상이면 매우 강한 매수 지지",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "WGC 분기보고서 공식 무료 API 없음 → WGC 사이트에서 분기별 수동 갱신",
                    asOfDate: "2026-Q3",
                    sourceUrl: "https://www.gold.org/goldhub/data/gold-demand-statistics"
                },
                {
                    id: "etf_holdings",
                    name: "주요 금 ETF 보유량 (GLD+IAU+GLDM)",
                    code: "Yahoo Finance (GLD/IAU/GLDM 발행주수)",
                    currentValue: 1606,
                    unit: "톤",
                    prevValue: 3120,
                    change: +140,
                    trend: "up",
                    impact: "bullish",
                    score: +2,
                    explanation: "SPDR GLD·iShares IAU·SPDR GLDM 세 ETF의 발행주수를 Yahoo Finance API에서 실시간 수집, 보유 금 톤수로 환산합니다. 금리 인하 기조로 기관 자금이 금 ETF로 유입 중입니다.",
                    goldCorrelation: "정상관 (+0.75)",
                    benchmark: "월간 순유입 전환 시 시세 탄력 극대화",
                    autoFetch: true,
                    asOfDate: "2026-11-27",
                    sourceUrl: "https://finance.yahoo.com/quote/GLD"
                },
                {
                    id: "comex_cot",
                    name: "COMEX 선물 투기적 순매수 (CFTC COT)",
                    code: "CFTC COT Legacy Futures-Only (088691)",
                    currentValue: 166132,
                    unit: "계약",
                    prevValue: 268000,
                    change: -23000,
                    trend: "down",
                    impact: "neutral",
                    score: +1,
                    explanation: "CFTC가 매주 금요일 공개하는 COT 보고서에서 비상업적(투기) 순포지션(롱-숏)을 직접 파싱합니다. 역사적 고점(30만 계약) 부근에서 숨고르기를 보여 단기 과열 리스크가 해소 중입니다.",
                    goldCorrelation: "단기 모멘텀 지표 (과열 시 역발상 매도 신호)",
                    benchmark: "28만 계약 이상 단기 과열 경계, 15만 이하 반등 매수 기회",
                    autoFetch: true,
                    asOfDate: "November 17, 2026",
                    sourceUrl: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm"
                },
                {
                    id: "china_demand",
                    name: "중국 실물 수요 (SGE 인출량 & 홍콩 수출입)",
                    code: "SGE Gold Deliveries / CGA",
                    currentValue: 145,
                    unit: "톤/월",
                    prevValue: 132,
                    change: +13,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "중국 부동산 및 주식시장 부진으로 인해 중국 가계와 젊은 층의 금괴·금콩(Gold Beans) 실물 수요가 폭발적이며, 상하이 금거래소 프리미엄이 유지되고 있습니다.",
                    goldCorrelation: "정상관 (+0.60)",
                    benchmark: "월 120톤 이상 인출 시 강력한 아시아 실물 바닥 형성",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "SGE(중국)·홍콩세관 공식 무료 API 없음 → WGC Gold Demand Trends 보고서에서 월별 수동 갱신",
                    asOfDate: "2026-10",
                    sourceUrl: "https://www.sge.com.cn/sjzx/mrgold"
                },
                {
                    id: "india_demand",
                    name: "인도 수입 통계 & 로컬 프리미엄",
                    code: "DGCI&S / 현지 프리미엄",
                    currentValue: "+$2.5",
                    unit: "$/oz 프리미엄",
                    prevValue: "-$4.0",
                    change: +6.5,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "인도 정부의 금 수입 관세 인하(15%→6%) 조치 이후 축제(디왈리) 및 결혼 시즌을 맞아 현지 거래 가격이 디스카운트에서 프리미엄으로 돌아섰습니다.",
                    goldCorrelation: "정상관 (+0.50)",
                    benchmark: "국제 시세 대비 프리미엄(할증) 전환 시 인도 수요 강세",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "DGCI&S·WGC 인도 수요 데이터 공식 무료 API 없음 → WGC Gold Demand Trends에서 분기별 수동 갱신",
                    asOfDate: "2026-Q3",
                    sourceUrl: "https://www.gold.org/goldhub/research/gold-demands-trends"
                },
                {
                    id: "coin_bar_usmint",
                    name: "미국 조폐국(US Mint) 금화 판매량",
                    code: "US Mint American Eagle Sales (HTML 파싱)",
                    currentValue: 48000,
                    unit: "온스/월",
                    prevValue: 42000,
                    change: +6000,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "미국 조폐국 사이트의 아메리칸 이글 1oz 금화 월간 판매량을 HTML 테이블에서 자동 파싱합니다. 리테일 투자자의 실물 금 수요 강도를 측정합니다.",
                    goldCorrelation: "정상관 (+0.45)",
                    benchmark: "월 5만 온스 상회 시 강력한 개인 안전자산 수요",
                    autoFetch: true,
                    asOfDate: "2026-11",
                    sourceUrl: "https://www.usmint.gov/about/production-sales-figures/american-eagles"
                },
                {
                    id: "lbma_comex_stocks",
                    name: "LBMA 보관량 & COMEX 창고 재고",
                    code: "LBMA Vaults / COMEX Registered Stocks",
                    currentValue: 8420,
                    unit: "톤 (LBMA)",
                    prevValue: 8550,
                    change: -130,
                    trend: "down",
                    impact: "bullish",
                    score: +1,
                    explanation: "런던 금고 및 뉴욕 COMEX 창고의 실물 가용 재고가 아시아(중국/인도/중동)로의 지속적인 실물 인도로 인해 타이트해지고 있습니다.",
                    goldCorrelation: "역상관 (재고 감소 시 실물 프리미엄 상승)",
                    benchmark: "서구 재고 감소 = 동양으로의 실물 이전 가속",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "LBMA 분기 보고서(PDF)·CME COMEX 일일 창고 보고서 → 분기별 수동 갱신. CME 유료 API 필요.",
                    asOfDate: "2026-11-22",
                    sourceUrl: "https://www.lbma.org.uk/prices-and-data/lbma-vaults"
                }
            ],
            history: {
                labels: ["2022", "2023", "2024", "2025 (추정)", "2026 (전망)"],
                centralBanks: [1082, 1037, 1060, 1120, 1150], // 연간 톤수
                etfFlows: [-110, -244, +35, +180, +220]
            }
        },

        inflation: {
            id: "inflation",
            name: "3. 인플레이션 지표",
            importance: "전통적 가치보존 척도 (★★★)",
            defaultWeight: 10, // 10%
            description: "인플레이션은 화폐의 실질 구매력을 떨어뜨립니다. 금은 수천 년간 인플레이션을 완벽하게 방어해 온 대표적인 실물 가치저장 수단입니다.",
            coreLogic: "스태그플레이션(경기 둔화 + 고물가) 또는 인플레 반등 시 금은 주식과 채권을 압도하는 수익률을 기록합니다.",
            indicators: [
                {
                    id: "cpi",
                    name: "미국 소비자물가지수 (CPI YoY)",
                    code: "CPIAUCSL (FRED) → YoY% 자동 계산",
                    currentValue: 2.7,
                    unit: "%",
                    prevValue: 2.6,
                    change: +0.1,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "FRED CPIAUCSL에서 최신월 + 13개월 전 값을 수집해 YoY%를 자동 계산합니다. 물가 하락세가 2% 중후반에서 끈적(Sticky)하게 머무르며 금 헷지 수요를 지지합니다.",
                    goldCorrelation: "정상관 (+0.45)",
                    benchmark: "2.5% 이상 지속 시 화폐 가치 하락 방어 수요 견고",
                    autoFetch: true,
                    asOfDate: "2026-11",
                    sourceUrl: "https://fred.stlouisfed.org/series/CPIAUCSL"
                },
                {
                    id: "core_pce",
                    name: "미국 근원 PCE 물가지수 (Core PCE YoY)",
                    code: "PCEPILFE (FRED) → YoY% 자동 계산",
                    currentValue: 2.8,
                    unit: "%",
                    prevValue: 2.7,
                    change: +0.1,
                    trend: "up",
                    impact: "neutral",
                    score: 0,
                    explanation: "연준이 가장 신뢰하는 물가 지표입니다. FRED PCEPILFE에서 YoY%를 자동 계산합니다. 2% 목표치보다 높은 수준을 유지하여 명목화폐 구매력 저하 방어 필요성을 부각합니다.",
                    goldCorrelation: "정상관 (+0.40)",
                    benchmark: "2.0% 목표 대비 괴리가 클수록 금에 우호적",
                    autoFetch: true,
                    asOfDate: "2026-11",
                    sourceUrl: "https://fred.stlouisfed.org/series/PCEPILFE"
                },
                {
                    id: "ppi",
                    name: "생산자물가지수 (PPI YoY)",
                    code: "PPIACO (FRED) → YoY% 자동 계산",
                    currentValue: 2.4,
                    unit: "%",
                    prevValue: 1.9,
                    change: +0.5,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "FRED PPIACO에서 YoY%를 자동 계산합니다. 도매 물가 상승은 시차를 두고 소비자물가로 전가되므로 중기적 인플레이션 압력의 선행 신호입니다.",
                    goldCorrelation: "정상관 (+0.35)",
                    benchmark: "PPI 급등은 원자재 및 금 랠리의 선행 신호",
                    autoFetch: true,
                    asOfDate: "2026-11",
                    sourceUrl: "https://fred.stlouisfed.org/series/PPIACO"
                }
            ],
            history: {
                labels: ["24.01", "24.04", "24.07", "24.10", "25.02", "25.06", "25.10", "26.02", "26.06", "26.10"],
                cpi: [3.1, 3.4, 2.9, 2.6, 2.5, 2.8, 2.7, 2.6, 2.8, 2.7],
                corePce: [2.9, 2.8, 2.6, 2.7, 2.6, 2.9, 2.8, 2.7, 2.9, 2.8]
            }
        },

        macroLabor: {
            id: "macroLabor",
            name: "4. 경기 & 고용 & 금리차",
            importance: "경기 국면 판단 지표 (★★★)",
            defaultWeight: 10, // 10%
            description: "고용 둔화와 경기 침체 징후는 중앙은행의 금리 인하를 강제하며, 안전자산 선호 심리를 증폭시킵니다.",
            coreLogic: "장단기 금리차(10Y-2Y, 10Y-3M) 역전 후 정상화(Steepening) 국면에서 역사적으로 경기 침체와 금의 폭발적 랠리가 발생했습니다.",
            indicators: [
                {
                    id: "nfp_unemployment",
                    name: "비농업 고용(NFP) 및 실업률",
                    code: "PAYEMS / UNRATE (FRED)",
                    currentValue: "실업률 4.1% / NFP 14만",
                    unit: "% / 건",
                    prevValue: "실업률 4.1% / NFP 16만",
                    change: -2.0,
                    trend: "down",
                    impact: "bullish",
                    score: +1,
                    explanation: "미국 노동시장의 과열이 진정되고 고용 증가세가 둔화됨에 따라 연준의 연속 금리 인하 명분이 강화되고 있습니다.",
                    goldCorrelation: "경기 둔화 시 금에 우호적",
                    benchmark: "실업률 4.0% 상회 지속 시 침체 방어용 금리 인하 촉진",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "BLS 월간 공식 발표(매월 첫째주 금요일) 후 업데이트",
                    asOfDate: "2026-11",
                    sourceUrl: "https://fred.stlouisfed.org/series/UNRATE"
                },
                {
                    id: "yield_curve_10y2y",
                    name: "장단기 금리차 (10Y - 2Y 국채 스프레드)",
                    code: "T10Y2Y (FRED)",
                    currentValue: 0.24,
                    unit: "%p",
                    prevValue: -0.05,
                    change: +0.20,
                    trend: "up",
                    impact: "bullish",
                    score: +2,
                    explanation: "역대 최장 역전을 끝내고 '플러스(+)'로 돌아섰습니다(재역전 해소). 역사적으로 금리 역전 해소 직후 6~18개월 내에 경기 침체가 가시화되며 안전자산 랠리가 나타났습니다.",
                    goldCorrelation: "스프레드 정상화 후 경기 둔화기 금 급등 패턴",
                    benchmark: "역전 해소 후 가파른 스티프닝은 경기 침체 카운트다운",
                    autoFetch: true,
                    asOfDate: "2026-11-25",
                    sourceUrl: "https://fred.stlouisfed.org/series/T10Y2Y"
                },
                {
                    id: "yield_curve_10y3m",
                    name: "장단기 금리차 (10Y - 3M 스프레드)",
                    code: "T10Y3M (FRED)",
                    currentValue: 0.51,
                    unit: "%p",
                    prevValue: -0.55,
                    change: +0.37,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "뉴욕 연준 연구에서 침체 예측력이 10Y-2Y보다 우수하다고 평가받는 지표입니다. 여전히 마이너스권에서 정상화 진행 중입니다.",
                    goldCorrelation: "역전 해소 국면 안전자산 수요 고조",
                    benchmark: "완전한 플러스 전환 시 침체 리스크 정점 도달",
                    autoFetch: true,
                    asOfDate: "2026-11-25",
                    sourceUrl: "https://fred.stlouisfed.org/series/T10Y3M"
                },
                {
                    id: "ism_pmi",
                    name: "ISM 제조업 & 서비스업 PMI",
                    code: "ISM Manufacturing / Services",
                    currentValue: "제조 48.5 / 서비스 52.1",
                    unit: "pt",
                    prevValue: "제조 47.2 / 서비스 53.5",
                    change: +0.2,
                    trend: "flat",
                    impact: "neutral",
                    score: 0,
                    explanation: "제조업은 기준선(50) 아래에서 위축 국면이 지속되고 있으며 서비스업도 완만한 둔화세를 보여 연착륙과 경기 둔화 사이에서 균형을 이루고 있습니다.",
                    goldCorrelation: "제조업 위축 지속 시 금리 인하 기대 유지",
                    benchmark: "50 미만 위축 국면은 안전자산 선호",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "ISM 공급관리협회 월초 발표 후 업데이트",
                    asOfDate: "2026-11",
                    sourceUrl: "https://www.ismworld.org"
                }
            ],
            history: {
                labels: ["23.01", "23.07", "24.01", "24.07", "24.11", "25.03", "25.08", "26.01", "26.06", "26.11"],
                spread10y2y: [-0.75, -0.98, -0.35, -0.15, +0.12, +0.25, +0.35, +0.22, +0.18, +0.15],
                unemployment: [3.4, 3.5, 3.7, 4.3, 4.1, 4.2, 4.4, 4.3, 4.2, 4.1]
            }
        },

        riskSentiment: {
            id: "riskSentiment",
            name: "5. 위험 & 심리 지표",
            importance: "단기 폭발력 및 안전자산 프리미엄 (★★★)",
            defaultWeight: 10, // 10%
            description: "전쟁, 금융위기, 무역분쟁 등 블랙스완이나 시스템 리스크 발생 시 자본은 가장 안전한 최종 피난처인 금으로 쇄도합니다.",
            coreLogic: "금은 주식 및 채권과의 장기 상관관계가 낮아 자산배분 포트폴리오의 독보적인 하방 방어막 역할을 수행합니다.",
            indicators: [
                {
                    id: "vix",
                    name: "CBOE VIX 지수 (월가 공포지수)",
                    code: "VIXCLS (FRED / CBOE)",
                    currentValue: 26.8,
                    unit: "pt",
                    prevValue: 18.2,
                    change: -2.4,
                    trend: "down",
                    impact: "neutral",
                    score: +2,
                    explanation: "현재 VIX는 15~16 수준으로 주식시장의 단기 패닉은 진정된 상태입니다. VIX가 20~25를 돌파하며 금융 불안이 고조될 때 금 수요가 급증합니다.",
                    goldCorrelation: "시장 위기 시 강력한 정(+)의 반응",
                    benchmark: "20 이상 시 위기 고조 매수 신호, 15 미만 평온",
                    autoFetch: true,
                    asOfDate: "2026-11-27",
                    sourceUrl: "https://fred.stlouisfed.org/series/VIXCLS"
                },
                {
                    id: "geopolitical_risk",
                    name: "지정학 리스크 지수 (GPR Index)",
                    code: "Caldara & Iacoviello GPR",
                    currentValue: 168,
                    unit: "pt",
                    prevValue: 155,
                    change: +13,
                    trend: "up",
                    impact: "bullish",
                    score: +2,
                    explanation: "중동 정세 긴장, 우크라이나 종전 협상 및 신냉전 구도, 미·중 기술 무역 분쟁, 각국의 보호무역 강화 등으로 지정학적 프리미엄이 사상 최고 수준을 유지하고 있습니다.",
                    goldCorrelation: "위기 발발 시 급등 후 고공행진",
                    benchmark: "130pt 상회 시 안전자산 프리미엄 지속 유지",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "연준 연구진 공식 GPR 사이트에서 월 1회 갱신",
                    asOfDate: "2026-10",
                    sourceUrl: "https://www.matteoiacoviello.com/gpr.htm"
                },
                {
                    id: "stock_bond_corr",
                    name: "주식·채권과의 상관관계 및 분산 효과",
                    code: "Portfolio Diversification Metric",
                    currentValue: 0.12,
                    unit: "상관계수",
                    prevValue: 0.08,
                    change: +0.04,
                    trend: "flat",
                    impact: "bullish",
                    score: +1,
                    explanation: "S&P 500과의 장기 상관관계가 0.1 내외로 매우 낮아, 주식 포트폴리오에 10~20% 금을 편입할 경우 샤프지수(위험대비수익률)를 대폭 개선합니다.",
                    goldCorrelation: "비상관 자산으로서 독보적",
                    benchmark: "인플레이션 및 스태그플레이션 시 주식/채권 동반 하락을 유일하게 방어",
                    autoFetch: false,
                    manualUpdate: true,
                    fetchNote: "분기별 3년 롤링 상관계수 모델 산출",
                    asOfDate: "2026-Q3",
                    sourceUrl: "https://www.gold.org"
                }
            ],
            history: {
                labels: ["24.01", "24.04", "24.08", "24.11", "25.04", "25.08", "25.12", "26.04", "26.08", "26.11"],
                vix: [13.5, 18.2, 38.5, 16.5, 17.8, 19.2, 16.0, 21.5, 17.2, 15.8],
                gpr: [135, 158, 142, 162, 175, 180, 165, 172, 160, 168]
            }
        },

        relativeValuation: {
            id: "relativeValuation",
            name: "7. 상대 가치 지표",
            importance: "밸류에이션 및 과열/저평가 판단 (★★★)",
            defaultWeight: 0, // 보조 참고 지표 (종합 점수에 필터 역할)
            description: "금 가격 자체의 절대 레벨뿐만 아니라 은, 구리, 주식, M2 통화량 대비 상대적 고평가/저평가 위치를 측정합니다.",
            coreLogic: "금/은 비율이 80 이상이면 은 대비 금이 상대적 고평가(또는 안전자산 극단적 선호) 상태이며, M2 대비 금 비율은 장기 통화가치 희석에 비하면 여전히 추가 상승 여력이 있음을 보여줍니다.",
            indicators: [
                {
                    id: "gold_silver_ratio",
                    name: "금/은 비율 (Gold-Silver Ratio)",
                    code: "XAU/XAG Ratio (실시간 자동 계산)",
                    currentValue: 83.3,
                    unit: "배",
                    prevValue: 86.2,
                    change: -1.7,
                    trend: "down",
                    impact: "neutral",
                    score: 0,
                    explanation: "금 1온스로 은 몇 온스를 살 수 있는지 나타냅니다. 80 이상은 역사적 상단으로 금이 은 대비 매우 고평가되어 있거나 안전자산 선호가 극에 달해 있음을 뜻합니다.",
                    goldCorrelation: "경기 침체기 상승, 경기 확장기 하락",
                    benchmark: "80 이상: 안전자산 프리미엄 극대화 / 60 이하: 금 저평가",
                    autoFetch: true,
                    asOfDate: "2026-11-27",
                    sourceUrl: "https://api.gold-api.com"
                },
                {
                    id: "gold_copper_ratio",
                    name: "금/구리 비율 (Gold-Copper Ratio)",
                    code: "Gold / Doctor Copper (HG=F 선물)",
                    currentValue: 644.7,
                    unit: "배",
                    prevValue: 610,
                    change: +15,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "경기 민감재인 구리 대비 안전자산인 금의 상대가격입니다. 이 비율의 상승은 글로벌 제조업 경기 둔화와 안전자산으로의 자금 쏠림을 방증합니다.",
                    goldCorrelation: "경기 둔화기 급등",
                    benchmark: "비율 상승 = 채권 금리 하락 및 금 강세장과 동행",
                    autoFetch: true,
                    asOfDate: "2026-11-27",
                    sourceUrl: "https://finance.yahoo.com/quote/HG=F"
                },
                {
                    id: "gold_sp500_ratio",
                    name: "금 대비 S&P 500 비율 (Gold / S&P 500)",
                    code: "Gold / SPX (^GSPC 자동 계산)",
                    currentValue: 0.5099,
                    unit: "배",
                    prevValue: 0.43,
                    change: +0.02,
                    trend: "up",
                    impact: "neutral",
                    score: 0,
                    explanation: "1980년(1.5배)이나 2011년(0.8배)의 역사적 버블 고점에 비하면 현재 금은 주식시장 대비 여전히 합리적인 가치평가 영역에 머물러 있습니다.",
                    goldCorrelation: "자산 간 자금 로테이션",
                    benchmark: "0.8 이상 버블 경계, 0.5 미만 균형",
                    autoFetch: true,
                    asOfDate: "2026-11-27",
                    sourceUrl: "https://finance.yahoo.com/quote/%5EGSPC"
                },
                {
                    id: "gold_m2_ratio",
                    name: "미국 M2 통화량 대비 금 가격",
                    code: "Gold Price / M2SL (FRED)",
                    currentValue: "0.127",
                    unit: "비율",
                    prevValue: "0.122",
                    change: +0.005,
                    trend: "up",
                    impact: "bullish",
                    score: +1,
                    explanation: "코로나 이후 풀린 막대한 달러 M2 통화 공급량 대비 금 가격은 1980년대나 2011년에 비해 여전히 저평가 상태로, 장기 화폐가치 희석에 비하면 추가 상승 여력이 충분합니다.",
                    goldCorrelation: "장기 비례 관계",
                    benchmark: "통화량 증가 = 금의 장기적 우상향 뒷받침",
                    autoFetch: true,
                    asOfDate: "2026-11",
                    sourceUrl: "https://fred.stlouisfed.org/series/M2SL"
                }
            ],
            history: {
                labels: ["2015", "2017", "2019", "2020", "2022", "2024", "2025", "2026"],
                goldSilver: [75, 78, 85, 115, 88, 86, 83, 84.5],
                goldCopper: [450, 420, 500, 680, 520, 580, 610, 625]
            }
        }
    },

    // 8. 실전 팁 및 주요 경제지표 발표 캘린더
    practicalTips: {
        priorities: [
            { rank: 1, name: "실질 금리 (가장 중요)", weight: "30%", desc: "미국 10년물 TIPS 금리의 방향성이 금 시세의 70% 이상을 좌우합니다. TIPS가 꺾일 때가 최고의 매수 기회입니다." },
            { rank: 2, name: "달러 인덱스 (DXY) & 원/달러", weight: "20%", desc: "달러 약세는 금 수요를 끌어올리고, 국내 투자자는 원화 환율 상승 시 이중 레버리지 수익을 얻습니다." },
            { rank: 3, name: "중앙은행 순매입 (WGC)", weight: "20%", desc: "각국 중앙은행은 가격을 따지지 않고 구조적으로 매입하므로 강력한 하방 바닥을 깔아줍니다." },
            { rank: 4, name: "지정학 & 금융불안 심리", weight: "15%", desc: "단기 급등을 유발하는 트리거이지만 평화 무드 시 되돌림이 있을 수 있으니 추격 매수는 주의해야 합니다." },
            { rank: 5, name: "경기침체(금리차) & 인플레", weight: "15%", desc: "장단기 금리차 정상화 이후 침체 국면 진입 시 금은 최고의 헤지 수단으로 작동합니다." }
        ],
        calendar: [
            { name: "미국 FOMC 금리결정 & 기자회견", date: "2026-12-10", impact: "극도로 높음", note: "기준금리 인하 폭 및 점도표 수정 확인", dDay: 16 },
            { name: "미국 11월 비농업 고용보고서 (NFP)", date: "2026-12-05", impact: "매우 높음", note: "고용 둔화 시 금리 인하 기대 확대", dDay: 11 },
            { name: "미국 11월 소비자물가지수 (CPI)", date: "2026-12-11", impact: "매우 높음", note: "인플레 반등 여부 및 실질금리 영향", dDay: 17 },
            { name: "WGC 글로벌 금 수요 트렌드 4분기 보고서", date: "2027-01-28", impact: "높음", note: "중앙은행 연간 순매입 최종 집계", dDay: 65 },
            { name: "미국 11월 생산자물가지수 (PPI)", date: "2026-12-12", impact: "보통", note: "도매물가 선행 파악", dDay: 18 }
        ],
        dataSources: [
            { name: "FRED (세인트루이스 연준)", url: "https://fred.stlouisfed.org", target: "10년 TIPS(DFII10), 10년국채(DGS10), BEI(T10YIE), 장단기금리차(T10Y2Y), CPI, M2" },
            { name: "World Gold Council (WGC)", url: "https://www.gold.org", target: "중앙은행 분기 매입량, 글로벌 ETF 톤수, 분기 수요 트렌드(Gold Demand Trends)" },
            { name: "CFTC (미국 상품선물거래위원회)", url: "https://www.cftc.gov", target: "COMEX 금 선물 COT 리포트 (투기적 순매수 포지션)" },
            { name: "TradingView / Yahoo Finance", url: "https://kr.tradingview.com", target: "실시간 금(XAUUSD), 은(XAGUSD), 구리(HG1!), DXY, USDKRW, VIX 차트" },
            { name: "KRX 금시장 / 관세청", url: "https://open.krx.co.kr", target: "국내 금 1g당 거래가격, 한국 세관 수출입 통계" }
        ]
    }
};

// 브라우저 및 Node 환경 지원
if (typeof window !== 'undefined') {
    window.GOLD_DATA = GOLD_DATA;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GOLD_DATA;
}

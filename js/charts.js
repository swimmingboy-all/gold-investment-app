/**
 * charts.js
 * Chart.js 기반 데이터 시각화 관리 모듈
 */

const GoldCharts = {
    instances: {},

    // 차트 공통 다크/골드 테마 옵션
    theme: {
        goldColor: '#fbbf24',
        goldGlow: 'rgba(251, 191, 36, 0.25)',
        cyanColor: '#06b6d4',
        roseColor: '#f43f5e',
        emeraldColor: '#10b981',
        purpleColor: '#a855f7',
        gridColor: 'rgba(255, 255, 255, 0.08)',
        textColor: '#94a3b8',
        textHighlight: '#f1f5f9'
    },

    /**
     * 레이더 차트 (카테고리별 스코어 분포)
     */
    initRadarChart(canvasId, categoryScores) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;

        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
        }

        const labels = Object.values(categoryScores).map(c => c.name.split('.')[1] || c.name);
        const scores = Object.values(categoryScores).map(c => Math.max(-100, Math.min(100, c.score)));

        this.instances[canvasId] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: [{
                    label: '지표별 금 호감도 점수 (-100 ~ +100)',
                    data: scores,
                    backgroundColor: 'rgba(251, 191, 36, 0.25)',
                    borderColor: '#f59e0b',
                    pointBackgroundColor: '#fbbf24',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#fbbf24',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        angleLines: { color: this.theme.gridColor },
                        grid: { color: this.theme.gridColor },
                        pointLabels: {
                            color: this.theme.textHighlight,
                            font: { size: 11, family: 'Pretendard, -apple-system, sans-serif' }
                        },
                        ticks: {
                            color: this.theme.textColor,
                            backdropColor: 'transparent',
                            stepSize: 50
                        },
                        min: -100,
                        max: 100
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: this.theme.textColor, font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` 점수: ${ctx.raw}점 (${ctx.raw > 0 ? '상승 지지' : (ctx.raw < 0 ? '하방 압력' : '중립')})`
                        }
                    }
                }
            }
        });
    },

    /**
     * 10년 TIPS 실질금리 vs 국제 금 가격 (듀얼 축 차트)
     */
    initRealRateChart(canvasId) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) this.instances[canvasId].destroy();

        const history = GOLD_DATA.categories.realRate.history;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: '국제 금 가격 (XAU/USD $)',
                        data: history.gold,
                        borderColor: '#fbbf24',
                        backgroundColor: 'rgba(251, 191, 36, 0.1)',
                        fill: true,
                        yAxisID: 'yGold',
                        tension: 0.35,
                        borderWidth: 3,
                        pointRadius: 4
                    },
                    {
                        label: '미국 10년 TIPS 실질금리 (%) [역축]',
                        data: history.tips,
                        borderColor: '#38bdf8',
                        borderDash: [5, 5],
                        yAxisID: 'yTips',
                        tension: 0.35,
                        borderWidth: 2,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { color: this.theme.gridColor }, ticks: { color: this.theme.textColor } },
                    yGold: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: this.theme.gridColor },
                        ticks: { color: '#fbbf24', callback: v => '$' + v.toLocaleString() },
                        title: { display: true, text: '금 가격 ($/oz)', color: '#fbbf24' }
                    },
                    yTips: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        reverse: true, // 역축: TIPS 금리가 내려갈수록 위로 올라가 금과 동행하도록 시각화
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#38bdf8', callback: v => v + '%' },
                        title: { display: true, text: '10Y TIPS 실질금리 (역방향)', color: '#38bdf8' }
                    }
                },
                plugins: {
                    legend: { labels: { color: this.theme.textColor } },
                    tooltip: {
                        callbacks: {
                            afterBody: () => '💡 실질금리(TIPS) 하락 시 금 가격은 강력하게 상승하는 역의 상관관계를 보여줍니다.'
                        }
                    }
                }
            }
        });
    },

    /**
     * 달러 인덱스 (DXY) vs 원/달러 환율
     */
    initDollarChart(canvasId) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) this.instances[canvasId].destroy();

        const history = GOLD_DATA.categories.dollar.history;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: '달러 인덱스 (DXY)',
                        data: history.dxy,
                        borderColor: '#a855f7',
                        yAxisID: 'yDxy',
                        tension: 0.3,
                        borderWidth: 2
                    },
                    {
                        label: '원/달러 환율 (KRW)',
                        data: history.usdkrw,
                        borderColor: '#34d399',
                        yAxisID: 'yKrw',
                        tension: 0.3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { grid: { color: this.theme.gridColor }, ticks: { color: this.theme.textColor } },
                    yDxy: {
                        position: 'left',
                        grid: { color: this.theme.gridColor },
                        ticks: { color: '#a855f7' },
                        title: { display: true, text: 'DXY', color: '#a855f7' }
                    },
                    yKrw: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#34d399' },
                        title: { display: true, text: 'USD/KRW', color: '#34d399' }
                    }
                },
                plugins: { legend: { labels: { color: this.theme.textColor } } }
            }
        });
    },

    /**
     * 중앙은행 순매입 및 글로벌 ETF 자금 흐름 바 차트
     */
    initSupplyChart(canvasId) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) this.instances[canvasId].destroy();

        const history = GOLD_DATA.categories.supplyDemand.history;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: '중앙은행 연간 순매입량 (톤)',
                        data: history.centralBanks,
                        backgroundColor: 'rgba(251, 191, 36, 0.7)',
                        borderColor: '#fbbf24',
                        borderWidth: 1,
                        yAxisID: 'yCb'
                    },
                    {
                        type: 'line',
                        label: '글로벌 ETF 연간 자금 유출입 (톤)',
                        data: history.etfFlows,
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.2)',
                        borderWidth: 3,
                        yAxisID: 'yEtf',
                        pointRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: this.theme.gridColor }, ticks: { color: this.theme.textColor } },
                    yCb: {
                        position: 'left',
                        grid: { color: this.theme.gridColor },
                        ticks: { color: '#fbbf24' },
                        title: { display: true, text: '중앙은행 매입 (톤)', color: '#fbbf24' },
                        min: 0
                    },
                    yEtf: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#06b6d4' },
                        title: { display: true, text: 'ETF 유출입 (톤)', color: '#06b6d4' }
                    }
                },
                plugins: {
                    legend: { labels: { color: this.theme.textColor } }
                }
            }
        });
    },

    /**
     * 장단기 금리차 (10Y-2Y) 추이 및 경기침체 신호
     */
    initYieldCurveChart(canvasId) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) this.instances[canvasId].destroy();

        const history = GOLD_DATA.categories.macroLabor.history;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: '10Y - 2Y 국채 스프레드 (%p)',
                        data: history.spread10y2y,
                        borderColor: '#f43f5e',
                        backgroundColor: (context) => {
                            const val = context.raw;
                            return val < 0 ? 'rgba(244, 63, 94, 0.2)' : 'rgba(16, 185, 129, 0.2)';
                        },
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: this.theme.gridColor }, ticks: { color: this.theme.textColor } },
                    y: {
                        grid: { color: this.theme.gridColor },
                        ticks: { color: this.theme.textColor },
                        title: { display: true, text: '스프레드 (%p)', color: this.theme.textColor }
                    }
                },
                plugins: {
                    legend: { labels: { color: this.theme.textColor } },
                    tooltip: {
                        callbacks: {
                            afterBody: () => '💡 스프레드가 마이너스(역전)에서 플러스로 회복될 때 경기 침체 위험과 금 가격 상승 압력이 최고조에 달합니다.'
                        }
                    }
                }
            }
        });
    },

    /**
     * 상대 가치: 금/은 비율 및 금/구리 비율
     */
    initRelativeChart(canvasId) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) this.instances[canvasId].destroy();

        const history = GOLD_DATA.categories.relativeValuation.history;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: '금/은 비율 (Gold-Silver Ratio)',
                        data: history.goldSilver,
                        borderColor: '#fbbf24',
                        tension: 0.3,
                        borderWidth: 2,
                        yAxisID: 'yGs'
                    },
                    {
                        label: '금/구리 비율 (Gold-Copper Ratio)',
                        data: history.goldCopper,
                        borderColor: '#f97316',
                        tension: 0.3,
                        borderWidth: 2,
                        yAxisID: 'yGc'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: this.theme.gridColor }, ticks: { color: this.theme.textColor } },
                    yGs: {
                        position: 'left',
                        grid: { color: this.theme.gridColor },
                        ticks: { color: '#fbbf24' },
                        title: { display: true, text: '금/은 비율 (배)', color: '#fbbf24' }
                    },
                    yGc: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#f97316' },
                        title: { display: true, text: '금/구리 비율 (배)', color: '#f97316' }
                    }
                },
                plugins: { legend: { labels: { color: this.theme.textColor } } }
            }
        });
    /**
     * 인플레이션: CPI vs Core PCE 시계열 차트
     */
    initInflationChart(canvasId) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) this.instances[canvasId].destroy();

        const history = GOLD_DATA.categories.inflation.history;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: '미국 소비자물가지수 (CPI YoY %)',
                        data: history.cpi,
                        borderColor: '#f97316',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2
                    },
                    {
                        label: '미국 근원 PCE 물가지수 (Core PCE %)',
                        data: history.corePce,
                        borderColor: '#fbbf24',
                        borderDash: [5, 5],
                        tension: 0.3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: this.theme.gridColor }, ticks: { color: this.theme.textColor } },
                    y: {
                        grid: { color: this.theme.gridColor },
                        ticks: { color: this.theme.textColor, callback: v => v + '%' },
                        title: { display: true, text: '물가 상승률 (%)', color: this.theme.textColor }
                    }
                },
                plugins: { legend: { labels: { color: this.theme.textColor } } }
            }
        });
    },

    /**
     * 위험 및 시장 심리: VIX vs 지정학 리스크 GPR 차트
     */
    initRiskChart(canvasId) {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById(canvasId);
        if (!ctx) return;
        if (this.instances[canvasId]) this.instances[canvasId].destroy();

        const history = GOLD_DATA.categories.riskSentiment.history;

        this.instances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: history.labels,
                datasets: [
                    {
                        label: 'CBOE VIX 지수',
                        data: history.vix,
                        borderColor: '#ef4444',
                        yAxisID: 'yVix',
                        tension: 0.3,
                        borderWidth: 2
                    },
                    {
                        label: '지정학 리스크 지수 (GPR)',
                        data: history.gpr,
                        borderColor: '#eab308',
                        yAxisID: 'yGpr',
                        tension: 0.3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { color: this.theme.gridColor }, ticks: { color: this.theme.textColor } },
                    yVix: {
                        position: 'left',
                        grid: { color: this.theme.gridColor },
                        ticks: { color: '#ef4444' },
                        title: { display: true, text: 'VIX (pt)', color: '#ef4444' }
                    },
                    yGpr: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#eab308' },
                        title: { display: true, text: 'GPR Index', color: '#eab308' }
                    }
                },
                plugins: { legend: { labels: { color: this.theme.textColor } } }
            }
        });
    },

    /**
     * 카테고리별 차트 동적 생성 및 리사이즈
     */
    renderChartByCategory(categoryKey) {
        const canvasId = `chart-${categoryKey}`;
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        switch (categoryKey) {
            case 'realRate':
                this.initRealRateChart(canvasId);
                break;
            case 'dollar':
                this.initDollarChart(canvasId);
                break;
            case 'supplyDemand':
                this.initSupplyChart(canvasId);
                break;
            case 'inflation':
                this.initInflationChart(canvasId);
                break;
            case 'macroLabor':
                this.initYieldCurveChart(canvasId);
                break;
            case 'riskSentiment':
                this.initRiskChart(canvasId);
                break;
            case 'relativeValuation':
                this.initRelativeChart(canvasId);
                break;
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoldCharts;
}

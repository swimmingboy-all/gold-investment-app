/**
 * app.js
 * 메인 애플리케이션 컨트롤러
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// 안전한 DOM 텍스트 설정 헬퍼
function setSafeText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
function setSafeHtml(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

const App = {
    currentTab: 'summary',
    currentPreset: 'balanced',
    currentWeights: null,
    overrideValues: {},

    init() {
        // 로컬스토리지에 저장된 최근 동기화 시세가 있으면 먼저 복원
        const api = window.GoldApiService || (typeof GoldApiService !== 'undefined' ? GoldApiService : null);
        if (api && api.loadFromLocalStorage) {
            api.loadFromLocalStorage();
        }

        this.currentWeights = { ...GoldScoringEngine.presets.balanced.weights };
        this.syncSimulatorSliders();
        this.bindEvents();
        this.renderAll();
        // Lucide icons 렌더링
        if (window.lucide) {
            lucide.createIcons();
        }
    },

    /**
     * What-If 시뮬레이터 슬라이더를 수집된 실제 기준 데이터(GOLD_DATA)와 일치시킴
     */
    syncSimulatorSliders() {
        const meta = GOLD_DATA.meta;
        const tipsSlider = document.getElementById('sim-tips');
        const dxySlider = document.getElementById('sim-dxy');
        const usdkrwSlider = document.getElementById('sim-usdkrw');
        const cbSlider = document.getElementById('sim-cb');

        // 1. 실시간 10Y TIPS 실질금리 동기화
        const currentTips = (meta && meta.us10yTips !== undefined) ? meta.us10yTips : 2.05;
        if (tipsSlider) {
            tipsSlider.value = currentTips;
            setSafeText('sim-tips-val', currentTips.toFixed(2) + '%');
        }

        // 2. DXY 달러 인덱스 동기화
        const currentDxy = (meta && meta.dxy !== undefined) ? meta.dxy : 104.2;
        if (dxySlider) {
            dxySlider.value = currentDxy;
            setSafeText('sim-dxy-val', currentDxy.toFixed(1));
        }

        // 3. 원/달러 환율 동기화
        const currentUsdkrw = (meta && meta.usdkrw !== undefined) ? Math.round(meta.usdkrw) : 1388;
        if (usdkrwSlider) {
            usdkrwSlider.value = currentUsdkrw;
            setSafeText('sim-usdkrw-val', currentUsdkrw.toLocaleString() + '원');
        }

        // 4. 중앙은행 순매입량 동기화
        const cbInd = GOLD_DATA.categories?.supplyDemand?.indicators?.find(i => i.id === 'central_bank_net_buys');
        const currentCb = cbInd ? cbInd.currentValue : 290;
        if (cbSlider) {
            cbSlider.value = currentCb;
            setSafeText('sim-cb-val', currentCb + '톤');
        }
    },

    bindEvents() {
        // 실시간 시세 동기화 버튼 이벤트
        const syncBtn = document.getElementById('sync-live-data-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                this.triggerLiveSync(true);
            });
        }

        // 탭 전환 이벤트
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.currentTarget.dataset.tab;
                this.switchTab(targetTab);
            });
        });

        // 가중치 프리셋 버튼 이벤트
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const presetKey = e.currentTarget.dataset.preset;
                this.applyPreset(presetKey);
            });
        });

        // What-If 시뮬레이터 슬라이더 이벤트
        const tipsSlider = document.getElementById('sim-tips');
        if (tipsSlider) {
            tipsSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                setSafeText('sim-tips-val', val.toFixed(2) + '%');
                this.overrideValues['us10y_tips'] = val;
                this.renderScoreAndSignal();
            });
        }

        const dxySlider = document.getElementById('sim-dxy');
        if (dxySlider) {
            dxySlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                setSafeText('sim-dxy-val', val.toFixed(1));
                this.overrideValues['dxy'] = val;
                this.renderScoreAndSignal();
            });
        }

        const usdkrwSlider = document.getElementById('sim-usdkrw');
        if (usdkrwSlider) {
            usdkrwSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                setSafeText('sim-usdkrw-val', val.toLocaleString() + '원');
                this.overrideValues['usdkrw'] = val;
                this.renderScoreAndSignal();
            });
        }

        const cbSlider = document.getElementById('sim-cb');
        if (cbSlider) {
            cbSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                setSafeText('sim-cb-val', val + '톤');
                this.overrideValues['central_bank_net_buys'] = val;
                this.renderScoreAndSignal();
            });
        }

        // 시뮬레이터 초기화 버튼
        const resetSimBtn = document.getElementById('reset-sim-btn');
        if (resetSimBtn) {
            resetSimBtn.addEventListener('click', () => {
                this.overrideValues = {};
                this.syncSimulatorSliders();
                this.renderScoreAndSignal();
            });
        }

        // 투자 메모 로컬 저장
        const notesArea = document.getElementById('user-investment-notes');
        if (notesArea) {
            notesArea.value = localStorage.getItem('gold_app_notes') || '';
            notesArea.addEventListener('input', (e) => {
                localStorage.setItem('gold_app_notes', e.target.value);
            });
        }

        // 인쇄 및 보고서 다운로드 버튼
        const printBtn = document.getElementById('print-report-btn');
        if (printBtn) {
            printBtn.addEventListener('click', () => {
                window.print();
            });
        }
    },

    renderAll() {
        try { this.renderTicker(); } catch (e) { console.error('renderTicker error:', e); }
        try { this.renderScoreAndSignal(); } catch (e) { console.error('renderScoreAndSignal error:', e); }
        try { this.renderSummaryMatrix(); } catch (e) { console.error('renderSummaryMatrix error:', e); }
        try { this.renderCategoryCards(); } catch (e) { console.error('renderCategoryCards error:', e); }
        try { this.renderCalendarAndTips(); } catch (e) { console.error('renderCalendarAndTips error:', e); }
    },

    renderTicker() {
        const meta = GOLD_DATA.meta;
        setSafeText('ticker-gold-usd', `$${meta.goldUSD.toLocaleString()}`);
        setSafeText('ticker-gold-krw-g', `${meta.goldKRW_g.toLocaleString()}원`);
        setSafeText('ticker-gold-krw-don', `${meta.goldKRW_don.toLocaleString()}원`);
        setSafeText('ticker-usdkrw', `${meta.usdkrw.toLocaleString()}원`);
        setSafeText('ticker-dxy', meta.dxy.toFixed(2));
        setSafeText('ticker-us10y', `${meta.us10y}%`);
        setSafeText('ticker-tips', `${meta.us10yTips}%`);
        setSafeText('header-last-updated', meta.updatedAt);
        setSafeText('ticker-updated-at', meta.updatedAt);
    },

    renderScoreAndSignal() {
        const result = GoldScoringEngine.calculateScore(this.currentWeights, this.overrideValues);
        const { finalScore, signal, categoryScores, bullishDrivers, bearishRisks, actionPlan } = result;

        // 점수 및 신호 텍스트
        const scoreEl = document.getElementById('final-score-display');
        if (scoreEl) {
            scoreEl.textContent = (finalScore > 0 ? '+' : '') + finalScore;
            scoreEl.className = `text-5xl font-black ${finalScore >= 20 ? 'text-emerald-400' : (finalScore <= -20 ? 'text-rose-400' : 'text-amber-400')}`;
        }

        const signalBadge = document.getElementById('signal-badge');
        if (signalBadge) {
            signalBadge.className = `inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border ${signal.badgeClass}`;
            signalBadge.innerHTML = `<i data-lucide="${signal.icon}" class="w-4 h-4"></i> ${signal.korean}`;
        }

        setSafeText('signal-summary', signal.summary);
        setSafeText('signal-recommendation', signal.recommendation);

        // 게이지 바늘 회전 (-100 -> -90deg, 0 -> 0deg, +100 -> +90deg)
        const needle = document.getElementById('gauge-needle');
        if (needle) {
            const deg = (finalScore / 100) * 90;
            needle.style.transform = `rotate(${deg}deg)`;
        }

        // 핵심 호재 드라이버 렌더링
        const bullishList = document.getElementById('bullish-drivers-list');
        if (bullishList) {
            bullishList.innerHTML = bullishDrivers.map(d => `
                <li class="flex items-start gap-2.5 text-xs text-slate-300">
                    <span class="inline-flex items-center justify-center w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5 font-bold">+</span>
                    <div>
                        <strong class="text-white">${d.name}</strong> (${d.currentValue}${d.unit})
                        <p class="text-slate-400 mt-0.5">${d.explanation}</p>
                    </div>
                </li>
            `).join('');
        }

        // 핵심 리스크 요인 렌더링
        const bearishList = document.getElementById('bearish-risks-list');
        if (bearishList) {
            if (bearishRisks.length > 0) {
                bearishList.innerHTML = bearishRisks.map(d => `
                    <li class="flex items-start gap-2.5 text-xs text-slate-300">
                        <span class="inline-flex items-center justify-center w-4 h-4 rounded bg-rose-500/20 text-rose-400 shrink-0 mt-0.5 font-bold">-</span>
                        <div>
                            <strong class="text-white">${d.name}</strong> (${d.currentValue}${d.unit})
                            <p class="text-slate-400 mt-0.5">${d.explanation}</p>
                        </div>
                    </li>
                `).join('');
            } else {
                bearishList.innerHTML = `<li class="text-xs text-slate-400">현재 단기 급등에 따른 차익실현 매물 외에 중대한 거시적 악재는 제한적입니다.</li>`;
            }
        }

        // 전략 액션 플랜
        setSafeText('target-allocation-text', actionPlan.targetAllocation);
        setSafeHtml('domestic-strategy-text', actionPlan.domesticStrategy);
        setSafeText('timing-advice-text', actionPlan.timingAdvice);

        // 레이더 차트 갱신
        GoldCharts.initRadarChart('radar-chart-canvas', categoryScores);

        // 전체 요약 매트릭스 카드 갱신
        try { this.renderSummaryMatrix(); } catch (e) { console.error('renderSummaryMatrix error:', e); }

        // 아이콘 리프레시
        if (window.lucide) lucide.createIcons();
    },

    /**
     * 메인 대시보드 8대 핵심 카테고리 요약 매트릭스 카드 동적 렌더링
     */
    renderSummaryMatrix() {
        const grid = document.getElementById('summary-matrix-grid');
        if (!grid) return;

        const meta = GOLD_DATA.meta;
        const scoring = GoldScoringEngine.calculateScore(this.currentWeights, this.overrideValues);
        const catScores = scoring.categoryScores;

        // 8대 핵심 카드 데이터 정의 (실제 수집 데이터 기반 동적 생성)
        const currentTips = this.overrideValues['us10y_tips'] !== undefined ? this.overrideValues['us10y_tips'] : (meta.us10yTips || 2.05);
        const currentDxy = this.overrideValues['dxy'] !== undefined ? this.overrideValues['dxy'] : (meta.dxy || 104.2);
        const currentUsdkrw = this.overrideValues['usdkrw'] !== undefined ? this.overrideValues['usdkrw'] : (meta.usdkrw || 1388);
        const currentCb = this.overrideValues['central_bank_net_buys'] !== undefined ? this.overrideValues['central_bank_net_buys'] : 290;

        const cardsData = [
            {
                tab: 'realRate',
                title: '1. 실질 금리',
                score: catScores.realRate ? catScores.realRate.score : 0,
                headline: `10Y TIPS ${currentTips.toFixed(2)}%`,
                desc: currentTips <= 2.0 
                    ? '2.0% 이하로 금 보유 기회비용 완화. 역사상 가장 강력한 금 강세 동력.' 
                    : '2.0% 기준선 부근 위치. 중립 흐름이나 2.0% 하회 시 강력한 랠리 탄력.',
                accent: 'text-amber-400'
            },
            {
                tab: 'dollar',
                title: '2. 달러 & 환율',
                score: catScores.dollar ? catScores.dollar.score : 0,
                headline: `환율 ${Math.round(currentUsdkrw).toLocaleString()}원 / DXY ${currentDxy.toFixed(1)}`,
                desc: currentUsdkrw >= 1350 
                    ? '고환율 구간으로 국내 투자자는 원화 환산 환차익 프리미엄 수혜 지속.' 
                    : '환율 안정권 진입. 순수 국제 금 시세 모멘텀에 연동되는 구간.',
                accent: 'text-amber-400'
            },
            {
                tab: 'supplyDemand',
                title: '6. 실물 수급',
                score: catScores.supplyDemand ? catScores.supplyDemand.score : 0,
                headline: `중앙은행 ${currentCb}톤 / ETF 유입`,
                desc: '글로벌 중앙은행의 탈달러 외환보유액 다변화와 금 ETF 매수세로 탄탄한 하방 지지.',
                accent: 'text-amber-400'
            },
            {
                tab: 'inflation',
                title: '3. 인플레이션',
                score: catScores.inflation ? catScores.inflation.score : 0,
                headline: `10Y BEI 2.30% / CPI 2.6%`,
                desc: '기대인플레 2.3% 안착으로 장기 화폐가치 방어 헤지 수요 지속.',
                accent: 'text-amber-400'
            },
            {
                tab: 'macroLabor',
                title: '4. 경기 & 금리차',
                score: catScores.macroLabor ? catScores.macroLabor.score : 0,
                headline: `10Y-2Y 스프레드 +0.15%`,
                desc: '장단기 금리 역전 해소 후 경기 사이클 변화. 안전자산 선호 심리 부각.',
                accent: 'text-amber-400'
            },
            {
                tab: 'riskSentiment',
                title: '5. 위험 & 심리',
                score: catScores.riskSentiment ? catScores.riskSentiment.score : 0,
                headline: `VIX 15.2 / 지정학 리스크`,
                desc: '지정학 긴장 고조 및 글로벌 불확실성에 따른 안전자산 방어 매수세.',
                accent: 'text-amber-400'
            },
            {
                tab: 'relativeValuation',
                title: '7. 상대 가치',
                score: catScores.relativeValuation ? catScores.relativeValuation.score : 0,
                headline: `금/은 비율 ${(meta.goldUSD / 44.02).toFixed(1)}배`,
                desc: '금/은 비율 80배 이상 고평가 구간. 장기 보유 관점 분할 접근 유효.',
                accent: 'text-amber-400'
            },
            {
                tab: 'calendar',
                title: '8. 캘린더 & 팁',
                score: null,
                headline: `주요 이벤트 D-Day`,
                desc: 'FOMC 금리결정 및 미국 CPI 등 핵심 변곡점 발표 일정 모니터링.',
                accent: 'text-cyan-400'
            }
        ];

        grid.innerHTML = cardsData.map(c => {
            let badgeHtml = '';
            if (c.score !== null) {
                const isBullish = c.score > 15;
                const isBearish = c.score < -15;
                const badgeColor = isBullish 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                    : (isBearish ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-slate-700/60 text-slate-300 border-slate-600');
                const badgeSign = c.score > 0 ? `+${c.score}점` : (c.score === 0 ? '0점 중립' : `${c.score}점`);
                badgeHtml = `<span class="text-[10px] px-2 py-0.5 rounded-full border ${badgeColor} font-bold">${badgeSign}</span>`;
            } else {
                badgeHtml = `<span class="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold">캘린더</span>`;
            }

            return `
                <div class="glass-card p-4 rounded-xl border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/40 transition cursor-pointer flex flex-col justify-between group" onclick="App.switchTab('${c.tab}')">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold ${c.accent} group-hover:underline">${c.title}</span>
                            ${badgeHtml}
                        </div>
                        <div class="text-base font-black text-white mb-1.5 tracking-tight">${c.headline}</div>
                        <p class="text-[11px] text-slate-400 leading-relaxed">${c.desc}</p>
                    </div>
                    <div class="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-between">
                        <span>상세 지표 및 차트 보기</span>
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition"></i>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderCategoryCards() {
        const categories = GOLD_DATA.categories;
        const container = document.getElementById('category-views-container');
        if (!container) return;

        let html = '';

        for (const [catKey, catData] of Object.entries(categories)) {
            html += `
                <div class="category-section p-6 rounded-2xl glass-card mb-8" id="cat-section-${catKey}">
                    <div class="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-700/60 mb-6 gap-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-xl font-bold text-white">${catData.name}</h3>
                                <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold">${catData.importance}</span>
                            </div>
                            <p class="text-xs text-slate-400 mt-1">${catData.description}</p>
                        </div>
                        <div class="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-xs">
                            <span class="text-slate-400">핵심 평가 메커니즘: </span>
                            <span class="text-amber-300 font-medium">${catData.coreLogic}</span>
                        </div>
                    </div>

                    <!-- 지표 카드 그리드 -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        ${catData.indicators.map(ind => this.createIndicatorCardHtml(ind)).join('')}
                    </div>

                    <!-- 카테고리별 특화 차트 영역 -->
                    <div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <i data-lucide="line-chart" class="w-4 h-4 text-amber-400"></i> ${catData.name} 트렌드 및 상관 분석
                            </h4>
                        </div>
                        <div class="h-64 relative">
                            <canvas id="chart-${catKey}"></canvas>
                        </div>
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;

        // 아이콘 리프레시
        if (window.lucide) lucide.createIcons();
    },

    createIndicatorCardHtml(ind) {
        const isBullish = ind.score > 0;
        const isBearish = ind.score < 0;
        const badgeColor = isBullish ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : (isBearish ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-700/50 text-slate-300 border-slate-600');
        const badgeText = isBullish ? '금 상승 호재 (+)' : (isBearish ? '금 하방 압력 (-)' : '중립 (Neutral)');

        return `
            <div class="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/40 transition">
                <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                        <div>
                            <span class="text-[10px] text-amber-400/80 font-mono tracking-wider">${ind.code}</span>
                            <h5 class="text-sm font-bold text-white">${ind.name}</h5>
                        </div>
                        <span class="text-[11px] px-2 py-0.5 rounded-full border ${badgeColor} font-semibold shrink-0">
                            ${badgeText}
                        </span>
                    </div>

                    <div class="flex items-baseline gap-2 my-2">
                        <span class="text-2xl font-black text-amber-400">${ind.currentValue}</span>
                        <span class="text-xs text-slate-400">${ind.unit}</span>
                        <span class="text-xs ${ind.change >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-medium ml-auto">
                            ${ind.change >= 0 ? '▲ +' : '▼ '}${ind.change}
                        </span>
                    </div>

                    <p class="text-xs text-slate-300 leading-relaxed mb-3">${ind.explanation}</p>
                </div>

                <div class="pt-2 border-t border-slate-700/40 text-[11px] text-slate-400 flex flex-col gap-1">
                    <div><span class="text-slate-500">금 상관성:</span> <strong class="text-slate-300">${ind.goldCorrelation}</strong></div>
                    <div><span class="text-slate-500">판단 기준:</span> <span class="text-amber-300/80">${ind.benchmark}</span></div>
                    <div class="flex items-center justify-between mt-1 pt-1 border-t border-slate-700/30">
                        <span class="text-slate-500">기준일: <span class="text-slate-400 font-medium">${ind.asOfDate || '최근 공시'}</span></span>
                        ${ind.sourceUrl ? `<a href="${ind.sourceUrl}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 transition">출처 <i data-lucide="external-link" class="w-3 h-3 inline-block"></i></a>` : ''}
                    </div>
                </div>
            </div>
        `;
    },

    renderCalendarAndTips() {
        const tips = GOLD_DATA.practicalTips;

        // 캘린더 렌더링
        const calContainer = document.getElementById('economic-calendar-list');
        if (calContainer) {
            calContainer.innerHTML = tips.calendar.map(item => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-amber-500/30 transition">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-amber-400 font-bold shrink-0">
                            <span class="text-[9px] uppercase font-mono tracking-tighter">D-Day</span>
                            <span class="text-sm leading-none">D-${item.dDay}</span>
                        </div>
                        <div>
                            <h5 class="text-sm font-semibold text-white">${item.name}</h5>
                            <p class="text-xs text-slate-400">${item.date} • ${item.note}</p>
                        </div>
                    </div>
                    <span class="text-[11px] px-2.5 py-1 rounded-full ${item.impact.includes('높음') ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-700 text-slate-300'} font-medium shrink-0">
                        중요도: ${item.impact}
                    </span>
                </div>
            `).join('');
        }

        // 우선순위 팁 렌더링
        const prioContainer = document.getElementById('priority-tips-list');
        if (prioContainer) {
            prioContainer.innerHTML = tips.priorities.map(p => `
                <div class="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3">
                    <div class="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border border-amber-500/30">
                        ${p.rank}
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <strong class="text-sm text-white">${p.name}</strong>
                            <span class="text-xs text-amber-400 font-semibold">(가중치 ${p.weight})</span>
                        </div>
                        <p class="text-xs text-slate-300 mt-1">${p.desc}</p>
                    </div>
                </div>
            `).join('');
        }

        // 데이터 소스 렌더링
        const sourcesContainer = document.getElementById('data-sources-list');
        if (sourcesContainer) {
            sourcesContainer.innerHTML = tips.dataSources.map(s => `
                <div class="p-3 rounded-xl bg-slate-800/30 border border-slate-700/40 text-xs">
                    <div class="flex items-center justify-between mb-1">
                        <strong class="text-amber-400">${s.name}</strong>
                        <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]">
                            바로가기 <i data-lucide="external-link" class="w-3 h-3"></i>
                        </a>
                    </div>
                    <p class="text-slate-400">${s.target}</p>
                </div>
            `).join('');
        }
    },

    switchTab(tabId) {
        this.currentTab = tabId;

        // 탭 버튼 스타일 갱신
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.className = 'tab-btn active px-4 py-2 rounded-xl text-xs font-bold border border-amber-500 text-amber-400 bg-amber-500/15 transition flex items-center gap-1.5 shrink-0 shadow-sm';
            } else {
                btn.className = 'tab-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white border border-transparent transition flex items-center gap-1.5 shrink-0';
            }
        });

        // 탭 컨텐츠 표시/숨김
        const summaryView = document.getElementById('view-summary');
        const categoriesView = document.getElementById('view-categories');
        const calendarView = document.getElementById('view-calendar');

        if (tabId === 'summary') {
            summaryView.classList.remove('hidden');
            categoriesView.classList.add('hidden');
            calendarView.classList.add('hidden');

            // 요약 화면 레이더 차트 갱신
            const result = GoldScoringEngine.calculateScore(this.currentWeights, this.overrideValues);
            GoldCharts.initRadarChart('radar-chart-canvas', result.categoryScores);
        } else if (tabId === 'calendar') {
            summaryView.classList.add('hidden');
            categoriesView.classList.add('hidden');
            calendarView.classList.remove('hidden');
        } else {
            // 특정 카테고리 탭 선택 시: 해당 카테고리 섹션만 선명하게 단독 표시!
            summaryView.classList.add('hidden');
            calendarView.classList.add('hidden');
            categoriesView.classList.remove('hidden');

            const allSections = document.querySelectorAll('.category-section');
            allSections.forEach(sec => {
                if (sec.id === `cat-section-${tabId}`) {
                    sec.style.display = 'block';
                } else {
                    sec.style.display = 'none';
                }
            });

            // 해당 카테고리 차트 및 아이콘 즉시 렌더링 (display: block 상태에서 그려지므로 100% 정상 출력)
            setTimeout(() => {
                GoldCharts.renderChartByCategory(tabId);
                if (window.lucide) lucide.createIcons();
            }, 60);

            // 최상단으로 부드럽게 스크롤
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (window.lucide) lucide.createIcons();
    },

    applyPreset(presetKey) {
        const preset = GoldScoringEngine.presets[presetKey];
        if (!preset) return;

        this.currentPreset = presetKey;
        this.currentWeights = { ...preset.weights };

        // 버튼 활성화 스타일
        document.querySelectorAll('.preset-btn').forEach(btn => {
            if (btn.dataset.preset === presetKey) {
                btn.className = 'preset-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 shadow-md transition';
            } else {
                btn.className = 'preset-btn px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 bg-slate-800 hover:text-white border border-slate-700 transition';
            }
        });

        setSafeText('active-preset-desc', `${preset.name}: ${preset.description}`);
        this.renderScoreAndSignal();
    },

    async triggerLiveSync(showFeedback = true) {
        const syncBtn = document.getElementById('sync-live-data-btn');
        const syncIcon = document.getElementById('sync-icon');
        
        // 즉각적인 시각 피드백 (버튼 상태 변경 및 스피너)
        if (syncIcon) syncIcon.classList.add('animate-spin');
        if (syncBtn) {
            syncBtn.classList.add('opacity-75', 'cursor-not-allowed');
            syncBtn.setAttribute('disabled', 'true');
        }
        setSafeText('sync-btn-text', '동기화 중...');

        const api = window.GoldApiService || (typeof GoldApiService !== 'undefined' ? GoldApiService : null);
        if (!api) {
            console.error('GoldApiService not found');
            this.showToast('동기화 불가', '시세 API 모듈을 불러오지 못했습니다. 브라우저를 새로고침(Ctrl+F5) 해주세요.', false);
            if (syncIcon) syncIcon.classList.remove('animate-spin');
            if (syncBtn) {
                syncBtn.classList.remove('opacity-75', 'cursor-not-allowed');
                syncBtn.removeAttribute('disabled');
            }
            setSafeText('sync-btn-text', '실시간 시세 동기화');
            return;
        }

        if (showFeedback) {
            this.showToast('시세 동기화 시작', '국제 금/은 시세 및 원/달러 실시간 환율을 조회 중입니다...', true);
        }

        try {
            const res = await api.syncAllLiveData();
            this.syncSimulatorSliders();
            this.renderAll();

            // 갱신된 수치 엘리먼트에 플래시 애니메이션 효과 부여
            ['ticker-gold-usd', 'ticker-gold-krw-g', 'ticker-gold-krw-don', 'ticker-usdkrw', 'header-last-updated'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.remove('flash-highlight');
                    void el.offsetWidth; // 트리거 리플로우
                    el.classList.add('flash-highlight');
                }
            });

            if (showFeedback) {
                if (res.updatedItems && res.updatedItems.length > 0) {
                    this.showToast('실시간 시세 갱신 및 저장 완료', `${res.updatedItems.join('<br>')}<br><span class="text-amber-400 font-semibold mt-1 inline-block">💾 브라우저에 저장되어 새로고침 후에도 유지됩니다.</span>`, true);
                } else {
                    this.showToast('동기화 결과 알림', '일부 시세 조회에 실패하여 기존 최신 데이터를 유지합니다.', false);
                }
            }
        } catch (e) {
            console.error('동기화 오류:', e);
            if (showFeedback) {
                this.showToast('동기화 오류', '실시간 데이터를 불러오는 중 오류가 발생했습니다: ' + (e.message || e), false);
            }
        } finally {
            const btn = document.getElementById('sync-live-data-btn');
            if (btn) {
                btn.classList.remove('opacity-75', 'cursor-not-allowed');
                btn.removeAttribute('disabled');
                // Lucide 아이콘이나 SVG 내부의 모든 animate-spin 확실하게 제거
                btn.querySelectorAll('.animate-spin').forEach(el => el.classList.remove('animate-spin'));
            }
            const icon = document.getElementById('sync-icon');
            if (icon) {
                icon.classList.remove('animate-spin');
            }
            setSafeText('sync-btn-text', '실시간 시세 동기화');
            if (window.lucide) {
                lucide.createIcons();
            }
        }
    },

    showToast(title, message, isSuccess = true) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'toast-message';
        const iconColor = isSuccess ? 'text-emerald-400' : 'text-rose-400';
        const iconSvg = isSuccess 
            ? '<svg class="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>'
            : '<svg class="w-5 h-5 text-rose-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';

        toast.innerHTML = `
            ${iconSvg}
            <div>
                <strong class="block font-bold text-white mb-0.5">${title}</strong>
                <div class="text-xs text-slate-300 leading-relaxed">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
};

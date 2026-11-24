/**
 * app.js
 * 메인 애플리케이션 컨트롤러
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentTab: 'summary',
    currentPreset: 'balanced',
    currentWeights: null,
    overrideValues: {},

    init() {
        this.currentWeights = { ...GoldScoringEngine.presets.balanced.weights };
        this.bindEvents();
        this.renderAll();
        // Lucide icons 렌더링
        if (window.lucide) {
            lucide.createIcons();
        }
        // 페이지 로드 시 백그라운드로 실시간 시세(환율, 금값) 자동 동기화 시도
        this.triggerLiveSync(false);
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
                document.getElementById('sim-tips-val').textContent = val.toFixed(2) + '%';
                this.overrideValues['us10y_tips'] = val;
                this.renderScoreAndSignal();
            });
        }

        const dxySlider = document.getElementById('sim-dxy');
        if (dxySlider) {
            dxySlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                document.getElementById('sim-dxy-val').textContent = val.toFixed(1);
                this.overrideValues['dxy'] = val;
                this.renderScoreAndSignal();
            });
        }

        const usdkrwSlider = document.getElementById('sim-usdkrw');
        if (usdkrwSlider) {
            usdkrwSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                document.getElementById('sim-usdkrw-val').textContent = val.toLocaleString() + '원';
                this.overrideValues['usdkrw'] = val;
                this.renderScoreAndSignal();
            });
        }

        const cbSlider = document.getElementById('sim-cb');
        if (cbSlider) {
            cbSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                document.getElementById('sim-cb-val').textContent = val + '톤';
                this.overrideValues['central_bank_net_buys'] = val;
                this.renderScoreAndSignal();
            });
        }

        // 시뮬레이터 초기화 버튼
        const resetSimBtn = document.getElementById('reset-sim-btn');
        if (resetSimBtn) {
            resetSimBtn.addEventListener('click', () => {
                this.overrideValues = {};
                if (tipsSlider) { tipsSlider.value = 1.88; document.getElementById('sim-tips-val').textContent = '1.88%'; }
                if (dxySlider) { dxySlider.value = 104.1; document.getElementById('sim-dxy-val').textContent = '104.1'; }
                if (usdkrwSlider) { usdkrwSlider.value = 1392; document.getElementById('sim-usdkrw-val').textContent = '1,392원'; }
                if (cbSlider) { cbSlider.value = 290; document.getElementById('sim-cb-val').textContent = '290톤'; }
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
        this.renderTicker();
        this.renderScoreAndSignal();
        this.renderCategoryCards();
        this.renderCalendarAndTips();
    },

    renderTicker() {
        const meta = GOLD_DATA.meta;
        document.getElementById('ticker-gold-usd').textContent = `$${meta.goldUSD.toLocaleString()}`;
        document.getElementById('ticker-gold-krw-g').textContent = `${meta.goldKRW_g.toLocaleString()}원`;
        document.getElementById('ticker-gold-krw-don').textContent = `${meta.goldKRW_don.toLocaleString()}원`;
        document.getElementById('ticker-usdkrw').textContent = `${meta.usdkrw.toLocaleString()}원`;
        document.getElementById('ticker-dxy').textContent = meta.dxy.toFixed(2);
        document.getElementById('ticker-us10y').textContent = `${meta.us10y}%`;
        document.getElementById('ticker-tips').textContent = `${meta.us10yTips}%`;
        document.getElementById('ticker-updated-at').textContent = meta.updatedAt;
    },

    renderScoreAndSignal() {
        const result = GoldScoringEngine.calculateScore(this.currentWeights, this.overrideValues);
        const { finalScore, signal, categoryScores, bullishDrivers, bearishRisks, actionPlan } = result;

        // 점수 및 신호 텍스트
        const scoreEl = document.getElementById('final-score-display');
        scoreEl.textContent = (finalScore > 0 ? '+' : '') + finalScore;
        scoreEl.className = `text-5xl font-black ${finalScore >= 20 ? 'text-emerald-400' : (finalScore <= -20 ? 'text-rose-400' : 'text-amber-400')}`;

        const signalBadge = document.getElementById('signal-badge');
        signalBadge.className = `inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold border ${signal.badgeClass}`;
        signalBadge.innerHTML = `<i data-lucide="${signal.icon}" class="w-4 h-4"></i> ${signal.korean}`;

        document.getElementById('signal-summary').textContent = signal.summary;
        document.getElementById('signal-recommendation').textContent = signal.recommendation;

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
        document.getElementById('target-allocation-text').textContent = actionPlan.targetAllocation;
        document.getElementById('domestic-strategy-text').innerHTML = actionPlan.domesticStrategy;
        document.getElementById('timing-advice-text').textContent = actionPlan.timingAdvice;

        // 레이더 차트 갱신
        GoldCharts.initRadarChart('radar-chart-canvas', categoryScores);

        // 아이콘 리프레시
        if (window.lucide) lucide.createIcons();
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

        // 각 카테고리 차트 초기화
        setTimeout(() => {
            GoldCharts.initRealRateChart('chart-realRate');
            GoldCharts.initDollarChart('chart-dollar');
            GoldCharts.initSupplyChart('chart-supplyDemand');
            GoldCharts.initYieldCurveChart('chart-macroLabor');
            GoldCharts.initRelativeChart('chart-relativeValuation');
            if (window.lucide) lucide.createIcons();
        }, 100);
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
                btn.classList.add('active', 'border-amber-500', 'text-amber-400', 'bg-amber-500/15');
            } else {
                btn.classList.remove('active', 'border-amber-500', 'text-amber-400', 'bg-amber-500/15');
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
        } else if (tabId === 'calendar') {
            summaryView.classList.add('hidden');
            categoriesView.classList.add('hidden');
            calendarView.classList.remove('hidden');
        } else {
            // 특정 카테고리 탭 선택 시
            summaryView.classList.add('hidden');
            categoriesView.classList.remove('hidden');
            calendarView.classList.add('hidden');

            // 해당 카테고리 섹션으로 스크롤
            const targetSection = document.getElementById(`cat-section-${tabId}`);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
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

        document.getElementById('active-preset-desc').textContent = `${preset.name}: ${preset.description}`;
        this.renderScoreAndSignal();
    },

    async triggerLiveSync(showFeedback = true) {
        if (!window.GoldApiService) return;

        const syncIcon = document.getElementById('sync-icon');
        if (syncIcon) {
            syncIcon.classList.add('animate-spin');
        }

        try {
            const res = await GoldApiService.syncAllLiveData();
            this.renderAll();

            if (showFeedback) {
                if (res.updatedItems.length > 0) {
                    alert(`✅ 실시간 데이터 동기화 완료!\n\n반영된 항목:\n• ${res.updatedItems.join('\n• ')}`);
                } else {
                    alert('네트워크 상태를 확인해주세요. 기본 데이터셋이 유지됩니다.');
                }
            }
        } catch (e) {
            console.error('동기화 오류:', e);
            if (showFeedback) {
                alert('실시간 데이터를 불러오는 중 오류가 발생했습니다.');
            }
        } finally {
            if (syncIcon) {
                syncIcon.classList.remove('animate-spin');
            }
        }
    }
};

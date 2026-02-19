let quizData = [];
let currentQIndex = 0;
let questionStartTime = 0;

const el = {
    qNum: document.getElementById("q-num"),
    qText: document.getElementById("question-text"),
    optArea: document.getElementById("options-area"),
    resBox: document.getElementById("result-box"),
    resTitle: document.getElementById("result-title"),
    resBody: document.getElementById("content-body"),
    nextBtn: document.getElementById("next-btn")
};

// --- 称号データ ---
const TITLES = [
    { count: 0, text: "数学の卵", icon: "🥚" },
    { count: 5, text: "計算見習い", icon: "🐣" },
    { count: 10, text: "数検チャレンジャー", icon: "✏️" },
    { count: 30, text: "解法の探求者", icon: "🕯️" },
    { count: 50, text: "公式の支配者", icon: "👑" },
    { count: 100, text: "数学の魔術師", icon: "🧙‍♂️" },
    { count: 200, text: "n次元の覇者", icon: "🪐" }
];

// --- ページ読み込み ---
window.onload = async function() {
    // 1. 利用規約(index.html)
    if (document.getElementById("course-lock-overlay")) {
        const isAccepted = localStorage.getItem('termsAccepted');
        if (isAccepted === 'true') {
            // 同意済みならロックを消す
            document.getElementById("course-lock-overlay").style.display = 'none';
        } else {
            // 同意していないなら、リンクを無効化する処理
            const links = document.querySelectorAll('.course-card');
            links.forEach(link => {
                link.style.pointerEvents = 'none'; // クリック禁止
            });
        }
    }

    

    // 2. ダッシュボード(index.html)
    if (document.getElementById("total-count")) {
        renderDashboard();
        renderHeatmap(); // カレンダー表示
        renderTitle();   // 称号表示
        return;
    }

    // 2. クイズページ
    try {
        // HTML側で window.quizConfig.jsonPath が指定されていればそれを使う
        // 指定がなければデフォルト(準2級)
        const jsonPath = (window.quizConfig && window.quizConfig.jsonPath) || 'question-j2.json';
        
        const response = await fetch(jsonPath);
        if (!response.ok) throw new Error("JSON読み込み失敗");
        
        quizData = await response.json();
        shuffleArray(quizData);
        
        setTimeout(() => { loadQuestion(); renderMath(); }, 100);
    } catch (error) {
        if(el.qText) el.qText.innerHTML = `<p style="color:red">エラー: ${error.message}</p>`;
    }
};

// ... (renderMath, shuffleArray, loadQuestion は変更なし) ...
function renderMath() { if (window.MathJax && window.MathJax.typesetPromise) MathJax.typesetPromise(); }
function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }

function loadQuestion() {
    if(!el.qText) return;
    el.resBox.classList.add("hidden"); el.nextBtn.classList.add("hidden");
    if (currentQIndex >= quizData.length) { showEndScreen(); return; }
    const data = quizData[currentQIndex];
    el.qNum.textContent = currentQIndex + 1;
    const categoryLabel = data.category ? `<span class="category-tag">${data.category}</span>` : "";
    el.qText.innerHTML = `${categoryLabel}<br>${data.question}`;
    el.optArea.innerHTML = "";
    data.options.forEach((opt, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerHTML = opt;
        btn.onclick = () => checkAnswer(index);
        el.optArea.appendChild(btn);
    });
    renderMath();
    questionStartTime = Date.now();
}

// --- 正誤判定 (カレンダー記録追加) ---
function checkAnswer(selectedIndex) {
    const timeTaken = Date.now() - questionStartTime;
    const data = quizData[currentQIndex];
    const isCorrect = selectedIndex === data.correctIndex;

    saveStats(isCorrect, data.category, timeTaken); // ここで日付データも保存される

    const buttons = document.querySelectorAll(".option-btn");
    buttons.forEach(btn => btn.disabled = true);
    buttons[selectedIndex].style.borderColor = isCorrect ? "var(--correct)" : "var(--wrong)";
    if(!isCorrect) buttons[selectedIndex].style.background = "#fff0f0";
    el.resBox.classList.remove("hidden");
    if (isCorrect) {
        el.resBox.classList.add("is-correct");
        el.resTitle.innerHTML = "⭕ 正解！";
        el.resBody.innerHTML = `<span class="column-badge">コラム</span><br>${data.column}`;
    } else {
        el.resBox.classList.add("is-wrong");
        el.resTitle.innerHTML = "❌ 残念...";
        el.resBody.innerHTML = `<strong>正解：${data.options[data.correctIndex]}</strong><br><hr>${data.explanation}`;
    }
    el.nextBtn.classList.remove("hidden");
    renderMath();
}

// ... (nextQuestion, showEndScreen は変更なし) ...
function nextQuestion() { currentQIndex++; loadQuestion(); }
function showEndScreen() { el.qText.innerHTML = "全問終了！"; el.optArea.innerHTML = `<a href="../index.html" class="next-btn" style="text-align:center;">ダッシュボードへ</a>`; el.resBox.classList.add("hidden"); el.nextBtn.classList.add("hidden"); }


// ==========================================
//  データ管理・統計・称号ロジック
// ==========================================

function saveStats(isCorrect, category = "その他", timeMs) {
    let stats = JSON.parse(localStorage.getItem('mathQuizStatsV2')) || { 
        total: 0, correct: 0, totalTimeMs: 0, categories: {}, dailyHistory: {} 
    };
    
    // 基本統計
    stats.total += 1;
    if (isCorrect) stats.correct += 1;
    stats.totalTimeMs += timeMs;

    // 分野別
    if (!stats.categories[category]) stats.categories[category] = { total: 0, correct: 0 };
    stats.categories[category].total += 1;
    if (isCorrect) stats.categories[category].correct += 1;

    // ★ カレンダー用 (YYYY-MM-DD形式で保存)
    const today = new Date().toISOString().split('T')[0];
    if (!stats.dailyHistory) stats.dailyHistory = {};
    stats.dailyHistory[today] = (stats.dailyHistory[today] || 0) + 1;
    
    localStorage.setItem('mathQuizStatsV2', JSON.stringify(stats));
}

// 称号表示
function renderTitle() {
    const stats = JSON.parse(localStorage.getItem('mathQuizStatsV2')) || { total: 0 };
    // 今の合計回答数を超える称号の中で、一番最後のものを取得
    let currentTitle = TITLES[0];
    for (const t of TITLES) {
        if (stats.total >= t.count) currentTitle = t;
    }
    document.getElementById('user-title-icon').textContent = currentTitle.icon;
    document.getElementById('user-title-text').textContent = currentTitle.text;
    
    // 次の称号まであと何問？
    let nextTitle = TITLES.find(t => t.count > stats.total);
    if(nextTitle) {
        document.getElementById('next-title-info').textContent = `次のランクまであと ${nextTitle.count - stats.total} 問`;
    } else {
        document.getElementById('next-title-info').textContent = "最高ランク到達！";
    }
}

// カレンダー(ヒートマップ)表示
function renderHeatmap() {
    const stats = JSON.parse(localStorage.getItem('mathQuizStatsV2')) || { dailyHistory: {} };
    const container = document.getElementById('heatmap-grid');
    if(!container) return;

    // 過去28日分を表示
    const history = stats.dailyHistory || {};
    container.innerHTML = "";

    for (let i = 27; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = history[dateStr] || 0;

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.title = `${dateStr}: ${count}問`; // マウスホバーで数表示
        
        // 色の濃さを判定
        if (count === 0) cell.classList.add('level-0');
        else if (count <= 5) cell.classList.add('level-1');
        else if (count <= 10) cell.classList.add('level-2');
        else cell.classList.add('level-3');

        container.appendChild(cell);
    }
}

// ダッシュボード表示 (既存)
function renderDashboard() {
    const stats = JSON.parse(localStorage.getItem('mathQuizStatsV2')) || { total: 0, correct: 0, totalTimeMs: 0, categories: {} };
    // ... (前回のrenderDashboardの中身と同じ。時間計算やグラフ描画) ...
    const totalTimeSec = Math.floor(stats.totalTimeMs / 1000);
    const avgTimeSec = stats.total === 0 ? 0 : (stats.totalTimeMs / stats.total / 1000).toFixed(1);
    document.getElementById('total-time').textContent = formatTime(totalTimeSec);
    document.getElementById('avg-time').textContent = avgTimeSec + "秒";
    const incorrect = stats.total - stats.correct;
    const accuracy = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
    document.getElementById('total-count').textContent = stats.total + "問";
    document.getElementById('correct-count').textContent = stats.correct + "回";
    document.getElementById('incorrect-count').textContent = incorrect + "回";
    document.getElementById('accuracy-rate').textContent = accuracy + "%";

    if(window.Chart) {
        new Chart(document.getElementById('accuracyChart'), {
            type: 'doughnut',
            data: { labels: ['正解', '不正解'], datasets: [{ data: [stats.correct, incorrect], backgroundColor: ['#27ae60', '#e74c3c'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
        const cats = Object.keys(stats.categories);
        new Chart(document.getElementById('categoryChart'), {
            type: 'bar',
            data: { labels: cats, datasets: [{ label: '正答率 (%)', data: cats.map(c => Math.round((stats.categories[c].correct / stats.categories[c].total) * 100)), backgroundColor: '#3498db', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } } }
        });
    }
}
function formatTime(s){ const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return h>0?`${h}時間${m}分`:`${m}分${sec}秒`; }

// --- 管理画面用（タブ切り替え） ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    // クリックされたボタンをactiveにする（eventが使える場合）
    if(event && event.target) event.target.classList.add('active');
}

// 📤 データ書き出し (Export)
function exportData() {
    const stats = localStorage.getItem('mathQuizStatsV2');
    if (!stats) {
        alert("まだデータがありません！問題を解いてから試してください。");
        return;
    }
    // 日本語対応Base64変換
    const jsonString = unescape(encodeURIComponent(stats));
    const code = btoa(jsonString);
    
    const area = document.getElementById('export-area');
    area.value = code;
    document.getElementById('copy-btn').style.display = 'inline-block';
}

function copyCode() {
    const copyText = document.getElementById("export-area");
    copyText.select();
    document.execCommand("copy");
    alert("コードをコピーしました！");
}

// 📥 データ取り込み (Import)
function importData() {
    const code = document.getElementById('import-area').value;
    if (!code) return;

    if (!confirm("現在のデータを上書きして復元します。よろしいですか？")) return;

    try {
        const jsonString = atob(code);
        const statsStr = decodeURIComponent(escape(jsonString));
        
        // JSONとして正しいかチェック
        JSON.parse(statsStr); 
        
        localStorage.setItem('mathQuizStatsV2', statsStr);
        alert("復元完了！ページをリロードします。");
        location.reload();
    } catch (e) {
        alert("無効なコードです。正しくコピーできているか確認してください。");
        console.error(e);
    }
}

// --- リセット機能 ---
function resetTimeOnly() {
    if(!confirm("学習時間だけを0にしますか？成績は残ります。")) return;
    let stats = JSON.parse(localStorage.getItem('mathQuizStatsV2'));
    if(stats) { 
        stats.totalTimeMs = 0; 
        localStorage.setItem('mathQuizStatsV2', JSON.stringify(stats)); 
        location.reload(); 
    }
}

function resetStatsOnly() {
    if(!confirm("成績データだけをリセットしますか？学習時間は残ります。")) return;
    let stats = JSON.parse(localStorage.getItem('mathQuizStatsV2'));
    if(stats) { 
        stats.total = 0; 
        stats.correct = 0; 
        stats.categories = {}; 
        localStorage.setItem('mathQuizStatsV2', JSON.stringify(stats)); 
        location.reload(); 
    }
}

function resetAllData() {
    if(!confirm("【警告】全ての学習データを消去して初期化しますか？この操作は取り消せません。")) return;
    localStorage.removeItem('mathQuizStatsV2');
    location.reload();
}

// --- CSSロゴをファビコンに変換して設定する関数 ---



// ==========================================
//  🌙 ダークモード切り替え機能
// ==========================================

// ページ読み込み時に実行
document.addEventListener("DOMContentLoaded", function() {
    initTheme();
    createThemeButton();
});

function initTheme() {
    // 保存された設定があれば適用
    const savedTheme = localStorage.getItem("appTheme");
    if (savedTheme) {
        document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
        // なければOSの設定を確認（オマケ機能）
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute("data-theme", "dark");
        }
    }
}

function createThemeButton() {
    // すでにボタンがあれば何もしない（二重生成防止）
    if (document.getElementById("theme-toggle")) return;

    const btn = document.createElement("button");
    btn.id = "theme-toggle";
    btn.className = "theme-toggle-btn";
    btn.innerHTML = isDark() ? "☀️" : "🌙"; // 今の状態に合わせてアイコンを表示
    btn.title = "ダークモード切替";
    
    // クリック時の動作
    btn.onclick = toggleTheme;
    
    // bodyに追加（これで画面に表示される）
    document.body.appendChild(btn);
}

function toggleTheme() {
    const btn = document.getElementById("theme-toggle");
    
    if (isDark()) {
        // ライトモードへ切り替え
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("appTheme", "light");
        btn.innerHTML = "🌙"; // アイコンを月に戻す
    } else {
        // ダークモードへ切り替え
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("appTheme", "dark");
        btn.innerHTML = "☀️"; // アイコンを太陽にする
    }
}

// 今ダークモードかどうか判定する便利関数
function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
}


// ==========================================
//  🔔 通知ボックス機能
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const notifyBtn = document.getElementById("notify-btn");
    const notifyModal = document.getElementById("notify-modal");
    const notifyClose = document.getElementById("notify-close");

    // ボタンとモーダルが存在するページでのみ実行
    if (notifyBtn && notifyModal && notifyClose) {
        
        // ベルボタンを押した時（開く）
        notifyBtn.addEventListener("click", () => {
            notifyModal.classList.add("active");
            // ついでにバッジ(赤い丸)を消す演出を入れるならここ
            const badge = notifyBtn.querySelector('.notify-badge');
            if(badge) badge.style.display = 'none';
        });

        // ✖ボタンを押した時（閉じる）
        notifyClose.addEventListener("click", () => {
            notifyModal.classList.remove("active");
        });

        // モーダルの外側(黒い背景)をクリックした時（閉じる）
        notifyModal.addEventListener("click", (e) => {
            if (e.target === notifyModal) {
                notifyModal.classList.remove("active");
            }
        });
    }
});

// ページ読み込み時に実行
window.addEventListener('DOMContentLoaded', setDynamicFavicon);

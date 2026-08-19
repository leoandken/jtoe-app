document.addEventListener('DOMContentLoaded', () => {
    // --- 要素取得 ---
    const btnRecord = document.getElementById('btnRecord');
    const btnStop = document.getElementById('btnStop');
    const btnNew = document.getElementById('btnNew');
    const btnSettings = document.getElementById('btnSettings');
    const btnTranslate = document.getElementById('btnTranslate');
    const jaInput = document.getElementById('jaInput');

    const btnPlay = document.getElementById('btnPlay');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');

    const btnLoadSaved = document.getElementById('btnLoadSaved');
    const btnDeleteSaved = document.getElementById('btnDeleteSaved');
    const savedContainer = document.getElementById('savedContainer');
    const savedList = document.getElementById('savedList');

    const settingsModal = document.getElementById('settingsModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const voiceSelect = document.getElementById('voiceSelect');
    const btnSaveSettings = document.getElementById('btnSaveSettings');

    // 翻訳レベルカード
    const levels = {
        junior: {
            box: document.getElementById('enJunior'),
            explain: document.getElementById('explainJunior'),
            card: document.querySelector('.block-5')
        },
        senior: {
            box: document.getElementById('enSenior'),
            explain: document.getElementById('explainSenior'),
            card: document.querySelector('.block-6')
        },
        native: {
            box: document.getElementById('enNative'),
            explain: document.getElementById('explainNative'),
            card: document.querySelector('.block-7')
        }
    };

    let selectedLevel = null;
    let selectedSavedIndex = null;
    let recognition = null;
    let apiKey = localStorage.getItem('gemini_api_key') || '';

    if (apiKey) apiKeyInput.value = apiKey;

    // --- 音声認識 (SpeechRecognition) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'ja-JP';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            jaInput.value = transcript;
        };

        recognition.onerror = (e) => console.error('音声認識エラー:', e);
    } else {
        btnRecord.disabled = true;
        btnRecord.title = 'お使いのブラウザは音声認識に対応していません';
    }

    btnRecord.addEventListener('click', () => {
        if (!recognition) return;
        recognition.start();
        btnRecord.disabled = true;
        btnStop.disabled = false;
        btnRecord.classList.add('btn-danger');
    });

    btnStop.addEventListener('click', () => {
        if (!recognition) return;
        recognition.stop();
        btnRecord.disabled = false;
        btnStop.disabled = true;
        btnRecord.classList.remove('btn-danger');
    });

    btnNew.addEventListener('click', () => {
        jaInput.value = '';
        Object.values(levels).forEach(l => {
            l.box.value = '';
            l.explain.textContent = '';
            l.explain.classList.add('hidden');
        });
        deselectAll();
    });

    // --- 選択ボタン・アコーディオン切り替え ---
    document.querySelectorAll('.btn-select').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const levelKey = e.target.getAttribute('data-level');
            
            if (selectedLevel === levelKey) {
                deselectAll();
            } else {
                deselectAll();
                selectedLevel = levelKey;
                e.target.textContent = '解除';
                e.target.classList.add('active');
                levels[levelKey].card.classList.add('selected');
                levels[levelKey].explain.classList.remove('hidden');
            }
        });
    });

    function deselectAll() {
        selectedLevel = null;
        document.querySelectorAll('.btn-select').forEach(b => {
            b.textContent = '選択';
            b.classList.remove('active');
        });
        Object.values(levels).forEach(l => {
            l.card.classList.remove('selected');
            l.explain.classList.add('hidden');
        });
    }

    // --- 翻訳ロジック (最新 Gemini 3.6 Flash API 対応) ---
    btnTranslate.addEventListener('click', async () => {
        const text = jaInput.value.trim();
        if (!text) {
            alert('日本語テキストを入力するか、録音してください。');
            return;
        }

        btnTranslate.disabled = true;
        btnTranslate.textContent = '翻訳中...';

        try {
            if (apiKey) {
                await fetchGeminiTranslation(text);
            } else {
                await applyDemoData();
            }
        } catch (err) {
            alert(`翻訳処理に失敗しました。\n詳細: ${err.message}`);
            console.error(err);
        } finally {
            btnTranslate.disabled = false;
            btnTranslate.textContent = '英語にする';
        }
    });

    async function fetchGeminiTranslation(text) {
        // モデル名を gemini-3.6-flash に更新
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;
        
        const prompt = `以下の日本語文を3種類のレベルの英文に翻訳し、各解説を付けて、指定のJSON形式のみで出力してください（Markdownの記法等は不要です）。

日本語: "${text}"

JSONフォーマット例:
{
  "junior": { "text": "中学生レベルの英文", "explain": "ポイント解説" },
  "senior": { "text": "高校生レベルの英文", "explain": "ポイント解説" },
  "native": { "text": "ネイティブレベルの英文", "explain": "ポイント解説" }
}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error?.message || `通信エラー (HTTP ${response.status})`);
        }

        const data = await response.json();
        const resultText = data.candidates[0].content.parts[0].text;
        const res = JSON.parse(resultText);

        levels.junior.box.value = res.junior.text;
        levels.junior.explain.textContent = res.junior.explain;

        levels.senior.box.value = res.senior.text;
        levels.senior.explain.textContent = res.senior.explain;

        levels.native.box.value = res.native.text;
        levels.native.explain.textContent = res.native.explain;
    }

    function applyDemoData() {
        return new Promise(resolve => {
            setTimeout(() => {
                levels.junior.box.value = "When I think of great progressive rock bands, I choose Yes and Pink Floyd. I think Close to the Edge is the best album by Yes, and The Dark Side of the Moon is by Pink Floyd. Both sound new even now. By the way, I have records of both bands.";
                levels.junior.explain.textContent = "ポイント解説\n・雄 (great bands): 単純で伝わりやすい great bands を採用。\n・代表作 (best album): 最上級 the best album を使用。\n・今聞いても新しい (sound new even now): sound + 形容詞で表現。";

                levels.senior.box.value = "Speaking of leading progressive rock bands, I would mention Yes and Pink Floyd. I believe Close to the Edge is Yes's masterpiece, while The Dark Side of the Moon is Pink Floyd's. Both still sound innovative today. Incidentally, I own vinyl records of both artists.";
                levels.senior.explain.textContent = "ポイント解説\n・〜といえば (Speaking of...): 自然な分詞構文。\n・代表作 (masterpiece): 英検2級レベル語彙。\n・新しい (innovative): 革新的というニュアンス。";

                levels.native.box.value = "When it comes to progressive rock giants, Yes and Pink Floyd immediately come to mind. For me, Yes’s definitive album is Close to the Edge, and Pink Floyd’s is The Dark Side of the Moon. Both still sound incredibly fresh today. By the way, I actually own both on vinyl.";
                levels.native.explain.textContent = "ポイント解説\n・雄 (giants): 巨匠・雄を表す自然な表現。\n・代表作 (definitive album): 決定盤という意味の表現。\n・レコードを持っている (own both on vinyl): 現代の自然な口語表現。";

                resolve();
            }, 600);
        });
    }

    // --- 音声合成 (SpeechSynthesis) ---
    let voices = [];
    function populateVoices() {
        voices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
        voiceSelect.innerHTML = '';
        voices.forEach((v, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = `${v.name} (${v.lang})`;
            voiceSelect.appendChild(opt);
        });
    }

    speechSynthesis.onvoiceschanged = populateVoices;
    populateVoices();

    speedRange.addEventListener('input', (e) => {
        speedValue.textContent = e.target.value;
    });

    btnPlay.addEventListener('click', () => {
        if (!selectedLevel) {
            alert('再生する英文のレベルを選択（「選択」ボタンを押す）してください。');
            return;
        }

        const text = levels[selectedLevel].box.value;
        if (!text) return;

        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = parseFloat(speedRange.value) / 100;

        if (voices.length > 0 && voiceSelect.value) {
            utterance.voice = voices[voiceSelect.value];
        }

        speechSynthesis.speak(utterance);
    });

    // --- 保存・呼出・削除機能 ---
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const levelKey = e.target.getAttribute('data-level');
            const text = levels[levelKey].box.value;
            if (!text) {
                alert('保存する英文がありません。');
                return;
            }

            const savedItems = JSON.parse(localStorage.getItem('saved_speeches') || '[]');
            savedItems.push({
                text: text,
                level: levelKey,
                date: new Date().toLocaleString('ja-JP')
            });
            localStorage.setItem('saved_speeches', JSON.stringify(savedItems));
            alert('英文を保存しました。');
            renderSavedList();
        });
    });

    btnLoadSaved.addEventListener('click', () => {
        savedContainer.classList.toggle('hidden');
        renderSavedList();
    });

    function renderSavedList() {
        savedList.innerHTML = '';
        const savedItems = JSON.parse(localStorage.getItem('saved_speeches') || '[]');
        
        savedItems.forEach((item, index) => {
            const li = document.createElement('li');
            li.textContent = `[${item.level}] ${item.text.substring(0, 40)}... (${item.date})`;
            
            li.addEventListener('click', () => {
                document.querySelectorAll('#savedList li').forEach(el => el.classList.remove('selected'));
                li.classList.add('selected');
                selectedSavedIndex = index;
            });

            li.addEventListener('dblclick', () => {
                levels.native.box.value = item.text;
                alert('ネイティブレベルのボックスに読み込みました。');
            });

            savedList.appendChild(li);
        });
    }

    btnDeleteSaved.addEventListener('click', () => {
        if (selectedSavedIndex === null) {
            alert('削除する項目を一覧から選択（ワンクリック）してください。');
            return;
        }

        let savedItems = JSON.parse(localStorage.getItem('saved_speeches') || '[]');
        savedItems.splice(selectedSavedIndex, 1);
        localStorage.setItem('saved_speeches', JSON.stringify(savedItems));
        selectedSavedIndex = null;
        renderSavedList();
    });

    // --- 設定モーダル ---
    btnSettings.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    btnSaveSettings.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        localStorage.setItem('gemini_api_key', apiKey);
        settingsModal.classList.add('hidden');
    });
});

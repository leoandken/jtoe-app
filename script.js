// ===== Google Apps Script 翻訳API =====
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzcPiQA1tdLoGWZ0qJuR1JleYm-UyZdviLEroiEMKIAP1ItpAp7ZnO6fxD83kmf4FmSwQ/exec";

// ===== 要素取得 =====
const recordBtn = document.getElementById("recordBtn");
const stopRecordBtn = document.getElementById("stopRecordBtn");
const translateBtn = document.getElementById("translateBtn");
const speakBtn = document.getElementById("speakBtn");

const jpTextArea = document.getElementById("jpText");

const enTextJunior3 = document.getElementById("enTextJunior3");
const enTextSenior = document.getElementById("enTextSenior");
const enTextNative = document.getElementById("enTextNative");

const chkJunior3 = document.getElementById("chkJunior3");
const chkSenior = document.getElementById("chkSenior");
const chkNative = document.getElementById("chkNative");

const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");
const statusDiv = document.getElementById("status");

const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const savedList = document.getElementById("savedList");
const applySavedBtn = document.getElementById("applySavedBtn");
const newLessonBtn = document.getElementById("newLessonBtn");

// ===== 音声認識 =====
let recognition = null;
let isRecording = false;

if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.continuous = true;

  recognition.onstart = () => setStatus("録音中…話してください");
  recognition.onresult = (event) => {
    const text = event.results[event.results.length - 1][0].transcript;
    jpTextArea.value += text;
  };
  recognition.onerror = (e) => setStatus("音声認識エラー: " + e.error);
  recognition.onend = () => {
    if (isRecording) recognition.start();
    else setStatus("録音を停止しました");
  };
} else {
  setStatus("このブラウザは音声認識に対応していません");
}

// ===== 翻訳API =====
async function translateJPtoEN(jpText) {
  const res = await fetch(GAS_API_URL, {
    method: "POST",
    body: JSON.stringify({ text: jpText })
  });
  const data = await res.json();
  return data.translated;
}

// ===== レベル調整関数 =====
function levelJunior3(text) {
  return text
    .replace(/therefore/g, "so")
    .replace(/in order to/g, "to")
    .replace(/I would like to/g, "I want to")
    .replace(/I've/g, "I have")
    .replace(/I'm/g, "I am");
}

function levelSenior(text) {
  return text
    .replace(/I want to/g, "I'd like to")
    .replace(/so/g, "therefore")
    .replace(/but/g, "however")
    .replace(/I will/g, "I'm going to")
    .replace(/I am/g, "I'm");
}

function levelNative(text) {
  return text
    .replace(/I'm going to/g, "I'm planning to")
    .replace(/I'd like to/g, "I'd love to")
    .replace(/I think/g, "I guess")
    .replace(/very/g, "really")
    .replace(/a lot/g, "quite a bit");
}

// ===== UIイベント =====
recordBtn.addEventListener("click", () => {
  jpTextArea.value = "";
  enTextJunior3.value = "";
  enTextSenior.value = "";
  enTextNative.value = "";

  chkJunior3.checked = false;
  chkSenior.checked = false;
  chkNative.checked = false;

  savedList.innerHTML = "";
  savedList.style.display = "none";

  isRecording = true;
  recognition.start();

  setStatus("録音を開始しました（すべて初期化済み）");
});

stopRecordBtn.addEventListener("click", () => {
  isRecording = false;
  recognition.stop();
  setStatus("録音を停止しました");
});

// ===== 保存 =====
saveBtn.addEventListener("click", () => {
  const items = [];

  if (chkJunior3.checked && enTextJunior3.value.trim()) items.push(enTextJunior3.value.trim());
  if (chkSenior.checked && enTextSenior.value.trim()) items.push(enTextSenior.value.trim());
  if (chkNative.checked && enTextNative.value.trim()) items.push(enTextNative.value.trim());

  if (items.length === 0) return setStatus("保存する英文が選ばれていません");

  const saved = JSON.parse(localStorage.getItem("savedEnglish") || "[]");
  saved.push(...items);
  localStorage.setItem("savedEnglish", JSON.stringify(saved));

  setStatus("選択した英文を保存しました");
});

// ===== 呼び出し（自前リスト） =====
loadBtn.addEventListener("click", () => {
  const saved = JSON.parse(localStorage.getItem("savedEnglish") || "[]");

  savedList.innerHTML = "";

  if (saved.length === 0) {
    setStatus("保存された英文はありません");
    savedList.style.display = "none";
    return;
  }

  saved.forEach((text, index) => {
    const div = document.createElement("div");
    div.className = "saved-item";
    div.textContent = text;

    div.addEventListener("click", () => {
      document.querySelectorAll(".saved-item").forEach(d => d.classList.remove("selected"));
      div.classList.add("selected");
      savedList.dataset.selectedIndex = index;
    });

    savedList.appendChild(div);
  });

  savedList.style.display = "block";
  setStatus("保存された英文を読み込みました");
});

// ===== ネイティブ欄に反映 =====
applySavedBtn.addEventListener("click", () => {
  const saved = JSON.parse(localStorage.getItem("savedEnglish") || "[]");
  const index = savedList.dataset.selectedIndex;

  if (index === undefined) {
    return setStatus("リストから英文をクリックして選んでください");
  }

  enTextNative.value = saved[index];
  savedList.style.display = "none";

  setStatus("選択した英文をネイティブ欄に反映しました");
});

// ===== 翻訳 =====
translateBtn.addEventListener("click", async () => {
  const jp = jpTextArea.value.trim();
  if (!jp) return setStatus("翻訳する日本語がありません");

  try {
    setStatus("翻訳中…");

    let en = await translateJPtoEN(jp);

    enTextJunior3.value = levelJunior3(en);
    enTextSenior.value = levelSenior(en);
    enTextNative.value = levelNative(en);

    setStatus("3つのレベルの英語を生成しました");
  } catch (e) {
    console.error(e);
    setStatus("エラー: " + e.message);
  }
});

// ===== 音声再生 =====
function speakSelectedEnglish() {
  const texts = [];

  if (chkJunior3.checked) texts.push(enTextJunior3.value);
  if (chkSenior.checked) texts.push(enTextSenior.value);
  if (chkNative.checked) texts.push(enTextNative.value);

  if (texts.length === 0) return setStatus("再生する英文が選ばれていません");

  const rate = Number(speedSlider.value) / 100;

  texts.forEach(text => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = rate;

    utter.onstart = () => setStatus("英語音声を再生中…");
    utter.onend = () => setStatus("再生が終了しました");

    window.speechSynthesis.speak(utter);
  });
}

speakBtn.addEventListener("click", () => speakSelectedEnglish());

speedSlider.addEventListener("input", (e) => {
  speedValue.textContent = e.target.value + "%";
});

// ===== ユーティリティ =====
function setStatus(msg) {
  statusDiv.textContent = msg;
}

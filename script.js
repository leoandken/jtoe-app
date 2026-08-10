// ===============================
// DOM取得
// ===============================
const jpText = document.getElementById("jpText");   // ★ 修正
const enTextJunior3 = document.getElementById("enTextJunior3");
const enTextSenior = document.getElementById("enTextSenior");
const enTextNative = document.getElementById("enTextNative");

const chkJunior3 = document.getElementById("chkJunior3");
const chkSenior = document.getElementById("chkSenior");
const chkNative = document.getElementById("chkNative");

const explainJunior3 = document.getElementById("explainJunior3");
const explainSenior = document.getElementById("explainSenior");
const explainNative = document.getElementById("explainNative");

const savedList = document.getElementById("savedList");

const translateBtn = document.getElementById("translateBtn");
const speakBtn = document.getElementById("speakBtn");
const saveBtn = document.getElementById("saveBtn");
const loadBtn = document.getElementById("loadBtn");
const newLessonBtn = document.getElementById("newLessonBtn");
const applySavedBtn = document.getElementById("applySavedBtn");  // ★ 追加

const statusBox = document.getElementById("status");  // ★ 修正

// GAS API URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzxyEXLAyWQyy0s5g2fwiePuwnAZDIx8rMUcxAx7qb1FcDRpw7kWDPn5RwHBoiTmzb_/exec";

// ===============================
// 状態表示
// ===============================
function setStatus(msg) {
  statusBox.textContent = msg;
}

// ===============================
// 翻訳API呼び出し
// ===============================
async function fetchTranslation(text) {
  const res = await fetch(GAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  return data.translated;
}


// ===============================
// 文法解説API呼び出し
// ===============================
async function fetchExplanation(level, text) {
  const res = await fetch(GAS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, text })
  });

  const data = await res.json();
  return data.explanation;
}


// ===============================
// 翻訳ボタン
// ===============================
translateBtn.addEventListener("click", async () => {
  const jp = jpText.value.trim();   // ★ 修正
  if (!jp) {
    setStatus("日本語が入力されていません");
    return;
  }

  setStatus("翻訳中…");

  const en = await fetchTranslation(jp);

  enTextJunior3.value = en;
  enTextSenior.value = en;
  enTextNative.value = en;

  setStatus("翻訳完了");
});

// ===============================
// 音声再生
// ===============================
speakBtn.addEventListener("click", () => {
  let text = "";

  if (chkJunior3.checked) text = enTextJunior3.value;
  if (chkSenior.checked) text = enTextSenior.value;
  if (chkNative.checked) text = enTextNative.value;

  if (!text) {
    setStatus("再生する英文がありません");
    return;
  }

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  speechSynthesis.speak(utter);

  setStatus("英語を再生しました");
});

// ===============================
// 保存
// ===============================
saveBtn.addEventListener("click", () => {
  let text = "";

  if (chkJunior3.checked) text = enTextJunior3.value;
  if (chkSenior.checked) text = enTextSenior.value;
  if (chkNative.checked) text = enTextNative.value;

  if (!text) {
    setStatus("保存する英文がありません");
    return;
  }

  const div = document.createElement("div");
  div.className = "saved-item";
  div.textContent = text;

  div.addEventListener("click", () => {
    div.classList.toggle("selected");
  });

  savedList.appendChild(div);
  savedList.style.display = "block";

  setStatus("英文を保存しました");
});

// ===============================
// 呼び出し（保存リスト表示）
loadBtn.addEventListener("click", () => {
  if (savedList.children.length === 0) {
    setStatus("保存された英文はありません");
    return;
  }

  savedList.style.display = "block";
  setStatus("保存した英文を表示しています");
});

// ===============================
// ネイティブ欄に反映
// ===============================
applySavedBtn.addEventListener("click", () => {
  const selected = savedList.querySelector(".saved-item.selected");
  if (!selected) {
    setStatus("選択された英文がありません");
    return;
  }

  enTextNative.value = selected.textContent;
  setStatus("保存した英文をネイティブ欄に反映しました");
});

// ===============================
// 新しい学習
// ===============================
newLessonBtn.addEventListener("click", () => {
  jpText.value = "";
  enTextJunior3.value = "";
  enTextSenior.value = "";
  enTextNative.value = "";

  chkJunior3.checked = false;
  chkSenior.checked = false;
  chkNative.checked = false;

  savedList.innerHTML = "";
  savedList.style.display = "none";

  explainJunior3.style.display = "none";
  explainSenior.style.display = "none";
  explainNative.style.display = "none";

  setStatus("新しい学習を開始しました（すべて初期化）");
});

// ===============================
// 文法解説（チェックONで表示）
// ===============================
chkJunior3.addEventListener("change", async () => {
  if (chkJunior3.checked) {
    explainJunior3.style.display = "block";
    explainJunior3.textContent = await fetchExplanation("junior3", jpText.value);
  } else {
    explainJunior3.style.display = "none";
  }
});

chkSenior.addEventListener("change", async () => {
  if (chkSenior.checked) {
    explainSenior.style.display = "block";
    explainSenior.textContent = await fetchExplanation("senior", jpText.value);
  } else {
    explainSenior.style.display = "none";
  }
});

chkNative.addEventListener("change", async () => {
  if (chkNative.checked) {
    explainNative.style.display = "block";
    explainNative.textContent = await fetchExplanation("native", jpText.value);
  } else {
    explainNative.style.display = "none";
  }
});

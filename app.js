(function () {
  "use strict";

  const bank = window.QUESTION_BANK || [];
  const storageKey = "daofa-practice-progress";
  const categories = ["全部栏目", ...new Set(bank.map((item) => item.category))];
  const state = {
    category: "全部栏目",
    mode: "fill",
    blankSide: "answer",
    index: 0,
    answer: "",
    selected: "",
    submitted: false,
    correct: 0,
    attempts: 0,
    streak: 0,
  };
  let choiceCacheKey = "";
  let choiceCache = [];

  const $ = (id) => document.getElementById(id);
  const normalize = (value) => String(value || "").replace(/[\s，。；：、,.!?！？“”‘’（）()「」]/g, "").toLowerCase();
  const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

  function parseKnowledge(text) {
    let separator = text.indexOf("：");
    if (separator > 0 && separator < text.length - 1) {
      return { prompt: text.slice(0, separator + 1), answer: text.slice(separator + 1).trim() };
    }
    for (const marker of ["是：", "是", "为：", "为"]) {
      separator = text.indexOf(marker);
      if (separator > 1 && separator < text.length - marker.length) {
        return { prompt: text.slice(0, separator + marker.length), answer: text.slice(separator + marker.length).trim() };
      }
    }
    separator = text.indexOf("，");
    if (separator > 4 && separator < text.length - 1) {
      return { prompt: text.slice(0, separator + 1), answer: text.slice(separator + 1).trim() };
    }
    separator = Math.ceil(text.length * 0.38);
    return { prompt: text.slice(0, separator), answer: text.slice(separator) };
  }

  function keywordFromPrompt(prompt) {
    return prompt.replace(/(是|为|：|:|以[^，。；]*为)$/, "").trim();
  }

  function filteredBank() {
    return state.category === "全部栏目" ? bank : bank.filter((item) => item.category === state.category);
  }

  function currentQuestion() {
    const list = filteredBank();
    return list[state.index % Math.max(list.length, 1)] || bank[0];
  }

  function targetFor(question) {
    const parsed = parseKnowledge(question.text);
    return state.blankSide === "answer" ? parsed.answer : keywordFromPrompt(parsed.prompt);
  }

  function choicesFor(question) {
    const key = `${question.id}:${state.blankSide}`;
    if (key === choiceCacheKey) return choiceCache;
    const correct = targetFor(question);
    const distractors = bank
      .filter((item) => item.id !== question.id)
      .map((item) => {
        const parsed = parseKnowledge(item.text);
        return state.blankSide === "answer" ? parsed.answer : keywordFromPrompt(parsed.prompt);
      })
      .filter((value) => value && normalize(value) !== normalize(correct));
    choiceCacheKey = key;
    choiceCache = shuffle([correct, ...shuffle(distractors).slice(0, 3)]);
    return choiceCache;
  }

  function saveProgress() {
    localStorage.setItem(storageKey, JSON.stringify({
      category: state.category,
      mode: state.mode,
      blankSide: state.blankSide,
      index: state.index,
      correct: state.correct,
      attempts: state.attempts,
      streak: state.streak,
    }));
  }

  function restoreProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (!saved) return;
      if (categories.includes(saved.category)) state.category = saved.category;
      if (["fill", "choice"].includes(saved.mode)) state.mode = saved.mode;
      if (["answer", "keyword"].includes(saved.blankSide)) state.blankSide = saved.blankSide;
      ["index", "correct", "attempts", "streak"].forEach((key) => {
        if (Number.isFinite(saved[key])) state[key] = saved[key];
      });
    } catch (_) {
      localStorage.removeItem(storageKey);
    }
  }

  function resetQuestion() {
    state.answer = "";
    state.selected = "";
    state.submitted = false;
    choiceCacheKey = "";
  }

  function renderControls() {
    $("category-select").value = state.category;
    $("fill-mode").className = state.mode === "fill" ? "active" : "";
    $("choice-mode").className = state.mode === "choice" ? "active" : "";
    $("answer-side").className = state.blankSide === "answer" ? "active" : "";
    $("keyword-side").className = state.blankSide === "keyword" ? "active" : "";
  }

  function renderStats() {
    const accuracy = state.attempts ? Math.round((state.correct / state.attempts) * 100) : 0;
    const today = Math.min(state.attempts, 20);
    $("accuracy").textContent = `${accuracy}%`;
    $("streak").textContent = state.streak;
    $("today-count").textContent = today;
    $("progress-bar").style.width = `${Math.min(today / 20, 1) * 100}%`;
    $("goal-message").textContent = today >= 20 ? "今日目标已完成，继续保持" : `再答 ${20 - today} 题完成今日目标`;
  }

  function renderQuestion() {
    const question = currentQuestion();
    const parsed = parseKnowledge(question.text);
    const target = targetFor(question);
    const hiddenPrompt = state.blankSide === "answer" ? parsed.prompt : "";
    const hiddenAnswer = state.blankSide === "answer" ? parsed.answer : parsed.answer;
    const placeholder = state.blankSide === "answer" ? "请输入答案" : "请输入关键词";
    $("question-id").textContent = question.id;
    $("question-total").textContent = bank.length;
    $("question-category").textContent = question.category;
    $("blank-label").textContent = state.blankSide === "answer" ? "答案" : "关键词";
    $("source-text").textContent = question.text;
    $("question-prompt").innerHTML = `${escapeHtml(hiddenPrompt)}<span class="inline-blank">${state.submitted ? escapeHtml(target) : placeholder}</span>${state.blankSide === "keyword" ? escapeHtml(hiddenAnswer) : ""}`;
    $("hint").textContent = state.mode === "fill" ? "提示：关键词顺序正确即可得分" : "提示：先判断它属于哪个知识点栏目";

    if (state.mode === "fill") {
      $("answer-view").innerHTML = `<div class="answer-area"><label for="answer">你的答案</label><div class="answer-row"><input id="answer" placeholder="填写${state.blankSide === "answer" ? "答案" : "关键词"}…" autocomplete="off" value="${escapeAttribute(state.answer)}" ${state.submitted ? "disabled" : ""} /><button class="submit-btn" id="submit-answer" ${!state.answer.trim() || state.submitted ? "disabled" : ""}>提交答案 <span>↗</span></button></div>${state.submitted ? feedbackHtml(normalize(state.answer) === normalize(target), target) : ""}</div>`;
      $("answer").addEventListener("input", (event) => {
        state.answer = event.target.value;
        $("submit-answer").disabled = !state.answer.trim();
      });
      $("answer").addEventListener("keydown", (event) => {
        if (event.key === "Enter") submitFill();
      });
      $("submit-answer").addEventListener("click", submitFill);
    } else {
      const options = choicesFor(question);
      $("answer-view").innerHTML = `<div class="choice-grid">${options.map((option, index) => `<button class="choice-btn ${state.selected === option ? "selected" : ""} ${state.submitted && normalize(option) === normalize(target) ? "correct-choice" : ""} ${state.submitted && state.selected === option && normalize(option) !== normalize(target) ? "wrong-choice" : ""}" data-choice="${escapeAttribute(option)}"><span>${String.fromCharCode(65 + index)}</span>${escapeHtml(option)}</button>`).join("")}</div>${state.submitted ? feedbackHtml(normalize(state.selected) === normalize(target), target) : ""}`;
      document.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => chooseOption(button.dataset.choice)));
    }
  }

  function feedbackHtml(correct, target) {
    return `<div class="feedback ${correct ? "good" : "bad"}"><div class="feedback-icon">${correct ? "✓" : "!"}</div><div><b>${correct ? "答对了，稳！" : "再想一想"}</b><p>标准答案：${escapeHtml(target)}</p></div></div>`;
  }

  function submitFill() {
    if (state.submitted || !state.answer.trim()) return;
    const correct = normalize(state.answer) === normalize(targetFor(currentQuestion()));
    state.submitted = true;
    state.attempts += 1;
    state.correct += correct ? 1 : 0;
    state.streak = correct ? state.streak + 1 : 0;
    saveProgress();
    render();
  }

  function chooseOption(value) {
    if (state.submitted) return;
    const correct = normalize(value) === normalize(targetFor(currentQuestion()));
    state.selected = value;
    state.submitted = true;
    state.attempts += 1;
    state.correct += correct ? 1 : 0;
    state.streak = correct ? state.streak + 1 : 0;
    saveProgress();
    render();
  }

  function nextQuestion(random) {
    const list = filteredBank();
    if (random) {
      state.index = (state.index + Math.floor(Math.random() * Math.max(list.length - 1, 1)) + 1) % Math.max(list.length, 1);
    } else {
      state.index = (state.index + 1) % Math.max(list.length, 1);
    }
    resetQuestion();
    saveProgress();
    render();
  }

  function setCategory(category) {
    state.category = category;
    state.index = 0;
    resetQuestion();
    saveProgress();
    render();
  }

  function setMode(mode) {
    state.mode = mode;
    resetQuestion();
    saveProgress();
    render();
  }

  function setBlankSide(side) {
    state.blankSide = side;
    resetQuestion();
    saveProgress();
    render();
  }

  function clearProgress() {
    if (!window.confirm("确定要清空本地刷题进度吗？")) return;
    localStorage.removeItem(storageKey);
    state.category = "全部栏目";
    state.mode = "fill";
    state.blankSide = "answer";
    state.index = 0;
    state.correct = 0;
    state.attempts = 0;
    state.streak = 0;
    resetQuestion();
    render();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function render() {
    renderControls();
    renderStats();
    renderQuestion();
  }

  function init() {
    $("bank-count").textContent = bank.length;
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      $("category-select").appendChild(option);
    });
    restoreProgress();
    $("category-select").addEventListener("change", (event) => setCategory(event.target.value));
    $("fill-mode").addEventListener("click", () => setMode("fill"));
    $("choice-mode").addEventListener("click", () => setMode("choice"));
    $("answer-side").addEventListener("click", () => setBlankSide("answer"));
    $("keyword-side").addEventListener("click", () => setBlankSide("keyword"));
    $("shuffle-question").addEventListener("click", () => nextQuestion(true));
    $("next-question").addEventListener("click", () => nextQuestion(false));
    $("clear-progress").addEventListener("click", clearProgress);
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();

// 学習開始
function startLearning() {
  if (categoryCatalog.items.length === 0) {
    return;
  }

  sessionRetryPressCountById = {};
  ensureLearningTimeCounterStarted();
  
  // 完了時カテゴリナビ用アイコンを通常（左＝解答再生・右スペーサー）に戻す
  setLearningNavIconsNormal();
  
  // 元のデータを保存（学習日優先の Plus 用セッションも保持）
  questionList.original = categoryCatalog.items.slice();
  if (isDurationQuestionMethod()) {
    durationMode.sessionItems = questionList.original.slice();
  } else if (isLastDateQuestionMethod()) {
    lastDateMode.sessionItems = questionList.original.slice();
  }
  
  // 選択された問題のみを抽出（未選択時は全問）
  var filteredData = [];
  if (questionList.selected.length === 0) {
    // 未選択時は全問
    filteredData = categoryCatalog.items.slice();
  } else {
    // 選択された問題のみ（元の順序で）
    questionList.selected.sort(function(a, b) { return a - b; }); // インデックスをソート
    questionList.selected.forEach(function(index) {
      if (index >= 0 && index < categoryCatalog.items.length) {
        filteredData.push(categoryCatalog.items[index]);
      }
    });
    // 範囲外の選択だけだと 0 件になり、学習画面が空になる。表示中の全問で開始する
    if (filteredData.length === 0) {
      filteredData = categoryCatalog.items.slice();
      questionList.selected = [];
    }
  }
  
  // フィルタリングされたデータをcategoryCatalog.itemsに設定
  categoryCatalog.items = filteredData;
  
  // 画面遷移
  var screen1 = dom.screen1;
  var screen2 = dom.screen2;
  if (screen1) screen1.classList.remove('active');
  if (screen2) screen2.classList.add('active');
  refreshLoadDiagUi();
  
  // コンテナのパディングを減らす
  var container = document.querySelector('.container');
  if (container) container.classList.add('learning-mode');

  hideLearningCategorySelect();
  
  // カテゴリ情報／出題方法を表示
  var currentCategory = dom.currentCategory;
  if (isCrossCategoryQuestionMethod()) {
    hideLearningCategorySelect();
    if (currentCategory) {
      currentCategory.classList.remove('is-hidden');
      currentCategory.textContent = getCrossCategoryModeLabel();
      currentCategory.style.display = 'block';
      currentCategory.style.width = '100%';
      currentCategory.style.maxWidth = '100%';
      currentCategory.style.minWidth = '0';
      currentCategory.style.whiteSpace = 'pre-wrap';
      currentCategory.style.overflowWrap = 'anywhere';
      currentCategory.style.wordBreak = 'break-word';
      currentCategory.style.overflow = 'visible';
    }
  } else {
    var selectedCategory = categoryCatalog.list.find(function(cat) {
      return cat.no == categoryCatalog.no;
    });
    if (selectedCategory && currentCategory) {
      currentCategory.classList.remove('is-hidden');
      currentCategory.textContent = formatCategoryOptionText(selectedCategory);
      currentCategory.style.display = 'block';
      currentCategory.style.width = '100%';
      currentCategory.style.maxWidth = '100%';
      currentCategory.style.minWidth = '0';
      currentCategory.style.whiteSpace = 'pre-wrap';
      currentCategory.style.overflowWrap = 'anywhere';
      currentCategory.style.wordBreak = 'break-word';
      currentCategory.style.overflow = 'visible';
    }
  }
  
  // 最初の問題を表示
  questionCursor.index = 0;
  questionCursor.item = null;
  
  // 再チャレンジ関連変数をリセット
  retryMode.indices = [];
  retryMode.active = false;
  retryMode.index = 0;
  questionCursor.completed = [];
  studyEnd.done = false;
  
  // 学習完了メッセージを非表示
  hideCompletionMessage();
  
  // 出題ブロックを学習表示用に復帰（完了後カテゴリ切替で畳んでいた場合）
  restoreCompletionStudyFields();
  
  // 出題数表示を更新
  updateQuestionInfoDisplay();
  
  displayQuestion();
  
  // 最初の問題と次の問題をプリロード
  preloadAudioForCurrentAndNext();
  
  // トグルボタンの状態を同期（リスニングON時は出題読みON固定・解答読みON）
  syncQuestionToggleForListeningMode();
  
  // トグルボタンの位置を更新（screen2のタイトル位置に合わせる）
  requestAnimationFrame(function() {
    requestAnimationFrame(syncAppHeaderHeight);
  });
  
  isCategoryTransitionInProgress = false;
  setLearningCategorySelectDisabled(false);
  refreshAdvanceNavControls();
  updateLearningLockedSideMenuControls();
  updateListNavButtons();
}

// 学習時間カウンターを開始（初回の START 相当の学習開始時のみ）
function ensureLearningTimeCounterStarted() {
  if (learningTimer.startTime !== null) {
    return;
  }
  learningTimer.startTime = Date.now();
  startLearningTimeCounter();
}

// 学習時間カウンターを開始
function startLearningTimeCounter() {
  if (learningTimer.interval) {
    return;
  }
  learningTimer.interval = setInterval(function() {
    updateLearningTime();
  }, 1000);
  updateLearningTime();
}

/**
 * 今日学習件数（LastDateが今日の問題数）を反映
 * @param {*} count
 * @param {string} [dateYmd]
 */
function applyTodayStudiedItemCount(count, dateYmd) {
  todayStudy.countDate = dateYmd || getTodayYmdLocal();
  var n = Math.floor(Number(count));
  if (isNaN(n) || n < 0) {
    n = 0;
  }
  todayStudy.itemCount = n;
  updateDailyStudyStatsDisplay();
}

/**
 * 今日の Ans 押下回数を反映
 * @param {*} count
 * @param {string} [dateYmd]
 */
function applyTodayStudiedAnsCount(count, dateYmd) {
  todayStudy.countDate = dateYmd || getTodayYmdLocal();
  var n = Math.floor(Number(count));
  if (isNaN(n) || n < 0) {
    n = 0;
  }
  todayStudy.ansCount = n;
  updateDailyStudyStatsDisplay();
}

/**
 * 表示用の今日学習件数（日付跨ぎなら 0）
 * @returns {number}
 */
function getTodayStudiedItemCountForDisplay() {
  if (todayStudy.countDate !== getTodayYmdLocal()) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(todayStudy.itemCount) || 0));
}

/**
 * 表示用の今日 Ans 回数（日付跨ぎなら 0）
 * @returns {number}
 */
function getTodayStudiedAnsCountForDisplay() {
  if (todayStudy.countDate !== getTodayYmdLocal()) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(todayStudy.ansCount) || 0));
}

/**
 * シート全体のカテゴリ数（END除く）
 * @returns {number}
 */
function getTotalSheetCategoryCount() {
  if (!categoryCatalog.list || categoryCatalog.list.length === 0) {
    return 0;
  }
  var total = 0;
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (!isEndCategory(categoryCatalog.list[i])) {
      total += 1;
    }
  }
  return total;
}

/**
 * シート全体の問題数（ENDカテゴリ除く。getCategories の count 合計）
 * @returns {number}
 */
function getTotalSheetQuestionCount() {
  if (!categoryCatalog.list || categoryCatalog.list.length === 0) {
    return 0;
  }
  var total = 0;
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    var cat = categoryCatalog.list[i];
    if (isEndCategory(cat)) {
      continue;
    }
    var n = Number(cat.count);
    if (!isNaN(n) && n > 0) {
      total += Math.floor(n);
    }
  }
  return total;
}

/**
 * 表示カテゴリの件数と問題数合計
 * @returns {{ categoryCount: number, questionCount: number }}
 */
function getVisibleCategoriesStats() {
  var visible = getVisibleCategories();
  var categoryCount = visible.length;
  var questionCount = 0;
  for (var i = 0; i < visible.length; i++) {
    var n = Number(visible[i].count);
    if (!isNaN(n) && n > 0) {
      questionCount += Math.floor(n);
    }
  }
  return { categoryCount: categoryCount, questionCount: questionCount };
}

/**
 * 画面上の学習統計表示を更新（例：14問｜18問　選択：8/12カテゴリ・50/320問）
 */
function updateDailyStudyStatsDisplay() {
  var el = dom.learningItemCount;
  if (!el) {
    return;
  }
  var itemCount = getTodayStudiedItemCountForDisplay();
  var ansCount = getTodayStudiedAnsCountForDisplay();
  var totalCategories = getTotalSheetCategoryCount();
  var totalQuestions = getTotalSheetQuestionCount();
  var visibleStats = getVisibleCategoriesStats();
  el.textContent = itemCount + '問｜' + ansCount + '問　選択：' +
    visibleStats.categoryCount + '/' + totalCategories + 'カテゴリ・' +
    visibleStats.questionCount + '/' + totalQuestions + '問';
}

/**
 * 今日の学習件数表示を同期（0:00 跨ぎで 0 にし、必要ならカテゴリ再取得）
 */
function syncDailyStudyStatsDisplay() {
  var today = getTodayYmdLocal();
  if (todayStudy.countDate && todayStudy.countDate !== today) {
    recountTodayStudyStatsFromLocalItems();
    return;
  }
  updateDailyStudyStatsDisplay();
}

/**
 * 0:00 跨ぎなどで日付変化を検知して学習個数表示を同期
 */
function startDailyStudyCountDateWatcher() {
  if (todayStudy.dateCheckInterval) {
    return;
  }
  todayStudy.dateCheckInterval = setInterval(function() {
    syncDailyStudyStatsDisplay();
  }, 1000);
}

/**
 * 問題の LastDate が今日（端末ローカル）かどうか
 * @param {Object} item
 * @returns {boolean}
 */
function isItemLastDateToday(item) {
  if (!item) {
    return false;
  }
  var ymd = normalizeToYmd(item.last_date);
  return ymd !== '' && ymd === getTodayYmdLocal();
}

/**
 * Ans 時：今日の学習統計を楽観更新（A=初回のみ+1、B=常に+1。LastDate 更新前に呼ぶ）
 * @param {Object} item
 */
function recordDailyStudyStatsOnAns(item) {
  if (!item) {
    return;
  }
  var today = getTodayYmdLocal();
  if (todayStudy.countDate !== today) {
    todayStudy.countDate = today;
    todayStudy.itemCount = 0;
    todayStudy.ansCount = 0;
  }
  todayStudy.ansCount += 1;
  if (!isItemLastDateToday(item)) {
    todayStudy.itemCount += 1;
  }
  updateDailyStudyStatsDisplay();
}

// 学習時間を更新
function updateLearningTime() {
  syncDailyStudyStatsDisplay();

  if (learningTimer.startTime === null) return;
  
  var elapsed = Date.now() - learningTimer.startTime;
  var totalSeconds = Math.floor(elapsed / 1000);
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  // 100時間未満は2桁、以上は桁を伸ばす
  var hoursText = hours < 100 ? String(hours).padStart(2, '0') : String(hours);
  var timeText = '<学習>' + hoursText + ':' +
    String(minutes).padStart(2, '0') + ':' +
    String(seconds).padStart(2, '0');
  
  // 学習画面の学習時間を更新
  var learningTimeElement = dom.learningTime;
  if (learningTimeElement) {
    learningTimeElement.textContent = timeText;
  }
}

// 問題を表示
function displayQuestion() {
  if (questionCursor.index < 0 || questionCursor.index >= categoryCatalog.items.length) {
    questionCursor.item = null;
    return;
  }
  
  stopCurrentAudioPlayback();
  clearAudioSourceDebug();
  
  var item = categoryCatalog.items[questionCursor.index];
  questionCursor.item = item || null;
  var effectiveQuestion = getEffectiveQuestion(item);
  var isListeningQuestion = isListeningModeEnabled() && effectiveQuestion && !isImageUrl(effectiveQuestion);
  
  // セクションラベルを出題／解答タイトルから設定（入替え対応）
  var questionLabel = dom.questionSectionLabel;
  if (questionLabel) {
    questionLabel.textContent = getEffectiveQTitle(item) || '';
  }
  var answerLabel = dom.answerSectionLabel;
  if (answerLabel) {
    answerLabel.textContent = getEffectiveATitle(item) || '';
  }
  
  // 出題数表示
  updateQuestionInfoDisplay();
  
  // 質問文を表示（画像対応／リスニング時はプレースホルダ）
  var questionText = dom.questionText;
  if (questionText) {
    if (isListeningQuestion) {
      questionText.textContent = LISTENING_PLACEHOLDER_TEXT;
    } else {
      displayImageOrText(questionText, effectiveQuestion);
    }
  }
  
  // 学習回数・最終学習日
  updateLearningMetaDisplay(item, 'learningMeta');
  
  // 上の黒いボックスを表示
  var answerButtonContainer = dom.answerButtonContainer;
  if (answerButtonContainer) answerButtonContainer.style.display = 'block';
  
  // 回答テキストを非表示
  var answerTextDisplay = dom.answerTextDisplay;
  var noteSection = dom.noteSection;
  if (answerTextDisplay) answerTextDisplay.style.display = 'none';
  if (noteSection) noteSection.style.display = 'none';
  learningNote.expanded = false;
  clearNoteClickTimer();
  questionCursor.answerShown = false;
  
  // ストップウォッチ：通常は即開始。リスニング（テキスト出題）は出題音声終了後
  fieldPlay.resetTimer = false;
  resetStopwatch();
  if (isListeningQuestion) {
    fieldPlay.ansGate = true;
  } else {
    fieldPlay.ansGate = false;
    startStopwatch();
  }
  
  // ナビゲーションバーの中央ボタンを Ans に戻す
  updateNavAnswerButton();
  
  // 出題／解答の再生ボタンを更新
  updateFieldPlayButtons();
  
  // ナビゲーションボタンを無効化（Answerボタンが押されるまで）
  var nextButton = document.getElementById('nextButton');
  if (nextButton) nextButton.disabled = true;
  
  // プラスボタンを無効化（出題中）
  var plusButton = dom.plusButton;
  if (plusButton) plusButton.disabled = true;
  
  // 出題読みトグルON、またはリスニング練習モード時は出題を自動再生
  if ((readToggle.question || isListeningQuestion) && effectiveQuestion && !isImageUrl(effectiveQuestion)) {
    if (!isListeningQuestion && readToggle.question) {
      fieldPlay.resetTimer = true;
    }
    setTimeout(function() {
      var currentItem = getCurrentLearningItem();
      if (!currentItem || questionCursor.answerShown) {
        fieldPlay.resetTimer = false;
        if (fieldPlay.ansGate) releaseListeningAnsGate();
        return;
      }
      var text = getEffectiveQuestion(currentItem);
      if (text && !isImageUrl(text)) {
        playFieldAudio('question');
      } else if (fieldPlay.ansGate) {
        releaseListeningAnsGate();
      } else {
        fieldPlay.resetTimer = false;
      }
    }, 250);
  } else if (fieldPlay.ansGate) {
    releaseListeningAnsGate();
  }
  
  // 次の問題をプリロード（バックグラウンドで非同期実行）
  updateFieldEditPencils();
  preloadNextQuestions();
}

/**
 * リスニング練習：出題音声終了（または失敗）後に Ans を有効化し計測開始
 */
function releaseListeningAnsGate() {
  if (!fieldPlay.ansGate) return;
  fieldPlay.ansGate = false;
  if (!questionCursor.answerShown && !studyEnd.done) {
    startStopwatch();
  }
  updateNavAnswerButton();
}

/**
 * 出題読みの自動再生が終わったら計測をゼロから再開（Qボタン聞き直しは対象外）
 */
function resetStopwatchAfterQuestionAutoplay() {
  if (!fieldPlay.resetTimer) return;
  fieldPlay.resetTimer = false;
  if (questionCursor.answerShown || studyEnd.done) return;
  resetStopwatch();
  startStopwatch();
}

/**
 * 出題音声の終了／失敗／中断時。リスニングの Ans 解錠と、出題読みONの計測リセットをまとめる
 * @param {'ended'|'fail'|'abort'} reason
 */
function onQuestionAudioSettled(reason) {
  releaseListeningAnsGate();
  if (reason === 'abort') {
    fieldPlay.resetTimer = false;
    return;
  }
  resetStopwatchAfterQuestionAutoplay();
}

// ストップウォッチを開始
function startStopwatch() {
  if (stopwatch.running) return;
  
  stopwatch.startTime = Date.now() - stopwatch.elapsed;
  stopwatch.running = true;
  stopwatch.interval = setInterval(function() {
    updateStopwatch();
  }, 10);
  updateStopwatch();
}

// ストップウォッチを停止
function stopStopwatch() {
  if (!stopwatch.running) return;
  
  clearInterval(stopwatch.interval);
  stopwatch.elapsed = Date.now() - stopwatch.startTime;
  stopwatch.running = false;
}

// ストップウォッチをリセット
function resetStopwatch() {
  stopStopwatch();
  stopwatch.elapsed = 0;
  var navAnswerStopwatch = dom.navAnswerStopwatch;
  if (navAnswerStopwatch) {
    navAnswerStopwatch.textContent = '00:00:00';
  }
}

// ストップウォッチを更新
function updateStopwatch() {
  if (!stopwatch.running) return;
  
  var elapsed = Date.now() - stopwatch.startTime;
  var totalSeconds = Math.floor(elapsed / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var milliseconds = Math.floor((elapsed % 1000) / 10);
  
  var timeText = String(minutes).padStart(2, '0') + ':' +
                 String(seconds).padStart(2, '0') + ':' +
                 String(milliseconds).padStart(2, '0');
  
  // ナビゲーションバーのAnswerボタン内のストップウォッチを更新
  var navAnswerStopwatch = dom.navAnswerStopwatch;
  if (navAnswerStopwatch) {
    navAnswerStopwatch.textContent = timeText;
  }
}

// 答えを表示
function showAnswer() {
  if (questionCursor.answerShown) return;
  if (fieldPlay.ansGate) return;
  
  fieldPlay.resetTimer = false;
  fieldPlay.ansGate = false;
  stopStopwatch();
  
  var item = getCurrentLearningItem();
  if (!item) return;
  var effectiveQuestion = getEffectiveQuestion(item);
  var effectiveAnswer = getEffectiveAnswer(item);
  var isListeningQuestion = isListeningModeEnabled() && effectiveQuestion && !isImageUrl(effectiveQuestion);
  
  // 上の黒いボックスを非表示
  var answerButtonContainer = dom.answerButtonContainer;
  if (answerButtonContainer) answerButtonContainer.style.display = 'none';
  
  // リスニング練習モード時は出題側にも文字を表示
  if (isListeningQuestion) {
    var questionText = dom.questionText;
    if (questionText) {
      displayImageOrText(questionText, effectiveQuestion);
    }
  }
  
  // 回答文を表示（画像対応・入替え対応）
  var answerTextDisplay = dom.answerTextDisplay;
  if (answerTextDisplay) {
    displayImageOrText(answerTextDisplay, effectiveAnswer);
    answerTextDisplay.classList.remove('answer-hidden');
    answerTextDisplay.style.display = 'block';
  }
  
  // noteを常に表示（空欄／閉じ／開き。問題切替・Ans直後は閉じ）
  learningNote.expanded = false;
  applyLearningNoteDisplay(item);
  var noteSection = dom.noteSection;
  if (noteSection) noteSection.style.display = 'block';
  
  questionCursor.answerShown = true;
  
  // 中央ボタンを Next に切り替え（時間表示は維持）
  updateNavAnswerButton();
  
  // 今日の学習統計（LastDate 更新前に判定）
  recordDailyStudyStatsOnAns(item);

  // 解答読みON時は音声を先に開始し、シート更新は音声のネット取得完了後（上限あり）に回す
  var willAutoPlayAnswer = readToggle.answer && !updateMode.active;
  if (willAutoPlayAnswer) {
    persistAnsStudyStatsAsync(item, stopwatch.elapsed, { deferNetwork: true });
    playFieldAudio('answer', false, {
      onSettled: function() {
        flushPendingAnsSheetPersist();
      }
    });
  } else {
    persistAnsStudyStatsAsync(item, stopwatch.elapsed);
  }

  updateLearningMetaDisplay(item, 'learningMeta');
  
  // 出題／解答の再生ボタンを更新
  updateFieldPlayButtons();
  
  // ナビゲーションボタンを有効化（busy 中は Next/Plus/HOME も抑止）
  updateNavigationButtons();
  
  // プラスボタンを有効化（回答表示中、学習完了でない場合）
  updatePlusButton();
  
  // 出題／解答／note の編集・note開閉を有効化
  setupFieldEditDoubleClick();
}

/**
 * note シングルクリック判別タイマーをクリア
 */
function clearNoteClickTimer() {
  if (learningNote.clickTimer) {
    clearTimeout(learningNote.clickTimer);
    learningNote.clickTimer = null;
  }
}

/**
 * 学習画面の note 表示を反映（空欄／閉じ／開き）
 * @param {Object} item
 */
function applyLearningNoteDisplay(item) {
  var noteText = dom.noteText;
  if (!noteText) {
    return;
  }
  var noteValue = item && item.note != null ? String(item.note) : '';
  var isNoteEmpty = !noteValue.trim();
  
  noteText.classList.remove('note-empty', 'note-collapsed', 'note-expanded');
  
  if (isNoteEmpty) {
    learningNote.expanded = false;
    noteText.textContent = '';
    noteText.classList.add('note-empty');
    noteText.removeAttribute('aria-expanded');
    noteText.removeAttribute('role');
    noteText.tabIndex = -1;
    return;
  }

  noteText.removeAttribute('role');
  noteText.tabIndex = -1;
  if (learningNote.expanded) {
    noteText.textContent = noteValue;
    noteText.classList.add('note-expanded');
    noteText.removeAttribute('aria-expanded');
  } else {
    noteText.textContent = learningNote.collapsedHint;
    noteText.classList.add('note-collapsed');
    noteText.removeAttribute('aria-expanded');
  }
}

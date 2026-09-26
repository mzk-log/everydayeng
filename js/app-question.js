// ========================================
// 出題設定（入替え・リスニング・出題方法）
// ========================================

/** 出題方法の有効値 */
var QUESTION_METHOD_VALUES = {
  category: true,         // カテゴリ毎（ノーマル）
  categoryShuffle: true,  // カテゴリ毎（シャッフル）
  lastDate: true,         // 学習日優先（シャッフル）
  lastDateNormal: true,   // 学習日優先（ノーマル）
  duration: true          // 解答時間優先
};

/**
 * 出題方法を取得（未設定・不正値は category）
 * @returns {string} 'category' | 'categoryShuffle' | 'lastDate' | 'lastDateNormal' | 'duration'
 */
function getQuestionMethod() {
  try {
    var value = localStorage.getItem('practiceQuestionMethod');
    if (value && QUESTION_METHOD_VALUES[value]) {
      return value;
    }
  } catch (e) {
    // ignore
  }
  return 'category';
}

/**
 * 出題方法ラジオUIを同期
 * @param {string} method
 */
function updateQuestionMethodRadios(method) {
  var radios = document.querySelectorAll('input[name="questionMethod"]');
  radios.forEach(function(radio) {
    radio.checked = (radio.value === method);
  });
}

/**
 * 出題方法を保存し、画面を切替
 * @param {string} method - 'category' | 'categoryShuffle' | 'lastDate' | 'lastDateNormal' | 'duration'
 */
function setQuestionMethod(method) {
  if (isQuestionMethodLockedOnLearningScreen()) {
    updateQuestionMethodRadios(getQuestionMethod());
    updateLearningLockedSideMenuControls();
    return;
  }
  var next = QUESTION_METHOD_VALUES[method] ? method : 'category';
  try {
    localStorage.setItem('practiceQuestionMethod', next);
  } catch (e) {
    // localStorageが使えない場合は無視
  }
  updateQuestionMethodRadios(next);
  applyQuestionMethodModeUi();
  scheduleUserSettingsSync();
  
  if (next === 'duration') {
    loadDurationModeData({ resetPage: true, resort: true, forceFetch: true, pageLoading: true });
  } else if (next === 'lastDate' || next === 'lastDateNormal') {
    loadLastDateModeData({ regenerate: true, forceFetch: true, pageLoading: true });
  } else {
    // カテゴリ毎（ノーマル／シャッフル）：選択中カテゴリを再読込（シャッフル時は再シャッフル、ノーマルはシート順）
    restoreCategoryModeListFromSelection();
  }
}

/**
 * 学習画面（screen2）表示中は出題方法の変更をロックする
 * @returns {boolean}
 */
function isQuestionMethodLockedOnLearningScreen() {
  var screen2 = dom.screen2;
  return !!(screen2 && screen2.classList.contains('active'));
}

/**
 * 解答時間優先モードか
 * @returns {boolean}
 */
function isDurationQuestionMethod() {
  return getQuestionMethod() === 'duration';
}

/**
 * カテゴリ毎（シャッフル）か
 * @returns {boolean}
 */
function isCategoryShuffleQuestionMethod() {
  return getQuestionMethod() === 'categoryShuffle';
}

/**
 * 学習日優先（シャッフル／ノーマル）か
 * @returns {boolean}
 */
function isLastDateQuestionMethod() {
  var method = getQuestionMethod();
  return method === 'lastDate' || method === 'lastDateNormal';
}

/**
 * 学習日優先（シャッフル）か
 * @returns {boolean}
 */
function isLastDateShuffleQuestionMethod() {
  return getQuestionMethod() === 'lastDate';
}

/**
 * 学習日優先（ノーマル）か
 * @returns {boolean}
 */
function isLastDateNormalQuestionMethod() {
  return getQuestionMethod() === 'lastDateNormal';
}

/**
 * カテゴリ横断モード（解答時間優先／学習日優先）か
 * @returns {boolean}
 */
function isCrossCategoryQuestionMethod() {
  return isDurationQuestionMethod() || isLastDateQuestionMethod();
}

/**
 * 出題方法モードの表示ラベル（横断モード用）
 * @returns {string}
 */
function getCrossCategoryModeLabel() {
  if (isLastDateNormalQuestionMethod()) {
    return '学習日優先（ノーマル）';
  }
  if (isLastDateShuffleQuestionMethod()) {
    return '学習日優先（シャッフル）';
  }
  if (isDurationQuestionMethod()) {
    return '解答時間優先モード';
  }
  return '';
}

/**
 * Categoryセクション見出し（◆付きはCSS）
 * @returns {string}
 */
function getCategorySectionLabelText() {
  if (isCrossCategoryQuestionMethod()) {
    return '出題方法';
  }
  if (isCategoryShuffleQuestionMethod()) {
    return 'Category（シャッフル）';
  }
  return 'Category（ノーマル）';
}

/**
 * 出題方法に応じて Category 欄／モード表示を切替
 */
function applyQuestionMethodModeUi() {
  var isCross = isCrossCategoryQuestionMethod();
  var selectContainer = dom.categorySelectContainer;
  var modeLabel = dom.questionMethodModeLabel;
  var sectionLabel = dom.categorySectionLabel;
  var learningSelectContainer = dom.learningCategorySelectContainer;
  var currentCategory = dom.currentCategory;
  var modeLabelText = getCrossCategoryModeLabel();
  var categorySectionText = getCategorySectionLabelText();
  
  if (selectContainer) {
    selectContainer.style.display = isCross ? 'none' : '';
  }
  if (modeLabel) {
    modeLabel.style.display = isCross ? 'block' : 'none';
    modeLabel.textContent = modeLabelText;
  }
  if (sectionLabel) {
    sectionLabel.textContent = categorySectionText;
  }
  var learningSectionLabel = dom.learningCategorySectionLabel;
  if (learningSectionLabel) {
    learningSectionLabel.textContent = categorySectionText;
  }
  
  if (isCross) {
    if (learningSelectContainer) learningSelectContainer.style.display = 'none';
    if (currentCategory) {
      currentCategory.classList.remove('is-hidden');
      currentCategory.style.display = 'block';
      currentCategory.textContent = modeLabelText;
    }
  } else if (!studyEnd.done) {
    if (currentCategory && currentCategory.classList.contains('is-hidden') === false) {
      // 学習中のカテゴリ表示は startLearning 側で設定
    }
  }
}

/**
 * カテゴリ毎モードへ戻すときのList復元
 */
function restoreCategoryModeListFromSelection() {
  var select = dom.categorySelect;
  var categoryNo = select ? select.value : '';
  durationMode.sortedItems = [];
  durationMode.pageIndex = 0;
  durationMode.sessionItems = [];
  studyEnd.durationSession = false;
  lastDateMode.allItems = [];
  lastDateMode.sessionItems = [];
  lastDateMode.pageIndex = 0;
  lastDateMode.needsResort = false;
  studyEnd.lastDateSession = false;
  studyEnd.categorySession = false;
  applyQuestionMethodModeUi();
  
  if (categoryNo) {
    loadCategoryData(categoryNo);
  } else {
    categoryCatalog.items = [];
    questionList.selected = [];
    var listMessage = dom.listMessage;
    var listContainer = dom.listContainer;
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = 'Categoryを選択してください。';
    }
    if (listContainer) listContainer.style.display = 'none';
    setStartButtonVisible(false);
    updateListNavButtons();
  }
}

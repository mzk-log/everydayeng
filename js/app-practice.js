function isSwapQAEnabled() {
  try {
    return localStorage.getItem('practiceSwapQA') === 'on';
  } catch (e) {
    return false;
  }
}

function isListeningModeEnabled() {
  try {
    return localStorage.getItem('practiceListeningMode') === 'on';
  } catch (e) {
    return false;
  }
}

function getEffectiveQuestion(item) {
  if (!item) return '';
  if (isSwapQAEnabled()) {
    return item.answer || '';
  }
  return item.question || item.Question || '';
}

function getEffectiveAnswer(item) {
  if (!item) return '';
  if (isSwapQAEnabled()) {
    return item.question || item.Question || '';
  }
  return item.answer || '';
}

function getEffectiveQTitle(item) {
  if (!item) return '';
  if (isSwapQAEnabled()) {
    return item.a_title || '';
  }
  return item.q_title || '';
}

function getEffectiveATitle(item) {
  if (!item) return '';
  if (isSwapQAEnabled()) {
    return item.q_title || '';
  }
  return item.a_title || '';
}

function updatePracticeSettingButtons(setting, isOn) {
  var buttons = document.querySelectorAll('.practice-setting-button[data-setting="' + setting + '"]');
  buttons.forEach(function(button) {
    var shouldActive = (button.dataset.value === 'on') === isOn;
    if (shouldActive) {
      button.classList.add('practice-setting-button-active');
    } else {
      button.classList.remove('practice-setting-button-active');
    }
  });
}

function loadPracticeSettings() {
  updatePracticeSettingButtons('swapQA', isSwapQAEnabled());
  updatePracticeSettingButtons('listeningMode', isListeningModeEnabled());
  updateQuestionMethodRadios(getQuestionMethod());
  applyQuestionMethodModeUi();
  updateLearningLockedSideMenuControls();
}

function setPracticeSetting(setting, isOn) {
  var key = setting === 'swapQA' ? 'practiceSwapQA' : 'practiceListeningMode';
  try {
    localStorage.setItem(key, isOn ? 'on' : 'off');
    scheduleUserSettingsSync();
  } catch (e) {
    // localStorageが使えない場合は無視
  }
  updatePracticeSettingButtons(setting, isOn);
  
  if (setting === 'listeningMode') {
    syncQuestionToggleForListeningMode();
  }
  
  // TOP画面のList表示を更新（学習中の現在問題は次問から反映）
  var screen1 = dom.screen1;
  if (screen1 && screen1.classList.contains('active') && categoryCatalog.items.length > 0) {
    if (setting === 'listeningMode' || setting === 'swapQA') {
      refreshHomeListForPracticeSettings();
    }
  }
}

/**
 * 出題読み／解答読みトグルの localStorage キー
 * @param {'question'|'answer'} type
 * @returns {string}
 */
function getReadToggleStorageKey(type) {
  return type === 'answer' ? 'readToggle_answer' : 'readToggle_question';
}

/**
 * 出題読み／解答読みトグルを保存
 * @param {'question'|'answer'} type
 * @param {boolean} isOn
 */
function saveReadToggle(type, isOn) {
  try {
    localStorage.setItem(getReadToggleStorageKey(type), isOn ? 'on' : 'off');
    scheduleUserSettingsSync();
  } catch (e) {
    // localStorage が使えない場合は無視
  }
}

/**
 * 出題読み／解答読みトグルを取得（未設定は off）
 * @param {'question'|'answer'} type
 * @returns {boolean}
 */
function getReadToggle(type) {
  try {
    return localStorage.getItem(getReadToggleStorageKey(type)) === 'on';
  } catch (e) {
    return false;
  }
}

/**
 * 出題読み／解答読みトグルの見た目を現在値に合わせる（ロック状態は触らない）
 */
function applyReadToggleButtonUi() {
  var questionToggleButton = dom.questionToggleButton;
  var answerToggleButton = dom.answerToggleButton;
  if (questionToggleButton) {
    if (readToggle.question) {
      questionToggleButton.classList.add('active');
    } else {
      questionToggleButton.classList.remove('active');
    }
  }
  if (answerToggleButton) {
    if (readToggle.answer) {
      answerToggleButton.classList.add('active');
    } else {
      answerToggleButton.classList.remove('active');
    }
  }
}

/**
 * 出題読み／解答読みトグルを localStorage から読み込み
 */
function loadReadToggles() {
  readToggle.question = getReadToggle('question');
  readToggle.answer = getReadToggle('answer');
  applyReadToggleButtonUi();
}

/**
 * リスニング練習モードに応じて出題／解答読みトグルを同期する
 * ON時：出題読みはON固定、解答読みは切替時にON（以降は切り替え可能）
 * OFF時：固定解除し、それぞれON前の状態へ戻す（localStorage の保存値は上書きしない）
 */
function syncQuestionToggleForListeningMode() {
  var questionToggleButton = dom.questionToggleButton;
  var answerToggleButton = dom.answerToggleButton;
  
  if (isListeningModeEnabled()) {
    // 出題読み：常にON固定
    if (readToggle.questionBeforeListening === null) {
      readToggle.questionBeforeListening = readToggle.question;
    }
    readToggle.question = true;
    
    // 解答読み：リスニングON切替時のみON。以降の再同期ではユーザ操作を維持
    if (readToggle.answerBeforeListening === null) {
      readToggle.answerBeforeListening = readToggle.answer;
      readToggle.answer = true;
    }
    
    if (questionToggleButton) {
      questionToggleButton.classList.add('active');
      questionToggleButton.classList.add('is-locked');
      questionToggleButton.setAttribute('aria-disabled', 'true');
      questionToggleButton.title = 'リスニング練習中は出題読みON固定';
    }
    if (answerToggleButton) {
      if (readToggle.answer) {
        answerToggleButton.classList.add('active');
      } else {
        answerToggleButton.classList.remove('active');
      }
      answerToggleButton.classList.remove('is-locked');
      answerToggleButton.removeAttribute('aria-disabled');
      answerToggleButton.title = '';
    }
    return;
  }
  
  if (readToggle.questionBeforeListening !== null) {
    readToggle.question = readToggle.questionBeforeListening;
    readToggle.questionBeforeListening = null;
  }
  if (readToggle.answerBeforeListening !== null) {
    readToggle.answer = readToggle.answerBeforeListening;
    readToggle.answerBeforeListening = null;
  }
  
  if (questionToggleButton) {
    questionToggleButton.classList.remove('is-locked');
    questionToggleButton.removeAttribute('aria-disabled');
    questionToggleButton.title = '';
  }
  if (answerToggleButton) {
    answerToggleButton.classList.remove('is-locked');
    answerToggleButton.removeAttribute('aria-disabled');
    answerToggleButton.title = '';
  }
  applyReadToggleButtonUi();
}

function refreshHomeListForPracticeSettings() {
  if (categoryCatalog.items.length === 0) return;
  // 入替え／リスニング切替時も List は通常どおり再描画（選択状態は維持）
  displayList();
}

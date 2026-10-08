function getEventElement_(target) {
  if (!target) {
    return null;
  }
  if (target.nodeType === 1) {
    return target;
  }
  return target.parentElement || null;
}

function isLearningBodyGestureIgnoreTarget_(el) {
  if (!el || typeof el.closest !== 'function') {
    return true;
  }
  if (el.closest('#learningCategorySection')) {
    return true;
  }
  if (el.closest('.field-edit-pencil')) {
    return true;
  }
  if (el.closest('.field-text-edit')) {
    return true;
  }
  if (el.closest('.field-update-controls')) {
    return true;
  }
  if (el.closest('.navigation-bar')) {
    return true;
  }
  return false;
}

function bindLearningBodyGestures() {
  var root = dom.screen2;
  if (!root || root.getAttribute('data-learn-gesture-bound') === '1') {
    return;
  }
  root.setAttribute('data-learn-gesture-bound', '1');

  var pressActive = false;
  var startX = 0;
  var startY = 0;
  var moved = false;
  var tapCount = 0;
  var tapTimer = null;

  function clearTapTimer_() {
    if (tapTimer) {
      clearTimeout(tapTimer);
      tapTimer = null;
    }
  }

  function replayFieldFromBodyDoubleTap_() {
    var fieldType = questionCursor.answerShown ? 'answer' : 'question';
    var btn = fieldType === 'answer' ? dom.answerPlayButton : dom.questionPlayButton;
    if (!btn || btn.disabled) {
      return;
    }
    playFieldAudio(fieldType, false);
  }

  function isLearningScreenActive() {
    var s2 = dom.screen2;
    return !!(s2 && s2.classList.contains('active'));
  }

  function fireBodyTapSequence_() {
    var count = tapCount;
    tapTimer = null;
    tapCount = 0;
    if (!isLearningScreenActive() || updateMode.active) {
      return;
    }
    if (count >= 3) {
      var plus = dom.plusButton;
      if (!plus || plus.disabled) {
        return;
      }
      playRetrySfxThen(handlePlusButtonClick);
      return;
    }
    if (count === 2 && !studyEnd.done) {
      replayFieldFromBodyDoubleTap_();
      return;
    }
    if (count >= 1) {
      handleNavAnswerButtonClick();
    }
  }

  function armBodyTapTimer_() {
    clearTapTimer_();
    if (tapCount <= 0) {
      return;
    }
    tapTimer = setTimeout(fireBodyTapSequence_, LEARNING_BODY_DOUBLE_TAP_MS);
  }

  root.addEventListener('pointerdown', function(e) {
    if (typeof e.button === 'number' && e.button !== 0) {
      return;
    }
    if (!isLearningScreenActive() || updateMode.active) {
      return;
    }
    var el = getEventElement_(e.target);
    if (isLearningBodyGestureIgnoreTarget_(el)) {
      return;
    }
    pressActive = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    clearTapTimer_();
  });

  root.addEventListener('pointermove', function(e) {
    if (!pressActive) {
      return;
    }
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if ((dx * dx + dy * dy) > (LEARNING_GESTURE_MOVE_PX * LEARNING_GESTURE_MOVE_PX)) {
      moved = true;
    }
  });

  function endPress(e) {
    var wasActive = pressActive;
    var wasMoved = moved;
    pressActive = false;
    if (!wasActive) {
      return;
    }
    if (!isLearningScreenActive() || updateMode.active) {
      armBodyTapTimer_();
      return;
    }
    var el = getEventElement_(e && e.target);
    if (wasMoved || isLearningBodyGestureIgnoreTarget_(el)) {
      armBodyTapTimer_();
      return;
    }
    tapCount += 1;
    if (tapCount >= 3) {
      fireBodyTapSequence_();
      return;
    }
    armBodyTapTimer_();
  }

  root.addEventListener('pointerup', endPress);
  root.addEventListener('pointercancel', function() {
    if (!pressActive) {
      return;
    }
    pressActive = false;
    armBodyTapTimer_();
  });
}

function updateFieldEditPencils() {
  var show = !updateMode.active && !studyEnd.done && questionCursor.answerShown;
  var q = dom.questionEditPencil;
  var a = dom.answerEditPencil;
  if (q) {
    q.hidden = !show;
  }
  if (a) {
    var ans = dom.answerTextDisplay;
    a.hidden = !show || !ans || ans.style.display === 'none';
  }
  var eye = dom.noteEyeButton;
  var notePencil = dom.noteEditPencil;
  var noteItem = getCurrentLearningItem();
  var hasNote = !!(noteItem && String(noteItem.note || '').trim());
  if (eye) {
    eye.hidden = !(show && hasNote && !learningNote.expanded);
  }
  if (notePencil) {
    notePencil.hidden = !(show && (!hasNote || learningNote.expanded));
  }
}

/**
 * Ans 後の次へ系操作が音声処理中にブロックされるか
 * @returns {boolean}
 */
function isAdvanceNavBlockedByAudio() {
  return !studyEnd.done && questionCursor.answerShown && isFieldAudioBusy();
}

/**
 * 学習完了画面の Category ドロップダウン有効／無効
 * @param {boolean} disabled
 */
function setLearningCategorySelectDisabled(disabled) {
  var learningSelect = dom.learningCategorySelect;
  if (!learningSelect) return;
  learningSelect.disabled = !!disabled;
  syncCustomCategorySelect(learningSelect);
}

/**
 * HOME ボタンの有効／無効を更新
 */
function updateHomeButton() {
  var homeButton = dom.homeButton;
  if (!homeButton) return;
  
  var blocked = false;
  var title = '';
  
  if (isCategoryTransitionInProgress) {
    blocked = true;
    title = 'カテゴリの切り替え中です';
  } else if (isFieldAudioBusy()) {
    blocked = true;
    title = '音声の読み上げが終わるまでお待ちください';
  }
  
  homeButton.disabled = blocked;
  if (title) {
    homeButton.title = title;
  } else {
    homeButton.removeAttribute('title');
  }
}

/**
 * 音声状態・カテゴリ切替に応じて進行系ナビを再評価
 */
function refreshAdvanceNavControls() {
  if (isRefreshingAdvanceNavControls) return;
  isRefreshingAdvanceNavControls = true;
  try {
    updateNavigationButtons();
    updatePlusButton();
    updateHomeButton();
  } finally {
    isRefreshingAdvanceNavControls = false;
  }
}


/**
 * ヘッダーにフロント版を表示（タイトル右／狭い幅ではタイトル下）
 */
function syncAppHeaderVersionDisplay() {
  var el = dom.appHeaderVersion;
  if (!el) {
    return;
  }
  var ver = (typeof window.APP_FRONT_VERSION === 'string' && window.APP_FRONT_VERSION)
    ? window.APP_FRONT_VERSION
    : '';
  el.textContent = ver;
}

// 共通ヘッダーの高さを CSS 変数に反映
function syncAppHeaderHeight() {
  var header = dom.appHeader;
  if (!header) return;
  document.documentElement.style.setProperty('--app-header-height', header.offsetHeight + 'px');
}

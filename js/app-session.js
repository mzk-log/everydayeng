/**
 * 学習中（screen2・未完了）。全問再取得の後着で出題順を変えない判定に使う
 * @returns {boolean}
 */
function isActiveLearningSession() {
  return isQuestionMethodLockedOnLearningScreen() && !studyEnd.done;
}

/**
 * 画面に出している問題。学習中は questionCursor.item を優先
 * @returns {Object|null}
 */
function getCurrentLearningItem() {
  if (questionCursor.item) {
    return questionCursor.item;
  }
  if (questionCursor.index >= 0 && questionCursor.index < categoryCatalog.items.length) {
    return categoryCatalog.items[questionCursor.index];
  }
  return null;
}

/**
 * 学習中に変更すべきでないサイドメニュー項目の有効／無効を更新
 */
function updateLearningLockedSideMenuControls() {
  var locked = isQuestionMethodLockedOnLearningScreen();
  var item = dom.questionMethodSettingItem;
  var radios = document.querySelectorAll('input[name="questionMethod"]');
  var lockTitle = '学習中は出題方法を変更できません。HOMEへ戻ってから変更してください。';
  
  if (item) {
    if (locked) {
      item.classList.add('is-locked');
      item.title = lockTitle;
    } else {
      item.classList.remove('is-locked');
      item.removeAttribute('title');
    }
  }
  radios.forEach(function(radio) {
    radio.disabled = locked;
    if (locked) {
      radio.setAttribute('title', lockTitle);
    } else {
      radio.removeAttribute('title');
    }
  });
  updateVisibleCategoriesMenuLock();
}

/**
 * 表示カテゴリ設定は HOME 時のみ操作可能
 */
function updateVisibleCategoriesMenuLock() {
  var locked = !isHomeScreenActive();
  var container = dom.visibleCategoriesItemContainer;
  var button = dom.visibleCategoriesButton;
  var lockTitle = '表示カテゴリはHOME画面でのみ変更できます。';
  
  if (locked) {
    closeVisibleCategoriesSubmenu();
  }
  if (container) {
    if (locked) {
      container.classList.add('is-locked');
    } else {
      container.classList.remove('is-locked');
    }
  }
  if (button) {
    button.disabled = locked;
    if (locked) {
      button.title = lockTitle;
    } else {
      button.removeAttribute('title');
    }
  }
  updateAddStudyItemMenuLock();
}

/**
 * 問題追加は HOME 時のみ
 */
function updateAddStudyItemMenuLock() {
  var locked = !isHomeScreenActive();
  var container = dom.addStudyItemItemContainer;
  var button = dom.addStudyItemMenuButton;
  var lockTitle = '問題の追加はHOME画面でのみできます。';
  if (container) {
    if (locked) {
      container.classList.add('is-locked');
    } else {
      container.classList.remove('is-locked');
    }
  }
  if (button) {
    button.disabled = locked;
    if (locked) {
      button.title = lockTitle;
    } else {
      button.removeAttribute('title');
    }
  }
}

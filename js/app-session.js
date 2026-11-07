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
  updateAudioDownloadMenuLock();
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
  updateAudioDownloadMenuLock();
}

/**
 * 音声ダウンロード：メニュー文言とヘッダートグルを同期（HOME／学習とも操作可）
 */
function updateAudioDownloadMenuLock() {
  var container = dom.audioDownloadMenuItemContainer;
  var button = dom.audioDownloadMenuButton;
  var label = dom.audioDownloadMenuButtonText;
  var headerToggle = dom.audioDownloadToggleButton;
  var hintTitle = '音声のDrive／TTS取得のみ。表やAnsの通信は対象外';
  var on = typeof isAudioDownloadEnabled === 'function' && isAudioDownloadEnabled();
  if (container) {
    container.classList.remove('is-locked');
  }
  if (label) {
    label.textContent = on ? '音声ダウンロード ON' : '音声ダウンロード OFF';
  }
  if (button) {
    button.disabled = false;
    button.title = hintTitle;
  }
  if (headerToggle) {
    headerToggle.classList.toggle('active', on);
    headerToggle.setAttribute('aria-pressed', on ? 'true' : 'false');
    headerToggle.title = hintTitle;
  }
  if (typeof syncAudioStockStatusUi === 'function') {
    syncAudioStockStatusUi();
  }
}

/**
 * 音声ダウンロード ON/OFF（セッション限定・HOME／学習とも可）
 */
function toggleAudioDownloadEnabled() {
  if (typeof isAppAuthUiLocked === 'function' && isAppAuthUiLocked()) {
    return;
  }
  audioDownloadEnabled = !audioDownloadEnabled;
  updateAudioDownloadMenuLock();
  if (!isAudioDownloadEnabled()) {
    if (typeof abortRunningAudioPrefetch === 'function') {
      abortRunningAudioPrefetch();
    }
    if (typeof invalidateGasAudioFetches === 'function') {
      // 先読み・準備中の Drive／TTS を止める
      invalidateGasAudioFetches();
    }
  }
  var onHome = typeof isHomeScreenActive === 'function' && isHomeScreenActive();
  function afterIdb() {
    if (onHome) {
      if (typeof clearSelection === 'function') {
        clearSelection();
      } else {
        questionList.selected = [];
      }
      if (typeof refreshVisibleCategoriesRuntimeUi === 'function') {
        refreshVisibleCategoriesRuntimeUi();
      } else if (typeof syncDailyStudyStatsDisplay === 'function') {
        syncDailyStudyStatsDisplay();
      }
    } else if (typeof refreshLearningIdbStatusUi === 'function') {
      refreshLearningIdbStatusUi();
    }
    if (isAudioDownloadEnabled()) {
      if (typeof scheduleAudioPrefetch === 'function') {
        scheduleAudioPrefetch();
      }
      if (typeof fetchDriveAudioCoverage === 'function') {
        fetchDriveAudioCoverage();
      }
    } else if (onHome && typeof showError === 'function') {
      var visible = (typeof getVisibleCategories === 'function') ? getVisibleCategories() : [];
      if (!visible.length) {
        showError('端末に音声がある問題がありません。Wi‑Fi等で音声ダウンロードをONにして取得してください。');
      } else {
        showError('端末に音声がある問題だけ表示します。');
      }
    }
  }
  if (typeof refreshAudioIdbStats === 'function') {
    refreshAudioIdbStats(afterIdb);
    return;
  }
  afterIdb();
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

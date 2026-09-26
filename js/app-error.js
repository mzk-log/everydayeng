// エラーを表示
// エラーメッセージの配列（複数エラーを管理）
var errorMessages = [];

function showError(message) {
  var msg = message != null ? String(message) : '';
  // GAS の Google認証失敗／未許可時はデータ破棄＋操作不可＋再ログイン
  if (isGoogleAuthFailureMessage(msg)) {
    enforceGoogleAuthFailureLock(msg);
  }

  // 既存のエラーメッセージコンテナを取得または作成
  var container = document.querySelector('.container');
  if (!container) return;
  
  var errorContainer = document.getElementById('errorContainer');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'errorContainer';
    container.insertBefore(errorContainer, container.firstChild);
  }
  
  // エラーメッセージを配列に追加
  errorMessages.push(message);
  
  // エラーメッセージを再描画
  renderErrorMessages();
}

/**
 * GAS の Google 認証エラーメッセージか（未許可含む）
 * @param {string} message
 * @returns {boolean}
 */
function isGoogleAuthFailureMessage(message) {
  var msg = String(message || '');
  return msg.indexOf('idToken') >= 0 ||
    msg.indexOf('accessToken') >= 0 ||
    msg.indexOf('sessionToken') >= 0 ||
    msg.indexOf('Session expired') >= 0 ||
    msg.indexOf('Google token') >= 0 ||
    msg.indexOf('sign in with Google') >= 0 ||
    msg.indexOf('sign in again') >= 0 ||
    msg.indexOf('Email does not match Google') >= 0 ||
    msg.indexOf('Email not authorized') >= 0;
}

/**
 * 認証失敗／未許可時：学習データを破棄し TOP を操作不可にしてログイン必須にする
 * @param {string} rawMessage
 */
function enforceGoogleAuthFailureLock(rawMessage) {
  if (googleLogin.lockInProgress) {
    return;
  }
  googleLogin.lockInProgress = true;
  try {
    clearAllGoogleAuthTokens();
    clearAppSessionToken();
    clearAppSessionDataAfterAuthFailure();
    hidePageLoading();
    // 未許可アカウントの自動再ログインを防ぐ
    disableGoogleAutoSelect();
    showGoogleLoginDialog({ cancellable: true });
    var friendly = (String(rawMessage || '').indexOf('Email not authorized') >= 0)
      ? 'このGoogleアカウントは利用許可されていません。管理者に連絡するか、許可済みアカウントでログインしてください。'
      : '認証に失敗しました。再度Googleアカウントでログインしてください。';
    setGoogleLoginError(friendly);
  } finally {
    googleLogin.lockInProgress = false;
  }
}

/**
 * 認証失敗・アカウント切替時に、操作可能な学習／List 状態を破棄する
 */
function clearAppSessionDataAfterAuthFailure() {
  stopCurrentAudioPlayback();
  stopUiClickSfx();
  stopCompletionSfx();
  stopStopwatch();
  setLearningNavIconsNormal();

  var screen2 = dom.screen2;
  var screen1 = dom.screen1;
  if (screen2) {
    screen2.classList.remove('active');
    screen2.classList.remove('is-learning-completed');
  }
  if (screen1) {
    screen1.classList.add('active');
  }
  var container = document.querySelector('.container');
  if (container) {
    container.classList.remove('learning-mode');
  }

  categoryCatalog.list = [];
  categoryCatalog.byNo = {};
  categoryCatalog.items = [];
  categoryCatalog.no = null;
  questionList.selected = [];
  questionList.original = [];
  questionCursor.index = 0;
  questionCursor.item = null;
  questionCursor.completed = [];
  gasSheetUpdate.okCount = 0;
  gasSheetUpdate.failCount = 0;
  loadDiagHistory = [];
  ansSheetPersist.pending = null;
  if (ansSheetPersist.timer) {
    clearTimeout(ansSheetPersist.timer);
    ansSheetPersist.timer = null;
  }
  retryMode.indices = [];
  sessionRetryPressCountById = {};
  retryMode.active = false;
  retryMode.index = 0;
  questionCursor.answerShown = false;
  studyEnd.done = false;
  studyEnd.categoryNo = null;
  studyEnd.durationSession = false;
  studyEnd.lastDateSession = false;
  studyEnd.categorySession = false;
  isCategoryTransitionInProgress = false;
  studyEnd.fieldsCollapsed = false;
  studyEnd.browseStarted = false;
  durationMode.sortedItems = [];
  lastDateMode.allItems = [];
  localStudy.items = null;
  durationMode.sessionItems = [];
  lastDateMode.sessionItems = [];
  durationMode.pageIndex = 0;
  lastDateMode.pageIndex = 0;
  todayStudy.itemCount = 0;
  todayStudy.ansCount = 0;

  hideCompletionMessage();
  hideLearningCategorySelect();
  hideCompletionListSection();
  restoreCompletionStudyFields();

  var select = dom.categorySelect;
  if (select) {
    select.innerHTML = '<option value="">Categoryを選択してください</option>';
    select.value = '';
    select.disabled = true;
    syncCustomCategorySelect(select);
  }
  resetListDisplay();
  setStartButtonVisible(false);
  updateListNavButtons();
  syncDailyStudyStatsDisplay();
  updateLearningLockedSideMenuControls();
  setAppAuthUiLocked(true);
  requestAnimationFrame(function() {
    requestAnimationFrame(syncAppHeaderHeight);
  });
}

// エラーメッセージを描画
function renderErrorMessages() {
  var errorContainer = document.getElementById('errorContainer');
  if (!errorContainer) return;
  
  // 既存のエラーメッセージを削除
  errorContainer.innerHTML = '';
  
  if (errorMessages.length === 0) {
    errorContainer.remove();
    return;
  }
  
  // エラーメッセージのdiv要素を作成
  var errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  
  // 複数エラーの場合は箇条書きで表示
  if (errorMessages.length === 1) {
    errorDiv.textContent = errorMessages[0];
  } else {
    var ul = document.createElement('ul');
    errorMessages.forEach(function(msg) {
      var li = document.createElement('li');
      li.textContent = msg;
      ul.appendChild(li);
    });
    errorDiv.appendChild(ul);
  }
  
  // 閉じるボタンを追加
  var closeButton = document.createElement('button');
  closeButton.className = 'error-close-button';
  closeButton.textContent = '×';
  closeButton.type = 'button';
  closeButton.addEventListener('click', function() {
    clearErrorMessages();
  });
  errorDiv.appendChild(closeButton);
  
  errorContainer.appendChild(errorDiv);
}

// エラーメッセージをクリア
function clearErrorMessages() {
  errorMessages = [];
  var errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.remove();
  }
}

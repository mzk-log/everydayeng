// img/bgフォルダ内の背景画像ファイル一覧
var BACKGROUND_IMAGE_FILES = [
  'bg.jpg',
  'bg-rightbluegr.jpg',
  'bg-rightbluegrF1.jpg',
  'bg-rightgreengr.jpg',
  'bg-rightpinkgr.jpg'
];

// 学習完了メッセージの定数配列
var COMPLETION_MESSAGES = [
  'Good job!',
  'がんばってるじゃん！',
  'Excellent!',
  'その調子！',
  'Well done!',
  'すごいね！',
  'Great work!',
  'いいよ！いいよ！',
  'Keep it up!'
];

// 学習完了メッセージ用のアイコン画像ファイル名
var COMPLETION_MESSAGE_IMAGES = [
  'msg-ino-01.png',
  'msg-manmos-01.png',
  'msg-putera-01.png',
  'msg-smiley-01.png',
  'msg-smiley-02.png',
  'msg-thumb-01.png',
  'msg-risu-01.png',
  'msg-same-01.png',
  'msg-sakuranbo-01.png',
  'msg-tatunootoshigo-01.png',
  'msg-sakana-01.png',
  'msg-anime-zou-01.gif',
  'msg-uma-01.png'
];

// 初期化
window.onload = function() {
  // 認証確定まで操作不可（ログインボタンのみ有効）
  setAppAuthUiLocked(true);
  checkUserEmail();
  migrateLocalStorageAudioToIdb();
  
  setupEventListeners();
  refreshLoadDiagUi();
  
  // 画像は後から読み込む（優先度：低）
  // 背景画像とボタン画像を並列で読み込む
  setBackgroundImage();
  setButtonImages();
  
  // 出題設定（入替え・リスニング）を読み込み
  loadPracticeSettings();
  
  // 音声設定（声・速さ）を読み込み、メニュー表示に反映
  loadAudioSettings();
  
  // 出題読み／解答読みトグルを読み込み
  loadReadToggles();
  
  // トグルボタンの初期状態を設定（リスニングON時は出題読みON固定・解答読みON）
  syncQuestionToggleForListeningMode();

  // ヘッダー：フロント版表示
  syncAppHeaderVersionDisplay();
  
  // ヘッダー高さを同期（コンテンツの padding-top 用）
  requestAnimationFrame(function() {
    requestAnimationFrame(syncAppHeaderHeight);
  });
  
  window.addEventListener('resize', syncAppHeaderHeight);

  syncDailyStudyStatsDisplay();
  startDailyStudyCountDateWatcher();
};

// ページローディングを表示する（削除済みなら再作成）
function getPageLoadingOverlayHtml() {
  return '<div class="page-loading-content">' +
    '<h1 class="page-loading-title">Everyday English</h1>' +
    '<div class="page-loading-spinner"></div>' +
    '<p class="page-loading-percent" id="pageLoadingPercent">0%</p>' +
    '<div class="page-loading-bar" aria-hidden="true"><div class="page-loading-bar-fill" id="pageLoadingBarFill"></div></div>' +
    '<p class="page-loading-status" id="pageLoadingStatus">読み込み中...</p>' +
    '<button type="button" id="pageLoadingRetryButton" class="page-loading-retry" style="display:none">再試行</button>' +
    '<p class="page-loading-diag" id="pageLoadingDiag" title="長押しで診断ログをコピー"></p>' +
    '</div>';
}

function isPageLoadingVisible() {
  var loadingOverlay = document.getElementById('pageLoadingOverlay');
  return !!(loadingOverlay && !loadingOverlay.classList.contains('hidden'));
}

/**
 * 全画面ローディングの進捗（段階％。全問受信中はバイト数が分かるとき上乗せ）
 * @param {number} percent
 * @param {string} [label]
 */
function setPageLoadingProgress(percent, label) {
  if (!isPageLoadingVisible()) {
    return;
  }
  var pct = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  var percentEl = document.getElementById('pageLoadingPercent');
  var statusEl = document.getElementById('pageLoadingStatus') ||
    document.querySelector('.page-loading-status');
  var fillEl = document.getElementById('pageLoadingBarFill');
  if (percentEl) {
    percentEl.textContent = pct + '%';
  }
  if (statusEl) {
    statusEl.textContent = label ? ('読み込み中... ' + label) : '読み込み中...';
  }
  if (fillEl) {
    fillEl.style.width = pct + '%';
  }
}

function finishPageLoadingAndUnlock() {
  var retryBtn = document.getElementById('pageLoadingRetryButton');
  if (retryBtn) {
    retryBtn.style.display = 'none';
  }
  setPageLoadingProgress(100, '完了');
  hidePageLoading();
  if (hasUsableAuth()) {
    setAppAuthUiLocked(false);
  }
}

function shouldHoldPageLoadingForAllStudy(options) {
  options = options || {};
  if (options.pageLoading === true) {
    return true;
  }
  if (options.pageLoading === false) {
    return false;
  }
  return isPageLoadingVisible();
}

function beginAllStudyItemsNetworkWait(holdOverlay) {
  var loadingSpinner = dom.categoryLoadingSpinner;
  var listMessage = dom.listMessage;
  if (holdOverlay) {
    if (!isPageLoadingVisible()) {
      showPageLoading();
    }
    setPageLoadingProgress(50, '全問データ');
  }
  if (holdOverlay || !categoryCatalog.items || categoryCatalog.items.length === 0) {
    if (loadingSpinner) {
      loadingSpinner.style.display = 'block';
    }
    if (listMessage && !studyEnd.done) {
      listMessage.style.display = 'block';
      listMessage.textContent = '読み込み中...';
    }
  }
}

function updateAllStudyFetchProgress(received, total) {
  var receivedKb = Math.max(1, Math.round((Number(received) || 0) / 1024));
  var pct;
  var label;
  if (total > 0) {
    pct = 50 + Math.round(45 * Math.min(1, received / total));
    label = '全問データ ' + receivedKb + 'KB';
  } else {
    pct = Math.min(90, 55 + Math.round((Number(received) || 0) / 8192));
    label = '全問データ ' + receivedKb + 'KB受信';
  }
  setPageLoadingProgress(pct, label);
}

// ページローディングを表示する（削除済みなら再作成）
function showPageLoading() {
  var loadingOverlay = document.getElementById('pageLoadingOverlay');
  if (loadingOverlay) {
    if (!document.getElementById('pageLoadingPercent')) {
      loadingOverlay.innerHTML = getPageLoadingOverlayHtml();
    }
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.style.display = 'flex';
    loadingOverlay.setAttribute('aria-hidden', 'false');
    beginLoadDiag('boot', '起動', 0);
    setPageLoadingProgress(5, '起動');
    return;
  }
  loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'pageLoadingOverlay';
  loadingOverlay.className = 'page-loading-overlay';
  loadingOverlay.setAttribute('aria-hidden', 'false');
  loadingOverlay.innerHTML = getPageLoadingOverlayHtml();
  document.body.appendChild(loadingOverlay);
  beginLoadDiag('boot', '起動', 0);
  setPageLoadingProgress(5, '起動');
}

// ページローディングを非表示にする
function hidePageLoading() {
  var loadingOverlay = document.getElementById('pageLoadingOverlay');
  if (loadingOverlay) {
    if (loadDiagBoot.status === '取得中') {
      finishLoadDiag('boot', '完了', { ok: true, keepTickerMs: 0 });
    } else {
      stopLoadDiagTicker('boot');
      refreshLoadDiagUi();
    }
    // フェードアウトアニメーション
    loadingOverlay.classList.add('hidden');
    syncAppHeaderHeight();
    // アニメーション完了後にDOMから削除
    setTimeout(function() {
      if (loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
      refreshLoadDiagUi();
    }, 300); // transition時間（0.3s）に合わせる
  }
}

/**
 * カテゴリ読込の中央スピナーを非表示にする
 */
function hideCategoryLoadingSpinner() {
  var loadingSpinner = dom.categoryLoadingSpinner;
  if (loadingSpinner) {
    loadingSpinner.style.display = 'none';
  }
  updateStartButtonEnabled();
}

// ボタン画像を設定する関数（最適化版）
function setButtonImages() {
  // ローカル画像を使用
  var images = {
    'play-button': 'img/play-button.png',
    'arrow': 'img/arrow.png',
    'home': 'img/home.png'
  };
  
  // play-button（欄横の再生）
  var fieldPlayImgs = document.querySelectorAll('#questionPlayButton img, #answerPlayButton img');
  for (var i = 0; i < fieldPlayImgs.length; i++) {
    if (images['play-button']) {
      fieldPlayImgs[i].src = images['play-button'];
    }
  }
  
  // arrow (next)
  var nextButtonImg = document.querySelector('#nextButton img');
  if (nextButtonImg && images['arrow']) {
    nextButtonImg.src = images['arrow'];
  }
  
  // home
  var homeButtonImg = document.querySelector('#homeButton img');
  if (homeButtonImg && images['home']) {
    homeButtonImg.src = images['home'];
  }
}

// 背景画像を設定する関数（最適化版）
function setBackgroundImage() {
  var backgroundImage = dom.backgroundImage;
  if (backgroundImage) {
    // localStorageから保存された背景画像を取得
    var savedBackgroundImage = localStorage.getItem('customBackgroundImage');
    // 有効な値かチェック（空文字列、null、undefined、不正な値を除外）
    if (savedBackgroundImage && 
        savedBackgroundImage.trim() !== '' && 
        savedBackgroundImage !== 'null' && 
        savedBackgroundImage !== 'undefined' &&
        (savedBackgroundImage.startsWith('data:') || savedBackgroundImage.includes('img/bg/'))) {
      // URLが既に引用符で囲まれている場合はそのまま、そうでない場合は追加
      var urlValue = savedBackgroundImage;
      if (!urlValue.startsWith('"') && !urlValue.startsWith("'")) {
        if (urlValue.startsWith('img/bg/')) {
          urlValue = '"' + urlValue + '"';
        }
      }
      backgroundImage.style.backgroundImage = 'url(' + urlValue + ')';
    } else {
      // デフォルトのローカル画像を使用
      backgroundImage.style.backgroundImage = 'url("img/bg/bg.jpg")';
      // 不正な値が保存されていた場合は削除
      if (savedBackgroundImage) {
        localStorage.removeItem('customBackgroundImage');
      }
    }
    
    // 画像そのもののfilterプロパティを削除（念のため）
    backgroundImage.style.filter = '';
    
    // 保存された明るさ設定を適用
    var savedBrightness = localStorage.getItem('backgroundBrightness');
    if (savedBrightness) {
      // 旧形式（数値）の場合は新形式に変換
      var brightnessLevel;
      if (savedBrightness === 'dark' || savedBrightness === 'bright') {
        brightnessLevel = savedBrightness;
      } else {
        // 旧形式の数値から新形式に変換
        var oldLevel = parseInt(savedBrightness);
        if (oldLevel >= 1 && oldLevel <= 5) {
          // 4以下は「暗い」、5は「明るい」
          brightnessLevel = oldLevel <= 4 ? 'dark' : 'bright';
        } else {
          brightnessLevel = 'bright'; // デフォルト（明るい）
        }
      }
      setBackgroundBrightness(brightnessLevel, false);
    } else {
      // デフォルトは「明るい」
      setBackgroundBrightness('bright', false);
    }
    
    // ボタンの初期状態を更新（setBackgroundBrightness内で既に更新されているが、念のため）
    // setBackgroundBrightness内で既にupdateBrightnessButtonsが呼ばれているので、ここでは不要
  }
}

// 背景画像の明るさを設定（オーバーレイの透明度を変更）
function setBackgroundBrightness(level, saveToStorage) {
  // level: 'dark'(暗い) または 'bright'(明るい)
  var overlayOpacityValues = {
    'dark': 0.15,   // 暗い（現状の4に相当）
    'bright': 0.0   // 明るい（現状の5に相当、完全透明）
  };
  
  // levelが有効かチェックし、対応するopacityを取得
  var opacity;
  if (overlayOpacityValues.hasOwnProperty(level)) {
    opacity = overlayOpacityValues[level];
  } else {
    opacity = 0.0; // デフォルト値（明るい）
  }
  
  var backgroundOverlay = document.querySelector('.background-overlay');
  
  if (backgroundOverlay) {
    var colorValue = opacity === 0 ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, ' + opacity + ')';
    backgroundOverlay.style.backgroundColor = colorValue;
  }
  
  // 画像そのもののfilterプロパティを削除
  var backgroundImage = dom.backgroundImage;
  if (backgroundImage) {
    backgroundImage.style.filter = '';
  }
  
  // ボタンのアクティブ状態を更新
  updateBrightnessButtons(level);
  
  // localStorageに保存（saveToStorageがtrueの場合、または未指定の場合）
  if (saveToStorage !== false) {
    try {
      localStorage.setItem('backgroundBrightness', level);
      scheduleUserSettingsSync();
    } catch (e) {
      console.warn('明るさ設定の保存に失敗しました。');
    }
  }
}

// 明るさボタンのアクティブ状態を更新
function updateBrightnessButtons(activeLevel) {
  var brightnessButtons = document.querySelectorAll('.brightness-button');
  brightnessButtons.forEach(function(button) {
    if (button.dataset.brightness === activeLevel) {
      button.classList.add('brightness-button-active');
    } else {
      button.classList.remove('brightness-button-active');
    }
  });
}

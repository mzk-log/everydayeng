// グローバル変数
var categories = [];
var currentCategoryData = [];
var currentCategoryNo = null;
var categoryDataByNo = {}; // カテゴリ切替高速化用（セッション内キャッシュ）
var currentQuestionIndex = 0;
var learningStartTime = null;
var learningTimeInterval = null;
var stopwatchStartTime = null;
var stopwatchInterval = null;
var stopwatchElapsed = 0;
var isStopwatchRunning = false;
var isAnswerShown = false;
var userEmail = null; // ユーザーのメールアドレス
var modalCurrentIndex = 0; // モーダル内の現在のインデックス
var retryQuestionIndices = []; // 再チャレンジする問題のインデックスを保存
var isInRetryMode = false; // 再チャレンジモードかどうか
var retryQuestionIndex = 0; // 現在の再チャレンジ問題のインデックス
var completedQuestionIndices = []; // 完了した問題のインデックスを保存（灰色表示）
var isLearningCompleted = false; // 学習が完了したかどうか
var selectedQuestionIndices = []; // 選択された問題のインデックスを保存
var originalCategoryData = []; // 元の全問題データ（出題数表示用）
var isQuestionToggleActive = false; // 出題読みトグルボタンの状態（ON/OFF）
var isAnswerToggleActive = false; // 解答読みトグルボタンの状態（ON/OFF）
var questionToggleBeforeListeningLock = null; // リスニングON固定前の出題読み状態
var answerToggleBeforeListening = null; // リスニングON前の解答読み状態（OFF復帰用）
var currentAudio = null; // 現在再生中のAudioオブジェクト
var activePlayField = null; // 再生／取得中の欄 'question' | 'answer' | null
var waitingListeningAnsGate = false; // リスニング時：出題音声終了まで Ans 無効・計測待機
var isCategoryTransitionInProgress = false; // カテゴリ切替：データ取得〜1問目表示まで
var isRefreshingAdvanceNavControls = false; // refreshAdvanceNavControls の再入防止
var justCompletedCategoryNo = null; // 直前に完了したカテゴリ（完了画面のList／中央Next/Start判定用）
var justCompletedLastDatePageIndex = null; // 解答時間優先：再ソート後のページ比較用（未使用時は null）
var isLastDateCompletionSessionView = false; // 解答時間優先：完了直後に今回学習分をList表示中
var LAST_DATE_PAGE_SIZE = 7; // 解答時間優先：1ページあたりの件数
var lastDateModeSortedItems = []; // 解答時間優先：全件ソート結果
var lastDateModePageIndex = 0; // 解答時間優先：現在ページ（0始まり）
var lastDateModeSessionItems = []; // 解答時間優先：今回学習開始時の最大7件（Plus再学習用）
var lastDateModeLoadRequestId = 0; // 解答時間優先：取得リクエスト世代
var completionBrowseRequestId = 0; // 完了画面List参照の取得リクエスト世代
var isUpdateMode = false; // 更新モードかどうか
var originalEditText = ''; // 更新前の編集対象テキスト
var updateDisplayTarget = null; // 'question' | 'answer' | 'note'
var updateStorageField = null; // 保存先キー 'question' | 'answer' | 'note'
var mediaRecorder = null; // 音声録音用のMediaRecorder
var audioChunks = []; // 録音した音声データのチャンク
var isRecording = false; // 録音中かどうか

// 出題設定（localStorageと同期。学習中の切替は次問から反映）
var LISTENING_PLACEHOLDER_TEXT = '🔊 リスニング練習モードです';

// 音声キャッシュ（メモリキャッシュ）
var audioCache = {};

// キャッシュの設定
var CACHE_PREFIX = 'tts_audio_'; // localStorageのキープレフィックス
var MAX_CACHE_SIZE = 10 * 1024 * 1024; // 最大キャッシュサイズ（10MB）
var FIELD_PLAY_LONG_PRESS_MS = 700; // 再生ボタン長押しで音声再作成
var GAS_UPDATE_MAX_ATTEMPTS = 5; // シート更新の最大試行回数（初回含む）
var GAS_UPDATE_BASE_DELAY_MS = 700; // リトライの基本待機（指数バックオフ）
var gasSheetUpdateQueue = []; // シート更新ジョブの直列キュー
var isGasSheetUpdateQueueRunning = false;

// Google Apps Script WebアプリのURL（統合版：TTSとDATAの両方を処理）
// 注意: Gas_Main.gsをWebアプリとして公開した際のURLを設定してください
// ここにGoogle Apps ScriptのWebアプリURLを設定してください
//var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwysmu_TOO2CywifujRaRTGSZ-DE1GcOw2iZExPpdGPLweR2UBZp-5KPktHy3Ju9t58Gg/exec';  //DEV用
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxTBkXrUOsYjzb1xERU-GXe5g8w9f0lxqOyxn6P8-VC9zNDMtjmTXOKRH_lBnRra3Kzcw/exec';  //PRD用

/**
 * POST用URL（refererをクエリに付与）
 * GAS WebアプリのリダイレクトでPOSTボディが欠落しても認証できるようにする
 * @returns {string}
 */
function buildGasPostUrl() {
  var params = new URLSearchParams();
  params.append('referer', window.location.origin || '');
  return WEB_APP_URL + '?' + params.toString();
}


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
  // メールアドレスを確認
  checkUserEmail();
  
  setupEventListeners();
  
  // 画像は後から読み込む（優先度：低）
  // 背景画像とボタン画像を並列で読み込む
  setBackgroundImage();
  setButtonImages();
  
  // 出題設定（入替え・リスニング）を読み込み
  loadPracticeSettings();
  
  // トグルボタンの初期状態を設定（リスニングON時は出題読みON固定・解答読みON）
  syncQuestionToggleForListeningMode();
  
  // トグルボタンの位置を設定（タイトルが表示された後に実行）
  requestAnimationFrame(function() {
    requestAnimationFrame(updateToggleButtonPosition);
  });
  
  // ウィンドウリサイズ時にも位置を更新
  window.addEventListener('resize', updateToggleButtonPosition);
};

// ページローディングを非表示にする
function hidePageLoading() {
  var loadingOverlay = document.getElementById('pageLoadingOverlay');
  if (loadingOverlay) {
    // フェードアウトアニメーション
    loadingOverlay.classList.add('hidden');
    // アニメーション完了後にDOMから削除
    setTimeout(function() {
      if (loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
    }, 300); // transition時間（0.3s）に合わせる
  }
}

// メールアドレスを確認し、必要に応じて入力画面を表示
function checkUserEmail() {
  // localStorageからメールアドレスを取得
  userEmail = localStorage.getItem('userEmail');
  
  if (!userEmail) {
    // メールアドレスが保存されていない場合は入力画面を表示
    showEmailInputDialog();
  } else {
    // メールアドレスが保存されている場合はカテゴリリストを読み込む
    loadCategories();
  }
}

// メールアドレス入力ダイアログを表示
function showEmailInputDialog() {
  var email = prompt('メールアドレスを入力してください:');
  
  // nullの場合はキャンセルが押された
  if (email === null) {
    return; // 何もせずに終了
  }
  
  if (email && email.trim() !== '') {
    userEmail = email.trim();
    // localStorageに保存
    localStorage.setItem('userEmail', userEmail);
    
    // ログイン成功時はエラーメッセージを自動削除
    clearErrorMessages();
    
    // カテゴリリストを読み込む
    loadCategories();
  } else {
    // メールアドレスが入力されなかった場合は再度表示
    alert('メールアドレスは必須です。');
    showEmailInputDialog();
  }
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
  var backgroundImage = document.getElementById('backgroundImage');
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
  var backgroundImage = document.getElementById('backgroundImage');
  if (backgroundImage) {
    backgroundImage.style.filter = '';
  }
  
  // ボタンのアクティブ状態を更新
  updateBrightnessButtons(level);
  
  // localStorageに保存（saveToStorageがtrueの場合、または未指定の場合）
  if (saveToStorage !== false) {
    try {
      localStorage.setItem('backgroundBrightness', level);
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

// カテゴリ一覧を読み込む（最優先）
// options.preserveValue: 再取得後に選択を復元する値
// options.quiet: 読み込み中表示を出さず、裏で更新する（HOME復帰時など）
function loadCategories(options) {
  options = options || {};
  var preserveValue = options.preserveValue != null && options.preserveValue !== ''
    ? String(options.preserveValue)
    : null;
  var quiet = !!options.quiet;
  
  // userEmailが設定されていない場合は、再度確認
  if (!userEmail) {
    userEmail = localStorage.getItem('userEmail');
  }
  
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  
  // ローディング表示
  var select = document.getElementById('categorySelect');
  var loadingSpinner = document.getElementById('categoryLoadingSpinner');
  if (!quiet) {
    if (select) {
      select.innerHTML = '<option value="">読み込み中...</option>';
      select.disabled = true;
      syncCustomCategorySelect(select);
    }
    if (loadingSpinner) {
      loadingSpinner.style.display = 'block';
    }
  }
  
  // Google Apps Script経由でデータを取得
  var params = new URLSearchParams();
  params.append('action', 'getCategories');
  params.append('email', userEmail);
  params.append('referer', window.location.origin);
  
  // GETリクエストで送信
  var requestUrl = WEB_APP_URL + '?' + params.toString();
  
  fetch(requestUrl)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      try {
        if (!data.success) {
          throw new Error(data.error || 'データの取得に失敗しました');
        }
        
        if (!data.categories || data.categories.length === 0) {
          throw new Error('カテゴリが見つかりません');
        }
        
        categories = data.categories;
        // HOME直後など、表示中Listの学習日が新しい場合はそちらを優先して上書き
        if (quiet && currentCategoryNo != null && currentCategoryNo !== '' &&
            currentCategoryData && currentCategoryData.length > 0) {
          var listLastDate = computeCategoryLastDateFromItems(currentCategoryData);
          var listStudyCounts = computeCategoryStudyCountsFromItems(currentCategoryData);
          for (var ci = 0; ci < categories.length; ci++) {
            if (String(categories[ci].no) === String(currentCategoryNo)) {
              categories[ci].last_date = listLastDate;
              categories[ci].count = currentCategoryData.length;
              categories[ci].max_retry_count = listStudyCounts.max_retry_count;
              categories[ci].min_total_study_count = listStudyCounts.min_total_study_count;
              break;
            }
          }
        }
        if (select) {
          var valueToRestore = preserveValue || select.value || '';
          select.disabled = false;
          populateCategorySelectOptions(select, valueToRestore);
        }
        // 学習完了中なら学習画面のドロップダウンも同期
        var learningSelectContainer = document.getElementById('learningCategorySelectContainer');
        if (learningSelectContainer && learningSelectContainer.style.display !== 'none' && isLearningCompleted) {
          populateCategorySelectOptions(
            document.getElementById('learningCategorySelect'),
            currentCategoryNo
          );
        }
        if (loadingSpinner) {
          loadingSpinner.style.display = 'none';
        }
        // ボタンの状態を更新
        updateListNavButtons();
        // 解答時間優先モードなら全件Listを読み込み
        if (isDurationQuestionMethod()) {
          applyQuestionMethodModeUi();
          loadLastDateModeData({ resetPage: true, resort: true, forceFetch: true });
        }
        // ページローディングを非表示（Googleスプレッドシートの読み込み完了）
        hidePageLoading();
      } catch (e) {
        showError('データ読み込みエラー: ' + e.toString());
        if (select) {
          select.disabled = false;
          syncCustomCategorySelect(select);
        }
        if (loadingSpinner) {
          loadingSpinner.style.display = 'none';
        }
        // ページローディングを非表示（エラー時も非表示）
        hidePageLoading();
      }
    })
    .catch(function(error) {
      showError('アクセスエラー: ' + error.toString());
      if (select) {
        select.disabled = false;
        syncCustomCategorySelect(select);
      }
      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }
      // ページローディングを非表示（エラー時も非表示）
      hidePageLoading();
    });
}

/**
 * カテゴリ名が END（選択不可の区切り）か
 * @param {Object} cat
 * @returns {boolean}
 */
function isEndCategory(cat) {
  if (!cat || cat.name == null) {
    return false;
  }
  return String(cat.name).trim() === 'END';
}

/**
 * 指定インデックスから前後方向に、選択可能なカテゴリのインデックスを探す
 * @param {number} fromIndex
 * @param {number} direction -1=前 / 1=次
 * @returns {number} 見つからなければ -1
 */
function findSelectableCategoryIndex(fromIndex, direction) {
  if (!categories || categories.length === 0) {
    return -1;
  }
  var i = fromIndex + direction;
  while (i >= 0 && i < categories.length) {
    if (!isEndCategory(categories[i])) {
      return i;
    }
    i += direction;
  }
  return -1;
}

/**
 * カテゴリselectへ option を設定する（初期画面／学習完了時で共用）
 * @param {HTMLSelectElement} select
 * @param {string|number|null} selectedValue
 */
function populateCategorySelectOptions(select, selectedValue) {
  if (!select) return;
  
  select.innerHTML = '<option value="">Categoryを選択してください</option>';
  categories.forEach(function(cat) {
    var option = document.createElement('option');
    option.value = cat.no;
    option.textContent = formatCategoryOptionText(cat);
    if (isEndCategory(cat)) {
      option.disabled = true;
      option.style.color = '#999999';
    }
    select.appendChild(option);
  });
  
  if (selectedValue != null && selectedValue !== '') {
    var restoreCat = null;
    for (var ri = 0; ri < categories.length; ri++) {
      if (String(categories[ri].no) === String(selectedValue)) {
        restoreCat = categories[ri];
        break;
      }
    }
    if (restoreCat && !isEndCategory(restoreCat)) {
      select.value = String(selectedValue);
    } else {
      select.value = '';
    }
  } else {
    select.value = '';
  }
  
  syncCustomCategorySelect(select);
}

/**
 * ネイティブselect用のカスタムUIを用意（全文折り返し表示）
 * @param {HTMLSelectElement} select
 */
function ensureCustomCategorySelect(select) {
  if (!select || select.dataset.customSelectReady === '1') {
    return;
  }
  var container = select.closest('.select-container');
  if (!container) {
    return;
  }
  
  select.classList.add('native-category-select-hidden');
  
  var custom = document.createElement('div');
  custom.className = 'custom-category-select';
  custom.setAttribute('data-for-select', select.id || '');
  
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-category-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  
  var panel = document.createElement('div');
  panel.className = 'custom-category-select-panel';
  panel.setAttribute('role', 'listbox');
  
  custom.appendChild(trigger);
  custom.appendChild(panel);
  if (select.nextSibling) {
    container.insertBefore(custom, select.nextSibling);
  } else {
    container.appendChild(custom);
  }
  
  trigger.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (select.disabled || trigger.disabled) {
      return;
    }
    var willOpen = !custom.classList.contains('is-open');
    closeAllCustomCategorySelects();
    if (willOpen) {
      custom.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      // レイアウト確定後に選択中項目へスクロール（未選択時は先頭のまま）
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          scrollCustomCategorySelectToSelected(custom);
        });
      });
    }
  });
  
  select.dataset.customSelectReady = '1';
}

/**
 * カスタムカテゴリパネルを選択中オプションが見える位置へスクロール
 * 未選択（空value）のときは先頭のまま
 * @param {HTMLElement} custom
 */
function scrollCustomCategorySelectToSelected(custom) {
  if (!custom) return;
  var panel = custom.querySelector('.custom-category-select-panel');
  if (!panel) return;
  
  var selected = panel.querySelector('.custom-category-select-option.is-selected');
  if (!selected) return;
  
  var selectedValue = selected.getAttribute('data-value');
  if (!selectedValue) return; // プレースホルダ（未選択）は先頭のまま
  
  try {
    selected.scrollIntoView({ block: 'center', inline: 'nearest' });
  } catch (e) {
    // 古い環境向けフォールバック
    var panelTop = panel.scrollTop;
    var optionTop = selected.offsetTop;
    var optionBottom = optionTop + selected.offsetHeight;
    var viewBottom = panelTop + panel.clientHeight;
    if (optionTop < panelTop) {
      panel.scrollTop = optionTop;
    } else if (optionBottom > viewBottom) {
      panel.scrollTop = optionBottom - panel.clientHeight;
    }
  }
}

/**
 * 開いているカスタムカテゴリselectをすべて閉じる
 */
function closeAllCustomCategorySelects() {
  var opens = document.querySelectorAll('.custom-category-select.is-open');
  for (var i = 0; i < opens.length; i++) {
    opens[i].classList.remove('is-open');
    var trig = opens[i].querySelector('.custom-category-select-trigger');
    if (trig) {
      trig.setAttribute('aria-expanded', 'false');
    }
  }
}

/**
 * ネイティブselectの内容をカスタムUIへ同期
 * @param {HTMLSelectElement} select
 */
function syncCustomCategorySelect(select) {
  if (!select) return;
  ensureCustomCategorySelect(select);
  var container = select.closest('.select-container');
  if (!container) return;
  var custom = container.querySelector('.custom-category-select');
  if (!custom) return;
  var trigger = custom.querySelector('.custom-category-select-trigger');
  var panel = custom.querySelector('.custom-category-select-panel');
  if (!trigger || !panel) return;
  
  trigger.disabled = !!select.disabled;
  panel.innerHTML = '';
  
  var selectedLabel = 'Categoryを選択してください';
  for (var i = 0; i < select.options.length; i++) {
    var opt = select.options[i];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-category-select-option';
    btn.textContent = opt.textContent;
    btn.setAttribute('data-value', opt.value);
    btn.setAttribute('role', 'option');
    
    if (opt.disabled) {
      btn.disabled = true;
      btn.classList.add('is-disabled');
    }
    if (opt.selected || String(opt.value) === String(select.value)) {
      btn.classList.add('is-selected');
      btn.setAttribute('aria-selected', 'true');
      selectedLabel = opt.textContent || selectedLabel;
    } else {
      btn.setAttribute('aria-selected', 'false');
    }
    
    (function(optionValue, isDisabled) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isDisabled) {
          return;
        }
        if (String(select.value) !== String(optionValue)) {
          select.value = optionValue;
          var changeEvent = new Event('change', { bubbles: true });
          select.dispatchEvent(changeEvent);
        }
        closeAllCustomCategorySelects();
        syncCustomCategorySelect(select);
      });
    })(opt.value, opt.disabled);
    
    panel.appendChild(btn);
  }
  
  trigger.textContent = selectedLabel;
}

/**
 * 学習完了時：Categoryドロップダウンを表示（Listは出さない）
 */
function showLearningCategorySelect() {
  var currentCategory = document.getElementById('currentCategory');
  var container = document.getElementById('learningCategorySelectContainer');
  var learningSelect = document.getElementById('learningCategorySelect');
  
  if (currentCategory) {
    currentCategory.classList.add('is-hidden');
    currentCategory.style.display = 'none';
  }
  if (container) {
    container.style.display = 'block';
  }
  populateCategorySelectOptions(learningSelect, currentCategoryNo);
}

/**
 * 学習中表示に戻す（ドロップダウンを隠す）
 */
function hideLearningCategorySelect() {
  var currentCategory = document.getElementById('currentCategory');
  var container = document.getElementById('learningCategorySelectContainer');
  var learningSelect = document.getElementById('learningCategorySelect');
  
  if (currentCategory) {
    currentCategory.classList.remove('is-hidden');
    currentCategory.style.display = '';
  }
  if (container) {
    container.style.display = 'none';
  }
  if (learningSelect) {
    learningSelect.value = '';
  }
}

/**
 * カテゴリドロップダウン用の表示文言を生成
 * 例）[1] 名前（5問）：2026/8/1 （3/1回） ／ 空欄ありは（5問）：-（回数なし）
 * @param {Object} cat
 * @returns {string}
 */
function formatCategoryOptionText(cat) {
  // ENDは区切り表示のみ（番号・問数・日付・回数なし）
  if (isEndCategory(cat)) {
    return 'END';
  }
  var displayText = '[' + cat.no + '] ' + cat.name;
  if (cat.count !== undefined && cat.count !== null) {
    displayText += '（' + cat.count + '問）';
    var lastDateValue = normalizeLastDate(cat.last_date || '');
    if (lastDateValue) {
      // 全行に学習日あり → 日時 + MAX(Retry)/MIN(Total)
      var n = getRetryCountNumber(cat.max_retry_count);
      var m = getRetryCountNumber(cat.min_total_study_count);
      displayText += '：' + formatYmdForDisplay(lastDateValue) + ' （' + n + '/' + m + '回）';
    } else {
      // 学習日が1つでも空 →「-」（回数は出さない）
      displayText += '：-';
    }
  }
  return displayText;
}

/**
 * List（当該カテゴリの全問）から最終学習日時を算出
 * 1つでも空欄なら空文字、全行埋まりなら最新日時（yyyy-mm-dd HH:mm または日付のみ）
 * @param {Array} items
 * @returns {string}
 */
function computeCategoryLastDateFromItems(items) {
  if (!items || items.length === 0) {
    return '';
  }
  var latest = '';
  for (var i = 0; i < items.length; i++) {
    var ymdHm = normalizeLastDate(items[i] ? items[i].last_date : '');
    if (!ymdHm) {
      return '';
    }
    if (!latest || ymdHm > latest) {
      latest = ymdHm;
    }
  }
  return latest;
}

/**
 * Listから回数集計（n=MAX RetryCount, m=MIN TotalStudyCount。空欄は0）
 * @param {Array} items
 * @returns {{max_retry_count: number, min_total_study_count: number}}
 */
function computeCategoryStudyCountsFromItems(items) {
  var maxRetry = 0;
  var minTotal = 0;
  if (!items || items.length === 0) {
    return { max_retry_count: 0, min_total_study_count: 0 };
  }
  for (var i = 0; i < items.length; i++) {
    var item = items[i] || {};
    var retryNum = getRetryCountNumber(item.retry_count);
    var totalNum = getRetryCountNumber(item.total_study_count);
    if (i === 0) {
      maxRetry = retryNum;
      minTotal = totalNum;
    } else {
      if (retryNum > maxRetry) maxRetry = retryNum;
      if (totalNum < minTotal) minTotal = totalNum;
    }
  }
  return {
    max_retry_count: maxRetry,
    min_total_study_count: minTotal
  };
}

/**
 * 表示中Listの学習日・回数をカテゴリドロップダウンへ反映（HOME時の即時更新用）
 */
function syncCategoryLastDateFromList() {
  if (currentCategoryNo == null || currentCategoryNo === '') {
    return;
  }
  if (!currentCategoryData || currentCategoryData.length === 0) {
    return;
  }
  var lastDate = computeCategoryLastDateFromItems(currentCategoryData);
  var studyCounts = computeCategoryStudyCountsFromItems(currentCategoryData);
  var catRef = null;
  if (categories && categories.length) {
    for (var i = 0; i < categories.length; i++) {
      if (String(categories[i].no) === String(currentCategoryNo)) {
        categories[i].last_date = lastDate;
        categories[i].count = currentCategoryData.length;
        categories[i].max_retry_count = studyCounts.max_retry_count;
        categories[i].min_total_study_count = studyCounts.min_total_study_count;
        catRef = categories[i];
        break;
      }
    }
  }
  var select = document.getElementById('categorySelect');
  if (select && catRef) {
    for (var j = 0; j < select.options.length; j++) {
      if (String(select.options[j].value) === String(currentCategoryNo)) {
        select.options[j].textContent = formatCategoryOptionText(catRef);
        break;
      }
    }
    syncCustomCategorySelect(select);
  }
  var learningSelect = document.getElementById('learningCategorySelect');
  var learningContainer = document.getElementById('learningCategorySelectContainer');
  if (learningSelect && catRef && learningContainer && learningContainer.style.display !== 'none') {
    for (var k = 0; k < learningSelect.options.length; k++) {
      if (String(learningSelect.options[k].value) === String(currentCategoryNo)) {
        learningSelect.options[k].textContent = formatCategoryOptionText(catRef);
        break;
      }
    }
    syncCustomCategorySelect(learningSelect);
  }
}

// イベントリスナーの設定
function setupEventListeners() {
  document.getElementById('categorySelect').addEventListener('change', function() {
    var categoryNo = this.value;
    if (categoryNo) {
      // ENDカテゴリは選択不可
      var selectedCat = null;
      for (var si = 0; si < categories.length; si++) {
        if (String(categories[si].no) === String(categoryNo)) {
          selectedCat = categories[si];
          break;
        }
      }
      if (selectedCat && isEndCategory(selectedCat)) {
        this.value = '';
        syncCustomCategorySelect(this);
        return;
      }
      // 学習時間のカウント開始（カテゴリ選択時）
      if (learningStartTime === null) {
        learningStartTime = Date.now();
        startLearningTimeCounter();
      }
      loadCategoryData(categoryNo);
    } else {
      resetListDisplay();
    }
    // ボタンの状態はloadCategoryData()内で更新されるため、ここでは呼び出さない
  });
  
  // 学習完了時のCategoryドロップダウン：List表示のみ（学習開始しない）
  var learningCategorySelect = document.getElementById('learningCategorySelect');
  if (learningCategorySelect) {
    learningCategorySelect.addEventListener('change', function() {
      if (isCategoryTransitionInProgress) {
        return;
      }
      var categoryNo = this.value;
      if (!categoryNo || !isLearningCompleted) {
        return;
      }
      var selectedCat = null;
      for (var si = 0; si < categories.length; si++) {
        if (String(categories[si].no) === String(categoryNo)) {
          selectedCat = categories[si];
          break;
        }
      }
      if (selectedCat && isEndCategory(selectedCat)) {
        this.value = currentCategoryNo != null ? String(currentCategoryNo) : '';
        syncCustomCategorySelect(this);
        return;
      }
      loadCategoryDataForCompletionBrowse(categoryNo);
    });
  }
  
  // カテゴリ・カスタムドロップダウン初期化（全文折り返し）
  syncCustomCategorySelect(document.getElementById('categorySelect'));
  syncCustomCategorySelect(document.getElementById('learningCategorySelect'));
  document.addEventListener('click', function() {
    closeAllCustomCategorySelects();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAllCustomCategorySelects();
    }
  });
  
  document.getElementById('startButton').addEventListener('click', function() {
    startLearning();
  });
  
  // ナビゲーションバー中央ボタン（Ans / Next）
  document.getElementById('navAnswerButton').addEventListener('click', function() {
    handleNavAnswerButtonClick();
  });
  
  document.getElementById('playButton').addEventListener('click', function() {
    if (this.disabled) return;
    if (isLearningCompleted) {
      navigateCompletionCategory(-1);
    }
  });
  
  bindFieldPlayButton(document.getElementById('questionPlayButton'), 'question');
  bindFieldPlayButton(document.getElementById('answerPlayButton'), 'answer');
  
  document.getElementById('nextButton').addEventListener('click', function() {
    if (this.disabled) return;
    if (isLearningCompleted) {
      navigateCompletionCategory(1);
      return;
    }
    goToNextQuestion();
  });
  
  document.getElementById('homeButton').addEventListener('click', function() {
    if (this.disabled) return;
    goToHome();
  });
  
  document.getElementById('plusButton').addEventListener('click', function() {
    handlePlusButtonClick();
  });
  
  // 出題読みトグルボタン
  document.getElementById('questionToggleButton').addEventListener('click', function() {
    if (isListeningModeEnabled()) {
      return; // リスニング練習中はON固定
    }
    isQuestionToggleActive = !isQuestionToggleActive;
    if (isQuestionToggleActive) {
      this.classList.add('active');
    } else {
      this.classList.remove('active');
    }
  });
  
  // 解答読みトグルボタン
  document.getElementById('answerToggleButton').addEventListener('click', function() {
    isAnswerToggleActive = !isAnswerToggleActive;
    if (isAnswerToggleActive) {
      this.classList.add('active');
    } else {
      this.classList.remove('active');
    }
  });
  
  document.getElementById('loginButton').addEventListener('click', function() {
    showEmailInputDialog();
  });
  
  // モーダル閉じるボタン
  document.getElementById('modalCloseButton').addEventListener('click', function() {
    closeModal();
  });
  
  // モーダルオーバーレイクリックで閉じる
  document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });
  
  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
  
  // モーダル内の前へボタン
  document.getElementById('modalPrevButton').addEventListener('click', function() {
    if (modalCurrentIndex > 0) {
      modalCurrentIndex--;
      var item = currentCategoryData[modalCurrentIndex];
      if (item) {
        updateModalContent(item);
        updateModalNavigation();
        updateModalSelection();
      }
    }
  });
  
  // モーダル内の次へボタン
  document.getElementById('modalNextButton').addEventListener('click', function() {
    if (modalCurrentIndex < currentCategoryData.length - 1) {
      modalCurrentIndex++;
      var item = currentCategoryData[modalCurrentIndex];
      if (item) {
        updateModalContent(item);
        updateModalNavigation();
        updateModalSelection();
      }
    }
  });
  
  // モーダル内の選択ボタン
  document.getElementById('modalSelectButton').addEventListener('click', function() {
    handleModalSelection();
  });
  
  // クリアボタン
  document.getElementById('clearSelectionButton').addEventListener('click', function() {
    clearSelection();
  });
  
  var completionClearButton = document.getElementById('completionClearSelectionButton');
  if (completionClearButton) {
    completionClearButton.addEventListener('click', function() {
      clearSelection();
    });
  }
  
  // Listナビゲーションボタン（前へ）
  document.getElementById('listPrevButton').addEventListener('click', function() {
    navigateToPreviousCategory();
  });
  
  // Listナビゲーションボタン（次へ）
  document.getElementById('listNextButton').addEventListener('click', function() {
    navigateToNextCategory();
  });
  
  // ハンバーガーメニューボタン
  document.getElementById('hamburgerMenuButton').addEventListener('click', function() {
    toggleSideMenu();
  });
  
  // サイドメニュー閉じるボタン
  document.getElementById('sideMenuCloseButton').addEventListener('click', function() {
    closeSideMenu();
  });
  
  // サイドメニューオーバーレイクリックで閉じる
  document.querySelector('.side-menu-overlay').addEventListener('click', function() {
    closeSideMenu();
  });
  
  // ESCキーでサイドメニューを閉じる
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeSideMenu();
    }
  });
  
  // 背景画像変更ボタン（アコーディオン）
  document.getElementById('changeBackgroundButton').addEventListener('click', function() {
    toggleBackgroundSubmenu();
  });
  
  // 音声設定のアコーディオンメニュー
  document.getElementById('audioSettingsButton').addEventListener('click', function() {
    toggleAudioSettingsSubmenu();
  });
  
  // 出題設定のアコーディオンメニュー
  document.getElementById('questionSettingsButton').addEventListener('click', function() {
    toggleQuestionSettingsSubmenu();
  });
  
  // 音声ボタン（出題音声・解答音声）
  var audioVoiceButtons = document.querySelectorAll('.audio-voice-button');
  audioVoiceButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      var voiceType = this.dataset.voiceType; // 'question' または 'answer'
      var voiceGender = this.dataset.voiceGender; // 'male' または 'female'
      updateAudioVoiceButtons(voiceType, voiceGender);
      setAudioVoice(voiceType, voiceGender);
    });
  });
  
  // 速さボタン（出題読みの速さ・解答読みの速さ）
  var audioSpeedButtons = document.querySelectorAll('.audio-speed-button');
  audioSpeedButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      var speedType = this.dataset.speedType; // 'question' または 'answer'
      var speedValue = this.dataset.speedValue; // 'fast', 'medium', 'slow'
      updateAudioSpeedButtons(speedType, speedValue);
      setAudioSpeed(speedType, speedValue);
    });
  });
  
  // 出題設定ボタン（入替え・リスニング）
  var practiceSettingButtons = document.querySelectorAll('.practice-setting-button');
  practiceSettingButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      var setting = this.dataset.setting; // 'swapQA' または 'listeningMode'
      var value = this.dataset.value; // 'on' または 'off'
      setPracticeSetting(setting, value === 'on');
    });
  });
  
  // 出題方法（ラジオ）
  var questionMethodRadios = document.querySelectorAll('input[name="questionMethod"]');
  questionMethodRadios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      if (!this.checked) return;
      if (isQuestionMethodLockedOnLearningScreen()) {
        updateQuestionMethodRadios(getQuestionMethod());
        return;
      }
      setQuestionMethod(this.value);
    });
  });
  
  // 背景画像を選択ボタン
  document.getElementById('selectBackgroundButton').addEventListener('click', function() {
    closeSideMenu();
    openBackgroundImageSelector();
  });
  
  // 背景画像選択モーダルの閉じるボタン
  document.getElementById('backgroundSelectCloseButton').addEventListener('click', function() {
    closeBackgroundSelectModal();
  });
  
  // 背景画像選択モーダルのオーバーレイクリックで閉じる
  document.getElementById('backgroundSelectModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeBackgroundSelectModal();
    }
  });
  
  // 初期値に戻すボタン
  document.getElementById('resetBackgroundButton').addEventListener('click', function() {
    resetBackgroundImage();
    closeSideMenu();
  });
  
  // 明るさ変更ボタン
  var brightnessButtons = document.querySelectorAll('.brightness-button');
  brightnessButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      var brightness = this.dataset.brightness; // 'dark' または 'bright'
      setBackgroundBrightness(brightness);
    });
  });
  
  // ファイル選択inputのイベント（存在する場合のみ）
  var backgroundImageFileInput = document.getElementById('backgroundImageFileInput');
  if (backgroundImageFileInput) {
    backgroundImageFileInput.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (file) {
        handleBackgroundImageSelection(file);
      }
    });
  }
  
  // 背景画像プレビューモーダルの閉じるボタン
  document.getElementById('backgroundPreviewCloseButton').addEventListener('click', function() {
    closeBackgroundPreviewModal();
  });
  
  // 背景画像プレビューモーダルのキャンセルボタン
  document.getElementById('backgroundPreviewCancelButton').addEventListener('click', function() {
    closeBackgroundPreviewModal();
  });
  
  // 背景画像プレビューモーダルの確定ボタン
  document.getElementById('backgroundPreviewConfirmButton').addEventListener('click', function() {
    confirmBackgroundImage();
  });
  
  // 背景画像プレビューモーダルのオーバーレイクリックで閉じる
  document.getElementById('backgroundPreviewModal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeBackgroundPreviewModal();
    }
  });
}

// サイドメニューを開く
function openSideMenu() {
  var sideMenu = document.getElementById('sideMenu');
  var hamburgerButton = document.getElementById('hamburgerMenuButton');
  if (sideMenu) {
    sideMenu.classList.add('active');
  }
  if (hamburgerButton) {
    hamburgerButton.classList.add('active');
  }
  // メニューが開いている間は背景のスクロールを無効化
  document.body.style.overflow = 'hidden';
  updateLearningLockedSideMenuControls();
}

// サイドメニューを閉じる
function closeSideMenu() {
  var sideMenu = document.getElementById('sideMenu');
  var hamburgerButton = document.getElementById('hamburgerMenuButton');
  if (sideMenu) {
    sideMenu.classList.remove('active');
  }
  if (hamburgerButton) {
    hamburgerButton.classList.remove('active');
  }
  // メニューが閉じたら背景のスクロールを有効化
  document.body.style.overflow = '';
}

// サイドメニューをトグル
function toggleSideMenu() {
  var sideMenu = document.getElementById('sideMenu');
  if (sideMenu && sideMenu.classList.contains('active')) {
    closeSideMenu();
  } else {
    openSideMenu();
  }
}

// 背景画像選択を開く
// 背景画像サブメニューをトグル
function toggleBackgroundSubmenu() {
  var submenu = document.getElementById('backgroundSubmenu');
  var parentButton = document.getElementById('changeBackgroundButton');
  if (submenu && parentButton) {
    var isActive = submenu.classList.contains('active');
    if (isActive) {
      submenu.classList.remove('active');
      parentButton.classList.remove('active');
    } else {
      submenu.classList.add('active');
      parentButton.classList.add('active');
    }
  }
}

// 音声設定サブメニューをトグル
function toggleAudioSettingsSubmenu() {
  var submenu = document.getElementById('audioSettingsSubmenu');
  var parentButton = document.getElementById('audioSettingsButton');
  if (submenu && parentButton) {
    var isActive = submenu.classList.contains('active');
    if (isActive) {
      submenu.classList.remove('active');
      parentButton.classList.remove('active');
    } else {
      submenu.classList.add('active');
      parentButton.classList.add('active');
    }
  }
}

// 出題設定サブメニューをトグル
function toggleQuestionSettingsSubmenu() {
  var submenu = document.getElementById('questionSettingsSubmenu');
  var parentButton = document.getElementById('questionSettingsButton');
  if (submenu && parentButton) {
    var isActive = submenu.classList.contains('active');
    if (isActive) {
      submenu.classList.remove('active');
      parentButton.classList.remove('active');
    } else {
      submenu.classList.add('active');
      parentButton.classList.add('active');
    }
  }
}

// 音声ボタンのアクティブ状態を更新
function updateAudioVoiceButtons(voiceType, activeGender) {
  var allVoiceButtons = document.querySelectorAll('.audio-voice-button');
  allVoiceButtons.forEach(function(button) {
    if (button.dataset.voiceType === voiceType) {
      if (button.dataset.voiceGender === activeGender) {
        button.classList.add('audio-voice-button-active');
      } else {
        button.classList.remove('audio-voice-button-active');
      }
    }
  });
}

// 速さボタンのアクティブ状態を更新
function updateAudioSpeedButtons(speedType, activeValue) {
  var allSpeedButtons = document.querySelectorAll('.audio-speed-button');
  allSpeedButtons.forEach(function(button) {
    if (button.dataset.speedType === speedType) {
      if (button.dataset.speedValue === activeValue) {
        button.classList.add('audio-speed-button-active');
      } else {
        button.classList.remove('audio-speed-button-active');
      }
    }
  });
}

// 音声設定を保存（localStorage）
function setAudioVoice(voiceType, gender) {
  try {
    var key = 'audioVoice_' + voiceType; // 'audioVoice_question' または 'audioVoice_answer'
    localStorage.setItem(key, gender);
    // 設定変更時にキャッシュをクリア
    clearAudioCache();
  } catch (e) {
    console.warn('音声設定の保存に失敗しました。');
  }
}

// 速さ設定を保存（localStorage）
function setAudioSpeed(speedType, speed) {
  try {
    var key = 'audioSpeed_' + speedType; // 'audioSpeed_question' または 'audioSpeed_answer'
    localStorage.setItem(key, speed);
    // 設定変更時にキャッシュをクリア
    clearAudioCache();
  } catch (e) {
    console.warn('速さ設定の保存に失敗しました。');
  }
}

// 音声設定を取得（localStorage、デフォルト値：女性）
function getAudioVoice(voiceType) {
  try {
    var key = 'audioVoice_' + voiceType;
    var saved = localStorage.getItem(key);
    return saved || 'female'; // デフォルト値：女性
  } catch (e) {
    return 'female'; // デフォルト値：女性
  }
}

// 速さ設定を取得（localStorage、デフォルト値：fast）
function getAudioSpeed(speedType) {
  try {
    var key = 'audioSpeed_' + speedType;
    var saved = localStorage.getItem(key);
    return saved || 'fast'; // デフォルト値：fast
  } catch (e) {
    return 'fast'; // デフォルト値：fast
  }
}

// 速さの値をspeakingRateに変換
function getSpeakingRate(speed) {
  var speedMap = {
    'fast': 1.25,
    'medium': 1.0,
    'slow': 0.9
  };
  return speedMap[speed] || 1.25; // デフォルト値：1.25
}

// 音声設定を読み込み（localStorageから）
function loadAudioSettings() {
  // 出題音声
  var questionVoice = getAudioVoice('question');
  updateAudioVoiceButtons('question', questionVoice);
  
  // 出題読みの速さ
  var questionSpeed = getAudioSpeed('question');
  updateAudioSpeedButtons('question', questionSpeed);
  
  // 解答音声
  var answerVoice = getAudioVoice('answer');
  updateAudioVoiceButtons('answer', answerVoice);
  
  // 解答読みの速さ
  var answerSpeed = getAudioSpeed('answer');
  updateAudioSpeedButtons('answer', answerSpeed);
}

// ========================================
// 出題設定（入替え・リスニング・出題方法）
// ========================================

/** 出題方法の有効値 */
var QUESTION_METHOD_VALUES = {
  category: true,  // カテゴリ毎（通常）
  lastDate: true,  // 学習日優先
  duration: true   // 解答時間優先
};

/**
 * 出題方法を取得（未設定・不正値は category）
 * 旧 lastDate 選択は duration（解答時間優先）へ移行
 * @returns {string} 'category' | 'lastDate' | 'duration'
 */
function getQuestionMethod() {
  try {
    var value = localStorage.getItem('practiceQuestionMethod');
    if (value === 'lastDate') {
      try {
        localStorage.setItem('practiceQuestionMethod', 'duration');
      } catch (eMigrate) {
        // ignore
      }
      return 'duration';
    }
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
 * @param {string} method - 'category' | 'lastDate' | 'duration'
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
  
  if (next === 'duration') {
    loadLastDateModeData({ resetPage: true, resort: true, forceFetch: true });
  } else if (next === 'lastDate') {
    showError('「学習日優先」は準備中です。');
    restoreCategoryModeListFromSelection();
  } else {
    restoreCategoryModeListFromSelection();
  }
}

/**
 * 学習画面（screen2）表示中は出題方法の変更をロックする
 * @returns {boolean}
 */
function isQuestionMethodLockedOnLearningScreen() {
  var screen2 = document.getElementById('screen2');
  return !!(screen2 && screen2.classList.contains('active'));
}

/**
 * 学習中に変更すべきでないサイドメニュー項目の有効／無効を更新
 */
function updateLearningLockedSideMenuControls() {
  var locked = isQuestionMethodLockedOnLearningScreen();
  var item = document.getElementById('questionMethodSettingItem');
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
}

/**
 * 解答時間優先モードか
 * @returns {boolean}
 */
function isDurationQuestionMethod() {
  return getQuestionMethod() === 'duration';
}

/**
 * @deprecated isDurationQuestionMethod を使用
 */
function isLastDateQuestionMethod() {
  return isDurationQuestionMethod();
}

/**
 * 出題方法に応じて Category 欄／モード表示を切替
 */
function applyQuestionMethodModeUi() {
  var isLastDate = isLastDateQuestionMethod();
  var selectContainer = document.getElementById('categorySelectContainer');
  var modeLabel = document.getElementById('questionMethodModeLabel');
  var sectionLabel = document.getElementById('categorySectionLabel');
  var learningSelectContainer = document.getElementById('learningCategorySelectContainer');
  var currentCategory = document.getElementById('currentCategory');
  
  if (selectContainer) {
    selectContainer.style.display = isLastDate ? 'none' : '';
  }
  if (modeLabel) {
    modeLabel.style.display = isLastDate ? 'block' : 'none';
    modeLabel.textContent = '解答時間優先モード';
  }
  if (sectionLabel) {
    sectionLabel.textContent = isLastDate ? '出題方法' : 'Category';
  }
  var learningSectionLabel = document.getElementById('learningCategorySectionLabel');
  if (learningSectionLabel) {
    learningSectionLabel.textContent = isLastDate ? '出題方法' : 'Category';
  }
  
  if (isLastDate) {
    if (learningSelectContainer) learningSelectContainer.style.display = 'none';
    if (currentCategory) {
      currentCategory.classList.remove('is-hidden');
      currentCategory.style.display = 'block';
      currentCategory.textContent = '解答時間優先モード';
    }
  } else if (!isLearningCompleted) {
    if (currentCategory && currentCategory.classList.contains('is-hidden') === false) {
      // 学習中のカテゴリ表示は startLearning 側で設定
    }
  }
}

/**
 * カテゴリ毎モードへ戻すときのList復元
 */
function restoreCategoryModeListFromSelection() {
  var select = document.getElementById('categorySelect');
  var categoryNo = select ? select.value : '';
  lastDateModeSortedItems = [];
  lastDateModePageIndex = 0;
  lastDateModeSessionItems = [];
  isLastDateCompletionSessionView = false;
  applyQuestionMethodModeUi();
  
  if (categoryNo) {
    loadCategoryData(categoryNo);
  } else {
    currentCategoryData = [];
    selectedQuestionIndices = [];
    var listMessage = document.getElementById('listMessage');
    var listContainer = document.getElementById('listContainer');
    var startButton = document.getElementById('startButton');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = 'Categoryを選択してください。';
    }
    if (listContainer) listContainer.style.display = 'none';
    if (startButton) startButton.style.display = 'none';
    updateListNavButtons();
  }
}

/**
 * LastDate 比較用キー（空は先頭＝最小。昇順で先頭になる）
 * @param {string} value
 * @returns {string}
 */
function getLastDateSortKey(value) {
  var normalized = normalizeLastDate(value);
  if (!normalized) {
    return '';
  }
  return normalized;
}

/**
 * Duration 比較用ミリ秒（空は数値MAX）
 * @param {string} value
 * @returns {number}
 */
function getDurationSortMs(value) {
  var ms = parseDurationToMs(value);
  if (ms === null) {
    return 1e15;
  }
  return ms;
}

/**
 * カテゴリ番号の数値化（比較用）
 * @param {*} value
 * @returns {number}
 */
function getCategoryNoSortValue(value) {
  var n = Number(value);
  return isNaN(n) ? 0 : n;
}

/**
 * 解答時間優先のソート（破壊的）
 * Duration降順（空=MAX）→ LastDate昇順（空先頭）→ Category_No降順
 * @param {Array} items
 * @returns {Array}
 */
function sortItemsForLastDateMode(items) {
  if (!items || items.length === 0) {
    return items || [];
  }
  items.sort(function(a, b) {
    var durA = getDurationSortMs(a ? a.duration : '');
    var durB = getDurationSortMs(b ? b.duration : '');
    if (durA < durB) return 1;
    if (durA > durB) return -1;
    
    var dateA = getLastDateSortKey(a ? a.last_date : '');
    var dateB = getLastDateSortKey(b ? b.last_date : '');
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    
    var catA = getCategoryNoSortValue(a ? a.category_no : 0);
    var catB = getCategoryNoSortValue(b ? b.category_no : 0);
    if (catA < catB) return 1;
    if (catA > catB) return -1;
    return 0;
  });
  return items;
}

/**
 * 解答時間優先：完了直後に今回学習分を List 表示
 */
function applyLastDateModeSessionToCompletionList() {
  currentCategoryData = (lastDateModeSessionItems && lastDateModeSessionItems.length > 0)
    ? lastDateModeSessionItems.slice()
    : [];
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  isLastDateCompletionSessionView = true;
  justCompletedLastDatePageIndex = null;

  var listMessage = document.getElementById('completionListMessage');
  var listContainer = document.getElementById('completionListContainer');
  if (currentCategoryData.length === 0) {
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
  } else {
    displayList();
  }
  updateListNavButtons();
  refreshAdvanceNavControls();
}

/**
 * 解答時間優先：完了セッション表示から再ソートして先頭ページへ
 * @returns {boolean}
 */
function exitLastDateCompletionSessionWithResort() {
  if (!isLearningCompleted || !isLastDateCompletionSessionView) {
    return false;
  }
  isLastDateCompletionSessionView = false;
  justCompletedLastDatePageIndex = null;
  if (lastDateModeSortedItems.length > 0) {
    sortItemsForLastDateMode(lastDateModeSortedItems);
    lastDateModePageIndex = 0;
    applyLastDateModePageToList();
  } else {
    loadLastDateModeData({ resetPage: true, resort: true, forceFetch: true });
  }
  maintainCompletionScrollAtBottom();
  return true;
}

/**
 * 学習日優先の総ページ数
 * @returns {number}
 */
function getLastDateModePageCount() {
  if (!lastDateModeSortedItems.length) return 0;
  return Math.ceil(lastDateModeSortedItems.length / LAST_DATE_PAGE_SIZE);
}

/**
 * 現在ページの件数を currentCategoryData へ反映してList表示
 */
function applyLastDateModePageToList() {
  isLastDateCompletionSessionView = false;
  var pageCount = getLastDateModePageCount();
  if (pageCount <= 0) {
    lastDateModePageIndex = 0;
    currentCategoryData = [];
    selectedQuestionIndices = [];
    var listMessage = document.getElementById(isLearningCompleted ? 'completionListMessage' : 'listMessage');
    var listContainer = document.getElementById(isLearningCompleted ? 'completionListContainer' : 'listContainer');
    var startButton = document.getElementById('startButton');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
    if (!isLearningCompleted && startButton) startButton.style.display = 'none';
    updateListNavButtons();
    if (isLearningCompleted) {
      refreshAdvanceNavControls();
    }
    return;
  }
  
  if (lastDateModePageIndex < 0) lastDateModePageIndex = 0;
  if (lastDateModePageIndex >= pageCount) lastDateModePageIndex = pageCount - 1;
  
  var start = lastDateModePageIndex * LAST_DATE_PAGE_SIZE;
  currentCategoryData = lastDateModeSortedItems.slice(start, start + LAST_DATE_PAGE_SIZE);
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  displayList();
  
  if (!isLearningCompleted) {
    var startButton = document.getElementById('startButton');
    if (startButton) {
      startButton.style.display = 'block';
      startButton.disabled = false;
    }
    showListNavButtons();
  }
  updateListNavButtons();
  if (isLearningCompleted) {
    refreshAdvanceNavControls();
  }
}

/**
 * 学習日優先データを取得・ソートして表示
 * @param {Object} [options]
 * @param {boolean} [options.resetPage]
 * @param {boolean} [options.resort]
 * @param {boolean} [options.forceFetch]
 */
function loadLastDateModeData(options) {
  options = options || {};
  var resetPage = options.resetPage !== false;
  var resort = options.resort !== false;
  var forceFetch = !!options.forceFetch;
  
  applyQuestionMethodModeUi();
  
  if (!forceFetch && lastDateModeSortedItems.length > 0) {
    if (resort) {
      sortItemsForLastDateMode(lastDateModeSortedItems);
    }
    if (resetPage) {
      lastDateModePageIndex = 0;
    }
    applyLastDateModePageToList();
    return;
  }
  
  if (!userEmail) {
    userEmail = localStorage.getItem('userEmail');
  }
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  
  lastDateModeLoadRequestId++;
  var requestId = lastDateModeLoadRequestId;
  var loadingSpinner = document.getElementById('categoryLoadingSpinner');
  var listMessage = document.getElementById('listMessage');
  if (loadingSpinner) loadingSpinner.style.display = 'block';
  if (listMessage && !isLearningCompleted) {
    listMessage.style.display = 'block';
    listMessage.textContent = '読み込み中...';
  }
  
  var params = new URLSearchParams();
  params.append('action', 'getAllStudyItems');
  params.append('email', userEmail);
  params.append('referer', window.location.origin);
  
  fetch(WEB_APP_URL + '?' + params.toString())
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      if (requestId !== lastDateModeLoadRequestId) return;
      if (!isLastDateQuestionMethod()) return;
      if (!data.success) {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
      var items = data.items || [];
      // セッション内の更新済み値を id でマージ
      var byId = {};
      Object.keys(categoryDataByNo).forEach(function(catKey) {
        var catItems = categoryDataByNo[catKey] || [];
        catItems.forEach(function(it) {
          if (it && it.id != null) {
            if (it.category_no == null || it.category_no === '') {
              it.category_no = catKey;
            }
            byId[String(it.id)] = it;
          }
        });
      });
      lastDateModeSortedItems.forEach(function(it) {
        if (it && it.id != null) {
          byId[String(it.id)] = it;
        }
      });
      items = items.map(function(it) {
        var mem = it && it.id != null ? byId[String(it.id)] : null;
        if (!mem) return it;
        return {
          id: it.id,
          category_no: it.category_no != null ? it.category_no : mem.category_no,
          no: it.no,
          q_title: it.q_title,
          question: mem.question != null ? mem.question : it.question,
          a_title: it.a_title,
          answer: mem.answer != null ? mem.answer : it.answer,
          note: mem.note != null ? mem.note : it.note,
          retry_count: mem.retry_count != null ? mem.retry_count : it.retry_count,
          total_study_count: mem.total_study_count != null ? mem.total_study_count : it.total_study_count,
          duration_old: mem.duration_old != null ? mem.duration_old : it.duration_old,
          duration: mem.duration != null ? mem.duration : it.duration,
          last_date: mem.last_date != null ? mem.last_date : it.last_date
        };
      });
      lastDateModeSortedItems = items;
      sortItemsForLastDateMode(lastDateModeSortedItems);
      if (resetPage) lastDateModePageIndex = 0;
      applyLastDateModePageToList();
      if (loadingSpinner) loadingSpinner.style.display = 'none';
    })
    .catch(function(error) {
      if (requestId !== lastDateModeLoadRequestId) return;
      showError('アクセスエラー: ' + error.toString());
      if (loadingSpinner) loadingSpinner.style.display = 'none';
    });
}

/**
 * 学習日優先：ページ移動（再ソートしない）
 * @param {number} direction -1 | 1
 * @returns {boolean} 移動できたか
 */
function navigateLastDateModePage(direction) {
  if (isLearningCompleted && isLastDateCompletionSessionView) {
    if (direction > 0) {
      return exitLastDateCompletionSessionWithResort();
    }
    return false;
  }
  var pageCount = getLastDateModePageCount();
  if (pageCount <= 0) return false;
  var nextPage = lastDateModePageIndex + direction;
  if (nextPage < 0 || nextPage >= pageCount) return false;
  lastDateModePageIndex = nextPage;
  applyLastDateModePageToList();
  if (isLearningCompleted) {
    maintainCompletionScrollAtBottom();
  }
  return true;
}

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
  } catch (e) {
    // localStorageが使えない場合は無視
  }
  updatePracticeSettingButtons(setting, isOn);
  
  if (setting === 'listeningMode') {
    syncQuestionToggleForListeningMode();
  }
  
  // TOP画面のList表示を更新（学習中の現在問題は次問から反映）
  var screen1 = document.getElementById('screen1');
  if (screen1 && screen1.classList.contains('active') && currentCategoryData.length > 0) {
    if (setting === 'listeningMode' || setting === 'swapQA') {
      refreshHomeListForPracticeSettings();
    }
  }
}

/**
 * リスニング練習モードに応じて出題／解答読みトグルを同期する
 * ON時：出題読みはON固定、解答読みは切替時にON（以降は切り替え可能）
 * OFF時：固定解除し、それぞれON前の状態へ戻す
 */
function syncQuestionToggleForListeningMode() {
  var questionToggleButton = document.getElementById('questionToggleButton');
  var answerToggleButton = document.getElementById('answerToggleButton');
  
  if (isListeningModeEnabled()) {
    // 出題読み：常にON固定
    if (questionToggleBeforeListeningLock === null) {
      questionToggleBeforeListeningLock = isQuestionToggleActive;
    }
    isQuestionToggleActive = true;
    
    // 解答読み：リスニングON切替時のみON。以降の再同期ではユーザ操作を維持
    if (answerToggleBeforeListening === null) {
      answerToggleBeforeListening = isAnswerToggleActive;
      isAnswerToggleActive = true;
    }
    
    if (questionToggleButton) {
      questionToggleButton.classList.add('active');
      questionToggleButton.classList.add('is-locked');
      questionToggleButton.setAttribute('aria-disabled', 'true');
      questionToggleButton.title = 'リスニング練習中は出題読みON固定';
    }
    if (answerToggleButton) {
      if (isAnswerToggleActive) {
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
  
  if (questionToggleBeforeListeningLock !== null) {
    isQuestionToggleActive = questionToggleBeforeListeningLock;
    questionToggleBeforeListeningLock = null;
  }
  if (answerToggleBeforeListening !== null) {
    isAnswerToggleActive = answerToggleBeforeListening;
    answerToggleBeforeListening = null;
  }
  
  if (questionToggleButton) {
    questionToggleButton.classList.remove('is-locked');
    questionToggleButton.removeAttribute('aria-disabled');
    questionToggleButton.title = '';
    if (isQuestionToggleActive) {
      questionToggleButton.classList.add('active');
    } else {
      questionToggleButton.classList.remove('active');
    }
  }
  if (answerToggleButton) {
    answerToggleButton.classList.remove('is-locked');
    answerToggleButton.removeAttribute('aria-disabled');
    answerToggleButton.title = '';
    if (isAnswerToggleActive) {
      answerToggleButton.classList.add('active');
    } else {
      answerToggleButton.classList.remove('active');
    }
  }
}

function refreshHomeListForPracticeSettings() {
  if (currentCategoryData.length === 0) return;
  // 入替え／リスニング切替時も List は通常どおり再描画（選択状態は維持）
  displayList();
}

// 音声キャッシュをクリア
function clearAudioCache() {
  // メモリキャッシュをクリア
  audioCache = {};
  
  // localStorageのキャッシュをクリア
  try {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(function(key) {
      localStorage.removeItem(key);
    });
  } catch (e) {
    console.warn('キャッシュのクリアに失敗しました。', e);
  }
}

// 背景画像選択モーダルを開く
function openBackgroundImageSelector() {
  var selectModal = document.getElementById('backgroundSelectModal');
  var imageGrid = document.getElementById('backgroundImageGrid');
  
  if (selectModal && imageGrid) {
    // 画像グリッドをクリア
    imageGrid.innerHTML = '';
    
    // 現在選択されている背景画像を取得
    var currentBackground = localStorage.getItem('customBackgroundImage');
    var currentImageName = null;
    
    // localStorageに保存がない場合は、デフォルトのbg.jpgを使用
    if (!currentBackground) {
      currentImageName = 'bg.jpg';
    } else if (currentBackground && currentBackground.startsWith('data:')) {
      // DataURLの場合は、デフォルト画像かどうか確認
      var defaultImage = document.getElementById('backgroundImage');
      if (defaultImage) {
        var defaultUrl = defaultImage.style.backgroundImage;
        if (defaultUrl && defaultUrl.includes('img/bg/')) {
          // デフォルト画像の場合はファイル名を抽出
          var match = defaultUrl.match(/img\/bg\/([^"']+)/);
          if (match) {
            currentImageName = match[1];
          } else {
            currentImageName = 'bg.jpg'; // デフォルト
          }
        } else {
          currentImageName = 'bg.jpg'; // デフォルト
        }
      } else {
        currentImageName = 'bg.jpg'; // デフォルト
      }
    } else if (currentBackground && currentBackground.includes('img/bg/')) {
      // パスからファイル名を抽出
      var match = currentBackground.match(/img\/bg\/([^"']+)/);
      if (match) {
        currentImageName = match[1];
      } else {
        currentImageName = 'bg.jpg'; // デフォルト
      }
    } else {
      // その他の場合はデフォルト
      currentImageName = 'bg.jpg';
    }
    
    // 各画像をグリッドに追加
    BACKGROUND_IMAGE_FILES.forEach(function(filename) {
      var imageItem = document.createElement('div');
      imageItem.className = 'background-image-item';
      if (filename === currentImageName || (!currentImageName && filename === 'bg.jpg')) {
        imageItem.classList.add('selected');
      }
      
      var img = document.createElement('img');
      img.src = 'img/bg/' + filename;
      img.alt = filename;
      img.onerror = function() {
        this.style.display = 'none';
      };
      
      imageItem.appendChild(img);
      
      // クリックイベント
      imageItem.addEventListener('click', function() {
        // 選択状態を更新
        var allItems = imageGrid.querySelectorAll('.background-image-item');
        allItems.forEach(function(item) {
          item.classList.remove('selected');
        });
        imageItem.classList.add('selected');
        
        // 選択した画像をプレビュー表示
        var imageUrl = 'img/bg/' + filename;
        showBackgroundPreview(imageUrl);
        closeBackgroundSelectModal();
      });
      
      imageGrid.appendChild(imageItem);
    });
    
    // モーダルを表示
    selectModal.classList.add('active');
  }
}

// 背景画像選択モーダルを閉じる
function closeBackgroundSelectModal() {
  var selectModal = document.getElementById('backgroundSelectModal');
  if (selectModal) {
    selectModal.classList.remove('active');
  }
}

// 背景画像を初期値に戻す
function resetBackgroundImage() {
  try {
    // localStorageから削除
    localStorage.removeItem('customBackgroundImage');
    localStorage.removeItem('backgroundBrightness');
    
    // 背景画像をデフォルトに戻す
    var backgroundImage = document.getElementById('backgroundImage');
    if (backgroundImage) {
      backgroundImage.style.backgroundImage = 'url("img/bg/bg.jpg")';
      backgroundImage.style.filter = '';
    }
    
    // オーバーレイを「明るい」に戻す
    var backgroundOverlay = document.querySelector('.background-overlay');
    if (backgroundOverlay) {
      backgroundOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    }
    
    // 明るさボタンを「明るい」に戻す
    setBackgroundBrightness('bright', false);
  } catch (e) {
    showError('背景画像のリセットに失敗しました。');
  }
}

// 背景画像選択時の処理
function handleBackgroundImageSelection(file) {
  if (!file.type.match('image.*')) {
    showError('画像ファイルを選択してください。');
    return;
  }
  
  var reader = new FileReader();
  reader.onload = function(e) {
    var imageDataUrl = e.target.result;
    showBackgroundPreview(imageDataUrl);
  };
  reader.onerror = function() {
    showError('画像の読み込みに失敗しました。');
  };
  reader.readAsDataURL(file);
}

// 背景画像プレビューを表示
function showBackgroundPreview(imageUrl) {
  var previewImage = document.getElementById('backgroundPreviewImage');
  var previewModal = document.getElementById('backgroundPreviewModal');
  
  if (previewImage && previewModal) {
    // 画像URLがDataURLか通常のURLかを判定
    if (imageUrl.startsWith('data:')) {
      // DataURLの場合は圧縮してからプレビューに表示
      compressImageToDataURL(imageUrl, 500, function(compressedDataUrl) {
        previewImage.src = compressedDataUrl;
        previewModal.classList.add('active');
        // 圧縮後のデータを一時保存（確定時に使用）
        previewImage.dataset.compressedData = compressedDataUrl;
        previewImage.dataset.imageUrl = ''; // 通常のURLではないことを示す
      });
    } else {
      // 通常のURLの場合はそのまま表示
      previewImage.src = imageUrl;
      previewModal.classList.add('active');
      previewImage.dataset.compressedData = ''; // DataURLではないことを示す
      previewImage.dataset.imageUrl = imageUrl; // 通常のURLを保存
    }
  }
}

// 背景画像プレビューモーダルを閉じる
function closeBackgroundPreviewModal() {
  var previewModal = document.getElementById('backgroundPreviewModal');
  if (previewModal) {
    previewModal.classList.remove('active');
  }
  // ファイル選択inputをリセット
  var fileInput = document.getElementById('backgroundImageFileInput');
  if (fileInput) {
    fileInput.value = '';
  }
}

// 背景画像を確定
function confirmBackgroundImage() {
  var previewImage = document.getElementById('backgroundPreviewImage');
  if (previewImage) {
    var imageUrl;
    
    // DataURLか通常のURLかを判定
    if (previewImage.dataset.compressedData) {
      // DataURLの場合
      imageUrl = previewImage.dataset.compressedData;
    } else if (previewImage.dataset.imageUrl) {
      // 通常のURLの場合
      imageUrl = previewImage.dataset.imageUrl;
    } else {
      showError('画像の情報が取得できませんでした。');
      return;
    }
    
    // localStorageに保存
    try {
      localStorage.setItem('customBackgroundImage', imageUrl);
      
      // 背景画像を更新
      var backgroundImage = document.getElementById('backgroundImage');
      if (backgroundImage) {
        // URLが既に引用符で囲まれている場合はそのまま、そうでない場合は追加
        var urlValue = imageUrl;
        if (!urlValue.startsWith('"') && !urlValue.startsWith("'")) {
          if (urlValue.startsWith('img/bg/')) {
            urlValue = '"' + urlValue + '"';
          }
        }
        backgroundImage.style.backgroundImage = 'url(' + urlValue + ')';
      }
      
      // プレビューモーダルを閉じる
      closeBackgroundPreviewModal();
    } catch (e) {
      showError('背景画像の保存に失敗しました。ストレージの容量が不足している可能性があります。');
    }
  }
}

// 画像を500KB以下に圧縮
function compressImageToDataURL(dataUrl, maxSizeKB, callback) {
  var maxSizeBytes = maxSizeKB * 1024;
  var img = new Image();
  
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    
    // 画像のサイズを取得
    var width = img.width;
    var height = img.height;
    
    // 最大サイズを超える場合はリサイズ
    var maxDimension = 1920; // 最大幅・高さ
    if (width > maxDimension || height > maxDimension) {
      var ratio = Math.min(maxDimension / width, maxDimension / height);
      width = width * ratio;
      height = height * ratio;
    }
    
    canvas.width = width;
    canvas.height = height;
    
    // 画像を描画
    ctx.drawImage(img, 0, 0, width, height);
    
    // 品質を調整しながら圧縮（二分探索）
    var quality = 0.9;
    var minQuality = 0.1;
    var maxQuality = 0.9;
    var compressedDataUrl = null;
    
    function compress() {
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      var size = (dataUrl.length * 3) / 4; // Base64のサイズをバイト数に変換（概算）
      
      if (size <= maxSizeBytes || quality <= minQuality) {
        compressedDataUrl = dataUrl;
        callback(compressedDataUrl);
      } else {
        // 品質を下げて再試行
        maxQuality = quality;
        quality = (quality + minQuality) / 2;
        compress();
      }
    }
    
    compress();
  };
  
  img.onerror = function() {
    showError('画像の読み込みに失敗しました。');
  };
  
  img.src = dataUrl;
}

// カテゴリデータを読み込む
function loadCategoryData(categoryNo) {
  // userEmailが設定されていない場合は、再度確認
  if (!userEmail) {
    userEmail = localStorage.getItem('userEmail');
  }
  
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  
  var categoryKey = String(categoryNo);
  var loadingSpinner = document.getElementById('categoryLoadingSpinner');
  var prevButton = document.getElementById('listPrevButton');
  var nextButton = document.getElementById('listNextButton');
  var startButton = document.getElementById('startButton');
  var listContainer = document.getElementById('listContainer');
  
  // セッション内キャッシュがあれば即表示（体感待ちを短縮）
  var localCached = categoryDataByNo[categoryKey];
  if (localCached && localCached.length > 0) {
    applyLoadedCategoryData(categoryNo, localCached);
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } else {
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (prevButton) prevButton.disabled = true;
    if (nextButton) nextButton.disabled = true;
    if (startButton) startButton.disabled = true;
    if (listContainer) listContainer.style.pointerEvents = 'none';
  }
  
  // Google Apps Script経由でデータを取得（裏で最新化）
  var params = new URLSearchParams();
  params.append('action', 'getCategoryData');
  params.append('categoryNo', categoryNo);
  params.append('email', userEmail);
  params.append('referer', window.location.origin);
  
  var requestUrl = WEB_APP_URL + '?' + params.toString();
  
  fetch(requestUrl)
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      try {
        if (!data.success) {
          throw new Error(data.error || 'データの取得に失敗しました');
        }
        
        if (!data.items) {
          throw new Error('データがありません');
        }
        
        // 切替が速いと古い応答が後着するため、現在選択中のカテゴリのみ反映
        var selectEl = document.getElementById('categorySelect');
        if (selectEl && String(selectEl.value) !== categoryKey) {
          return;
        }
        
        categoryDataByNo[categoryKey] = data.items;
        applyLoadedCategoryData(categoryNo, data.items);
        
        if (loadingSpinner) {
          loadingSpinner.style.display = 'none';
        }
      } catch (e) {
        if (!localCached) {
          showError('データ読み込みエラー: ' + e.toString());
        }
        if (loadingSpinner) {
          loadingSpinner.style.display = 'none';
        }
        updateListNavButtons();
        if (startButton) startButton.disabled = false;
        if (listContainer) listContainer.style.pointerEvents = 'auto';
      }
    })
    .catch(function(error) {
      if (!localCached) {
        showError('アクセスエラー: ' + error.toString());
      }
      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }
      updateListNavButtons();
      if (startButton) startButton.disabled = false;
      if (listContainer) listContainer.style.pointerEvents = 'auto';
    });
}

/**
 * 取得済みカテゴリデータを画面へ反映
 * @param {string|number} categoryNo
 * @param {Array} items
 */
function applyLoadedCategoryData(categoryNo, items) {
  currentCategoryData = items;
  currentCategoryNo = categoryNo;
  selectedQuestionIndices = [];
  displayList();
  syncCategoryLastDateFromList();
  updateListNavButtons();
  
  var startButton = document.getElementById('startButton');
  if (startButton) startButton.disabled = false;
  
  var listContainer = document.getElementById('listContainer');
  if (listContainer) listContainer.style.pointerEvents = 'auto';
}

/**
 * 現在のList UI 要素ID（初期画面／学習完了画面）
 * @returns {Object}
 */
function getListUiConfig() {
  if (isLearningCompleted) {
    return {
      tableBodyId: 'completionListTableBody',
      headerId: 'completionListTableHeader',
      messageId: 'completionListMessage',
      containerId: 'completionListContainer',
      selectionCountId: 'completionSelectionCount',
      clearButtonId: 'completionClearSelectionButton',
      allowPreviewModal: false,
      showStartButton: false
    };
  }
  return {
    tableBodyId: 'listTableBody',
    headerId: 'listTableHeader',
    messageId: 'listMessage',
    containerId: 'listContainer',
    selectionCountId: 'selectionCount',
    clearButtonId: 'clearSelectionButton',
    allowPreviewModal: true,
    showStartButton: true
  };
}

// リストを表示
function displayList() {
  var ui = getListUiConfig();
  var tableBody = document.getElementById(ui.tableBodyId);
  if (!tableBody) return;
  
  var listContainerEl = ui.containerId ? document.getElementById(ui.containerId) : null;
  if (isLearningCompleted && listContainerEl) {
    var pinnedMinHeight = listContainerEl.offsetHeight;
    if (pinnedMinHeight > 0) {
      listContainerEl.style.minHeight = pinnedMinHeight + 'px';
    }
  }
  
  tableBody.innerHTML = '';
  
  // 最初のアイテムから出題側タイトルを取得してヘッダーに設定
  if (currentCategoryData.length > 0) {
    var headerCell = document.getElementById(ui.headerId);
    if (headerCell) {
      headerCell.textContent = getEffectiveQTitle(currentCategoryData[0]) || '';
    }
  }
  
  currentCategoryData.forEach(function(item, index) {
    var row = document.createElement('tr');
    var isSelected = selectedQuestionIndices.indexOf(index) !== -1;
    
    // 選択状態に応じてクラスを追加
    if (isSelected) {
      row.classList.add('selected-row');
    }
    
    var noCell = document.createElement('td');
    noCell.textContent = item.no || '';
    // 選択状態に応じてNo列にクラスを追加
    if (isSelected) {
      noCell.classList.add('selected-no');
    }
    var questionCell = document.createElement('td');
    // 出題側の値を表示（画像対応・入替え対応）
    var questionContent = getEffectiveQuestion(item);
    if (isImageUrl(questionContent)) {
      // 画像URLの場合はサムネイル表示
      var imageUrl = convertGoogleDriveUrl(questionContent);
      var img = document.createElement('img');
      img.src = imageUrl;
      img.className = 'list-thumbnail';
      img.alt = '画像';
      img.style.maxWidth = '100px';
      img.style.maxHeight = '60px';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.objectFit = 'contain';
      
      // エラーハンドリング
      img.addEventListener('error', function() {
        questionCell.textContent = '[画像]';
      });
      
      questionCell.appendChild(img);
    } else {
      // テキストの場合はテキスト表示
      questionCell.textContent = questionContent;
    }
    
    var studyCountCell = document.createElement('td');
    studyCountCell.className = 'list-col-study-count';
    studyCountCell.textContent = formatStudyCountForList(item);
    
    var durationOldCell = document.createElement('td');
    durationOldCell.className = 'list-col-duration list-col-duration-old';
    durationOldCell.textContent = formatDurationForDisplay(item.duration_old);
    
    var durationCell = document.createElement('td');
    durationCell.className = 'list-col-duration list-col-duration-latest';
    durationCell.textContent = formatDurationForDisplay(item.duration);
    
    var lastDateCell = document.createElement('td');
    lastDateCell.className = 'list-col-lastdate';
    lastDateCell.textContent = formatYmdForDisplay(item.last_date);
    
    row.appendChild(noCell);
    row.appendChild(questionCell);
    row.appendChild(studyCountCell);
    row.appendChild(durationOldCell);
    row.appendChild(durationCell);
    row.appendChild(lastDateCell);
    
    // シングルクリックで選択/解除（トグル）
    var clickTimer = null;
    row.addEventListener('click', function(e) {
      if (clickTimer === null) {
        clickTimer = setTimeout(function() {
          clickTimer = null;
          // シングルクリック：選択/解除
          toggleQuestionSelection(index, row);
        }, 300);
      }
    });
    
    // ダブルクリックでモーダル表示（学習完了画面では無効）
    if (ui.allowPreviewModal) {
      row.addEventListener('dblclick', function(e) {
        e.preventDefault();
        if (clickTimer) {
          clearTimeout(clickTimer);
          clickTimer = null;
        }
        var itemIndex = currentCategoryData.indexOf(item);
        showModal(item, itemIndex);
      });
    }
    
    tableBody.appendChild(row);
  });
  
  // 選択数の表示を更新
  updateSelectionCount();
  
  var listMessage = document.getElementById(ui.messageId);
  var listContainer = document.getElementById(ui.containerId);
  var startButton = document.getElementById('startButton');
  
  if (listMessage) listMessage.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  if (ui.showStartButton && startButton) {
    startButton.style.display = 'block';
  }
  
  if (isLearningCompleted) {
    if (listContainerEl) listContainerEl.style.minHeight = '';
    updateNavAnswerButton();
    maintainCompletionScrollAtBottom();
  }
}

// 問題の選択/解除をトグル
function toggleQuestionSelection(index, row) {
  var selectedIndex = selectedQuestionIndices.indexOf(index);
  var noCell = row.querySelector('td:first-child'); // No列を取得
  if (selectedIndex === -1) {
    // 選択
    selectedQuestionIndices.push(index);
    row.classList.add('selected-row');
    if (noCell) noCell.classList.add('selected-no');
  } else {
    // 解除
    selectedQuestionIndices.splice(selectedIndex, 1);
    row.classList.remove('selected-row');
    if (noCell) noCell.classList.remove('selected-no');
  }
  updateSelectionCount();
  if (isLearningCompleted) {
    updateNavAnswerButton();
  }
}

// Listナビゲーションボタンを表示
function showListNavButtons() {
  var listNavContainer = document.querySelector('.list-nav-container');
  if (listNavContainer) {
    listNavContainer.style.visibility = 'visible';
  }
}

// Listナビゲーションボタンを非表示
function hideListNavButtons() {
  var listNavContainer = document.querySelector('.list-nav-container');
  if (listNavContainer) {
    listNavContainer.style.visibility = 'hidden';
  }
}

// 前のカテゴリに移動（学習日優先時はページ戻し）
function navigateToPreviousCategory() {
  if (isLastDateQuestionMethod()) {
    navigateLastDateModePage(-1);
    return;
  }
  var select = document.getElementById('categorySelect');
  if (!select || !select.value || categories.length === 0) {
    return;
  }
  
  // ボタンを無効化
  var prevButton = document.getElementById('listPrevButton');
  var nextButton = document.getElementById('listNextButton');
  if (prevButton) prevButton.disabled = true;
  if (nextButton) nextButton.disabled = true;
  
  // 現在選択されているカテゴリのインデックスを取得
  var currentIndex = -1;
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].no == select.value) {
      currentIndex = i;
      break;
    }
  }
  
  // 前の選択可能カテゴリへ
  var previousIndex = findSelectableCategoryIndex(currentIndex, -1);
  if (previousIndex >= 0) {
    select.value = categories[previousIndex].no;
    var event = new Event('change', { bubbles: true });
    select.dispatchEvent(event);
    syncCustomCategorySelect(select);
  }
}

// 次のカテゴリに移動（学習日優先時はページ送り）
function navigateToNextCategory() {
  if (isLastDateQuestionMethod()) {
    navigateLastDateModePage(1);
    return;
  }
  var select = document.getElementById('categorySelect');
  if (!select || !select.value || categories.length === 0) {
    return;
  }
  
  // ボタンを無効化
  var prevButton = document.getElementById('listPrevButton');
  var nextButton = document.getElementById('listNextButton');
  if (prevButton) prevButton.disabled = true;
  if (nextButton) nextButton.disabled = true;
  
  // 現在選択されているカテゴリのインデックスを取得
  var currentIndex = -1;
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].no == select.value) {
      currentIndex = i;
      break;
    }
  }
  
  // 次の選択可能カテゴリへ
  var nextIndex = findSelectableCategoryIndex(currentIndex, 1);
  if (nextIndex >= 0) {
    select.value = categories[nextIndex].no;
    var event = new Event('change', { bubbles: true });
    select.dispatchEvent(event);
    syncCustomCategorySelect(select);
  }
}

// Listナビゲーションボタンの状態を更新
function updateListNavButtons() {
  var prevButton = document.getElementById('listPrevButton');
  var nextButton = document.getElementById('listNextButton');
  var select = document.getElementById('categorySelect');
  
  if (!prevButton || !nextButton) {
    return;
  }
  
  // 学習日優先：7件ページ送り
  if (isLastDateQuestionMethod()) {
    if (isLearningCompleted && isLastDateCompletionSessionView) {
      showListNavButtons();
      prevButton.disabled = true;
      nextButton.disabled = false;
      return;
    }
    var pageCount = getLastDateModePageCount();
    if (pageCount <= 0) {
      hideListNavButtons();
      return;
    }
    showListNavButtons();
    prevButton.disabled = lastDateModePageIndex <= 0;
    nextButton.disabled = lastDateModePageIndex >= pageCount - 1;
    return;
  }
  
  if (!select || categories.length === 0) {
    hideListNavButtons();
    return;
  }
  
  // カテゴリが選択されていない場合
  if (!select.value) {
    hideListNavButtons();
    return;
  }
  
  // カテゴリが選択されている場合は表示
  showListNavButtons();
  
  // 現在選択されているカテゴリのインデックスを取得
  var currentIndex = -1;
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].no == select.value) {
      currentIndex = i;
      break;
    }
  }
  
  // ボタンの有効/無効を設定（ENDカテゴリはスキップして前後の有無を判定）
  if (currentIndex === -1) {
    prevButton.disabled = true;
    nextButton.disabled = true;
  } else {
    prevButton.disabled = (findSelectableCategoryIndex(currentIndex, -1) < 0);
    nextButton.disabled = (findSelectableCategoryIndex(currentIndex, 1) < 0);
  }
}

// 選択数の表示を更新
function updateSelectionCount() {
  var ui = getListUiConfig();
  var selectionCount = document.getElementById(ui.selectionCountId);
  if (!selectionCount) return;
  
  var totalCount = currentCategoryData.length;
  var selectedCount = selectedQuestionIndices.length;
  
  if (selectedCount === 0) {
    // 未選択時は全問表示
    selectionCount.textContent = '全' + totalCount + '問';
    selectionCount.style.display = 'inline';
  } else {
    // 選択された問題のNoを取得して表示
    var selectedNos = [];
    selectedQuestionIndices.sort(function(a, b) { return a - b; }); // インデックスをソート
    selectedQuestionIndices.forEach(function(index) {
      if (index >= 0 && index < currentCategoryData.length) {
        var no = currentCategoryData[index].no;
        if (no) {
          selectedNos.push(no);
        }
      }
    });
    selectionCount.textContent = '全' + selectedCount + '問(' + selectedNos.join(',') + ')';
    selectionCount.style.display = 'inline';
  }
  
  // クリアボタンの有効/無効を更新
  updateClearButton();
}

// リスト表示をリセット
function resetListDisplay() {
  var listMessage = document.getElementById('listMessage');
  var listContainer = document.getElementById('listContainer');
  var startButton = document.getElementById('startButton');
  var selectionCount = document.getElementById('selectionCount');
  
  if (listMessage) {
    listMessage.style.display = 'block';
    listMessage.style.whiteSpace = '';
    listMessage.textContent = 'Categoryを選択してください。';
  }
  if (listContainer) listContainer.style.display = 'none';
  if (startButton) startButton.style.display = 'none';
  if (selectionCount) selectionCount.style.display = 'none';
  
  // ボタンを非表示
  hideListNavButtons();
  // ボタンの状態をリセット
  updateListNavButtons();
}

// エラーを表示
// エラーメッセージの配列（複数エラーを管理）
var errorMessages = [];

function showError(message) {
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

// 学習開始
function startLearning() {
  if (currentCategoryData.length === 0) {
    return;
  }
  
  // 完了時カテゴリナビ用アイコンを通常（再生／次へ）に戻す
  setLearningNavIconsNormal();
  
  // 元のデータを保存（学習日優先の Plus 用セッションも保持）
  originalCategoryData = currentCategoryData.slice();
  if (isLastDateQuestionMethod()) {
    lastDateModeSessionItems = originalCategoryData.slice();
  }
  
  // 選択された問題のみを抽出（未選択時は全問）
  var filteredData = [];
  if (selectedQuestionIndices.length === 0) {
    // 未選択時は全問
    filteredData = currentCategoryData.slice();
  } else {
    // 選択された問題のみ（元の順序で）
    selectedQuestionIndices.sort(function(a, b) { return a - b; }); // インデックスをソート
    selectedQuestionIndices.forEach(function(index) {
      if (index >= 0 && index < currentCategoryData.length) {
        filteredData.push(currentCategoryData[index]);
      }
    });
  }
  
  // フィルタリングされたデータをcurrentCategoryDataに設定
  currentCategoryData = filteredData;
  
  // 画面遷移
  var screen1 = document.getElementById('screen1');
  var screen2 = document.getElementById('screen2');
  if (screen1) screen1.classList.remove('active');
  if (screen2) screen2.classList.add('active');
  
  // コンテナのパディングを減らす
  var container = document.querySelector('.container');
  if (container) container.classList.add('learning-mode');
  
  // カテゴリ情報／出題方法を表示
  var currentCategory = document.getElementById('currentCategory');
  if (isLastDateQuestionMethod()) {
    hideLearningCategorySelect();
    if (currentCategory) {
      currentCategory.classList.remove('is-hidden');
      currentCategory.textContent = '解答時間優先モード';
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
    var selectedCategory = categories.find(function(cat) {
      return cat.no == currentCategoryNo;
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
  currentQuestionIndex = 0;
  
  // 再チャレンジ関連変数をリセット
  retryQuestionIndices = [];
  isInRetryMode = false;
  retryQuestionIndex = 0;
  completedQuestionIndices = [];
  isLearningCompleted = false;
  
  // 学習完了メッセージを非表示
  hideCompletionMessage();
  
  // 出題数表示を更新
  updateQuestionInfoDisplay();
  
  displayQuestion();
  
  // 最初の問題と次の問題をプリロード
  preloadAudioForCurrentAndNext();
  
  // トグルボタンの状態を同期（リスニングON時は出題読みON固定・解答読みON）
  syncQuestionToggleForListeningMode();
  
  // トグルボタンの位置を更新（screen2のタイトル位置に合わせる）
  requestAnimationFrame(function() {
    requestAnimationFrame(updateToggleButtonPosition);
  });
  
  isCategoryTransitionInProgress = false;
  setLearningCategorySelectDisabled(false);
  refreshAdvanceNavControls();
  updateLearningLockedSideMenuControls();
}

// 学習時間カウンターを開始
function startLearningTimeCounter() {
  learningTimeInterval = setInterval(function() {
    updateLearningTime();
  }, 1000);
  updateLearningTime();
}

// 学習時間を更新
function updateLearningTime() {
  if (learningStartTime === null) return;
  
  var elapsed = Date.now() - learningStartTime;
  var totalMinutes = Math.floor(elapsed / 60000);
  var hours = Math.floor(totalMinutes / 60);
  var minutes = totalMinutes % 60;
  var seconds = Math.floor((elapsed / 1000) % 60);
  
  var timeText = '<学習時間>' + hours + '時間' + String(minutes).padStart(2, '0') + '分' + String(seconds).padStart(2, '0') + '秒';
  
  // 学習画面の学習時間を更新
  var learningTimeElement = document.getElementById('learningTime');
  if (learningTimeElement) {
    learningTimeElement.textContent = timeText;
  }
  
  // TOPページの学習時間を更新
  var learningTimeTopElement = document.getElementById('learningTimeTop');
  if (learningTimeTopElement) {
    learningTimeTopElement.textContent = timeText;
  }
}

// 問題を表示
function displayQuestion() {
  if (currentQuestionIndex < 0 || currentQuestionIndex >= currentCategoryData.length) {
    return;
  }
  
  stopCurrentAudioPlayback();
  
  var item = currentCategoryData[currentQuestionIndex];
  var effectiveQuestion = getEffectiveQuestion(item);
  var isListeningQuestion = isListeningModeEnabled() && effectiveQuestion && !isImageUrl(effectiveQuestion);
  
  // セクションラベルを出題／解答タイトルから設定（入替え対応）
  var questionLabel = document.getElementById('questionSectionLabel');
  if (questionLabel) {
    questionLabel.textContent = getEffectiveQTitle(item) || '';
  }
  var answerLabel = document.getElementById('answerSectionLabel');
  if (answerLabel) {
    answerLabel.textContent = getEffectiveATitle(item) || '';
  }
  
  // 出題数表示
  updateQuestionInfoDisplay();
  
  // 質問文を表示（画像対応／リスニング時はプレースホルダ）
  var questionText = document.getElementById('questionText');
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
  var answerButtonContainer = document.getElementById('answerButtonContainer');
  if (answerButtonContainer) answerButtonContainer.style.display = 'block';
  
  // 回答テキストを非表示
  var answerTextDisplay = document.getElementById('answerTextDisplay');
  var noteSection = document.getElementById('noteSection');
  if (answerTextDisplay) answerTextDisplay.style.display = 'none';
  if (noteSection) noteSection.style.display = 'none';
  isAnswerShown = false;
  
  // ストップウォッチ：通常は即開始。リスニング（テキスト出題）は出題音声終了後
  resetStopwatch();
  if (isListeningQuestion) {
    waitingListeningAnsGate = true;
  } else {
    waitingListeningAnsGate = false;
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
  var plusButton = document.getElementById('plusButton');
  if (plusButton) plusButton.disabled = true;
  
  // 出題読みトグルON、またはリスニング練習モード時は出題を自動再生
  if ((isQuestionToggleActive || isListeningQuestion) && effectiveQuestion && !isImageUrl(effectiveQuestion)) {
    setTimeout(function() {
      var currentItem = currentCategoryData[currentQuestionIndex];
      if (!currentItem || isAnswerShown) return;
      var text = getEffectiveQuestion(currentItem);
      if (text && !isImageUrl(text)) {
        playFieldAudio('question');
      } else if (waitingListeningAnsGate) {
        releaseListeningAnsGate();
      }
    }, 250);
  } else if (waitingListeningAnsGate) {
    releaseListeningAnsGate();
  }
  
  // 次の問題をプリロード（バックグラウンドで非同期実行）
  preloadNextQuestions();
}

/**
 * リスニング練習：出題音声終了（または失敗）後に Ans を有効化し計測開始
 */
function releaseListeningAnsGate() {
  if (!waitingListeningAnsGate) return;
  waitingListeningAnsGate = false;
  if (!isAnswerShown && !isLearningCompleted) {
    startStopwatch();
  }
  updateNavAnswerButton();
}

// ストップウォッチを開始
function startStopwatch() {
  if (isStopwatchRunning) return;
  
  stopwatchStartTime = Date.now() - stopwatchElapsed;
  isStopwatchRunning = true;
  stopwatchInterval = setInterval(function() {
    updateStopwatch();
  }, 10);
  updateStopwatch();
}

// ストップウォッチを停止
function stopStopwatch() {
  if (!isStopwatchRunning) return;
  
  clearInterval(stopwatchInterval);
  stopwatchElapsed = Date.now() - stopwatchStartTime;
  isStopwatchRunning = false;
}

// ストップウォッチをリセット
function resetStopwatch() {
  stopStopwatch();
  stopwatchElapsed = 0;
  var navAnswerStopwatch = document.getElementById('navAnswerStopwatch');
  if (navAnswerStopwatch) {
    navAnswerStopwatch.textContent = '00:00:00';
  }
}

// ストップウォッチを更新
function updateStopwatch() {
  if (!isStopwatchRunning) return;
  
  var elapsed = Date.now() - stopwatchStartTime;
  var totalSeconds = Math.floor(elapsed / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var milliseconds = Math.floor((elapsed % 1000) / 10);
  
  var timeText = String(minutes).padStart(2, '0') + ':' +
                 String(seconds).padStart(2, '0') + ':' +
                 String(milliseconds).padStart(2, '0');
  
  // ナビゲーションバーのAnswerボタン内のストップウォッチを更新
  var navAnswerStopwatch = document.getElementById('navAnswerStopwatch');
  if (navAnswerStopwatch) {
    navAnswerStopwatch.textContent = timeText;
  }
}

// 答えを表示
function showAnswer() {
  if (isAnswerShown) return;
  if (waitingListeningAnsGate) return;
  
  waitingListeningAnsGate = false;
  stopStopwatch();
  
  var item = currentCategoryData[currentQuestionIndex];
  var effectiveQuestion = getEffectiveQuestion(item);
  var effectiveAnswer = getEffectiveAnswer(item);
  var isListeningQuestion = isListeningModeEnabled() && effectiveQuestion && !isImageUrl(effectiveQuestion);
  
  // 上の黒いボックスを非表示
  var answerButtonContainer = document.getElementById('answerButtonContainer');
  if (answerButtonContainer) answerButtonContainer.style.display = 'none';
  
  // リスニング練習モード時は出題側にも文字を表示
  if (isListeningQuestion) {
    var questionText = document.getElementById('questionText');
    if (questionText) {
      displayImageOrText(questionText, effectiveQuestion);
    }
  }
  
  // 回答文を表示（画像対応・入替え対応）
  var answerTextDisplay = document.getElementById('answerTextDisplay');
  if (answerTextDisplay) {
    displayImageOrText(answerTextDisplay, effectiveAnswer);
    answerTextDisplay.classList.remove('answer-hidden');
    answerTextDisplay.style.display = 'block';
  }
  
  // noteを常に表示（空欄時は背景をより透明にして空欄を示す）
  var noteText = document.getElementById('noteText');
  var noteSection = document.getElementById('noteSection');
  var noteValue = item.note || '';
  var isNoteEmpty = !String(noteValue).trim();
  if (noteText) {
    noteText.textContent = noteValue;
    if (isNoteEmpty) {
      noteText.classList.add('note-empty');
    } else {
      noteText.classList.remove('note-empty');
    }
  }
  if (noteSection) noteSection.style.display = 'block';
  
  isAnswerShown = true;
  
  // 中央ボタンを Next に切り替え（時間表示は維持）
  updateNavAnswerButton();
  
  // 出題／解答の再生ボタンを更新（Ans後なので解答再生を有効化）
  updateFieldPlayButtons();
  
  // TotalStudyCount / Duration / LastDate をメモリ即反映 → 画面メタ更新 → GASは1リクエストで非同期
  persistAnsStudyStatsAsync(item, stopwatchElapsed);
  updateLearningMetaDisplay(item, 'learningMeta');
  
  // ナビゲーションボタンを有効化
  updateNavigationButtons();
  
  // プラスボタンを有効化（回答表示中、学習完了でない場合）
  updatePlusButton();
  
  // 解答読みトグルボタンがONの場合、自動再生（更新モード中は再生しない）
  if (isAnswerToggleActive && !isUpdateMode) {
    playFieldAudio('answer');
  }
  
  // 出題／解答／note のダブルクリック編集を有効化
  setupFieldEditDoubleClick();
}

// 学習画面の項目編集用ダブルクリックを設定
function setupFieldEditDoubleClick() {
  if (isUpdateMode) return;
  
  var questionText = document.getElementById('questionText');
  if (questionText) {
    questionText.removeEventListener('dblclick', handleQuestionDoubleClick);
    questionText.addEventListener('dblclick', handleQuestionDoubleClick);
  }
  
  var answerTextDisplay = document.getElementById('answerTextDisplay');
  if (answerTextDisplay) {
    answerTextDisplay.removeEventListener('dblclick', handleAnswerDoubleClick);
    answerTextDisplay.addEventListener('dblclick', handleAnswerDoubleClick);
  }
  
  var noteText = document.getElementById('noteText');
  if (noteText) {
    noteText.removeEventListener('dblclick', handleNoteDoubleClick);
    noteText.addEventListener('dblclick', handleNoteDoubleClick);
  }
}

function handleQuestionDoubleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  startUpdateMode('question');
}

function handleAnswerDoubleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  startUpdateMode('answer');
}

function handleNoteDoubleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  startUpdateMode('note');
}

/**
 * 画面上の欄から、スプレッドシート保存先フィールドを解決する
 * @param {string} displayTarget - 'question' | 'answer' | 'note'
 * @returns {string} 'question' | 'answer' | 'note'
 */
function resolveStorageField(displayTarget) {
  if (displayTarget === 'note') {
    return 'note';
  }
  if (displayTarget === 'question') {
    return isSwapQAEnabled() ? 'answer' : 'question';
  }
  if (displayTarget === 'answer') {
    return isSwapQAEnabled() ? 'question' : 'answer';
  }
  return displayTarget;
}

/**
 * 編集UI要素のID等を返す
 * @param {string} displayTarget
 * @returns {Object|null}
 */
function getUpdateUiConfig(displayTarget) {
  if (displayTarget === 'question') {
    return {
      displayId: 'questionText',
      editId: 'questionTextEdit',
      controlsId: 'questionUpdateControls',
      sectionId: 'questionSection',
      confirmTitle: '出題（Question）を更新しますか？'
    };
  }
  if (displayTarget === 'answer') {
    return {
      displayId: 'answerTextDisplay',
      editId: 'answerTextEdit',
      controlsId: 'answerUpdateControls',
      sectionId: 'answerSection',
      confirmTitle: '解答（Answer）を更新しますか？'
    };
  }
  if (displayTarget === 'note') {
    return {
      displayId: 'noteText',
      editId: 'noteTextEdit',
      controlsId: 'noteUpdateControls',
      sectionId: 'noteSection',
      confirmTitle: 'noteを更新しますか？'
    };
  }
  return null;
}

/**
 * 保存先フィールドの確認モーダルタイトル（実体列ベース）
 * @param {string} storageField
 * @returns {string}
 */
function getConfirmTitleForStorageField(storageField) {
  if (storageField === 'question') {
    return '出題（Question列）を更新しますか？';
  }
  if (storageField === 'answer') {
    return '解答（Answer列）を更新しますか？';
  }
  if (storageField === 'note') {
    return 'note列を更新しますか？';
  }
  return '内容を更新しますか？';
}

/**
 * 端末ローカルの現在日時を yyyy-mm-dd HH:mm で返す
 * @returns {string}
 */
function getNowYmdHmLocal() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  var d = now.getDate();
  var hh = now.getHours();
  var mi = now.getMinutes();
  return y + '-' + (m < 10 ? '0' + m : String(m)) + '-' + (d < 10 ? '0' + d : String(d)) +
    ' ' + (hh < 10 ? '0' + hh : String(hh)) + ':' + (mi < 10 ? '0' + mi : String(mi));
}

/**
 * 端末ローカルの今日を yyyy-mm-dd で返す（互換）
 * @returns {string}
 */
function getTodayYmdLocal() {
  return getNowYmdHmLocal().substring(0, 10);
}

/**
 * LastDate 値を yyyy-mm-dd または yyyy-mm-dd HH:mm に正規化
 * @param {*} value
 * @returns {string}
 */
function normalizeLastDate(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    var y = value.getFullYear();
    var m = value.getMonth() + 1;
    var d = value.getDate();
    var hh = value.getHours();
    var mi = value.getMinutes();
    return y + '-' + (m < 10 ? '0' + m : String(m)) + '-' + (d < 10 ? '0' + d : String(d)) +
      ' ' + (hh < 10 ? '0' + hh : String(hh)) + ':' + (mi < 10 ? '0' + mi : String(mi));
  }
  var s = String(value).trim();
  if (!s) {
    return '';
  }
  var dtMatched = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})/);
  if (dtMatched) {
    var mm = dtMatched[2].length === 1 ? '0' + dtMatched[2] : dtMatched[2];
    var dd = dtMatched[3].length === 1 ? '0' + dtMatched[3] : dtMatched[3];
    var h = dtMatched[4].length === 1 ? '0' + dtMatched[4] : dtMatched[4];
    return dtMatched[1] + '-' + mm + '-' + dd + ' ' + h + ':' + dtMatched[5];
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return normalizeLastDate(dt);
    }
  }
  var matched = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (matched) {
    var mm2 = matched[2].length === 1 ? '0' + matched[2] : matched[2];
    var dd2 = matched[3].length === 1 ? '0' + matched[3] : matched[3];
    return matched[1] + '-' + mm2 + '-' + dd2;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  return '';
}

/**
 * 日付値を yyyy-mm-dd に正規化（日付部分のみ。互換用）
 * @param {*} value
 * @returns {string}
 */
function normalizeToYmd(value) {
  var normalized = normalizeLastDate(value);
  if (!normalized) {
    return '';
  }
  return normalized.substring(0, 10);
}

/**
 * LastDate を表示用 yyyy/m/d または yyyy/m/d H:mm に変換
 * @param {string} value
 * @returns {string}
 */
function formatYmdForDisplay(value) {
  var normalized = normalizeLastDate(value);
  if (!normalized) {
    return '-';
  }
  var matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!matched) {
    return '-';
  }
  var text = Number(matched[1]) + '/' + Number(matched[2]) + '/' + Number(matched[3]);
  if (matched[4] !== undefined && matched[5] !== undefined) {
    text += ' ' + Number(matched[4]) + ':' + matched[5];
  }
  return text;
}

/**
 * RetryCount を表示用数値にする（空欄は0）
 * @param {*} value
 * @returns {number}
 */
function getRetryCountNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }
  var n = Number(value);
  if (isNaN(n) || n < 0) {
    return 0;
  }
  return n;
}

/**
 * 経過ミリ秒をシート保存用 Duration（MM:SS:CS）に変換
 * @param {number} elapsedMs
 * @returns {string}
 */
function formatDurationForSheet(elapsedMs) {
  var elapsed = Math.max(0, Math.round(Number(elapsedMs) || 0));
  var totalSeconds = Math.floor(elapsed / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var centiseconds = Math.floor((elapsed % 1000) / 10);
  return String(minutes).padStart(2, '0') + ':' +
         String(seconds).padStart(2, '0') + ':' +
         String(centiseconds).padStart(2, '0');
}

/**
 * Duration を MM:SS:CS に正規化（不正・空は空文字）
 * シート由来の Date.toString（1899 基準）も H:M:S → MM:SS:CS として復元する
 * @param {*} duration
 * @returns {string}
 */
function coerceDurationToMmSsCs(duration) {
  if (duration === '' || duration === null || duration === undefined) {
    return '';
  }
  var text = String(duration).trim();
  if (!text) {
    return '';
  }
  if (/^\d{1,3}:\d{2}:\d{2}$/.test(text)) {
    var partsOk = text.split(':');
    var mmOk = String(parseInt(partsOk[0], 10) || 0);
    var ssOk = String(parseInt(partsOk[1], 10) || 0);
    var csOk = String(parseInt(partsOk[2], 10) || 0);
    while (mmOk.length < 2) mmOk = '0' + mmOk;
    while (ssOk.length < 2) ssOk = '0' + ssOk;
    while (csOk.length < 2) csOk = '0' + csOk;
    return mmOk + ':' + ssOk + ':' + csOk;
  }
  // 例: Sat Dec 30 1899 00:10:28 GMT+0900 (...)
  if (/1899/.test(text)) {
    var matched = text.match(/\b(\d{1,2}):(\d{2}):(\d{2})\b/);
    if (matched) {
      var mmD = String(parseInt(matched[1], 10) || 0);
      var ssD = String(parseInt(matched[2], 10) || 0);
      var csD = String(parseInt(matched[3], 10) || 0);
      while (mmD.length < 2) mmD = '0' + mmD;
      while (ssD.length < 2) ssD = '0' + ssD;
      while (csD.length < 2) csD = '0' + csD;
      return mmD + ':' + ssD + ':' + csD;
    }
  }
  return '';
}

/**
 * Duration（MM:SS:CS）をミリ秒に変換。不正・空は null
 * @param {string} duration
 * @returns {number|null}
 */
function parseDurationToMs(duration) {
  var text = coerceDurationToMmSsCs(duration);
  if (!text) {
    return null;
  }
  var parts = text.split(':');
  var minutes = parseInt(parts[0], 10);
  var seconds = parseInt(parts[1], 10);
  var centiseconds = parseInt(parts[2], 10);
  if (isNaN(minutes) || isNaN(seconds) || isNaN(centiseconds)) {
    return null;
  }
  return (minutes * 60 + seconds) * 1000 + centiseconds * 10;
}

/**
 * Duration（MM:SS:CS）を画面表示用「m.n秒」に変換（1分超も秒換算）
 * @param {string} duration
 * @returns {string}
 */
function formatDurationForDisplay(duration) {
  var text = coerceDurationToMmSsCs(duration);
  if (!text) {
    return '-';
  }
  var parts = text.split(':');
  var minutes = parseInt(parts[0], 10) || 0;
  var seconds = parseInt(parts[1], 10) || 0;
  var centiseconds = parseInt(parts[2], 10) || 0;
  var totalSec = minutes * 60 + seconds + (centiseconds / 100);
  return totalSec.toFixed(1) + '秒';
}

/**
 * List用の学習回数表示（m／n回）
 * @param {Object} item
 * @returns {string}
 */
function formatStudyCountForList(item) {
  var m = getRetryCountNumber(item ? item.retry_count : 0);
  var n = getRetryCountNumber(item ? item.total_study_count : 0);
  return m + '／' + n + '回';
}

/**
 * 学習メタ情報テキストを生成
 * @param {Object} item
 * @returns {string}
 */
function buildLearningMetaText(item) {
  var m = getRetryCountNumber(item ? item.retry_count : 0);
  var n = getRetryCountNumber(item ? item.total_study_count : 0);
  var durationOldText = formatDurationForDisplay(item ? item.duration_old : '');
  var durationText = formatDurationForDisplay(item ? item.duration : '');
  var lastDateText = formatYmdForDisplay(item ? item.last_date : '');
  return '学習回数：' + m + '／' + n + '回　平均(前回)：' + durationOldText + '　平均(最新)：' + durationText + '　最終学習日時：' + lastDateText;
}

/**
 * 学習メタ情報を要素へ表示
 * @param {Object} item
 * @param {string} elementId
 */
function updateLearningMetaDisplay(item, elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = buildLearningMetaText(item);
}

/**
 * GAS シート更新ジョブをキューに追加（直列実行）
 * @param {Object} job
 * @param {string} job.action - 'updateItemField' | 'updateItemFields'
 * @param {string} job.id
 * @param {string} [job.field]
 * @param {string|number} [job.value]
 * @param {Object} [job.fields]
 * @param {Function} [job.onSuccess]
 * @param {Function} [job.onFinalError]
 */
function enqueueGasSheetUpdate(job) {
  if (!job || !job.id || !job.action) {
    showError('更新リクエストが不正です。');
    return;
  }
  gasSheetUpdateQueue.push(job);
  processGasSheetUpdateQueue();
}

function processGasSheetUpdateQueue() {
  if (isGasSheetUpdateQueueRunning) return;
  if (gasSheetUpdateQueue.length === 0) return;
  isGasSheetUpdateQueueRunning = true;
  runGasSheetUpdateJob(gasSheetUpdateQueue[0], 0);
}

function finishGasSheetUpdateJob() {
  gasSheetUpdateQueue.shift();
  isGasSheetUpdateQueueRunning = false;
  processGasSheetUpdateQueue();
}

/**
 * @param {Object} job
 * @param {number} attemptIndex - 0始まり
 */
function runGasSheetUpdateJob(job, attemptIndex) {
  if (!userEmail) {
    userEmail = localStorage.getItem('userEmail');
  }
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    if (typeof job.onFinalError === 'function') {
      job.onFinalError(new Error('メールアドレスが設定されていません。'));
    }
    finishGasSheetUpdateJob();
    return;
  }

  var params = new URLSearchParams();
  params.append('action', job.action);
  params.append('id', job.id);
  params.append('email', userEmail);
  params.append('referer', window.location.origin);

  if (job.action === 'updateItemFields') {
    params.append('fields', JSON.stringify(job.fields || {}));
  } else {
    params.append('field', job.field);
    params.append('value', String(job.value));
  }

  fetch(buildGasPostUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('ネットワークエラー: ' + response.status);
    }
    return response.json();
  })
  .then(function(data) {
    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }
    if (typeof job.onSuccess === 'function') {
      job.onSuccess(data);
    }
    finishGasSheetUpdateJob();
  })
  .catch(function(error) {
    var nextAttempt = attemptIndex + 1;
    if (nextAttempt < GAS_UPDATE_MAX_ATTEMPTS) {
      var delay = GAS_UPDATE_BASE_DELAY_MS * Math.pow(2, attemptIndex);
      setTimeout(function() {
        runGasSheetUpdateJob(job, nextAttempt);
      }, delay);
      return;
    }
    showError('更新エラー: ' + error.toString());
    if (typeof job.onFinalError === 'function') {
      job.onFinalError(error);
    }
    finishGasSheetUpdateJob();
  });
}

/**
 * updateItemField をキュー経由で呼び出す（失敗時はリトライ後にエラー表示）
 * @param {Object} item
 * @param {string} field
 * @param {string|number} value
 * @param {Function} [onSuccess]
 * @param {Function} [onFinalError]
 */
function updateItemFieldAsync(item, field, value, onSuccess, onFinalError) {
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    if (typeof onFinalError === 'function') {
      onFinalError(new Error('IDが見つかりません。'));
    }
    return;
  }
  enqueueGasSheetUpdate({
    action: 'updateItemField',
    id: item.id,
    field: field,
    value: value,
    onSuccess: onSuccess,
    onFinalError: onFinalError
  });
}

/**
 * 複数フィールドを1リクエストで更新（キュー＋リトライ）
 * @param {Object} item
 * @param {Object} fields
 * @param {Function} [onSuccess]
 * @param {Function} [onFinalError]
 */
function updateItemFieldsAsync(item, fields, onSuccess, onFinalError) {
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    if (typeof onFinalError === 'function') {
      onFinalError(new Error('IDが見つかりません。'));
    }
    return;
  }
  enqueueGasSheetUpdate({
    action: 'updateItemFields',
    id: item.id,
    fields: fields,
    onSuccess: onSuccess,
    onFinalError: onFinalError
  });
}

/**
 * Ans押下時: TotalStudyCount / Duration_old / Duration / LastDate をメモリ更新し、1リクエストで保存
 * @param {Object} item
 * @param {number} elapsedMs
 */
function persistAnsStudyStatsAsync(item, elapsedMs) {
  if (!item) return;

  var nextCount = getRetryCountNumber(item.total_study_count) + 1;
  item.total_study_count = nextCount;

  // 更新前の Duration（移動平均）を Duration_old へコピー（空欄もコピー）
  var previousDuration = (item.duration === null || item.duration === undefined) ? '' : item.duration;
  item.duration_old = previousDuration;

  var currentMs = Math.max(0, Number(elapsedMs) || 0);
  var previousMs = parseDurationToMs(previousDuration);
  var averagedMs = (previousMs === null) ? currentMs : Math.round((previousMs + currentMs) / 2);
  var duration = formatDurationForSheet(averagedMs);
  item.duration = duration;

  var now = getNowYmdHmLocal();
  item.last_date = now;

  updateItemFieldsAsync(item, {
    total_study_count: nextCount,
    duration_old: previousDuration,
    duration: duration,
    last_date: now
  });
}

/**
 * Ans押下時: TotalStudyCount を常に +1（単体更新が必要な場合用）
 * @param {Object} item
 */
function incrementTotalStudyCountAsync(item) {
  if (!item) return;
  
  var nextCount = getRetryCountNumber(item.total_study_count) + 1;
  item.total_study_count = nextCount;
  
  updateItemFieldAsync(item, 'total_study_count', nextCount);
}

/**
 * Duration / Duration_old を平均解答時間で非同期更新（単体更新が必要な場合用）
 * @param {Object} item
 * @param {number} elapsedMs - 今回のストップウォッチ経過ミリ秒
 */
function updateDurationAsync(item, elapsedMs) {
  if (!item) return;
  
  var previousDuration = (item.duration === null || item.duration === undefined) ? '' : item.duration;
  item.duration_old = previousDuration;
  
  var currentMs = Math.max(0, Number(elapsedMs) || 0);
  var previousMs = parseDurationToMs(previousDuration);
  var averagedMs = (previousMs === null) ? currentMs : Math.round((previousMs + currentMs) / 2);
  var duration = formatDurationForSheet(averagedMs);
  item.duration = duration;
  
  updateItemFieldsAsync(item, {
    duration_old: previousDuration,
    duration: duration
  });
}

/**
 * LastDate を現在日時で非同期更新（単体更新が必要な場合用）
 * @param {Object} item
 */
function updateLastDateIfNeededAsync(item) {
  if (!item) return;
  
  var now = getNowYmdHmLocal();
  item.last_date = now;
  
  updateItemFieldAsync(item, 'last_date', now);
}

/**
 * プラス押下時: RetryCount を +1（非同期）
 * 学習画面のメタ表示は更新せず、メモリとシートのみ更新する
 * @param {Object} item
 */
function incrementRetryCountAsync(item) {
  if (!item) return;
  
  var nextCount = getRetryCountNumber(item.retry_count) + 1;
  item.retry_count = nextCount;
  
  updateItemFieldAsync(item, 'retry_count', nextCount);
}

/**
 * ISO 8601形式の日時文字列かどうかを判定
 * @param {string} text - 判定する文字列
 * @returns {boolean} ISO 8601形式の日時文字列の場合true
 */
function isIsoDateTimeString(text) {
  if (!text || typeof text !== 'string') return false;
  var trimmed = text.trim();
  // ISO 8601形式のパターン（例: 1868-03-31T14:41:01.000Z または 1868-03-31T14:41:01Z）
  var isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoPattern.test(trimmed);
}

/**
 * ISO 8601形式の日時文字列を「YYYY年M月」形式に変換
 * @param {string} isoString - ISO 8601形式の日時文字列
 * @returns {string} 「YYYY年M月」形式の文字列
 */
function formatIsoDateTimeToYearMonth(isoString) {
  if (!isoString || typeof isoString !== 'string') return isoString;
  
  try {
    // ISO 8601文字列をDateオブジェクトに変換
    var date = new Date(isoString);
    
    // 無効な日付の場合は元の文字列を返す
    if (isNaN(date.getTime())) {
      return isoString;
    }
    
    // 年と月を取得
    var year = date.getFullYear();
    var month = date.getMonth() + 1; // getMonth()は0-11を返すため+1
    
    // 「YYYY年M月」形式に変換
    return year + '年' + month + '月';
  } catch (e) {
    // エラーが発生した場合は元の文字列を返す
    return isoString;
  }
}

/**
 * 画像URLかどうかを判定
 * @param {string} url - 判定する文字列
 * @returns {boolean} 画像URLの場合true
 */
function isImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  var trimmed = url.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Google Driveの共有リンクURLを直接表示用URLに変換
 * @param {string} url - Google Driveの共有リンクURL
 * @returns {string} 変換後のURL
 */
function convertGoogleDriveUrl(url) {
  if (!url || typeof url !== 'string') return url;
  
  // Google Driveの共有リンク形式を検出
  // 例: https://drive.google.com/file/d/FILE_ID/view?usp=drive_link
  var match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    var fileId = match[1];
    // サムネイル形式を使用（広告ブロッカーにブロックされにくい）
    // sz=w1000 で最大幅1000pxの画像を取得（必要に応じて調整可能）
    return 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000';
  }
  
  // 変換不要の場合はそのまま返す
  return url;
}

/**
 * テキストまたは画像を表示
 * @param {HTMLElement} element - 表示先の要素
 * @param {string} content - 表示する内容（テキストまたは画像URL）
 */
function displayImageOrText(element, content) {
  if (!element || !content) {
    if (element) element.innerHTML = '';
    return;
  }
  
  var trimmedContent = content.trim();
  
  if (isImageUrl(trimmedContent)) {
    // 画像URLの場合
    var imageUrl = convertGoogleDriveUrl(trimmedContent);
    var img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'content-image';
    img.alt = '画像';
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.margin = '0 auto';
    img.style.cursor = 'pointer';
    
    // クリックで拡大表示
    img.addEventListener('click', function() {
      showImageModal(imageUrl);
    });
    
    // エラーハンドリング
    img.addEventListener('error', function() {
      element.innerHTML = '<span class="image-error">画像を読み込めませんでした</span>';
    });
    
    element.innerHTML = '';
    element.appendChild(img);
  } else if (isIsoDateTimeString(trimmedContent)) {
    // ISO 8601形式の日時文字列の場合、「YYYY年M月」形式に変換
    var formattedDate = formatIsoDateTimeToYearMonth(trimmedContent);
    element.textContent = formattedDate;
  } else {
    // テキストの場合
    element.textContent = trimmedContent;
  }
}

/**
 * 画像を拡大表示（モーダル）
 * @param {string} imageUrl - 画像URL
 */
function showImageModal(imageUrl) {
  var overlay = document.getElementById('imageModalOverlay');
  var img = document.getElementById('imageModalImage');
  var closeButton = document.getElementById('imageModalCloseButton');
  
  if (!overlay || !img) return;
  
  img.src = imageUrl;
  overlay.style.display = 'flex';
  
  // 閉じるボタンのイベント
  if (closeButton) {
    closeButton.onclick = function() {
      overlay.style.display = 'none';
    };
  }
  
  // オーバーレイクリックで閉じる
  overlay.onclick = function(e) {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  };
  
  // ESCキーで閉じる
  var escHandler = function(e) {
    if (e.key === 'Escape') {
      overlay.style.display = 'none';
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// 回答を読み上げ（出題中は質問文、回答表示後は回答文を読み上げ）
function playAnswer() {
  playFieldAudio(isAnswerShown ? 'answer' : 'question');
}

/**
 * 出題／解答欄の再生ボタン参照を返す
 * @param {string} fieldType - 'question' | 'answer'
 * @returns {HTMLElement|null}
 */
function getFieldPlayButton(fieldType) {
  return document.getElementById(fieldType === 'answer' ? 'answerPlayButton' : 'questionPlayButton');
}

/**
 * 再生ボタンに短押し再生／長押し再作成を割り当て（マウス・タッチ両対応）
 * @param {HTMLElement|null} button
 * @param {string} fieldType - 'question' | 'answer'
 */
function bindFieldPlayButton(button, fieldType) {
  if (!button) return;
  
  var pressTimer = null;
  var longPressFired = false;
  var pressActive = false;
  var activePointerId = null;
  
  function clearPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    button.classList.remove('is-long-pressing');
  }
  
  button.addEventListener('pointerdown', function(e) {
    if (button.disabled) return;
    if (typeof e.button === 'number' && e.button !== 0) return;
    
    pressActive = true;
    longPressFired = false;
    activePointerId = e.pointerId;
    clearPressTimer();
    
    try {
      button.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
    
    pressTimer = setTimeout(function() {
      pressTimer = null;
      if (!pressActive || button.disabled) return;
      longPressFired = true;
      button.classList.add('is-long-pressing');
      if (navigator.vibrate) {
        try { navigator.vibrate(30); } catch (err) { /* ignore */ }
      }
      recreateFieldAudio(fieldType);
      button.classList.remove('is-long-pressing');
    }, FIELD_PLAY_LONG_PRESS_MS);
  });
  
  function handlePressEnd(e) {
    if (activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) {
      return;
    }
    var wasActive = pressActive;
    var wasLong = longPressFired;
    clearPressTimer();
    pressActive = false;
    activePointerId = null;
    
    try {
      if (e.pointerId != null && button.hasPointerCapture && button.hasPointerCapture(e.pointerId)) {
        button.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // ignore
    }
    
    if (!wasActive || wasLong || button.disabled) return;
    playFieldAudio(fieldType, false);
  }
  
  button.addEventListener('pointerup', handlePressEnd);
  button.addEventListener('pointercancel', function(e) {
    if (activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) {
      return;
    }
    longPressFired = true; // 短押し再生を抑止
    clearPressTimer();
    pressActive = false;
    activePointerId = null;
  });
  
  // click は pointer で処理済み（二重発火防止）
  button.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 長押し時のコンテキストメニューを抑止
  button.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
}

/**
 * 出題／解答の再生ボタン有効／無効を更新
 */
function updateFieldPlayButtons() {
  var item = currentCategoryData[currentQuestionIndex];
  var qBtn = getFieldPlayButton('question');
  var aBtn = getFieldPlayButton('answer');
  
  function isLoading(btn) {
    return !!(btn && btn.querySelector('.play-button-spinner'));
  }
  
  if (!item || isLearningCompleted) {
    if (qBtn && !isLoading(qBtn)) qBtn.disabled = true;
    if (aBtn && !isLoading(aBtn)) aBtn.disabled = true;
    // 学習完了時は updateCompletionCategoryNav 経由でナビ更新済み。再入ループを避ける
    if (!isLearningCompleted) {
      refreshAdvanceNavControls();
    }
    return;
  }
  
  var qText = getEffectiveQuestion(item);
  if (qBtn && !isLoading(qBtn)) {
    qBtn.disabled = !qText || isImageUrl(qText) || activePlayField === 'question';
  }
  
  var aText = getEffectiveAnswer(item);
  if (aBtn && !isLoading(aBtn)) {
    aBtn.disabled = !isAnswerShown || !aText || isImageUrl(aText) || activePlayField === 'answer';
  }
  
  refreshAdvanceNavControls();
}

/**
 * 出題／解答の TTS 取得中または再生中か
 * @returns {boolean}
 */
function isFieldAudioBusy() {
  return activePlayField !== null;
}

/**
 * Ans 後の次へ系操作が音声処理中にブロックされるか
 * @returns {boolean}
 */
function isAdvanceNavBlockedByAudio() {
  return !isLearningCompleted && isAnswerShown && isFieldAudioBusy();
}

/**
 * 学習完了画面の Category ドロップダウン有効／無効
 * @param {boolean} disabled
 */
function setLearningCategorySelectDisabled(disabled) {
  var learningSelect = document.getElementById('learningCategorySelect');
  if (!learningSelect) return;
  learningSelect.disabled = !!disabled;
  syncCustomCategorySelect(learningSelect);
}

/**
 * HOME ボタンの有効／無効を更新
 */
function updateHomeButton() {
  var homeButton = document.getElementById('homeButton');
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
 * 再生中の音声を停止し、欄の再生ボタン状態を戻す
 */
function stopCurrentAudioPlayback() {
  var prevField = activePlayField;
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {
      // ignore
    }
    currentAudio = null;
  }
  activePlayField = null;
  if (prevField) {
    var prevBtn = getFieldPlayButton(prevField);
    if (prevBtn && prevBtn.querySelector('.play-button-spinner')) {
      hidePlayButtonLoading(prevField);
      return;
    }
  }
  updateFieldPlayButtons();
}

/**
 * 指定欄のテキストを読み上げる
 * @param {string} fieldType - 'question' | 'answer'
 * @param {boolean} [forceRefresh=false] - true のときキャッシュを使わず再生成
 */
function playFieldAudio(fieldType, forceRefresh) {
  var item = currentCategoryData[currentQuestionIndex];
  if (!item || isLearningCompleted) {
    if (fieldType === 'question') releaseListeningAnsGate();
    return;
  }
  
  if (fieldType === 'answer' && !isAnswerShown) return;
  
  var text = fieldType === 'answer' ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
  if (!text || isImageUrl(text)) {
    if (fieldType === 'question') releaseListeningAnsGate();
    return;
  }
  
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    showError('音声読み上げの設定が完了していません。WebアプリURLを設定してください。');
    if (fieldType === 'question') releaseListeningAnsGate();
    return;
  }
  
  stopCurrentAudioPlayback();
  
  var voiceGender = fieldType === 'question' ? getAudioVoice('question') : getAudioVoice('answer');
  var speed = fieldType === 'question' ? getAudioSpeed('question') : getAudioSpeed('answer');
  
  if (!forceRefresh) {
    var cachedAudio = getCachedAudio(text, voiceGender, speed);
    if (cachedAudio) {
      playAudioFromCache(cachedAudio, fieldType);
      return;
    }
  }
  
  fetchAudioFromAPI(text, voiceGender, speed, fieldType);
}

/**
 * 指定欄のキャッシュを消して音声を再作成・再生する
 * @param {string} fieldType - 'question' | 'answer'
 */
function recreateFieldAudio(fieldType) {
  var item = currentCategoryData[currentQuestionIndex];
  if (!item || isLearningCompleted) return;
  if (fieldType === 'answer' && !isAnswerShown) return;
  
  var text = fieldType === 'answer' ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
  if (!text || isImageUrl(text)) return;
  
  var voiceGender = fieldType === 'question' ? getAudioVoice('question') : getAudioVoice('answer');
  var speed = fieldType === 'question' ? getAudioSpeed('question') : getAudioSpeed('answer');
  
  removeCachedAudio(text, voiceGender, speed);
  playFieldAudio(fieldType, true);
}

/**
 * 指定キーの音声キャッシュをメモリ／localStorage から削除
 * @param {string} text
 * @param {string} voiceGender
 * @param {string} speed
 */
function removeCachedAudio(text, voiceGender, speed) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || 'female') + '_' + (speed || 'fast');
  
  if (audioCache[cacheKey]) {
    delete audioCache[cacheKey];
  }
  
  try {
    localStorage.removeItem(CACHE_PREFIX + hashText(cacheKey));
  } catch (e) {
    console.warn('Cache remove error:', e);
  }
}

/**
 * キャッシュから音声データを取得
 * メモリキャッシュ → localStorage の順で確認
 * @param {string} text - 読み上げるテキスト
 * @param {string} voiceGender - 音声の性別（'male' または 'female'）
 * @param {string} speed - 読み上げの速さ（'fast', 'medium', 'slow'）
 */
function getCachedAudio(text, voiceGender, speed) {
  // テキストを正規化（キャッシュキーは正規化後のテキストで生成）
  var normalizedText = normalizeTextForTTS(text);
  
  // キャッシュキーに設定情報を含める（設定が変わると別キャッシュになる）
  var cacheKey = normalizedText + '_' + (voiceGender || 'female') + '_' + (speed || 'fast');
  
  // メモリキャッシュを確認
  if (audioCache[cacheKey]) {
    return audioCache[cacheKey];
  }
  
  // localStorageを確認
  try {
    var storageKey = CACHE_PREFIX + hashText(cacheKey);
    var cachedData = localStorage.getItem(storageKey);
    if (cachedData) {
      var audioData = JSON.parse(cachedData);
      // メモリキャッシュにも保存
      audioCache[cacheKey] = audioData;
      return audioData;
    }
  } catch (e) {
    // localStorageが使用できない場合やエラーが発生した場合は無視
    console.warn('Cache read error:', e);
  }
  
  return null;
}

/**
 * 音声データをキャッシュに保存
 * @param {string} text - 読み上げるテキスト
 * @param {string} audioContent - 音声データ（base64）
 * @param {string} voiceGender - 音声の性別（'male' または 'female'）
 * @param {string} speed - 読み上げの速さ（'fast', 'medium', 'slow'）
 */
function saveAudioToCache(text, audioContent, voiceGender, speed) {
  // テキストを正規化（キャッシュキーは正規化後のテキストで生成）
  var normalizedText = normalizeTextForTTS(text);
  
  // キャッシュキーに設定情報を含める
  var cacheKey = normalizedText + '_' + voiceGender + '_' + speed;
  
  var audioData = {
    audioContent: audioContent,
    timestamp: Date.now(),
    textHash: hashText(cacheKey)  // メモリキャッシュ削除時の照合用
  };
  
  // メモリキャッシュに保存（設定情報を含むキーで保存）
  audioCache[cacheKey] = audioData;
  
  // localStorageに保存（サイズ制限を考慮）
  try {
    var storageKey = CACHE_PREFIX + hashText(cacheKey);
    var dataToStore = JSON.stringify(audioData);
    
    // キャッシュサイズをチェック
    if (getCacheSize() + dataToStore.length > MAX_CACHE_SIZE) {
      // キャッシュが大きすぎる場合は古いエントリを削除
      clearOldCacheEntries();
    }
    
    localStorage.setItem(storageKey, dataToStore);
  } catch (e) {
    // localStorageが満杯の場合やエラーが発生した場合は無視
    console.warn('Cache save error:', e);
    // 古いキャッシュを削除して再試行
    try {
      clearOldCacheEntries();
      var storageKey = CACHE_PREFIX + hashText(cacheKey);
      localStorage.setItem(storageKey, JSON.stringify(audioData));
    } catch (e2) {
      // それでも失敗した場合はメモリキャッシュのみ使用
      console.warn('Cache save retry failed:', e2);
    }
  }
}

/**
 * TTS用にテキストを正規化
 * - 前後の空白を削除
 * - 特殊な空白文字を通常のスペースに変換
 * - 連続する空白を1つに正規化
 */
function normalizeTextForTTS(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // 1. 前後の空白を削除
  var normalized = text.trim();
  
  // 2. 特殊な空白文字を通常のスペース（U+0020）に変換
  // 全角スペース（U+3000）、タブ（U+0009）、改行（U+000A, U+000D）、
  // ノンブレーキングスペース（U+00A0）などを通常のスペースに変換
  normalized = normalized.replace(/[\u3000\u0009\u000A\u000D\u00A0\u2000-\u200B\u2028\u2029]/g, ' ');
  
  // 3. 連続する空白を1つに正規化（2文字以上の空白を1文字に）
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * テキストをハッシュ化（localStorageのキー用）
 */
function hashText(text) {
  var hash = 0;
  for (var i = 0; i < text.length; i++) {
    var char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * 現在のキャッシュサイズを取得
 */
function getCacheSize() {
  var totalSize = 0;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(CACHE_PREFIX) === 0) {
        var value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    }
  } catch (e) {
    // エラーが発生した場合は0を返す
  }
  return totalSize;
}

/**
 * 古いキャッシュエントリを削除（FIFO方式）
 */
function clearOldCacheEntries() {
  try {
    var entries = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf(CACHE_PREFIX) === 0) {
        var value = localStorage.getItem(key);
        if (value) {
          try {
            var data = JSON.parse(value);
            entries.push({
              key: key,
              timestamp: data.timestamp || 0
            });
          } catch (e) {
            // パースエラーは無視
          }
        }
      }
    }
    
    // タイムスタンプでソート（古い順）
    entries.sort(function(a, b) {
      return a.timestamp - b.timestamp;
    });
    
    // 古いエントリの50%を削除
    var deleteCount = Math.floor(entries.length / 2);
    for (var j = 0; j < deleteCount; j++) {
      var entryKey = entries[j].key;
      var entryValue = localStorage.getItem(entryKey);
      
      // localStorageから削除
      localStorage.removeItem(entryKey);
      
      // メモリキャッシュからも削除（該当するものがあれば）
      if (entryValue) {
        try {
          var entryData = JSON.parse(entryValue);
          var storedHash = entryData.textHash;
          
          if (storedHash) {
            // textHashが保存されている場合（新形式）：ハッシュ値で直接照合
            for (var text in audioCache) {
              if (hashText(text) === storedHash) {
                delete audioCache[text];
                break; // 一致したらループを抜ける（効率化）
              }
            }
          } else {
            // textHashが保存されていない場合（旧形式）：従来の方法で照合
            var hashFromKey = entryKey.replace(CACHE_PREFIX, '');
            for (var text in audioCache) {
              if (hashText(text) === hashFromKey) {
                delete audioCache[text];
                break; // 一致したらループを抜ける（効率化）
              }
            }
          }
        } catch (e) {
          // パースエラーは無視（従来の方法でフォールバック）
          var hashFromKey = entryKey.replace(CACHE_PREFIX, '');
          for (var text in audioCache) {
            if (hashText(text) === hashFromKey) {
              delete audioCache[text];
              break;
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('Cache clear error:', e);
  }
}

/**
 * キャッシュから音声を再生
 * @param {Object} audioData - キャッシュ音声データ
 * @param {string} fieldType - 'question' | 'answer'
 */
function playAudioFromCache(audioData, fieldType) {
  if (!audioData || !audioData.audioContent) {
    if (fieldType === 'question') releaseListeningAnsGate();
    return;
  }
  
  try {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) {
        // ignore
      }
      currentAudio = null;
    }
    
    var audio = new Audio('data:audio/mp3;base64,' + audioData.audioContent);
    currentAudio = audio;
    activePlayField = fieldType || null;
    updateFieldPlayButtons();
    
    audio.addEventListener('ended', function() {
      if (currentAudio !== audio) return;
      activePlayField = null;
      currentAudio = null;
      updateFieldPlayButtons();
      if (fieldType === 'question') releaseListeningAnsGate();
    });
    
    audio.addEventListener('error', function() {
      if (currentAudio !== audio) return;
      activePlayField = null;
      currentAudio = null;
      updateFieldPlayButtons();
      if (fieldType === 'question') releaseListeningAnsGate();
    });
    
    audio.play().catch(function(error) {
      showError('音声の再生に失敗しました: ' + error.toString());
      if (currentAudio === audio) {
        activePlayField = null;
        currentAudio = null;
        updateFieldPlayButtons();
      }
      if (fieldType === 'question') releaseListeningAnsGate();
    });
  } catch (error) {
    showError('音声の再生に失敗しました: ' + error.toString());
    activePlayField = null;
    currentAudio = null;
    updateFieldPlayButtons();
    if (fieldType === 'question') releaseListeningAnsGate();
  }
}

/**
 * ローディング表示を開始
 * @param {string} fieldType - 'question' | 'answer'
 */
function showPlayButtonLoading(fieldType) {
  var playButton = getFieldPlayButton(fieldType);
  if (playButton) {
    playButton.disabled = true;
    var spinner = document.createElement('div');
    spinner.className = 'play-button-spinner';
    playButton.innerHTML = '';
    playButton.appendChild(spinner);
  }
}

/**
 * ローディング表示を終了
 * @param {string} fieldType - 'question' | 'answer'
 */
function hidePlayButtonLoading(fieldType) {
  var playButton = getFieldPlayButton(fieldType);
  if (playButton) {
    var playButtonImg = document.createElement('img');
    playButtonImg.src = 'img/play-button.png';
    playButtonImg.alt = '';
    playButton.innerHTML = '';
    playButton.appendChild(playButtonImg);
  }
  updateFieldPlayButtons();
}

/**
 * APIから音声データを取得
 * @param {string} text - 読み上げるテキスト
 * @param {string} voiceGender - 音声の性別（'male' または 'female'）
 * @param {string} speed - 読み上げの速さ（'fast', 'medium', 'slow'）
 * @param {string} fieldType - 'question' | 'answer'
 */
function fetchAudioFromAPI(text, voiceGender, speed, fieldType) {
  activePlayField = fieldType || null;
  showPlayButtonLoading(fieldType);
  refreshAdvanceNavControls();
  
  var params = new URLSearchParams();
  params.append('text', text);
  params.append('voiceGender', voiceGender || 'female');
  params.append('speed', speed || 'fast');
  params.append('email', userEmail);
  params.append('referer', window.location.origin);
  
  fetch(buildGasPostUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('ネットワークエラー: ' + response.status);
    }
    return response.json();
  })
  .then(function(data) {
    hidePlayButtonLoading(fieldType);
    
    if (data.success && data.audioContent) {
      saveAudioToCache(text, data.audioContent, voiceGender || 'female', speed || 'fast');
      
      try {
        if (currentAudio) {
          try {
            currentAudio.pause();
            currentAudio.currentTime = 0;
          } catch (e) {
            // ignore
          }
          currentAudio = null;
        }
        
        var audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
        currentAudio = audio;
        activePlayField = fieldType || null;
        updateFieldPlayButtons();
        
        audio.addEventListener('ended', function() {
          if (currentAudio !== audio) return;
          activePlayField = null;
          currentAudio = null;
          updateFieldPlayButtons();
          if (fieldType === 'question') releaseListeningAnsGate();
        });
        
        audio.addEventListener('error', function() {
          if (currentAudio !== audio) return;
          activePlayField = null;
          currentAudio = null;
          updateFieldPlayButtons();
          if (fieldType === 'question') releaseListeningAnsGate();
        });
        
        audio.play().catch(function(error) {
          showError('音声の再生に失敗しました: ' + error.toString());
          if (currentAudio === audio) {
            activePlayField = null;
            currentAudio = null;
            updateFieldPlayButtons();
          }
          if (fieldType === 'question') releaseListeningAnsGate();
        });
      } catch (error) {
        showError('音声の再生に失敗しました: ' + error.toString());
        activePlayField = null;
        currentAudio = null;
        updateFieldPlayButtons();
        if (fieldType === 'question') releaseListeningAnsGate();
      }
    } else {
      activePlayField = null;
      updateFieldPlayButtons();
      showError('音声の生成に失敗しました: ' + (data.error || 'Unknown error'));
      if (fieldType === 'question') releaseListeningAnsGate();
    }
  })
  .catch(function(error) {
    hidePlayButtonLoading(fieldType);
    activePlayField = null;
    updateFieldPlayButtons();
    showError('音声読み上げエラー: ' + error.toString());
    if (fieldType === 'question') releaseListeningAnsGate();
  });
}

/**
 * 現在の問題と次の問題の音声をプリロード
 */
function preloadAudioForCurrentAndNext() {
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    return; // WebアプリURLが設定されていない場合はスキップ
  }
  
  // 現在の問題（最初の問題）をプリロード
  if (currentQuestionIndex >= 0 && currentQuestionIndex < currentCategoryData.length) {
    var currentItem = currentCategoryData[currentQuestionIndex];
    if (currentItem) {
      var effectiveQuestion = getEffectiveQuestion(currentItem);
      var effectiveAnswer = getEffectiveAnswer(currentItem);
      // 出題文をプリロード（出題用設定）
      if (effectiveQuestion && !isImageUrl(effectiveQuestion)) {
        var questionVoice = getAudioVoice('question');
        var questionSpeed = getAudioSpeed('question');
        preloadAudio(effectiveQuestion, questionVoice, questionSpeed);
      }
      // 解答文をプリロード（解答用設定）
      if (effectiveAnswer && !isImageUrl(effectiveAnswer)) {
        var answerVoice = getAudioVoice('answer');
        var answerSpeed = getAudioSpeed('answer');
        preloadAudio(effectiveAnswer, answerVoice, answerSpeed);
      }
    }
  }
  
  // 次の問題をプリロード
  preloadNextQuestions();
}

/**
 * 次の問題（最大2問）の音声をプリロード
 */
function preloadNextQuestions() {
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    return; // WebアプリURLが設定されていない場合はスキップ
  }
  
  var preloadCount = 2; // 次の2問をプリロード
  
  for (var i = 1; i <= preloadCount; i++) {
    var nextIndex = currentQuestionIndex + i;
    if (nextIndex >= 0 && nextIndex < currentCategoryData.length) {
      var nextItem = currentCategoryData[nextIndex];
      if (nextItem) {
        var effectiveQuestion = getEffectiveQuestion(nextItem);
        var effectiveAnswer = getEffectiveAnswer(nextItem);
        // 出題文をプリロード（出題用設定）
        if (effectiveQuestion && !isImageUrl(effectiveQuestion)) {
          var questionVoice = getAudioVoice('question');
          var questionSpeed = getAudioSpeed('question');
          preloadAudio(effectiveQuestion, questionVoice, questionSpeed);
        }
        // 解答文をプリロード（解答用設定）
        if (effectiveAnswer && !isImageUrl(effectiveAnswer)) {
          var answerVoice = getAudioVoice('answer');
          var answerSpeed = getAudioSpeed('answer');
          preloadAudio(effectiveAnswer, answerVoice, answerSpeed);
        }
      }
    }
  }
}

/**
 * 指定されたテキストの音声をプリロード（バックグラウンドで非同期実行）
 * @param {string} text - 読み上げるテキスト
 * @param {string} voiceGender - 音声の性別（'male' または 'female'）
 * @param {string} speed - 読み上げの速さ（'fast', 'medium', 'slow'）
 */
function preloadAudio(text, voiceGender, speed) {
  if (!text || !text.trim()) {
    return;
  }
  
  // キャッシュに既に存在する場合はスキップ（設定情報を含む）
  var cachedAudio = getCachedAudio(text, voiceGender || 'female', speed || 'fast');
  if (cachedAudio) {
    return; // 既にキャッシュされている
  }
  
  // バックグラウンドで非同期にプリロード（エラーは無視）
  setTimeout(function() {
    // userEmailが設定されていない場合はスキップ
    if (!userEmail) {
      return;
    }
    
    var params = new URLSearchParams();
    params.append('text', text);
    params.append('voiceGender', voiceGender || 'female'); // デフォルト値：女性
    params.append('speed', speed || 'fast'); // デフォルト値：fast
    params.append('email', userEmail); // TTS処理にもメール認証を追加
    params.append('referer', window.location.origin);
    
    fetch(buildGasPostUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    })
    .then(function(response) {
      if (!response.ok) {
        return; // エラーは無視
      }
      return response.json();
    })
    .then(function(data) {
      if (data && data.success && data.audioContent) {
        // キャッシュに保存（再生はしない、設定情報を含む）
        saveAudioToCache(text, data.audioContent, voiceGender || 'female', speed || 'fast');
      }
    })
    .catch(function(error) {
      // プリロードのエラーは無視（ユーザーに影響を与えない）
    });
  }, 100); // 少し遅延させて、メイン処理を優先
}

// 前の問題に戻る
function goToPreviousQuestion() {
  if (isInRetryMode) {
    // 再チャレンジモードの場合
    if (retryQuestionIndex > 0) {
      retryQuestionIndex--;
      currentQuestionIndex = retryQuestionIndices[retryQuestionIndex];
      displayQuestion();
      updateNavigationButtons();
    }
  } else {
    // 通常モード
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      displayQuestion();
      updateNavigationButtons();
    }
  }
}

// 次の問題に進む
function goToNextQuestion() {
  if (isAdvanceNavBlockedByAudio()) return;
  
  // 現在の問題を完了リストに追加（重複チェック）
  if (completedQuestionIndices.indexOf(currentQuestionIndex) === -1) {
    completedQuestionIndices.push(currentQuestionIndex);
  }
  
  if (isInRetryMode) {
    // 再チャレンジモードの場合、その問題をリストから削除
    var indexInRetry = retryQuestionIndices.indexOf(currentQuestionIndex);
    if (indexInRetry !== -1) {
      retryQuestionIndices.splice(indexInRetry, 1);
      // 削除後、現在のインデックスを調整
      if (retryQuestionIndex > indexInRetry) {
        retryQuestionIndex--;
      }
    }
    // 次の再チャレンジ問題があるか確認
    if (retryQuestionIndices.length > 0) {
      // 次の再チャレンジ問題に進む
      if (retryQuestionIndex < retryQuestionIndices.length) {
        currentQuestionIndex = retryQuestionIndices[retryQuestionIndex];
        displayQuestion();
      } else {
        // retryQuestionIndexが範囲外だが、再チャレンジ問題が残っている場合は再度再チャレンジを開始
        startRetryQuestions();
      }
    } else {
      // 再チャレンジ問題が全て終わった場合
      isInRetryMode = false;
      retryQuestionIndex = 0;
      isLearningCompleted = true;
      // 出題数表示を更新（完了済みとして表示）
      updateQuestionInfoDisplay();
      // 学習完了メッセージを表示
      showCompletionMessage();
    }
  } else {
    // 通常モード
    if (currentQuestionIndex < currentCategoryData.length - 1) {
      currentQuestionIndex++;
      displayQuestion();
    } else {
      // 最後の問題の場合
      if (retryQuestionIndices.length > 0) {
        // 再チャレンジ問題があれば表示
        startRetryQuestions();
      } else {
        // 再チャレンジ問題がなければ学習完了
        isLearningCompleted = true;
        // 出題数表示を更新（完了済みとして表示）
        updateQuestionInfoDisplay();
        // 学習完了メッセージを表示
        showCompletionMessage();
      }
    }
  }
  updateNavigationButtons();
  updatePlusButton();
}

// プラスボタンクリック処理
function handlePlusButtonClick() {
  if (isCategoryTransitionInProgress) return;
  
  // 学習完了時：同じカテゴリを全問で再学習（位置はそのまま）
  if (isLearningCompleted) {
    restartCurrentCategoryLearning();
    return;
  }
  
  if (!isAnswerShown) return;
  if (isAdvanceNavBlockedByAudio()) return;
  
  // RetryCount を非同期で +1（学習フローは止めない）
  var plusTargetItem = currentCategoryData[currentQuestionIndex];
  incrementRetryCountAsync(plusTargetItem);
    
    if (isInRetryMode) {
      // 再チャレンジモードの場合
      // 現在の問題を再チャレンジリストに追加（重複チェック）
      if (retryQuestionIndices.indexOf(currentQuestionIndex) === -1) {
        retryQuestionIndices.push(currentQuestionIndex);
      }
      
      // 完了リストから削除（プラスボタンを押したら黒色通常に戻す）
      var completedIndex = completedQuestionIndices.indexOf(currentQuestionIndex);
      if (completedIndex !== -1) {
        completedQuestionIndices.splice(completedIndex, 1);
      }
      
      // 出題数表示を更新
      updateQuestionInfoDisplay();
      
      // 次の再チャレンジ問題に進む
      retryQuestionIndex++;
      if (retryQuestionIndex < retryQuestionIndices.length) {
        // 次の再チャレンジ問題がある場合
        currentQuestionIndex = retryQuestionIndices[retryQuestionIndex];
        displayQuestion();
        updateNavigationButtons();
      } else {
        // 最後の再チャレンジ問題の場合、再チャレンジリストに残っている問題があれば再度再チャレンジを開始
        if (retryQuestionIndices.length > 0) {
          startRetryQuestions();
        } else {
          // 再チャレンジ問題がなければ学習完了
          isLearningCompleted = true;
          updateNavigationButtons();
          updatePlusButton();
          // 学習完了メッセージを表示
          showCompletionMessage();
        }
      }
    } else {
      // 通常モードの場合
      // 現在の問題を再チャレンジリストに追加（重複チェック）
      if (retryQuestionIndices.indexOf(currentQuestionIndex) === -1) {
        retryQuestionIndices.push(currentQuestionIndex);
      }
      
      // 完了リストから削除（プラスボタンを押したら黒色通常に戻す）
      var completedIndex = completedQuestionIndices.indexOf(currentQuestionIndex);
      if (completedIndex !== -1) {
        completedQuestionIndices.splice(completedIndex, 1);
      }
      
      // 出題数表示を更新
      updateQuestionInfoDisplay();
      
      // 次の問題に進む
      if (currentQuestionIndex < currentCategoryData.length - 1) {
        // 最後の問題でない場合、次の問題に進む
        currentQuestionIndex++;
        displayQuestion();
        updateNavigationButtons();
      } else {
        // 最後の問題の場合、最初に戻って再チャレンジ問題を出題
        startRetryQuestions();
      }
    }
}

/**
 * 学習完了時：現在カテゴリ／学習日優先セッションを再学習開始する
 */
function restartCurrentCategoryLearning() {
  if (!isLearningCompleted) {
    return;
  }
  if (isLastDateQuestionMethod()) {
    if (!lastDateModeSessionItems || lastDateModeSessionItems.length === 0) {
      return;
    }
    currentCategoryData = lastDateModeSessionItems.slice();
    selectedQuestionIndices = [];
    justCompletedCategoryNo = null;
    justCompletedLastDatePageIndex = null;
    isLastDateCompletionSessionView = false;
    hideCompletionMessage();
    startLearning();
    return;
  }
  var targetNo = justCompletedCategoryNo != null ? justCompletedCategoryNo : currentCategoryNo;
  if (targetNo == null) {
    return;
  }
  loadCategoryDataAndStartLearning(targetNo, true);
}

// 出題数表示を更新する関数
function updateQuestionInfoDisplay() {
  var questionInfo = document.getElementById('questionInfo');
  if (!questionInfo) return;
  
  // 元の全問題データを使用（選択されなかった問題も表示するため）
  var totalQuestions = originalCategoryData.length > 0 ? originalCategoryData.length : currentCategoryData.length;
  var displayItems = [];
  
  // 現在の問題が元のデータのどのインデックスに対応するかを取得
  var originalCurrentIndex = -1;
  if (currentQuestionIndex >= 0 && currentQuestionIndex < currentCategoryData.length) {
    var currentItem = currentCategoryData[currentQuestionIndex];
    // 元のデータから同じ問題を検索
    for (var idx = 0; idx < originalCategoryData.length; idx++) {
      if (originalCategoryData[idx] === currentItem || 
          (originalCategoryData[idx].no === currentItem.no && 
           originalCategoryData[idx].question === currentItem.question)) {
        originalCurrentIndex = idx;
        break;
      }
    }
  }
  
  // 選択された問題のインデックスを元のデータのインデックスに変換
  var originalSelectedIndices = [];
  if (selectedQuestionIndices.length > 0) {
    originalSelectedIndices = selectedQuestionIndices.slice();
  } else {
    // 未選択時は全問が選択されている
    for (var j = 0; j < totalQuestions; j++) {
      originalSelectedIndices.push(j);
    }
  }
  
  // retryQuestionIndicesを元のデータのインデックスに変換
  var originalRetryIndices = [];
  if (retryQuestionIndices.length > 0 && originalCategoryData.length > 0) {
    retryQuestionIndices.forEach(function(filteredIndex) {
      if (filteredIndex >= 0 && filteredIndex < currentCategoryData.length) {
        var retryItem = currentCategoryData[filteredIndex];
        // 元のデータから同じ問題を検索
        for (var retryIdx = 0; retryIdx < originalCategoryData.length; retryIdx++) {
          if (originalCategoryData[retryIdx] === retryItem || 
              (originalCategoryData[retryIdx].no === retryItem.no && 
               originalCategoryData[retryIdx].question === retryItem.question)) {
            originalRetryIndices.push(retryIdx);
            break;
          }
        }
      }
    });
  }
  
  // completedQuestionIndicesを元のデータのインデックスに変換
  var originalCompletedIndices = [];
  if (completedQuestionIndices.length > 0 && originalCategoryData.length > 0) {
    completedQuestionIndices.forEach(function(filteredIndex) {
      if (filteredIndex >= 0 && filteredIndex < currentCategoryData.length) {
        var completedItem = currentCategoryData[filteredIndex];
        // 元のデータから同じ問題を検索
        for (var completedIdx = 0; completedIdx < originalCategoryData.length; completedIdx++) {
          if (originalCategoryData[completedIdx] === completedItem || 
              (originalCategoryData[completedIdx].no === completedItem.no && 
               originalCategoryData[completedIdx].question === completedItem.question)) {
            originalCompletedIndices.push(completedIdx);
            break;
          }
        }
      }
    });
  }
  
  for (var i = 0; i < totalQuestions; i++) {
    var questionNum = i + 1;
    var isCurrent = (i === originalCurrentIndex);
    var isCompleted = (originalCompletedIndices.indexOf(i) !== -1);
    var isRetry = (originalRetryIndices.indexOf(i) !== -1);
    var isSelected = (originalSelectedIndices.indexOf(i) !== -1);
    
    if (!isSelected) {
      // 選択されなかった問題：グレー色
      displayItems.push('<span style="color: #999;">' + questionNum + '</span>');
    } else if (isCompleted) {
      // 完了済み（＞ボタンを押した）：灰色通常（最優先）
      displayItems.push('<span style="color: #999;">' + questionNum + '</span>');
    } else if (isCurrent && isRetry) {
      // 再チャレンジ問題を出題中：赤色太字
      displayItems.push('<strong style="color: #f00;">' + questionNum + '</strong>');
    } else if (isCurrent) {
      // 現在出題中：黒色太字
      displayItems.push('<strong style="color: #000;">' + questionNum + '</strong>');
    } else if (isRetry) {
      // 再チャレンジ対象（プラスボタンを押した）：赤色通常
      displayItems.push('<span style="color: #f00;">' + questionNum + '</span>');
    } else {
      // 未出題：黒色通常
      displayItems.push('<span style="color: #000;">' + questionNum + '</span>');
    }
  }
  
  questionInfo.innerHTML = displayItems.join(',');
}

// 再チャレンジ問題開始関数
function startRetryQuestions() {
  if (retryQuestionIndices.length > 0) {
    isInRetryMode = true;
    isLearningCompleted = false; // 再チャレンジ開始時は学習完了フラグをリセット
    retryQuestionIndex = 0;
    currentQuestionIndex = retryQuestionIndices[0];
    displayQuestion();
    updateNavigationButtons();
    updatePlusButton();
    // 学習完了メッセージを非表示
    hideCompletionMessage();
  } else {
    // 再チャレンジ問題がない場合は学習完了
    isLearningCompleted = true;
    updateNavigationButtons();
    updatePlusButton();
    // 学習完了メッセージを表示
    showCompletionMessage();
  }
}

// ナビゲーションボタンの状態を更新
function updateNavigationButtons() {
  var nextButton = document.getElementById('nextButton');
  var audioBlocksAdvance = isAdvanceNavBlockedByAudio();
  
  // 回答表示中（isAnswerShown === true）の場合は、isLearningCompletedに関係なくボタンを有効化
  if (isAnswerShown && !isLearningCompleted) {
    if (isInRetryMode) {
      // 再チャレンジモードの場合
      // 最後の再チャレンジ問題でも、回答表示中は次へボタンを有効にする
      if (nextButton) {
        nextButton.disabled = audioBlocksAdvance;
        if (audioBlocksAdvance) {
          nextButton.title = '音声の読み上げが終わるまでお待ちください';
        } else {
          nextButton.removeAttribute('title');
        }
      }
    } else {
      // 通常モード
      if (nextButton) {
        nextButton.disabled = audioBlocksAdvance;
        if (audioBlocksAdvance) {
          nextButton.title = '音声の読み上げが終わるまでお待ちください';
        } else {
          nextButton.removeAttribute('title');
        }
      }
    }
  } else if (isLearningCompleted) {
    // 学習完了：<< / >> と中央 Next でカテゴリ移動
    updateCompletionCategoryNav();
  } else if (isInRetryMode) {
    // 再チャレンジモードの場合（回答表示前）
    if (nextButton) nextButton.disabled = true;
  } else {
    // 通常モード（回答表示前）
    if (nextButton) nextButton.disabled = true;
  }
  
  updateNavAnswerButton();
  updateHomeButton();
}

/**
 * 中央ナビボタン（Ans / Next）のクリック処理
 */
function handleNavAnswerButtonClick() {
  var navAnswerButton = document.getElementById('navAnswerButton');
  if (navAnswerButton && navAnswerButton.disabled) return;
  
  if (isLearningCompleted) {
    if (shouldShowCompletionStartButton()) {
      startLearningFromCompletion();
    } else {
      navigateCompletionCategory(1);
    }
    return;
  }
  if (isAnswerShown) {
    if (isAdvanceNavBlockedByAudio()) return;
    goToNextQuestion();
    return;
  }
  showAnswer();
}

/**
 * 中央ナビボタンのラベル／有効状態を更新（Ans / Next / End）
 * ストップウォッチ表示は維持する
 */
function updateNavAnswerButton() {
  var navAnswerButton = document.getElementById('navAnswerButton');
  var navAnswerText = document.getElementById('navAnswerText');
  if (!navAnswerButton || !navAnswerText) return;
  
  if (isLearningCompleted) {
    if (shouldShowCompletionStartButton()) {
      navAnswerText.textContent = 'Start';
      navAnswerButton.disabled = isCategoryTransitionInProgress;
      if (isCategoryTransitionInProgress) {
        navAnswerButton.title = 'カテゴリの切り替え中です';
      } else {
        navAnswerButton.removeAttribute('title');
      }
    } else {
      navAnswerText.textContent = 'Next';
      navAnswerText.classList.remove('blinking');
      var blocked;
      if (isLastDateQuestionMethod()) {
        if (isLastDateCompletionSessionView) {
          blocked = isCategoryTransitionInProgress;
        } else {
          var pageCount = getLastDateModePageCount();
          blocked = pageCount <= 0 || lastDateModePageIndex >= pageCount - 1 || isCategoryTransitionInProgress;
        }
      } else {
        var idx = getCurrentCategoryIndex();
        blocked = (idx < 0 || findSelectableCategoryIndex(idx, 1) < 0) || isCategoryTransitionInProgress;
      }
      navAnswerButton.disabled = blocked;
      if (isCategoryTransitionInProgress) {
        navAnswerButton.title = 'カテゴリの切り替え中です';
      } else if (blocked) {
        navAnswerButton.title = isLastDateQuestionMethod() ? '次のページがありません' : '次のカテゴリがありません';
      } else {
        navAnswerButton.removeAttribute('title');
      }
    }
    return;
  }
  
  if (isAnswerShown) {
    // 最終問は End、それ以外は Next
    navAnswerText.textContent = isLastQuestionInCurrentFlow() ? 'End' : 'Next';
    navAnswerText.classList.remove('blinking');
    if (isAdvanceNavBlockedByAudio()) {
      navAnswerButton.disabled = true;
      navAnswerButton.title = '音声の読み上げが終わるまでお待ちください';
    } else {
      navAnswerButton.disabled = false;
      navAnswerButton.removeAttribute('title');
    }
    return;
  }
  
  navAnswerText.textContent = 'Ans';
  if (waitingListeningAnsGate) {
    navAnswerText.classList.remove('blinking');
    navAnswerButton.disabled = true;
    navAnswerButton.title = '質問の読み上げが終わるまでお待ちください';
  } else {
    navAnswerText.classList.add('blinking');
    navAnswerButton.disabled = false;
    navAnswerButton.removeAttribute('title');
  }
}

/**
 * 現在フローにおける最終問かどうか（通常／再チャレンジ）
 * @returns {boolean}
 */
function isLastQuestionInCurrentFlow() {
  if (isInRetryMode) {
    if (!retryQuestionIndices || retryQuestionIndices.length === 0) {
      return true;
    }
    return retryQuestionIndex >= retryQuestionIndices.length - 1;
  }
  // 通常モード：最終問でも再チャレンジ対象が残っていれば Next 表示
  if (currentQuestionIndex < currentCategoryData.length - 1) {
    return false;
  }
  return retryQuestionIndices.length === 0;
}

/**
 * 現在カテゴリの categories 内インデックスを返す
 * @returns {number}
 */
function getCurrentCategoryIndex() {
  if (currentCategoryNo == null || categories.length === 0) {
    return -1;
  }
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].no == currentCategoryNo) {
      return i;
    }
  }
  return -1;
}

/**
 * 学習ナビを通常状態に戻す（左枠は透明スペーサー。欄右上の再生を使用）
 */
function setLearningNavIconsNormal() {
  var playButtonContainer = document.getElementById('playButtonContainer');
  var playButton = document.getElementById('playButton');
  var nextButton = document.getElementById('nextButton');
  
  if (playButtonContainer) {
    playButtonContainer.classList.add('is-spacer');
    playButtonContainer.classList.remove('is-hidden');
    playButtonContainer.setAttribute('aria-hidden', 'true');
  }
  
  if (playButton) {
    playButton.classList.remove('category-nav-mode');
    playButton.disabled = true;
  }
  
  if (nextButton) {
    nextButton.classList.remove('category-nav-mode');
    var nextImg = nextButton.querySelector('img');
    if (nextImg) {
      nextImg.src = 'img/arrow.png';
      nextImg.alt = '次へ';
    }
  }
  
  updateNavAnswerButton();
}

/**
 * 学習完了時のカテゴリナビアイコン（<< / >>）に切り替える
 */
function setLearningNavIconsCategoryMode() {
  var playButtonContainer = document.getElementById('playButtonContainer');
  var playButton = document.getElementById('playButton');
  var nextButton = document.getElementById('nextButton');
  
  if (playButtonContainer) {
    playButtonContainer.classList.remove('is-spacer');
    playButtonContainer.classList.remove('is-hidden');
    playButtonContainer.setAttribute('aria-hidden', 'false');
  }
  
  if (playButton) {
    playButton.classList.add('category-nav-mode');
    var playImg = playButton.querySelector('img');
    if (!playImg) {
      playButton.innerHTML = '';
      playImg = document.createElement('img');
      playButton.appendChild(playImg);
    }
    playImg.src = 'img/angles-right-solid.png';
    playImg.alt = '前のカテゴリ';
  }
  
  if (nextButton) {
    nextButton.classList.add('category-nav-mode');
    var nextImg = nextButton.querySelector('img');
    if (nextImg) {
      nextImg.src = 'img/angles-right-solid.png';
      nextImg.alt = '次のカテゴリ';
    }
  }
  
  updateFieldPlayButtons();
}

/**
 * 学習完了時：<< / >> の表示と前後カテゴリ有無に応じた有効／無効を更新
 */
function updateCompletionCategoryNav() {
  if (!isLearningCompleted) {
    return;
  }
  
  setLearningNavIconsCategoryMode();
  
  var playButton = document.getElementById('playButton');
  var nextButton = document.getElementById('nextButton');
  var transitionBlocked = isCategoryTransitionInProgress;
  
  if (isLastDateQuestionMethod()) {
    if (isLastDateCompletionSessionView) {
      if (playButton) {
        playButton.disabled = true;
        playButton.title = '完了直後は前ページがありません';
      }
      if (nextButton) {
        nextButton.disabled = transitionBlocked;
        if (transitionBlocked) {
          nextButton.title = 'カテゴリの切り替え中です';
        } else {
          nextButton.removeAttribute('title');
        }
      }
      updateNavAnswerButton();
      return;
    }
    var pageCount = getLastDateModePageCount();
    if (playButton) {
      playButton.disabled = transitionBlocked || lastDateModePageIndex <= 0 || pageCount <= 0;
      if (transitionBlocked) {
        playButton.title = 'カテゴリの切り替え中です';
      } else {
        playButton.removeAttribute('title');
      }
    }
    if (nextButton) {
      nextButton.disabled = transitionBlocked || pageCount <= 0 || lastDateModePageIndex >= pageCount - 1;
      if (transitionBlocked) {
        nextButton.title = 'カテゴリの切り替え中です';
      } else {
        nextButton.removeAttribute('title');
      }
    }
    updateNavAnswerButton();
    return;
  }
  
  var idx = getCurrentCategoryIndex();
  
  if (playButton) {
    playButton.disabled = transitionBlocked || (idx < 0 || findSelectableCategoryIndex(idx, -1) < 0);
    if (transitionBlocked) {
      playButton.title = 'カテゴリの切り替え中です';
    } else {
      playButton.removeAttribute('title');
    }
  }
  if (nextButton) {
    nextButton.disabled = transitionBlocked || (idx < 0 || findSelectableCategoryIndex(idx, 1) < 0);
    if (transitionBlocked) {
      nextButton.title = 'カテゴリの切り替え中です';
    } else {
      nextButton.removeAttribute('title');
    }
  }
  
  updateNavAnswerButton();
}

/**
 * 学習完了画面のListセクションを表示
 */
function showCompletionListSection() {
  var section = document.getElementById('completionListSection');
  if (section) section.style.display = 'block';
}

/**
 * 学習完了画面のListセクションを非表示
 */
function hideCompletionListSection() {
  var section = document.getElementById('completionListSection');
  var message = document.getElementById('completionListMessage');
  var container = document.getElementById('completionListContainer');
  var selectionCount = document.getElementById('completionSelectionCount');
  if (section) section.style.display = 'none';
  if (message) message.style.display = 'none';
  if (container) container.style.display = 'none';
  if (selectionCount) selectionCount.style.display = 'none';
}

/**
 * 学習完了画面のList操作有効／無効
 * @param {boolean} enabled
 */
function setCompletionListInteractionEnabled(enabled) {
  var container = document.getElementById('completionListContainer');
  if (container) {
    container.style.pointerEvents = enabled ? 'auto' : 'none';
  }
  var clearButton = document.getElementById('completionClearSelectionButton');
  if (clearButton) {
    clearButton.disabled = !enabled || selectedQuestionIndices.length === 0;
  }
}

/**
 * 学習完了画面の中央ボタンを Start 表示にするか
 * @returns {boolean}
 */
function shouldShowCompletionStartButton() {
  if (!isLearningCompleted || isCategoryTransitionInProgress) {
    return false;
  }
  if (isLastDateQuestionMethod()) {
    // 完了直後（今回学習分表示）＋未選択 → Next（再ソートへ）
    // 選択あり → Start（今回分の選択学習）
    // 再ソート後（セッション表示終了）→ Start（未選択＝表示中ページ全件）
    if (isLastDateCompletionSessionView) {
      return selectedQuestionIndices.length > 0;
    }
    return true;
  }
  if (justCompletedCategoryNo == null || currentCategoryNo == null) {
    return false;
  }
  if (String(currentCategoryNo) === String(justCompletedCategoryNo)) {
    return selectedQuestionIndices.length > 0;
  }
  return true;
}

/**
 * 学習完了画面：前後カテゴリのListを表示（学習開始しない）
 * @param {number} direction -1: 前, 1: 次
 */
function navigateCompletionCategory(direction) {
  if (!isLearningCompleted || isCategoryTransitionInProgress) {
    return;
  }
  if (isLastDateQuestionMethod()) {
    navigateLastDateModePage(direction);
    return;
  }
  var select = document.getElementById('learningCategorySelect');
  if (!select || !select.value || categories.length === 0) {
    return;
  }
  var currentIndex = -1;
  for (var i = 0; i < categories.length; i++) {
    if (String(categories[i].no) === String(select.value)) {
      currentIndex = i;
      break;
    }
  }
  var targetIndex = findSelectableCategoryIndex(currentIndex, direction);
  if (targetIndex < 0) {
    return;
  }
  var targetNo = categories[targetIndex].no;
  select.value = targetNo;
  syncCustomCategorySelect(select);
  loadCategoryDataForCompletionBrowse(targetNo);
}

/**
 * 学習完了画面：カテゴリデータを取得してList表示（学習開始しない）
 * @param {string|number} categoryNo
 */
function loadCategoryDataForCompletionBrowse(categoryNo) {
  if (!isLearningCompleted) {
    return;
  }
  var targetCat = null;
  for (var ti = 0; ti < categories.length; ti++) {
    if (String(categories[ti].no) === String(categoryNo)) {
      targetCat = categories[ti];
      break;
    }
  }
  if (targetCat && isEndCategory(targetCat)) {
    return;
  }
  if (!userEmail) {
    userEmail = localStorage.getItem('userEmail');
  }
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  
  var categoryKey = String(categoryNo);
  var learningSelect = document.getElementById('learningCategorySelect');
  var listMessage = document.getElementById('completionListMessage');
  var listContainer = document.getElementById('completionListContainer');
  
  completionBrowseRequestId++;
  var requestId = completionBrowseRequestId;
  
  maintainCompletionScrollAtBottom();
  
  isCategoryTransitionInProgress = true;
  setLearningCategorySelectDisabled(true);
  setCompletionListInteractionEnabled(false);
  refreshAdvanceNavControls();
  
  var localCached = categoryDataByNo[categoryKey];
  if (localCached && localCached.length > 0) {
    applyLoadedCompletionCategoryData(categoryNo, localCached, true);
  } else if (listMessage) {
    // Listは表示したまま（高さを維持しスクロール位置を固定）
    listMessage.style.display = 'block';
    listMessage.textContent = '読み込み中...';
  }
  
  var params = new URLSearchParams();
  params.append('action', 'getCategoryData');
  params.append('categoryNo', categoryNo);
  params.append('email', userEmail);
  params.append('referer', window.location.origin);
  
  fetch(WEB_APP_URL + '?' + params.toString())
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      if (requestId !== completionBrowseRequestId) {
        return;
      }
      if (!data.success) {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
      if (!data.items || data.items.length === 0) {
        throw new Error('データがありません');
      }
      if (learningSelect && String(learningSelect.value) !== categoryKey) {
        finishCompletionCategoryBrowse();
        return;
      }
      categoryDataByNo[categoryKey] = data.items;
      applyLoadedCompletionCategoryData(categoryNo, data.items, false);
    })
    .catch(function(error) {
      if (requestId !== completionBrowseRequestId) {
        return;
      }
      if (!localCached) {
        showError('アクセスエラー: ' + error.toString());
        if (listMessage) {
          listMessage.style.display = 'block';
          listMessage.textContent = 'データの取得に失敗しました。';
        }
      }
      finishCompletionCategoryBrowse();
    });
}

/**
 * 学習完了画面：取得済みデータをListへ反映
 * @param {string|number} categoryNo
 * @param {Array} items
 * @param {boolean} keepTransitionLock - true のとき遷移ロックを維持（裏取得待ち）
 */
function applyLoadedCompletionCategoryData(categoryNo, items, keepTransitionLock) {
  maintainCompletionScrollAtBottom();
  
  currentCategoryData = items;
  currentCategoryNo = categoryNo;
  selectedQuestionIndices = [];
  categoryDataByNo[String(categoryNo)] = items;
  
  var learningSelect = document.getElementById('learningCategorySelect');
  if (learningSelect) {
    learningSelect.value = categoryNo;
    syncCustomCategorySelect(learningSelect);
  }
  
  displayList();
  syncCategoryLastDateFromList();
  
  if (!keepTransitionLock) {
    finishCompletionCategoryBrowse();
  }
}

/**
 * 学習完了画面：カテゴリList参照の読込完了処理
 */
function finishCompletionCategoryBrowse() {
  isCategoryTransitionInProgress = false;
  setLearningCategorySelectDisabled(false);
  setCompletionListInteractionEnabled(true);
  refreshAdvanceNavControls();
  maintainCompletionScrollAtBottom();
}

/**
 * 学習完了画面：表示中カテゴリで学習開始
 */
function startLearningFromCompletion() {
  if (!isLearningCompleted || isCategoryTransitionInProgress) {
    return;
  }
  if (!shouldShowCompletionStartButton()) {
    return;
  }
  if (!currentCategoryData || currentCategoryData.length === 0) {
    showError('データがありません。');
    return;
  }
  hideCompletionListSection();
  justCompletedCategoryNo = null;
  justCompletedLastDatePageIndex = null;
  isLastDateCompletionSessionView = false;
  startLearning();
}

/**
 * 前後カテゴリへ移動し、全問で学習をすぐ開始する
 * @param {number} direction -1: 前, 1: 次
 */
function startLearningAdjacentCategory(direction) {
  if (!isLearningCompleted || isCategoryTransitionInProgress) {
    return;
  }
  
  var idx = getCurrentCategoryIndex();
  if (idx < 0) {
    return;
  }
  
  var targetIndex = findSelectableCategoryIndex(idx, direction);
  if (targetIndex < 0) {
    return;
  }
  
  loadCategoryDataAndStartLearning(categories[targetIndex].no);
}

/**
 * 指定カテゴリのデータを取得し、学習画面のまま学習開始する
 * @param {string|number} categoryNo
 * @param {boolean} [forceAllQuestions=false] - true のとき選択をクリアして全問開始（Plus用）
 */
function loadCategoryDataAndStartLearning(categoryNo, forceAllQuestions) {
  var targetCat = null;
  for (var ti = 0; ti < categories.length; ti++) {
    if (String(categories[ti].no) === String(categoryNo)) {
      targetCat = categories[ti];
      break;
    }
  }
  if (targetCat && isEndCategory(targetCat)) {
    return;
  }
  
  if (!userEmail) {
    userEmail = localStorage.getItem('userEmail');
  }
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  
  if (currentAudio) {
    try {
      currentAudio.pause();
    } catch (e) {
      // ignore
    }
    currentAudio = null;
  }
  activePlayField = null;
  
  isCategoryTransitionInProgress = true;
  setLearningCategorySelectDisabled(true);
  setCompletionListInteractionEnabled(false);
  refreshAdvanceNavControls();
  
  var learningSelect = document.getElementById('learningCategorySelect');
  if (learningSelect) {
    learningSelect.value = categoryNo;
    syncCustomCategorySelect(learningSelect);
  }
  var homeSelect = document.getElementById('categorySelect');
  if (homeSelect && !isLearningCompleted) {
    homeSelect.value = categoryNo;
    syncCustomCategorySelect(homeSelect);
  }
  
  var params = new URLSearchParams();
  params.append('action', 'getCategoryData');
  params.append('categoryNo', categoryNo);
  params.append('email', userEmail);
  params.append('referer', window.location.origin);
  
  fetch(WEB_APP_URL + '?' + params.toString())
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      if (!data.success) {
        throw new Error(data.error || 'データの取得に失敗しました');
      }
      if (!data.items || data.items.length === 0) {
        throw new Error('データがありません');
      }
      
      currentCategoryData = data.items;
      currentCategoryNo = categoryNo;
      categoryDataByNo[String(categoryNo)] = data.items;
      if (forceAllQuestions) {
        selectedQuestionIndices = [];
      }
      hideCompletionListSection();
      justCompletedCategoryNo = null;
      justCompletedLastDatePageIndex = null;
      isLastDateCompletionSessionView = false;
      startLearning();
    })
    .catch(function(error) {
      showError('アクセスエラー: ' + error.toString());
      finishCompletionCategoryBrowse();
    });
}

// プラスボタンの状態を更新
function updatePlusButton() {
  var plusButton = document.getElementById('plusButton');
  if (!plusButton) return;
  
  var badge = plusButton.querySelector('.plus-retry-badge');
  
  if (isLearningCompleted) {
    // 学習完了：同じカテゴリ再学習（位置・アイコンはそのまま、「1」は隠す）
    plusButton.disabled = isCategoryTransitionInProgress;
    plusButton.setAttribute('aria-label', '同じカテゴリをもう一度');
    plusButton.title = isCategoryTransitionInProgress ? 'カテゴリの切り替え中です' : '同じカテゴリをもう一度';
    if (badge) badge.style.display = 'none';
    return;
  }
  
  if (!isAnswerShown) {
    plusButton.disabled = true;
    plusButton.removeAttribute('title');
    plusButton.setAttribute('aria-label', 'もう一度');
    if (badge) badge.style.display = '';
    return;
  }
  
  if (isAdvanceNavBlockedByAudio()) {
    plusButton.disabled = true;
    plusButton.title = '音声の読み上げが終わるまでお待ちください';
  } else {
    plusButton.disabled = false;
    plusButton.removeAttribute('title');
  }
  plusButton.setAttribute('aria-label', 'もう一度');
  if (badge) badge.style.display = '';
}

/**
 * 学習完了画面：learning-content を最下部に同期固定（List切替時用）
 */
function maintainCompletionScrollAtBottom() {
  var learningContent = document.querySelector('#screen2 .learning-content');
  if (!learningContent || !isLearningCompleted) {
    return;
  }
  learningContent.scrollTop = learningContent.scrollHeight;
}

/**
 * 学習完了時：List が見えるよう learning-content を最下部までスクロール（初回表示用）
 */
function scrollLearningContentToCompletionView() {
  var learningContent = document.querySelector('#screen2 .learning-content');
  if (!learningContent || !isLearningCompleted) {
    return;
  }
  maintainCompletionScrollAtBottom();
  requestAnimationFrame(function() {
    maintainCompletionScrollAtBottom();
  });
}

// 学習完了メッセージを表示
function showCompletionMessage() {
  var completionSection = document.getElementById('completionMessageSection');
  var completionMessageText = document.querySelector('#completionMessage .completion-message-text');
  var completionMessageIcon = document.getElementById('completionMessageIcon');
  
  if (completionSection && completionMessageText && completionMessageIcon) {
    // メッセージをランダムに選択
    var randomMessageIndex = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
    var message = COMPLETION_MESSAGES[randomMessageIndex];
    
    // アイコン画像をランダムに選択
    var randomImageIndex = Math.floor(Math.random() * COMPLETION_MESSAGE_IMAGES.length);
    var imageFileName = COMPLETION_MESSAGE_IMAGES[randomImageIndex];
    
    completionMessageText.textContent = message;
    completionMessageIcon.src = 'img/msg/' + imageFileName;
    
    // セクションを即座に表示（テキストは見える）
    completionSection.style.display = 'block';
    // アイコンを非表示に設定（スペースは確保される）
    completionMessageIcon.style.visibility = 'hidden';
    completionMessageIcon.style.opacity = '0';
    completionMessageIcon.style.transform = 'scale(0.8)';
    
    // **ms後にアイコンをフワッと表示
    setTimeout(function() {
      completionMessageIcon.style.visibility = 'visible';
      // 次のフレームでアニメーションを開始（transitionを確実に適用）
      requestAnimationFrame(function() {
        completionMessageIcon.style.opacity = '1';
        completionMessageIcon.style.transform = 'scale(1)';
        scrollLearningContentToCompletionView();
      });
    }, 500);
  }
  
  // 初期画面と同様のCategory／出題方法UI＋Listを表示
  justCompletedCategoryNo = currentCategoryNo;
  if (isLastDateQuestionMethod()) {
    selectedQuestionIndices = [];
    hideLearningCategorySelect();
    applyQuestionMethodModeUi();
    showCompletionListSection();
    // 完了直後は今回学習分を表示（再ソートは Next 押下時）
    applyLastDateModeSessionToCompletionList();
    setLearningNavIconsCategoryMode();
    refreshAdvanceNavControls();
    scrollLearningContentToCompletionView();
    return;
  }
  if (originalCategoryData.length > 0) {
    currentCategoryData = originalCategoryData.slice();
    categoryDataByNo[String(currentCategoryNo)] = currentCategoryData.slice();
  }
  selectedQuestionIndices = [];
  showLearningCategorySelect();
  showCompletionListSection();
  displayList();
  setLearningNavIconsCategoryMode();
  refreshAdvanceNavControls();
  loadCategories({
    preserveValue: currentCategoryNo,
    quiet: true
  });
  scrollLearningContentToCompletionView();
}

// 学習完了メッセージを非表示
function hideCompletionMessage() {
  var completionSection = document.getElementById('completionMessageSection');
  var completionMessageIcon = document.getElementById('completionMessageIcon');
  if (completionSection) {
    completionSection.style.display = 'none';
  }
  // 画像のsrcをクリア（次回表示時に古い画像が表示されないようにする）
  if (completionMessageIcon) {
    completionMessageIcon.src = '';
    // アイコンの表示状態をリセット（次回表示時に正しく動作するように）
    completionMessageIcon.style.visibility = '';
    completionMessageIcon.style.opacity = '';
    completionMessageIcon.style.transform = '';
  }
  hideLearningCategorySelect();
  hideCompletionListSection();
}

// ホームに戻る
function goToHome() {
  if (isCategoryTransitionInProgress) return;
  if (isFieldAudioBusy()) return;
  
  // 万一の抜け対策：再生中音声を停止してから遷移する
  stopCurrentAudioPlayback();
  
  // ストップウォッチを停止
  stopStopwatch();
  
  // 完了時カテゴリナビ用アイコンを通常に戻す
  setLearningNavIconsNormal();
  
  // 画面遷移
  var screen2 = document.getElementById('screen2');
  var screen1 = document.getElementById('screen1');
  if (screen2) screen2.classList.remove('active');
  if (screen1) screen1.classList.add('active');
  
  // トグルボタンの位置を更新（screen1に戻った時）
  requestAnimationFrame(function() {
    requestAnimationFrame(updateToggleButtonPosition);
  });
  
  // コンテナのパディングを元に戻す
  var container = document.querySelector('.container');
  if (container) container.classList.remove('learning-mode');
  
  // 学習中に絞り込んだデータを全問に戻し、更新済み回数・日付をListへ反映
  if (originalCategoryData.length > 0 && !isLastDateQuestionMethod()) {
    currentCategoryData = originalCategoryData.slice();
  }
  selectedQuestionIndices = [];
  originalCategoryData = [];
  
  // 学習完了メッセージを非表示（初期画面List描画前に完了フラグを戻す）
  hideCompletionMessage();
  justCompletedCategoryNo = null;
  justCompletedLastDatePageIndex = null;
  isLastDateCompletionSessionView = false;
  isLearningCompleted = false;
  
  if (isLastDateQuestionMethod()) {
    applyQuestionMethodModeUi();
    loadLastDateModeData({ resetPage: true, resort: true, forceFetch: false });
  } else if (currentCategoryData.length > 0) {
    // Listを再描画（メモリ上の retry_count / total_study_count / duration / last_date を反映）
    displayList();
    // Listと同一ルールでカテゴリ最終学習日を即時反映（全問埋まり→最新日、空欄あり→-）
    syncCategoryLastDateFromList();
    updateListNavButtons();
  }
  
  // カテゴリ一覧を再取得し、ドロップダウンの最終学習日をシート集計でも更新
  if (!isLastDateQuestionMethod() && currentCategoryNo != null && currentCategoryNo !== '') {
    loadCategories({
      preserveValue: currentCategoryNo,
      quiet: true
    });
  }
  
  updateLearningLockedSideMenuControls();
  
  // 学習時間はリセットしない（継続）
}

// モーダルを表示
function showModal(item, index) {
  if (!item) return;
  
  // モーダル内の現在のインデックスを保存
  if (typeof index !== 'undefined') {
    modalCurrentIndex = index;
  } else {
    // インデックスが指定されていない場合は、itemから検索
    modalCurrentIndex = currentCategoryData.findIndex(function(data) {
      return data.id === item.id || (data.no === item.no && data.question === item.question);
    });
    if (modalCurrentIndex === -1) {
      modalCurrentIndex = 0;
    }
  }
  
  // モーダルの内容を更新
  updateModalContent(item);
  
  // ナビゲーションボタンの状態を更新
  updateModalNavigation();
  
  // 選択状態を更新
  updateModalSelection();
  
  // モーダルを表示
  var modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.add('active');
  }
}

// モーダルの内容を更新
function updateModalContent(item) {
  // 解答側タイトルをラベルに設定（入替え対応）
  var modalAnswerLabel = document.getElementById('modalAnswerLabel');
  if (modalAnswerLabel) {
    modalAnswerLabel.textContent = getEffectiveATitle(item) || '';
  }
  
  // 出題側タイトルをラベルに設定（入替え対応）
  var modalQuestionLabel = document.getElementById('modalQuestionLabel');
  if (modalQuestionLabel) {
    modalQuestionLabel.textContent = getEffectiveQTitle(item) || '';
  }
  
  // 質問文を表示（画像対応・入替え対応）
  var questionText = document.getElementById('modalQuestionText');
  if (questionText) {
    displayImageOrText(questionText, getEffectiveQuestion(item));
  }
  
  // 学習回数・最終学習日
  updateLearningMetaDisplay(item, 'modalLearningMeta');
  
  // 回答文を表示（画像対応・入替え対応）
  var answerText = document.getElementById('modalAnswerText');
  if (answerText) {
    displayImageOrText(answerText, getEffectiveAnswer(item));
  }
  
  // noteを常に表示（空欄でも note: を出す。背景透明度は変更しない）
  var noteSection = document.getElementById('modalNoteSection');
  var noteText = document.getElementById('modalNoteText');
  if (noteText) {
    noteText.textContent = item.note || '';
  }
  if (noteSection) {
    noteSection.style.display = 'block';
  }
}

// モーダル内のナビゲーションを更新
function updateModalNavigation() {
  var totalCount = currentCategoryData.length;
  var currentNo = modalCurrentIndex + 1;
  
  // 現在No/全No数を更新
  var navInfo = document.getElementById('modalNavInfo');
  if (navInfo) {
    navInfo.textContent = currentNo + '/' + totalCount;
  }
  
  // 前へボタンの状態を更新
  var prevButton = document.getElementById('modalPrevButton');
  if (prevButton) {
    if (modalCurrentIndex === 0) {
      prevButton.disabled = true;
    } else {
      prevButton.disabled = false;
    }
  }
  
  // 次へボタンの状態を更新
  var nextButton = document.getElementById('modalNextButton');
  if (nextButton) {
    if (modalCurrentIndex === totalCount - 1) {
      nextButton.disabled = true;
    } else {
      nextButton.disabled = false;
    }
  }
}

// モーダルを閉じる
function closeModal() {
  var modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
}

// モーダル内の選択状態を更新
function updateModalSelection() {
  var selectButton = document.getElementById('modalSelectButton');
  if (!selectButton) return;
  
  var isSelected = selectedQuestionIndices.indexOf(modalCurrentIndex) !== -1;
  if (isSelected) {
    selectButton.classList.add('selected');
  } else {
    selectButton.classList.remove('selected');
  }
}

// モーダル内の選択/解除を実行
function handleModalSelection() {
  var index = modalCurrentIndex;
  var selectedIndex = selectedQuestionIndices.indexOf(index);
  
  if (selectedIndex === -1) {
    // 選択
    selectedQuestionIndices.push(index);
  } else {
    // 解除
    selectedQuestionIndices.splice(selectedIndex, 1);
  }
  
  // モーダル内の選択状態を更新
  updateModalSelection();
  
  // リスト側の選択状態も更新
  updateListSelection(index);
  
  // 選択数の表示を更新
  updateSelectionCount();
}

// リスト側の選択状態を更新
function updateListSelection(index) {
  var tableBody = document.getElementById('listTableBody');
  if (!tableBody) return;
  
  var rows = tableBody.querySelectorAll('tr');
  if (index >= 0 && index < rows.length) {
    var row = rows[index];
    var noCell = row.querySelector('td:first-child');
    var isSelected = selectedQuestionIndices.indexOf(index) !== -1;
    
    if (isSelected) {
      row.classList.add('selected-row');
      if (noCell) noCell.classList.add('selected-no');
    } else {
      row.classList.remove('selected-row');
      if (noCell) noCell.classList.remove('selected-no');
    }
  }
}

// 選択をクリア
function clearSelection() {
  var ui = getListUiConfig();
  // 選択状態をクリア
  selectedQuestionIndices = [];
  
  // 全行の選択状態を解除
  var tableBody = document.getElementById(ui.tableBodyId);
  if (tableBody) {
    var rows = tableBody.querySelectorAll('tr');
    rows.forEach(function(row) {
      var noCell = row.querySelector('td:first-child');
      if (noCell) {
        noCell.classList.remove('selected-no');
      }
      row.classList.remove('selected-row');
    });
  }
  
  // 選択数表示を更新（クリアボタンの状態も更新される）
  updateSelectionCount();
  if (isLearningCompleted) {
    updateNavAnswerButton();
  }
}

// クリアボタンの有効/無効を更新
function updateClearButton() {
  var ui = getListUiConfig();
  var clearButton = document.getElementById(ui.clearButtonId);
  if (!clearButton) return;
  
  // 選択がない場合は無効化
  clearButton.disabled = selectedQuestionIndices.length === 0;
}

// トグルコンテナの位置を更新（タイトルより少し下に配置）
function updateToggleButtonPosition() {
  var toggleContainer = document.getElementById('toggleContainer');
  if (!toggleContainer) return;
  
  // 現在表示されている画面のタイトルを取得
  var screen1 = document.getElementById('screen1');
  var screen2 = document.getElementById('screen2');
  var title = null;
  
  if (screen1 && screen1.classList.contains('active')) {
    title = screen1.querySelector('.title');
  } else if (screen2 && screen2.classList.contains('active')) {
    title = screen2.querySelector('.title');
  } else {
    // どちらもactiveでない場合は、表示されているタイトルを取得
    title = document.querySelector('.title');
  }
  
  if (!title) return;
  
  // タイトルの位置を取得
  var titleRect = title.getBoundingClientRect();
  
  // タイトルの中央の高さにコンテナを配置し、少し下に下げる（オフセット-18px）
  // コンテナの高さを考慮して中央揃え
  var toggleTop = titleRect.top + (titleRect.height / 2) - 18;
  
  toggleContainer.style.top = toggleTop + 'px';
}

// ========================================
// 更新モード関連の関数
// ========================================

/**
 * 更新モードを開始
 * @param {string} displayTarget - 'question' | 'answer' | 'note'
 */
function startUpdateMode(displayTarget) {
  if (isUpdateMode) return;
  if (isLearningCompleted) return;
  if (!isAnswerShown) return;
  
  var item = currentCategoryData[currentQuestionIndex];
  if (!item) return;
  
  var ui = getUpdateUiConfig(displayTarget);
  if (!ui) return;
  
  updateDisplayTarget = displayTarget;
  updateStorageField = resolveStorageField(displayTarget);
  originalEditText = item[updateStorageField] || '';
  
  isUpdateMode = true;
  
  var displayEl = document.getElementById(ui.displayId);
  if (displayEl) {
    displayEl.style.display = 'none';
  }
  
  var editEl = document.getElementById(ui.editId);
  if (editEl) {
    editEl.value = originalEditText;
    editEl.style.display = 'block';
    editEl.focus();
  }
  
  var controlsEl = document.getElementById(ui.controlsId);
  if (controlsEl) {
    controlsEl.style.display = 'flex';
  }
  
  var activeSection = document.getElementById(ui.sectionId);
  if (activeSection) {
    activeSection.classList.add('field-editing-active');
  }
  
  applyUpdateModeOverlay(ui.sectionId);
  setupUpdateModeEventListeners();
}

/**
 * 編集対象の表示を反映する
 * @param {Object} item
 * @param {string} text
 */
function refreshEditedFieldDisplay(item, text) {
  if (!updateDisplayTarget) return;
  
  if (updateDisplayTarget === 'question') {
    var questionText = document.getElementById('questionText');
    if (questionText) {
      var effectiveQuestion = getEffectiveQuestion(item);
      var isListeningQuestion = isListeningModeEnabled() && effectiveQuestion && !isImageUrl(effectiveQuestion);
      if (isListeningQuestion && !isAnswerShown) {
        questionText.textContent = LISTENING_PLACEHOLDER_TEXT;
      } else {
        displayImageOrText(questionText, effectiveQuestion);
      }
      questionText.style.display = '';
    }
    return;
  }
  
  if (updateDisplayTarget === 'answer') {
    var answerTextDisplay = document.getElementById('answerTextDisplay');
    if (answerTextDisplay) {
      displayImageOrText(answerTextDisplay, getEffectiveAnswer(item));
      answerTextDisplay.style.display = 'block';
    }
    return;
  }
  
  if (updateDisplayTarget === 'note') {
    var noteText = document.getElementById('noteText');
    var noteValue = item.note || '';
    var isNoteEmpty = !String(noteValue).trim();
    if (noteText) {
      noteText.textContent = noteValue;
      if (isNoteEmpty) {
        noteText.classList.add('note-empty');
      } else {
        noteText.classList.remove('note-empty');
      }
      noteText.style.display = '';
    }
  }
}

/**
 * 更新モードを終了
 * @param {boolean} restoreOriginal - trueなら編集前に戻す
 */
function endUpdateMode(restoreOriginal) {
  if (!isUpdateMode) return;
  
  var ui = getUpdateUiConfig(updateDisplayTarget);
  var item = currentCategoryData[currentQuestionIndex];
  
  isUpdateMode = false;
  
  if (ui) {
    var editEl = document.getElementById(ui.editId);
    if (editEl) {
      editEl.style.display = 'none';
    }
    var controlsEl = document.getElementById(ui.controlsId);
    if (controlsEl) {
      controlsEl.style.display = 'none';
    }
    var activeSection = document.getElementById(ui.sectionId);
    if (activeSection) {
      activeSection.classList.remove('field-editing-active');
    }
  }
  
  removeUpdateModeOverlay();
  
  if (item && updateStorageField) {
    if (restoreOriginal) {
      item[updateStorageField] = originalEditText;
    } else if (ui) {
      var editElAfter = document.getElementById(ui.editId);
      if (editElAfter) {
        item[updateStorageField] = editElAfter.value || '';
      }
    }
    refreshEditedFieldDisplay(item, item[updateStorageField] || '');
  }
  
  if (isRecording) {
    stopVoiceRecognition();
  }
  
  updateDisplayTarget = null;
  updateStorageField = null;
  originalEditText = '';
  
  setupFieldEditDoubleClick();
}

/**
 * 更新モード中のオーバーレイを適用
 * @param {string} activeSectionId - 編集中セクションのID
 */
function applyUpdateModeOverlay(activeSectionId) {
  var existingOverlay = document.getElementById('updateModeOverlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  var overlay = document.createElement('div');
  overlay.id = 'updateModeOverlay';
  overlay.className = 'update-mode-overlay';
  document.body.appendChild(overlay);
  
  var screen2 = document.getElementById('screen2');
  if (screen2) {
    var elementsToDisable = screen2.querySelectorAll('.title, .learning-time, .section, .navigation-bar');
    elementsToDisable.forEach(function(element) {
      if (activeSectionId && element.id === activeSectionId) {
        return;
      }
      element.classList.add('update-mode-disabled');
    });
  }
}

// 更新モード中のオーバーレイを削除
function removeUpdateModeOverlay() {
  var overlay = document.getElementById('updateModeOverlay');
  if (overlay) {
    overlay.remove();
  }
  
  var screen2 = document.getElementById('screen2');
  if (screen2) {
    var elementsToEnable = screen2.querySelectorAll('.update-mode-disabled');
    elementsToEnable.forEach(function(element) {
      element.classList.remove('update-mode-disabled');
    });
  }
}

// 更新モード用のイベントリスナーを設定
function setupUpdateModeEventListeners() {
  var updateButtonIds = ['questionUpdateButton', 'answerUpdateButton', 'noteUpdateButton'];
  updateButtonIds.forEach(function(id) {
    var button = document.getElementById(id);
    if (button) {
      button.onclick = function() {
        showUpdateConfirmModal();
      };
    }
  });
  
  var endButtonIds = ['questionEndButton', 'answerEndButton', 'noteEndButton'];
  endButtonIds.forEach(function(id) {
    var button = document.getElementById(id);
    if (button) {
      button.onclick = function() {
        endUpdateMode(true);
      };
    }
  });
  
  var micButton = document.getElementById('answerMicButton');
  if (micButton) {
    micButton.onclick = function() {
      toggleVoiceRecognition();
    };
  }
  
  var closeButton = document.getElementById('answerUpdateConfirmCloseButton');
  if (closeButton) {
    closeButton.onclick = function() {
      closeUpdateConfirmModal();
    };
  }
  
  var cancelButton = document.getElementById('answerUpdateConfirmCancelButton');
  if (cancelButton) {
    cancelButton.onclick = function() {
      closeUpdateConfirmModal();
    };
  }
  
  var okButton = document.getElementById('answerUpdateConfirmOkButton');
  if (okButton) {
    okButton.onclick = function() {
      saveItemField();
    };
  }
  
  var modal = document.getElementById('answerUpdateConfirmModal');
  if (modal) {
    modal.onclick = function(e) {
      if (e.target === modal) {
        closeUpdateConfirmModal();
      }
    };
  }
}

// 更新確認モーダルを表示
function showUpdateConfirmModal() {
  var modal = document.getElementById('answerUpdateConfirmModal');
  var title = document.getElementById('answerUpdateConfirmTitle');
  if (title) {
    title.textContent = getConfirmTitleForStorageField(updateStorageField);
  }
  if (modal) {
    modal.classList.add('active');
  }
}

// 更新確認モーダルを閉じる
function closeUpdateConfirmModal() {
  var modal = document.getElementById('answerUpdateConfirmModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * 編集中フィールドをスプレッドシートへ保存
 */
function saveItemField() {
  var ui = getUpdateUiConfig(updateDisplayTarget);
  if (!ui || !updateStorageField) return;
  
  var editEl = document.getElementById(ui.editId);
  if (!editEl) return;
  
  var item = currentCategoryData[currentQuestionIndex];
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    closeUpdateConfirmModal();
    endUpdateMode(true);
    return;
  }
  
  var newValue = editEl.value || '';
  
  var okButton = document.getElementById('answerUpdateConfirmOkButton');
  if (okButton) {
    okButton.disabled = true;
    okButton.textContent = '更新中...';
  }
  
  updateItemFieldAsync(
    item,
    updateStorageField,
    newValue,
    function() {
      if (okButton) {
        okButton.disabled = false;
        okButton.textContent = '確定';
      }
      item[updateStorageField] = newValue;
      closeUpdateConfirmModal();
      endUpdateMode(false);
    },
    function() {
      if (okButton) {
        okButton.disabled = false;
        okButton.textContent = '確定';
      }
      closeUpdateConfirmModal();
      endUpdateMode(true);
    }
  );
}

// 互換: 旧関数名
function saveAnswerMemo() {
  saveItemField();
}

// ========================================
// 音声認識関連の関数
// ========================================

// 音声認識を開始/停止
function toggleVoiceRecognition() {
  if (isRecording) {
    stopVoiceRecognition();
  } else {
    startVoiceRecognition();
  }
}

// 音声認識を開始
function startVoiceRecognition() {
  if (isRecording) return;
  
  // マイクアクセス許可を取得
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
      isRecording = true;
      audioChunks = [];
      
      // MediaRecorderを作成
      var options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {}; // デフォルト形式を使用
      }
      
      mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = function() {
        // 録音が停止したら音声データを処理
        processRecordedAudio();
        
        // ストリームを停止
        stream.getTracks().forEach(function(track) {
          track.stop();
        });
      };
      
      // 録音開始
      mediaRecorder.start();
      
      // マイクボタンのスタイルを更新
      var micButton = document.getElementById('answerMicButton');
      if (micButton) {
        micButton.classList.add('recording');
      }
    })
    .catch(function(error) {
      showError('マイクアクセスに失敗しました: ' + error.toString());
    });
}

// 音声認識を停止
function stopVoiceRecognition() {
  if (!isRecording || !mediaRecorder) return;
  
  if (mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  
  isRecording = false;
  
  // マイクボタンのスタイルを更新
  var micButton = document.getElementById('answerMicButton');
  if (micButton) {
    micButton.classList.remove('recording');
  }
}

// 録音した音声データを処理
function processRecordedAudio() {
  if (audioChunks.length === 0) return;
  
  // Blobを作成
  var audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  
  // Base64エンコード
  var reader = new FileReader();
  reader.onloadend = function() {
    var base64Audio = reader.result.split(',')[1]; // data:audio/webm;base64, の部分を除去
    
    // Google Apps Script経由で音声認識APIを呼び出し
    var params = new URLSearchParams();
    params.append('action', 'speechToText');
    params.append('audioContent', base64Audio);
    params.append('languageCode', 'ja-JP');
    params.append('email', userEmail);
    params.append('referer', window.location.origin);
    
    // ローディング表示
    var micButton = document.getElementById('answerMicButton');
    if (micButton) {
      micButton.disabled = true;
    }
    
    fetch(buildGasPostUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('ネットワークエラー: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      if (micButton) {
        micButton.disabled = false;
      }
      
      if (data.success && data.text) {
        // 認識結果をテキストエリアに挿入（カーソル位置に、または末尾に）
        var answerTextEdit = document.getElementById('answerTextEdit');
        if (answerTextEdit) {
          var currentText = answerTextEdit.value;
          var cursorPos = answerTextEdit.selectionStart;
          var textBefore = currentText.substring(0, cursorPos);
          var textAfter = currentText.substring(cursorPos);
          answerTextEdit.value = textBefore + data.text + textAfter;
          
          // カーソル位置を更新
          var newCursorPos = cursorPos + data.text.length;
          answerTextEdit.setSelectionRange(newCursorPos, newCursorPos);
          answerTextEdit.focus();
        }
      } else {
        showError('音声認識に失敗しました: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(function(error) {
      if (micButton) {
        micButton.disabled = false;
      }
      showError('音声認識エラー: ' + error.toString());
    });
  };
  
  reader.readAsDataURL(audioBlob);
}

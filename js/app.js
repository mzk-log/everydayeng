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
var currentAudio = null; // 現在再生中のAudioオブジェクト
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
  
  // トグルボタンの初期状態を設定
  var questionToggleButton = document.getElementById('questionToggleButton');
  var answerToggleButton = document.getElementById('answerToggleButton');
  if (questionToggleButton) {
    if (isQuestionToggleActive) {
      questionToggleButton.classList.add('active');
    } else {
      questionToggleButton.classList.remove('active');
    }
  }
  if (answerToggleButton) {
    if (isAnswerToggleActive) {
      answerToggleButton.classList.add('active');
    } else {
      answerToggleButton.classList.remove('active');
    }
  }
  
  // 出題設定（入替え・リスニング）を読み込み
  loadPracticeSettings();
  
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
  
  // play-button
  var playButtonImg = document.querySelector('#playButton img');
  if (playButtonImg && images['play-button']) {
    playButtonImg.src = images['play-button'];
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
          populateCategorySelectOptions(select, valueToRestore);
          select.disabled = false;
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
        // ページローディングを非表示（Googleスプレッドシートの読み込み完了）
        hidePageLoading();
      } catch (e) {
        showError('データ読み込みエラー: ' + e.toString());
        if (select) {
          select.disabled = false;
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
}

/**
 * 学習完了時：Categoryドロップダウンを表示（Listは出さない）
 */
function showLearningCategorySelect() {
  var currentCategory = document.getElementById('currentCategory');
  var container = document.getElementById('learningCategorySelectContainer');
  var learningSelect = document.getElementById('learningCategorySelect');
  
  if (currentCategory) {
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
  
  // 学習完了時のCategoryドロップダウン：選択でListなし・すぐ学習開始
  var learningCategorySelect = document.getElementById('learningCategorySelect');
  if (learningCategorySelect) {
    learningCategorySelect.addEventListener('change', function() {
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
        return;
      }
      loadCategoryDataAndStartLearning(categoryNo);
    });
  }
  
  document.getElementById('startButton').addEventListener('click', function() {
    startLearning();
  });
  
  // 旧Answerボタン（削除済み）の代わりに、ナビゲーションバーのAnswerボタンを使用
  document.getElementById('navAnswerButton').addEventListener('click', function() {
    showAnswer();
  });
  
  document.getElementById('playButton').addEventListener('click', function() {
    if (isLearningCompleted) {
      startLearningAdjacentCategory(-1);
      return;
    }
    playAnswer();
  });
  
  document.getElementById('nextButton').addEventListener('click', function() {
    if (isLearningCompleted) {
      startLearningAdjacentCategory(1);
      return;
    }
    goToNextQuestion();
  });
  
  document.getElementById('homeButton').addEventListener('click', function() {
    goToHome();
  });
  
  document.getElementById('plusButton').addEventListener('click', function() {
    handlePlusButtonClick();
  });
  
  // 出題読みトグルボタン
  document.getElementById('questionToggleButton').addEventListener('click', function() {
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
// 出題設定（入替え・リスニング）
// ========================================

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
}

function setPracticeSetting(setting, isOn) {
  var key = setting === 'swapQA' ? 'practiceSwapQA' : 'practiceListeningMode';
  try {
    localStorage.setItem(key, isOn ? 'on' : 'off');
  } catch (e) {
    // localStorageが使えない場合は無視
  }
  updatePracticeSettingButtons(setting, isOn);
  
  // TOP画面のList表示を更新（学習中の現在問題は次問から反映）
  var screen1 = document.getElementById('screen1');
  if (screen1 && screen1.classList.contains('active') && currentCategoryData.length > 0) {
    if (setting === 'listeningMode' || setting === 'swapQA') {
      refreshHomeListForPracticeSettings();
    }
  }
}

function refreshHomeListForPracticeSettings() {
  if (currentCategoryData.length === 0) return;
  
  if (isListeningModeEnabled()) {
    selectedQuestionIndices = [];
    updateSelectionCount();
    
    var tableBody = document.getElementById('listTableBody');
    if (tableBody) tableBody.innerHTML = '';
    
    var listContainer = document.getElementById('listContainer');
    if (listContainer) listContainer.style.display = 'none';
    
    var listMessage = document.getElementById('listMessage');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '出題数: ' + currentCategoryData.length;
    }
    
    var startButton = document.getElementById('startButton');
    if (startButton) startButton.style.display = 'block';
  } else {
    displayList();
  }
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

// リストを表示
function displayList() {
  // リスニング練習モード時はListを出さず出題数のみ表示
  if (isListeningModeEnabled()) {
    refreshHomeListForPracticeSettings();
    return;
  }
  
  var tableBody = document.getElementById('listTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  // 最初のアイテムから出題側タイトルを取得してヘッダーに設定
  if (currentCategoryData.length > 0) {
    var headerCell = document.getElementById('listTableHeader');
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
    
    var lastDateCell = document.createElement('td');
    lastDateCell.className = 'list-col-lastdate';
    lastDateCell.textContent = formatYmdForDisplay(item.last_date);
    
    row.appendChild(noCell);
    row.appendChild(questionCell);
    row.appendChild(studyCountCell);
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
    
    // ダブルクリックでモーダル表示
    row.addEventListener('dblclick', function(e) {
      e.preventDefault();
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      var itemIndex = currentCategoryData.indexOf(item);
      showModal(item, itemIndex);
    });
    
    tableBody.appendChild(row);
  });
  
  // 選択数の表示を更新
  updateSelectionCount();
  
  var listMessage = document.getElementById('listMessage');
  var listContainer = document.getElementById('listContainer');
  var startButton = document.getElementById('startButton');
  
  if (listMessage) listMessage.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  if (startButton) {
    startButton.style.display = 'block';
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

// 前のカテゴリに移動
function navigateToPreviousCategory() {
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
  }
}

// 次のカテゴリに移動
function navigateToNextCategory() {
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
  }
}

// Listナビゲーションボタンの状態を更新
function updateListNavButtons() {
  var prevButton = document.getElementById('listPrevButton');
  var nextButton = document.getElementById('listNextButton');
  var select = document.getElementById('categorySelect');
  
  if (!prevButton || !nextButton || !select || categories.length === 0) {
    // カテゴリが読み込まれていない場合は非表示
    hideListNavButtons();
    return;
  }
  
  // カテゴリが選択されていない場合
  if (!select.value) {
    // 非表示にする
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
  var selectionCount = document.getElementById('selectionCount');
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
  
  if (listMessage) listMessage.style.display = 'block';
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
  
  // 元のデータを保存
  originalCategoryData = currentCategoryData.slice();
  
  // 選択された問題のみを抽出（未選択時は全問）
  // リスニング練習モード時は常に全問
  var filteredData = [];
  if (isListeningModeEnabled() || selectedQuestionIndices.length === 0) {
    // 未選択時／リスニング時は全問
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
  
  // カテゴリ情報を表示
  var selectedCategory = categories.find(function(cat) {
    return cat.no == currentCategoryNo;
  });
  if (selectedCategory) {
    var currentCategory = document.getElementById('currentCategory');
    if (currentCategory) {
      currentCategory.textContent = selectedCategory.no + '. ' + selectedCategory.name;
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
  
  // トグルボタンの状態を引き継ぐ
  var questionToggleButton = document.getElementById('questionToggleButton');
  var answerToggleButton = document.getElementById('answerToggleButton');
  if (questionToggleButton) {
    if (isQuestionToggleActive) {
      questionToggleButton.classList.add('active');
    } else {
      questionToggleButton.classList.remove('active');
    }
  }
  if (answerToggleButton) {
    if (isAnswerToggleActive) {
      answerToggleButton.classList.add('active');
    } else {
      answerToggleButton.classList.remove('active');
    }
  }
  
  // トグルボタンの位置を更新（screen2のタイトル位置に合わせる）
  requestAnimationFrame(function() {
    requestAnimationFrame(updateToggleButtonPosition);
  });
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
  
  // ナビゲーションバーのAnswerボタンを有効化
  var navAnswerButton = document.getElementById('navAnswerButton');
  var navAnswerText = document.getElementById('navAnswerText');
  if (navAnswerButton) navAnswerButton.disabled = false;
  if (navAnswerText) navAnswerText.classList.add('blinking');
  
  // 回答テキストを非表示
  var answerTextDisplay = document.getElementById('answerTextDisplay');
  var noteSection = document.getElementById('noteSection');
  if (answerTextDisplay) answerTextDisplay.style.display = 'none';
  if (noteSection) noteSection.style.display = 'none';
  isAnswerShown = false;
  
  // 再生ボタンの制御（質問文が画像URLの場合は無効化、それ以外は有効化）
  var playButton = document.getElementById('playButton');
  if (playButton) {
    if (isImageUrl(effectiveQuestion)) {
      // 質問文が画像URLの場合は無効化
      playButton.disabled = true;
    } else {
      // 質問文がテキストの場合は有効化（出題中に質問文を読み上げ可能）
      playButton.disabled = false;
    }
  }
  
  // ストップウォッチをリセットして開始
  resetStopwatch();
  startStopwatch();
  
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
        playAnswer(); // 出題中なので質問文を読み上げ
      }
    }, 250);
  }
  
  // 次の問題をプリロード（バックグラウンドで非同期実行）
  preloadNextQuestions();
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
  
  stopStopwatch();
  
  var item = currentCategoryData[currentQuestionIndex];
  var effectiveQuestion = getEffectiveQuestion(item);
  var effectiveAnswer = getEffectiveAnswer(item);
  var isListeningQuestion = isListeningModeEnabled() && effectiveQuestion && !isImageUrl(effectiveQuestion);
  
  // 上の黒いボックスを非表示
  var answerButtonContainer = document.getElementById('answerButtonContainer');
  if (answerButtonContainer) answerButtonContainer.style.display = 'none';
  
  // ナビゲーションバーのAnswerボタンを無効化
  var navAnswerButton = document.getElementById('navAnswerButton');
  var navAnswerText = document.getElementById('navAnswerText');
  if (navAnswerButton) navAnswerButton.disabled = true;
  if (navAnswerText) navAnswerText.classList.remove('blinking');
  
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
  
  // 再生ボタンの制御（回答が画像URLの場合は無効化、テキストの場合は有効化）
  var playButton = document.getElementById('playButton');
  if (playButton) {
    if (isImageUrl(effectiveAnswer)) {
      // 画像URLの場合は無効化
      playButton.disabled = true;
    } else {
      // テキストの場合は有効化（回答表示後は回答文を読み上げ可能）
      playButton.disabled = false;
    }
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
  
  // TotalStudyCount +1 と LastDate 更新（メモリ即反映 → 画面メタ更新 → GASは非同期）
  incrementTotalStudyCountAsync(item);
  updateLastDateIfNeededAsync(item);
  updateLearningMetaDisplay(item, 'learningMeta');
  
  // ナビゲーションボタンを有効化
  updateNavigationButtons();
  
  // プラスボタンを有効化（回答表示中、学習完了でない場合）
  updatePlusButton();
  
  // 解答読みトグルボタンがONの場合、自動再生（更新モード中は再生しない）
  if (isAnswerToggleActive && !isUpdateMode) {
    playAnswer();
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
  var lastDateText = formatYmdForDisplay(item ? item.last_date : '');
  return '学習回数：' + m + '／' + n + '回　最終学習日時：' + lastDateText;
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
 * updateItemField を非同期で呼び出す（失敗時はエラー表示のみ）
 * @param {Object} item
 * @param {string} field
 * @param {string|number} value
 * @param {Function} [onSuccess]
 */
function updateItemFieldAsync(item, field, value, onSuccess) {
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    return;
  }
  if (!userEmail) {
    userEmail = localStorage.getItem('userEmail');
  }
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    return;
  }
  
  var params = new URLSearchParams();
  params.append('action', 'updateItemField');
  params.append('id', item.id);
  params.append('field', field);
  params.append('value', String(value));
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
    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }
    if (typeof onSuccess === 'function') {
      onSuccess(data);
    }
  })
  .catch(function(error) {
    showError('更新エラー: ' + error.toString());
  });
}

/**
 * Ans押下時: TotalStudyCount を常に +1（非同期）
 * メモリを先に更新し、呼び出し側で学習画面メタ表示を更新する
 * @param {Object} item
 */
function incrementTotalStudyCountAsync(item) {
  if (!item) return;
  
  var nextCount = getRetryCountNumber(item.total_study_count) + 1;
  item.total_study_count = nextCount;
  
  updateItemFieldAsync(item, 'total_study_count', nextCount);
}

/**
 * Ans押下時: LastDate を現在日時で非同期更新（毎回更新）
 * メモリを先に更新し、呼び出し側で学習画面メタ表示を更新する
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
  var item = currentCategoryData[currentQuestionIndex];
  if (!item) return;
  
  // 出題中（isAnswerShown === false）の場合は質問文を読み上げ
  // 回答表示後（isAnswerShown === true）の場合は回答文を読み上げ
  var text = isAnswerShown ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
  
  if (!text) return;
  
  // 画像URLの場合は音声読み上げをスキップ
  if (isImageUrl(text)) {
    return;
  }
  
  // WebアプリURLが設定されていない場合はエラー
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    showError('音声読み上げの設定が完了していません。WebアプリURLを設定してください。');
    return;
  }
  
  // 出題/解答に応じて設定を取得
  var isQuestion = !isAnswerShown;
  var voiceGender = isQuestion ? getAudioVoice('question') : getAudioVoice('answer');
  var speed = isQuestion ? getAudioSpeed('question') : getAudioSpeed('answer');
  
  // キャッシュから音声データを取得（設定情報を含む）
  var cachedAudio = getCachedAudio(text, voiceGender, speed);
  if (cachedAudio) {
    // キャッシュから即座に再生
    playAudioFromCache(cachedAudio);
    return;
  }
  
  // キャッシュにない場合はAPI呼び出し
  fetchAudioFromAPI(text, voiceGender, speed);
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
 */
function playAudioFromCache(audioData) {
  if (!audioData || !audioData.audioContent) {
    return;
  }
  
  try {
    // 既存のAudioがあれば停止
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    
    var audio = new Audio('data:audio/mp3;base64,' + audioData.audioContent);
    currentAudio = audio;
    
    // 再生開始時に再生ボタンを無効化
    audio.addEventListener('play', function() {
      var playButton = document.getElementById('playButton');
      if (playButton) {
        playButton.disabled = true;
      }
    });
    
    // 再生終了時に再生ボタンを有効化
    audio.addEventListener('ended', function() {
      var playButton = document.getElementById('playButton');
      if (playButton) {
        var item = currentCategoryData[currentQuestionIndex];
        if (item) {
          // 出題中の場合は質問文、回答表示後の場合は回答文をチェック
          var textToCheck = isAnswerShown ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
          if (!isImageUrl(textToCheck)) {
            playButton.disabled = false;
          }
        }
      }
      currentAudio = null;
    });
    
    // エラー時に再生ボタンを有効化
    audio.addEventListener('error', function() {
      var playButton = document.getElementById('playButton');
      if (playButton) {
        var item = currentCategoryData[currentQuestionIndex];
        if (item) {
          // 出題中の場合は質問文、回答表示後の場合は回答文をチェック
          var textToCheck = isAnswerShown ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
          if (!isImageUrl(textToCheck)) {
            playButton.disabled = false;
          }
        }
      }
      currentAudio = null;
    });
    
    audio.play().catch(function(error) {
      showError('音声の再生に失敗しました: ' + error.toString());
      // エラー時も再生ボタンを有効化
      var playButton = document.getElementById('playButton');
      if (playButton) {
        var item = currentCategoryData[currentQuestionIndex];
        if (item) {
          // 出題中の場合は質問文、回答表示後の場合は回答文をチェック
          var textToCheck = isAnswerShown ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
          if (!isImageUrl(textToCheck)) {
            playButton.disabled = false;
          }
        }
      }
      currentAudio = null;
    });
  } catch (error) {
    showError('音声の再生に失敗しました: ' + error.toString());
    currentAudio = null;
  }
}

/**
 * ローディング表示を開始
 */
function showPlayButtonLoading() {
  var playButton = document.getElementById('playButton');
  if (playButton) {
    playButton.disabled = true;
    // スピナーを表示
    var spinner = document.createElement('div');
    spinner.className = 'play-button-spinner';
    spinner.id = 'playButtonSpinner';
    playButton.innerHTML = '';
    playButton.appendChild(spinner);
  }
}

/**
 * ローディング表示を終了
 */
function hidePlayButtonLoading() {
  var playButton = document.getElementById('playButton');
  if (playButton) {
    playButton.disabled = false;
    // 元の画像を復元
    var playButtonImg = document.createElement('img');
    playButtonImg.src = 'img/play-button.png';
    playButtonImg.alt = '再生';
    playButton.innerHTML = '';
    playButton.appendChild(playButtonImg);
  }
}

/**
 * APIから音声データを取得
 * @param {string} text - 読み上げるテキスト
 * @param {string} voiceGender - 音声の性別（'male' または 'female'）
 * @param {string} speed - 読み上げの速さ（'fast', 'medium', 'slow'）
 */
function fetchAudioFromAPI(text, voiceGender, speed) {
  // ローディング表示を開始
  showPlayButtonLoading();
  
  // リクエストパラメータを準備
  var params = new URLSearchParams();
  params.append('text', text);
  params.append('voiceGender', voiceGender || 'female'); // デフォルト値：女性
  params.append('speed', speed || 'fast'); // デフォルト値：fast
  params.append('email', userEmail); // TTS処理にもメール認証を追加
  params.append('referer', window.location.origin);
  
  // Google Apps Scriptにリクエストを送信
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
    // ローディング表示を終了
    hidePlayButtonLoading();
    
    if (data.success && data.audioContent) {
      // キャッシュに保存（設定情報を含む）
      saveAudioToCache(text, data.audioContent, voiceGender || 'female', speed || 'fast');
      
      // 音声データ（base64）を再生
      try {
        // 既存のAudioがあれば停止
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
          currentAudio = null;
        }
        
        var audio = new Audio('data:audio/mp3;base64,' + data.audioContent);
        currentAudio = audio;
        
        // 再生開始時に再生ボタンを無効化
        audio.addEventListener('play', function() {
          var playButton = document.getElementById('playButton');
          if (playButton) {
            playButton.disabled = true;
          }
        });
        
        // 再生終了時に再生ボタンを有効化
        audio.addEventListener('ended', function() {
          var playButton = document.getElementById('playButton');
          if (playButton) {
            // 回答が画像URLの場合は無効化のまま
            var item = currentCategoryData[currentQuestionIndex];
            var textToCheck = item ? (isAnswerShown ? getEffectiveAnswer(item) : getEffectiveQuestion(item)) : '';
            if (item && !isImageUrl(textToCheck)) {
              playButton.disabled = false;
            }
          }
          currentAudio = null;
        });
        
        // エラー時に再生ボタンを有効化
        audio.addEventListener('error', function() {
          var playButton = document.getElementById('playButton');
          if (playButton) {
            var item = currentCategoryData[currentQuestionIndex];
            var textToCheck = item ? (isAnswerShown ? getEffectiveAnswer(item) : getEffectiveQuestion(item)) : '';
            if (item && !isImageUrl(textToCheck)) {
              playButton.disabled = false;
            }
          }
          currentAudio = null;
        });
        
        audio.play().catch(function(error) {
          showError('音声の再生に失敗しました: ' + error.toString());
          // エラー時も再生ボタンを有効化
          var playButton = document.getElementById('playButton');
          if (playButton) {
            var item = currentCategoryData[currentQuestionIndex];
            var textToCheck = item ? (isAnswerShown ? getEffectiveAnswer(item) : getEffectiveQuestion(item)) : '';
            if (item && !isImageUrl(textToCheck)) {
              playButton.disabled = false;
            }
          }
          currentAudio = null;
        });
      } catch (error) {
        showError('音声の再生に失敗しました: ' + error.toString());
        currentAudio = null;
      }
    } else {
      showError('音声の生成に失敗しました: ' + (data.error || 'Unknown error'));
    }
  })
  .catch(function(error) {
    // ローディング表示を終了
    hidePlayButtonLoading();
    showError('音声読み上げエラー: ' + error.toString());
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
  if (isAnswerShown) {
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
  
  // 回答表示中（isAnswerShown === true）の場合は、isLearningCompletedに関係なくボタンを有効化
  if (isAnswerShown && !isLearningCompleted) {
    if (isInRetryMode) {
      // 再チャレンジモードの場合
      // 最後の再チャレンジ問題でも、回答表示中は次へボタンを有効にする
      if (nextButton) nextButton.disabled = false;
    } else {
      // 通常モード
      if (nextButton) {
        if (currentQuestionIndex === currentCategoryData.length - 1) {
          // 最後の問題の場合、回答表示中は常に有効（再チャレンジ問題の有無に関係なく）
          nextButton.disabled = false;
        } else {
          nextButton.disabled = false;
        }
      }
    }
  } else if (isLearningCompleted) {
    // 学習完了：再生→<<・次へ→>> で前後カテゴリへ移動
    updateCompletionCategoryNav();
  } else if (isInRetryMode) {
    // 再チャレンジモードの場合（回答表示前）
    if (nextButton) nextButton.disabled = true;
  } else {
    // 通常モード（回答表示前）
    if (nextButton) nextButton.disabled = true;
  }
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
 * 学習ナビアイコンを通常（再生／次へ）に戻す
 */
function setLearningNavIconsNormal() {
  var playButton = document.getElementById('playButton');
  var nextButton = document.getElementById('nextButton');
  
  if (playButton) {
    playButton.classList.remove('category-nav-mode');
    var playImg = playButton.querySelector('img');
    if (playImg) {
      playImg.src = 'img/play-button.png';
      playImg.alt = '再生';
    } else {
      playButton.innerHTML = '';
      playImg = document.createElement('img');
      playImg.src = 'img/play-button.png';
      playImg.alt = '再生';
      playButton.appendChild(playImg);
    }
  }
  
  if (nextButton) {
    nextButton.classList.remove('category-nav-mode');
    var nextImg = nextButton.querySelector('img');
    if (nextImg) {
      nextImg.src = 'img/arrow.png';
      nextImg.alt = '次へ';
    }
  }
}

/**
 * 学習完了時のカテゴリナビアイコン（<< / >>）に切り替える
 */
function setLearningNavIconsCategoryMode() {
  var playButton = document.getElementById('playButton');
  var nextButton = document.getElementById('nextButton');
  
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
}

/**
 * 学習完了時：<< / >> の表示と前後カテゴリ有無に応じた有効／無効を更新
 */
function updateCompletionCategoryNav() {
  if (!isLearningCompleted) {
    return;
  }
  
  setLearningNavIconsCategoryMode();
  
  var idx = getCurrentCategoryIndex();
  var playButton = document.getElementById('playButton');
  var nextButton = document.getElementById('nextButton');
  
  if (playButton) {
    playButton.disabled = (idx < 0 || findSelectableCategoryIndex(idx, -1) < 0);
  }
  if (nextButton) {
    nextButton.disabled = (idx < 0 || findSelectableCategoryIndex(idx, 1) < 0);
  }
}

/**
 * 前後カテゴリへ移動し、全問で学習をすぐ開始する
 * @param {number} direction -1: 前, 1: 次
 */
function startLearningAdjacentCategory(direction) {
  if (!isLearningCompleted) {
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
 * 指定カテゴリのデータを取得し、学習画面のまま全問で学習開始する
 * @param {string|number} categoryNo
 */
function loadCategoryDataAndStartLearning(categoryNo) {
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
  
  var playButton = document.getElementById('playButton');
  var nextButton = document.getElementById('nextButton');
  if (playButton) playButton.disabled = true;
  if (nextButton) nextButton.disabled = true;
  
  var select = document.getElementById('categorySelect');
  if (select) {
    select.value = categoryNo;
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
      selectedQuestionIndices = [];
      displayList();
      updateListNavButtons();
      startLearning();
    })
    .catch(function(error) {
      showError('アクセスエラー: ' + error.toString());
      updateCompletionCategoryNav();
    });
}

// プラスボタンの状態を更新
function updatePlusButton() {
  var plusButton = document.getElementById('plusButton');
  if (plusButton) {
    // 回答表示中で学習完了でない場合は有効、それ以外は無効
    plusButton.disabled = !isAnswerShown || isLearningCompleted;
  }
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
      });
    }, 500);
  }
  
  // 初期画面と同様のCategoryドロップダウンを表示（Listなし）
  showLearningCategorySelect();
  // ドロップダウン文言を最新の学習日・回数に寄せる
  loadCategories({
    preserveValue: currentCategoryNo,
    quiet: true
  });
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
}

// ホームに戻る
function goToHome() {
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
  if (originalCategoryData.length > 0) {
    currentCategoryData = originalCategoryData.slice();
  }
  selectedQuestionIndices = [];
  originalCategoryData = [];
  
  // 学習完了メッセージを非表示
  hideCompletionMessage();
  
  // Listを再描画（メモリ上の retry_count / total_study_count / last_date を反映）
  if (currentCategoryData.length > 0) {
    if (isListeningModeEnabled()) {
      refreshHomeListForPracticeSettings();
    } else {
      displayList();
    }
    // Listと同一ルールでカテゴリ最終学習日を即時反映（全問埋まり→最新日、空欄あり→-）
    syncCategoryLastDateFromList();
    updateListNavButtons();
  }
  
  // カテゴリ一覧を再取得し、ドロップダウンの最終学習日をシート集計でも更新
  if (currentCategoryNo != null && currentCategoryNo !== '') {
    loadCategories({
      preserveValue: currentCategoryNo,
      quiet: true
    });
  }
  
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
  // 選択状態をクリア
  selectedQuestionIndices = [];
  
  // 全行の選択状態を解除
  var tableBody = document.getElementById('listTableBody');
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
}

// クリアボタンの有効/無効を更新
function updateClearButton() {
  var clearButton = document.getElementById('clearSelectionButton');
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
  
  var params = new URLSearchParams();
  params.append('action', 'updateItemField');
  params.append('id', item.id);
  params.append('field', updateStorageField);
  params.append('value', newValue);
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
    if (okButton) {
      okButton.disabled = false;
      okButton.textContent = '確定';
    }
    
    if (data.success) {
      item[updateStorageField] = newValue;
      closeUpdateConfirmModal();
      endUpdateMode(false);
    } else {
      showError('更新に失敗しました: ' + (data.error || 'Unknown error'));
      closeUpdateConfirmModal();
      endUpdateMode(true);
    }
  })
  .catch(function(error) {
    if (okButton) {
      okButton.disabled = false;
      okButton.textContent = '確定';
    }
    showError('更新エラー: ' + error.toString());
    closeUpdateConfirmModal();
    endUpdateMode(true);
  });
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

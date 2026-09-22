// グローバル変数
var categories = [];
var currentCategoryData = [];
var currentCategoryNo = null;
var categoryDataByNo = {}; // カテゴリ切替高速化用（セッション内キャッシュ）
var currentQuestionIndex = 0;
var displayedLearningItem = null; // 出題表示中の item（Ans は index 再参照しない）
var learningStartTime = null;
var learningTimeInterval = null;
var dailyStudyCountDateCheckInterval = null;
var todayStudiedItemCount = 0; // LastDate が今日の問題数（シート集計＋Ans時の楽観更新）
var todayStudiedAnsCount = 0; // 今日の Ans 押下回数（DailyStudyCount 合計＋楽観更新）
var todayStudiedCountDate = ''; // todayStudied* が対応する yyyy-mm-dd
var stopwatchStartTime = null;
var stopwatchInterval = null;
var stopwatchElapsed = 0;
var isStopwatchRunning = false;
var isAnswerShown = false;
var isNoteExpanded = false; // note 本文を開いているか（情報あり時のみ意味を持つ）
var noteClickTimer = null; // note シングル／ダブルクリック判別用
var NOTE_COLLAPSED_HINT = 'メモあり（タップで表示）';
var userEmail = null; // ユーザーのメールアドレス（Googleログイン後）
var googleIdToken = null; // Google IDトークン（GIS credential）
var googleAccessToken = null; // OAuth access token（自前ボタン／Brave等向け）

// Google Identity Services 用クライアントID（GCP OAuth ウェブクライアント）
var GOOGLE_OAUTH_CLIENT_ID = '451690742730-f7aubfes1nea66l0p3tavuibcgntbaa8.apps.googleusercontent.com';
var GOOGLE_ID_TOKEN_STORAGE_KEY = 'googleIdToken';
var GOOGLE_ACCESS_TOKEN_STORAGE_KEY = 'googleAccessToken';
var GOOGLE_ACCESS_TOKEN_EXPIRES_KEY = 'googleAccessTokenExpiresAt';
var googleAccessTokenExpiresAt = 0;
var appSessionToken = null;
var APP_SESSION_STORAGE_PREFIX = 'appSessionToken_v1:';
var memoryAllStudyItems = null;
var lastLocalStudyPersistOk = true;
var dataGenerationCheckInFlight = false;
var googleSignInInitialized = false;
var googleLoginDialogCancellable = false;
var googleLoginForceAccountSelect = false; // ヘッダー「ログイン」からの切替時 true
var googleAuthLockInProgress = false;
var googleSignInAutoSelectEnabled = false;
var googleSignInLoginHint = '';
var modalCurrentIndex = 0; // モーダル内の現在のインデックス
var retryQuestionIndices = []; // 再チャレンジする問題のインデックスを保存
var isInRetryMode = false; // 再チャレンジモードかどうか
var retryQuestionIndex = 0; // 現在の再チャレンジ問題のインデックス
var completedQuestionIndices = []; // 完了した問題のインデックスを保存（灰色表示）
var isLearningCompleted = false; // 学習が完了したかどうか
var completionMessageIconRevealTimeoutId = null; // 完了メッセージアイコン表示用タイマー
var isCompletionCongratsCleared = false; // Next等でお祝い文言を空にしたか
var isCompletionStudyFieldsCollapsed = false; // 完了後カテゴリ切替で出題／解答／note を畳んだか
var completionStudyFieldsCollapseTimerId = null; // 出題ブロックフェード用タイマー
var COMPLETION_STUDY_FIELDS_FADE_MS = 250; // 出題ブロックのフェード時間
var selectedQuestionIndices = []; // 選択された問題のインデックスを保存
var originalCategoryData = []; // 元の全問題データ（出題数表示用）
var isQuestionToggleActive = false; // 出題読みトグルボタンの状態（ON/OFF）
var isAnswerToggleActive = false; // 解答読みトグルボタンの状態（ON/OFF）
var questionToggleBeforeListeningLock = null; // リスニングON固定前の出題読み状態
var answerToggleBeforeListening = null; // リスニングON前の解答読み状態（OFF復帰用）
var currentAudio = null; // 現在再生中のAudioオブジェクト
var completionSfxAudios = []; // 学習完了効果音（出題／解答音声とは別）
var COMPLETION_SFX_URL = 'audio/pirorin.mp3';
var UI_CLICK_SFX_URL = 'audio/buho.mp3';
var START_SFX_URL = 'audio/start.mp3';
var RETRY_SFX_URL = 'audio/retry.mp3';
var UI_CLICK_SFX_VOLUME = 1.0;
var uiClickSfxAudio = null; // ボタン効果音（使い回し。Pages静的ファイル）
var startSfxAudio = null; // START効果音（使い回し。Pages静的ファイル）
var retrySfxAudio = null; // リトライ効果音（使い回し。Pages静的ファイル）
var uiClickSfxPlaying = false;
var uiClickSfxWaiters = [];
var activePlayField = null; // 再生／取得中の欄 'question' | 'answer' | null
var waitingListeningAnsGate = false; // リスニング時：出題音声終了まで Ans 無効・計測待機
var pendingQuestionAutoplayTimerReset = false; // 出題読み自動再生終了後に計測をゼロリセットするか
var sessionRetryPressCountById = {}; // START〜終了：問題IDごとのリトライ押下回数（シート累計とは別）
var isCategoryTransitionInProgress = false; // カテゴリ切替：データ取得〜1問目表示まで
var isRefreshingAdvanceNavControls = false; // refreshAdvanceNavControls の再入防止
var justCompletedCategoryNo = null; // 直前に完了したカテゴリ（完了画面のList／中央Next/Start判定用）
var isCategoryCompletionSessionView = false; // カテゴリ毎：完了直後List（解答側表示）中
var isDurationCompletionSessionView = false; // 解答時間優先：完了直後に今回学習分をList表示中
var CROSS_CATEGORY_LIST_SIZE = 7; // カテゴリ横断モード：List表示件数
var LAST_DATE_POOL_SIZE = 20; // 学習日優先：抽選プール件数
var durationModeSortedItems = []; // 解答時間優先：全件ソート結果
var durationModePageIndex = 0; // 解答時間優先：現在ページ（0始まり）
var durationModeSessionItems = []; // 解答時間優先：今回学習開始時の最大7件（Plus再学習用）
var durationModeLoadRequestId = 0; // 解答時間優先：取得リクエスト世代
var lastDateModeAllItems = []; // 学習日優先：全件ソート結果（再抽選／ページ送り用）
var lastDateModeSessionItems = []; // 学習日優先：今回学習開始時の最大7件（Plus再学習用）
var lastDateModeLoadRequestId = 0; // 学習日優先：取得リクエスト世代
var lastDateModePageIndex = 0; // 学習日優先（ノーマル）：現在ページ（0始まり）
var lastDateModeNeedsResortBeforePaging = false; // 学習日優先（ノーマル）：次の>で再ソートしてからページ送り
var isLastDateCompletionSessionView = false; // 学習日優先：完了直後に今回学習分をList表示中
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
var CACHE_PREFIX = 'tts_audio_'; // 旧 localStorage キー（IndexedDB へ移行後は使わない）
var MAX_CACHE_SIZE = 10 * 1024 * 1024; // 移行時の旧上限（参照用）
var AUDIO_IDB_NAME = 'everyday-english-audio';
var AUDIO_IDB_STORE = 'clips';
var AUDIO_IDB_VERSION = 1;
var MAX_AUDIO_IDB_BYTES = 300 * 1024 * 1024; // IndexedDB 目安上限 300MB
var AUDIO_VOICE_DEFAULT = 'male';
var AUDIO_SPEED_FIXED = 'medium';
var ENABLE_AUDIO_PREFETCH = true; // アプリ起動中の Drive 先読み
var AUDIO_PREFETCH_TIMEOUT_MS = 20000; // 先読み1本の打ち切り
var AUDIO_PREFETCH_RECHECK_MS = 30000; // 未取得が残るときの再確認
var AUDIO_PREFETCH_FAIL_BACKOFF_MS = 10000; // 失敗後の再開（倍増の起点）
var AUDIO_PREFETCH_FAIL_BACKOFF_MAX_MS = 60000;
var AUTH_REFRESH_MARGIN_MS = 5 * 60 * 1000; // トークン残存がこれ未満なら静かに再取得
// 旧名互換。先読みは ENABLE_AUDIO_PREFETCH を使う
var ENABLE_TTS_PRELOAD = false;
var ENABLE_AUDIO_SOURCE_DEBUG = true;
var ENABLE_LOAD_DIAG = true;
var FIELD_PLAY_LONG_PRESS_MS = 700; // 再生ボタン長押しで音声再作成／本文長押しでリトライ
var LEARNING_GESTURE_MOVE_PX = 12; // 本文タップ／長押しをスクロールと区別
var GAS_UPDATE_MAX_ATTEMPTS = 5; // シート更新の最大試行回数（初回含む）
var GAS_UPDATE_BASE_DELAY_MS = 700; // リトライの基本待機（指数バックオフ）
var gasSheetUpdateQueue = []; // シート更新ジョブの直列キュー
var isGasSheetUpdateQueueRunning = false;
var gasAudioFetchQueue = []; // 本問の音声取得ジョブ（同時1本）
var gasAudioPrefetchQueue = []; // 先読みジョブ（本問より低い優先）
var isGasAudioFetchRunning = false;
var isAudioPrefetchJobRunning = false;
var audioPrefetchStopped = false;
var audioPrefetchFailStreak = 0;
var audioPrefetchPlayBlocked = false;
var audioPrefetchRecheckTimer = null;
var audioIdbHaveIds = {};
var idbAudioReadyCount = 0;
var idbAudioTargetCount = 0;
var idbAudioBytes = 0;
var driveAudioReadyCount = null;
var driveAudioTargetCount = null;
var activeAudioFetchGeneration = 0;
var activeAudioFetchAbort = null;
var AUDIO_FETCH_MAX_ATTEMPTS = 3; // Drive／TTS 音声取得の最大試行（初回含む）
var AUDIO_FETCH_RETRY_BASE_DELAY_MS = 700; // 音声取得リトライの基本待機（指数バックオフ）
var ALL_STUDY_ITEMS_FETCH_MAX_ATTEMPTS = 3; // 全問取得の最大試行（初回含む）
var ALL_STUDY_ITEMS_FETCH_TIMEOUT_MS = 60000; // 全問取得1試行あたりの打ち切り
var ALL_STUDY_ITEMS_RETRY_BASE_DELAY_MS = 800; // 全問取得リトライ間隔
var ANS_SHEET_PERSIST_MAX_DEFER_MS = 8000; // 解答音声優先時、シート更新開始の上限待ち
var AUDIO_PLAY_CANPLAY_TIMEOUT_MS = 300; // Blob再生: canplay待ちの上限（超えたら再生開始）
var AUDIO_PLAY_START_TIMEOUT_MS = 3000; // play() が成功しないときの打ち切り
var AUDIO_PLAY_END_GRACE_MS = 2000; // 長さ既知の再生：残り＋この余裕で操作復帰
var AUDIO_PLAY_UNKNOWN_DURATION_MS = 15000; // 長さ不明／再生開始不能時の操作復帰
var AUDIO_PAUSE_STUCK_MS = 1000; // pause のまま終わらないときの操作復帰
var audioBusyWatchdogTimer = null;
var audioPauseStuckTimer = null;
var audioPlayStartTimer = null;
var USER_SETTINGS_SYNC_MAX_ATTEMPTS = 3; // 起動時設定同期の最大試行（初回含む）
var USER_SETTINGS_SYNC_RETRY_DELAY_MS = 800; // 設定同期リトライ間隔

// Ans後：音声ネット取得を優先し、シート更新を遅延するための保留
var pendingAnsSheetPersist = null;
var ansSheetPersistTimer = null;

// 通信診断（ENABLE_LOAD_DIAG）
var loadDiagBootTimer = null;
var loadDiagRunTimer = null;
var loadDiagLastBootSuccessSec = null;
var loadDiagLastAudioSuccessSec = null;
var loadDiagLastUpdateSuccessSec = null;
var loadDiagLastAllSuccessSec = null;
var sheetUpdateOkCount = 0; // セッション内：シート更新ジョブ成功数
var sheetUpdateFailCount = 0; // セッション内：シート更新ジョブ最終失敗数
var LOAD_DIAG_HISTORY_MAX = 8; // 直近完了ログ（スクショ1画面向け）
var loadDiagHistory = []; // 古い→新しい。表示は新しい順
var loadDiagBoot = {
  phase: '',
  attempt: 0,
  maxAttempts: 0,
  status: 'idle',
  startedAt: 0,
  bytes: null,
  queueWait: null,
  lastSuccessSec: null
};
var loadDiagRun = {
  phase: '',
  attempt: 0,
  maxAttempts: 0,
  status: 'idle',
  startedAt: 0,
  bytes: null,
  queueWait: null,
  lastSuccessSec: null
};

/**
 * @returns {boolean}
 */
function isLoadDiagEnabled() {
  return ENABLE_LOAD_DIAG === true;
}

/**
 * @param {number} ms
 * @returns {string}
 */
function formatLoadDiagElapsed(ms) {
  return (Math.max(0, ms) / 1000).toFixed(1) + 's';
}

/**
 * @param {Date} [date]
 * @returns {string}
 */
function formatLoadDiagClock(date) {
  var d = date || new Date();
  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

/**
 * @param {Object} slot
 * @param {{elapsedMs?: number}} [options]
 * @returns {string}
 */
function formatLoadDiagLine(slot, options) {
  if (!slot) {
    return '-';
  }
  options = options || {};
  var parts = [];
  var elapsedMs = options.elapsedMs;
  if (elapsedMs == null) {
    elapsedMs = slot.startedAt ? (Date.now() - slot.startedAt) : 0;
  }
  parts.push(formatLoadDiagElapsed(elapsedMs));
  var phasePart = slot.phase || '-';
  if (slot.maxAttempts > 0) {
    phasePart += ' ' + Math.min((slot.attempt || 0) + 1, slot.maxAttempts) + '/' + slot.maxAttempts;
  }
  parts.push(phasePart);
  // 4: 通信待ちを明示（フリーズと区別しやすくする）
  var statusLabel = slot.status || '-';
  if (statusLabel === '取得中' || statusLabel === '通信待ち') {
    if (slot.phase === '更新' || String(slot.phase).indexOf('更新') === 0) {
      statusLabel = '通信待ち';
    } else if (slot.phase === '更新待機') {
      statusLabel = '音声優先';
    }
  }
  parts.push(statusLabel);
  if (slot.lastSuccessSec != null && !isNaN(slot.lastSuccessSec)) {
    parts.push('直前成功 ' + Number(slot.lastSuccessSec).toFixed(1) + 's');
  }
  if (slot.bytes != null && slot.bytes >= 0) {
    parts.push(Math.max(1, Math.round(slot.bytes / 1024)) + 'KB');
  }
  if (slot.queueWait != null && slot.queueWait > 0) {
    parts.push('q:' + slot.queueWait);
  }
  parts.push('書込OK:' + sheetUpdateOkCount + ' 失敗:' + sheetUpdateFailCount);
  parts.push('IdB ' + idbAudioReadyCount + '/' + idbAudioTargetCount + ' ' +
    Math.max(0, Math.round(idbAudioBytes / (1024 * 1024))) + '/' +
    Math.round(MAX_AUDIO_IDB_BYTES / (1024 * 1024)) + 'MB');
  if (driveAudioTargetCount != null) {
    parts.push('Drv ' + (driveAudioReadyCount != null ? driveAudioReadyCount : '-') + '/' + driveAudioTargetCount);
  }
  return parts.join(' | ');
}

/**
 * 完了した診断行を直近履歴へ追加（最大 LOAD_DIAG_HISTORY_MAX）
 * @param {string} line
 */
function pushLoadDiagHistory(line) {
  if (!line) {
    return;
  }
  loadDiagHistory.push(line);
  if (loadDiagHistory.length > LOAD_DIAG_HISTORY_MAX) {
    loadDiagHistory = loadDiagHistory.slice(-LOAD_DIAG_HISTORY_MAX);
  }
}

/**
 * いまの1行＋直近履歴（新しい順）
 * @param {Object} liveSlot
 * @returns {string}
 */
function getLoadDiagBlockText(liveSlot) {
  var lines = [];
  lines.push(formatLoadDiagLine(liveSlot));
  for (var i = loadDiagHistory.length - 1; i >= 0; i--) {
    lines.push(loadDiagHistory[i]);
  }
  return lines.join('\n');
}

function loadDiagStatusFromError(error) {
  var msg = String(error && (error.message || error) || '');
  var m = msg.match(/(?:ネットワークエラー|drive fetch failed):\s*(\d{3})\b/i);
  if (m) {
    return m[1];
  }
  if (/Failed to fetch/i.test(msg)) {
    return 'Failed to fetch';
  }
  if (/タイムアウト/i.test(msg)) {
    return 'timeout';
  }
  if (/Abort/i.test(msg)) {
    return 'abort';
  }
  if (!msg) {
    return 'error';
  }
  return msg.length > 36 ? msg.slice(0, 36) + '…' : msg;
}

/**
 * @param {*} obj
 * @returns {number|null}
 */
function approxJsonBytes(obj) {
  try {
    return JSON.stringify(obj).length;
  } catch (e) {
    return null;
  }
}

/**
 * 診断UIを描画
 */
function refreshLoadDiagUi() {
  if (!isLoadDiagEnabled()) {
    var hideIds = ['pageLoadingDiag', 'learningLoadDiag', 'netLoadDiag'];
    for (var i = 0; i < hideIds.length; i++) {
      var elHide = document.getElementById(hideIds[i]);
      if (elHide) {
        elHide.style.display = 'none';
      }
    }
    return;
  }

  var bootEl = document.getElementById('pageLoadingDiag');
  if (bootEl) {
    bootEl.style.display = 'block';
    bootEl.textContent = getLoadDiagBlockText(loadDiagBoot);
  }

  var netEl = document.getElementById('netLoadDiag');
  if (netEl) {
    var screen2ForNet = document.getElementById('screen2');
    var onLearningForNet = !!(screen2ForNet && screen2ForNet.classList.contains('active'));
    // 学習中は note 下の診断行のみ（ヘッダーと二重にしない）
    if (onLearningForNet) {
      netEl.style.display = 'none';
    } else {
      netEl.style.display = 'block';
      var overlay = document.getElementById('pageLoadingOverlay');
      var bootVisible = overlay && !overlay.classList.contains('hidden') &&
        overlay.style.display !== 'none';
      var netSlot = bootVisible || (loadDiagRun.status === 'idle' && !loadDiagRun.startedAt)
        ? loadDiagBoot
        : loadDiagRun;
      netEl.textContent = getLoadDiagBlockText(netSlot);
    }
  }

  var runEl = document.getElementById('learningLoadDiag');
  if (runEl) {
    var screen2 = document.getElementById('screen2');
    var onLearning = !!(screen2 && screen2.classList.contains('active'));
    runEl.style.display = onLearning ? 'block' : 'none';
    if (onLearning) {
      runEl.textContent = getLoadDiagBlockText(loadDiagRun);
    }
  }
  if (typeof syncAppHeaderHeight === 'function') {
    syncAppHeaderHeight();
  }
}

/**
 * @param {'boot'|'run'} which
 */
function startLoadDiagTicker(which) {
  stopLoadDiagTicker(which);
  var timerId = setInterval(function() {
    refreshLoadDiagUi();
  }, 250);
  if (which === 'boot') {
    loadDiagBootTimer = timerId;
  } else {
    loadDiagRunTimer = timerId;
  }
}

/**
 * @param {'boot'|'run'} which
 */
function stopLoadDiagTicker(which) {
  if (which === 'boot' && loadDiagBootTimer) {
    clearInterval(loadDiagBootTimer);
    loadDiagBootTimer = null;
  }
  if (which === 'run' && loadDiagRunTimer) {
    clearInterval(loadDiagRunTimer);
    loadDiagRunTimer = null;
  }
}

/**
 * @param {'boot'|'run'} which
 * @param {string} phase
 * @param {number} [maxAttempts]
 * @param {Object} [extra]
 */
function beginLoadDiag(which, phase, maxAttempts, extra) {
  if (!isLoadDiagEnabled()) {
    return;
  }
  extra = extra || {};
  var slot = which === 'boot' ? loadDiagBoot : loadDiagRun;
  slot.phase = phase || '';
  slot.attempt = extra.attempt != null ? extra.attempt : 0;
  slot.maxAttempts = maxAttempts || 0;
  slot.status = extra.status || '取得中';
  slot.startedAt = Date.now();
  slot.bytes = extra.bytes != null ? extra.bytes : null;
  slot.queueWait = extra.queueWait != null ? extra.queueWait : null;
  if (which === 'boot') {
    slot.lastSuccessSec = loadDiagLastBootSuccessSec;
  } else if (extra.kind === 'update') {
    slot.lastSuccessSec = loadDiagLastUpdateSuccessSec;
  } else if (extra.kind === 'all') {
    slot.lastSuccessSec = loadDiagLastAllSuccessSec;
  } else {
    slot.lastSuccessSec = loadDiagLastAudioSuccessSec;
  }
  startLoadDiagTicker(which);
  refreshLoadDiagUi();
}

/**
 * @param {'boot'|'run'} which
 * @param {Object} patch
 */
function updateLoadDiag(which, patch) {
  if (!isLoadDiagEnabled() || !patch) {
    return;
  }
  var slot = which === 'boot' ? loadDiagBoot : loadDiagRun;
  if (patch.phase != null) slot.phase = patch.phase;
  if (patch.attempt != null) slot.attempt = patch.attempt;
  if (patch.maxAttempts != null) slot.maxAttempts = patch.maxAttempts;
  if (patch.status != null) slot.status = patch.status;
  if (patch.bytes != null) slot.bytes = patch.bytes;
  if (patch.queueWait != null) slot.queueWait = patch.queueWait;
  if (patch.lastSuccessSec != null) slot.lastSuccessSec = patch.lastSuccessSec;
  if (patch.restartTimer) {
    slot.startedAt = Date.now();
  }
  refreshLoadDiagUi();
}

/**
 * @param {'boot'|'run'} which
 * @param {string} status
 * @param {{ok?: boolean, kind?: string, bytes?: number, keepTickerMs?: number}} [opts]
 */
function finishLoadDiag(which, status, opts) {
  if (!isLoadDiagEnabled()) {
    return;
  }
  opts = opts || {};
  var slot = which === 'boot' ? loadDiagBoot : loadDiagRun;
  var elapsedSec = slot.startedAt ? (Date.now() - slot.startedAt) / 1000 : 0;
  slot.status = status || '完了';
  if (opts.bytes != null) {
    slot.bytes = opts.bytes;
  }
  if (opts.ok) {
    if (which === 'boot') {
      loadDiagLastBootSuccessSec = elapsedSec;
      slot.lastSuccessSec = elapsedSec;
    } else if (opts.kind === 'update') {
      loadDiagLastUpdateSuccessSec = elapsedSec;
      slot.lastSuccessSec = elapsedSec;
    } else if (opts.kind === 'all') {
      loadDiagLastAllSuccessSec = elapsedSec;
      slot.lastSuccessSec = elapsedSec;
    } else {
      loadDiagLastAudioSuccessSec = elapsedSec;
      slot.lastSuccessSec = elapsedSec;
    }
  }
  if (slot.startedAt) {
    pushLoadDiagHistory(
      formatLoadDiagClock() + ' ' + formatLoadDiagLine(slot, { elapsedMs: elapsedSec * 1000 })
    );
  }
  refreshLoadDiagUi();
  var keepMs = opts.keepTickerMs != null ? opts.keepTickerMs : (which === 'boot' ? 0 : 1200);
  if (keepMs <= 0) {
    stopLoadDiagTicker(which);
    refreshLoadDiagUi();
    return;
  }
  setTimeout(function() {
    stopLoadDiagTicker(which);
    refreshLoadDiagUi();
  }, keepMs);
}

// Google Apps Script WebアプリのURL（統合版：TTSとDATAの両方を処理）
// 注意: Gas_Main.gsをWebアプリとして公開した際のURLを設定してください
// ここにGoogle Apps ScriptのWebアプリURLを設定してください
//var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwysmu_TOO2CywifujRaRTGSZ-DE1GcOw2iZExPpdGPLweR2UBZp-5KPktHy3Ju9t58Gg/exec';  //DEV用
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxTBkXrUOsYjzb1xERU-GXe5g8w9f0lxqOyxn6P8-VC9zNDMtjmTXOKRH_lBnRra3Kzcw/exec';  //PRD用

/**
 * 認証用 email（メモリ → localStorage）
 * @returns {string}
 */
function resolveAuthEmail() {
  var email = userEmail || '';
  try {
    if (!email) {
      email = localStorage.getItem('userEmail') || '';
    }
  } catch (e) {
    email = email || '';
  }
  return String(email || '').trim();
}

/**
 * POST用URL（referer / email をクエリに付与）
 * GAS WebアプリのリダイレクトでPOSTボディが欠落しても認証できるようにする。
 * idToken／accessToken はクエリに出さない（ボディのみ）。
 * @returns {string}
 */
function buildGasPostUrl() {
  var params = new URLSearchParams();
  params.append('referer', window.location.origin || '');
  var email = resolveAuthEmail();
  if (email) {
    params.append('email', email);
  }
  return WEB_APP_URL + '?' + params.toString();
}

/**
 * GAS JSON 応答から sessionToken を保存する
 * @param {*} data
 * @returns {*}
 */
function applyGasAuthPayload(data) {
  if (data && data.sessionToken) {
    setAppSessionToken(data.sessionToken);
  }
  return data;
}

/**
 * HTTP 成功時に JSON を読み、sessionToken を取り込む
 * @param {Response} response
 * @returns {Promise<Object>}
 */
function parseGasResponseJson(response) {
  if (!response.ok) {
    throw new Error('ネットワークエラー: ' + response.status);
  }
  return response.json().then(function(data) {
    applyGasAuthPayload(data);
    return data;
  });
}

/**
 * セッション無効時に Google トークンで再送してよいか
 * @param {*} message
 * @returns {boolean}
 */
function isRecoverableSessionAuthFailure_(message) {
  var msg = String(message || '');
  if (!msg) {
    return false;
  }
  if (msg.indexOf('Email not authorized') >= 0) {
    return false;
  }
  if (msg.indexOf('Email does not match Google') >= 0) {
    return false;
  }
  return msg.indexOf('Session expired') >= 0 ||
    msg.indexOf('idToken or accessToken is required') >= 0 ||
    msg.indexOf('Invalid or expired Google token') >= 0 ||
    msg.indexOf('sign in with Google') >= 0 ||
    msg.indexOf('sign in again') >= 0;
}

/**
 * GAS POST の認証パラメータを現状の session／Google に差し替える
 * @param {URLSearchParams} params
 */
function rebindGasAuthParams_(params) {
  if (!params) {
    return;
  }
  params.delete('email');
  params.delete('sessionToken');
  params.delete('idToken');
  params.delete('accessToken');
  appendAuthParams(params);
}

/**
 * GAS POST。セッション無効なら学習を捨てず Google トークンで1回だけ再送する
 * @param {URLSearchParams} params
 * @param {{ signal?: AbortSignal, readJson?: function(Response): Promise<*>, httpErrorPrefix?: string }} [options]
 * @returns {Promise<*>}
 */
function postGasJson(params, options) {
  options = options || {};
  var hadSession = !!getAppSessionToken();
  var retried = false;

  function send(bodyParams) {
    var fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyParams
    };
    if (options.signal) {
      fetchOptions.signal = options.signal;
    }
    return fetch(buildGasPostUrl(), fetchOptions).then(function(response) {
      if (!response.ok) {
        throw new Error((options.httpErrorPrefix || 'ネットワークエラー: ') + response.status);
      }
      if (options.readJson) {
        return options.readJson(response);
      }
      return response.json();
    }).then(function(data) {
      applyGasAuthPayload(data);
      return data;
    });
  }

  function retryWithGoogleAuth_(errorOrData) {
    var msg = '';
    if (errorOrData && typeof errorOrData === 'object' && errorOrData.error) {
      msg = String(errorOrData.error);
    } else if (errorOrData) {
      msg = String(errorOrData.message || errorOrData);
    }
    if (retried || !hadSession || !isRecoverableSessionAuthFailure_(msg)) {
      return null;
    }
    retried = true;
    clearAppSessionToken();
    return new Promise(function(resolve, reject) {
      ensureFreshGoogleAuthToken(function() {
        rebindGasAuthParams_(params);
        send(params).then(resolve, reject);
      }, function() {
        if (errorOrData instanceof Error) {
          reject(errorOrData);
          return;
        }
        reject(new Error(msg || 'Access denied: Session expired. Please sign in with Google.'));
      });
    });
  }

  return send(params).then(function(data) {
    if (data && data.success === false) {
      var retryOk = retryWithGoogleAuth_(data);
      if (retryOk) {
        return retryOk;
      }
    }
    return data;
  }).catch(function(error) {
    var retryErr = retryWithGoogleAuth_(error);
    if (retryErr) {
      return retryErr;
    }
    throw error;
  });
}

/**
 * @returns {string}
 */
function getAppSessionStorageKey(email) {
  var keyEmail = email != null ? String(email).trim() : resolveAuthEmail();
  return APP_SESSION_STORAGE_PREFIX + String(keyEmail || '').toLowerCase();
}

/**
 * @returns {string}
 */
function getAppSessionToken() {
  if (appSessionToken) {
    return appSessionToken;
  }
  try {
    var stored = localStorage.getItem(getAppSessionStorageKey());
    if (stored) {
      appSessionToken = stored;
      return stored;
    }
  } catch (e) {
    // ignore
  }
  return '';
}

/**
 * @param {string} token
 */
function setAppSessionToken(token) {
  appSessionToken = token || null;
  try {
    var key = getAppSessionStorageKey();
    if (token) {
      localStorage.setItem(key, token);
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // ignore
  }
}

function clearAppSessionToken() {
  setAppSessionToken('');
}

/**
 * @returns {boolean}
 */
function hasUsableAuth() {
  return !!resolveAuthEmail() && (!!getAppSessionToken() || hasValidGoogleAuthToken());
}

/**
 * 音声取得の一時的なネットワーク失敗か
 * @param {*} error
 * @returns {boolean}
 */
function isTransientAudioNetworkError(error) {
  if (!error || isAbortError(error)) {
    return false;
  }
  var msg = String(error.message || error.toString() || '');
  var statusMatch = msg.match(/(?:ネットワークエラー|drive fetch failed):\s*(\d{3})\b/i);
  if (statusMatch) {
    var code = Number(statusMatch[1]);
    return code === 404 || code === 408 || code === 425 || code === 429 ||
      (code >= 500 && code <= 599);
  }
  if (/Failed to fetch|NetworkError|network error|Load failed/i.test(msg)) {
    return true;
  }
  return false;
}

/**
 * 音声取得の一時的な業務エラー応答か（HTTP成功だが再試行価値あり）
 * @param {string} errorMessage
 * @returns {boolean}
 */
function isTransientAudioBusinessError(errorMessage) {
  var msg = String(errorMessage || '');
  return /Email parameter is required/i.test(msg);
}

// ========================================
// ユーザー設定の端末間同期（Settings / Drive）
// ========================================
var userSettingsSyncTimer = null;
var userSettingsSyncInFlight = false;
var userSettingsSyncQueued = false;
var userSettingsBgUploadPending = false;
var userSettingsInitialSyncDone = false;
var userSettingsApplyingFromServer = false;

/**
 * 背景 Drive ファイルIDの localStorage キー
 * @returns {string}
 */
function getSettingsBgDriveFileIdKey() {
  var email = userEmail || localStorage.getItem('userEmail') || '';
  return 'settingsBgDriveFileId:' + String(email);
}

function getStoredSettingsBgDriveFileId() {
  try {
    return localStorage.getItem(getSettingsBgDriveFileIdKey()) || '';
  } catch (e) {
    return '';
  }
}

function setStoredSettingsBgDriveFileId(fileId) {
  try {
    var key = getSettingsBgDriveFileIdKey();
    if (fileId) {
      localStorage.setItem(key, String(fileId));
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {
    // ignore
  }
}

/**
 * 現在の localStorage から同期用 settings オブジェクトを組み立てる
 * @returns {Object}
 */
function buildUserSettingsPayloadFromLocal() {
  var customBg = '';
  try {
    customBg = localStorage.getItem('customBackgroundImage') || '';
  } catch (e) {
    customBg = '';
  }
  var brightness = 'bright';
  try {
    var b = localStorage.getItem('backgroundBrightness');
    if (b === 'dark' || b === 'bright') {
      brightness = b;
    }
  } catch (e2) {
    // ignore
  }

  var background = {
    type: 'default',
    presetPath: '',
    driveFileId: getStoredSettingsBgDriveFileId(),
    brightness: brightness
  };
  if (customBg && customBg.indexOf('img/bg/') >= 0) {
    background.type = 'preset';
    background.presetPath = customBg.indexOf('img/bg/') === 0
      ? customBg
      : (customBg.match(/img\/bg\/[^"']+/) ? customBg.match(/img\/bg\/[^"']+/)[0] : customBg);
  } else if (customBg && customBg.indexOf('data:') === 0) {
    background.type = 'upload';
  } else if (background.driveFileId) {
    background.type = 'upload';
  }

  var visibleNos = getSavedVisibleCategoryNos();

  return {
    background: background,
    audio: {
      voice_question: getAudioVoice('question'),
      voice_answer: getAudioVoice('answer'),
      speed_question: getAudioSpeed('question'),
      speed_answer: getAudioSpeed('answer')
    },
    visibleCategoryNos: visibleNos,
    practice: {
      questionMethod: getQuestionMethod(),
      swapQA: isSwapQAEnabled() ? 'on' : 'off',
      listeningMode: isListeningModeEnabled() ? 'on' : 'off'
    },
    readToggle: {
      question: getReadToggle('question') ? 'on' : 'off',
      answer: getReadToggle('answer') ? 'on' : 'off'
    }
  };
}

/**
 * サーバ settings を localStorage / UI に適用
 * @param {Object} settings
 * @param {string} [imageContent]
 * @param {string} [mimeType]
 */
function applyUserSettingsFromServer(settings, imageContent, mimeType) {
  if (!settings || typeof settings !== 'object') {
    return;
  }
  userSettingsApplyingFromServer = true;
  try {
    applyUserSettingsFromServerBody_(settings, imageContent, mimeType);
  } finally {
    userSettingsApplyingFromServer = false;
  }
}

/**
 * @param {Object} settings
 * @param {string} [imageContent]
 * @param {string} [mimeType]
 */
function applyUserSettingsFromServerBody_(settings, imageContent, mimeType) {
  var bg = settings.background || {};
  var brightness = (bg.brightness === 'dark') ? 'dark' : 'bright';
  try {
    localStorage.setItem('backgroundBrightness', brightness);
  } catch (e) {
    // ignore
  }

  if (bg.type === 'preset' && bg.presetPath) {
    try {
      localStorage.setItem('customBackgroundImage', String(bg.presetPath));
    } catch (e2) {
      // ignore
    }
    setStoredSettingsBgDriveFileId('');
    userSettingsBgUploadPending = false;
  } else if (bg.type === 'upload') {
    if (imageContent) {
      var mime = mimeType || 'image/jpeg';
      var dataUrl = 'data:' + mime + ';base64,' + String(imageContent).replace(/\s/g, '');
      try {
        localStorage.setItem('customBackgroundImage', dataUrl);
      } catch (e3) {
        console.warn('背景画像の localStorage 保存に失敗しました。');
      }
    }
    setStoredSettingsBgDriveFileId(bg.driveFileId || '');
    userSettingsBgUploadPending = false;
  } else {
    try {
      localStorage.removeItem('customBackgroundImage');
    } catch (e4) {
      // ignore
    }
    setStoredSettingsBgDriveFileId('');
    userSettingsBgUploadPending = false;
  }
  setBackgroundImage();

  if (settings.audio) {
    try {
      if (settings.audio.voice_question) localStorage.setItem('audioVoice_question', settings.audio.voice_question);
      if (settings.audio.voice_answer) localStorage.setItem('audioVoice_answer', settings.audio.voice_answer);
      persistFixedAudioSpeed_();
    } catch (e5) {
      // ignore
    }
    loadAudioSettings();
  }

  if (Object.prototype.hasOwnProperty.call(settings, 'visibleCategoryNos')) {
    if (settings.visibleCategoryNos == null) {
      clearVisibleCategorySetting();
    } else if (Array.isArray(settings.visibleCategoryNos)) {
      saveVisibleCategoryNos(settings.visibleCategoryNos);
    }
  }

  if (settings.practice) {
    try {
      if (settings.practice.questionMethod && QUESTION_METHOD_VALUES[settings.practice.questionMethod]) {
        localStorage.setItem('practiceQuestionMethod', settings.practice.questionMethod);
      }
      if (settings.practice.swapQA === 'on' || settings.practice.swapQA === 'off') {
        localStorage.setItem('practiceSwapQA', settings.practice.swapQA);
      }
      if (settings.practice.listeningMode === 'on' || settings.practice.listeningMode === 'off') {
        localStorage.setItem('practiceListeningMode', settings.practice.listeningMode);
      }
    } catch (e6) {
      // ignore
    }
    loadPracticeSettings();
  }

  if (settings.readToggle) {
    try {
      if (settings.readToggle.question === 'on' || settings.readToggle.question === 'off') {
        localStorage.setItem('readToggle_question', settings.readToggle.question);
      }
      if (settings.readToggle.answer === 'on' || settings.readToggle.answer === 'off') {
        localStorage.setItem('readToggle_answer', settings.readToggle.answer);
      }
    } catch (e7) {
      // ignore
    }
    loadReadToggles();
    syncQuestionToggleForListeningMode();
  }
}

/**
 * サーバへ設定を保存
 * @param {Function} [onDone]
 */
function pushUserSettingsToServer(onDone) {
  if (!userEmail) {
    if (typeof onDone === 'function') onDone();
    return;
  }
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    if (typeof onDone === 'function') onDone();
    return;
  }

  var settings = buildUserSettingsPayloadFromLocal();
  var params = new URLSearchParams();
  params.append('action', 'saveUserSettings');
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  params.append('settings', JSON.stringify(settings));

  if (userSettingsBgUploadPending && settings.background && settings.background.type === 'upload') {
    var customBg = '';
    try {
      customBg = localStorage.getItem('customBackgroundImage') || '';
    } catch (e) {
      customBg = '';
    }
    if (customBg.indexOf('data:') === 0) {
      var comma = customBg.indexOf(',');
      var meta = customBg.substring(5, comma > 0 ? comma : customBg.length);
      var mime = meta.split(';')[0] || 'image/jpeg';
      var b64 = comma > 0 ? customBg.substring(comma + 1) : '';
      if (b64) {
        params.append('backgroundImageContent', b64);
        params.append('backgroundMimeType', mime);
      }
    }
  }

  postGasJson(params)
  .then(function(data) {
    if (!data || !data.success) {
      throw new Error((data && data.error) || '設定の同期に失敗しました');
    }
    userSettingsBgUploadPending = false;
    if (data.settings && data.settings.background) {
      setStoredSettingsBgDriveFileId(data.settings.background.driveFileId || '');
    }
    if (typeof onDone === 'function') onDone(null, data);
  })
  .catch(function(error) {
    console.warn('設定同期（保存）エラー:', error);
    var errText = error && error.message ? error.message : String(error);
    showError('設定の同期に失敗しました: ' + errText);
    if (isGoogleAuthFailureMessage(errText)) {
      return;
    }
    if (typeof onDone === 'function') onDone(error);
  });
}

/**
 * 設定変更後の同期をデバウンス予約
 */
function scheduleUserSettingsSync() {
  if (!userEmail || !userSettingsInitialSyncDone || userSettingsApplyingFromServer) {
    return;
  }
  if (userSettingsSyncTimer) {
    clearTimeout(userSettingsSyncTimer);
  }
  userSettingsSyncTimer = setTimeout(function() {
    userSettingsSyncTimer = null;
    if (userSettingsSyncInFlight) {
      userSettingsSyncQueued = true;
      return;
    }
    userSettingsSyncInFlight = true;
    pushUserSettingsToServer(function() {
      userSettingsSyncInFlight = false;
      if (userSettingsSyncQueued) {
        userSettingsSyncQueued = false;
        scheduleUserSettingsSync();
      }
    });
  }, 600);
}

/**
 * 起動時：サーバ設定を取得し適用。無ければ端末設定をアップロード
 * 一時失敗時は自動リトライし、それでも失敗なら端末設定でカテゴリ取得へ進む
 * @param {Function} [onDone]
 */
function syncUserSettingsWithServer(onDone) {
  if (!userEmail) {
    userSettingsInitialSyncDone = true;
    if (typeof onDone === 'function') onDone();
    return;
  }
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    userSettingsInitialSyncDone = true;
    if (typeof onDone === 'function') onDone();
    return;
  }

  function attemptSync(attemptIndex) {
    beginLoadDiag('boot', '設定同期', USER_SETTINGS_SYNC_MAX_ATTEMPTS, { attempt: attemptIndex });
    setPageLoadingProgress(10, '設定');
    var params = new URLSearchParams();
    params.append('action', 'getUserSettings');
    appendAuthParams(params);
    params.append('referer', window.location.origin || '');
    params.append('knownDriveFileId', getStoredSettingsBgDriveFileId());

    postGasJson(params)
    .then(function(data) {
      if (!data || !data.success) {
        throw new Error((data && data.error) || '設定の取得に失敗しました');
      }
      updateLoadDiag('boot', {
        status: 'OK',
        bytes: approxJsonBytes(data)
      });
      if (data.found && data.settings) {
        applyUserSettingsFromServer(
          data.settings,
          data.backgroundImageContent || '',
          data.backgroundMimeType || ''
        );
        userSettingsInitialSyncDone = true;
        finishLoadDiag('boot', 'OK', { ok: true, bytes: approxJsonBytes(data), keepTickerMs: 0 });
        if (typeof onDone === 'function') onDone(null, data);
        return;
      }
      // サーバ未登録：端末設定をブートストラップ
      var localBg = '';
      try {
        localBg = localStorage.getItem('customBackgroundImage') || '';
      } catch (e) {
        localBg = '';
      }
      if (localBg.indexOf('data:') === 0) {
        userSettingsBgUploadPending = true;
      }
      updateLoadDiag('boot', { phase: '設定保存', status: '取得中' });
      pushUserSettingsToServer(function(saveErr, saveData) {
        userSettingsInitialSyncDone = true;
        finishLoadDiag('boot', 'OK', { ok: true, keepTickerMs: 0 });
        if (typeof onDone === 'function') onDone(saveErr || null, saveData || data);
      });
    })
    .catch(function(error) {
      console.warn('設定同期（取得）エラー:', error);
      var errText = error && error.message ? error.message : String(error);
      updateLoadDiag('boot', {
        attempt: attemptIndex,
        status: loadDiagStatusFromError(error)
      });
      if (isGoogleAuthFailureMessage(errText)) {
        userSettingsInitialSyncDone = false;
        finishLoadDiag('boot', loadDiagStatusFromError(error), { ok: false, keepTickerMs: 0 });
        // 認証失敗は再ログイン誘導（showError 経由でロック）
        showError('設定の同期に失敗しました: ' + errText);
        return;
      }
      var nextAttempt = attemptIndex + 1;
      if (nextAttempt < USER_SETTINGS_SYNC_MAX_ATTEMPTS) {
        setTimeout(function() {
          attemptSync(nextAttempt);
        }, USER_SETTINGS_SYNC_RETRY_DELAY_MS * nextAttempt);
        return;
      }
      // 一時失敗：端末設定で続行（強いエラー表示はしない）
      userSettingsInitialSyncDone = true;
      console.warn('設定同期を諦め、端末の設定で続行します。');
      finishLoadDiag('boot', loadDiagStatusFromError(error), { ok: false, keepTickerMs: 0 });
      if (typeof onDone === 'function') onDone(error, null);
    });
  }

  attemptSync(0);
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
  var loadingSpinner = document.getElementById('categoryLoadingSpinner');
  var listMessage = document.getElementById('listMessage');
  if (holdOverlay) {
    if (!isPageLoadingVisible()) {
      showPageLoading();
    }
    setPageLoadingProgress(50, '全問データ');
  }
  if (holdOverlay || !currentCategoryData || currentCategoryData.length === 0) {
    if (loadingSpinner) {
      loadingSpinner.style.display = 'block';
    }
    if (listMessage && !isLearningCompleted) {
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
  var loadingSpinner = document.getElementById('categoryLoadingSpinner');
  if (loadingSpinner) {
    loadingSpinner.style.display = 'none';
  }
  updateStartButtonEnabled();
}

// メール／Googleログイン状態を確認し、必要に応じてログイン画面を表示
function checkUserEmail() {
  restoreGoogleAuthFromStorage();
  if (!userEmail || !hasUsableAuth()) {
    setAppAuthUiLocked(true);
    tryGoogleResumeSignIn(function() {
      showGoogleLoginDialog({ cancellable: true });
    });
    return;
  }
  startAuthenticatedBoot();
}

/**
 * ログイン済み：設定同期のあと、世代一致なら全問取得を省略する
 */
function startAuthenticatedBoot() {
  setAppAuthUiLocked(true);
  showPageLoading();
  var retryBtn = document.getElementById('pageLoadingRetryButton');
  if (retryBtn) {
    retryBtn.style.display = 'none';
  }
  syncUserSettingsWithServer(function(err, data) {
    if (err && isGoogleAuthFailureMessage(String(err.message || err))) {
      return;
    }
    continueBootWithStudyItems(err, data);
  });
}

/**
 * 設定同期後の表ロード（省略／1本取得／再試行）
 * @param {*} settingsErr
 * @param {Object|null} settingsData
 */
function continueBootWithStudyItems(settingsErr, settingsData) {
  var local = readLocalStudyBundle();
  var localOk = hasCompleteLocalStudyData(local);
  var serverGen = (settingsData && settingsData.dataGeneration != null)
    ? Number(settingsData.dataGeneration)
    : null;
  var canSkip = localOk && (
    settingsErr
      ? true
      : (serverGen != null && !isNaN(serverGen) && serverGen === Number(local.dataGeneration))
  );
  if (canSkip) {
    applyStudyItemsToApp(local.items, { isBoot: true });
    finishPageLoadingAndUnlock();
    fetchDriveAudioCoverage();
    ensureAudioPrefetchInventory();
    return;
  }
  setPageLoadingProgress(50, '全問データ');
  fetchAllStudyItemsFromServer(function(fetchErr, items, meta) {
    if (fetchErr) {
      if (isGoogleAuthFailureMessage(String(fetchErr.message || fetchErr))) {
        showError(String(fetchErr.message || fetchErr));
        return;
      }
      if (localOk) {
        applyStudyItemsToApp(local.items, { isBoot: true });
        finishPageLoadingAndUnlock();
        fetchDriveAudioCoverage();
        ensureAudioPrefetchInventory();
        return;
      }
      showBootDataRetry(fetchErr);
      return;
    }
    if (!items || !items.length) {
      if (localOk) {
        applyStudyItemsToApp(local.items, { isBoot: true });
        finishPageLoadingAndUnlock();
        fetchDriveAudioCoverage();
        ensureAudioPrefetchInventory();
        return;
      }
      showBootDataRetry(new Error('データがありません'));
      return;
    }
    var gen = (meta && meta.dataGeneration != null) ? meta.dataGeneration : serverGen;
    writeLocalStudyBundle(items || [], gen);
    applyStudyItemsToApp(items || [], { isBoot: true });
    finishPageLoadingAndUnlock();
    fetchDriveAudioCoverage();
    ensureAudioPrefetchInventory();
  });
}

/**
 * 初回端末に表が無いときの再試行
 * @param {*} error
 */
function showBootDataRetry(error) {
  setAppAuthUiLocked(true);
  showPageLoading();
  var statusEl = document.getElementById('pageLoadingStatus');
  if (statusEl) {
    statusEl.textContent = 'データの取得に失敗しました。再試行してください。';
  }
  var percentEl = document.getElementById('pageLoadingPercent');
  if (percentEl) {
    percentEl.textContent = '';
  }
  var btn = document.getElementById('pageLoadingRetryButton');
  if (btn) {
    btn.style.display = 'inline-block';
    btn.onclick = function() {
      btn.style.display = 'none';
      startAuthenticatedBoot();
    };
  }
  finishLoadDiag('boot', loadDiagStatusFromError(error), { ok: false, keepTickerMs: 0 });
}

/**
 * スマホ等：GIS の prompt（One Tap）を使わずボタンログインにする判定
 * @returns {boolean}
 */
function isLikelyMobileClient() {
  var ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) {
    return true;
  }
  try {
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches &&
        window.matchMedia('(max-width: 900px)').matches) {
      return true;
    }
  } catch (e) {
    // ignore
  }
  return false;
}

/**
 * 未ログイン／未許可時はログイン以外のUIを無効化する
 * @param {boolean} locked
 */
function setAppAuthUiLocked(locked) {
  if (locked) {
    document.body.classList.add('app-auth-locked');
    try {
      closeSideMenu();
    } catch (e) {
      // ignore
    }
  } else {
    document.body.classList.remove('app-auth-locked');
  }
  var loginBtn = document.getElementById('loginButton');
  if (loginBtn) {
    loginBtn.disabled = false;
  }
}

/**
 * @returns {boolean}
 */
function isAppAuthUiLocked() {
  return document.body.classList.contains('app-auth-locked');
}

/**
 * localStorage から認証情報を復元（旧 sessionStorage があれば移行）
 */
function restoreGoogleAuthFromStorage() {
  try {
    userEmail = localStorage.getItem('userEmail');
  } catch (e) {
    userEmail = null;
  }
  googleIdToken = readPersistedAuthValue(GOOGLE_ID_TOKEN_STORAGE_KEY);
  googleAccessToken = readPersistedAuthValue(GOOGLE_ACCESS_TOKEN_STORAGE_KEY);
  googleAccessTokenExpiresAt = Number(readPersistedAuthValue(GOOGLE_ACCESS_TOKEN_EXPIRES_KEY) || 0) || 0;
  if (googleIdToken && isGoogleIdTokenExpired(googleIdToken)) {
    clearGoogleIdToken();
  }
  if (googleAccessToken && googleAccessTokenExpiresAt && Date.now() >= googleAccessTokenExpiresAt) {
    clearGoogleAccessToken();
  }
  appSessionToken = null;
  try {
    var storedSession = localStorage.getItem(getAppSessionStorageKey());
    if (storedSession) {
      appSessionToken = storedSession;
    }
  } catch (e2) {
    appSessionToken = null;
  }
}

/**
 * 認証トークンの永続値を読む（localStorage。旧 sessionStorage は移行して消す）
 * @param {string} key
 * @returns {string|null}
 */
function readPersistedAuthValue(key) {
  try {
    var localVal = localStorage.getItem(key);
    if (localVal) {
      return localVal;
    }
  } catch (e) {}
  try {
    var sessionVal = sessionStorage.getItem(key);
    if (sessionVal) {
      try {
        localStorage.setItem(key, sessionVal);
      } catch (e2) {}
      try {
        sessionStorage.removeItem(key);
      } catch (e3) {}
      return sessionVal;
    }
  } catch (e4) {}
  return null;
}

/**
 * 認証トークンを localStorage に保存する（sessionStorage は使わない）
 * @param {string} key
 * @param {string} value
 */
function writePersistedAuthValue(key, value) {
  try {
    if (value) {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch (e) {}
  try {
    sessionStorage.removeItem(key);
  } catch (e2) {}
}

/**
 * GAS リクエストへ email と sessionToken（無ければ Google トークン）を付与
 * @param {URLSearchParams} params
 */
function appendAuthParams(params) {
  if (!params) {
    return;
  }
  var email = resolveAuthEmail();
  if (email) {
    params.append('email', email);
  }
  var sessionToken = getAppSessionToken();
  if (sessionToken) {
    params.append('sessionToken', sessionToken);
    return;
  }
  var token = getGoogleIdToken();
  if (token) {
    params.append('idToken', token);
  }
  var accessToken = getGoogleAccessToken();
  if (accessToken) {
    params.append('accessToken', accessToken);
  }
}

/**
 * @returns {string}
 */
function getGoogleIdToken() {
  if (googleIdToken && !isGoogleIdTokenExpired(googleIdToken)) {
    return googleIdToken;
  }
  try {
    var stored = localStorage.getItem(GOOGLE_ID_TOKEN_STORAGE_KEY);
    if (stored && !isGoogleIdTokenExpired(stored)) {
      googleIdToken = stored;
      return stored;
    }
  } catch (e) {
    // ignore
  }
  return '';
}

/**
 * @param {string} token
 */
function setGoogleIdToken(token) {
  googleIdToken = token || null;
  writePersistedAuthValue(GOOGLE_ID_TOKEN_STORAGE_KEY, token || '');
}

function clearGoogleIdToken() {
  setGoogleIdToken('');
}

/**
 * @returns {string}
 */
function getGoogleAccessToken() {
  if (googleAccessTokenExpiresAt && Date.now() >= googleAccessTokenExpiresAt) {
    clearGoogleAccessToken();
    return '';
  }
  if (googleAccessToken) {
    return googleAccessToken;
  }
  try {
    var stored = localStorage.getItem(GOOGLE_ACCESS_TOKEN_STORAGE_KEY);
    var storedExp = Number(localStorage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRES_KEY) || 0) || 0;
    if (storedExp && Date.now() >= storedExp) {
      clearGoogleAccessToken();
      return '';
    }
    if (stored) {
      googleAccessToken = stored;
      googleAccessTokenExpiresAt = storedExp;
      return stored;
    }
  } catch (e) {
    // ignore
  }
  return '';
}

/**
 * @param {string} token
 * @param {number} [expiresInSec]
 */
function setGoogleAccessToken(token, expiresInSec) {
  googleAccessToken = token || null;
  if (token && expiresInSec) {
    googleAccessTokenExpiresAt = Date.now() + (Number(expiresInSec) * 1000) - 60000;
  } else if (!token) {
    googleAccessTokenExpiresAt = 0;
  }
  writePersistedAuthValue(GOOGLE_ACCESS_TOKEN_STORAGE_KEY, token || '');
  writePersistedAuthValue(
    GOOGLE_ACCESS_TOKEN_EXPIRES_KEY,
    googleAccessTokenExpiresAt ? String(googleAccessTokenExpiresAt) : ''
  );
}

function clearGoogleAccessToken() {
  setGoogleAccessToken('');
}

function clearAllGoogleAuthTokens() {
  clearGoogleIdToken();
  clearGoogleAccessToken();
}

/**
 * @returns {boolean}
 */
function hasValidGoogleIdToken() {
  return !!getGoogleIdToken();
}

/**
 * IDトークンまたは access token のいずれかがあれば認証済みとみなす
 * @returns {boolean}
 */
function hasValidGoogleAuthToken() {
  return !!getGoogleIdToken() || !!getGoogleAccessToken();
}

/**
 * トークン残存が短い（または無い）か
 * @returns {boolean}
 */
function isGoogleAuthTokenNearExpiry() {
  var idTok = getGoogleIdToken();
  if (idTok) {
    var payload = parseJwtPayload(idTok);
    if (payload && payload.exp != null) {
      var remainMs = (Number(payload.exp) * 1000) - Date.now();
      if (remainMs > AUTH_REFRESH_MARGIN_MS) {
        return false;
      }
    }
  }
  if (googleAccessTokenExpiresAt && (googleAccessTokenExpiresAt - Date.now()) > AUTH_REFRESH_MARGIN_MS) {
    return false;
  }
  if (hasValidGoogleAuthToken() && !idTok && !googleAccessTokenExpiresAt) {
    return false;
  }
  return true;
}

/**
 * ネット取得前にトークンを静かに更新する。失敗しても残存トークンがあれば続行
 * @param {function(): void} onDone
 * @param {function(): void} [onFail]
 */
function ensureFreshGoogleAuthToken(onDone, onFail) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  var fail = typeof onFail === 'function' ? onFail : done;
  if (getAppSessionToken()) {
    done();
    return;
  }
  if (hasValidGoogleAuthToken() && !isGoogleAuthTokenNearExpiry()) {
    done();
    return;
  }
  whenGoogleIdentityReady(function() {
    if (!google.accounts || !google.accounts.oauth2 ||
        typeof google.accounts.oauth2.initTokenClient !== 'function') {
      if (hasValidGoogleAuthToken()) {
        done();
      } else {
        fail();
      }
      return;
    }
    var settled = false;
    try {
      var tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: 'openid email profile',
        callback: function(tokenResponse) {
          if (settled) {
            return;
          }
          settled = true;
          if (!tokenResponse || tokenResponse.error || !tokenResponse.access_token) {
            if (hasValidGoogleAuthToken()) {
              done();
            } else {
              fail();
            }
            return;
          }
          clearGoogleIdToken();
          setGoogleAccessToken(tokenResponse.access_token, tokenResponse.expires_in);
          done();
        },
        error_callback: function() {
          if (settled) {
            return;
          }
          settled = true;
          if (hasValidGoogleAuthToken()) {
            done();
          } else {
            fail();
          }
        }
      });
      var req = { prompt: 'none' };
      var hint = getStoredUserEmailForLoginHint();
      if (hint) {
        req.hint = hint;
      }
      tokenClient.requestAccessToken(req);
      setTimeout(function() {
        if (settled) {
          return;
        }
        settled = true;
        if (hasValidGoogleAuthToken()) {
          done();
        } else {
          fail();
        }
      }, 8000);
    } catch (e) {
      if (hasValidGoogleAuthToken()) {
        done();
      } else {
        fail();
      }
    }
  }, function() {
    if (hasValidGoogleAuthToken()) {
      done();
    } else {
      fail();
    }
  });
}

/**
 * IDトークンの期限切れか（クライアント側の目安。正式検証はGAS）
 * @param {string} token
 * @returns {boolean}
 */
function isGoogleIdTokenExpired(token) {
  var payload = parseJwtPayload(token);
  if (!payload || payload.exp == null) {
    return true;
  }
  var nowSec = Math.floor(Date.now() / 1000);
  // 60秒の余裕を見て期限切れ扱い
  return Number(payload.exp) <= (nowSec + 60);
}

/**
 * JWT のペイロードをデコード（署名検証なし。表示・期限確認用）
 * @param {string} token
 * @returns {Object|null}
 */
function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }
  var parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    var b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) {
      b64 += '=';
    }
    var json = decodeURIComponent(atob(b64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

/**
 * Google Identity Services の読み込み待ち
 * @param {Function} onReady
 * @param {Function} [onFail]
 */
function whenGoogleIdentityReady(onReady, onFail) {
  function isReady() {
    return !!(window.google && google.accounts && google.accounts.id &&
      google.accounts.oauth2);
  }
  if (isReady()) {
    onReady();
    return;
  }
  var tries = 0;
  var timer = setInterval(function() {
    tries++;
    if (isReady()) {
      clearInterval(timer);
      onReady();
    } else if (tries >= 100) {
      clearInterval(timer);
      if (typeof onFail === 'function') {
        onFail();
      }
    }
  }, 50);
}

/**
 * 自動選択用：前回ログイン email（login_hint）
 * @returns {string}
 */
function getStoredUserEmailForLoginHint() {
  var email = userEmail || '';
  if (!email) {
    try {
      email = localStorage.getItem('userEmail') || '';
    } catch (e) {
      email = '';
    }
  }
  return String(email || '').trim();
}

/**
 * GIS 初期化
 * @param {Function} [onReady]
 * @param {{ autoSelect?: boolean, loginHint?: string }} [initOptions]
 */
function ensureGoogleSignInInitialized(onReady, initOptions) {
  initOptions = initOptions || {};
  var wantAutoSelect = !!initOptions.autoSelect;
  var loginHint = initOptions.loginHint != null
    ? String(initOptions.loginHint).trim()
    : '';
  whenGoogleIdentityReady(function() {
    var needInit = !googleSignInInitialized ||
      wantAutoSelect !== googleSignInAutoSelectEnabled ||
      loginHint !== googleSignInLoginHint;
    if (needInit) {
      var config = {
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        callback: handleGoogleCredentialResponse,
        auto_select: wantAutoSelect,
        cancel_on_tap_outside: true
      };
      // 複数アカウント時に前回ユーザーを優先させる
      if (loginHint) {
        config.login_hint = loginHint;
      }
      google.accounts.id.initialize(config);
      googleSignInInitialized = true;
      googleSignInAutoSelectEnabled = wantAutoSelect;
      googleSignInLoginHint = loginHint;
    }
    if (typeof onReady === 'function') {
      onReady();
    }
  }, function() {
    setGoogleLoginError('Googleログインの読み込みに失敗しました。通信環境を確認して再読み込みしてください。');
  });
}

/**
 * 起動時：保存トークンが無い／切れているときの再開
 * デスクトップは One Tap、スマホは画面なしの TokenClient（prompt=none）
 * @param {Function} [onNeedManualLogin]
 */
function tryGoogleResumeSignIn(onNeedManualLogin) {
  if (isLikelyMobileClient()) {
    tryGoogleSilentAccessToken(onNeedManualLogin);
    return;
  }
  tryGoogleAutoSignIn(onNeedManualLogin);
}

/**
 * スマホ：One Tap を出さず、同意済みなら access token を静かに取得
 * @param {Function} [onNeedManualLogin]
 */
function tryGoogleSilentAccessToken(onNeedManualLogin) {
  var settled = false;
  function needManualLogin() {
    if (settled || hasValidGoogleAuthToken()) {
      return;
    }
    settled = true;
    hidePageLoading();
    if (typeof onNeedManualLogin === 'function') {
      onNeedManualLogin();
    }
  }

  whenGoogleIdentityReady(function() {
    if (!google.accounts || !google.accounts.oauth2 ||
        typeof google.accounts.oauth2.initTokenClient !== 'function') {
      needManualLogin();
      return;
    }
    try {
      var tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: 'openid email profile',
        callback: function(tokenResponse) {
          if (settled) {
            return;
          }
          if (!tokenResponse || tokenResponse.error || !tokenResponse.access_token) {
            needManualLogin();
            return;
          }
          settled = true;
          handleGoogleTokenClientResponse(tokenResponse);
        },
        error_callback: function() {
          needManualLogin();
        }
      });
      var req = { prompt: 'none' };
      var hint = getStoredUserEmailForLoginHint();
      if (hint) {
        req.hint = hint;
      }
      tokenClient.requestAccessToken(req);
      setTimeout(needManualLogin, 8000);
    } catch (e) {
      needManualLogin();
    }
  }, function() {
    needManualLogin();
  });
}

/**
 * 起動時など：Google の自動選択／One Tap を試す
 * 成功時は handleGoogleCredentialResponse が呼ばれる。
 * 表示できない／スキップ／閉じられた場合は onNeedManualLogin を呼ぶ。
 * @param {Function} [onNeedManualLogin]
 */
function tryGoogleAutoSignIn(onNeedManualLogin) {
  var settled = false;
  function needManualLogin() {
    if (settled || hasValidGoogleIdToken()) {
      return;
    }
    settled = true;
    if (typeof onNeedManualLogin === 'function') {
      onNeedManualLogin();
    }
  }

  hidePageLoading();
  var hintEmail = getStoredUserEmailForLoginHint();
  ensureGoogleSignInInitialized(function() {
    try {
      google.accounts.id.prompt(function(notification) {
        if (hasValidGoogleIdToken()) {
          settled = true;
          return;
        }
        if (!notification) {
          needManualLogin();
          return;
        }
        var notDisplayed = typeof notification.isNotDisplayed === 'function' && notification.isNotDisplayed();
        var skipped = typeof notification.isSkippedMoment === 'function' && notification.isSkippedMoment();
        var dismissed = typeof notification.isDismissedMoment === 'function' && notification.isDismissedMoment();
        if (notDisplayed || skipped || dismissed) {
          needManualLogin();
        }
      });
    } catch (e) {
      needManualLogin();
    }
  }, { autoSelect: true, loginHint: hintEmail });
}

/**
 * アカウント切替・未許可後など、自動選択を止める
 */
function disableGoogleAutoSelect() {
  try {
    if (window.google && google.accounts && google.accounts.id &&
        typeof google.accounts.id.disableAutoSelect === 'function') {
      google.accounts.id.disableAutoSelect();
    }
  } catch (e) {
    // ignore
  }
  googleSignInAutoSelectEnabled = false;
  googleSignInLoginHint = '';
}

/**
 * Googleログイン成功コールバック（GIS credential / IDトークン）
 * @param {Object} response
 */
function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    setGoogleLoginError('ログインに失敗しました。もう一度お試しください。');
    showGoogleLoginDialog({ cancellable: true });
    return;
  }
  var payload = parseJwtPayload(response.credential);
  var email = payload && payload.email ? String(payload.email).trim() : '';
  if (!email) {
    setGoogleLoginError('メールアドレスを取得できませんでした。');
    showGoogleLoginDialog({ cancellable: true });
    return;
  }
  clearGoogleAccessToken();
  setGoogleIdToken(response.credential);
  completeGoogleLoginWithEmail(email);
}

/**
 * 進行中の One Tap / prompt をキャンセル
 */
function cancelGoogleIdentityPrompt() {
  try {
    if (window.google && google.accounts && google.accounts.id &&
        typeof google.accounts.id.cancel === 'function') {
      google.accounts.id.cancel();
    }
  } catch (e) {
    // ignore
  }
}

/**
 * 自前ボタン：OAuth access token ログイン（Brave Android 等向け）
 */
function startGoogleOAuthTokenLogin() {
  setGoogleLoginError('');
  whenGoogleIdentityReady(function() {
    if (!google.accounts || !google.accounts.oauth2 ||
        typeof google.accounts.oauth2.initTokenClient !== 'function') {
      setGoogleLoginError('Googleログインを開始できませんでした。ページを再読み込みしてください。');
      return;
    }
    try {
      var tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: 'openid email profile',
        callback: handleGoogleTokenClientResponse,
        error_callback: function() {
          setGoogleLoginError('ログインがキャンセルされたか、失敗しました。もう一度お試しください。');
        }
      });
      var req = {};
      if (googleLoginForceAccountSelect) {
        // ヘッダー「ログイン」：アカウント選択を必ず出す
        req.prompt = 'select_account';
      } else {
        // 起動時など：前回ユーザー継続を優先
        req.prompt = '';
        var hint = getStoredUserEmailForLoginHint();
        if (hint) {
          req.hint = hint;
        }
      }
      tokenClient.requestAccessToken(req);
    } catch (e) {
      setGoogleLoginError('Googleログインの起動に失敗しました: ' + e.toString());
    }
  }, function() {
    setGoogleLoginError('Googleログインの読み込みに失敗しました。通信環境を確認して再読み込みしてください。');
  });
}

/**
 * oauth2 TokenClient 成功時
 * @param {Object} tokenResponse
 */
function handleGoogleTokenClientResponse(tokenResponse) {
  if (!tokenResponse || tokenResponse.error || !tokenResponse.access_token) {
    setGoogleLoginError('ログインに失敗しました。もう一度お試しください。');
    return;
  }
  var accessToken = tokenResponse.access_token;
  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + accessToken }
  })
  .then(function(response) {
    if (!response.ok) {
      throw new Error('profile ' + response.status);
    }
    return response.json();
  })
  .then(function(profile) {
    var email = profile && profile.email ? String(profile.email).trim() : '';
    if (!email) {
      setGoogleLoginError('メールアドレスを取得できませんでした。');
      return;
    }
    clearGoogleIdToken();
    setGoogleAccessToken(accessToken, tokenResponse.expires_in);
    completeGoogleLoginWithEmail(email);
  })
  .catch(function(error) {
    setGoogleLoginError('ユーザー情報の取得に失敗しました。もう一度お試しください。');
    console.warn(error);
  });
}

/**
 * ログイン成功後の共通処理
 * @param {string} email
 */
function completeGoogleLoginWithEmail(email) {
  userEmail = email;
  try {
    localStorage.setItem('userEmail', userEmail);
  } catch (e) {
    // ignore
  }
  userSettingsInitialSyncDone = false;
  clearAppSessionToken();
  clearErrorMessages();
  clearAppSessionDataAfterAuthFailure();
  syncDailyStudyStatsDisplay();
  hideGoogleLoginDialog();
  startAuthenticatedBoot();
}

/**
 * Googleログイン画面を表示
 * @param {{ cancellable?: boolean, skipAutoPrompt?: boolean, forceAccountSelect?: boolean }} [options]
 */
function showGoogleLoginDialog(options) {
  options = options || {};
  googleLoginDialogCancellable = options.cancellable !== false;
  googleLoginForceAccountSelect = !!options.forceAccountSelect;

  var overlay = document.getElementById('googleLoginOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }
  var cancelBtn = document.getElementById('googleLoginCancelButton');
  if (cancelBtn) {
    cancelBtn.style.display = googleLoginDialogCancellable ? 'inline-block' : 'none';
  }
  setGoogleLoginError('');
  hidePageLoading();
  cancelGoogleIdentityPrompt();

  // Brave等で GIS iframe ボタンが死ぬため、自前ボタンを主にする
  var appBtn = document.getElementById('googleSignInAppButton');
  if (appBtn) {
    appBtn.style.display = 'inline-flex';
  }
  var btnHost = document.getElementById('googleSignInButton');
  if (btnHost) {
    btnHost.innerHTML = '';
    btnHost.style.display = 'none';
  }

  whenGoogleIdentityReady(function() {
    // TokenClient 用にライブラリ準備完了を待つだけ
  }, function() {
    setGoogleLoginError('Googleログインの読み込みに失敗しました。通信環境を確認して再読み込みしてください。');
  });
}

/**
 * Googleログイン画面を非表示
 */
function hideGoogleLoginDialog() {
  var overlay = document.getElementById('googleLoginOverlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
  googleLoginDialogCancellable = false;
  googleLoginForceAccountSelect = false;
}

/**
 * キャンセル可能なログイン画面を閉じる
 * 未ログインのまま閉じた場合は TOP を操作不可状態にする
 */
function cancelGoogleLoginDialogIfAllowed() {
  if (!googleLoginDialogCancellable) {
    return;
  }
  hideGoogleLoginDialog();
  setGoogleLoginError('');
  if (!hasUsableAuth()) {
    clearAppSessionDataAfterAuthFailure();
    hidePageLoading();
  }
}

/**
 * @param {string} message
 */
function setGoogleLoginError(message) {
  var el = document.getElementById('googleLoginError');
  if (!el) {
    return;
  }
  if (message) {
    el.textContent = message;
    el.style.display = 'block';
  } else {
    el.textContent = '';
    el.style.display = 'none';
  }
}

// 互換：旧名から新ログインへ
function showEmailInputDialog() {
  showGoogleLoginDialog();
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

/**
 * 端末全問からカテゴリ一覧と今日の A/B を作る
 * @param {Array} items
 * @param {string} todayYmd
 * @returns {{categories: Array, today_ymd: string, today_item_count: number, today_ans_count: number}}
 */
function buildCategoriesAndTodayStatsFromItems(items, todayYmd) {
  var today = todayYmd || getTodayYmdLocal();
  var categoryMap = {};
  var categoriesList = [];
  var todayItemCount = 0;
  var todayAnsCount = 0;
  (items || []).forEach(function(item) {
    if (!item) return;
    var categoryNo = item.category_no != null ? String(item.category_no) : '';
    var categoryName = item.category != null ? String(item.category) : categoryNo;
    if (!categoryNo) return;
    var retryNum = Number(item.retry_count);
    var totalNum = Number(item.total_study_count);
    var dailyNum = Number(item.daily_study_count);
    if (isNaN(retryNum) || retryNum < 0) retryNum = 0;
    if (isNaN(totalNum) || totalNum < 0) totalNum = 0;
    if (isNaN(dailyNum) || dailyNum < 0) dailyNum = 0;
    var lastDateYmd = item.last_date ? String(item.last_date) : '';
    if (lastDateYmd && lastDateYmd.substring(0, 10) === today) {
      todayItemCount += 1;
      todayAnsCount += (dailyNum < 1) ? 1 : dailyNum;
    }
    if (!categoryMap[categoryNo]) {
      categoryMap[categoryNo] = {
        name: categoryName,
        count: 0,
        hasEmptyLastDate: false,
        latestLastDate: '',
        maxRetryCount: retryNum,
        minTotalStudyCount: totalNum
      };
      categoriesList.push({ no: categoryNo });
    } else {
      if (!categoryMap[categoryNo].name && categoryName) {
        categoryMap[categoryNo].name = categoryName;
      }
      if (retryNum > categoryMap[categoryNo].maxRetryCount) {
        categoryMap[categoryNo].maxRetryCount = retryNum;
      }
      if (totalNum < categoryMap[categoryNo].minTotalStudyCount) {
        categoryMap[categoryNo].minTotalStudyCount = totalNum;
      }
    }
    categoryMap[categoryNo].count += 1;
    if (!lastDateYmd) {
      categoryMap[categoryNo].hasEmptyLastDate = true;
    } else if (!categoryMap[categoryNo].hasEmptyLastDate) {
      if (!categoryMap[categoryNo].latestLastDate || lastDateYmd > categoryMap[categoryNo].latestLastDate) {
        categoryMap[categoryNo].latestLastDate = lastDateYmd;
      }
    }
  });
  var out = [];
  for (var i = 0; i < categoriesList.length; i++) {
    var no = categoriesList[i].no;
    var info = categoryMap[no];
    out.push({
      no: no,
      name: info.name,
      count: info.count,
      last_date: info.hasEmptyLastDate ? '' : (info.latestLastDate || ''),
      max_retry_count: info.maxRetryCount,
      min_total_study_count: info.minTotalStudyCount
    });
  }
  return {
    categories: out,
    today_ymd: today,
    today_item_count: todayItemCount,
    today_ans_count: todayAnsCount
  };
}

function getMemoryAllStudyItems() {
  if (memoryAllStudyItems && memoryAllStudyItems.length) {
    return memoryAllStudyItems;
  }
  var bundle = readLocalStudyBundle();
  memoryAllStudyItems = (bundle && bundle.items) ? bundle.items : [];
  return memoryAllStudyItems;
}

function setMemoryAllStudyItems(items) {
  memoryAllStudyItems = items || [];
}

function getItemsForCategoryFromLocal(categoryNo) {
  var key = String(categoryNo);
  return getMemoryAllStudyItems().filter(function(it) {
    return it && String(it.category_no) === key;
  });
}

function rebuildCategoryDataByNoFromItems(items) {
  categoryDataByNo = {};
  (items || []).forEach(function(it) {
    if (!it || it.category_no == null || it.category_no === '') return;
    var key = String(it.category_no);
    if (!categoryDataByNo[key]) {
      categoryDataByNo[key] = [];
    }
    categoryDataByNo[key].push(it);
  });
}

function recountTodayStudyStatsFromLocalItems() {
  var built = buildCategoriesAndTodayStatsFromItems(getMemoryAllStudyItems(), getTodayYmdLocal());
  applyTodayStudiedItemCount(built.today_item_count, built.today_ymd);
  applyTodayStudiedAnsCount(built.today_ans_count, built.today_ymd);
}

/**
 * 端末全問を画面へ反映（カテゴリ一覧・今日件数・List）
 * @param {Array} items
 * @param {{preserveValue?: string, skipLearningArrays?: boolean, isBoot?: boolean}} [options]
 */
function applyStudyItemsToApp(items, options) {
  options = options || {};
  var skipLearningArrays = !!options.skipLearningArrays;
  setMemoryAllStudyItems(items || []);
  rebuildCategoryDataByNoFromItems(items || []);
  var built = buildCategoriesAndTodayStatsFromItems(items || [], getTodayYmdLocal());
  categories = built.categories;
  applyTodayStudiedItemCount(built.today_item_count, built.today_ymd);
  applyTodayStudiedAnsCount(built.today_ans_count, built.today_ymd);
  reconcileVisibleCategorySetting();

  var select = document.getElementById('categorySelect');
  var preserveValue = options.preserveValue != null && options.preserveValue !== ''
    ? String(options.preserveValue)
    : ((select && select.value) || (currentCategoryNo != null ? String(currentCategoryNo) : ''));
  if (select) {
    var valueToRestore = preserveValue || '';
    if (valueToRestore && !isCategoryNoVisible(valueToRestore)) {
      valueToRestore = '';
      if (!skipLearningArrays && !isDurationQuestionMethod() && !isLastDateQuestionMethod()) {
        currentCategoryNo = null;
        currentCategoryData = [];
        selectedQuestionIndices = [];
        resetListDisplay();
      }
    }
    select.disabled = false;
    populateCategorySelectOptions(select, valueToRestore);
  }
  var learningSelectContainer = document.getElementById('learningCategorySelectContainer');
  if (learningSelectContainer && learningSelectContainer.style.display !== 'none' && isLearningCompleted) {
    var learningSelectEl = document.getElementById('learningCategorySelect');
    var learningValueToRestore = '';
    if (learningSelectEl && learningSelectEl.value) {
      learningValueToRestore = String(learningSelectEl.value);
    } else if (currentCategoryNo != null && currentCategoryNo !== '') {
      learningValueToRestore = String(currentCategoryNo);
    }
    if (learningValueToRestore && !isCategoryNoVisible(learningValueToRestore)) {
      learningValueToRestore = (currentCategoryNo != null && isCategoryNoVisible(currentCategoryNo))
        ? String(currentCategoryNo)
        : '';
    }
    populateCategorySelectOptions(learningSelectEl, learningValueToRestore);
  }

  if (!skipLearningArrays) {
    if (isDurationQuestionMethod()) {
      applyQuestionMethodModeUi();
      durationModeSortedItems = filterItemsByVisibleCategories((items || []).slice());
      sortItemsForDurationMode(durationModeSortedItems);
      if (!isActiveLearningSession()) {
        durationModePageIndex = 0;
        applyDurationModePageToList();
      }
    } else if (isLastDateQuestionMethod()) {
      applyQuestionMethodModeUi();
      lastDateModeAllItems = filterItemsByVisibleCategories((items || []).slice());
      sortItemsForLastDatePriorityMode(lastDateModeAllItems);
      if (!isActiveLearningSession()) {
        regenerateLastDateModeList();
      }
    } else if (currentCategoryNo != null && currentCategoryNo !== '') {
      var catItems = getItemsForCategoryFromLocal(currentCategoryNo);
      if (isCategoryShuffleQuestionMethod() && currentCategoryData.length > 0) {
        currentCategoryData = mergeCategoryItemsPreserveOrder(currentCategoryData, catItems);
        displayList();
        syncCategoryLastDateFromList();
        updateListNavButtons();
        updateStartButtonEnabled();
      } else {
        applyLoadedCategoryData(currentCategoryNo, catItems);
      }
    }
  } else if (isLearningCompleted && currentCategoryNo != null && currentCategoryNo !== '') {
    var listItems = getItemsForCategoryFromLocal(currentCategoryNo);
    currentCategoryData = mergeCategoryItemsPreserveOrder(currentCategoryData, listItems);
    displayList();
    syncCategoryLastDateFromList();
  }

  hideCategoryLoadingSpinner();
  updateListNavButtons();
  if (isLearningCompleted) {
    if (isCompletionStudyFieldsCollapsed) {
      maintainCompletionScrollAtTop();
    } else {
      maintainCompletionScrollAtBottom();
    }
  }
  syncDailyStudyStatsDisplay();
}

/**
 * 裏で世代だけ確認し、違えば全問1本で差し替える
 * @param {{preserveValue?: string, source?: string}} [options]
 */
function maybeRefreshStudyItemsFromGeneration(options) {
  options = options || {};
  if (dataGenerationCheckInFlight) {
    return;
  }
  dataGenerationCheckInFlight = true;
  fetchDataGeneration(function(err, gen) {
    dataGenerationCheckInFlight = false;
    if (err) {
      if (isGoogleAuthFailureMessage(String(err.message || err))) {
        showError(String(err.message || err));
      }
      return;
    }
    var local = readLocalStudyBundle();
    if (hasCompleteLocalStudyData(local) && Number(local.dataGeneration) === Number(gen)) {
      return;
    }
    fetchAllStudyItemsFromServer(function(fetchErr, items, meta) {
      if (fetchErr) {
        if (isGoogleAuthFailureMessage(String(fetchErr.message || fetchErr))) {
          showError(String(fetchErr.message || fetchErr));
        }
        return;
      }
      var nextGen = (meta && meta.dataGeneration != null) ? meta.dataGeneration : gen;
      writeLocalStudyBundle(items || [], nextGen);
      applyStudyItemsToApp(items || [], {
        preserveValue: options.preserveValue,
        skipLearningArrays: isActiveLearningSession()
      });
    });
  });
}

function fetchDataGeneration(onDone) {
  var params = new URLSearchParams();
  params.append('action', 'getDataGeneration');
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params)
    .then(function(data) {
      if (!data || !data.success) {
        throw new Error((data && data.error) || '世代の取得に失敗しました');
      }
      if (typeof onDone === 'function') {
        onDone(null, data.dataGeneration);
      }
    })
    .catch(function(error) {
      if (typeof onDone === 'function') {
        onDone(error, null);
      }
    });
}

// カテゴリ一覧を読み込む（端末全問から。通信は世代確認のみ）
// options.preserveValue: 再取得後に選択を復元する値
// options.quiet: 読み込み中表示を出さず、裏で更新する（HOME復帰時など）
function loadCategories(options) {
  options = options || {};
  var preserveValue = options.preserveValue != null && options.preserveValue !== ''
    ? String(options.preserveValue)
    : null;
  if (!userEmail) {
    try {
      userEmail = localStorage.getItem('userEmail');
    } catch (e) {
      userEmail = userEmail || null;
    }
  }
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  var items = getMemoryAllStudyItems();
  if (items.length) {
    applyStudyItemsToApp(items, {
      preserveValue: preserveValue,
      skipLearningArrays: isActiveLearningSession() || !!options.quiet
    });
    hideCategoryLoadingSpinner();
    if (!options.quiet && hasUsableAuth() && !isPageLoadingVisible()) {
      setAppAuthUiLocked(false);
    }
  }
  maybeRefreshStudyItemsFromGeneration({
    preserveValue: preserveValue,
    source: options.quiet ? 'home' : 'loadCategories'
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
 * 表示カテゴリ設定の localStorage キー（メール単位）
 * @returns {string}
 */
function getVisibleCategoriesStorageKey() {
  var email = userEmail || '';
  try {
    if (!email) {
      email = localStorage.getItem('userEmail') || '';
    }
  } catch (e) {
    email = '';
  }
  return 'visibleCategoryNos:' + String(email);
}

/**
 * 保存済みの表示カテゴリ番号配列を取得
 * @returns {string[]|null} 未設定時は null
 */
function getSavedVisibleCategoryNos() {
  try {
    var raw = localStorage.getItem(getVisibleCategoriesStorageKey());
    if (raw == null || raw === '') {
      return null;
    }
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.map(function(no) {
      return String(no);
    });
  } catch (e) {
    return null;
  }
}

/**
 * 表示カテゴリ設定を保存
 * @param {string[]} nos
 */
function saveVisibleCategoryNos(nos) {
  try {
    localStorage.setItem(
      getVisibleCategoriesStorageKey(),
      JSON.stringify((nos || []).map(function(no) {
        return String(no);
      }))
    );
    scheduleUserSettingsSync();
  } catch (e) {
    console.warn('表示カテゴリ設定の保存に失敗しました。');
  }
}

/**
 * 表示カテゴリ設定を削除（未設定＝全表示）
 */
function clearVisibleCategorySetting() {
  try {
    localStorage.removeItem(getVisibleCategoriesStorageKey());
    scheduleUserSettingsSync();
  } catch (e) {
    // ignore
  }
}

/**
 * Category_No でカテゴリを探す
 * @param {string|number} no
 * @returns {Object|null}
 */
function findCategoryByNo(no) {
  if (no == null || no === '' || !categories || !categories.length) {
    return null;
  }
  var key = String(no);
  for (var i = 0; i < categories.length; i++) {
    if (String(categories[i].no) === key) {
      return categories[i];
    }
  }
  return null;
}

/**
 * END 以外の設定対象カテゴリ（シート順＝Category_No 昇順）
 * @returns {Object[]}
 */
function getConfigurableCategories() {
  var list = (categories || []).filter(function(cat) {
    return cat && !isEndCategory(cat);
  });
  list.sort(function(a, b) {
    return getCategoryNoSortValue(a.no) - getCategoryNoSortValue(b.no);
  });
  return list;
}

/**
 * カテゴリ番号が表示対象か（END は常に false。未設定時は END 以外すべて true）
 * @param {string|number} no
 * @returns {boolean}
 */
function isCategoryNoVisible(no) {
  if (no == null || no === '') {
    return false;
  }
  var cat = findCategoryByNo(no);
  if (cat && isEndCategory(cat)) {
    return false;
  }
  var saved = getSavedVisibleCategoryNos();
  if (saved === null) {
    // 未設定：END 以外は表示。カテゴリ一覧に無い番号は表示扱い（横断データの欠落対策）
    return !(cat && isEndCategory(cat));
  }
  return saved.indexOf(String(no)) >= 0;
}

/**
 * ドロップダウン／ナビ用の表示カテゴリ一覧
 * @returns {Object[]}
 */
function getVisibleCategories() {
  return getConfigurableCategories().filter(function(cat) {
    return isCategoryNoVisible(cat.no);
  });
}

/**
 * 選択可能なカテゴリか（表示対象かつ END でない）
 * @param {Object} cat
 * @returns {boolean}
 */
function isCategorySelectable(cat) {
  return !!(cat && !isEndCategory(cat) && isCategoryNoVisible(cat.no));
}

/**
 * 保存済み設定を現行カテゴリ一覧と突合。有効 0 件なら未設定に戻す
 * @returns {boolean} 未設定へリセットした場合 true
 */
function reconcileVisibleCategorySetting() {
  var saved = getSavedVisibleCategoryNos();
  if (saved === null) {
    return false;
  }
  var configurable = getConfigurableCategories();
  var validSet = {};
  configurable.forEach(function(cat) {
    validSet[String(cat.no)] = true;
  });
  var valid = saved.filter(function(no) {
    return !!validSet[String(no)];
  });
  if (valid.length === 0) {
    clearVisibleCategorySetting();
    showError('表示できるカテゴリがありません。設定をリセットしました。');
    return true;
  }
  if (valid.length !== saved.length) {
    saveVisibleCategoryNos(valid);
  }
  return false;
}

/**
 * 横断モード用：表示カテゴリに属する問題だけ残す
 * @param {Array} items
 * @returns {Array}
 */
function filterItemsByVisibleCategories(items) {
  return (items || []).filter(function(it) {
    return it && isCategoryNoVisible(it.category_no);
  });
}

/**
 * HOME（初期画面）表示中か
 * @returns {boolean}
 */
function isHomeScreenActive() {
  var screen1 = document.getElementById('screen1');
  return !!(screen1 && screen1.classList.contains('active'));
}

/**
 * 表示カテゴリ設定パネルを破棄して閉じる
 */
function closeVisibleCategoriesSubmenu() {
  var submenu = document.getElementById('visibleCategoriesSubmenu');
  var parentButton = document.getElementById('visibleCategoriesButton');
  if (submenu) {
    submenu.classList.remove('active');
  }
  if (parentButton) {
    parentButton.classList.remove('active');
  }
  hideVisibleCategoriesError();
}

/**
 * 表示カテゴリエラー文言を隠す
 */
function hideVisibleCategoriesError() {
  var el = document.getElementById('visibleCategoriesError');
  if (el) {
    el.style.display = 'none';
    el.textContent = '';
  }
}

/**
 * 表示カテゴリエラー文言を表示
 * @param {string} message
 */
function showVisibleCategoriesError(message) {
  var el = document.getElementById('visibleCategoriesError');
  if (el) {
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
  }
}

/**
 * チェックリストを現在の保存状態（未設定＝全ON）で描画
 */
function renderVisibleCategoriesChecklist() {
  var container = document.getElementById('visibleCategoriesChecklist');
  if (!container) {
    return;
  }
  hideVisibleCategoriesError();
  container.innerHTML = '';
  var list = getConfigurableCategories();
  if (list.length === 0) {
    container.innerHTML = '<div class="visible-categories-check-item">カテゴリがありません</div>';
    updateVisibleCategoriesCount();
    return;
  }
  list.forEach(function(cat) {
    var label = document.createElement('label');
    label.className = 'visible-categories-check-item';
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.value = String(cat.no);
    input.checked = isCategoryNoVisible(cat.no);
    input.addEventListener('change', function() {
      updateVisibleCategoriesCount();
    });
    var text = document.createElement('span');
    text.textContent = formatCategoryOptionText(cat);
    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  });
  updateVisibleCategoriesCount();
}

/**
 * 表示カテゴリの選択件数（選択 / 全件）を更新
 */
function updateVisibleCategoriesCount() {
  var countEl = document.getElementById('visibleCategoriesCount');
  var container = document.getElementById('visibleCategoriesChecklist');
  if (!countEl) {
    return;
  }
  if (!container) {
    countEl.textContent = '0 / 0';
    return;
  }
  var inputs = container.querySelectorAll('input[type="checkbox"]');
  var total = inputs.length;
  var selected = 0;
  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].checked) {
      selected++;
    }
  }
  countEl.textContent = selected + ' / ' + total;
}

/**
 * チェックリストから選択中番号を取得
 * @returns {string[]}
 */
function getCheckedVisibleCategoryNosFromUi() {
  var container = document.getElementById('visibleCategoriesChecklist');
  if (!container) {
    return [];
  }
  var nos = [];
  var inputs = container.querySelectorAll('input[type="checkbox"]');
  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].checked) {
      nos.push(String(inputs[i].value));
    }
  }
  return nos;
}

/**
 * チェックリストの全選択／全解除
 * @param {boolean} checked
 */
function setAllVisibleCategoryChecks(checked) {
  var container = document.getElementById('visibleCategoriesChecklist');
  if (!container) {
    return;
  }
  hideVisibleCategoriesError();
  var inputs = container.querySelectorAll('input[type="checkbox"]');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].checked = !!checked;
  }
  updateVisibleCategoriesCount();
}

/**
 * 表示カテゴリサブメニューをトグル（HOME 時のみ）
 */
function toggleVisibleCategoriesSubmenu() {
  if (!isHomeScreenActive()) {
    return;
  }
  var submenu = document.getElementById('visibleCategoriesSubmenu');
  var parentButton = document.getElementById('visibleCategoriesButton');
  if (!submenu || !parentButton) {
    return;
  }
  var isActive = submenu.classList.contains('active');
  if (isActive) {
    closeVisibleCategoriesSubmenu();
  } else {
    renderVisibleCategoriesChecklist();
    submenu.classList.add('active');
    parentButton.classList.add('active');
  }
}

/**
 * 表示カテゴリ設定の保存を反映（TOP UI・横断モード）
 */
function applyVisibleCategoriesChange() {
  reconcileVisibleCategorySetting();
  
  var select = document.getElementById('categorySelect');
  var previousValue = select ? select.value : '';
  var stillVisible = previousValue && isCategoryNoVisible(previousValue);
  
  if (select) {
    populateCategorySelectOptions(select, stillVisible ? previousValue : '');
  }
  
  if (previousValue && !stillVisible) {
    currentCategoryNo = null;
    currentCategoryData = [];
    selectedQuestionIndices = [];
    originalCategoryData = [];
    hideCategoryLoadingSpinner();
    if (!isDurationQuestionMethod() && !isLastDateQuestionMethod()) {
      resetListDisplay();
    }
  }
  
  if (isDurationQuestionMethod()) {
    loadDurationModeData({ resetPage: true, resort: true, forceFetch: true, pageLoading: true });
  } else if (isLastDateQuestionMethod()) {
    loadLastDateModeData({ regenerate: true, forceFetch: true, pageLoading: true });
  } else {
    updateListNavButtons();
  }
  syncDailyStudyStatsDisplay();
}

/**
 * 表示カテゴリ設定を保存ボタン処理
 */
function saveVisibleCategoriesFromUi() {
  var nos = getCheckedVisibleCategoryNosFromUi();
  if (nos.length === 0) {
    showVisibleCategoriesError('一つ以上選択してください。');
    return;
  }
  saveVisibleCategoryNos(nos);
  hideVisibleCategoriesError();
  applyVisibleCategoriesChange();
  closeVisibleCategoriesSubmenu();
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
    if (isCategorySelectable(categories[i])) {
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
  getVisibleCategories().forEach(function(cat) {
    var option = document.createElement('option');
    option.value = cat.no;
    option.textContent = formatCategoryOptionText(cat);
    select.appendChild(option);
  });
  
  if (selectedValue != null && selectedValue !== '' && isCategoryNoVisible(selectedValue)) {
    select.value = String(selectedValue);
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
  setListNavContainerVisible('screen2ListNavContainer', false);
  // 完了UIを閉じるときは領域も解放（高さ予約を残さない）
  var screen2Nav = document.getElementById('screen2ListNavContainer');
  if (screen2Nav) {
    screen2Nav.style.display = 'none';
  }
  var learningListPrevButton = document.getElementById('learningListPrevButton');
  var learningListNextButton = document.getElementById('learningListNextButton');
  if (learningListPrevButton) {
    learningListPrevButton.disabled = true;
  }
  if (learningListNextButton) {
    learningListNextButton.disabled = true;
  }
  updateCategoryNavIndicatorElement(document.getElementById('learningCategoryNavInfo'), null);
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
    if (this.disabled) return;
    playStartSfxThen(startLearning);
  });
  
  // ナビゲーションバー中央ボタン（Ans / Next）
  document.getElementById('navAnswerButton').addEventListener('click', function() {
    handleNavAnswerButtonClick();
  });
  
  bindFieldPlayButton(document.getElementById('questionPlayButton'), 'question');
  bindFieldPlayButton(document.getElementById('answerPlayButton'), 'answer');
  
  document.getElementById('homeButton').addEventListener('click', function() {
    if (this.disabled) return;
    goToHome();
  });
  
  document.getElementById('plusButton').addEventListener('click', function() {
    if (this.disabled) return;
    playRetrySfxThen(handlePlusButtonClick);
  });
  var questionEditPencil = document.getElementById('questionEditPencil');
  if (questionEditPencil) {
    questionEditPencil.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      startUpdateMode('question');
    });
  }
  var answerEditPencil = document.getElementById('answerEditPencil');
  if (answerEditPencil) {
    answerEditPencil.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      startUpdateMode('answer');
    });
  }
  bindLearningBodyGestures();
  
  // 出題読みトグルボタン
  document.getElementById('questionToggleButton').addEventListener('click', function() {
    if (isAppAuthUiLocked()) {
      return;
    }
    if (isListeningModeEnabled()) {
      return; // リスニング練習中はON固定
    }
    isQuestionToggleActive = !isQuestionToggleActive;
    applyReadToggleButtonUi();
    saveReadToggle('question', isQuestionToggleActive);
  });
  
  // 解答読みトグルボタン
  document.getElementById('answerToggleButton').addEventListener('click', function() {
    if (isAppAuthUiLocked()) {
      return;
    }
    isAnswerToggleActive = !isAnswerToggleActive;
    applyReadToggleButtonUi();
    // リスニング中の切替は一時的（OFF復帰でON前に戻す）のため保存しない
    if (!isListeningModeEnabled()) {
      saveReadToggle('answer', isAnswerToggleActive);
    }
  });
  
  document.getElementById('loginButton').addEventListener('click', function() {
    // 再ログイン時は自動選択を止め、アカウント切替できるようにする
    disableGoogleAutoSelect();
    showGoogleLoginDialog({ cancellable: true, forceAccountSelect: true });
  });

  var googleSignInAppButton = document.getElementById('googleSignInAppButton');
  if (googleSignInAppButton) {
    googleSignInAppButton.addEventListener('click', function() {
      startGoogleOAuthTokenLogin();
    });
  }

  var googleLoginCancelButton = document.getElementById('googleLoginCancelButton');
  if (googleLoginCancelButton) {
    googleLoginCancelButton.addEventListener('click', function() {
      cancelGoogleLoginDialogIfAllowed();
    });
  }
  var googleLoginOverlay = document.getElementById('googleLoginOverlay');
  if (googleLoginOverlay) {
    googleLoginOverlay.addEventListener('click', function(e) {
      if (e.target === googleLoginOverlay) {
        cancelGoogleLoginDialogIfAllowed();
      }
    });
  }
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      cancelGoogleLoginDialogIfAllowed();
    }
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

  var learningListPrevButton = document.getElementById('learningListPrevButton');
  if (learningListPrevButton) {
    learningListPrevButton.addEventListener('click', function() {
      if (isLearningCompleted) {
        navigateCompletionCategory(-1);
      }
    });
  }

  var learningListNextButton = document.getElementById('learningListNextButton');
  if (learningListNextButton) {
    learningListNextButton.addEventListener('click', function() {
      if (isLearningCompleted) {
        navigateCompletionCategory(1);
      }
    });
  }
  
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
  
  // 表示カテゴリ（HOMEのみ）
  document.getElementById('visibleCategoriesButton').addEventListener('click', function() {
    toggleVisibleCategoriesSubmenu();
  });
  document.getElementById('visibleCategoriesSelectAllButton').addEventListener('click', function() {
    setAllVisibleCategoryChecks(true);
  });
  document.getElementById('visibleCategoriesClearAllButton').addEventListener('click', function() {
    setAllVisibleCategoryChecks(false);
  });
  document.getElementById('visibleCategoriesSaveButton').addEventListener('click', function() {
    saveVisibleCategoriesFromUi();
  });
  document.getElementById('visibleCategoriesCancelButton').addEventListener('click', function() {
    closeVisibleCategoriesSubmenu();
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
  
  // 速さは中固定。速い／遅いは disabled。クリックでは変えない
  
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

  preloadUiClickSfx();
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
  document.documentElement.style.overflow = 'hidden';
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
  // 未保存の表示カテゴリ変更は破棄
  closeVisibleCategoriesSubmenu();
  // メニューが閉じたら背景のスクロールを有効化
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

// サイドメニューをトグル
function toggleSideMenu() {
  if (isAppAuthUiLocked()) {
    return;
  }
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
    scheduleUserSettingsSync();
  } catch (e) {
    console.warn('音声設定の保存に失敗しました。');
  }
}

// 速さ設定を保存（localStorage）
function setAudioSpeed(speedType, speed) {
  try {
    var key = 'audioSpeed_' + speedType; // 'audioSpeed_question' または 'audioSpeed_answer'
    localStorage.setItem(key, AUDIO_SPEED_FIXED);
    // 設定変更時にキャッシュをクリア
    clearAudioCache();
    scheduleUserSettingsSync();
  } catch (e) {
    console.warn('速さ設定の保存に失敗しました。');
  }
}

// 音声設定を取得（localStorage、デフォルト値：男性）
function getAudioVoice(voiceType) {
  try {
    var key = 'audioVoice_' + voiceType;
    var saved = localStorage.getItem(key);
    return saved || AUDIO_VOICE_DEFAULT;
  } catch (e) {
    return AUDIO_VOICE_DEFAULT;
  }
}

// 速さ設定を取得（中固定）
function getAudioSpeed(speedType) {
  return AUDIO_SPEED_FIXED;
}

function persistFixedAudioSpeed_() {
  try {
    localStorage.setItem('audioSpeed_question', AUDIO_SPEED_FIXED);
    localStorage.setItem('audioSpeed_answer', AUDIO_SPEED_FIXED);
  } catch (e) {
    // ignore
  }
}

function syncAudioSpeedButtonsLocked_() {
  var types = ['question', 'answer'];
  for (var t = 0; t < types.length; t++) {
    updateAudioSpeedButtons(types[t], AUDIO_SPEED_FIXED);
  }
  var buttons = document.querySelectorAll('.audio-speed-button');
  for (var i = 0; i < buttons.length; i++) {
    var button = buttons[i];
    var isMedium = button.dataset.speedValue === AUDIO_SPEED_FIXED;
    button.disabled = !isMedium;
    if (isMedium) {
      button.removeAttribute('aria-disabled');
    } else {
      button.setAttribute('aria-disabled', 'true');
    }
  }
}

// 速さの値をspeakingRateに変換
function getSpeakingRate(speed) {
  var speedMap = {
    'fast': 1.25,
    'medium': 1.0,
    'slow': 0.9
  };
  return speedMap[speed] || 1.20; // デフォルト値：中
}

// 音声設定を読み込み（localStorageから）
function loadAudioSettings() {
  // 出題音声
  var questionVoice = getAudioVoice('question');
  updateAudioVoiceButtons('question', questionVoice);
  
  persistFixedAudioSpeed_();
  syncAudioSpeedButtonsLocked_();

  // 解答音声
  var answerVoice = getAudioVoice('answer');
  updateAudioVoiceButtons('answer', answerVoice);
}

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
  var screen2 = document.getElementById('screen2');
  return !!(screen2 && screen2.classList.contains('active'));
}

/**
 * 学習中（screen2・未完了）。全問再取得の後着で出題順を変えない判定に使う
 * @returns {boolean}
 */
function isActiveLearningSession() {
  return isQuestionMethodLockedOnLearningScreen() && !isLearningCompleted;
}

/**
 * 画面に出している問題。学習中は displayedLearningItem を優先
 * @returns {Object|null}
 */
function getCurrentLearningItem() {
  if (displayedLearningItem) {
    return displayedLearningItem;
  }
  if (currentQuestionIndex >= 0 && currentQuestionIndex < currentCategoryData.length) {
    return currentCategoryData[currentQuestionIndex];
  }
  return null;
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
  updateVisibleCategoriesMenuLock();
}

/**
 * 表示カテゴリ設定は HOME 時のみ操作可能
 */
function updateVisibleCategoriesMenuLock() {
  var locked = !isHomeScreenActive();
  var container = document.getElementById('visibleCategoriesItemContainer');
  var button = document.getElementById('visibleCategoriesButton');
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
}

/**
 * 解答時間優先モードか
 * @returns {boolean}
 */
function isDurationQuestionMethod() {
  return getQuestionMethod() === 'duration';
}

/**
 * カテゴリ毎（ノーマル）か
 * @returns {boolean}
 */
function isCategoryNormalQuestionMethod() {
  return getQuestionMethod() === 'category';
}

/**
 * カテゴリ毎（シャッフル）か
 * @returns {boolean}
 */
function isCategoryShuffleQuestionMethod() {
  return getQuestionMethod() === 'categoryShuffle';
}

/**
 * カテゴリ毎モード（ノーマル／シャッフル）か
 * @returns {boolean}
 */
function isCategoryBasedQuestionMethod() {
  return isCategoryNormalQuestionMethod() || isCategoryShuffleQuestionMethod();
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
  var selectContainer = document.getElementById('categorySelectContainer');
  var modeLabel = document.getElementById('questionMethodModeLabel');
  var sectionLabel = document.getElementById('categorySectionLabel');
  var learningSelectContainer = document.getElementById('learningCategorySelectContainer');
  var currentCategory = document.getElementById('currentCategory');
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
  var learningSectionLabel = document.getElementById('learningCategorySectionLabel');
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
  durationModeSortedItems = [];
  durationModePageIndex = 0;
  durationModeSessionItems = [];
  isDurationCompletionSessionView = false;
  lastDateModeAllItems = [];
  lastDateModeSessionItems = [];
  lastDateModePageIndex = 0;
  lastDateModeNeedsResortBeforePaging = false;
  isLastDateCompletionSessionView = false;
  isCategoryCompletionSessionView = false;
  applyQuestionMethodModeUi();
  
  if (categoryNo) {
    loadCategoryData(categoryNo);
  } else {
    currentCategoryData = [];
    selectedQuestionIndices = [];
    var listMessage = document.getElementById('listMessage');
    var listContainer = document.getElementById('listContainer');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = 'Categoryを選択してください。';
    }
    if (listContainer) listContainer.style.display = 'none';
    setStartButtonVisible(false);
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
function sortItemsForDurationMode(items) {
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
 * Fisher-Yates シャッフル（非破壊）
 * @param {Array} items
 * @returns {Array}
 */
function shuffleArray(items) {
  var arr = (items || []).slice();
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * 学習日優先のソート（破壊的）
 * LastDate昇順（空先頭）→ Duration降順（空=MAX）→ Category_No降順
 * @param {Array} items
 * @returns {Array}
 */
function sortItemsForLastDatePriorityMode(items) {
  if (!items || items.length === 0) {
    return items || [];
  }
  items.sort(function(a, b) {
    var dateA = getLastDateSortKey(a ? a.last_date : '');
    var dateB = getLastDateSortKey(b ? b.last_date : '');
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;

    var durA = getDurationSortMs(a ? a.duration : '');
    var durB = getDurationSortMs(b ? b.duration : '');
    if (durA < durB) return 1;
    if (durA > durB) return -1;

    var catA = getCategoryNoSortValue(a ? a.category_no : 0);
    var catB = getCategoryNoSortValue(b ? b.category_no : 0);
    if (catA < catB) return 1;
    if (catA > catB) return -1;
    return 0;
  });
  return items;
}

/**
 * 学習日優先（シャッフル）：上位プールからランダムに最大7件を抽選（順序もランダム）
 * @param {Array} sortedItems
 * @returns {Array}
 */
function pickRandomLastDateModeItems(sortedItems) {
  if (!sortedItems || sortedItems.length === 0) {
    return [];
  }
  var poolSize = Math.min(LAST_DATE_POOL_SIZE, sortedItems.length);
  var pool = sortedItems.slice(0, poolSize);
  var pickCount = Math.min(CROSS_CATEGORY_LIST_SIZE, pool.length);
  return shuffleArray(pool).slice(0, pickCount);
}

/**
 * 学習日優先（ノーマル）：昇順ソート結果の先頭から最大7件（順序はソート順のまま）
 * @param {Array} sortedItems
 * @returns {Array}
 */
function pickTopLastDateModeItems(sortedItems) {
  if (!sortedItems || sortedItems.length === 0) {
    return [];
  }
  return sortedItems.slice(0, Math.min(CROSS_CATEGORY_LIST_SIZE, sortedItems.length));
}

/**
 * 学習日優先：現在モードに応じて List 用の最大7件を取得
 * @param {Array} sortedItems
 * @returns {Array}
 */
function pickLastDateModeListItems(sortedItems) {
  if (isLastDateNormalQuestionMethod()) {
    return pickTopLastDateModeItems(sortedItems);
  }
  return pickRandomLastDateModeItems(sortedItems);
}

/**
 * getAllStudyItems 取得結果をセッション内メモリでマージ
 * @param {Array} items - 取得した配列（サーバ or 端末）
 * @param {Array} [extraItems]
 * @param {{preferIncomingStudyMeta?: boolean}} [options]
 *   preferIncomingStudyMeta=true：学習メタ（日時・回数・duration）は items 側を優先（シート正）
 * @returns {Array}
 */
function mergeAllStudyItemsWithMemory(items, extraItems, options) {
  options = options || {};
  var preferIncomingStudyMeta = !!options.preferIncomingStudyMeta;
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
  (extraItems || []).forEach(function(it) {
    if (it && it.id != null) {
      byId[String(it.id)] = it;
    }
  });
  return (items || []).map(function(it) {
    var mem = it && it.id != null ? byId[String(it.id)] : null;
    if (!mem) return it;
    var retryCount;
    var totalStudyCount;
    var dailyStudyCount;
    var durationOld;
    var duration;
    var lastDate;
    if (preferIncomingStudyMeta) {
      retryCount = it.retry_count != null ? it.retry_count : mem.retry_count;
      totalStudyCount = it.total_study_count != null ? it.total_study_count : mem.total_study_count;
      dailyStudyCount = it.daily_study_count != null ? it.daily_study_count : mem.daily_study_count;
      durationOld = it.duration_old != null ? it.duration_old : mem.duration_old;
      duration = it.duration != null ? it.duration : mem.duration;
      lastDate = it.last_date != null ? it.last_date : mem.last_date;
    } else {
      retryCount = mem.retry_count != null ? mem.retry_count : it.retry_count;
      totalStudyCount = mem.total_study_count != null ? mem.total_study_count : it.total_study_count;
      dailyStudyCount = mem.daily_study_count != null ? mem.daily_study_count : it.daily_study_count;
      durationOld = mem.duration_old != null ? mem.duration_old : it.duration_old;
      duration = mem.duration != null ? mem.duration : it.duration;
      lastDate = mem.last_date != null ? mem.last_date : it.last_date;
    }
    return {
      id: it.id,
      category_no: it.category_no != null ? it.category_no : mem.category_no,
      category: it.category != null ? it.category : mem.category,
      no: it.no,
      q_title: it.q_title,
      question: mem.question != null ? mem.question : it.question,
      a_title: it.a_title,
      answer: mem.answer != null ? mem.answer : it.answer,
      note: mem.note != null ? mem.note : it.note,
      retry_count: retryCount,
      total_study_count: totalStudyCount,
      daily_study_count: dailyStudyCount,
      duration_old: durationOld,
      duration: duration,
      last_date: lastDate
    };
  });
}

/**
 * 全問データの端末キャッシュキー（メール単位）
 * @returns {string}
 */
function getAllStudyItemsLocalStorageKey() {
  return 'allStudyItemsLocal_v1:' + resolveAuthEmail();
}

/**
 * 端末に保存した全問＋世代を読む
 * @returns {{items: Array, dataGeneration: number|null}|null}
 */
function readLocalStudyBundle() {
  try {
    var raw = localStorage.getItem(getAllStudyItemsLocalStorageKey());
    if (!raw) {
      return null;
    }
    var parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }
    var gen = parsed.dataGeneration;
    if (gen == null || gen === '') {
      return { items: parsed.items, dataGeneration: null };
    }
    var n = Number(gen);
    return {
      items: parsed.items,
      dataGeneration: (isFinite(n) ? n : null)
    };
  } catch (e) {
    return null;
  }
}

/**
 * 全問と世代が揃っているか（省略判定用。容量不足で書けなかった世代なしは不可）
 * @param {{items?: Array, dataGeneration?: number|null}|null} bundle
 * @returns {boolean}
 */
function hasCompleteLocalStudyData(bundle) {
  return !!(bundle && bundle.items && bundle.items.length &&
    bundle.dataGeneration != null && isFinite(Number(bundle.dataGeneration)));
}

/**
 * 端末に保存した全問データを読む
 * @returns {Array|null}
 */
function readLocalAllStudyItems() {
  var bundle = readLocalStudyBundle();
  return bundle && bundle.items && bundle.items.length ? bundle.items : null;
}

/**
 * 全問データを端末へ保存（容量超過時は静かに失敗し、次回は省略しない）
 * @param {Array} items
 * @param {number|null} [dataGeneration]
 */
function writeLocalStudyBundle(items, dataGeneration) {
  var gen = dataGeneration;
  if (gen == null) {
    var prev = readLocalStudyBundle();
    gen = prev ? prev.dataGeneration : null;
  }
  try {
    localStorage.setItem(getAllStudyItemsLocalStorageKey(), JSON.stringify({
      savedAt: Date.now(),
      dataGeneration: gen,
      items: items || []
    }));
    lastLocalStudyPersistOk = true;
    setMemoryAllStudyItems(items || []);
  } catch (e) {
    lastLocalStudyPersistOk = false;
    console.warn('全問データの端末キャッシュ保存に失敗:', e);
  }
}

/**
 * @param {Array} items
 */
function writeLocalAllStudyItems(items) {
  writeLocalStudyBundle(items);
}

/**
 * Ans／編集後：端末全問の当該行と世代を更新する
 * @param {string} id
 * @param {Object} fields
 * @param {number} [dataGeneration]
 */
function patchLocalStudyItemFields(id, fields, dataGeneration) {
  if (!id || !fields) {
    return;
  }
  var items = getMemoryAllStudyItems().slice();
  var found = false;
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].id) === String(id)) {
      var keys = Object.keys(fields);
      for (var k = 0; k < keys.length; k++) {
        items[i][keys[k]] = fields[keys[k]];
      }
      found = true;
      break;
    }
  }
  if (found) {
    writeLocalStudyBundle(items, dataGeneration);
    rebuildCategoryDataByNoFromItems(items);
  } else if (dataGeneration != null) {
    var bundle = readLocalStudyBundle();
    if (bundle && bundle.items) {
      writeLocalStudyBundle(bundle.items, dataGeneration);
    }
  }
}

/**
 * List の「読み込み中...」とカテゴリスピナーを解除
 * @param {string} [fallbackMessage] - 解除後に出すメッセージ（任意）
 */
function clearAllStudyItemsLoadingUi(fallbackMessage) {
  hideCategoryLoadingSpinner();
  var listMessage = document.getElementById(
    isLearningCompleted ? 'completionListMessage' : 'listMessage'
  );
  if (!listMessage) {
    return;
  }
  if (fallbackMessage) {
    listMessage.style.display = 'block';
    listMessage.textContent = fallbackMessage;
    return;
  }
  if (listMessage.textContent === '読み込み中...') {
    listMessage.style.display = 'none';
    listMessage.textContent = '';
  }
}

/**
 * 全問取得の一時失敗か
 * @param {*} error
 * @returns {boolean}
 */
function isTransientAllStudyItemsError(error) {
  if (!error) {
    return false;
  }
  var msg = String(error.message || error.toString() || '');
  if (/Failed to fetch|NetworkError|network error|Load failed|タイムアウト/i.test(msg)) {
    return true;
  }
  if (/ネットワークエラー:\s*(404|408|425|429|5\d\d)\b/.test(msg)) {
    return true;
  }
  return false;
}

/**
 * 応答ボディを読みつつ進捗を返す（Content-Length が無い場合は受信バイトのみ）
 * @param {Response} response
 * @param {function(number, number): void} [onProgress]
 * @returns {Promise<Object>}
 */
function parseJsonResponseWithProgress(response, onProgress) {
  var total = Number(response.headers.get('Content-Length') || 0);
  if (!response.body || typeof response.body.getReader !== 'function') {
    if (typeof onProgress === 'function') {
      onProgress(0, total);
    }
    return response.json();
  }
  var reader = response.body.getReader();
  var chunks = [];
  var received = 0;
  function pump() {
    return reader.read().then(function(result) {
      if (result.done) {
        var bytes = new Uint8Array(received);
        var offset = 0;
        for (var i = 0; i < chunks.length; i++) {
          bytes.set(chunks[i], offset);
          offset += chunks[i].length;
        }
        var text = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(text);
      }
      chunks.push(result.value);
      received += result.value.byteLength;
      if (typeof onProgress === 'function') {
        onProgress(received, total);
      }
      return pump();
    });
  }
  return pump();
}

/**
 * GAS getAllStudyItems をタイムアウト付きで取得（一時失敗は自動リトライ）
 * @param {function(*, Array|null): void} onDone - (error, items)
 */
function fetchAllStudyItemsFromServer(onDone) {
  function attempt(attemptIndex) {
    beginLoadDiag('run', '全問', ALL_STUDY_ITEMS_FETCH_MAX_ATTEMPTS, { attempt: attemptIndex, kind: 'all' });
    updateAllStudyFetchProgress(0, 0);
    var controller = null;
    var timeoutId = null;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timeoutId = setTimeout(function() {
        try {
          controller.abort();
        } catch (eAbort) {
          // ignore
        }
      }, ALL_STUDY_ITEMS_FETCH_TIMEOUT_MS);
    }

    var params = new URLSearchParams();
    params.append('action', 'getAllStudyItems');
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params, {
      signal: controller ? controller.signal : null,
      readJson: function(response) {
        return parseJsonResponseWithProgress(response, updateAllStudyFetchProgress);
      }
    })
      .then(function(data) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (!data || !data.success) {
          throw new Error((data && data.error) || 'データの取得に失敗しました');
        }
        var bytes = approxJsonBytes(data);
        finishLoadDiag('run', 'OK', { ok: true, bytes: bytes, kind: 'all' });
        if (typeof onDone === 'function') {
          onDone(null, data.items || [], {
            dataGeneration: data.dataGeneration
          });
        }
      })
      .catch(function(error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        var err = error;
        if (error && (error.name === 'AbortError' || isAbortError(error))) {
          err = new Error('タイムアウト: 全問データの取得が時間切れです');
        }
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(err)
        });
        if (
          attemptIndex + 1 < ALL_STUDY_ITEMS_FETCH_MAX_ATTEMPTS &&
          isTransientAllStudyItemsError(err)
        ) {
          var delay = ALL_STUDY_ITEMS_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
          setTimeout(function() {
            attempt(attemptIndex + 1);
          }, delay);
          return;
        }
        finishLoadDiag('run', loadDiagStatusFromError(err), { ok: false });
        if (typeof onDone === 'function') {
          onDone(err, null);
        }
      });
  }

  attempt(0);
}

/**
 * 学習日優先（ノーマル）の総ページ数
 * @returns {number}
 */
function getLastDateModePageCount() {
  if (!lastDateModeAllItems.length) return 0;
  return Math.ceil(lastDateModeAllItems.length / CROSS_CATEGORY_LIST_SIZE);
}

/**
 * 学習日優先（ノーマル）：現在ページを List へ反映
 */
function applyLastDateModePageToList() {
  if (isActiveLearningSession()) {
    return;
  }
  isLastDateCompletionSessionView = false;
  lastDateModeNeedsResortBeforePaging = false;
  var pageCount = getLastDateModePageCount();
  if (pageCount <= 0) {
    currentCategoryData = [];
    currentCategoryNo = null;
    selectedQuestionIndices = [];
    var listMessage = document.getElementById(isLearningCompleted ? 'completionListMessage' : 'listMessage');
    var listContainer = document.getElementById(isLearningCompleted ? 'completionListContainer' : 'listContainer');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
    updateListNavButtons();
    if (isLearningCompleted) {
      refreshAdvanceNavControls();
    }
    return;
  }
  if (lastDateModePageIndex >= pageCount) {
    lastDateModePageIndex = pageCount - 1;
  }
  if (lastDateModePageIndex < 0) {
    lastDateModePageIndex = 0;
  }
  var start = lastDateModePageIndex * CROSS_CATEGORY_LIST_SIZE;
  currentCategoryData = lastDateModeAllItems.slice(start, start + CROSS_CATEGORY_LIST_SIZE);
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  displayList();
  updateListNavButtons();
  if (isLearningCompleted) {
    refreshAdvanceNavControls();
  }
}

/**
 * 学習日優先：再ソート→（シャッフル＝抽選／ノーマル＝先頭ページ）→List表示
 */
function regenerateLastDateModeList() {
  if (isActiveLearningSession()) {
    return;
  }
  if (lastDateModeAllItems.length > 0) {
    sortItemsForLastDatePriorityMode(lastDateModeAllItems);
  }
  isLastDateCompletionSessionView = false;
  if (isLastDateNormalQuestionMethod()) {
    lastDateModePageIndex = 0;
    applyLastDateModePageToList();
    return;
  }
  lastDateModeNeedsResortBeforePaging = false;
  currentCategoryData = pickLastDateModeListItems(lastDateModeAllItems);
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  displayList();
  updateListNavButtons();
  if (isLearningCompleted) {
    refreshAdvanceNavControls();
  }
}

/**
 * 学習日優先：完了直後に今回学習分を List 表示
 */
function applyLastDateModeSessionToCompletionList() {
  currentCategoryData = (lastDateModeSessionItems && lastDateModeSessionItems.length > 0)
    ? lastDateModeSessionItems.slice()
    : [];
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  isLastDateCompletionSessionView = true;
  if (isLastDateNormalQuestionMethod()) {
    lastDateModeNeedsResortBeforePaging = true;
  }

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
 * 学習日優先：完了セッション表示から再ソート／再抽選へ
 * @returns {boolean}
 */
function exitLastDateCompletionSessionWithRegenerate() {
  if (!isLearningCompleted || !isLastDateCompletionSessionView) {
    return false;
  }
  if (lastDateModeAllItems.length > 0) {
    regenerateLastDateModeList();
  } else {
    loadLastDateModeData({ regenerate: true, forceFetch: true });
  }
  maintainCompletionScrollAtBottom();
  return true;
}

/**
 * 学習日優先データを取得・ソート・抽選して表示
 * @param {Object} [options]
 * @param {boolean} [options.regenerate] - 再ソート＋再抽選
 * @param {boolean} [options.forceFetch]
 */
function loadLastDateModeData(options) {
  options = options || {};
  var regenerate = options.regenerate !== false;
  var forceFetch = !!options.forceFetch;

  applyQuestionMethodModeUi();

  if (!forceFetch && lastDateModeAllItems.length > 0) {
    if (regenerate) {
      regenerateLastDateModeList();
    } else if (currentCategoryData.length > 0) {
      selectedQuestionIndices = [];
      if (isLastDateNormalQuestionMethod()) {
        lastDateModeNeedsResortBeforePaging = true;
      }
      displayList();
      updateListNavButtons();
      if (isLearningCompleted) {
        refreshAdvanceNavControls();
      }
    } else {
      regenerateLastDateModeList();
    }
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
  var holdOverlay = shouldHoldPageLoadingForAllStudy(options);

  function applyLastDateItems(rawItems, fromServer) {
    var extra = fromServer ? [] : lastDateModeAllItems;
    var items = mergeAllStudyItemsWithMemory(rawItems || [], extra, {
      preferIncomingStudyMeta: !!fromServer
    });
    lastDateModeAllItems = filterItemsByVisibleCategories(items);
    sortItemsForLastDatePriorityMode(lastDateModeAllItems);
    if (isActiveLearningSession()) {
      return;
    }
    regenerateLastDateModeList();
  }

  var localItems = getMemoryAllStudyItems();
  if (localItems.length) {
    applyLastDateItems(localItems, false);
    if (holdOverlay) finishPageLoadingAndUnlock();
    return;
  }

  var usedLocal = false;
  beginAllStudyItemsNetworkWait(holdOverlay);

  fetchAllStudyItemsFromServer(function(error, items, meta) {
    if (requestId !== lastDateModeLoadRequestId) return;
    if (!isLastDateQuestionMethod()) {
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
      return;
    }
    if (error) {
      clearAllStudyItemsLoadingUi('データの取得に失敗しました。再読み込みしてください。');
      showError('アクセスエラー: ' + error.toString());
      if (holdOverlay) finishPageLoadingAndUnlock();
      return;
    }
    writeLocalStudyBundle(items || [], meta && meta.dataGeneration);
    setTimeout(function() {
      if (requestId !== lastDateModeLoadRequestId) return;
      if (!isLastDateQuestionMethod()) {
        clearAllStudyItemsLoadingUi();
        if (holdOverlay) finishPageLoadingAndUnlock();
        return;
      }
      applyLastDateItems(items || [], true);
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
    }, 0);
  });
}

/**
 * 学習日優先のページ操作
 * シャッフル：> で再抽選（< は無効）
 * ノーマル：要再ソート時は再ソート→先頭ページ。以降はページ送り（末尾で>無効、先頭で<無効）
 * @param {number} direction -1 | 1
 * @returns {boolean}
 */
function navigateLastDateModePage(direction) {
  if (isLastDateNormalQuestionMethod()) {
    if (direction < 0) {
      if (isLearningCompleted && isLastDateCompletionSessionView) {
        return false;
      }
      if (lastDateModeNeedsResortBeforePaging) {
        return false;
      }
      if (lastDateModePageIndex <= 0) {
        return false;
      }
      lastDateModePageIndex -= 1;
      applyLastDateModePageToList();
      if (isLearningCompleted) {
        maintainCompletionScrollAtBottom();
      }
      return true;
    }

    if (isLearningCompleted && isLastDateCompletionSessionView) {
      return exitLastDateCompletionSessionWithRegenerate();
    }
    if (lastDateModeNeedsResortBeforePaging) {
      if (lastDateModeAllItems.length > 0) {
        regenerateLastDateModeList();
      } else {
        loadLastDateModeData({ regenerate: true, forceFetch: false });
      }
      if (isLearningCompleted) {
        maintainCompletionScrollAtBottom();
      }
      return true;
    }
    var pageCount = getLastDateModePageCount();
    if (pageCount <= 0 || lastDateModePageIndex >= pageCount - 1) {
      return false;
    }
    lastDateModePageIndex += 1;
    applyLastDateModePageToList();
    if (isLearningCompleted) {
      maintainCompletionScrollAtBottom();
    }
    return true;
  }

  // シャッフル
  if (direction < 0) {
    return false;
  }
  if (isLearningCompleted && isLastDateCompletionSessionView) {
    return exitLastDateCompletionSessionWithRegenerate();
  }
  if (lastDateModeAllItems.length > 0) {
    regenerateLastDateModeList();
    if (isLearningCompleted) {
      maintainCompletionScrollAtBottom();
    }
    return true;
  }
  loadLastDateModeData({ regenerate: true, forceFetch: false });
  return true;
}

/**
 * 解答時間優先：完了直後に今回学習分を List 表示
 */
function applyDurationModeSessionToCompletionList() {
  currentCategoryData = (durationModeSessionItems && durationModeSessionItems.length > 0)
    ? durationModeSessionItems.slice()
    : [];
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  isDurationCompletionSessionView = true;

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
function exitDurationCompletionSessionWithResort() {
  if (!isLearningCompleted || !isDurationCompletionSessionView) {
    return false;
  }
  isDurationCompletionSessionView = false;
  if (durationModeSortedItems.length > 0) {
    sortItemsForDurationMode(durationModeSortedItems);
    durationModePageIndex = 0;
    applyDurationModePageToList();
  } else {
    loadDurationModeData({ resetPage: true, resort: true, forceFetch: true });
  }
  maintainCompletionScrollAtBottom();
  return true;
}

/**
 * 学習日優先の総ページ数
 * @returns {number}
 */
function getDurationModePageCount() {
  if (!durationModeSortedItems.length) return 0;
  return Math.ceil(durationModeSortedItems.length / CROSS_CATEGORY_LIST_SIZE);
}

/**
 * 現在ページの件数を currentCategoryData へ反映してList表示
 */
function applyDurationModePageToList() {
  if (isActiveLearningSession()) {
    return;
  }
  isDurationCompletionSessionView = false;
  var pageCount = getDurationModePageCount();
  if (pageCount <= 0) {
    durationModePageIndex = 0;
    currentCategoryData = [];
    selectedQuestionIndices = [];
    var listMessage = document.getElementById(isLearningCompleted ? 'completionListMessage' : 'listMessage');
    var listContainer = document.getElementById(isLearningCompleted ? 'completionListContainer' : 'listContainer');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
    if (!isLearningCompleted) setStartButtonVisible(false);
    updateListNavButtons();
    if (isLearningCompleted) {
      refreshAdvanceNavControls();
    }
    return;
  }
  
  if (durationModePageIndex < 0) durationModePageIndex = 0;
  if (durationModePageIndex >= pageCount) durationModePageIndex = pageCount - 1;
  
  var start = durationModePageIndex * CROSS_CATEGORY_LIST_SIZE;
  currentCategoryData = durationModeSortedItems.slice(start, start + CROSS_CATEGORY_LIST_SIZE);
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  displayList();
  
  if (!isLearningCompleted) {
    setStartButtonVisible(true);
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
function loadDurationModeData(options) {
  options = options || {};
  var resetPage = options.resetPage !== false;
  var resort = options.resort !== false;
  var forceFetch = !!options.forceFetch;
  
  applyQuestionMethodModeUi();
  
  if (!forceFetch && durationModeSortedItems.length > 0) {
    if (resort) {
      sortItemsForDurationMode(durationModeSortedItems);
    }
    if (resetPage) {
      durationModePageIndex = 0;
    }
    applyDurationModePageToList();
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
  
  durationModeLoadRequestId++;
  var requestId = durationModeLoadRequestId;
  var holdOverlay = shouldHoldPageLoadingForAllStudy(options);

  function applyDurationItems(rawItems, fromServer) {
    var extra = fromServer ? [] : durationModeSortedItems;
    var items = mergeAllStudyItemsWithMemory(rawItems || [], extra, {
      preferIncomingStudyMeta: !!fromServer
    });
    durationModeSortedItems = filterItemsByVisibleCategories(items);
    sortItemsForDurationMode(durationModeSortedItems);
    if (isActiveLearningSession()) {
      return;
    }
    if (resetPage) durationModePageIndex = 0;
    applyDurationModePageToList();
  }

  var localItems = getMemoryAllStudyItems();
  if (localItems.length) {
    applyDurationItems(localItems, false);
    if (holdOverlay) finishPageLoadingAndUnlock();
    return;
  }

  beginAllStudyItemsNetworkWait(holdOverlay);

  fetchAllStudyItemsFromServer(function(error, items, meta) {
    if (requestId !== durationModeLoadRequestId) return;
    if (!isDurationQuestionMethod()) {
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
      return;
    }
    if (error) {
      clearAllStudyItemsLoadingUi('データの取得に失敗しました。再読み込みしてください。');
      showError('アクセスエラー: ' + error.toString());
      if (holdOverlay) finishPageLoadingAndUnlock();
      return;
    }
    writeLocalStudyBundle(items || [], meta && meta.dataGeneration);
    setTimeout(function() {
      if (requestId !== durationModeLoadRequestId) return;
      if (!isDurationQuestionMethod()) {
        clearAllStudyItemsLoadingUi();
        if (holdOverlay) finishPageLoadingAndUnlock();
        return;
      }
      applyDurationItems(items || [], true);
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
    }, 0);
  });
}

/**
 * 学習日優先：ページ移動（再ソートしない）
 * @param {number} direction -1 | 1
 * @returns {boolean} 移動できたか
 */
function navigateDurationModePage(direction) {
  if (isLearningCompleted && isDurationCompletionSessionView) {
    if (direction > 0) {
      return exitDurationCompletionSessionWithResort();
    }
    return false;
  }
  var pageCount = getDurationModePageCount();
  if (pageCount <= 0) return false;
  var nextPage = durationModePageIndex + direction;
  if (nextPage < 0 || nextPage >= pageCount) return false;
  durationModePageIndex = nextPage;
  applyDurationModePageToList();
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

/**
 * 学習完了直後のListか（閲覧操作前＝解答側表示）
 * Next／<<>>／ドロップダウンでのカテゴリ・ページ切替後は false
 */
function isCompletionSessionListView() {
  if (!isLearningCompleted) {
    return false;
  }
  if (isDurationQuestionMethod()) {
    return !!isDurationCompletionSessionView;
  }
  if (isLastDateQuestionMethod()) {
    return !!isLastDateCompletionSessionView;
  }
  return !!isCategoryCompletionSessionView;
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
  var screen1 = document.getElementById('screen1');
  if (screen1 && screen1.classList.contains('active') && currentCategoryData.length > 0) {
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
}

/**
 * 出題読み／解答読みトグルを localStorage から読み込み
 */
function loadReadToggles() {
  isQuestionToggleActive = getReadToggle('question');
  isAnswerToggleActive = getReadToggle('answer');
  applyReadToggleButtonUi();
}

/**
 * リスニング練習モードに応じて出題／解答読みトグルを同期する
 * ON時：出題読みはON固定、解答読みは切替時にON（以降は切り替え可能）
 * OFF時：固定解除し、それぞれON前の状態へ戻す（localStorage の保存値は上書きしない）
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
  }
  if (answerToggleButton) {
    answerToggleButton.classList.remove('is-locked');
    answerToggleButton.removeAttribute('aria-disabled');
    answerToggleButton.title = '';
  }
  applyReadToggleButtonUi();
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
    setStoredSettingsBgDriveFileId('');
    userSettingsBgUploadPending = false;
    
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
    scheduleUserSettingsSync();
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
      if (imageUrl.indexOf('data:') === 0) {
        userSettingsBgUploadPending = true;
      } else {
        userSettingsBgUploadPending = false;
        // プリセット選択時も旧 Drive はサーバ側で削除させるため ID は残す
      }
      
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
      scheduleUserSettingsSync();
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
  if (!userEmail) {
    try {
      userEmail = localStorage.getItem('userEmail');
    } catch (e) {
      userEmail = userEmail || null;
    }
  }
  if (!userEmail) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  var items = getItemsForCategoryFromLocal(categoryNo);
  var listContainer = document.getElementById('listContainer');
  if (items && items.length) {
    categoryDataByNo[String(categoryNo)] = items;
    applyLoadedCategoryData(categoryNo, items);
  } else {
    applyLoadedCategoryData(categoryNo, []);
  }
  hideCategoryLoadingSpinner();
  if (listContainer) listContainer.style.pointerEvents = 'auto';
  maybeRefreshStudyItemsFromGeneration({
    preserveValue: String(categoryNo),
    source: 'categorySwitch'
  });
}

/**
 * カテゴリList用：現在の並びを保ったまま最新アイテム参照へ差し替え
 * @param {Array} currentItems
 * @param {Array} freshItems
 * @returns {Array}
 */
function mergeCategoryItemsPreserveOrder(currentItems, freshItems) {
  var byId = {};
  (freshItems || []).forEach(function(it) {
    if (it && it.id != null) {
      byId[String(it.id)] = it;
    }
  });
  var result = [];
  (currentItems || []).forEach(function(it) {
    if (!it) return;
    if (it.id != null && byId[String(it.id)]) {
      result.push(byId[String(it.id)]);
      delete byId[String(it.id)];
    } else {
      result.push(it);
    }
  });
  Object.keys(byId).forEach(function(id) {
    result.push(byId[id]);
  });
  return result;
}

/**
 * 取得済みカテゴリデータを画面へ反映
 * カテゴリ毎（シャッフル）時は表示用配列のみシャッフル（categoryDataByNo の順は維持）
 * @param {string|number} categoryNo
 * @param {Array} items
 */
function applyLoadedCategoryData(categoryNo, items) {
  var source = items || [];
  if (isCategoryShuffleQuestionMethod()) {
    currentCategoryData = shuffleArray(source);
  } else {
    currentCategoryData = source;
  }
  currentCategoryNo = categoryNo;
  selectedQuestionIndices = [];
  displayList();
  syncCategoryLastDateFromList();
  updateListNavButtons();
  
  updateStartButtonEnabled();
  
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
      allowRowSelect: false,
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
    allowRowSelect: true,
    showStartButton: true
  };
}

/**
 * 完了Listの高さ維持用 minHeight を適用（ページスクロール方式のため上限は設けない）
 * @param {HTMLElement} listContainerEl
 * @param {number} heightPx
 */
function applyCompletionListMinHeight(listContainerEl, heightPx) {
  if (!listContainerEl) {
    return;
  }
  var n = Math.max(0, Math.floor(Number(heightPx) || 0));
  if (n > 0) {
    listContainerEl.style.minHeight = n + 'px';
  }
}

/**
 * 完了Listの minHeight を解除（実コンテンツ高へ縮められるようにする）
 * @param {HTMLElement|null} listContainerEl
 */
function clearCompletionListMinHeight(listContainerEl) {
  if (!listContainerEl) {
    return;
  }
  listContainerEl.style.minHeight = '';
}

/**
 * 完了List：読み込み待ち中のみ現在高さを一時ピン留めする
 * @param {HTMLElement|null} listContainerEl
 */
function pinCompletionListMinHeightForLoading(listContainerEl) {
  if (!listContainerEl || !isLearningCompleted) {
    return;
  }
  var h = Math.max(0, Math.floor(listContainerEl.offsetHeight || 0));
  if (h > 0) {
    applyCompletionListMinHeight(listContainerEl, h);
  }
}

// リストを表示
function displayList() {
  var ui = getListUiConfig();
  var tableBody = document.getElementById(ui.tableBodyId);
  if (!tableBody) return;
  
  var listContainerEl = ui.containerId ? document.getElementById(ui.containerId) : null;
  // 再描画中の潰し防止で一時ピン。描画後は実高に合わせて解除／付け直し（間延び防止）
  var pinnedMinHeight = 0;
  if (isLearningCompleted && listContainerEl) {
    pinnedMinHeight = Math.max(0, Math.floor(listContainerEl.offsetHeight || 0));
    if (pinnedMinHeight > 0) {
      applyCompletionListMinHeight(listContainerEl, pinnedMinHeight);
    }
  }
  
  tableBody.innerHTML = '';

  var showAnswerSideInList = isCompletionSessionListView();
  
  // 最初のアイテムからタイトルを取得してヘッダーに設定
  // 完了直後セッションListは解答側、それ以外（TOP／閲覧後）は出題側
  if (currentCategoryData.length > 0) {
    var headerCell = document.getElementById(ui.headerId);
    if (headerCell) {
      headerCell.textContent = showAnswerSideInList
        ? (getEffectiveATitle(currentCategoryData[0]) || '')
        : (getEffectiveQTitle(currentCategoryData[0]) || '');
    }
  }
  
  currentCategoryData.forEach(function(item, index) {
    var row = document.createElement('tr');
    var isSelected = selectedQuestionIndices.indexOf(index) !== -1;
    
    // 選択状態に応じてクラスを追加（TOPのみ）
    if (ui.allowRowSelect && isSelected) {
      row.classList.add('selected-row');
    }
    
    var noCell = document.createElement('td');
    noCell.textContent = item.no || '';
    // 選択状態に応じてNo列にクラスを追加
    if (ui.allowRowSelect && isSelected) {
      noCell.classList.add('selected-no');
    }
    var questionCell = document.createElement('td');
    // 完了直後は解答側、それ以外は出題側（画像対応・入替え対応）
    var questionContent = showAnswerSideInList
      ? getEffectiveAnswer(item)
      : getEffectiveQuestion(item);
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
    
    if (ui.allowRowSelect) {
      var clickTimer = null;
      row.addEventListener('click', function(e) {
        if (clickTimer === null) {
          clickTimer = setTimeout(function() {
            clickTimer = null;
            toggleQuestionSelection(index, row);
          }, 300);
        }
      });
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
    }
    
    tableBody.appendChild(row);
  });
  
  // 選択数の表示を更新
  updateSelectionCount();
  
  var listMessage = document.getElementById(ui.messageId);
  var listContainer = document.getElementById(ui.containerId);
  
  if (listMessage) listMessage.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  if (ui.showStartButton) {
    setStartButtonVisible(true);
  }
  
  if (isLearningCompleted) {
    // 描画後は実コンテンツ高に合わせる（大きい方に張り付かせない＝間延び防止）
    if (listContainerEl) {
      clearCompletionListMinHeight(listContainerEl);
      var contentHeight = Math.max(0, Math.floor(listContainerEl.offsetHeight || 0));
      if (contentHeight > 0) {
        applyCompletionListMinHeight(listContainerEl, contentHeight);
      }
      bindCompletionListImagesToKeepScroll(listContainerEl);
    }
    updateNavAnswerButton();
    maintainCompletionScrollAtBottom();
  }
}

// 問題の選択/解除をトグル
function toggleQuestionSelection(index, row) {
  if (isLearningCompleted) {
    return;
  }
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

/**
 * 選択可能カテゴリのうち、指定番号が何番目か（1始まり）と総数を返す
 * @param {string|number} categoryNo
 * @returns {{ position: number, total: number }|null}
 */
function getSelectableCategoryNavInfo(categoryNo) {
  if (categoryNo == null || categoryNo === '' || !categories || categories.length === 0) {
    return null;
  }
  var selectable = [];
  for (var i = 0; i < categories.length; i++) {
    if (isCategorySelectable(categories[i])) {
      selectable.push(categories[i]);
    }
  }
  if (selectable.length === 0) {
    return null;
  }
  var position = 0;
  for (var j = 0; j < selectable.length; j++) {
    if (String(selectable[j].no) === String(categoryNo)) {
      position = j + 1;
      break;
    }
  }
  if (position === 0) {
    return null;
  }
  return { position: position, total: selectable.length };
}

/**
 * カテゴリ位置表示を更新（学習日優先・解答時間優先は非表示）
 * @param {HTMLElement|null} indicatorEl
 * @param {string|number|null} categoryNo
 */
function updateCategoryNavIndicatorElement(indicatorEl, categoryNo) {
  if (!indicatorEl) {
    return;
  }
  if (isCrossCategoryQuestionMethod() || categoryNo == null || categoryNo === '') {
    indicatorEl.textContent = '';
    indicatorEl.style.display = 'none';
    return;
  }
  var info = getSelectableCategoryNavInfo(categoryNo);
  if (!info) {
    indicatorEl.textContent = '';
    indicatorEl.style.display = 'none';
    return;
  }
  indicatorEl.textContent = info.position + ' / ' + info.total;
  indicatorEl.style.display = '';
}

/**
 * Listナビコンテナの表示／非表示
 * @param {string} containerId
 * @param {boolean} visible
 */
function setListNavContainerVisible(containerId, visible) {
  var listNavContainer = document.getElementById(containerId);
  if (!listNavContainer) {
    return;
  }
  listNavContainer.style.visibility = visible ? 'visible' : 'hidden';
  if (containerId === 'screen2ListNavContainer') {
    // 学習完了中は display:none せず高さを維持（<<>> 出現で下にズレるのを防ぐ）
    if (isLearningCompleted) {
      listNavContainer.style.display = '';
      listNavContainer.style.pointerEvents = visible ? '' : 'none';
    } else {
      listNavContainer.style.display = visible ? '' : 'none';
      listNavContainer.style.pointerEvents = visible ? '' : 'none';
    }
  }
}

/**
 * 学習完了直後：Category 下 <<>> の領域高さを先に確保する
 */
function reserveCompletionCategoryNavSpace() {
  if (!isLearningCompleted) {
    return;
  }
  var listNavContainer = document.getElementById('screen2ListNavContainer');
  if (!listNavContainer) {
    return;
  }
  listNavContainer.style.display = '';
  listNavContainer.style.visibility = 'hidden';
  listNavContainer.style.pointerEvents = 'none';
}

// Listナビゲーションボタンを表示
function showListNavButtons() {
  setListNavContainerVisible('screen1ListNavContainer', true);
  if (isLearningCompleted) {
    setListNavContainerVisible('screen2ListNavContainer', true);
  }
}

// Listナビゲーションボタンを非表示
function hideListNavButtons() {
  setListNavContainerVisible('screen1ListNavContainer', false);
  setListNavContainerVisible('screen2ListNavContainer', false);
}

/**
 * 1組の Listナビ（<< >> と位置表示）を更新
 * @param {{ containerId: string, prevId: string, nextId: string, indicatorId: string, selectId: string, active: boolean }} config
 */
function updateListNavPair(config) {
  var prevButton = document.getElementById(config.prevId);
  var nextButton = document.getElementById(config.nextId);
  var indicator = document.getElementById(config.indicatorId);
  var select = document.getElementById(config.selectId);

  if (!prevButton || !nextButton) {
    return;
  }

  if (!config.active) {
    setListNavContainerVisible(config.containerId, false);
    updateCategoryNavIndicatorElement(indicator, null);
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  // 解答時間優先：7件ページ送り
  if (isDurationQuestionMethod()) {
    updateCategoryNavIndicatorElement(indicator, null);
    if (isLearningCompleted && isDurationCompletionSessionView) {
      setListNavContainerVisible(config.containerId, true);
      prevButton.disabled = true;
      nextButton.disabled = false;
      return;
    }
    var pageCount = getDurationModePageCount();
    if (pageCount <= 0) {
      setListNavContainerVisible(config.containerId, false);
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }
    setListNavContainerVisible(config.containerId, true);
    prevButton.disabled = durationModePageIndex <= 0;
    nextButton.disabled = durationModePageIndex >= pageCount - 1;
    return;
  }

  // 学習日優先
  if (isLastDateQuestionMethod()) {
    updateCategoryNavIndicatorElement(indicator, null);
    if (isLastDateNormalQuestionMethod()) {
      if ((isLearningCompleted && isLastDateCompletionSessionView) || lastDateModeNeedsResortBeforePaging) {
        setListNavContainerVisible(config.containerId, true);
        prevButton.disabled = true;
        nextButton.disabled = false;
        return;
      }
      var lastDatePageCount = getLastDateModePageCount();
      if (lastDatePageCount <= 0) {
        setListNavContainerVisible(config.containerId, false);
        prevButton.disabled = true;
        nextButton.disabled = true;
        return;
      }
      setListNavContainerVisible(config.containerId, true);
      prevButton.disabled = lastDateModePageIndex <= 0;
      nextButton.disabled = lastDateModePageIndex >= lastDatePageCount - 1;
      return;
    }
    // シャッフル：> で再抽選（< は無効）
    setListNavContainerVisible(config.containerId, true);
    prevButton.disabled = true;
    nextButton.disabled = false;
    return;
  }

  if (!select || categories.length === 0) {
    setListNavContainerVisible(config.containerId, false);
    updateCategoryNavIndicatorElement(indicator, null);
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  if (!select.value) {
    setListNavContainerVisible(config.containerId, false);
    updateCategoryNavIndicatorElement(indicator, null);
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  setListNavContainerVisible(config.containerId, true);
  updateCategoryNavIndicatorElement(indicator, select.value);

  var currentIndex = -1;
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].no == select.value) {
      currentIndex = i;
      break;
    }
  }

  if (currentIndex === -1) {
    prevButton.disabled = true;
    nextButton.disabled = true;
  } else {
    prevButton.disabled = (findSelectableCategoryIndex(currentIndex, -1) < 0);
    nextButton.disabled = (findSelectableCategoryIndex(currentIndex, 1) < 0);
  }
}

// Listナビゲーションボタンの状態を更新
function updateListNavButtons() {
  updateListNavPair({
    containerId: 'screen1ListNavContainer',
    prevId: 'listPrevButton',
    nextId: 'listNextButton',
    indicatorId: 'categoryNavInfo',
    selectId: 'categorySelect',
    active: true
  });
  updateListNavPair({
    containerId: 'screen2ListNavContainer',
    prevId: 'learningListPrevButton',
    nextId: 'learningListNextButton',
    indicatorId: 'learningCategoryNavInfo',
    selectId: 'learningCategorySelect',
    active: isLearningCompleted
  });
}

// 前のカテゴリに移動（学習日優先時はページ戻し）
function navigateToPreviousCategory() {
  if (isDurationQuestionMethod()) {
    navigateDurationModePage(-1);
    return;
  }
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
  if (isDurationQuestionMethod()) {
    navigateDurationModePage(1);
    return;
  }
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

// 選択数の表示を更新
function updateSelectionCount() {
  var ui = getListUiConfig();
  var selectionCount = document.getElementById(ui.selectionCountId);
  if (!selectionCount) return;
  if (isLearningCompleted || ui.allowRowSelect === false) {
    selectionCount.style.display = 'none';
    return;
  }
  
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

/**
 * TOP の START ドック（ぼかし帯＋ボタン）の表示切替
 * @param {boolean} visible
 */
function setStartButtonVisible(visible) {
  var dock = document.getElementById('startButtonDock');
  var startButton = document.getElementById('startButton');
  var display = visible ? 'block' : 'none';
  if (dock) {
    dock.style.display = display;
    dock.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
  if (startButton && !visible) {
    startButton.disabled = false;
  } else if (visible) {
    updateStartButtonEnabled();
  }
}

/**
 * TOP の START を効果音／本問音声中は無効化する
 */
function updateStartButtonEnabled() {
  var startButton = document.getElementById('startButton');
  if (!startButton) {
    return;
  }
  var dock = document.getElementById('startButtonDock');
  var hidden = !dock || dock.style.display === 'none';
  if (hidden) {
    return;
  }
  var spinner = document.getElementById('categoryLoadingSpinner');
  var loading = !!(spinner && spinner.style.display === 'block');
  startButton.disabled = loading || isNavActionLockedByAudio();
}

// リスト表示をリセット
function resetListDisplay() {
  var listMessage = document.getElementById('listMessage');
  var listContainer = document.getElementById('listContainer');
  var selectionCount = document.getElementById('selectionCount');
  
  hideCategoryLoadingSpinner();
  
  if (listMessage) {
    listMessage.style.display = 'block';
    listMessage.style.whiteSpace = '';
    listMessage.textContent = 'Categoryを選択してください。';
  }
  if (listContainer) listContainer.style.display = 'none';
  setStartButtonVisible(false);
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
  if (googleAuthLockInProgress) {
    return;
  }
  googleAuthLockInProgress = true;
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
    googleAuthLockInProgress = false;
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

  var screen2 = document.getElementById('screen2');
  var screen1 = document.getElementById('screen1');
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

  categories = [];
  categoryDataByNo = {};
  currentCategoryData = [];
  currentCategoryNo = null;
  selectedQuestionIndices = [];
  originalCategoryData = [];
  currentQuestionIndex = 0;
  displayedLearningItem = null;
  completedQuestionIndices = [];
  sheetUpdateOkCount = 0;
  sheetUpdateFailCount = 0;
  loadDiagHistory = [];
  pendingAnsSheetPersist = null;
  if (ansSheetPersistTimer) {
    clearTimeout(ansSheetPersistTimer);
    ansSheetPersistTimer = null;
  }
  retryQuestionIndices = [];
  sessionRetryPressCountById = {};
  isInRetryMode = false;
  retryQuestionIndex = 0;
  isAnswerShown = false;
  isLearningCompleted = false;
  justCompletedCategoryNo = null;
  isDurationCompletionSessionView = false;
  isLastDateCompletionSessionView = false;
  isCategoryCompletionSessionView = false;
  isCategoryTransitionInProgress = false;
  isCompletionStudyFieldsCollapsed = false;
  durationModeSortedItems = [];
  lastDateModeAllItems = [];
  memoryAllStudyItems = null;
  durationModeSessionItems = [];
  lastDateModeSessionItems = [];
  durationModePageIndex = 0;
  lastDateModePageIndex = 0;
  todayStudiedItemCount = 0;
  todayStudiedAnsCount = 0;

  hideCompletionMessage();
  hideLearningCategorySelect();
  hideCompletionListSection();
  restoreCompletionStudyFields();

  var select = document.getElementById('categorySelect');
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

// 学習開始
function startLearning() {
  if (currentCategoryData.length === 0) {
    return;
  }

  sessionRetryPressCountById = {};
  ensureLearningTimeCounterStarted();
  
  // 完了時カテゴリナビ用アイコンを通常（左＝解答再生・右スペーサー）に戻す
  setLearningNavIconsNormal();
  
  // 元のデータを保存（学習日優先の Plus 用セッションも保持）
  originalCategoryData = currentCategoryData.slice();
  if (isDurationQuestionMethod()) {
    durationModeSessionItems = originalCategoryData.slice();
  } else if (isLastDateQuestionMethod()) {
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
  refreshLoadDiagUi();
  
  // コンテナのパディングを減らす
  var container = document.querySelector('.container');
  if (container) container.classList.add('learning-mode');

  hideLearningCategorySelect();
  
  // カテゴリ情報／出題方法を表示
  var currentCategory = document.getElementById('currentCategory');
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
  displayedLearningItem = null;
  
  // 再チャレンジ関連変数をリセット
  retryQuestionIndices = [];
  isInRetryMode = false;
  retryQuestionIndex = 0;
  completedQuestionIndices = [];
  isLearningCompleted = false;
  
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
  if (learningStartTime !== null) {
    return;
  }
  learningStartTime = Date.now();
  startLearningTimeCounter();
}

// 学習時間カウンターを開始
function startLearningTimeCounter() {
  if (learningTimeInterval) {
    return;
  }
  learningTimeInterval = setInterval(function() {
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
  todayStudiedCountDate = dateYmd || getTodayYmdLocal();
  var n = Math.floor(Number(count));
  if (isNaN(n) || n < 0) {
    n = 0;
  }
  todayStudiedItemCount = n;
  updateDailyStudyStatsDisplay();
}

/**
 * 今日の Ans 押下回数を反映
 * @param {*} count
 * @param {string} [dateYmd]
 */
function applyTodayStudiedAnsCount(count, dateYmd) {
  todayStudiedCountDate = dateYmd || getTodayYmdLocal();
  var n = Math.floor(Number(count));
  if (isNaN(n) || n < 0) {
    n = 0;
  }
  todayStudiedAnsCount = n;
  updateDailyStudyStatsDisplay();
}

/**
 * 表示用の今日学習件数（日付跨ぎなら 0）
 * @returns {number}
 */
function getTodayStudiedItemCountForDisplay() {
  if (todayStudiedCountDate !== getTodayYmdLocal()) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(todayStudiedItemCount) || 0));
}

/**
 * 表示用の今日 Ans 回数（日付跨ぎなら 0）
 * @returns {number}
 */
function getTodayStudiedAnsCountForDisplay() {
  if (todayStudiedCountDate !== getTodayYmdLocal()) {
    return 0;
  }
  return Math.max(0, Math.floor(Number(todayStudiedAnsCount) || 0));
}

/**
 * シート全体のカテゴリ数（END除く）
 * @returns {number}
 */
function getTotalSheetCategoryCount() {
  if (!categories || categories.length === 0) {
    return 0;
  }
  var total = 0;
  for (var i = 0; i < categories.length; i++) {
    if (!isEndCategory(categories[i])) {
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
  if (!categories || categories.length === 0) {
    return 0;
  }
  var total = 0;
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
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
  var el = document.getElementById('learningItemCount');
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
  if (todayStudiedCountDate && todayStudiedCountDate !== today) {
    recountTodayStudyStatsFromLocalItems();
    return;
  }
  updateDailyStudyStatsDisplay();
}

/**
 * 0:00 跨ぎなどで日付変化を検知して学習個数表示を同期
 */
function startDailyStudyCountDateWatcher() {
  if (dailyStudyCountDateCheckInterval) {
    return;
  }
  dailyStudyCountDateCheckInterval = setInterval(function() {
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
  if (todayStudiedCountDate !== today) {
    todayStudiedCountDate = today;
    todayStudiedItemCount = 0;
    todayStudiedAnsCount = 0;
  }
  todayStudiedAnsCount += 1;
  if (!isItemLastDateToday(item)) {
    todayStudiedItemCount += 1;
  }
  updateDailyStudyStatsDisplay();
}

// 学習時間を更新
function updateLearningTime() {
  syncDailyStudyStatsDisplay();

  if (learningStartTime === null) return;
  
  var elapsed = Date.now() - learningStartTime;
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
  var learningTimeElement = document.getElementById('learningTime');
  if (learningTimeElement) {
    learningTimeElement.textContent = timeText;
  }
}

// 問題を表示
function displayQuestion() {
  if (currentQuestionIndex < 0 || currentQuestionIndex >= currentCategoryData.length) {
    displayedLearningItem = null;
    return;
  }
  
  stopCurrentAudioPlayback();
  clearAudioSourceDebug();
  
  var item = currentCategoryData[currentQuestionIndex];
  displayedLearningItem = item || null;
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
  isNoteExpanded = false;
  clearNoteClickTimer();
  isAnswerShown = false;
  
  // ストップウォッチ：通常は即開始。リスニング（テキスト出題）は出題音声終了後
  pendingQuestionAutoplayTimerReset = false;
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
    if (!isListeningQuestion && isQuestionToggleActive) {
      pendingQuestionAutoplayTimerReset = true;
    }
    setTimeout(function() {
      var currentItem = getCurrentLearningItem();
      if (!currentItem || isAnswerShown) {
        pendingQuestionAutoplayTimerReset = false;
        if (waitingListeningAnsGate) releaseListeningAnsGate();
        return;
      }
      var text = getEffectiveQuestion(currentItem);
      if (text && !isImageUrl(text)) {
        playFieldAudio('question');
      } else if (waitingListeningAnsGate) {
        releaseListeningAnsGate();
      } else {
        pendingQuestionAutoplayTimerReset = false;
      }
    }, 250);
  } else if (waitingListeningAnsGate) {
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
  if (!waitingListeningAnsGate) return;
  waitingListeningAnsGate = false;
  if (!isAnswerShown && !isLearningCompleted) {
    startStopwatch();
  }
  updateNavAnswerButton();
}

/**
 * 出題読みの自動再生が終わったら計測をゼロから再開（Qボタン聞き直しは対象外）
 */
function resetStopwatchAfterQuestionAutoplay() {
  if (!pendingQuestionAutoplayTimerReset) return;
  pendingQuestionAutoplayTimerReset = false;
  if (isAnswerShown || isLearningCompleted) return;
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
    pendingQuestionAutoplayTimerReset = false;
    return;
  }
  resetStopwatchAfterQuestionAutoplay();
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
  
  pendingQuestionAutoplayTimerReset = false;
  waitingListeningAnsGate = false;
  stopStopwatch();
  
  var item = getCurrentLearningItem();
  if (!item) return;
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
  
  // noteを常に表示（空欄／閉じ／開き。問題切替・Ans直後は閉じ）
  isNoteExpanded = false;
  applyLearningNoteDisplay(item);
  var noteSection = document.getElementById('noteSection');
  if (noteSection) noteSection.style.display = 'block';
  
  isAnswerShown = true;
  
  // 中央ボタンを Next に切り替え（時間表示は維持）
  updateNavAnswerButton();
  
  // 今日の学習統計（LastDate 更新前に判定）
  recordDailyStudyStatsOnAns(item);

  // 解答読みON時は音声を先に開始し、シート更新は音声のネット取得完了後（上限あり）に回す
  var willAutoPlayAnswer = isAnswerToggleActive && !isUpdateMode;
  if (willAutoPlayAnswer) {
    persistAnsStudyStatsAsync(item, stopwatchElapsed, { deferNetwork: true });
    playFieldAudio('answer', false, {
      onSettled: function() {
        flushPendingAnsSheetPersist();
      }
    });
  } else {
    persistAnsStudyStatsAsync(item, stopwatchElapsed);
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
  if (noteClickTimer) {
    clearTimeout(noteClickTimer);
    noteClickTimer = null;
  }
}

/**
 * 学習画面の note 表示を反映（空欄／閉じ／開き）
 * @param {Object} item
 */
function applyLearningNoteDisplay(item) {
  var noteText = document.getElementById('noteText');
  if (!noteText) {
    return;
  }
  var noteValue = item && item.note != null ? String(item.note) : '';
  var isNoteEmpty = !noteValue.trim();
  
  noteText.classList.remove('note-empty', 'note-collapsed', 'note-expanded');
  
  if (isNoteEmpty) {
    isNoteExpanded = false;
    noteText.textContent = '';
    noteText.classList.add('note-empty');
    noteText.setAttribute('aria-expanded', 'false');
    noteText.removeAttribute('role');
    noteText.tabIndex = -1;
    return;
  }
  
  noteText.setAttribute('role', 'button');
  noteText.tabIndex = 0;
  if (isNoteExpanded) {
    noteText.textContent = noteValue;
    noteText.classList.add('note-expanded');
    noteText.setAttribute('aria-expanded', 'true');
  } else {
    noteText.textContent = NOTE_COLLAPSED_HINT;
    noteText.classList.add('note-collapsed');
    noteText.setAttribute('aria-expanded', 'false');
  }
}

/**
 * note の開閉をトグル（情報あり時のみ）
 */
function toggleLearningNoteExpanded() {
  if (isUpdateMode) {
    return;
  }
  if (!isAnswerShown) {
    return;
  }
  var item = getCurrentLearningItem();
  if (!item || !String(item.note || '').trim()) {
    return;
  }
  isNoteExpanded = !isNoteExpanded;
  applyLearningNoteDisplay(item);
}

// 学習画面の項目編集用ダブルクリックを設定
function setupFieldEditDoubleClick() {
  if (isUpdateMode) {
    updateFieldEditPencils();
    return;
  }

  var questionText = document.getElementById('questionText');
  if (questionText) {
    questionText.removeEventListener('dblclick', handleQuestionDoubleClick);
  }
  var answerTextDisplay = document.getElementById('answerTextDisplay');
  if (answerTextDisplay) {
    answerTextDisplay.removeEventListener('dblclick', handleAnswerDoubleClick);
  }

  var noteText = document.getElementById('noteText');
  if (noteText) {
    noteText.removeEventListener('click', handleNoteClick);
    noteText.removeEventListener('dblclick', handleNoteDoubleClick);
    noteText.removeEventListener('keydown', handleNoteKeydown);
    noteText.addEventListener('click', handleNoteClick);
    noteText.addEventListener('dblclick', handleNoteDoubleClick);
    noteText.addEventListener('keydown', handleNoteKeydown);
  }
  updateFieldEditPencils();
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

function handleNoteClick(e) {
  if (isUpdateMode || !isAnswerShown) {
    return;
  }
  var item = getCurrentLearningItem();
  if (!item || !String(item.note || '').trim()) {
    return;
  }
  // ダブルクリック判別のため遅延トグル（開き中の編集と競合しない）
  clearNoteClickTimer();
  noteClickTimer = setTimeout(function() {
    noteClickTimer = null;
    toggleLearningNoteExpanded();
  }, 280);
}

function handleNoteDoubleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  clearNoteClickTimer();
  if (!isNoteExpanded) {
    return;
  }
  var item = getCurrentLearningItem();
  if (!item || !String(item.note || '').trim()) {
    return;
  }
  startUpdateMode('note');
}

function handleNoteKeydown(e) {
  if (e.key !== 'Enter' && e.key !== ' ') {
    return;
  }
  var item = getCurrentLearningItem();
  if (!item || !String(item.note || '').trim()) {
    return;
  }
  e.preventDefault();
  toggleLearningNoteExpanded();
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
function buildLearningMetaText(item, variant) {
  var m = getRetryCountNumber(item ? item.retry_count : 0);
  var n = getRetryCountNumber(item ? item.total_study_count : 0);
  var durationOldText = formatDurationForDisplay(item ? item.duration_old : '');
  var durationText = formatDurationForDisplay(item ? item.duration : '');
  var lastDateText = formatYmdForDisplay(item ? item.last_date : '');
  if (variant === 'list') {
    return '学習回数：' + m + '／' + n + '回　平均(前回)：' + durationOldText + '　平均(最新)：' + durationText + '　最終学習日時：' + lastDateText;
  }
  return '回数：' + m + '／' + n + '回　平均：' + durationOldText + '⇒' + durationText + '　日時：' + lastDateText;
}

/**
 * 学習メタ情報を要素へ表示
 * @param {Object} item
 * @param {string} elementId
 */
function updateLearningMetaDisplay(item, elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  var variant = (elementId === 'modalLearningMeta') ? 'list' : 'learning';
  el.textContent = buildLearningMetaText(item, variant);
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
    sheetUpdateFailCount += 1;
    refreshLoadDiagUi();
    finishGasSheetUpdateJob();
    return;
  }

  beginLoadDiag('run', '更新', GAS_UPDATE_MAX_ATTEMPTS, {
    attempt: attemptIndex,
    kind: 'update',
    status: '通信待ち',
    queueWait: Math.max(0, gasSheetUpdateQueue.length - 1)
  });

  var params = new URLSearchParams();
  params.append('action', job.action);
  params.append('id', job.id);
  appendAuthParams(params);
  params.append('referer', window.location.origin);

  if (job.action === 'updateItemFields') {
    params.append('fields', JSON.stringify(job.fields || {}));
  } else {
    params.append('field', job.field);
    params.append('value', String(job.value));
  }

  postGasJson(params)
  .then(function(data) {
    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }
    finishLoadDiag('run', 'OK', {
      ok: true,
      kind: 'update',
      bytes: approxJsonBytes(data)
    });
    sheetUpdateOkCount += 1;
    refreshLoadDiagUi();
    var fields = job.fields || {};
    if (job.field) {
      fields[job.field] = job.value;
    }
    if (job.id && fields && Object.keys(fields).length) {
      patchLocalStudyItemFields(job.id, fields, data.dataGeneration);
    }
    if (typeof job.onSuccess === 'function') {
      job.onSuccess(data);
    }
    finishGasSheetUpdateJob();
  })
  .catch(function(error) {
    updateLoadDiag('run', {
      attempt: attemptIndex,
      status: loadDiagStatusFromError(error),
      queueWait: Math.max(0, gasSheetUpdateQueue.length - 1)
    });
    var nextAttempt = attemptIndex + 1;
    if (nextAttempt < GAS_UPDATE_MAX_ATTEMPTS) {
      var delay = GAS_UPDATE_BASE_DELAY_MS * Math.pow(2, attemptIndex);
      setTimeout(function() {
        runGasSheetUpdateJob(job, nextAttempt);
      }, delay);
      return;
    }
    sheetUpdateFailCount += 1;
    finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false, kind: 'update' });
    refreshLoadDiagUi();
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
 * Ans押下時: TotalStudyCount / DailyStudyCount / Duration_old / Duration / LastDate をメモリ更新し、1リクエストで保存
 * @param {Object} item
 * @param {number} elapsedMs
 * @param {{deferNetwork?: boolean}} [options] - true のときネット送信を保留（音声優先）
 */
function persistAnsStudyStatsAsync(item, elapsedMs, options) {
  if (!item) return;
  options = options || {};

  var nextCount = getRetryCountNumber(item.total_study_count) + 1;
  item.total_study_count = nextCount;

  var nextDaily = isItemLastDateToday(item)
    ? (getRetryCountNumber(item.daily_study_count) + 1)
    : 1;
  item.daily_study_count = nextDaily;

  // 更新前の Duration（移動平均）を Duration_old へコピー（空欄もコピー）
  var previousDuration = (item.duration === null || item.duration === undefined) ? '' : item.duration;
  item.duration_old = previousDuration;

  var currentMs = Math.max(0, Number(elapsedMs) || 0);
  currentMs = Math.round(currentMs * getSessionRetryDurationMultiplier(item));
  var previousMs = parseDurationToMs(previousDuration);
  var averagedMs = (previousMs === null) ? currentMs : Math.round((previousMs + currentMs) / 2);
  var duration = formatDurationForSheet(averagedMs);
  item.duration = duration;

  var now = getNowYmdHmLocal();
  item.last_date = now;

  var fields = {
    total_study_count: nextCount,
    daily_study_count: nextDaily,
    duration_old: previousDuration,
    duration: duration,
    last_date: now
  };

  if (options.deferNetwork) {
    scheduleAnsSheetPersist(item, fields);
    return;
  }
  updateItemFieldsAsync(item, fields);
}

/**
 * Ansシート更新の保留をクリアして即送信
 */
function flushPendingAnsSheetPersist() {
  if (ansSheetPersistTimer) {
    clearTimeout(ansSheetPersistTimer);
    ansSheetPersistTimer = null;
  }
  if (!pendingAnsSheetPersist) {
    return;
  }
  var pending = pendingAnsSheetPersist;
  pendingAnsSheetPersist = null;
  updateItemFieldsAsync(pending.item, pending.fields);
}

/**
 * 音声ネット取得を優先するため、シート更新を短時間保留（上限後は強制送信）
 * @param {Object} item
 * @param {Object} fields
 */
function scheduleAnsSheetPersist(item, fields) {
  if (ansSheetPersistTimer) {
    clearTimeout(ansSheetPersistTimer);
    ansSheetPersistTimer = null;
  }
  pendingAnsSheetPersist = { item: item, fields: fields };
  beginLoadDiag('run', '更新待機', 0, {
    status: '音声優先',
    kind: 'update'
  });
  ansSheetPersistTimer = setTimeout(function() {
    ansSheetPersistTimer = null;
    flushPendingAnsSheetPersist();
  }, ANS_SHEET_PERSIST_MAX_DEFER_MS);
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
  currentMs = Math.round(currentMs * getSessionRetryDurationMultiplier(item));
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

  incrementSessionRetryPressCount(item);
  
  var nextCount = getRetryCountNumber(item.retry_count) + 1;
  item.retry_count = nextCount;
  
  updateItemFieldAsync(item, 'retry_count', nextCount);
}

/**
 * このSTART以降の、当該問題へのリトライ押下を1加算
 * @param {Object} item
 */
function incrementSessionRetryPressCount(item) {
  if (!item || item.id == null) return;
  var key = String(item.id);
  sessionRetryPressCountById[key] = (Number(sessionRetryPressCountById[key]) || 0) + 1;
}

/**
 * リトライ再出題時の今回時間倍率。最初の周は常に1
 * @param {Object} item
 * @returns {number}
 */
function getSessionRetryDurationMultiplier(item) {
  if (!isInRetryMode || !item || item.id == null) {
    return 1;
  }
  var n = Number(sessionRetryPressCountById[String(item.id)]) || 0;
  if (n <= 0) return 1;
  if (n === 1) return 2.5;
  if (n === 2) return 3;
  return 3.5;
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
 * 出題再生＝下ナビ（リトライとHOMEの間）、解答再生＝下ナビ左。無効時も枠維持し薄い表示（is-inactive）
 */
function updateFieldPlayButtons() {
  var item = getCurrentLearningItem();
  var qBtn = getFieldPlayButton('question');
  var aBtn = getFieldPlayButton('answer');
  var questionPlaySlot = document.getElementById('navQuestionPlaySlot');
  var answerPlaySlot = document.getElementById('navAnswerPlaySlot');
  
  function isLoading(btn) {
    return !!(btn && btn.querySelector('.play-button-spinner'));
  }
  
  if (!item || isLearningCompleted) {
    if (qBtn && !isLoading(qBtn)) qBtn.disabled = true;
    if (aBtn && !isLoading(aBtn)) aBtn.disabled = true;
    if (questionPlaySlot) {
      questionPlaySlot.classList.add('is-inactive');
    }
    if (answerPlaySlot) {
      answerPlaySlot.classList.add('is-inactive');
    }
    // 学習完了時はナビの再入更新ループを避ける
    if (!isLearningCompleted) {
      refreshAdvanceNavControls();
    }
    return;
  }
  
  var qText = getEffectiveQuestion(item);
  var audioBusy = activePlayField !== null;
  var canPlayQuestion = !!qText && !isImageUrl(qText) && !audioBusy;
  if (qBtn && !isLoading(qBtn)) {
    qBtn.disabled = !canPlayQuestion;
  }
  if (questionPlaySlot) {
    questionPlaySlot.classList.toggle('is-inactive', !canPlayQuestion || isLoading(qBtn));
  }
  
  var aText = getEffectiveAnswer(item);
  var canPlayAnswer = !!isAnswerShown && !!aText && !isImageUrl(aText) && !audioBusy;
  if (aBtn && !isLoading(aBtn)) {
    aBtn.disabled = !canPlayAnswer;
  }
  if (answerPlaySlot) {
    // 取得中スピナー表示中は操作不可だが、枠は維持（薄い表示）
    answerPlaySlot.classList.toggle('is-inactive', !canPlayAnswer || isLoading(aBtn));
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
 * 効果音または本問音声のあいだ、START／Ans／Next／End を止めるか
 * @returns {boolean}
 */
function isNavActionLockedByAudio() {
  return uiClickSfxPlaying || isFieldAudioBusy();
}

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
  if (el.closest('#noteSection')) {
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
  var root = document.getElementById('screen2');
  if (!root || root.getAttribute('data-learn-gesture-bound') === '1') {
    return;
  }
  root.setAttribute('data-learn-gesture-bound', '1');

  var pressTimer = null;
  var pressActive = false;
  var longPressFired = false;
  var startX = 0;
  var startY = 0;
  var moved = false;

  function clearPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  }

  function isLearningScreenActive() {
    var s2 = document.getElementById('screen2');
    return !!(s2 && s2.classList.contains('active'));
  }

  root.addEventListener('pointerdown', function(e) {
    if (typeof e.button === 'number' && e.button !== 0) {
      return;
    }
    if (!isLearningScreenActive() || isUpdateMode) {
      return;
    }
    var el = getEventElement_(e.target);
    if (isLearningBodyGestureIgnoreTarget_(el)) {
      return;
    }
    pressActive = true;
    longPressFired = false;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    clearPressTimer();
    pressTimer = setTimeout(function() {
      pressTimer = null;
      if (!pressActive || moved || isUpdateMode) {
        return;
      }
      var plus = document.getElementById('plusButton');
      if (!plus || plus.disabled) {
        return;
      }
      longPressFired = true;
      playRetrySfxThen(handlePlusButtonClick);
    }, FIELD_PLAY_LONG_PRESS_MS);
  });

  root.addEventListener('pointermove', function(e) {
    if (!pressActive) {
      return;
    }
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if ((dx * dx + dy * dy) > (LEARNING_GESTURE_MOVE_PX * LEARNING_GESTURE_MOVE_PX)) {
      moved = true;
      clearPressTimer();
    }
  });

  function endPress(e) {
    var wasActive = pressActive;
    var wasLong = longPressFired;
    var wasMoved = moved;
    pressActive = false;
    clearPressTimer();
    if (!wasActive || wasLong || wasMoved || isUpdateMode) {
      return;
    }
    if (!isLearningScreenActive()) {
      return;
    }
    var el = getEventElement_(e && e.target);
    if (isLearningBodyGestureIgnoreTarget_(el)) {
      return;
    }
    handleNavAnswerButtonClick();
  }

  root.addEventListener('pointerup', endPress);
  root.addEventListener('pointercancel', function() {
    pressActive = false;
    clearPressTimer();
  });
  root.addEventListener('contextmenu', function(e) {
    if (longPressFired) {
      e.preventDefault();
    }
  });
}

function updateFieldEditPencils() {
  var show = !isUpdateMode && !isLearningCompleted && isAnswerShown;
  var q = document.getElementById('questionEditPencil');
  var a = document.getElementById('answerEditPencil');
  if (q) {
    q.hidden = !show;
  }
  if (a) {
    var ans = document.getElementById('answerTextDisplay');
    a.hidden = !show || !ans || ans.style.display === 'none';
  }
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
 * Audio に紐づく Object URL を解放する
 * @param {HTMLAudioElement|null} audio
 */
function revokeAudioObjectUrl(audio) {
  if (!audio || !audio._objectUrl) {
    return;
  }
  try {
    URL.revokeObjectURL(audio._objectUrl);
  } catch (e) {
    // ignore
  }
  audio._objectUrl = null;
}

function clearAudioBusyWatchdogs_() {
  if (audioBusyWatchdogTimer) {
    clearTimeout(audioBusyWatchdogTimer);
    audioBusyWatchdogTimer = null;
  }
  if (audioPauseStuckTimer) {
    clearTimeout(audioPauseStuckTimer);
    audioPauseStuckTimer = null;
  }
  if (audioPlayStartTimer) {
    clearTimeout(audioPlayStartTimer);
    audioPlayStartTimer = null;
  }
}

/**
 * 再生残り時間から操作復帰の期限を決める
 * @param {HTMLAudioElement|null} audio
 * @returns {number}
 */
function getAudioBusyDeadlineMs_(audio) {
  var d = audio && audio.duration;
  if (typeof d === 'number' && isFinite(d) && d > 0) {
    var remain = d - (audio.currentTime || 0);
    if (remain < 0) {
      remain = 0;
    }
    return Math.ceil(remain * 1000) + AUDIO_PLAY_END_GRACE_MS;
  }
  return AUDIO_PLAY_UNKNOWN_DURATION_MS;
}

function armAudioBusyWatchdog_(audio) {
  if (audioBusyWatchdogTimer) {
    clearTimeout(audioBusyWatchdogTimer);
    audioBusyWatchdogTimer = null;
  }
  var ms = getAudioBusyDeadlineMs_(audio);
  audioBusyWatchdogTimer = setTimeout(function() {
    audioBusyWatchdogTimer = null;
    forceReleaseFieldAudioBusy_('fail');
  }, ms);
}

/**
 * 音声 busy を強制解除（エラーバナーは出さない）
 * @param {string} [reason]
 */
function forceReleaseFieldAudioBusy_(reason) {
  var field = activePlayField;
  clearAudioBusyWatchdogs_();
  if (field == null && !currentAudio) {
    return;
  }
  activePlayField = null;
  releaseCurrentAudioElement();
  if (field) {
    hidePlayButtonLoading(field);
  } else {
    hidePlayButtonLoading('question');
    hidePlayButtonLoading('answer');
  }
  updateFieldPlayButtons();
  if (field === 'question') {
    onQuestionAudioSettled(reason || 'fail');
  }
  audioPrefetchPlayBlocked = false;
  scheduleAudioPrefetch();
  processGasAudioFetchQueue();
}

/**
 * 現在の Audio 要素を停止し、Object URL／src を解放する
 */
function releaseCurrentAudioElement() {
  if (!currentAudio) {
    return;
  }
  var audio = currentAudio;
  currentAudio = null;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {
    // ignore
  }
  revokeAudioObjectUrl(audio);
  try {
    audio.removeAttribute('src');
    audio.load();
  } catch (e) {
    // ignore
  }
}

/**
 * base64 文字列を Uint8Array に変換する
 * @param {string} base64
 * @returns {Uint8Array}
 */
function decodeBase64ToUint8Array(base64) {
  var raw = String(base64 || '').replace(/\s/g, '');
  var binary = atob(raw);
  var len = binary.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * メモリ上の audioData に mp3 Blob を載せ、再利用する（再生ごとの base64 再デコードを避ける）
 * @param {Object} audioData
 * @returns {Blob|null}
 */
function ensureMp3BlobOnAudioData(audioData) {
  if (!audioData) {
    return null;
  }
  if (audioData.blob instanceof Blob && audioData.blob.size > 0) {
    return audioData.blob;
  }
  if (!audioData.audioContent) {
    return null;
  }
  var bytes = decodeBase64ToUint8Array(audioData.audioContent);
  audioData.blob = new Blob([bytes], { type: 'audio/mpeg' });
  return audioData.blob;
}

/**
 * キャッシュ用に Blob を除いたオブジェクトを返す
 * @param {Object} audioData
 * @returns {Object}
 */
function serializeAudioCacheData(audioData) {
  return {
    audioContent: audioData.audioContent,
    timestamp: audioData.timestamp,
    textHash: audioData.textHash
  };
}

/**
 * audioData の Blob から Object URL 付き Audio を生成する
 * @param {Object} audioData
 * @returns {HTMLAudioElement}
 */
function createMp3AudioFromAudioData(audioData) {
  var blob = ensureMp3BlobOnAudioData(audioData);
  if (!blob) {
    throw new Error('empty audio');
  }
  var objectUrl = URL.createObjectURL(blob);
  var audio = new Audio();
  audio.preload = 'auto';
  audio._objectUrl = objectUrl;
  audio.src = objectUrl;
  return audio;
}

/**
 * canplay 後（または短時間タイムアウト後）に再生する
 * @param {HTMLAudioElement} audio
 * @returns {Promise}
 */
function playAudioElementWhenReady(audio) {
  return new Promise(function(resolve, reject) {
    var settled = false;
    var timer = null;

    function cleanup() {
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function finishReady() {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    }

    function onReady() {
      finishReady();
    }

    function onError() {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(audio.error || new Error('audio error'));
    }

    if (audio.readyState >= 3) {
      finishReady();
      return;
    }

    audio.addEventListener('canplay', onReady);
    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('error', onError);
    timer = setTimeout(finishReady, AUDIO_PLAY_CANPLAY_TIMEOUT_MS);
  }).then(function() {
    if (currentAudio !== audio) {
      var abortErr = new Error('interrupted by a call to pause');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    return audio.play();
  });
}

/**
 * 進行中の音声取得を無効化し、キューを空にする
 */
function invalidateGasAudioFetches() {
  activeAudioFetchGeneration += 1;
  gasAudioFetchQueue = [];
  gasAudioPrefetchQueue = [];
  audioPrefetchPlayBlocked = false;
  if (activeAudioFetchAbort) {
    try {
      activeAudioFetchAbort.abort();
    } catch (e) {
      // ignore
    }
    activeAudioFetchAbort = null;
  }
}

/**
 * 実行中の先読みだけ中断する（本問の generation は変えない）
 */
function abortRunningAudioPrefetch() {
  gasAudioPrefetchQueue = [];
  if (isAudioPrefetchJobRunning && activeAudioFetchAbort) {
    try {
      activeAudioFetchAbort.abort();
    } catch (e) {
      // ignore
    }
  }
}

/**
 * 音声取得ジョブを直列キューへ追加（同時1本）
 * @param {function(AbortSignal|null, number, function(): void): void} taskFn
 * @param {{prefetch?: boolean}} [options]
 */
function enqueueGasAudioFetch(taskFn, options) {
  if (typeof taskFn !== 'function') {
    return;
  }
  options = options || {};
  if (options.prefetch) {
    if (!ENABLE_AUDIO_PREFETCH || audioPrefetchStopped) {
      return;
    }
    gasAudioPrefetchQueue.push(taskFn);
  } else {
    abortRunningAudioPrefetch();
    audioPrefetchPlayBlocked = true;
    gasAudioFetchQueue.push(taskFn);
  }
  processGasAudioFetchQueue();
}

function processGasAudioFetchQueue() {
  if (isGasAudioFetchRunning) {
    return;
  }
  var task = null;
  var isPrefetch = false;
  if (gasAudioFetchQueue.length > 0) {
    task = gasAudioFetchQueue.shift();
  } else if (
    ENABLE_AUDIO_PREFETCH &&
    !audioPrefetchStopped &&
    !audioPrefetchPlayBlocked &&
    !isFieldAudioBusy() &&
    gasAudioPrefetchQueue.length > 0
  ) {
    task = gasAudioPrefetchQueue.shift();
    isPrefetch = true;
  }
  if (!task) {
    if (!isFieldAudioBusy()) {
      audioPrefetchPlayBlocked = false;
    }
    return;
  }

  isGasAudioFetchRunning = true;
  isAudioPrefetchJobRunning = isPrefetch;
  var generation = activeAudioFetchGeneration;
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  activeAudioFetchAbort = controller;
  var finished = false;

  function done() {
    if (finished) {
      return;
    }
    finished = true;
    if (activeAudioFetchAbort === controller) {
      activeAudioFetchAbort = null;
    }
    isGasAudioFetchRunning = false;
    isAudioPrefetchJobRunning = false;
    if (!isPrefetch) {
      audioPrefetchPlayBlocked = gasAudioFetchQueue.length > 0;
    }
    processGasAudioFetchQueue();
    if (!isPrefetch && gasAudioFetchQueue.length === 0 && !isFieldAudioBusy()) {
      audioPrefetchPlayBlocked = false;
      scheduleAudioPrefetch();
    } else if (
      isPrefetch &&
      gasAudioPrefetchQueue.length === 0 &&
      gasAudioFetchQueue.length === 0 &&
      !isFieldAudioBusy()
    ) {
      onAudioPrefetchQueueIdle_();
    }
  }

  try {
    task(controller ? controller.signal : null, generation, done);
  } catch (e) {
    done();
  }
}

/**
 * 音声取得の中断時UI復帰（切替・停止時。時間打ち切りは行わない）
 * @param {string} fieldType
 * @param {boolean} [isTimeout] - 互換のため残すが、通常は false
 */
function handleAudioFetchAbortOrTimeout(fieldType, isTimeout) {
  hidePlayButtonLoading(fieldType);
  activePlayField = null;
  updateFieldPlayButtons();
  refreshAdvanceNavControls();
  if (isTimeout) {
    showError('音声の取得に失敗しました。再生ボタンで再試行してください。');
  }
  if (fieldType === 'question') {
    onQuestionAudioSettled(isTimeout ? 'fail' : 'abort');
  }
}

/**
 * fetch が Abort か判定
 * @param {*} error
 * @returns {boolean}
 */
function isAbortError(error) {
  if (!error) {
    return false;
  }
  if (error.name === 'AbortError' || error.code === 20) {
    return true;
  }
  var msg = String(error.message || error);
  return /interrupted by a call to pause/i.test(msg);
}

/**
 * 再生中の音声を停止し、欄の再生ボタン状態を戻す
 * @param {{ skipButtonUpdate?: boolean, preserveBusy?: boolean, keepAudioQueue?: boolean }} [options]
 */
function stopCurrentAudioPlayback(options) {
  options = options || {};
  var prevField = activePlayField;
  clearAudioBusyWatchdogs_();
  releaseCurrentAudioElement();
  if (!options.preserveBusy) {
    activePlayField = null;
  }
  if (!options.keepAudioQueue) {
    invalidateGasAudioFetches();
  }
  if (prevField) {
    var prevBtn = getFieldPlayButton(prevField);
    if (prevBtn && prevBtn.querySelector('.play-button-spinner')) {
      hidePlayButtonLoading(prevField);
      if (!options.skipButtonUpdate) {
        updateFieldPlayButtons();
      }
      return;
    }
  }
  if (!options.skipButtonUpdate) {
    updateFieldPlayButtons();
  }
}

/**
 * 表示上の出題／解答をシート列（question／answer）に変換
 * @param {string} displayFieldType - 'question' | 'answer'
 * @returns {string}
 */
function getSheetAudioFieldType(displayFieldType) {
  if (isSwapQAEnabled()) {
    return displayFieldType === 'question' ? 'answer' : 'question';
  }
  return displayFieldType === 'answer' ? 'answer' : 'question';
}

/**
 * 問題の Category_No を解決
 * @param {Object} item
 * @returns {string|number|null}
 */
function resolveItemCategoryNo(item) {
  if (item && item.category_no != null && String(item.category_no) !== '') {
    return item.category_no;
  }
  if (currentCategoryNo != null && currentCategoryNo !== '') {
    return currentCategoryNo;
  }
  return null;
}

/**
 * Drive 音声メタとして使えるか
 * @param {Object} item
 * @returns {boolean}
 */
function canUseDriveAudioMeta(item) {
  if (!item || item.id == null || String(item.id) === '') {
    return false;
  }
  if (item.no == null || String(item.no) === '') {
    return false;
  }
  var catNo = resolveItemCategoryNo(item);
  return catNo != null && String(catNo) !== '';
}

/**
 * 指定テキストのローカル音声キャッシュを声・速さ違い含めて削除
 * @param {string} text
 */
function clearLocalAudioCachesForText(text) {
  if (!text) {
    return;
  }
  var genders = ['female', 'male'];
  var speeds = ['fast', 'medium', 'slow'];
  for (var i = 0; i < genders.length; i++) {
    for (var j = 0; j < speeds.length; j++) {
      removeCachedAudio(text, genders[i], speeds[j]);
    }
  }
}

/**
 * Drive へ音声を保存（失敗は無視）
 * @param {Object} item
 * @param {string} sheetField
 * @param {string} voiceGender
 * @param {string} speed
 * @param {string} audioContent
 */
function saveDriveAudioAsync(item, sheetField, voiceGender, speed, audioContent) {
  if (!canUseDriveAudioMeta(item) || !audioContent || !userEmail) {
    return;
  }
  if (sheetField !== 'question' && sheetField !== 'answer') {
    return;
  }
  try {
    var params = new URLSearchParams();
    params.append('action', 'saveDriveAudio');
    params.append('id', String(item.id));
    params.append('categoryNo', String(resolveItemCategoryNo(item)));
    params.append('no', String(item.no));
    params.append('field', sheetField);
    params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
    params.append('speed', speed || AUDIO_SPEED_FIXED);
    params.append('audioContent', audioContent);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params).catch(function() {
      // Drive失敗は学習を止めない
    });
  } catch (e) {
    // ignore
  }
}

/**
 * Drive 上の当該フィールド音声を削除（失敗は無視）
 * @param {Object} item
 * @param {string} sheetField
 */
function deleteDriveAudioAsync(item, sheetField) {
  if (!canUseDriveAudioMeta(item) || !userEmail) {
    return;
  }
  if (sheetField !== 'question' && sheetField !== 'answer') {
    return;
  }
  try {
    var params = new URLSearchParams();
    params.append('action', 'deleteDriveAudio');
    params.append('id', String(item.id));
    params.append('categoryNo', String(resolveItemCategoryNo(item)));
    params.append('no', String(item.no));
    params.append('field', sheetField);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params).catch(function() {
      // ignore
    });
  } catch (e) {
    // ignore
  }
}

/**
 * 指定欄のテキストを読み上げる
 * @param {string} fieldType - 'question' | 'answer'
 * @param {boolean} [forceRefresh=false] - true のときキャッシュ／Driveを使わず再生成
 * @param {{onSettled?: function(): void}} [options] - ネット取得不要または完了時（キャッシュヒット含む）
 */
function playFieldAudio(fieldType, forceRefresh, options) {
  if (uiClickSfxPlaying) {
    runAfterUiClickSfx(function() {
      playFieldAudio(fieldType, forceRefresh, options);
    });
    return;
  }
  options = options || {};
  var onSettled = typeof options.onSettled === 'function' ? options.onSettled : null;
  var settled = false;
  function settleAudioNetwork() {
    if (settled) {
      return;
    }
    settled = true;
    if (onSettled) {
      try {
        onSettled();
      } catch (eSettle) {
        console.warn(eSettle);
      }
    }
  }

  var item = getCurrentLearningItem();
  if (!item || isLearningCompleted) {
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    settleAudioNetwork();
    return;
  }
  
  if (fieldType === 'answer' && !isAnswerShown) {
    settleAudioNetwork();
    return;
  }
  
  var text = fieldType === 'answer' ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
  if (!text || isImageUrl(text)) {
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    settleAudioNetwork();
    return;
  }
  
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    showError('音声読み上げの設定が完了していません。WebアプリURLを設定してください。');
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    settleAudioNetwork();
    return;
  }
  
  // 停止〜取得開始のあいだも busy を維持（Ans直後の Q/Next 押下防止）
  stopCurrentAudioPlayback({ skipButtonUpdate: true, keepAudioQueue: false });
  activePlayField = fieldType;
  updateFieldPlayButtons();
  
  var voiceGender = fieldType === 'question' ? getAudioVoice('question') : getAudioVoice('answer');
  var speed = fieldType === 'question' ? getAudioSpeed('question') : getAudioSpeed('answer');
  var sheetField = getSheetAudioFieldType(fieldType);
  
  if (!forceRefresh) {
    var cachedResult = getCachedAudio(text, voiceGender, speed);
    if (cachedResult && cachedResult.audioData) {
      beginLoadDiag('run', 'Mem', 0, {
        status: 'OK',
        bytes: cachedResult.audioData.audioContent
          ? String(cachedResult.audioData.audioContent).length
          : null
      });
      finishLoadDiag('run', 'OK', {
        ok: true,
        bytes: cachedResult.audioData.audioContent
          ? String(cachedResult.audioData.audioContent).length
          : null
      });
      setTimeout(function() {
        playAudioFromCache(cachedResult.audioData, fieldType, cachedResult.source);
      }, 0);
      settleAudioNetwork();
      return;
    }
    getCachedAudioFromIdb(text, voiceGender, speed, function(idbResult) {
      if (getCurrentLearningItem() !== item) {
        settleAudioNetwork();
        return;
      }
      if (idbResult && idbResult.audioData) {
        beginLoadDiag('run', 'IdB', 0, {
          status: 'OK',
          bytes: idbResult.audioData.audioContent
            ? String(idbResult.audioData.audioContent).length
            : null
        });
        finishLoadDiag('run', 'OK', {
          ok: true,
          bytes: idbResult.audioData.audioContent
            ? String(idbResult.audioData.audioContent).length
            : null
        });
        setTimeout(function() {
          playAudioFromCache(idbResult.audioData, fieldType, 'indexedDB');
        }, 0);
        settleAudioNetwork();
        return;
      }
      enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork);
    });
    return;
  }

  enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork);
}

/**
 * 本問の Drive／TTS 取得をキューへ（トークン更新つき）
 */
function enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork) {
  enqueueGasAudioFetch(function(signal, generation, done) {
    ensureFreshGoogleAuthToken(function() {
      if (generation !== activeAudioFetchGeneration) {
        done();
        settleAudioNetwork();
        return;
      }
      var after = function() {
        done();
        settleAudioNetwork();
      };
      if (canUseDriveAudioMeta(item)) {
        fetchAudioFromDriveOrTts(text, voiceGender, speed, fieldType, sheetField, item, signal, generation, after);
      } else {
        fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, after);
      }
    }, function() {
      done();
      settleAudioNetwork();
      if (activePlayField === fieldType) {
        hidePlayButtonLoading(fieldType);
        clearAudioBusyWatchdogs_();
        activePlayField = null;
        updateFieldPlayButtons();
        if (fieldType === 'question') onQuestionAudioSettled('fail');
      }
    });
  });
}

/**
 * 指定欄のキャッシュを消して音声を再作成・再生する
 * @param {string} fieldType - 'question' | 'answer'
 */
function recreateFieldAudio(fieldType) {
  var item = getCurrentLearningItem();
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
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  if (audioCache[cacheKey]) {
    delete audioCache[cacheKey];
  }
  deleteAudioIdbRecord(audioIdbRecordId(cacheKey));
  try {
    localStorage.removeItem(CACHE_PREFIX + hashText(cacheKey));
  } catch (e) {
    // ignore
  }
  setTimeout(refreshAudioIdbStats, 0);
}

/**
 * デバッグ用：再生音声の取得元を表示（ENABLE_AUDIO_SOURCE_DEBUG が true のときのみ）
 * @param {string} source - 'memory' | 'localStorage' | 'Drive' | 'TTS'
 */
function showAudioSourceDebug(source) {
  var el = document.getElementById('audioSourceDebug');
  if (!el) {
    return;
  }
  if (ENABLE_AUDIO_SOURCE_DEBUG !== true) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  var labelMap = {
    memory: 'Mem',
    localStorage: 'IdB',
    indexedDB: 'IdB',
    Drive: 'Drv',
    TTS: 'TTS'
  };
  var label = labelMap[source] || String(source || '');
  el.textContent = label;
  el.style.display = 'inline-block';
}

/**
 * ヘッダーの音声取得元デバッグ表示を消す
 */
function clearAudioSourceDebug() {
  var el = document.getElementById('audioSourceDebug');
  if (!el) {
    return;
  }
  el.textContent = '';
  el.style.display = 'none';
}

/**
 * ヘッダーにフロント版を表示（タイトル右／狭い幅ではタイトル下）
 */
function syncAppHeaderVersionDisplay() {
  var el = document.getElementById('appHeaderVersion');
  if (!el) {
    return;
  }
  var ver = (typeof window.APP_FRONT_VERSION === 'string' && window.APP_FRONT_VERSION)
    ? window.APP_FRONT_VERSION
    : '';
  el.textContent = ver;
}

var audioIdb = null;
var audioIdbOpening = null;

/**
 * @returns {Promise<IDBDatabase|null>}
 */
function openAudioIdb() {
  if (audioIdb) {
    return Promise.resolve(audioIdb);
  }
  if (audioIdbOpening) {
    return audioIdbOpening;
  }
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  audioIdbOpening = new Promise(function(resolve) {
    try {
      var req = indexedDB.open(AUDIO_IDB_NAME, AUDIO_IDB_VERSION);
      req.onupgradeneeded = function() {
        var db = req.result;
        if (!db.objectStoreNames.contains(AUDIO_IDB_STORE)) {
          var store = db.createObjectStore(AUDIO_IDB_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = function() {
        audioIdb = req.result;
        resolve(audioIdb);
      };
      req.onerror = function() {
        audioIdbOpening = null;
        resolve(null);
      };
    } catch (e) {
      audioIdbOpening = null;
      resolve(null);
    }
  });
  return audioIdbOpening;
}

/**
 * @param {string} cacheKey
 * @returns {string}
 */
function audioIdbRecordId(cacheKey) {
  return hashText(cacheKey);
}

/**
 * 旧 localStorage 音声を IndexedDB へ移す
 */
function migrateLocalStorageAudioToIdb() {
  openAudioIdb().then(function(db) {
    if (!db) {
      return;
    }
    var toMove = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(CACHE_PREFIX) === 0) {
          toMove.push(key);
        }
      }
    } catch (e) {
      return;
    }
    toMove.forEach(function(key) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) {
          return;
        }
        var parsed = JSON.parse(raw);
        if (!parsed || !parsed.audioContent) {
          return;
        }
        var id = key.replace(CACHE_PREFIX, '');
        putAudioIdbRecord({
          id: id,
          audioContent: parsed.audioContent,
          timestamp: parsed.timestamp || Date.now(),
          textHash: parsed.textHash || id,
          byteLength: String(parsed.audioContent).length
        });
        localStorage.removeItem(key);
      } catch (e2) {
        // ignore
      }
    });
    refreshAudioIdbStats();
  });
}

/**
 * @param {Object} record
 */
function putAudioIdbRecord(record) {
  openAudioIdb().then(function(db) {
    if (!db || !record || !record.id) {
      return;
    }
    evictAudioIdbIfNeeded(record.byteLength || 0, function() {
      try {
        var tx = db.transaction(AUDIO_IDB_STORE, 'readwrite');
        tx.objectStore(AUDIO_IDB_STORE).put(record);
      } catch (e) {
        // ignore
      }
    });
  });
}

/**
 * @param {string} id
 * @param {function(Object|null): void} onDone
 */
function getAudioIdbRecord(id, onDone) {
  openAudioIdb().then(function(db) {
    if (!db) {
      onDone(null);
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readonly');
      var req = tx.objectStore(AUDIO_IDB_STORE).get(id);
      req.onsuccess = function() {
        onDone(req.result || null);
      };
      req.onerror = function() {
        onDone(null);
      };
    } catch (e) {
      onDone(null);
    }
  });
}

/**
 * @param {string} id
 */
function deleteAudioIdbRecord(id) {
  openAudioIdb().then(function(db) {
    if (!db || !id) {
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readwrite');
      tx.objectStore(AUDIO_IDB_STORE).delete(id);
    } catch (e) {
      // ignore
    }
  });
}

/**
 * 300MB を超えそうなら古い順に削除
 * @param {number} incomingBytes
 * @param {function(): void} onReady
 */
function evictAudioIdbIfNeeded(incomingBytes, onReady) {
  var done = typeof onReady === 'function' ? onReady : function() {};
  openAudioIdb().then(function(db) {
    if (!db) {
      done();
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readwrite');
      var store = tx.objectStore(AUDIO_IDB_STORE);
      var req = store.getAll();
      req.onsuccess = function() {
        var rows = req.result || [];
        var total = incomingBytes || 0;
        rows.forEach(function(row) {
          total += Number(row.byteLength || 0);
        });
        if (total <= MAX_AUDIO_IDB_BYTES) {
          done();
          return;
        }
        rows.sort(function(a, b) {
          return (a.timestamp || 0) - (b.timestamp || 0);
        });
        var i = 0;
        while (total > MAX_AUDIO_IDB_BYTES && i < rows.length) {
          total -= Number(rows[i].byteLength || 0);
          store.delete(rows[i].id);
          i++;
        }
        done();
      };
      req.onerror = function() {
        done();
      };
    } catch (e) {
      done();
    }
  });
}

function refreshAudioIdbStats(onDone) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  var targets = collectAudioPrefetchJobs();
  idbAudioTargetCount = targets.length;
  openAudioIdb().then(function(db) {
    if (!db) {
      audioIdbHaveIds = {};
      idbAudioReadyCount = 0;
      idbAudioBytes = 0;
      refreshLoadDiagUi();
      done();
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readonly');
      var req = tx.objectStore(AUDIO_IDB_STORE).getAll();
      req.onsuccess = function() {
        var rows = req.result || [];
        var bytes = 0;
        var ready = 0;
        var have = {};
        rows.forEach(function(row) {
          bytes += Number(row.byteLength || 0);
          if (row && row.id) {
            have[row.id] = true;
          }
        });
        targets.forEach(function(job) {
          if (have[job.idbId]) {
            ready++;
          }
        });
        audioIdbHaveIds = have;
        idbAudioBytes = bytes;
        idbAudioReadyCount = ready;
        refreshLoadDiagUi();
        done();
      };
      req.onerror = function() {
        refreshLoadDiagUi();
        done();
      };
    } catch (e) {
      refreshLoadDiagUi();
      done();
    }
  });
}

/**
 * メモリキャッシュから取得（同期）
 */
function getCachedAudio(text, voiceGender, speed) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  if (audioCache[cacheKey]) {
    return { audioData: audioCache[cacheKey], source: 'memory' };
  }
  return null;
}

/**
 * IndexedDB から取得してメモリへ載せる
 * @param {function({ audioData: Object, source: string }|null): void} onDone
 */
function getCachedAudioFromIdb(text, voiceGender, speed, onDone) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  var mem = getCachedAudio(text, voiceGender, speed);
  if (mem) {
    onDone(mem);
    return;
  }
  getAudioIdbRecord(audioIdbRecordId(cacheKey), function(record) {
    if (!record || !record.audioContent) {
      onDone(null);
      return;
    }
    var audioData = {
      audioContent: record.audioContent,
      timestamp: record.timestamp,
      textHash: record.textHash
    };
    ensureMp3BlobOnAudioData(audioData);
    audioCache[cacheKey] = audioData;
    onDone({ audioData: audioData, source: 'indexedDB' });
  });
}

/**
 * 音声データをキャッシュに保存
 */
function saveAudioToCache(text, audioContent, voiceGender, speed) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  var audioData = {
    audioContent: audioContent,
    timestamp: Date.now(),
    textHash: hashText(cacheKey)
  };
  ensureMp3BlobOnAudioData(audioData);
  audioCache[cacheKey] = audioData;
  putAudioIdbRecord({
    id: audioIdbRecordId(cacheKey),
    audioContent: audioContent,
    timestamp: audioData.timestamp,
    textHash: audioData.textHash,
    byteLength: String(audioContent || '').length
  });
  setTimeout(refreshAudioIdbStats, 0);
  return audioData;
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
 * @param {string} [source]
 */
function playAudioFromCache(audioData, fieldType, source) {
  if (!audioData || !audioData.audioContent) {
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    if (activePlayField === fieldType) {
      clearAudioBusyWatchdogs_();
      activePlayField = null;
      updateFieldPlayButtons();
    }
    return;
  }

  if (source) {
    showAudioSourceDebug(source);
  }
  
  try {
    clearAudioBusyWatchdogs_();
    releaseCurrentAudioElement();
    
    var audio = createMp3AudioFromAudioData(audioData);
    currentAudio = audio;
    activePlayField = fieldType || null;
    updateFieldPlayButtons();

    var playbackStarted = false;

    function isThisAudio_() {
      return currentAudio === audio;
    }

    function settleThisPlay_(reason) {
      clearAudioBusyWatchdogs_();
      if (!isThisAudio_() && activePlayField !== fieldType) {
        return;
      }
      if (isThisAudio_()) {
        activePlayField = null;
        releaseCurrentAudioElement();
      } else if (activePlayField === fieldType) {
        activePlayField = null;
      }
      updateFieldPlayButtons();
      if (fieldType === 'question') {
        onQuestionAudioSettled(reason);
      }
      if (reason === 'ended' || reason === 'fail') {
        audioPrefetchPlayBlocked = false;
        scheduleAudioPrefetch();
        processGasAudioFetchQueue();
      }
    }
    
    audio.addEventListener('ended', function() {
      if (!isThisAudio_()) return;
      settleThisPlay_('ended');
    });
    
    audio.addEventListener('error', function() {
      if (!isThisAudio_()) return;
      settleThisPlay_('fail');
    });

    audio.addEventListener('loadedmetadata', function() {
      if (!isThisAudio_()) return;
      if (audioBusyWatchdogTimer) {
        armAudioBusyWatchdog_(audio);
      }
    });

    audio.addEventListener('playing', function() {
      if (!isThisAudio_()) return;
      playbackStarted = true;
      if (audioPauseStuckTimer) {
        clearTimeout(audioPauseStuckTimer);
        audioPauseStuckTimer = null;
      }
      if (audioPlayStartTimer) {
        clearTimeout(audioPlayStartTimer);
        audioPlayStartTimer = null;
      }
      armAudioBusyWatchdog_(audio);
    });

    audio.addEventListener('pause', function() {
      if (!isThisAudio_()) return;
      if (!playbackStarted) return;
      if (audio.ended) return;
      if (audioPauseStuckTimer) {
        clearTimeout(audioPauseStuckTimer);
      }
      audioPauseStuckTimer = setTimeout(function() {
        audioPauseStuckTimer = null;
        if (!isThisAudio_()) return;
        if (!audio.paused || audio.ended) return;
        settleThisPlay_('fail');
      }, AUDIO_PAUSE_STUCK_MS);
    });

    audioPlayStartTimer = setTimeout(function() {
      audioPlayStartTimer = null;
      if (!isThisAudio_()) return;
      settleThisPlay_('fail');
    }, AUDIO_PLAY_START_TIMEOUT_MS);
    
    playAudioElementWhenReady(audio).then(function() {
      if (audioPlayStartTimer) {
        clearTimeout(audioPlayStartTimer);
        audioPlayStartTimer = null;
      }
      if (!isThisAudio_()) return;
      armAudioBusyWatchdog_(audio);
    }).catch(function(error) {
      if (isAbortError(error)) {
        settleThisPlay_('abort');
        return;
      }
      showError('音声の再生に失敗しました: ' + error.toString());
      settleThisPlay_('fail');
    });
  } catch (error) {
    showError('音声の再生に失敗しました: ' + error.toString());
    clearAudioBusyWatchdogs_();
    activePlayField = null;
    releaseCurrentAudioElement();
    updateFieldPlayButtons();
    if (fieldType === 'question') onQuestionAudioSettled('fail');
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
 * Drive から音声を取得し、無ければ TTS
 * @param {string} text
 * @param {string} voiceGender
 * @param {string} speed
 * @param {string} fieldType
 * @param {string} sheetField
 * @param {Object} item
 * @param {AbortSignal|null} signal
 * @param {number} generation
 * @param {function(): void} done
 */
function fetchAudioFromDriveOrTts(text, voiceGender, speed, fieldType, sheetField, item, signal, generation, done) {
  activePlayField = fieldType || null;
  showPlayButtonLoading(fieldType);
  refreshAdvanceNavControls();
  beginLoadDiag('run', 'Drv', AUDIO_FETCH_MAX_ATTEMPTS, {
    queueWait: gasAudioFetchQueue.length
  });

  function attemptDrive(attemptIndex) {
    if (generation !== activeAudioFetchGeneration) {
      done();
      return;
    }
    updateLoadDiag('run', {
      phase: 'Drv',
      attempt: attemptIndex,
      maxAttempts: AUDIO_FETCH_MAX_ATTEMPTS,
      status: '取得中',
      queueWait: gasAudioFetchQueue.length
    });

    var params = new URLSearchParams();
    params.append('action', 'getDriveAudio');
    params.append('id', String(item.id));
    params.append('categoryNo', String(resolveItemCategoryNo(item)));
    params.append('no', String(item.no));
    params.append('field', sheetField);
    params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
    params.append('speed', speed || AUDIO_SPEED_FIXED);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params, {
      signal: signal,
      httpErrorPrefix: 'drive fetch failed: '
    })
    .then(function(data) {
      if (generation !== activeAudioFetchGeneration) {
        done();
        return;
      }
      if (data && data.success && data.found && data.audioContent) {
        hidePlayButtonLoading(fieldType);
        var cachedData = saveAudioToCache(text, data.audioContent, voiceGender || AUDIO_VOICE_DEFAULT, speed || AUDIO_SPEED_FIXED);
        finishLoadDiag('run', 'OK', {
          ok: true,
          bytes: String(data.audioContent).length
        });
        done();
        setTimeout(function() {
          if (generation !== activeAudioFetchGeneration) return;
          playAudioFromCache(cachedData, fieldType, 'Drive');
        }, 0);
        return;
      }
      var businessError = (data && data.error) ? String(data.error) : '';
      if (
        businessError &&
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioBusinessError(businessError)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(businessError)
        });
        var bizDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptDrive(attemptIndex + 1);
        }, bizDelay);
        return;
      }
      finishLoadDiag('run', data && data.success && data.found === false ? 'miss' : loadDiagStatusFromError(businessError || 'miss'), {
        ok: false
      });
      fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, done);
    })
    .catch(function(error) {
      if (generation !== activeAudioFetchGeneration) {
        done();
        return;
      }
      if (isAbortError(error)) {
        finishLoadDiag('run', 'abort', { ok: false });
        handleAudioFetchAbortOrTimeout(fieldType, false);
        done();
        return;
      }
      if (
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioNetworkError(error)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(error)
        });
        var netDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptDrive(attemptIndex + 1);
        }, netDelay);
        return;
      }
      finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false });
      fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, done);
    });
  }

  attemptDrive(0);
}

/**
 * APIから音声データを取得
 * @param {string} text - 読み上げるテキスト
 * @param {string} voiceGender - 音声の性別（'male' または 'female'）
 * @param {string} speed - 読み上げの速さ（'fast', 'medium', 'slow'）
 * @param {string} fieldType - 'question' | 'answer'
 * @param {Object} [item]
 * @param {string} [sheetField]
 * @param {AbortSignal|null} [signal]
 * @param {number} [generation]
 * @param {function(): void} [done]
 */
function fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, done) {
  activePlayField = fieldType || null;
  showPlayButtonLoading(fieldType);
  refreshAdvanceNavControls();

  var gen = (generation == null) ? activeAudioFetchGeneration : generation;
  var finish = typeof done === 'function' ? done : function() {};

  beginLoadDiag('run', 'TTS', AUDIO_FETCH_MAX_ATTEMPTS, {
    queueWait: gasAudioFetchQueue.length
  });

  function failAudio(errorText) {
    finishLoadDiag('run', loadDiagStatusFromError(errorText), { ok: false });
    hidePlayButtonLoading(fieldType);
    activePlayField = null;
    updateFieldPlayButtons();
    showError(errorText);
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    finish();
  }

  function attemptTts(attemptIndex) {
    if (gen !== activeAudioFetchGeneration) {
      finish();
      return;
    }
    updateLoadDiag('run', {
      phase: 'TTS',
      attempt: attemptIndex,
      maxAttempts: AUDIO_FETCH_MAX_ATTEMPTS,
      status: '取得中',
      queueWait: gasAudioFetchQueue.length
    });

    var params = new URLSearchParams();
    params.append('text', text);
    params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
    params.append('speed', speed || AUDIO_SPEED_FIXED);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params, { signal: signal })
    .then(function(data) {
      if (gen !== activeAudioFetchGeneration) {
        finish();
        return;
      }

      if (data && data.success && data.audioContent) {
        hidePlayButtonLoading(fieldType);
        var cachedData = saveAudioToCache(text, data.audioContent, voiceGender || AUDIO_VOICE_DEFAULT, speed || AUDIO_SPEED_FIXED);
        if (item && sheetField) {
          saveDriveAudioAsync(item, sheetField, voiceGender || AUDIO_VOICE_DEFAULT, speed || AUDIO_SPEED_FIXED, data.audioContent);
        }
        finishLoadDiag('run', 'OK', {
          ok: true,
          bytes: String(data.audioContent).length
        });
        finish();
        setTimeout(function() {
          if (gen !== activeAudioFetchGeneration) return;
          playAudioFromCache(cachedData, fieldType, 'TTS');
        }, 0);
        return;
      }

      var errMsg = (data && data.error) || 'Unknown error';
      if (
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioBusinessError(errMsg)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(errMsg)
        });
        var bizDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptTts(attemptIndex + 1);
        }, bizDelay);
        return;
      }
      failAudio('音声の生成に失敗しました: ' + errMsg);
    })
    .catch(function(error) {
      if (gen !== activeAudioFetchGeneration) {
        finish();
        return;
      }
      if (isAbortError(error)) {
        finishLoadDiag('run', 'abort', { ok: false });
        handleAudioFetchAbortOrTimeout(fieldType, false);
        finish();
        return;
      }
      if (
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioNetworkError(error)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(error)
        });
        var netDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptTts(attemptIndex + 1);
        }, netDelay);
        return;
      }
      failAudio('音声読み上げエラー: ' + error.toString());
    });
  }

  attemptTts(0);
}

/**
 * TTSプリロード全体が有効か（定数マスタ）
 * @returns {boolean}
 */
function isTtsPreloadEnabled() {
  return ENABLE_AUDIO_PREFETCH === true;
}

function shouldPreloadQuestionAudio() {
  return ENABLE_AUDIO_PREFETCH === true;
}

function shouldPreloadAnswerAudio() {
  return ENABLE_AUDIO_PREFETCH === true;
}

function preloadAudioForCurrentAndNext() {
  scheduleAudioPrefetch();
}

function preloadNextQuestions() {
  scheduleAudioPrefetch();
}

/**
 * 先読み対象アイテム（表示カテゴリ、重複なし）
 * @returns {Object[]}
 */
function collectAudioPrefetchItems() {
  var byId = {};
  function addList(list) {
    (list || []).forEach(function(it) {
      if (!it || it.id == null) {
        return;
      }
      if (!isCategoryNoVisible(it.category_no != null ? it.category_no : resolveItemCategoryNo(it))) {
        return;
      }
      byId[String(it.id)] = it;
    });
  }
  addList(currentCategoryData);
  addList(durationModeSortedItems);
  addList(lastDateModeAllItems);
  Object.keys(categoryDataByNo).forEach(function(key) {
    addList(categoryDataByNo[key]);
  });
  addList(readLocalAllStudyItems());
  var items = [];
  Object.keys(byId).forEach(function(id) {
    items.push(byId[id]);
  });
  return items;
}

/**
 * Drive／IdB 揃い用ジョブ（出題＋解答、いまの声・速さ）
 * @returns {Array<{item: Object, text: string, voice: string, speed: string, field: string, idbId: string, priority: number}>}
 */
function collectAudioPrefetchJobs() {
  var qVoice = getAudioVoice('question');
  var qSpeed = getAudioSpeed('question');
  var aVoice = getAudioVoice('answer');
  var aSpeed = getAudioSpeed('answer');
  var jobs = [];
  var currentId = null;
  var current = getCurrentLearningItem();
  if (current && current.id != null) {
    currentId = String(current.id);
  }
  var sessionIds = {};
  (currentCategoryData || []).forEach(function(it, idx) {
    if (it && it.id != null) {
      sessionIds[String(it.id)] = idx;
    }
  });
  var items = collectAudioPrefetchItems();
  items.forEach(function(item) {
    var idStr = String(item.id);
    var sessionIdx = sessionIds.hasOwnProperty(idStr) ? sessionIds[idStr] : 9999;
    var pri = 50;
    if (currentId && idStr === currentId) {
      pri = 0;
    } else if (sessionIdx >= 0 && sessionIdx < 9999) {
      var dist = Math.abs(sessionIdx - (currentQuestionIndex || 0));
      pri = dist <= 2 ? dist : 10 + dist;
    }
    function pushField(displayField, text, voice, speed) {
      if (!text || isImageUrl(text)) {
        return;
      }
      var cacheKey = normalizeTextForTTS(text) + '_' + voice + '_' + speed;
      jobs.push({
        item: item,
        text: text,
        voice: voice,
        speed: speed,
        field: getSheetAudioFieldType(displayField),
        idbId: audioIdbRecordId(cacheKey),
        priority: pri
      });
    }
    pushField('question', getEffectiveQuestion(item), qVoice, qSpeed);
    pushField('answer', getEffectiveAnswer(item), aVoice, aSpeed);
  });
  jobs.sort(function(a, b) {
    return a.priority - b.priority;
  });
  return jobs;
}

/**
 * 先読みの再確認タイマーを止める
 */
function clearAudioPrefetchRecheck_() {
  if (audioPrefetchRecheckTimer) {
    clearTimeout(audioPrefetchRecheckTimer);
    audioPrefetchRecheckTimer = null;
  }
}

/**
 * 先読み失敗後の再開間隔
 * @returns {number}
 */
function audioPrefetchBackoffMs_() {
  var exp = Math.max(0, audioPrefetchFailStreak - 1);
  var ms = AUDIO_PREFETCH_FAIL_BACKOFF_MS * Math.pow(2, exp);
  return Math.min(AUDIO_PREFETCH_FAIL_BACKOFF_MAX_MS, ms);
}

/**
 * 未取得が残るとき、間隔後に先読みを組み直す
 * @param {number} delayMs
 */
function armAudioPrefetchRecheck_(delayMs) {
  clearAudioPrefetchRecheck_();
  if (!ENABLE_AUDIO_PREFETCH || audioPrefetchStopped) {
    return;
  }
  audioPrefetchRecheckTimer = setTimeout(function() {
    audioPrefetchRecheckTimer = null;
    scheduleAudioPrefetch();
  }, delayMs);
}

/**
 * 先読みキューが空になったあと、未取得が残れば再確認する
 */
function onAudioPrefetchQueueIdle_() {
  refreshAudioIdbStats(function() {
    if (audioPrefetchStopped) {
      return;
    }
    if (idbAudioTargetCount > 0 && idbAudioReadyCount >= idbAudioTargetCount) {
      return;
    }
    armAudioPrefetchRecheck_(AUDIO_PREFETCH_RECHECK_MS);
  });
}

/**
 * 先読みの通信失敗。完全停止せず間隔を空けて再開する
 */
function noteAudioPrefetchFailure_() {
  audioPrefetchFailStreak += 1;
  gasAudioPrefetchQueue = [];
  armAudioPrefetchRecheck_(audioPrefetchBackoffMs_());
}

/**
 * 先読みキューを組み直す（Driveのみ。TTSしない）
 */
function scheduleAudioPrefetch() {
  if (!ENABLE_AUDIO_PREFETCH || audioPrefetchStopped) {
    return;
  }
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    return;
  }
  if (!userEmail || !hasUsableAuth()) {
    return;
  }
  if (gasAudioPrefetchQueue.length > 0 || isAudioPrefetchJobRunning) {
    return;
  }
  if (isFieldAudioBusy() || audioPrefetchPlayBlocked) {
    armAudioPrefetchRecheck_(AUDIO_PREFETCH_RECHECK_MS);
    return;
  }
  clearAudioPrefetchRecheck_();
  var jobs = collectAudioPrefetchJobs();
  idbAudioTargetCount = jobs.length;
  var queued = 0;
  jobs.forEach(function(job) {
    if (getCachedAudio(job.text, job.voice, job.speed)) {
      return;
    }
    if (audioIdbHaveIds[job.idbId]) {
      return;
    }
    queued += 1;
    enqueueGasAudioFetch(function(signal, generation, done) {
      prefetchOneDriveAudio(job, signal, generation, done);
    }, { prefetch: true });
  });
  if (queued === 0) {
    onAudioPrefetchQueueIdle_();
    return;
  }
  refreshAudioIdbStats();
  processGasAudioFetchQueue();
}

function ensureAudioPrefetchInventory() {
  if (getMemoryAllStudyItems().length) {
    scheduleAudioPrefetch();
    return;
  }
  fetchAllStudyItemsFromServer(function(err, items, meta) {
    if (items && items.length) {
      writeLocalStudyBundle(items, meta && meta.dataGeneration);
    }
    scheduleAudioPrefetch();
  });
}

/**
 * 先読み1本（Drive hit のみ。miss は TTS しない）
 */
function prefetchOneDriveAudio(job, signal, generation, done) {
  if (generation !== activeAudioFetchGeneration) {
    done();
    return;
  }
  if (!canUseDriveAudioMeta(job.item)) {
    done();
    return;
  }
  getCachedAudioFromIdb(job.text, job.voice, job.speed, function(cached) {
    if (cached) {
      done();
      return;
    }
    ensureFreshGoogleAuthToken(function() {
      if (generation !== activeAudioFetchGeneration) {
        done();
        return;
      }
      beginLoadDiag('run', '先読み', 1, {
        status: '取得中',
        queueWait: gasAudioPrefetchQueue.length
      });
      var timedOut = false;
      var timeoutId = setTimeout(function() {
        timedOut = true;
        try {
          if (signal && typeof signal.throwIfAborted !== 'function' && activeAudioFetchAbort) {
            activeAudioFetchAbort.abort();
          } else if (activeAudioFetchAbort) {
            activeAudioFetchAbort.abort();
          }
        } catch (eAbort) {
          // ignore
        }
      }, AUDIO_PREFETCH_TIMEOUT_MS);

      var params = new URLSearchParams();
      params.append('action', 'getDriveAudio');
      params.append('id', String(job.item.id));
      params.append('categoryNo', String(resolveItemCategoryNo(job.item)));
      params.append('no', String(job.item.no));
      params.append('field', job.field);
      params.append('voiceGender', job.voice);
      params.append('speed', job.speed);
      appendAuthParams(params);
      params.append('referer', window.location.origin);

      postGasJson(params, {
        signal: signal,
        httpErrorPrefix: 'drive fetch failed: '
      })
        .then(function(data) {
          if (timedOut) {
            throw new Error('タイムアウト');
          }
          clearTimeout(timeoutId);
          if (generation !== activeAudioFetchGeneration) {
            done();
            return;
          }
          if (data && data.success && data.found && data.audioContent) {
            saveAudioToCache(job.text, data.audioContent, job.voice, job.speed);
            finishLoadDiag('run', 'OK', { ok: true, bytes: String(data.audioContent).length });
            audioPrefetchFailStreak = 0;
            done();
            return;
          }
          finishLoadDiag('run', 'miss', { ok: false });
          audioPrefetchFailStreak = 0;
          done();
        })
        .catch(function(error) {
          clearTimeout(timeoutId);
          if (generation !== activeAudioFetchGeneration || isAbortError(error)) {
            if (timedOut) {
              finishLoadDiag('run', 'timeout', { ok: false });
              noteAudioPrefetchFailure_();
            }
            done();
            return;
          }
          finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false });
          noteAudioPrefetchFailure_();
          done();
        });
    }, function() {
      audioPrefetchStopped = true;
      gasAudioPrefetchQueue = [];
      clearAudioPrefetchRecheck_();
      done();
    });
  });
}

function fetchDriveAudioCoverage() {
  if (!userEmail || !hasUsableAuth()) {
    return;
  }
  var nos = getSavedVisibleCategoryNos();
  if (!nos || !nos.length) {
    nos = (categories || []).filter(function(cat) {
      return cat && !isEndCategory(cat);
    }).map(function(cat) {
      return cat.no;
    });
  }
  var params = new URLSearchParams();
  params.append('action', 'getDriveAudioCoverage');
  params.append('categoryNos', JSON.stringify(nos || []));
  params.append('voiceGenderQuestion', getAudioVoice('question'));
  params.append('speedQuestion', getAudioSpeed('question'));
  params.append('voiceGenderAnswer', getAudioVoice('answer'));
  params.append('speedAnswer', getAudioSpeed('answer'));
  appendAuthParams(params);
  params.append('referer', window.location.origin);
  postGasJson(params)
    .then(function(data) {
      if (data && data.success) {
        driveAudioTargetCount = Number(data.target) || 0;
        driveAudioReadyCount = Number(data.ready) || 0;
        refreshLoadDiagUi();
      }
    })
    .catch(function() {
      // 診断用。失敗しても学習は続ける
    });
}

function preloadAudio(text, voiceGender, speed, item, sheetField) {
  if (!text || !item) {
    return;
  }
  enqueueGasAudioFetch(function(signal, generation, done) {
    prefetchOneDriveAudio({
      item: item,
      text: text,
      voice: voiceGender || AUDIO_VOICE_DEFAULT,
      speed: speed || AUDIO_SPEED_FIXED,
      field: sheetField || 'question',
      idbId: audioIdbRecordId(normalizeTextForTTS(text) + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED))
    }, signal, generation, done);
  }, { prefetch: true });
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
  flushPendingAnsSheetPersist();
  clearAudioSourceDebug();
  
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
  flushPendingAnsSheetPersist();
  
  // RetryCount を非同期で +1（学習フローは止めない）
  var plusTargetItem = getCurrentLearningItem();
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
  if (isDurationQuestionMethod()) {
    if (!durationModeSessionItems || durationModeSessionItems.length === 0) {
      return;
    }
    currentCategoryData = durationModeSessionItems.slice();
    selectedQuestionIndices = [];
    justCompletedCategoryNo = null;
    isDurationCompletionSessionView = false;
    isCategoryCompletionSessionView = false;
    hideCompletionMessage();
    startLearning();
    return;
  }
  if (isLastDateQuestionMethod()) {
    if (!lastDateModeSessionItems || lastDateModeSessionItems.length === 0) {
      return;
    }
    currentCategoryData = lastDateModeSessionItems.slice();
    selectedQuestionIndices = [];
    justCompletedCategoryNo = null;
    isLastDateCompletionSessionView = false;
    isCategoryCompletionSessionView = false;
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
    var currentItem = getCurrentLearningItem() || currentCategoryData[currentQuestionIndex];
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
    updateListNavButtons();
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
  syncLearningCompletedScreenClass();
  
  // 学習中・完了とも：[Ans再生] [中央] [プラス] [Q再生] [HOME]
  setLearningNavIconsNormal();
  updateNavAnswerButton();
  updateHomeButton();
}

/**
 * 学習完了時の screen2 クラスを同期（完了画面のスクロールバー非表示用）
 */
function syncLearningCompletedScreenClass() {
  var screen2 = document.getElementById('screen2');
  if (!screen2) return;
  if (isLearningCompleted) {
    screen2.classList.add('is-learning-completed');
  } else {
    screen2.classList.remove('is-learning-completed');
  }
}

/**
 * 下ナビレイアウトを学習用に整える（互換用。出題再生スロットが右枠を担う）
 */
function setNextButtonAsUnusedSpacer() {
  // 旧 >> スペーサーは出題再生スロットに置き換えたため、追加処理なし
}

/**
 * 中央ナビボタン（Ans / Next）のクリック処理
 */
function handleNavAnswerButtonClick() {
  var navAnswerButton = document.getElementById('navAnswerButton');
  if (navAnswerButton && navAnswerButton.disabled) return;
  if (isNavActionLockedByAudio()) return;
  
  if (isLearningCompleted) {
    var afterCompletionNavClick = function() {
      if (shouldShowCompletionStartButton()) {
        startLearningFromCompletion();
      } else {
        navigateCompletionCategory(1);
      }
    };
    if (shouldShowCompletionStartButton()) {
      playStartSfxThen(afterCompletionNavClick);
    } else {
      playUiClickSfxThen(afterCompletionNavClick);
    }
    return;
  }
  if (isAnswerShown) {
    if (isAdvanceNavBlockedByAudio()) return;
    if (isLastQuestionInCurrentFlow()) {
      if (navAnswerButton) {
        navAnswerButton.disabled = true;
      }
      stopCurrentAudioPlayback({ skipButtonUpdate: true, keepAudioQueue: false });
      goToNextQuestion();
      return;
    }
    playUiClickSfxThen(goToNextQuestion);
    return;
  }
  playUiClickSfxThen(showAnswer);
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
      navAnswerButton.disabled = isCategoryTransitionInProgress || isNavActionLockedByAudio();
      if (isCategoryTransitionInProgress) {
        navAnswerButton.title = 'カテゴリの切り替え中です';
      } else if (isNavActionLockedByAudio()) {
        navAnswerButton.title = '音声の再生が終わるまでお待ちください';
      } else {
        navAnswerButton.removeAttribute('title');
      }
    } else {
      navAnswerText.textContent = 'Next';
      navAnswerText.classList.remove('blinking');
      var blocked;
      if (isDurationQuestionMethod()) {
        if (isDurationCompletionSessionView) {
          blocked = isCategoryTransitionInProgress;
        } else {
          var pageCount = getDurationModePageCount();
          blocked = pageCount <= 0 || durationModePageIndex >= pageCount - 1 || isCategoryTransitionInProgress;
        }
      } else if (isLastDateQuestionMethod()) {
        blocked = isCategoryTransitionInProgress;
      } else {
        var idx = getCurrentCategoryIndex();
        blocked = (idx < 0 || findSelectableCategoryIndex(idx, 1) < 0) || isCategoryTransitionInProgress;
      }
      navAnswerButton.disabled = blocked || isNavActionLockedByAudio();
      if (isCategoryTransitionInProgress) {
        navAnswerButton.title = 'カテゴリの切り替え中です';
      } else if (isNavActionLockedByAudio()) {
        navAnswerButton.title = '音声の再生が終わるまでお待ちください';
      } else if (blocked) {
        if (isDurationQuestionMethod()) {
          navAnswerButton.title = '次のページがありません';
        } else if (isLastDateQuestionMethod()) {
          navAnswerButton.removeAttribute('title');
        } else {
          navAnswerButton.title = '次のカテゴリがありません';
        }
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
      navAnswerButton.title = '音声の再生が終わるまでお待ちください';
    } else {
      navAnswerButton.disabled = false;
      navAnswerButton.removeAttribute('title');
    }
    return;
  }
  
  navAnswerText.textContent = 'Ans';
  if (waitingListeningAnsGate || isNavActionLockedByAudio()) {
    navAnswerText.classList.remove('blinking');
    navAnswerButton.disabled = true;
    navAnswerButton.title = '音声の再生が終わるまでお待ちください';
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
 * 学習ナビを通常状態にする（左＝Ans再生、右＝Q再生）
 */
function setLearningNavIconsNormal() {
  var navBar = document.querySelector('.navigation-bar');
  if (navBar) {
    navBar.classList.remove('completion-browse-order');
  }
  setNextButtonAsUnusedSpacer();
  updateNavAnswerButton();
}

/**
 * 学習完了時の下ナビ前後は廃止。通常レイアウトのまま中央 Next／Category 下ナビで閲覧する
 */
function setLearningNavIconsCategoryMode() {
  setLearningNavIconsNormal();
  updateFieldPlayButtons();
}

/**
 * 学習完了時：下ナビ前後は使わない。中央 Next の有効状態のみ更新
 */
function updateCompletionCategoryNav() {
  if (!isLearningCompleted) {
    return;
  }
  setLearningNavIconsNormal();
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
  if (container) {
    container.style.display = 'none';
    container.style.minHeight = '';
  }
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
  if (isDurationQuestionMethod()) {
    // 完了直後（今回学習分表示）＋未選択 → Next（再ソートへ）
    // 選択あり → Start（今回分の選択学習）
    // 再ソート後（セッション表示終了）→ Start（未選択＝表示中ページ全件）
    if (isDurationCompletionSessionView) {
      return selectedQuestionIndices.length > 0;
    }
    return true;
  }
  if (isLastDateQuestionMethod()) {
    // 完了直後（今回学習分表示）＋未選択 → Next（再抽選へ）
    // 選択あり → Start（今回分の選択学習）
    // 再抽選後 → Start（未選択＝表示中7件全件）
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
  // Next / << / >> 操作時はお祝いメッセージを透明化し、出題ブロックを畳んで上端へ
  hideCompletionCongratsMessage();
  ensureCompletionBrowseLayout(function() {
    if (isDurationQuestionMethod()) {
      navigateDurationModePage(direction);
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
  });
}

/**
 * 学習完了画面：カテゴリデータを取得してList表示（学習開始しない）
 * @param {string|number} categoryNo
 */
function loadCategoryDataForCompletionBrowse(categoryNo) {
  if (!isLearningCompleted) {
    return;
  }
  hideCompletionCongratsMessage();
  ensureCompletionBrowseLayout(function() {
    loadCategoryDataForCompletionBrowseInner(categoryNo);
  });
}

/**
 * 学習完了画面：カテゴリデータ取得の本体（レイアウト畳み込み後）
 * @param {string|number} categoryNo
 */
function loadCategoryDataForCompletionBrowseInner(categoryNo) {
  // 閲覧操作後は出題側Listへ（完了直後セッション表示を終了）
  isCategoryCompletionSessionView = false;
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
  
  var localCached = getItemsForCategoryFromLocal(categoryNo);
  if (localCached && localCached.length > 0) {
    categoryDataByNo[categoryKey] = localCached;
    if (isCategoryShuffleQuestionMethod() && String(currentCategoryNo) === categoryKey && currentCategoryData.length > 0) {
      currentCategoryData = mergeCategoryItemsPreserveOrder(currentCategoryData, localCached);
      displayList();
      syncCategoryLastDateFromList();
      finishCompletionCategoryBrowse();
    } else {
      applyLoadedCompletionCategoryData(categoryNo, localCached, false);
    }
  } else {
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    finishCompletionCategoryBrowse();
  }
  maybeRefreshStudyItemsFromGeneration({
    preserveValue: categoryKey,
    source: 'completionBrowse'
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
  
  var source = items || [];
  var categoryKey = String(categoryNo);
  categoryDataByNo[categoryKey] = source;

  if (isCategoryShuffleQuestionMethod()) {
    currentCategoryData = shuffleArray(source);
  } else {
    currentCategoryData = source;
  }
  currentCategoryNo = categoryNo;
  selectedQuestionIndices = [];
  
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
  updateListNavButtons();
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
  isDurationCompletionSessionView = false;
  isLastDateCompletionSessionView = false;
  isCategoryCompletionSessionView = false;
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
  
  releaseCurrentAudioElement();
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
  
  var items = getItemsForCategoryFromLocal(categoryNo);
  if (!items.length) {
    showError('データがありません');
    finishCompletionCategoryBrowse();
    return;
  }
  categoryDataByNo[String(categoryNo)] = items;
  if (isCategoryShuffleQuestionMethod()) {
    currentCategoryData = shuffleArray(items);
  } else {
    currentCategoryData = items;
  }
  currentCategoryNo = categoryNo;
  if (forceAllQuestions) {
    selectedQuestionIndices = [];
  }
  hideCompletionListSection();
  justCompletedCategoryNo = null;
  isDurationCompletionSessionView = false;
  isLastDateCompletionSessionView = false;
  isCategoryCompletionSessionView = false;
  startLearning();
}

// プラスボタンの状態を更新
function updatePlusButton() {
  var plusButton = document.getElementById('plusButton');
  if (!plusButton) return;

  var retrySlot = document.getElementById('navRetrySlot');
  var badge = plusButton.querySelector('.plus-retry-badge');

  function setRetrySlotInactive(inactive) {
    if (!retrySlot) {
      return;
    }
    retrySlot.classList.toggle('is-inactive', !!inactive);
  }
  
  if (isLearningCompleted) {
    plusButton.disabled = isCategoryTransitionInProgress || isNavActionLockedByAudio();
    plusButton.setAttribute('aria-label', '同じカテゴリをもう一度');
    plusButton.title = isCategoryTransitionInProgress ? 'カテゴリの切り替え中です' : '同じカテゴリをもう一度';
    setRetrySlotInactive(plusButton.disabled);
    if (badge) badge.style.display = '';
    return;
  }
  
  if (!isAnswerShown) {
    plusButton.disabled = true;
    plusButton.removeAttribute('title');
    plusButton.setAttribute('aria-label', 'もう一度');
    setRetrySlotInactive(true);
    if (badge) badge.style.display = '';
    return;
  }
  
  if (isAdvanceNavBlockedByAudio() || isNavActionLockedByAudio()) {
    plusButton.disabled = true;
    plusButton.title = '音声の再生が終わるまでお待ちください';
    setRetrySlotInactive(true);
  } else {
    plusButton.disabled = false;
    plusButton.removeAttribute('title');
    setRetrySlotInactive(false);
  }
  plusButton.setAttribute('aria-label', 'もう一度');
  if (badge) badge.style.display = '';
}

/**
 * ページ（window）を上端へスクロール
 * @param {boolean} [smooth]
 */
function scrollPageToTop(smooth) {
  var useSmooth = smooth === true;
  try {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: useSmooth ? 'smooth' : 'auto' });
      return;
    }
  } catch (e) {
    // fall through
  }
  window.scrollTo(0, 0);
  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
  }
}

/**
 * ページ（window）を最下部へスクロール
 */
function scrollPageToBottom() {
  var top = Math.max(
    document.documentElement ? document.documentElement.scrollHeight : 0,
    document.body ? document.body.scrollHeight : 0
  );
  try {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, top);
      return;
    }
  } catch (e) {
    // fall through
  }
  if (document.documentElement) {
    document.documentElement.scrollTop = top;
  }
  if (document.body) {
    document.body.scrollTop = top;
  }
}

/**
 * 学習画面下ナビ＋余白のクリアランス（px）
 * @returns {number}
 */
function getLearningBottomNavClearancePx() {
  var navH = 58;
  try {
    var raw = window.getComputedStyle(document.documentElement)
      .getPropertyValue('--app-nav-height')
      .trim();
    if (raw) {
      var parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) {
        navH = parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  // .container.learning-mode の padding-bottom（nav+12）に少し余裕
  return navH + 12 + 8;
}

/**
 * 完了メッセージ全体が固定下ナビの上に見える位置へスクロール
 */
function scrollPageToShowCompletionMessage() {
  var section = document.getElementById('completionMessageSection');
  if (!section || section.style.display === 'none') {
    scrollPageToBottom();
    return;
  }
  var clearance = getLearningBottomNavClearancePx();
  var rect = section.getBoundingClientRect();
  var pageY = window.pageYOffset ||
    (document.documentElement ? document.documentElement.scrollTop : 0) ||
    (document.body ? document.body.scrollTop : 0) ||
    0;
  var absoluteBottom = pageY + rect.bottom;
  var target = Math.max(0, absoluteBottom - window.innerHeight + clearance);
  try {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, target);
      return;
    }
  } catch (e) {
    // fall through
  }
  if (document.documentElement) {
    document.documentElement.scrollTop = target;
  }
  if (document.body) {
    document.body.scrollTop = target;
  }
}

/**
 * 学習完了画面：ページを上端に同期固定（カテゴリ切替後用）
 */
function maintainCompletionScrollAtTop() {
  if (!isLearningCompleted) {
    return;
  }
  function pin() {
    scrollPageToTop(false);
  }
  pin();
  requestAnimationFrame(function() {
    pin();
    requestAnimationFrame(pin);
  });
}

/**
 * 学習完了画面：ページを最下部に同期固定（初回完了表示用）
 * 出題ブロック畳み後は上端固定に切り替える
 * ※最下部固定ではなく、完了メッセージが下ナビ上に収まる位置へ合わせる
 */
function maintainCompletionScrollAtBottom() {
  if (isCompletionStudyFieldsCollapsed) {
    maintainCompletionScrollAtTop();
    return;
  }
  if (!isLearningCompleted) {
    return;
  }
  function pin() {
    scrollPageToShowCompletionMessage();
  }
  pin();
  requestAnimationFrame(function() {
    pin();
    requestAnimationFrame(pin);
  });
}

/**
 * 完了画面の出題／解答／note 要素を取得
 * @returns {HTMLElement[]}
 */
function getCompletionStudyFieldElements() {
  var ids = ['questionSection', 'answerSection', 'noteSection'];
  var els = [];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) {
      els.push(el);
    }
  }
  return els;
}

/**
 * 完了後カテゴリ切替レイアウト：出題ブロックをフェードアウトして非表示にし、上端へスクロール
 * @param {Function} [done]
 */
function ensureCompletionBrowseLayout(done) {
  var after = typeof done === 'function' ? done : function() {};

  if (completionStudyFieldsCollapseTimerId !== null) {
    clearTimeout(completionStudyFieldsCollapseTimerId);
    completionStudyFieldsCollapseTimerId = null;
  }

  if (isCompletionStudyFieldsCollapsed) {
    maintainCompletionScrollAtTop();
    after();
    return;
  }

  isCategoryTransitionInProgress = true;
  refreshAdvanceNavControls();

  var els = getCompletionStudyFieldElements();
  var visibleCount = 0;
  for (var i = 0; i < els.length; i++) {
    if (els[i].style.display === 'none') {
      continue;
    }
    visibleCount++;
    els[i].style.opacity = '0';
  }

  function finishCollapse() {
    completionStudyFieldsCollapseTimerId = null;
    for (var j = 0; j < els.length; j++) {
      els[j].style.display = 'none';
      els[j].style.opacity = '';
    }
    isCompletionStudyFieldsCollapsed = true;
    scrollPageToTop(true);
    maintainCompletionScrollAtTop();
    isCategoryTransitionInProgress = false;
    refreshAdvanceNavControls();
    after();
  }

  if (visibleCount === 0) {
    finishCollapse();
    return;
  }

  completionStudyFieldsCollapseTimerId = setTimeout(finishCollapse, COMPLETION_STUDY_FIELDS_FADE_MS);
}

/**
 * 出題／解答／note を学習表示用に復帰（Start／Plus／HOME 時）
 */
function restoreCompletionStudyFields() {
  if (completionStudyFieldsCollapseTimerId !== null) {
    clearTimeout(completionStudyFieldsCollapseTimerId);
    completionStudyFieldsCollapseTimerId = null;
  }
  isCompletionStudyFieldsCollapsed = false;
  var questionSection = document.getElementById('questionSection');
  var answerSection = document.getElementById('answerSection');
  var noteSection = document.getElementById('noteSection');
  if (questionSection) {
    questionSection.style.display = '';
    questionSection.style.opacity = '';
  }
  if (answerSection) {
    answerSection.style.display = '';
    answerSection.style.opacity = '';
  }
  if (noteSection) {
    noteSection.style.opacity = '';
    // 表示／非表示は displayQuestion に任せる（畳み込みで none にしたあとでも一旦 none のまま）
    noteSection.style.display = 'none';
  }
}

/**
 * 完了List内の画像読み込み後にもスクロール位置を維持する
 * @param {HTMLElement|null} listContainerEl
 */
function bindCompletionListImagesToKeepScroll(listContainerEl) {
  if (!listContainerEl || !isLearningCompleted) {
    return;
  }
  var imgs = listContainerEl.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];
    if (img.complete) {
      continue;
    }
    img.addEventListener('load', maintainCompletionScrollAtBottom);
    img.addEventListener('error', maintainCompletionScrollAtBottom);
  }
}

/**
 * 学習完了時：List が見えるようページを最下部までスクロール（初回表示用）
 */
function scrollLearningContentToCompletionView() {
  if (!isLearningCompleted) {
    return;
  }
  maintainCompletionScrollAtBottom();
  requestAnimationFrame(function() {
    maintainCompletionScrollAtBottom();
  });
}

/**
 * 学習完了効果音を止める
 */
function stopCompletionSfx() {
  stopStaticSfxList(completionSfxAudios);
  completionSfxAudios = [];
}

/**
 * 学習完了効果音を1回再生する（ボタン効果音の終了後）
 */
function playCompletionSfx() {
  runAfterUiClickSfx(function() {
    playStaticSfx(COMPLETION_SFX_URL, completionSfxAudios, 1);
  });
}

/**
 * 静的効果音の再生を止める
 * @param {HTMLAudioElement[]} list
 */
function stopStaticSfxList(list) {
  if (!list || !list.length) return;
  for (var i = 0; i < list.length; i++) {
    var audio = list[i];
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  }
}

/**
 * 静的mp3を1回再生する（TTSとは別）
 * @param {string} url
 * @param {HTMLAudioElement[]} bucket
 * @param {number} volume
 */
function playStaticSfx(url, bucket, volume) {
  stopStaticSfxList(bucket);
  bucket.length = 0;
  var audio = new Audio(buildStaticSfxUrl(url));
  audio.volume = (typeof volume === 'number') ? volume : 1;
  bucket.push(audio);
  audio.onerror = function() {};
  var playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function() {});
  }
}

/**
 * 静的効果音URL（版クエリ付き。ブラウザキャッシュ対象）
 * @param {string} url
 * @returns {string}
 */
function buildStaticSfxUrl(url) {
  var ver = (typeof window.APP_FRONT_VERSION === 'string' && window.APP_FRONT_VERSION)
    ? window.APP_FRONT_VERSION
    : '';
  return url + (ver ? ('?v=' + ver) : '');
}

function isUiClickSfxPlaying() {
  return uiClickSfxPlaying;
}

function flushUiClickSfxWaiters() {
  var list = uiClickSfxWaiters;
  uiClickSfxWaiters = [];
  for (var i = 0; i < list.length; i++) {
    try {
      list[i]();
    } catch (e) {}
  }
}

function runAfterUiClickSfx(fn) {
  if (typeof fn !== 'function') return;
  if (!uiClickSfxPlaying) {
    fn();
    return;
  }
  uiClickSfxWaiters.push(fn);
}

/**
 * 効果音 Audio を止める
 * @param {HTMLAudioElement|null} audio
 */
function stopSfxAudioElement_(audio) {
  if (!audio) {
    return;
  }
  audio.onended = null;
  audio.onerror = null;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {}
}

/**
 * ボタン効果音を止める（待ち処理は実行しない）
 */
function stopUiClickSfx() {
  uiClickSfxPlaying = false;
  uiClickSfxWaiters = [];
  stopSfxAudioElement_(uiClickSfxAudio);
  stopSfxAudioElement_(startSfxAudio);
  stopSfxAudioElement_(retrySfxAudio);
  refreshAudioLockControls_();
}

/**
 * 静的効果音用 Audio を用意する
 * @param {HTMLAudioElement|null} existing
 * @param {string} url
 * @returns {HTMLAudioElement}
 */
function ensureStaticSfxAudio_(existing, url) {
  if (existing) {
    return existing;
  }
  var audio = new Audio(buildStaticSfxUrl(url));
  audio.preload = 'auto';
  audio.volume = UI_CLICK_SFX_VOLUME;
  return audio;
}

/**
 * ボタン効果音用 Audio を用意する（未作成なら生成）
 * @returns {HTMLAudioElement}
 */
function ensureUiClickSfxAudio() {
  uiClickSfxAudio = ensureStaticSfxAudio_(uiClickSfxAudio, UI_CLICK_SFX_URL);
  return uiClickSfxAudio;
}

/**
 * START効果音用 Audio を用意する（未作成なら生成）
 * @returns {HTMLAudioElement}
 */
function ensureStartSfxAudio() {
  startSfxAudio = ensureStaticSfxAudio_(startSfxAudio, START_SFX_URL);
  return startSfxAudio;
}

function ensureRetrySfxAudio() {
  retrySfxAudio = ensureStaticSfxAudio_(retrySfxAudio, RETRY_SFX_URL);
  return retrySfxAudio;
}

/**
 * 起動時にボタン効果音を先読みする
 */
function preloadUiClickSfx() {
  try {
    ensureUiClickSfxAudio().load();
    ensureStartSfxAudio().load();
    ensureRetrySfxAudio().load();
  } catch (e) {}
}

/**
 * 効果音開始を優先し、画面遷移などは次ティックへ回す
 * @param {function(): void} fn
 */
function playUiClickSfxThen(fn) {
  playUiClickSfx();
  if (typeof fn !== 'function') {
    return;
  }
  setTimeout(fn, 0);
}

/**
 * START効果音開始を優先し、画面遷移などは次ティックへ回す
 * @param {function(): void} fn
 */
function playStartSfxThen(fn) {
  playStartSfx();
  if (typeof fn !== 'function') {
    return;
  }
  setTimeout(fn, 0);
}

function playRetrySfxThen(fn) {
  playRetrySfx();
  if (typeof fn !== 'function') {
    return;
  }
  setTimeout(fn, 0);
}

/**
 * 指定 Audio をボタン効果音として再生する
 * @param {HTMLAudioElement} audio
 */
function playButtonSfxAudio_(audio) {
  stopCompletionSfx();
  stopCurrentAudioPlayback({ skipButtonUpdate: true, keepAudioQueue: false });
  uiClickSfxWaiters = [];
  if (audio !== uiClickSfxAudio) {
    stopSfxAudioElement_(uiClickSfxAudio);
  }
  if (audio !== startSfxAudio) {
    stopSfxAudioElement_(startSfxAudio);
  }
  if (audio !== retrySfxAudio) {
    stopSfxAudioElement_(retrySfxAudio);
  }
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {}
  uiClickSfxPlaying = true;
  refreshAudioLockControls_();
  audio.onended = function() {
    uiClickSfxPlaying = false;
    flushUiClickSfxWaiters();
    refreshAudioLockControls_();
  };
  audio.onerror = function() {
    uiClickSfxPlaying = false;
    flushUiClickSfxWaiters();
    refreshAudioLockControls_();
  };
  var playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function() {
      uiClickSfxPlaying = false;
      flushUiClickSfxWaiters();
      refreshAudioLockControls_();
    });
  }
}

/**
 * 効果音／本問音声ロックに合わせて START と中央ボタンを更新する
 */
function refreshAudioLockControls_() {
  updateNavAnswerButton();
  updateStartButtonEnabled();
  updatePlusButton();
}

/**
 * Ans / Next / End / 完了画面 Next の効果音
 */
function playUiClickSfx() {
  playButtonSfxAudio_(ensureUiClickSfxAudio());
}

/**
 * トップ START / 学習完了時 Start の効果音
 */
function playStartSfx() {
  playButtonSfxAudio_(ensureStartSfxAudio());
}

function playRetrySfx() {
  playButtonSfxAudio_(ensureRetrySfxAudio());
}

function showCompletionMessage() {
  playCompletionSfx();
  // 完了直後は出題ブロックを再表示（カテゴリ切替で畳んでいた場合の復帰）
  restoreCompletionStudyFields();
  updateFieldEditPencils();
  scheduleAudioPrefetch();

  var completionSection = document.getElementById('completionMessageSection');
  var completionMessageText = document.querySelector('#completionMessage .completion-message-text');
  var completionMessageIcon = document.getElementById('completionMessageIcon');
  
  if (completionSection && completionMessageText && completionMessageIcon) {
    if (completionMessageIconRevealTimeoutId !== null) {
      clearTimeout(completionMessageIconRevealTimeoutId);
      completionMessageIconRevealTimeoutId = null;
    }
    isCompletionCongratsCleared = false;

    var randomMessageIndex = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
    var message = COMPLETION_MESSAGES[randomMessageIndex];
    var randomImageIndex = Math.floor(Math.random() * COMPLETION_MESSAGE_IMAGES.length);
    var imageFileName = COMPLETION_MESSAGE_IMAGES[randomImageIndex];
    
    completionMessageText.textContent = message;
    completionMessageText.style.color = '';
    completionMessageIcon.src = 'img/msg/' + imageFileName;
    
    completionSection.style.display = 'block';
    // アイコンは後から表示（スペースは確保）
    completionMessageIcon.style.visibility = 'hidden';
    completionMessageIcon.style.opacity = '0';
    completionMessageIcon.style.transform = 'scale(0.8)';
    
    completionMessageIconRevealTimeoutId = setTimeout(function() {
      completionMessageIconRevealTimeoutId = null;
      if (!isLearningCompleted || isCompletionCongratsCleared) {
        return;
      }
      completionMessageIcon.style.visibility = 'visible';
      requestAnimationFrame(function() {
        completionMessageIcon.style.opacity = '1';
        completionMessageIcon.style.transform = 'scale(1)';
        scrollLearningContentToCompletionView();
      });
    }, 500);
  }
  
  // 初期画面と同様のCategory／出題方法UI＋Listを表示
  justCompletedCategoryNo = currentCategoryNo;
  if (isDurationQuestionMethod()) {
    isCategoryCompletionSessionView = false;
    selectedQuestionIndices = [];
    hideLearningCategorySelect();
    applyQuestionMethodModeUi();
    showCompletionListSection();
    applyDurationModeSessionToCompletionList();
    setLearningNavIconsCategoryMode();
    refreshAdvanceNavControls();
    scrollLearningContentToCompletionView();
    return;
  }
  if (isLastDateQuestionMethod()) {
    isCategoryCompletionSessionView = false;
    selectedQuestionIndices = [];
    hideLearningCategorySelect();
    applyQuestionMethodModeUi();
    showCompletionListSection();
    applyLastDateModeSessionToCompletionList();
    setLearningNavIconsCategoryMode();
    refreshAdvanceNavControls();
    scrollLearningContentToCompletionView();
    return;
  }
  if (originalCategoryData.length > 0) {
    currentCategoryData = originalCategoryData.slice();
    if (!isCategoryShuffleQuestionMethod()) {
      categoryDataByNo[String(currentCategoryNo)] = currentCategoryData.slice();
    }
  }
  selectedQuestionIndices = [];
  isCategoryCompletionSessionView = true;
  showLearningCategorySelect();
  // <<>> 出現前に高さを確保し、続けてナビを確定（後からの伸びを防ぐ）
  reserveCompletionCategoryNavSpace();
  updateListNavButtons();
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

/**
 * Next / << / >> 時：文言・アイコンを透明にする（文字はそのまま残し領域を維持）
 */
function hideCompletionCongratsMessage() {
  if (completionMessageIconRevealTimeoutId !== null) {
    clearTimeout(completionMessageIconRevealTimeoutId);
    completionMessageIconRevealTimeoutId = null;
  }
  isCompletionCongratsCleared = true;

  var completionMessageText = document.querySelector('#completionMessage .completion-message-text');
  var completionMessageIcon = document.getElementById('completionMessageIcon');
  if (completionMessageText) {
    completionMessageText.style.color = 'transparent';
  }
  if (completionMessageIcon) {
    // visibility:hidden だとレイアウトが変わる場合があるため opacity のみ
    completionMessageIcon.style.visibility = 'visible';
    completionMessageIcon.style.opacity = '0';
    completionMessageIcon.style.transform = 'scale(1)';
  }
}

// 学習完了メッセージを非表示（HOME／再学習開始時など、領域ごと閉じる）
function hideCompletionMessage() {
  stopCompletionSfx();
  if (completionMessageIconRevealTimeoutId !== null) {
    clearTimeout(completionMessageIconRevealTimeoutId);
    completionMessageIconRevealTimeoutId = null;
  }
  isCompletionCongratsCleared = false;
  restoreCompletionStudyFields();

  var completionSection = document.getElementById('completionMessageSection');
  var completionMessageText = document.querySelector('#completionMessage .completion-message-text');
  var completionMessageIcon = document.getElementById('completionMessageIcon');
  if (completionSection) {
    completionSection.style.display = 'none';
  }
  if (completionMessageText) {
    completionMessageText.textContent = '';
    completionMessageText.style.color = '';
  }
  if (completionMessageIcon) {
    completionMessageIcon.src = '';
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
  flushPendingAnsSheetPersist();
  stopCurrentAudioPlayback();
  stopUiClickSfx();
  clearAudioSourceDebug();
  
  // ストップウォッチを停止
  stopStopwatch();
  displayedLearningItem = null;
  
  // 完了時カテゴリナビ用アイコンを通常に戻す
  setLearningNavIconsNormal();
  
  // 画面遷移
  var screen2 = document.getElementById('screen2');
  var screen1 = document.getElementById('screen1');
  if (screen2) screen2.classList.remove('active');
  if (screen1) screen1.classList.add('active');
  
  // トグルボタンの位置を更新（screen1に戻った時）
  requestAnimationFrame(function() {
    requestAnimationFrame(syncAppHeaderHeight);
  });
  
  // コンテナのパディングを元に戻す
  var container = document.querySelector('.container');
  if (container) container.classList.remove('learning-mode');
  
  // 出題画面HOMEは今回学習分を維持。完了後HOMEはカテゴリ全問へ戻す
  var homeFromIncompleteLearning = !isLearningCompleted;
  var incompleteSessionItems = homeFromIncompleteLearning ? currentCategoryData.slice() : [];
  if (!homeFromIncompleteLearning && originalCategoryData.length > 0 && !isCrossCategoryQuestionMethod()) {
    currentCategoryData = originalCategoryData.slice();
  } else if (homeFromIncompleteLearning) {
    currentCategoryData = incompleteSessionItems;
  }
  selectedQuestionIndices = [];
  originalCategoryData = [];
  
  // 学習完了メッセージを非表示（初期画面List描画前に完了フラグを戻す）
  hideCompletionMessage();
  justCompletedCategoryNo = null;
  isDurationCompletionSessionView = false;
  isLastDateCompletionSessionView = false;
  isCategoryCompletionSessionView = false;
  isLearningCompleted = false;
  syncLearningCompletedScreenClass();
  
  if (homeFromIncompleteLearning) {
    applyQuestionMethodModeUi();
    if (isLastDateNormalQuestionMethod()) {
      lastDateModeNeedsResortBeforePaging = false;
      if (lastDateModeAllItems.length > 0) {
        regenerateLastDateModeList();
      } else {
        loadLastDateModeData({ regenerate: true, forceFetch: false });
      }
    } else {
      if (isDurationQuestionMethod() && durationModeSortedItems.length > 0) {
        sortItemsForDurationMode(durationModeSortedItems);
      }
      if (currentCategoryData.length > 0) {
        displayList();
        if (!isCrossCategoryQuestionMethod()) {
          syncCategoryLastDateFromList();
        }
        updateListNavButtons();
      }
    }
  } else if (isDurationQuestionMethod()) {
    applyQuestionMethodModeUi();
    loadDurationModeData({ resetPage: true, resort: true, forceFetch: false });
  } else if (isLastDateQuestionMethod()) {
    applyQuestionMethodModeUi();
    loadLastDateModeData({ regenerate: true, forceFetch: false });
  } else if (currentCategoryData.length > 0) {
    // Listを再描画（メモリ上の retry_count / total_study_count / duration / last_date を反映）
    displayList();
    // Listと同一ルールでカテゴリ最終学習日を即時反映（全問埋まり→最新日、空欄あり→-）
    syncCategoryLastDateFromList();
    updateListNavButtons();
  }
  
  // カテゴリ一覧を再取得し、ドロップダウンの最終学習日をシート集計でも更新
  if (!isCrossCategoryQuestionMethod() && currentCategoryNo != null && currentCategoryNo !== '') {
    loadCategories({
      preserveValue: currentCategoryNo,
      quiet: true
    });
  }
  
  updateLearningLockedSideMenuControls();
  ensureAudioPrefetchInventory();
  
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

// 共通ヘッダーの高さを CSS 変数に反映
function syncAppHeaderHeight() {
  var header = document.getElementById('appHeader');
  if (!header) return;
  document.documentElement.style.setProperty('--app-header-height', header.offsetHeight + 'px');
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
  
  var item = getCurrentLearningItem();
  if (!item) return;
  
  var ui = getUpdateUiConfig(displayTarget);
  if (!ui) return;
  
  updateDisplayTarget = displayTarget;
  updateStorageField = resolveStorageField(displayTarget);
  originalEditText = item[updateStorageField] || '';
  
  isUpdateMode = true;
  updateFieldEditPencils();
  
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
    applyLearningNoteDisplay(item);
    var noteText = document.getElementById('noteText');
    if (noteText) {
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
  var item = getCurrentLearningItem();
  
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
    var elementsToDisable = screen2.querySelectorAll('.section, .navigation-bar');
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
  
  var item = getCurrentLearningItem();
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    closeUpdateConfirmModal();
    endUpdateMode(true);
    return;
  }
  
  var newValue = editEl.value || '';
  var oldValue = (item[updateStorageField] != null) ? String(item[updateStorageField]) : String(originalEditText || '');
  var storageFieldForAudio = updateStorageField;
  
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
      item[storageFieldForAudio] = newValue;
      if (storageFieldForAudio === 'question' || storageFieldForAudio === 'answer') {
        clearLocalAudioCachesForText(oldValue);
        clearLocalAudioCachesForText(newValue);
        deleteDriveAudioAsync(item, storageFieldForAudio);
      }
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
    appendAuthParams(params);
    params.append('referer', window.location.origin);
    
    // ローディング表示
    var micButton = document.getElementById('answerMicButton');
    if (micButton) {
      micButton.disabled = true;
    }
    
    postGasJson(params)
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

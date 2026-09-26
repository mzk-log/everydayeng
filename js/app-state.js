// グローバル変数
var categoryCatalog = {
  list: [], // カテゴリ一覧
  items: [], // 現在表示中の問題
  no: null, // 現在のカテゴリ番号
  byNo: {} // カテゴリ切替高速化用（セッション内キャッシュ）
};
var questionCursor = {
  index: 0,
  item: null, // 出題表示中の item（Ans は index 再参照しない）
  answerShown: false,
  completed: [] // 完了した問題のインデックスを保存（灰色表示）
};
var learningTimer = {
  startTime: null,
  interval: null
};
var todayStudy = {
  itemCount: 0, // LastDate が今日の問題数（シート集計＋Ans時の楽観更新）
  ansCount: 0, // 今日の Ans 押下回数（DailyStudyCount 合計＋楽観更新）
  countDate: '', // itemCount / ansCount が対応する yyyy-mm-dd
  dateCheckInterval: null
};
var stopwatch = {
  startTime: null,
  interval: null,
  elapsed: 0,
  running: false
};
var learningNote = {
  expanded: false, // 本文を開いているか（情報あり時のみ意味を持つ）
  clickTimer: null, // シングル／ダブルクリック判別用
  collapsedHint: 'メモあり'
};
var googleAuth = {
  email: null, // ユーザーのメールアドレス（Googleログイン後）
  idToken: null, // Google IDトークン（GIS credential）
  accessToken: null, // OAuth access token（自前ボタン／Brave等向け）
  accessExpiresAt: 0,
  sessionToken: null
};

// Google Identity Services 用クライアントID（GCP OAuth ウェブクライアント）
var GOOGLE_OAUTH_CLIENT_ID = '451690742730-f7aubfes1nea66l0p3tavuibcgntbaa8.apps.googleusercontent.com';
var GOOGLE_ID_TOKEN_STORAGE_KEY = 'googleIdToken';
var GOOGLE_ACCESS_TOKEN_STORAGE_KEY = 'googleAccessToken';
var GOOGLE_ACCESS_TOKEN_EXPIRES_KEY = 'googleAccessTokenExpiresAt';
var APP_SESSION_STORAGE_PREFIX = 'appSessionToken_v1:';
var localStudy = {
  items: null, // 端末に保持している全問
  persistOk: true, // 直近の端末保存が成功したか
  writeLog: [] // 全問取得の開始後に成功した学習記録。古い全問応答で端末の Ans を戻さない
};
var dataGenerationCheckInFlight = false;
var googleLogin = {
  initialized: false,
  dialogCancellable: false,
  forceAccountSelect: false, // ヘッダー「ログイン」からの切替時 true
  lockInProgress: false,
  autoSelectEnabled: false,
  loginHint: ''
};
var retryMode = {
  indices: [], // 再チャレンジする問題のインデックス
  active: false, // 再チャレンジモードか
  index: 0 // 現在の再チャレンジ問題のインデックス
};
var studyEnd = {
  done: false, // 学習が完了したかどうか
  browseStarted: false, // Next以降は true。END直後は false（メッセージ位置。Category と <<>> は出さない）
  categoryNo: null, // 直前に完了したカテゴリ（完了画面のList／中央Next/Start判定用）
  categorySession: false, // カテゴリ毎：完了直後List（解答側表示）中
  durationSession: false, // 解答時間優先：完了直後に今回学習分をList表示中
  lastDateSession: false, // 学習日優先：完了直後に今回学習分をList表示中
  browseRequestId: 0, // 完了画面List参照の取得リクエスト世代
  iconTimer: null, // 完了メッセージアイコン表示用タイマー
  congratsCleared: false, // Next等でお祝い文言を空にしたか
  fieldsCollapsed: false, // 完了後カテゴリ切替で出題／解答／note を畳んだか
  fieldsTimer: null // 出題ブロックフェード用タイマー
};
var isCategoryTransitionInProgress = false; // カテゴリ切替中か
var COMPLETION_STUDY_FIELDS_FADE_MS = 250; // 出題ブロックのフェード時間
var questionList = {
  modalIndex: 0, // モーダル内の現在のインデックス
  selected: [], // 選択された問題のインデックスを保存
  original: [] // 元の全問題データ（出題数表示用）
};
var readToggle = {
  question: false, // 出題読み ON/OFF
  answer: false, // 解答読み ON/OFF
  questionBeforeListening: null, // リスニングON固定前の出題読み
  answerBeforeListening: null // リスニングON前の解答読み（OFF復帰用）
};
var COMPLETION_SFX_URL = 'audio/pirorin.mp3';
var UI_CLICK_SFX_URL = 'audio/buho.mp3';
var START_SFX_URL = 'audio/start.mp3';
var RETRY_SFX_URL = 'audio/retry.mp3';
var CHARGE_SFX_URL = 'audio/charge.mp3';
var UI_CLICK_SFX_VOLUME = 1.0;
var uiSfx = {
  completion: [], // 学習完了効果音（出題／解答音声とは別）
  click: null, // ボタン効果音（使い回し。Pages静的ファイル）
  start: null, // START効果音（使い回し。Pages静的ファイル）
  retry: null, // リトライ効果音（使い回し。Pages静的ファイル）
  charge: null, // START待ち効果音（使い回し。Pages静的ファイル）
  pendingCharge: false, // 完了画面Nextのあと。Startと一覧が得られたときは charge のみ。そうでなければ buho
  clickPlaying: false,
  clickWaiters: []
};
var fieldPlay = {
  audio: null, // 現在再生中のAudioオブジェクト
  field: null, // 再生／取得中の欄 'question' | 'answer' | null
  ansGate: false, // リスニング時：出題音声終了まで Ans 無効・計測待機
  resetTimer: false // 出題読み自動再生終了後に計測をゼロリセットするか
};
var sessionRetryPressCountById = {}; // START〜終了：問題IDごとのリトライ押下回数（シート累計とは別）
var addStudy = {
  confirmPending: false, // 削除確認モーダル中、または下ボタンの確認中
  formConfirming: false, // 追加／挿入／更新を下のボタンで確認中
  formBusy: false,
  mode: 'add', // add | update | insert
  editingId: '',
  insertAfterId: '',
  insertAtStart: false,
  confirmKind: '', // add | update | insert | delete
  pendingDeleteId: '',
  moveBusy: false,
  modalBusy: false // 確認モーダルの処理中
};
var isRefreshingAdvanceNavControls = false; // refreshAdvanceNavControls の再入防止
var CROSS_CATEGORY_LIST_SIZE = 7; // カテゴリ横断モード：List表示件数
var LAST_DATE_POOL_SIZE = 20; // 学習日優先：抽選プール件数
var durationMode = {
  sortedItems: [], // 解答時間優先：全件ソート結果
  pageIndex: 0, // 解答時間優先：現在ページ（0始まり）
  sessionItems: [], // 解答時間優先：今回学習開始時の最大7件（Plus再学習用）
  loadRequestId: 0 // 解答時間優先：取得リクエスト世代
};
var lastDateMode = {
  allItems: [], // 学習日優先：全件ソート結果（再抽選／ページ送り用）
  sessionItems: [], // 学習日優先：今回学習開始時の最大7件（Plus再学習用）
  loadRequestId: 0, // 学習日優先：取得リクエスト世代
  pageIndex: 0, // 学習日優先（ノーマル）：現在ページ（0始まり）
  needsResort: false // 学習日優先（ノーマル）：次の>で再ソートしてからページ送り
};
var updateMode = {
  active: false, // 更新モードかどうか
  originalText: '', // 更新前の編集対象テキスト
  displayTarget: null, // 'question' | 'answer' | 'note'
  storageField: null // 保存先キー 'question' | 'answer' | 'note'
};
var voiceRec = {
  recorder: null, // MediaRecorder
  chunks: [], // 録音した音声データのチャンク
  active: false // 録音中か
};

// 出題設定（localStorageと同期。学習中の切替は次問から反映）
var LISTENING_PLACEHOLDER_TEXT = '🔊 リスニング練習モードです';

// 音声キャッシュ（メモリキャッシュ）
var audioCache = {};

// キャッシュの設定
var CACHE_PREFIX = 'tts_audio_'; // 旧 localStorage キー（IndexedDB へ移行後は使わない）
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
var ENABLE_AUDIO_SOURCE_DEBUG = true;
var ENABLE_LOAD_DIAG = true;
var FIELD_PLAY_LONG_PRESS_MS = 700; // 再生ボタン長押しで音声再作成／本文長押しでリトライ
var LEARNING_GESTURE_MOVE_PX = 12; // 本文タップ／長押しをスクロールと区別
var LEARNING_BODY_DOUBLE_TAP_MS = 300;
var GAS_UPDATE_MAX_ATTEMPTS = 5; // シート更新の最大試行回数（初回含む）
var GAS_UPDATE_BASE_DELAY_MS = 700; // リトライの基本待機（指数バックオフ）
var gasSheetUpdate = {
  queue: [], // シート更新ジョブの直列キュー
  running: false,
  okCount: 0, // セッション内：シート更新ジョブ成功数
  failCount: 0 // セッション内：シート更新ジョブ最終失敗数
};
var audioFetch = {
  queue: [], // 本問の音声取得ジョブ（同時1本）
  prefetchQueue: [], // 先読みジョブ（本問より低い優先）
  running: false,
  prefetchRunning: false,
  generation: 0, // 取得中の世代。古い応答は捨てる
  abort: null // 取得中の中断用
};
var audioPrefetch = {
  stopped: false,
  failStreak: 0,
  playBlocked: false,
  recheckTimer: null
};
var audioStock = {
  idbIds: {}, // 端末にある音声ID
  idbReady: 0,
  idbTarget: 0,
  idbBytes: 0,
  driveReady: null,
  driveTarget: null
};
var audioDb = {
  conn: null, // IndexedDB の接続
  opening: null // 接続を開いている Promise
};
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
var audioWatch = {
  busyTimer: null,
  pauseTimer: null,
  playStartTimer: null
};
var USER_SETTINGS_SYNC_MAX_ATTEMPTS = 3; // 起動時設定同期の最大試行（初回含む）
var USER_SETTINGS_SYNC_RETRY_DELAY_MS = 800; // 設定同期リトライ間隔

// Ans後：音声ネット取得を優先し、シート更新を遅延するための保留
var ansSheetPersist = {
  pending: null,
  timer: null
};
var STUDY_STAT_FIELD_KEYS = ['total_study_count', 'daily_study_count', 'duration_old', 'duration', 'last_date'];

// 通信診断（ENABLE_LOAD_DIAG）
var loadDiag = {
  bootTimer: null,
  runTimer: null,
  lastBootSec: null,
  lastAudioSec: null,
  lastUpdateSec: null,
  lastAllSec: null
};
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
// body 末尾のスクリプト実行時に既にある要素
var dom = {
  screen1: document.getElementById('screen1'),
  screen2: document.getElementById('screen2'),
  categorySelect: document.getElementById('categorySelect'),
  learningCategorySelect: document.getElementById('learningCategorySelect'),
  completionListSection: document.getElementById('completionListSection'),
  completionListMessage: document.getElementById('completionListMessage'),
  completionListContainer: document.getElementById('completionListContainer'),
  completionMessageSection: document.getElementById('completionMessageSection'),
  completionMessageIcon: document.getElementById('completionMessageIcon'),
  addStudyItemATitle: document.getElementById('addStudyItemATitle'),
  addStudyItemAnswer: document.getElementById('addStudyItemAnswer'),
  addStudyItemBackToAddButton: document.getElementById('addStudyItemBackToAddButton'),
  addStudyItemCancelButton: document.getElementById('addStudyItemCancelButton'),
  addStudyItemCategoryName: document.getElementById('addStudyItemCategoryName'),
  addStudyItemCategorySelect: document.getElementById('addStudyItemCategorySelect'),
  addStudyItemCloseButton: document.getElementById('addStudyItemCloseButton'),
  addStudyItemItemContainer: document.getElementById('addStudyItemItemContainer'),
  addStudyItemList: document.getElementById('addStudyItemList'),
  addStudyItemListCount: document.getElementById('addStudyItemListCount'),
  addStudyItemListWrap: document.getElementById('addStudyItemListWrap'),
  addStudyItemMenuButton: document.getElementById('addStudyItemMenuButton'),
  addStudyItemNewCategoryFields: document.getElementById('addStudyItemNewCategoryFields'),
  addStudyItemNote: document.getElementById('addStudyItemNote'),
  addStudyItemOverlay: document.getElementById('addStudyItemOverlay'),
  addStudyItemQTitle: document.getElementById('addStudyItemQTitle'),
  addStudyItemQuestion: document.getElementById('addStudyItemQuestion'),
  addStudyItemRenameButton: document.getElementById('addStudyItemRenameButton'),
  addStudyItemRenameFields: document.getElementById('addStudyItemRenameFields'),
  addStudyItemRenameName: document.getElementById('addStudyItemRenameName'),
  addStudyItemSaveButton: document.getElementById('addStudyItemSaveButton'),
  addStudyItemStatus: document.getElementById('addStudyItemStatus'),
  categoryLoadingSpinner: document.getElementById('categoryLoadingSpinner'),
  currentCategory: document.getElementById('currentCategory'),
  learningCategoryNavInfo: document.getElementById('learningCategoryNavInfo'),
  learningListNextButton: document.getElementById('learningListNextButton'),
  learningListPrevButton: document.getElementById('learningListPrevButton'),
  listContainer: document.getElementById('listContainer'),
  listMessage: document.getElementById('listMessage'),
  listNextButton: document.getElementById('listNextButton'),
  listPrevButton: document.getElementById('listPrevButton'),
  screen2ListNavContainer: document.getElementById('screen2ListNavContainer'),
  selectionCount: document.getElementById('selectionCount'),
  startButton: document.getElementById('startButton'),
  backgroundImage: document.getElementById('backgroundImage'),
  backgroundImageGrid: document.getElementById('backgroundImageGrid'),
  backgroundPreviewCancelButton: document.getElementById('backgroundPreviewCancelButton'),
  backgroundPreviewCloseButton: document.getElementById('backgroundPreviewCloseButton'),
  backgroundPreviewConfirmButton: document.getElementById('backgroundPreviewConfirmButton'),
  backgroundPreviewImage: document.getElementById('backgroundPreviewImage'),
  backgroundPreviewModal: document.getElementById('backgroundPreviewModal'),
  backgroundSelectCloseButton: document.getElementById('backgroundSelectCloseButton'),
  backgroundSelectModal: document.getElementById('backgroundSelectModal'),
  backgroundSubmenu: document.getElementById('backgroundSubmenu'),
  changeBackgroundButton: document.getElementById('changeBackgroundButton'),
  resetBackgroundButton: document.getElementById('resetBackgroundButton'),
  selectBackgroundButton: document.getElementById('selectBackgroundButton'),
  answerEditPencil: document.getElementById('answerEditPencil'),
  answerMicButton: document.getElementById('answerMicButton'),
  answerPlayButton: document.getElementById('answerPlayButton'),
  answerSection: document.getElementById('answerSection'),
  answerTextDisplay: document.getElementById('answerTextDisplay'),
  answerTextEdit: document.getElementById('answerTextEdit'),
  answerToggleButton: document.getElementById('answerToggleButton'),
  navAnswerButton: document.getElementById('navAnswerButton'),
  navAnswerPlaySlot: document.getElementById('navAnswerPlaySlot'),
  navAnswerText: document.getElementById('navAnswerText'),
  navQuestionPlaySlot: document.getElementById('navQuestionPlaySlot'),
  noteEditPencil: document.getElementById('noteEditPencil'),
  noteEyeButton: document.getElementById('noteEyeButton'),
  noteSection: document.getElementById('noteSection'),
  noteText: document.getElementById('noteText'),
  plusButton: document.getElementById('plusButton'),
  questionEditPencil: document.getElementById('questionEditPencil'),
  questionInfo: document.getElementById('questionInfo'),
  questionPlayButton: document.getElementById('questionPlayButton'),
  questionSection: document.getElementById('questionSection'),
  questionSectionLabel: document.getElementById('questionSectionLabel'),
  questionText: document.getElementById('questionText'),
  questionToggleButton: document.getElementById('questionToggleButton'),
  answerUpdateConfirmCancelButton: document.getElementById('answerUpdateConfirmCancelButton'),
  answerUpdateConfirmCloseButton: document.getElementById('answerUpdateConfirmCloseButton'),
  answerUpdateConfirmModal: document.getElementById('answerUpdateConfirmModal'),
  answerUpdateConfirmOkButton: document.getElementById('answerUpdateConfirmOkButton'),
  answerUpdateConfirmTitle: document.getElementById('answerUpdateConfirmTitle'),
  visibleCategoriesButton: document.getElementById('visibleCategoriesButton'),
  visibleCategoriesCancelButton: document.getElementById('visibleCategoriesCancelButton'),
  visibleCategoriesChecklist: document.getElementById('visibleCategoriesChecklist'),
  visibleCategoriesClearAllButton: document.getElementById('visibleCategoriesClearAllButton'),
  visibleCategoriesCount: document.getElementById('visibleCategoriesCount'),
  visibleCategoriesError: document.getElementById('visibleCategoriesError'),
  visibleCategoriesItemContainer: document.getElementById('visibleCategoriesItemContainer'),
  visibleCategoriesSaveButton: document.getElementById('visibleCategoriesSaveButton'),
  visibleCategoriesSelectAllButton: document.getElementById('visibleCategoriesSelectAllButton'),
  visibleCategoriesSubmenu: document.getElementById('visibleCategoriesSubmenu'),
  audioSettingsButton: document.getElementById('audioSettingsButton'),
  audioSettingsSubmenu: document.getElementById('audioSettingsSubmenu'),
  hamburgerMenuButton: document.getElementById('hamburgerMenuButton'),
  questionMethodSettingItem: document.getElementById('questionMethodSettingItem'),
  questionSettingsButton: document.getElementById('questionSettingsButton'),
  questionSettingsSubmenu: document.getElementById('questionSettingsSubmenu'),
  sideMenu: document.getElementById('sideMenu'),
  sideMenuCloseButton: document.getElementById('sideMenuCloseButton'),
  googleLoginCancelButton: document.getElementById('googleLoginCancelButton'),
  googleLoginError: document.getElementById('googleLoginError'),
  googleLoginOverlay: document.getElementById('googleLoginOverlay'),
  googleSignInAppButton: document.getElementById('googleSignInAppButton'),
  googleSignInButton: document.getElementById('googleSignInButton'),
  loginButton: document.getElementById('loginButton'),
  modalAnswerLabel: document.getElementById('modalAnswerLabel'),
  modalAnswerText: document.getElementById('modalAnswerText'),
  modalCloseButton: document.getElementById('modalCloseButton'),
  modalNavInfo: document.getElementById('modalNavInfo'),
  modalNextButton: document.getElementById('modalNextButton'),
  modalNoteSection: document.getElementById('modalNoteSection'),
  modalNoteText: document.getElementById('modalNoteText'),
  modalOverlay: document.getElementById('modalOverlay'),
  modalPrevButton: document.getElementById('modalPrevButton'),
  modalQuestionLabel: document.getElementById('modalQuestionLabel'),
  modalQuestionText: document.getElementById('modalQuestionText'),
  modalSelectButton: document.getElementById('modalSelectButton'),
  categorySectionLabel: document.getElementById('categorySectionLabel'),
  categorySelectContainer: document.getElementById('categorySelectContainer'),
  learningCategorySectionLabel: document.getElementById('learningCategorySectionLabel'),
  learningCategorySelectContainer: document.getElementById('learningCategorySelectContainer'),
  questionMethodModeLabel: document.getElementById('questionMethodModeLabel'),
  answerButtonContainer: document.getElementById('answerButtonContainer'),
  answerSectionLabel: document.getElementById('answerSectionLabel'),
  homeButton: document.getElementById('homeButton'),
  learningItemCount: document.getElementById('learningItemCount'),
  learningTime: document.getElementById('learningTime'),
  navAnswerStopwatch: document.getElementById('navAnswerStopwatch'),
  navRetrySlot: document.getElementById('navRetrySlot'),
  clearSelectionButton: document.getElementById('clearSelectionButton'),
  listTableBody: document.getElementById('listTableBody'),
  listTableHeader: document.getElementById('listTableHeader'),
  listTableHeaderRight: document.getElementById('listTableHeaderRight'),
  startButtonDock: document.getElementById('startButtonDock'),
  completionClearSelectionButton: document.getElementById('completionClearSelectionButton'),
  completionListTableBody: document.getElementById('completionListTableBody'),
  completionListTableHeader: document.getElementById('completionListTableHeader'),
  completionListTableHeaderRight: document.getElementById('completionListTableHeaderRight'),
  completionSelectionCount: document.getElementById('completionSelectionCount'),
  imageModalCloseButton: document.getElementById('imageModalCloseButton'),
  imageModalImage: document.getElementById('imageModalImage'),
  imageModalOverlay: document.getElementById('imageModalOverlay'),
  appHeader: document.getElementById('appHeader'),
  appHeaderVersion: document.getElementById('appHeaderVersion'),
  audioSourceDebug: document.getElementById('audioSourceDebug'),
  learningLoadDiag: document.getElementById('learningLoadDiag'),
  netLoadDiag: document.getElementById('netLoadDiag')
};

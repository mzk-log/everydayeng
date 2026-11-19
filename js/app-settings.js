// ========================================
// ユーザー設定の端末間同期（Settings / Drive）
// ========================================
var userSettingsSyncTimer = null;
var userSettingsSyncInFlight = false;
var userSettingsSyncQueued = false;
var userSettingsBgUploadPending = false;
var userSettingsInitialSyncDone = false;
var userSettingsApplyingFromServer = false;
/** localStorage 変更あり（未送信または再送待ち） */
var userSettingsDirty = false;
/** apply 完了後に scheduleUserSettingsSync する */
var userSettingsResyncAfterApply_ = false;

/**
 * 背景 Drive ファイルIDの localStorage キー
 * @returns {string}
 */
function getSettingsBgDriveFileIdKey() {
  var email = googleAuth.email || localStorage.getItem('userEmail') || '';
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
 * 端末で設定を変えた時刻（メール単位）。起動時にシート updated_at と比較する
 * @returns {string}
 */
function getUserSettingsLocalRevisedAtKey_() {
  var email = googleAuth.email || localStorage.getItem('userEmail') || '';
  return 'userSettingsLocalRevisedAt:' + String(email);
}

function markLocalUserSettingsRevised_() {
  userSettingsDirty = true;
  try {
    localStorage.setItem(getUserSettingsLocalRevisedAtKey_(), String(Date.now()));
  } catch (e) {
    // ignore
  }
}

function clearLocalUserSettingsRevisedAt_() {
  userSettingsDirty = false;
  try {
    localStorage.removeItem(getUserSettingsLocalRevisedAtKey_());
  } catch (e) {
    // ignore
  }
}

function getLocalUserSettingsRevisedAtMs_() {
  try {
    var v = Number(localStorage.getItem(getUserSettingsLocalRevisedAtKey_()) || 0);
    return isFinite(v) ? v : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Settings の updated_at（yyyy-MM-dd HH:mm:ss 等）を ms に
 * @param {string} updatedAt
 * @returns {number}
 */
function parseSettingsUpdatedAtMs_(updatedAt) {
  if (!updatedAt) {
    return 0;
  }
  var s = String(updatedAt).trim();
  var t = Date.parse(s.replace(' ', 'T'));
  if (!isFinite(t)) {
    t = Date.parse(s);
  }
  return isFinite(t) ? t : 0;
}

/**
 * 端末の改訂がシートより新しければ音声速さは端末優先
 * @param {string} [serverUpdatedAt]
 * @returns {boolean}
 */
function shouldPreferLocalAudioSpeeds_(serverUpdatedAt) {
  var localMs = getLocalUserSettingsRevisedAtMs_();
  if (!localMs) {
    return false;
  }
  var serverMs = parseSettingsUpdatedAtMs_(serverUpdatedAt);
  return localMs > serverMs;
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
      listeningMode: isListeningModeEnabled() ? 'on' : 'off',
      cycleSlot: (typeof getCycleSlotStateForSettings === 'function')
        ? getCycleSlotStateForSettings()
        : { nextKind: 'new', lastCategoryNo: null, dateYmd: '' }
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
 * @param {string} [serverUpdatedAt] Settings 行の updated_at
 */
function applyUserSettingsFromServer(settings, imageContent, mimeType, serverUpdatedAt) {
  if (!settings || typeof settings !== 'object') {
    return;
  }
  userSettingsApplyingFromServer = true;
  userSettingsResyncAfterApply_ = false;
  try {
    applyUserSettingsFromServerBody_(settings, imageContent, mimeType, serverUpdatedAt);
  } finally {
    userSettingsApplyingFromServer = false;
    if (userSettingsResyncAfterApply_) {
      userSettingsResyncAfterApply_ = false;
      if (typeof scheduleUserSettingsSync === 'function') {
        scheduleUserSettingsSync();
      }
    }
  }
}

/**
 * @param {Object} settings
 * @param {string} [imageContent]
 * @param {string} [mimeType]
 * @param {string} [serverUpdatedAt]
 */
function applyUserSettingsFromServerBody_(settings, imageContent, mimeType, serverUpdatedAt) {
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
      // 声は男性固定（サーバに female が残っていても上書き）
      localStorage.setItem('audioVoice_question', AUDIO_VOICE_DEFAULT);
      localStorage.setItem('audioVoice_answer', AUDIO_VOICE_DEFAULT);
      var preferLocalAudio = shouldPreferLocalAudioSpeeds_(serverUpdatedAt);
      if (window.audioSpeedEpochJustMigrated_) {
        // 世代移行直後は端末の 1.0 を正とし、旧 Settings の倍率で上書きしない
        window.audioSpeedEpochJustMigrated_ = false;
        userSettingsResyncAfterApply_ = true;
      } else if (preferLocalAudio) {
        // 閉じる直前の未達などを吸収：速さは端末を残し、直後にシートへ送り直す
        userSettingsResyncAfterApply_ = true;
      } else {
        if (settings.audio.speed_question) {
          localStorage.setItem(
            'audioSpeed_question',
            typeof normalizeAudioSpeedUi_ === 'function'
              ? normalizeAudioSpeedUi_(settings.audio.speed_question)
              : AUDIO_TIME_SCALE_DEFAULT
          );
        }
        if (settings.audio.speed_answer) {
          localStorage.setItem(
            'audioSpeed_answer',
            typeof normalizeAudioSpeedUi_ === 'function'
              ? normalizeAudioSpeedUi_(settings.audio.speed_answer)
              : AUDIO_TIME_SCALE_DEFAULT
          );
        }
        clearLocalUserSettingsRevisedAt_();
      }
      if (typeof migrateAudioSpeedPrefs_ === 'function') {
        migrateAudioSpeedPrefs_();
      }
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
      if (settings.practice.cycleSlot && typeof applyCycleSlotStateFromSettings === 'function') {
        applyCycleSlotStateFromSettings(settings.practice.cycleSlot);
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
 * @param {{ keepalive?: boolean, quiet?: boolean }} [options]
 */
function pushUserSettingsToServer(onDone, options) {
  options = options || {};
  if (!googleAuth.email) {
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

  postGasJson(params, { keepalive: !!options.keepalive })
  .then(function(data) {
    if (!data || !data.success) {
      throw new Error((data && data.error) || '設定の同期に失敗しました');
    }
    userSettingsBgUploadPending = false;
    clearLocalUserSettingsRevisedAt_();
    if (data.settings && data.settings.background) {
      setStoredSettingsBgDriveFileId(data.settings.background.driveFileId || '');
    }
    if (typeof onDone === 'function') onDone(null, data);
  })
  .catch(function(error) {
    console.warn('設定同期（保存）エラー:', error);
    var errText = error && error.message ? error.message : String(error);
    if (!options.quiet) {
      showError('設定の同期に失敗しました: ' + errText);
    }
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
  if (userSettingsApplyingFromServer) {
    return;
  }
  markLocalUserSettingsRevised_();
  if (!googleAuth.email || !userSettingsInitialSyncDone) {
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
 * タブ非表示・閉じる直前：未送信があればすぐ送る
 */
function flushUserSettingsSyncNow_() {
  if (userSettingsApplyingFromServer) {
    return;
  }
  if (!googleAuth.email || !userSettingsInitialSyncDone) {
    return;
  }
  if (!userSettingsDirty && !userSettingsSyncTimer) {
    return;
  }
  if (userSettingsSyncTimer) {
    clearTimeout(userSettingsSyncTimer);
    userSettingsSyncTimer = null;
  }
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
  }, { keepalive: true, quiet: true });
}

(function installUserSettingsFlushListeners_() {
  if (typeof window === 'undefined' || window._userSettingsFlushInstalled) {
    return;
  }
  window._userSettingsFlushInstalled = true;
  window.addEventListener('pagehide', function() {
    flushUserSettingsSyncNow_();
  });
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'hidden') {
      flushUserSettingsSyncNow_();
    }
  });
})();

/**
 * 起動時：サーバ設定を取得し適用。無ければ端末設定をアップロード
 * 一時失敗時は自動リトライし、それでも失敗なら端末設定でカテゴリ取得へ進む
 * @param {Function} [onDone]
 */
function syncUserSettingsWithServer(onDone) {
  if (!googleAuth.email) {
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
        // apply 内の再同期予約が動くよう、先に完了扱いにする
        userSettingsInitialSyncDone = true;
        applyUserSettingsFromServer(
          data.settings,
          data.backgroundImageContent || '',
          data.backgroundMimeType || '',
          data.updated_at || ''
        );
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

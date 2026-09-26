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
  if (!googleAuth.email || !userSettingsInitialSyncDone || userSettingsApplyingFromServer) {
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

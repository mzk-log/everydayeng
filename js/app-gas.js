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
  parts.push('書込OK:' + gasSheetUpdate.okCount + ' 失敗:' + gasSheetUpdate.failCount);
  parts.push('IdB ' + audioStock.idbReady + '/' + audioStock.idbTarget + ' ' +
    Math.max(0, Math.round(audioStock.idbBytes / (1024 * 1024))) + '/' +
    Math.round(MAX_AUDIO_IDB_BYTES / (1024 * 1024)) + 'MB');
  if (audioStock.driveTarget != null) {
    parts.push('Drv ' + (audioStock.driveReady != null ? audioStock.driveReady : '-') + '/' + audioStock.driveTarget);
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

  var netEl = dom.netLoadDiag;
  if (netEl) {
    var screen2ForNet = dom.screen2;
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

  var runEl = dom.learningLoadDiag;
  if (runEl) {
    var screen2 = dom.screen2;
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
    loadDiag.bootTimer = timerId;
  } else {
    loadDiag.runTimer = timerId;
  }
}

/**
 * @param {'boot'|'run'} which
 */
function stopLoadDiagTicker(which) {
  if (which === 'boot' && loadDiag.bootTimer) {
    clearInterval(loadDiag.bootTimer);
    loadDiag.bootTimer = null;
  }
  if (which === 'run' && loadDiag.runTimer) {
    clearInterval(loadDiag.runTimer);
    loadDiag.runTimer = null;
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
    slot.lastSuccessSec = loadDiag.lastBootSec;
  } else if (extra.kind === 'update') {
    slot.lastSuccessSec = loadDiag.lastUpdateSec;
  } else if (extra.kind === 'all') {
    slot.lastSuccessSec = loadDiag.lastAllSec;
  } else {
    slot.lastSuccessSec = loadDiag.lastAudioSec;
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
      loadDiag.lastBootSec = elapsedSec;
      slot.lastSuccessSec = elapsedSec;
    } else if (opts.kind === 'update') {
      loadDiag.lastUpdateSec = elapsedSec;
      slot.lastSuccessSec = elapsedSec;
    } else if (opts.kind === 'all') {
      loadDiag.lastAllSec = elapsedSec;
      slot.lastSuccessSec = elapsedSec;
    } else {
      loadDiag.lastAudioSec = elapsedSec;
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
var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxTBkXrUOsYjzb1xERU-GXe5g8w9f0lxqOyxn6P8-VC9zNDMtjmTXOKRH_lBnRra3Kzcw/exec';  //PRD用

/**
 * 認証用 email（メモリ → localStorage）
 * @returns {string}
 */
function resolveAuthEmail() {
  var email = googleAuth.email || '';
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
  if (googleAuth.sessionToken) {
    return googleAuth.sessionToken;
  }
  try {
    var stored = localStorage.getItem(getAppSessionStorageKey());
    if (stored) {
      googleAuth.sessionToken = stored;
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
  googleAuth.sessionToken = token || null;
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

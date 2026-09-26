// メール／Googleログイン状態を確認し、必要に応じてログイン画面を表示
function checkUserEmail() {
  restoreGoogleAuthFromStorage();
  if (!googleAuth.email || !hasUsableAuth()) {
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
  var generationMatches = localOk && serverGen != null && !isNaN(serverGen) &&
    serverGen === Number(local.dataGeneration);
  var skipFetch = localOk && (settingsErr || generationMatches);
  if (localOk) {
    applyStudyItemsToApp(local.items, { isBoot: true });
    finishPageLoadingAndUnlock();
    fetchDriveAudioCoverage();
    ensureAudioPrefetchInventory();
  }
  if (skipFetch) {
    return;
  }
  if (!localOk) {
    setPageLoadingProgress(50, '全問データ');
  }
  fetchAllStudyItemsFromServer(function(fetchErr, items, meta) {
    if (meta && meta.droppedStale) {
      if (localOk) {
        return;
      }
      showBootDataRetry(new Error('データがありません'));
      return;
    }
    if (fetchErr) {
      if (isGoogleAuthFailureMessage(String(fetchErr.message || fetchErr))) {
        showError(String(fetchErr.message || fetchErr));
        return;
      }
      if (localOk) {
        return;
      }
      showBootDataRetry(fetchErr);
      return;
    }
    if (!items || !items.length) {
      if (localOk) {
        return;
      }
      showBootDataRetry(new Error('データがありません'));
      return;
    }
    var gen = (meta && meta.dataGeneration != null) ? meta.dataGeneration : serverGen;
    writeLocalStudyBundle(items || [], gen);
    applyStudyItemsToApp(items || [], {
      isBoot: true,
      skipLearningArrays: isActiveLearningSession()
    });
    if (!localOk) {
      finishPageLoadingAndUnlock();
      fetchDriveAudioCoverage();
      ensureAudioPrefetchInventory();
    }
  }, localOk ? { noRetryNotFound: true } : null);
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
  var loginBtn = dom.loginButton;
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
    googleAuth.email = localStorage.getItem('userEmail');
  } catch (e) {
    googleAuth.email = null;
  }
  googleAuth.idToken = readPersistedAuthValue(GOOGLE_ID_TOKEN_STORAGE_KEY);
  googleAuth.accessToken = readPersistedAuthValue(GOOGLE_ACCESS_TOKEN_STORAGE_KEY);
  googleAuth.accessExpiresAt = Number(readPersistedAuthValue(GOOGLE_ACCESS_TOKEN_EXPIRES_KEY) || 0) || 0;
  if (googleAuth.idToken && isGoogleIdTokenExpired(googleAuth.idToken)) {
    clearGoogleIdToken();
  }
  if (googleAuth.accessToken && googleAuth.accessExpiresAt && Date.now() >= googleAuth.accessExpiresAt) {
    clearGoogleAccessToken();
  }
  googleAuth.sessionToken = null;
  try {
    var storedSession = localStorage.getItem(getAppSessionStorageKey());
    if (storedSession) {
      googleAuth.sessionToken = storedSession;
    }
  } catch (e2) {
    googleAuth.sessionToken = null;
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
  if (googleAuth.idToken && !isGoogleIdTokenExpired(googleAuth.idToken)) {
    return googleAuth.idToken;
  }
  try {
    var stored = localStorage.getItem(GOOGLE_ID_TOKEN_STORAGE_KEY);
    if (stored && !isGoogleIdTokenExpired(stored)) {
      googleAuth.idToken = stored;
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
  googleAuth.idToken = token || null;
  writePersistedAuthValue(GOOGLE_ID_TOKEN_STORAGE_KEY, token || '');
}

function clearGoogleIdToken() {
  setGoogleIdToken('');
}

/**
 * @returns {string}
 */
function getGoogleAccessToken() {
  if (googleAuth.accessExpiresAt && Date.now() >= googleAuth.accessExpiresAt) {
    clearGoogleAccessToken();
    return '';
  }
  if (googleAuth.accessToken) {
    return googleAuth.accessToken;
  }
  try {
    var stored = localStorage.getItem(GOOGLE_ACCESS_TOKEN_STORAGE_KEY);
    var storedExp = Number(localStorage.getItem(GOOGLE_ACCESS_TOKEN_EXPIRES_KEY) || 0) || 0;
    if (storedExp && Date.now() >= storedExp) {
      clearGoogleAccessToken();
      return '';
    }
    if (stored) {
      googleAuth.accessToken = stored;
      googleAuth.accessExpiresAt = storedExp;
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
  googleAuth.accessToken = token || null;
  if (token && expiresInSec) {
    googleAuth.accessExpiresAt = Date.now() + (Number(expiresInSec) * 1000) - 60000;
  } else if (!token) {
    googleAuth.accessExpiresAt = 0;
  }
  writePersistedAuthValue(GOOGLE_ACCESS_TOKEN_STORAGE_KEY, token || '');
  writePersistedAuthValue(
    GOOGLE_ACCESS_TOKEN_EXPIRES_KEY,
    googleAuth.accessExpiresAt ? String(googleAuth.accessExpiresAt) : ''
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
  if (googleAuth.accessExpiresAt && (googleAuth.accessExpiresAt - Date.now()) > AUTH_REFRESH_MARGIN_MS) {
    return false;
  }
  if (hasValidGoogleAuthToken() && !idTok && !googleAuth.accessExpiresAt) {
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
  var email = googleAuth.email || '';
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
    var needInit = !googleLogin.initialized ||
      wantAutoSelect !== googleLogin.autoSelectEnabled ||
      loginHint !== googleLogin.loginHint;
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
      googleLogin.initialized = true;
      googleLogin.autoSelectEnabled = wantAutoSelect;
      googleLogin.loginHint = loginHint;
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
  googleLogin.autoSelectEnabled = false;
  googleLogin.loginHint = '';
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
      if (googleLogin.forceAccountSelect) {
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
  googleAuth.email = email;
  try {
    localStorage.setItem('userEmail', googleAuth.email);
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
  googleLogin.dialogCancellable = options.cancellable !== false;
  googleLogin.forceAccountSelect = !!options.forceAccountSelect;

  var overlay = dom.googleLoginOverlay;
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }
  var cancelBtn = dom.googleLoginCancelButton;
  if (cancelBtn) {
    cancelBtn.style.display = googleLogin.dialogCancellable ? 'inline-block' : 'none';
  }
  setGoogleLoginError('');
  hidePageLoading();
  cancelGoogleIdentityPrompt();

  // Brave等で GIS iframe ボタンが死ぬため、自前ボタンを主にする
  var appBtn = dom.googleSignInAppButton;
  if (appBtn) {
    appBtn.style.display = 'inline-flex';
  }
  var btnHost = dom.googleSignInButton;
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
  var overlay = dom.googleLoginOverlay;
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
  googleLogin.dialogCancellable = false;
  googleLogin.forceAccountSelect = false;
}

/**
 * キャンセル可能なログイン画面を閉じる
 * 未ログインのまま閉じた場合は TOP を操作不可状態にする
 */
function cancelGoogleLoginDialogIfAllowed() {
  if (!googleLogin.dialogCancellable) {
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
  var el = dom.googleLoginError;
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

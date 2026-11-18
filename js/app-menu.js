// サイドメニューを開く
function openSideMenu() {
  var sideMenu = dom.sideMenu;
  var hamburgerButton = dom.hamburgerMenuButton;
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
  var sideMenu = dom.sideMenu;
  var hamburgerButton = dom.hamburgerMenuButton;
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
  var sideMenu = dom.sideMenu;
  if (sideMenu && sideMenu.classList.contains('active')) {
    closeSideMenu();
  } else {
    openSideMenu();
  }
}

/**
 * サイドメニューのアコーディオン一覧
 * @returns {Array.<{submenu: HTMLElement|null, button: HTMLElement|null}>}
 */
function getSideMenuAccordionPairs_() {
  return [
    { submenu: dom.backgroundSubmenu, button: dom.changeBackgroundButton },
    { submenu: dom.audioSettingsSubmenu, button: dom.audioSettingsButton },
    { submenu: dom.questionSettingsSubmenu, button: dom.questionSettingsButton }
  ];
}

/**
 * 他のアコーディオンを閉じる（exceptSubmenu は残す）
 * @param {HTMLElement|null} exceptSubmenu
 */
function closeOtherSideMenuAccordions_(exceptSubmenu) {
  var pairs = getSideMenuAccordionPairs_();
  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    if (!pair.submenu || pair.submenu === exceptSubmenu) {
      continue;
    }
    pair.submenu.classList.remove('active');
    if (pair.button) {
      pair.button.classList.remove('active');
    }
  }
}

/**
 * 開いた親項目が見える位置へスクロール
 * @param {HTMLElement|null} parentButton
 */
function scrollSideMenuAccordionIntoView_(parentButton) {
  if (!parentButton || typeof parentButton.scrollIntoView !== 'function') {
    return;
  }
  try {
    parentButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  } catch (e) {
    parentButton.scrollIntoView(true);
  }
}

/**
 * アコーディオンをトグル（同時に開けるのは1つ）
 * @param {HTMLElement|null} submenu
 * @param {HTMLElement|null} parentButton
 */
function toggleSideMenuAccordion_(submenu, parentButton) {
  if (!submenu || !parentButton) {
    return;
  }
  var isActive = submenu.classList.contains('active');
  if (isActive) {
    submenu.classList.remove('active');
    parentButton.classList.remove('active');
    return;
  }
  closeOtherSideMenuAccordions_(submenu);
  submenu.classList.add('active');
  parentButton.classList.add('active');
  scrollSideMenuAccordionIntoView_(parentButton);
}

// 背景画像サブメニューをトグル
function toggleBackgroundSubmenu() {
  toggleSideMenuAccordion_(dom.backgroundSubmenu, dom.changeBackgroundButton);
}

// 音声設定サブメニューをトグル
function toggleAudioSettingsSubmenu() {
  toggleSideMenuAccordion_(dom.audioSettingsSubmenu, dom.audioSettingsButton);
}

// 出題設定サブメニューをトグル
function toggleQuestionSettingsSubmenu() {
  toggleSideMenuAccordion_(dom.questionSettingsSubmenu, dom.questionSettingsButton);
}

/**
 * 声は男性固定（UI選択なし）。Settings 互換のため localStorage も male に揃える。
 * @param {'question'|'answer'} [voiceType]
 * @returns {'male'}
 */
function getAudioVoice(voiceType) {
  try {
    var key = 'audioVoice_' + (voiceType || 'question');
    if (localStorage.getItem(key) !== AUDIO_VOICE_DEFAULT) {
      localStorage.setItem(key, AUDIO_VOICE_DEFAULT);
    }
  } catch (e) {
    // ignore
  }
  return AUDIO_VOICE_DEFAULT;
}

/**
 * 旧 female 等を male へ揃え、変わっていれば Settings 同期する
 * @returns {boolean} 書き戻しがあったか
 */
function migrateAudioVoicePrefs_() {
  var changed = false;
  try {
    ['question', 'answer'].forEach(function(side) {
      var key = 'audioVoice_' + side;
      if (localStorage.getItem(key) !== AUDIO_VOICE_DEFAULT) {
        localStorage.setItem(key, AUDIO_VOICE_DEFAULT);
        changed = true;
      }
    });
  } catch (e) {
    // ignore
  }
  return changed;
}

/**
 * UI／localStorage 用の再生倍率を正規化（0.4〜1.2・0.1刻み）
 * 選択肢に無い旧値はすべて 1.0（意味が変わったため）
 * @param {*} value
 * @returns {string}
 */
function normalizeAudioSpeedUi_(value) {
  var s = String(value == null ? '' : value).toLowerCase().trim();
  if (s === '1' || s === '1.00') {
    s = '1.0';
  }
  var options = typeof AUDIO_TIME_SCALE_OPTIONS !== 'undefined'
    ? AUDIO_TIME_SCALE_OPTIONS
    : ['1.0'];
  for (var i = 0; i < options.length; i++) {
    if (s === options[i]) {
      return options[i];
    }
  }
  var n = Number(s);
  if (isFinite(n)) {
    for (var j = 0; j < options.length; j++) {
      if (Math.abs(n - Number(options[j])) < 0.001) {
        return options[j];
      }
    }
  }
  return typeof AUDIO_TIME_SCALE_DEFAULT !== 'undefined'
    ? AUDIO_TIME_SCALE_DEFAULT
    : '1.0';
}

/**
 * 保管・取得・揃い判定用の速さ（常に medium）
 * @returns {string}
 */
function getAudioStorageSpeed() {
  return AUDIO_SPEED_FIXED;
}

/**
 * UI の再生倍率（0.4〜1.2）
 * @param {'question'|'answer'} [speedType]
 * @returns {string}
 */
function getAudioSpeed(speedType) {
  try {
    var key = 'audioSpeed_' + (speedType || 'question');
    return normalizeAudioSpeedUi_(localStorage.getItem(key));
  } catch (e) {
    return typeof AUDIO_TIME_SCALE_DEFAULT !== 'undefined'
      ? AUDIO_TIME_SCALE_DEFAULT
      : '1.0';
  }
}

/**
 * HTMLAudio の playbackRate（UI×2。案内／終わりは getAudioGuidePlaybackRate_）
 * @param {'question'|'answer'} [speedType]
 * @returns {number}
 */
function getAudioHtmlPlaybackRate_(speedType) {
  var factor = typeof AUDIO_PLAYBACK_RATE_FACTOR === 'number' ? AUDIO_PLAYBACK_RATE_FACTOR : 2;
  var n = Number(getAudioSpeed(speedType));
  if (!isFinite(n) || n <= 0) {
    n = 1;
  }
  return n * factor;
}

/**
 * カテゴリ案内・「終わり」用（常に普通＝実再生 2.0）
 * @returns {number}
 */
function getAudioGuidePlaybackRate_() {
  return typeof AUDIO_PLAYBACK_RATE_FACTOR === 'number' ? AUDIO_PLAYBACK_RATE_FACTOR : 2;
}

/**
 * @deprecated 互換。HTMLAudio 実倍率は getAudioHtmlPlaybackRate_
 * @param {'question'|'answer'} [speedType]
 * @returns {number}
 */
function getAudioSlowTimeScale(speedType) {
  return getAudioHtmlPlaybackRate_(speedType);
}

/**
 * @deprecated 互換
 * @param {'question'|'answer'} [speedType]
 * @returns {number}
 */
function getAudioPlaybackRate(speedType) {
  return getAudioHtmlPlaybackRate_(speedType);
}

/**
 * 再生倍率を保存（保管 mp3 は作り直さない）
 * @param {'question'|'answer'} speedType
 * @param {string|number} value
 */
function setAudioSpeed(speedType, value) {
  try {
    var normalized = normalizeAudioSpeedUi_(value);
    localStorage.setItem('audioSpeed_' + speedType, normalized);
    updateAudioSpeedButtons(speedType, normalized);
    if (typeof stopCurrentAudioPlayback === 'function') {
      stopCurrentAudioPlayback();
    }
    scheduleUserSettingsSync();
  } catch (e) {
    console.warn('速さ設定の保存に失敗しました。');
  }
}

/**
 * 速さ UI をドロップダウン／ボタンへ反映
 * @param {'question'|'answer'} speedType
 * @param {string} value
 */
function updateAudioSpeedButtons(speedType, value) {
  var normalized = normalizeAudioSpeedUi_(value);
  var select = document.getElementById(
    speedType === 'answer' ? 'audioSpeedSelectAnswer' : 'audioSpeedSelectQuestion'
  );
  if (select) {
    select.value = normalized;
  }
  var buttons = document.querySelectorAll('.audio-speed-button[data-speed-type="' + speedType + '"]');
  for (var i = 0; i < buttons.length; i++) {
    var active = buttons[i].getAttribute('data-speed-value') === normalized;
    buttons[i].classList.toggle('audio-speed-button-active', active);
  }
}

/**
 * 旧倍率・保管世代の移行（世代変更時は 1.0 リセット＋IdB クリア）
 * @returns {boolean} 書き戻しがあったか
 */
function migrateAudioSpeedPrefs_() {
  var changed = false;
  var epochKey = typeof AUDIO_STORAGE_EPOCH_KEY !== 'undefined'
    ? AUDIO_STORAGE_EPOCH_KEY
    : 'audioStorageEpoch';
  var epochVal = typeof AUDIO_STORAGE_EPOCH !== 'undefined' ? AUDIO_STORAGE_EPOCH : 'sr05-v1';
  var prevEpoch = '';
  try {
    prevEpoch = localStorage.getItem(epochKey) || '';
  } catch (eEp) {
    prevEpoch = '';
  }
  if (prevEpoch !== epochVal) {
    try {
      localStorage.setItem('audioSpeed_question', AUDIO_TIME_SCALE_DEFAULT);
      localStorage.setItem('audioSpeed_answer', AUDIO_TIME_SCALE_DEFAULT);
      localStorage.setItem(epochKey, epochVal);
      changed = true;
      // 直後の Settings 取得で旧 0.5/0.7 等が戻らないようにする
      window.audioSpeedEpochJustMigrated_ = true;
    } catch (eSet) {
      // ignore
    }
    if (typeof clearAudioCache === 'function') {
      clearAudioCache();
    }
    if (typeof clearAllAudioIdbClips_ === 'function') {
      clearAllAudioIdbClips_();
    }
  }
  var types = ['question', 'answer'];
  for (var i = 0; i < types.length; i++) {
    try {
      var key = 'audioSpeed_' + types[i];
      var raw = localStorage.getItem(key);
      if (raw == null || raw === '') {
        localStorage.setItem(key, AUDIO_TIME_SCALE_DEFAULT);
        changed = true;
        continue;
      }
      var normalized = normalizeAudioSpeedUi_(raw);
      if (String(raw) !== normalized) {
        localStorage.setItem(key, normalized);
        changed = true;
      }
    } catch (e) {
      // ignore
    }
  }
  return changed;
}

/**
 * 速さドロップダウンを選択肢で埋め、現在値を反映
 */
function syncAudioSpeedButtonsUi_() {
  var options = typeof AUDIO_TIME_SCALE_OPTIONS !== 'undefined'
    ? AUDIO_TIME_SCALE_OPTIONS
    : ['1.0'];
  var ids = [
    { id: 'audioSpeedSelectQuestion', type: 'question' },
    { id: 'audioSpeedSelectAnswer', type: 'answer' }
  ];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i].id);
    if (!el) {
      continue;
    }
    if (el.options.length !== options.length) {
      el.innerHTML = '';
      for (var o = 0; o < options.length; o++) {
        var opt = document.createElement('option');
        opt.value = options[o];
        opt.textContent = options[o];
        el.appendChild(opt);
      }
    }
    el.disabled = false;
    updateAudioSpeedButtons(ids[i].type, getAudioSpeed(ids[i].type));
  }
}

/** @deprecated 互換。UI 同期は syncAudioSpeedButtonsUi_ を使う */
function persistFixedAudioSpeed_() {
  migrateAudioSpeedPrefs_();
}

/** @deprecated 互換 */
function syncAudioSpeedButtonsLocked_() {
  syncAudioSpeedButtonsUi_();
}

// 音声設定を読み込み（localStorageから）
function loadAudioSettings() {
  var voiceChanged = migrateAudioVoicePrefs_();
  var speedChanged = migrateAudioSpeedPrefs_();
  if ((voiceChanged || speedChanged) && typeof scheduleUserSettingsSync === 'function') {
    scheduleUserSettingsSync();
  }
  syncAudioSpeedButtonsUi_();
}

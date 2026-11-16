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
 * UI／localStorage 用の再生倍率を正規化（0.5|0.7|0.8|1.0）
 * 旧値：slow→0.8、0.9→0.8、medium／fast→1.0
 * @param {*} value
 * @returns {'0.5'|'0.7'|'0.8'|'1.0'}
 */
function normalizeAudioSpeedUi_(value) {
  var s = String(value == null ? '' : value).toLowerCase().trim();
  if (s === 'slow' || s === '0.9' || s === '0.90') {
    return '0.8';
  }
  if (s === 'medium' || s === 'fast' || s === '1' || s === '1.00') {
    return AUDIO_TIME_SCALE_DEFAULT;
  }
  var options = typeof AUDIO_TIME_SCALE_OPTIONS !== 'undefined'
    ? AUDIO_TIME_SCALE_OPTIONS
    : ['0.5', '0.7', '0.8', '1.0'];
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
 * UI の再生倍率（'0.5'|'0.7'|'0.8'|'1.0'）
 * @param {'question'|'answer'} [speedType]
 * @returns {'0.5'|'0.7'|'0.8'|'1.0'}
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
 * PCM タイムストレッチ用の時間倍率（1＝変更なし）
 * @param {'question'|'answer'} [speedType]
 * @returns {number}
 */
function getAudioSlowTimeScale(speedType) {
  var n = Number(getAudioSpeed(speedType));
  return isFinite(n) && n > 0 ? n : 1;
}

/**
 * @deprecated 単純 playbackRate は使わない。常に 1（ストレッチ後バッファを rate=1 で再生）
 * @param {'question'|'answer'} [speedType]
 * @returns {number}
 */
function getAudioPlaybackRate(speedType) {
  return 1;
}

/**
 * 再生倍率を保存（保管キーは medium のまま。再 TTS しない）
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
 * 旧 medium|slow|fast 等を倍率文字列へ直す
 * @returns {boolean} 書き戻しがあったか
 */
function migrateAudioSpeedPrefs_() {
  var changed = false;
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
 * 速さボタン：0.5／0.7／0.8／1.0 を選択可
 */
function syncAudioSpeedButtonsUi_() {
  var types = ['question', 'answer'];
  for (var t = 0; t < types.length; t++) {
    updateAudioSpeedButtons(types[t], getAudioSpeed(types[t]));
  }
  var buttons = document.querySelectorAll('.audio-speed-button');
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = false;
    buttons[i].removeAttribute('aria-disabled');
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

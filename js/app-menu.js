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

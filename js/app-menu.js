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

// 背景画像選択を開く
// 背景画像サブメニューをトグル
function toggleBackgroundSubmenu() {
  var submenu = dom.backgroundSubmenu;
  var parentButton = dom.changeBackgroundButton;
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
  var submenu = dom.audioSettingsSubmenu;
  var parentButton = dom.audioSettingsButton;
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
  var submenu = dom.questionSettingsSubmenu;
  var parentButton = dom.questionSettingsButton;
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

// イベントリスナーの設定
function setupEventListeners() {
  dom.categorySelect.addEventListener('change', function() {
    var categoryNo = this.value;
    if (categoryNo) {
      // ENDカテゴリは選択不可
      var selectedCat = null;
      for (var si = 0; si < categoryCatalog.list.length; si++) {
        if (String(categoryCatalog.list[si].no) === String(categoryNo)) {
          selectedCat = categoryCatalog.list[si];
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
  var learningCategorySelect = dom.learningCategorySelect;
  if (learningCategorySelect) {
    learningCategorySelect.addEventListener('change', function() {
      if (isCategoryTransitionInProgress) {
        return;
      }
      var categoryNo = this.value;
      if (!categoryNo || !studyEnd.done) {
        return;
      }
      var selectedCat = null;
      for (var si = 0; si < categoryCatalog.list.length; si++) {
        if (String(categoryCatalog.list[si].no) === String(categoryNo)) {
          selectedCat = categoryCatalog.list[si];
          break;
        }
      }
      if (selectedCat && isEndCategory(selectedCat)) {
        this.value = categoryCatalog.no != null ? String(categoryCatalog.no) : '';
        syncCustomCategorySelect(this);
        return;
      }
      loadCategoryDataForCompletionBrowse(categoryNo);
    });
  }
  
  // カテゴリ・カスタムドロップダウン初期化（全文折り返し）
  syncCustomCategorySelect(dom.categorySelect);
  syncCustomCategorySelect(dom.learningCategorySelect);
  document.addEventListener('click', function() {
    closeAllCustomCategorySelects();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeAllCustomCategorySelects();
    }
  });
  
  dom.startButton.addEventListener('click', function() {
    if (this.disabled) return;
    playStartSfxThen(startLearning);
  });
  
  // ナビゲーションバー中央ボタン（Ans / Next）
  dom.navAnswerButton.addEventListener('click', function() {
    handleNavAnswerButtonClick();
  });
  
  bindFieldPlayButton(dom.questionPlayButton, 'question');
  bindFieldPlayButton(dom.answerPlayButton, 'answer');
  
  dom.homeButton.addEventListener('click', function() {
    if (this.disabled) return;
    goToHome();
  });
  
  dom.plusButton.addEventListener('click', function() {
    if (this.disabled) return;
    playRetrySfxThen(handlePlusButtonClick);
  });
  var questionEditPencil = dom.questionEditPencil;
  if (questionEditPencil) {
    questionEditPencil.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      startUpdateMode('question');
    });
  }
  var answerEditPencil = dom.answerEditPencil;
  if (answerEditPencil) {
    answerEditPencil.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      startUpdateMode('answer');
    });
  }
  var noteEyeButton = dom.noteEyeButton;
  if (noteEyeButton) {
    noteEyeButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (updateMode.active || studyEnd.done || !questionCursor.answerShown) {
        return;
      }
      var noteItem = getCurrentLearningItem();
      if (!noteItem || !String(noteItem.note || '').trim()) {
        return;
      }
      learningNote.expanded = true;
      applyLearningNoteDisplay(noteItem);
      updateFieldEditPencils();
    });
  }
  var noteEditPencil = dom.noteEditPencil;
  if (noteEditPencil) {
    noteEditPencil.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      startUpdateMode('note');
    });
  }
  bindLearningBodyGestures();
  
  // 出題読みトグルボタン
  dom.questionToggleButton.addEventListener('click', function() {
    if (isAppAuthUiLocked()) {
      return;
    }
    if (isListeningModeEnabled()) {
      return; // リスニング練習中はON固定
    }
    readToggle.question = !readToggle.question;
    applyReadToggleButtonUi();
    saveReadToggle('question', readToggle.question);
  });
  
  // 解答読みトグルボタン
  dom.answerToggleButton.addEventListener('click', function() {
    if (isAppAuthUiLocked()) {
      return;
    }
    readToggle.answer = !readToggle.answer;
    applyReadToggleButtonUi();
    // リスニング中の切替は一時的（OFF復帰でON前に戻す）のため保存しない
    if (!isListeningModeEnabled()) {
      saveReadToggle('answer', readToggle.answer);
    }
  });
  
  dom.loginButton.addEventListener('click', function() {
    // 再ログイン時は自動選択を止め、アカウント切替できるようにする
    disableGoogleAutoSelect();
    showGoogleLoginDialog({ cancellable: true, forceAccountSelect: true });
  });

  var googleSignInAppButton = dom.googleSignInAppButton;
  if (googleSignInAppButton) {
    googleSignInAppButton.addEventListener('click', function() {
      startGoogleOAuthTokenLogin();
    });
  }

  var googleLoginCancelButton = dom.googleLoginCancelButton;
  if (googleLoginCancelButton) {
    googleLoginCancelButton.addEventListener('click', function() {
      cancelGoogleLoginDialogIfAllowed();
    });
  }
  var googleLoginOverlay = dom.googleLoginOverlay;
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
  dom.modalCloseButton.addEventListener('click', function() {
    closeModal();
  });
  
  // モーダルオーバーレイクリックで閉じる
  dom.modalOverlay.addEventListener('click', function(e) {
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
  dom.modalPrevButton.addEventListener('click', function() {
    if (questionList.modalIndex > 0) {
      questionList.modalIndex--;
      var item = categoryCatalog.items[questionList.modalIndex];
      if (item) {
        updateModalContent(item);
        updateModalNavigation();
        updateModalSelection();
      }
    }
  });
  
  // モーダル内の次へボタン
  dom.modalNextButton.addEventListener('click', function() {
    if (questionList.modalIndex < categoryCatalog.items.length - 1) {
      questionList.modalIndex++;
      var item = categoryCatalog.items[questionList.modalIndex];
      if (item) {
        updateModalContent(item);
        updateModalNavigation();
        updateModalSelection();
      }
    }
  });
  
  // モーダル内の選択ボタン
  dom.modalSelectButton.addEventListener('click', function() {
    handleModalSelection();
  });
  
  // クリアボタン
  dom.clearSelectionButton.addEventListener('click', function() {
    clearSelection();
  });
  
  var completionClearButton = dom.completionClearSelectionButton;
  if (completionClearButton) {
    completionClearButton.addEventListener('click', function() {
      clearSelection();
    });
  }
  
  // Listナビゲーションボタン（前へ）
  dom.listPrevButton.addEventListener('click', function() {
    navigateToPreviousCategory();
  });
  
  // Listナビゲーションボタン（次へ）
  dom.listNextButton.addEventListener('click', function() {
    navigateToNextCategory();
  });

  var learningListPrevButton = dom.learningListPrevButton;
  if (learningListPrevButton) {
    learningListPrevButton.addEventListener('click', function() {
      if (studyEnd.done) {
        navigateCompletionCategory(-1);
      }
    });
  }

  var learningListNextButton = dom.learningListNextButton;
  if (learningListNextButton) {
    learningListNextButton.addEventListener('click', function() {
      if (studyEnd.done) {
        navigateCompletionCategory(1);
      }
    });
  }
  
  // ハンバーガーメニューボタン
  dom.hamburgerMenuButton.addEventListener('click', function() {
    toggleSideMenu();
  });
  
  // サイドメニュー閉じるボタン
  dom.sideMenuCloseButton.addEventListener('click', function() {
    closeSideMenu();
  });
  
  // サイドメニューオーバーレイクリックで閉じる
  document.querySelector('.side-menu-overlay').addEventListener('click', function() {
    closeSideMenu();
  });
  
  // 問題追加中の ESC は閉じない（閉じる／× のみ）。裏のメニューも閉じない
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var addOverlay = dom.addStudyItemOverlay;
      if (addOverlay && addOverlay.style.display !== 'none') {
        return;
      }
      closeSideMenu();
    }
  });
  
  // 背景画像変更ボタン（アコーディオン）
  dom.changeBackgroundButton.addEventListener('click', function() {
    toggleBackgroundSubmenu();
  });
  
  // 音声設定のアコーディオンメニュー
  dom.audioSettingsButton.addEventListener('click', function() {
    toggleAudioSettingsSubmenu();
  });
  
  // 表示カテゴリ（HOMEのみ）
  dom.visibleCategoriesButton.addEventListener('click', function() {
    toggleVisibleCategoriesSubmenu();
  });
  dom.visibleCategoriesSelectAllButton.addEventListener('click', function() {
    setAllVisibleCategoryChecks(true);
  });
  dom.visibleCategoriesClearAllButton.addEventListener('click', function() {
    setAllVisibleCategoryChecks(false);
  });
  dom.visibleCategoriesSaveButton.addEventListener('click', function() {
    saveVisibleCategoriesFromUi();
  });
  var addStudyItemMenuButton = dom.addStudyItemMenuButton;
  if (addStudyItemMenuButton) {
    addStudyItemMenuButton.addEventListener('click', function() {
      openAddStudyItemOverlay();
    });
  }
  var addStudyItemCategorySelect = dom.addStudyItemCategorySelect;
  if (addStudyItemCategorySelect) {
    addStudyItemCategorySelect.addEventListener('change', function() {
      resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
      syncAddStudyItemNewCategoryFields();
      syncAddStudyItemInputLock();
      renderAddStudyItemList();
      setAddStudyItemStatus('', false);
      syncAddStudyItemRenameFields(true);
    });
  }
  var addStudyItemBackToAddButton = dom.addStudyItemBackToAddButton;
  if (addStudyItemBackToAddButton) {
    addStudyItemBackToAddButton.addEventListener('click', function() {
      resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
      renderAddStudyItemList();
      setAddStudyItemStatus('', false);
    });
  }
  var addStudyItemList = dom.addStudyItemList;
  if (addStudyItemList) {
    addStudyItemList.addEventListener('click', handleAddStudyItemListClick);
  }
  var addStudyItemSaveButton = dom.addStudyItemSaveButton;
  if (addStudyItemSaveButton) {
    addStudyItemSaveButton.addEventListener('click', function() {
      if (addStudy.formBusy) {
        return;
      }
      if (addStudy.formConfirming) {
        if (addStudy.confirmKind === 'rename') {
          return;
        }
        submitAddStudyItemConfirm();
      } else {
        showAddStudyItemConfirm();
      }
    });
  }
  var addStudyItemRenameButton = dom.addStudyItemRenameButton;
  if (addStudyItemRenameButton) {
    addStudyItemRenameButton.addEventListener('click', function() {
      if (addStudy.formBusy) {
        return;
      }
      if (addStudy.formConfirming && addStudy.confirmKind === 'rename') {
        submitRenameStudyCategory();
      } else if (!addStudy.formConfirming) {
        showAddStudyItemRenameConfirm();
      }
    });
  }
  var addStudyItemRenameName = dom.addStudyItemRenameName;
  if (addStudyItemRenameName) {
    addStudyItemRenameName.addEventListener('input', syncAddStudyItemEditorUi);
  }
  var addStudyItemLiveIds = [
    'addStudyItemQuestion',
    'addStudyItemAnswer',
    'addStudyItemNote',
    'addStudyItemCategoryName',
    'addStudyItemQTitle',
    'addStudyItemATitle'
  ];
  for (var li = 0; li < addStudyItemLiveIds.length; li++) {
    var liveEl = document.getElementById(addStudyItemLiveIds[li]);
    if (liveEl) {
      liveEl.addEventListener('input', syncAddStudyItemInputLock);
    }
  }
  var addStudyItemCancelButton = dom.addStudyItemCancelButton;
  if (addStudyItemCancelButton) {
    addStudyItemCancelButton.addEventListener('click', function() {
      if (addStudy.formBusy) {
        return;
      }
      if (addStudy.formConfirming) {
        cancelAddStudyItemFormConfirm();
      } else {
        closeAddStudyItemOverlay();
      }
    });
  }
  var addStudyItemCloseButton = dom.addStudyItemCloseButton;
  if (addStudyItemCloseButton) {
    addStudyItemCloseButton.addEventListener('click', function() {
      if (addStudy.formBusy) {
        return;
      }
      closeAddStudyItemOverlay();
    });
  }
  bindAnswerUpdateConfirmModalListeners();
  dom.visibleCategoriesCancelButton.addEventListener('click', function() {
    closeVisibleCategoriesSubmenu();
  });
  
  // 出題設定のアコーディオンメニュー
  dom.questionSettingsButton.addEventListener('click', function() {
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
  dom.selectBackgroundButton.addEventListener('click', function() {
    closeSideMenu();
    openBackgroundImageSelector();
  });
  
  // 背景画像選択モーダルの閉じるボタン
  dom.backgroundSelectCloseButton.addEventListener('click', function() {
    closeBackgroundSelectModal();
  });
  
  // 背景画像選択モーダルのオーバーレイクリックで閉じる
  dom.backgroundSelectModal.addEventListener('click', function(e) {
    if (e.target === this) {
      closeBackgroundSelectModal();
    }
  });
  
  // 初期値に戻すボタン
  dom.resetBackgroundButton.addEventListener('click', function() {
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
  dom.backgroundPreviewCloseButton.addEventListener('click', function() {
    closeBackgroundPreviewModal();
  });
  
  // 背景画像プレビューモーダルのキャンセルボタン
  dom.backgroundPreviewCancelButton.addEventListener('click', function() {
    closeBackgroundPreviewModal();
  });
  
  // 背景画像プレビューモーダルの確定ボタン
  dom.backgroundPreviewConfirmButton.addEventListener('click', function() {
    confirmBackgroundImage();
  });
  
  // 背景画像プレビューモーダルのオーバーレイクリックで閉じる
  dom.backgroundPreviewModal.addEventListener('click', function(e) {
    if (e.target === this) {
      closeBackgroundPreviewModal();
    }
  });

  preloadUiClickSfx();
}

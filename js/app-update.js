// ========================================
// 更新モード関連の関数
// ========================================

/**
 * 更新モードを開始
 * @param {string} displayTarget - 'question' | 'answer' | 'note'
 */
function startUpdateMode(displayTarget) {
  if (updateMode.active) return;
  if (studyEnd.done) return;
  if (!questionCursor.answerShown) return;
  
  var item = getCurrentLearningItem();
  if (!item) return;
  
  var ui = getUpdateUiConfig(displayTarget);
  if (!ui) return;
  
  updateMode.displayTarget = displayTarget;
  updateMode.storageField = resolveStorageField(displayTarget);
  updateMode.originalText = item[updateMode.storageField] || '';
  
  updateMode.active = true;
  updateFieldEditPencils();
  
  var displayEl = document.getElementById(ui.displayId);
  if (displayEl) {
    displayEl.style.display = 'none';
  }
  
  var editEl = document.getElementById(ui.editId);
  if (editEl) {
    editEl.value = updateMode.originalText;
    editEl.style.display = 'block';
    editEl.focus();
  }
  
  var controlsEl = document.getElementById(ui.controlsId);
  if (controlsEl) {
    controlsEl.style.display = 'flex';
  }
  
  var activeSection = document.getElementById(ui.sectionId);
  if (activeSection) {
    activeSection.classList.add('field-editing-active');
  }
  
  applyUpdateModeOverlay(ui.sectionId);
  setupUpdateModeEventListeners();
}

/**
 * 編集対象の表示を反映する
 * @param {Object} item
 * @param {string} text
 */
function refreshEditedFieldDisplay(item, text) {
  if (!updateMode.displayTarget) return;
  
  if (updateMode.displayTarget === 'question') {
    var questionText = dom.questionText;
    if (questionText) {
      var effectiveQuestion = getEffectiveQuestion(item);
      var isListeningQuestion = isListeningModeEnabled() && effectiveQuestion && !isImageUrl(effectiveQuestion);
      if (isListeningQuestion && !questionCursor.answerShown) {
        questionText.textContent = LISTENING_PLACEHOLDER_TEXT;
      } else {
        displayImageOrText(questionText, effectiveQuestion);
      }
      questionText.style.display = '';
    }
    return;
  }
  
  if (updateMode.displayTarget === 'answer') {
    var answerTextDisplay = dom.answerTextDisplay;
    if (answerTextDisplay) {
      displayImageOrText(answerTextDisplay, getEffectiveAnswer(item));
      answerTextDisplay.style.display = 'block';
    }
    return;
  }
  
  if (updateMode.displayTarget === 'note') {
    if (String(item.note || '').trim()) {
      learningNote.expanded = true;
    }
    applyLearningNoteDisplay(item);
    var noteText = dom.noteText;
    if (noteText) {
      noteText.style.display = '';
    }
  }
}

/**
 * 更新モードを終了
 * @param {boolean} restoreOriginal - trueなら編集前に戻す
 */
function endUpdateMode(restoreOriginal) {
  if (!updateMode.active) return;
  
  var ui = getUpdateUiConfig(updateMode.displayTarget);
  var item = getCurrentLearningItem();
  
  updateMode.active = false;
  
  if (ui) {
    var editEl = document.getElementById(ui.editId);
    if (editEl) {
      editEl.style.display = 'none';
    }
    var controlsEl = document.getElementById(ui.controlsId);
    if (controlsEl) {
      controlsEl.style.display = 'none';
    }
    var activeSection = document.getElementById(ui.sectionId);
    if (activeSection) {
      activeSection.classList.remove('field-editing-active');
    }
  }
  
  removeUpdateModeOverlay();
  
  if (item && updateMode.storageField) {
    if (restoreOriginal) {
      item[updateMode.storageField] = updateMode.originalText;
    } else if (ui) {
      var editElAfter = document.getElementById(ui.editId);
      if (editElAfter) {
        item[updateMode.storageField] = editElAfter.value || '';
      }
    }
    refreshEditedFieldDisplay(item, item[updateMode.storageField] || '');
  }
  
  if (voiceRec.active) {
    stopVoiceRecognition();
  }
  
  updateMode.displayTarget = null;
  updateMode.storageField = null;
  updateMode.originalText = '';
  
  setupFieldEditDoubleClick();
}

/**
 * 更新モード中のオーバーレイを適用
 * @param {string} activeSectionId - 編集中セクションのID
 */
function applyUpdateModeOverlay(activeSectionId) {
  var existingOverlay = document.getElementById('updateModeOverlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  var overlay = document.createElement('div');
  overlay.id = 'updateModeOverlay';
  overlay.className = 'update-mode-overlay';
  document.body.appendChild(overlay);
  
  var screen2 = dom.screen2;
  if (screen2) {
    var elementsToDisable = screen2.querySelectorAll('.section, .navigation-bar');
    elementsToDisable.forEach(function(element) {
      if (activeSectionId && element.id === activeSectionId) {
        return;
      }
      element.classList.add('update-mode-disabled');
    });
  }
}

// 更新モード中のオーバーレイを削除
function removeUpdateModeOverlay() {
  var overlay = document.getElementById('updateModeOverlay');
  if (overlay) {
    overlay.remove();
  }
  
  var screen2 = dom.screen2;
  if (screen2) {
    var elementsToEnable = screen2.querySelectorAll('.update-mode-disabled');
    elementsToEnable.forEach(function(element) {
      element.classList.remove('update-mode-disabled');
    });
  }
}

var answerUpdateConfirmModalListenersBound = false;

function bindAnswerUpdateConfirmModalListeners() {
  if (answerUpdateConfirmModalListenersBound) {
    return;
  }
  var closeButton = dom.answerUpdateConfirmCloseButton;
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      closeUpdateConfirmModal();
    });
  }
  var cancelButton = dom.answerUpdateConfirmCancelButton;
  if (cancelButton) {
    cancelButton.addEventListener('click', function() {
      closeUpdateConfirmModal();
    });
  }
  var okButton = dom.answerUpdateConfirmOkButton;
  if (okButton) {
    okButton.addEventListener('click', function() {
      if (addStudy.confirmPending) {
        submitAddStudyItemConfirm();
      } else {
        saveItemField();
      }
    });
  }
  var modal = dom.answerUpdateConfirmModal;
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal && !addStudy.modalBusy) {
        closeUpdateConfirmModal();
      }
    });
  }
  answerUpdateConfirmModalListenersBound = true;
}

// 更新モード用のイベントリスナーを設定
function setupUpdateModeEventListeners() {
  var updateButtonIds = ['questionUpdateButton', 'answerUpdateButton', 'noteUpdateButton'];
  updateButtonIds.forEach(function(id) {
    var button = document.getElementById(id);
    if (button) {
      button.onclick = function() {
        showUpdateConfirmModal();
      };
    }
  });
  
  var endButtonIds = ['questionEndButton', 'answerEndButton', 'noteEndButton'];
  endButtonIds.forEach(function(id) {
    var button = document.getElementById(id);
    if (button) {
      button.onclick = function() {
        endUpdateMode(true);
      };
    }
  });
  
  var micButton = dom.answerMicButton;
  if (micButton) {
    micButton.onclick = function() {
      toggleVoiceRecognition();
    };
  }
}

// 更新確認モーダルを表示
function showUpdateConfirmModal() {
  var modal = dom.answerUpdateConfirmModal;
  var title = dom.answerUpdateConfirmTitle;
  if (title) {
    title.textContent = getConfirmTitleForStorageField(updateMode.storageField);
  }
  if (modal) {
    modal.classList.add('active');
  }
}

// 更新確認モーダルを閉じる
function closeUpdateConfirmModal() {
  addStudy.confirmPending = false;
  addStudy.confirmKind = '';
  setConfirmModalBusy(false);
  var modal = dom.answerUpdateConfirmModal;
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * 編集中フィールドをスプレッドシートへ保存
 */
function saveItemField() {
  var ui = getUpdateUiConfig(updateMode.displayTarget);
  if (!ui || !updateMode.storageField) return;
  
  var editEl = document.getElementById(ui.editId);
  if (!editEl) return;
  
  var item = getCurrentLearningItem();
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    closeUpdateConfirmModal();
    endUpdateMode(true);
    return;
  }
  
  var newValue = editEl.value || '';
  var oldValue = (item[updateMode.storageField] != null) ? String(item[updateMode.storageField]) : String(updateMode.originalText || '');
  var storageFieldForAudio = updateMode.storageField;
  
  setConfirmModalBusy(true, '更新中...');
  
  updateItemFieldAsync(
    item,
    updateMode.storageField,
    newValue,
    function() {
      item[storageFieldForAudio] = newValue;
      if (storageFieldForAudio === 'question' || storageFieldForAudio === 'answer') {
        clearLocalAudioCachesForText(oldValue);
        clearLocalAudioCachesForText(newValue);
        deleteDriveAudioAsync(item, storageFieldForAudio);
      }
      closeUpdateConfirmModal();
      endUpdateMode(false);
    },
    function() {
      closeUpdateConfirmModal();
      endUpdateMode(true);
    }
  );
}

// ========================================
// 音声認識関連の関数
// ========================================

// 音声認識を開始/停止
function toggleVoiceRecognition() {
  if (voiceRec.active) {
    stopVoiceRecognition();
  } else {
    startVoiceRecognition();
  }
}

// 音声認識を開始
function startVoiceRecognition() {
  if (voiceRec.active) return;
  
  // マイクアクセス許可を取得
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(function(stream) {
      voiceRec.active = true;
      voiceRec.chunks = [];
      
      // MediaRecorderを作成
      var options = { mimeType: 'audio/webm;codecs=opus' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'audio/webm' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {}; // デフォルト形式を使用
      }
      
      voiceRec.recorder = new MediaRecorder(stream, options);
      
      voiceRec.recorder.ondataavailable = function(event) {
        if (event.data.size > 0) {
          voiceRec.chunks.push(event.data);
        }
      };
      
      voiceRec.recorder.onstop = function() {
        // 録音が停止したら音声データを処理
        processRecordedAudio();
        
        // ストリームを停止
        stream.getTracks().forEach(function(track) {
          track.stop();
        });
      };
      
      // 録音開始
      voiceRec.recorder.start();
      
      // マイクボタンのスタイルを更新
      var micButton = dom.answerMicButton;
      if (micButton) {
        micButton.classList.add('recording');
      }
    })
    .catch(function(error) {
      showError('マイクアクセスに失敗しました: ' + error.toString());
    });
}

// 音声認識を停止
function stopVoiceRecognition() {
  if (!voiceRec.active || !voiceRec.recorder) return;
  
  if (voiceRec.recorder.state === 'recording') {
    voiceRec.recorder.stop();
  }
  
  voiceRec.active = false;
  
  // マイクボタンのスタイルを更新
  var micButton = dom.answerMicButton;
  if (micButton) {
    micButton.classList.remove('recording');
  }
}

// 録音した音声データを処理
function processRecordedAudio() {
  if (voiceRec.chunks.length === 0) return;
  
  // Blobを作成
  var audioBlob = new Blob(voiceRec.chunks, { type: 'audio/webm' });
  
  // Base64エンコード
  var reader = new FileReader();
  reader.onloadend = function() {
    var base64Audio = reader.result.split(',')[1]; // data:audio/webm;base64, の部分を除去
    
    // Google Apps Script経由で音声認識APIを呼び出し
    var params = new URLSearchParams();
    params.append('action', 'speechToText');
    params.append('audioContent', base64Audio);
    params.append('languageCode', 'ja-JP');
    appendAuthParams(params);
    params.append('referer', window.location.origin);
    
    // ローディング表示
    var micButton = dom.answerMicButton;
    if (micButton) {
      micButton.disabled = true;
    }
    
    postGasJson(params)
    .then(function(data) {
      if (micButton) {
        micButton.disabled = false;
      }
      
      if (data.success && data.text) {
        // 認識結果をテキストエリアに挿入（カーソル位置に、または末尾に）
        var answerTextEdit = dom.answerTextEdit;
        if (answerTextEdit) {
          var currentText = answerTextEdit.value;
          var cursorPos = answerTextEdit.selectionStart;
          var textBefore = currentText.substring(0, cursorPos);
          var textAfter = currentText.substring(cursorPos);
          answerTextEdit.value = textBefore + data.text + textAfter;
          
          // カーソル位置を更新
          var newCursorPos = cursorPos + data.text.length;
          answerTextEdit.setSelectionRange(newCursorPos, newCursorPos);
          answerTextEdit.focus();
        }
      } else {
        showError('音声認識に失敗しました: ' + (data.error || 'Unknown error'));
      }
    })
    .catch(function(error) {
      if (micButton) {
        micButton.disabled = false;
      }
      showError('音声認識エラー: ' + error.toString());
    });
  };
  
  reader.readAsDataURL(audioBlob);
}

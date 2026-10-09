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
    updateMode.selectionStart = null;
    updateMode.selectionEnd = null;
    bindYomiganaSelectionMemory_(editEl);
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
      clearYomiganaSelectionMemory_(editEl);
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

var YOMIGANA_PHONEME_OPEN = '<phoneme alphabet="yomigana" ph="';
var YOMIGANA_PHONEME_AFTER_PH = '">';
var YOMIGANA_PHONEME_CLOSE = '</phoneme>';
var ENGLISH_LANG_OPEN = '<lang xml:lang="en-US">';
var ENGLISH_LANG_CLOSE = '</lang>';

/**
 * 選択記憶の格納先（学習中の鉛筆編集／問題追加フォーム）
 * @param {HTMLTextAreaElement} editEl
 * @returns {{start: *, end: *, editId?: string}|null}
 */
function getSsmlSelectionStore_(editEl) {
  if (!editEl) {
    return null;
  }
  if (updateMode.active && (editEl.id === 'questionTextEdit' || editEl.id === 'answerTextEdit')) {
    return updateMode;
  }
  if (editEl.id === 'addStudyItemQuestion' || editEl.id === 'addStudyItemAnswer') {
    return addStudySsmlSelection;
  }
  return null;
}

/**
 * ボタン押下でフォーカスが移る前に、選択範囲またはカーソル位置を覚える
 * @param {HTMLTextAreaElement} editEl
 */
function rememberYomiganaSelection_(editEl) {
  var store = getSsmlSelectionStore_(editEl);
  if (!editEl || !store) {
    return;
  }
  var start = editEl.selectionStart;
  var end = editEl.selectionEnd;
  if (store === addStudySsmlSelection) {
    if (start == null || end == null) {
      store.start = null;
      store.end = null;
      store.editId = '';
      return;
    }
    store.start = start;
    store.end = end;
    store.editId = editEl.id || '';
    return;
  }
  if (start == null || end == null) {
    store.selectionStart = null;
    store.selectionEnd = null;
    return;
  }
  store.selectionStart = start;
  store.selectionEnd = end;
}

/**
 * @param {HTMLTextAreaElement} editEl
 */
function bindYomiganaSelectionMemory_(editEl) {
  if (!editEl) {
    return;
  }
  editEl.onmouseup = function() {
    rememberYomiganaSelection_(editEl);
  };
  editEl.ontouchend = function() {
    rememberYomiganaSelection_(editEl);
  };
  editEl.onkeyup = function() {
    rememberYomiganaSelection_(editEl);
  };
}

/**
 * @param {HTMLTextAreaElement} editEl
 */
function clearYomiganaSelectionMemory_(editEl) {
  if (!editEl) {
    return;
  }
  editEl.onmouseup = null;
  editEl.ontouchend = null;
  editEl.onkeyup = null;
  var store = getSsmlSelectionStore_(editEl);
  if (!store) {
    return;
  }
  if (store === addStudySsmlSelection) {
    store.start = null;
    store.end = null;
    store.editId = '';
  } else {
    store.selectionStart = null;
    store.selectionEnd = null;
  }
}

/**
 * 有効な挿入位置か
 * @param {string} value
 * @param {number|null} start
 * @param {number|null} end
 * @returns {boolean}
 */
function isValidYomiganaRange_(value, start, end) {
  return start != null && end != null &&
    start >= 0 && end <= value.length && start <= end;
}

/**
 * 記憶している選択範囲を取り出す
 * @param {HTMLTextAreaElement} editEl
 * @returns {{start: number|null, end: number|null}}
 */
function getStoredSsmlSelection_(editEl) {
  var store = getSsmlSelectionStore_(editEl);
  if (!store) {
    return { start: null, end: null };
  }
  if (store === addStudySsmlSelection) {
    if (store.editId && store.editId !== editEl.id) {
      return { start: null, end: null };
    }
    return { start: store.start, end: store.end };
  }
  return { start: store.selectionStart, end: store.selectionEnd };
}

/**
 * いまの選択／カーソル。ボタンで消えていれば、直前の位置を使う
 * @param {HTMLTextAreaElement} editEl
 * @returns {{start: number, end: number}|null}
 */
function getYomiganaInsertRange_(editEl) {
  var value = editEl.value || '';
  var liveStart = editEl.selectionStart;
  var liveEnd = editEl.selectionEnd;
  var stored = getStoredSsmlSelection_(editEl);
  var memStart = stored.start;
  var memEnd = stored.end;

  if (isValidYomiganaRange_(value, liveStart, liveEnd) && liveStart < liveEnd) {
    return { start: liveStart, end: liveEnd };
  }
  if (isValidYomiganaRange_(value, memStart, memEnd) && memStart < memEnd) {
    return { start: memStart, end: memEnd };
  }
  if (document.activeElement === editEl &&
      isValidYomiganaRange_(value, liveStart, liveEnd) && liveStart === liveEnd) {
    return { start: liveStart, end: liveEnd };
  }
  if (isValidYomiganaRange_(value, memStart, memEnd) && memStart === memEnd) {
    return { start: memStart, end: memEnd };
  }
  if (isValidYomiganaRange_(value, liveStart, liveEnd) && liveStart === liveEnd) {
    return { start: liveStart, end: liveEnd };
  }
  return null;
}

/**
 * 挿入後の選択記憶を更新
 * @param {HTMLTextAreaElement} editEl
 * @param {number} cursor
 */
function storeSsmlCursorAfterInsert_(editEl, cursor) {
  var store = getSsmlSelectionStore_(editEl);
  if (!store) {
    return;
  }
  if (store === addStudySsmlSelection) {
    store.start = cursor;
    store.end = cursor;
    store.editId = editEl.id || '';
  } else {
    store.selectionStart = cursor;
    store.selectionEnd = cursor;
  }
}

/**
 * 選択範囲が既存の読み指定タグ（phoneme／lang）と重なるか
 * @param {string} value
 * @param {number} start
 * @param {number} end
 * @returns {boolean}
 */
function selectionCrossesYomiganaPhoneme_(value, start, end) {
  var selected = value.substring(start, end);
  if (selected.indexOf('<phoneme') >= 0 || selected.indexOf('</phoneme>') >= 0 ||
      selected.indexOf('<lang') >= 0 || selected.indexOf('</lang>') >= 0) {
    return true;
  }
  var before = value.substring(0, start);
  var openPhoneme = before.lastIndexOf('<phoneme');
  if (openPhoneme >= 0 && before.lastIndexOf('</phoneme>') < openPhoneme) {
    return true;
  }
  var openLang = before.lastIndexOf('<lang');
  if (openLang >= 0 && before.lastIndexOf('</lang>') < openLang) {
    return true;
  }
  return false;
}

/**
 * textarea へ読み／英語タグを入れる共通処理
 * @param {HTMLTextAreaElement} editEl
 * @param {'yomigana'|'english'} kind
 */
function insertSsmlTagIntoTextarea_(editEl, kind) {
  if (!editEl || editEl.disabled) {
    return;
  }
  var range = getYomiganaInsertRange_(editEl);
  if (!range) {
    return;
  }
  var start = range.start;
  var end = range.end;
  var value = editEl.value || '';
  if (selectionCrossesYomiganaPhoneme_(value, start, end)) {
    return;
  }
  var selected = value.substring(start, end);
  var wrapped;
  var cursor;
  if (kind === 'english') {
    wrapped = ENGLISH_LANG_OPEN + selected + ENGLISH_LANG_CLOSE;
    cursor = start + ENGLISH_LANG_OPEN.length;
  } else {
    wrapped = YOMIGANA_PHONEME_OPEN + YOMIGANA_PHONEME_AFTER_PH + selected + YOMIGANA_PHONEME_CLOSE;
    cursor = start + YOMIGANA_PHONEME_OPEN.length;
  }
  editEl.value = value.substring(0, start) + wrapped + value.substring(end);
  storeSsmlCursorAfterInsert_(editEl, cursor);
  editEl.focus();
  editEl.setSelectionRange(cursor, cursor);
}

/**
 * 編集中の出題／解答へ読み指定タグを入れる
 * 選択あり：その文字を包む。未選択：カーソル位置へ空タグを入れる
 * @param {'question'|'answer'} displayTarget
 */
function insertYomiganaPhoneme(displayTarget) {
  if (!updateMode.active || updateMode.displayTarget !== displayTarget) {
    return;
  }
  if (displayTarget !== 'question' && displayTarget !== 'answer') {
    return;
  }
  var ui = getUpdateUiConfig(displayTarget);
  if (!ui) {
    return;
  }
  insertSsmlTagIntoTextarea_(document.getElementById(ui.editId), 'yomigana');
}

/**
 * 編集中の出題／解答へ英語読みタグを入れる
 * 選択あり：その文字を包む。未選択：カーソル位置へ空タグを入れる
 * @param {'question'|'answer'} displayTarget
 */
function insertEnglishLangTag(displayTarget) {
  if (!updateMode.active || updateMode.displayTarget !== displayTarget) {
    return;
  }
  if (displayTarget !== 'question' && displayTarget !== 'answer') {
    return;
  }
  var ui = getUpdateUiConfig(displayTarget);
  if (!ui) {
    return;
  }
  insertSsmlTagIntoTextarea_(document.getElementById(ui.editId), 'english');
}

/**
 * 問題追加フォームの出題／解答へ読み／英語タグを入れる
 * @param {'question'|'answer'} field
 * @param {'yomigana'|'english'} kind
 */
function insertAddStudyItemSsmlTag(field, kind) {
  var editEl = document.getElementById(
    field === 'answer' ? 'addStudyItemAnswer' : 'addStudyItemQuestion'
  );
  insertSsmlTagIntoTextarea_(editEl, kind);
  if (typeof syncAddStudyItemEditorUi === 'function') {
    syncAddStudyItemEditorUi();
  }
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
  
  var yomiganaButtons = [
    { id: 'questionYomiganaButton', target: 'question' },
    { id: 'answerYomiganaButton', target: 'answer' }
  ];
  yomiganaButtons.forEach(function(entry) {
    var yomiganaButton = document.getElementById(entry.id);
    if (yomiganaButton) {
      yomiganaButton.onpointerdown = function(event) {
        event.preventDefault();
        var ui = getUpdateUiConfig(entry.target);
        if (ui) {
          rememberYomiganaSelection_(document.getElementById(ui.editId));
        }
      };
      yomiganaButton.onpointerup = function(event) {
        if (event.button != null && event.button !== 0) {
          return;
        }
        insertYomiganaPhoneme(entry.target);
      };
    }
  });

  var englishButtons = [
    { id: 'questionEnglishButton', target: 'question' },
    { id: 'answerEnglishButton', target: 'answer' }
  ];
  englishButtons.forEach(function(entry) {
    var englishButton = document.getElementById(entry.id);
    if (englishButton) {
      englishButton.onpointerdown = function(event) {
        event.preventDefault();
        var ui = getUpdateUiConfig(entry.target);
        if (ui) {
          rememberYomiganaSelection_(document.getElementById(ui.editId));
        }
      };
      englishButton.onpointerup = function(event) {
        if (event.button != null && event.button !== 0) {
          return;
        }
        insertEnglishLangTag(entry.target);
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

  var addStudySsmlButtons = [
    { id: 'addStudyItemQuestionYomiganaButton', field: 'question', kind: 'yomigana' },
    { id: 'addStudyItemQuestionEnglishButton', field: 'question', kind: 'english' },
    { id: 'addStudyItemAnswerYomiganaButton', field: 'answer', kind: 'yomigana' },
    { id: 'addStudyItemAnswerEnglishButton', field: 'answer', kind: 'english' }
  ];
  addStudySsmlButtons.forEach(function(entry) {
    var btn = document.getElementById(entry.id);
    if (!btn) {
      return;
    }
    btn.onpointerdown = function(event) {
      event.preventDefault();
      var editEl = document.getElementById(
        entry.field === 'answer' ? 'addStudyItemAnswer' : 'addStudyItemQuestion'
      );
      rememberYomiganaSelection_(editEl);
    };
    btn.onpointerup = function(event) {
      if (event.button != null && event.button !== 0) {
        return;
      }
      insertAddStudyItemSsmlTag(entry.field, entry.kind);
    };
  });
  bindYomiganaSelectionMemory_(document.getElementById('addStudyItemQuestion'));
  bindYomiganaSelectionMemory_(document.getElementById('addStudyItemAnswer'));
  
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
  addStudy.discardAction = '';
  addStudy.pendingCategoryValue = '';
  setConfirmModalBusy(false);
  var okButton = dom.answerUpdateConfirmOkButton;
  if (okButton) {
    okButton.textContent = '確定';
  }
  var modal = dom.answerUpdateConfirmModal;
  if (modal) {
    modal.classList.remove('active');
  }
  if (typeof syncAddStudyItemEditorUi === 'function') {
    syncAddStudyItemEditorUi();
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

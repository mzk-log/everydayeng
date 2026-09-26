// モーダルを表示
function showModal(item, index) {
  if (!item) return;
  
  // モーダル内の現在のインデックスを保存
  if (typeof index !== 'undefined') {
    questionList.modalIndex = index;
  } else {
    // インデックスが指定されていない場合は、itemから検索
    questionList.modalIndex = categoryCatalog.items.findIndex(function(data) {
      return data.id === item.id || (data.no === item.no && data.question === item.question);
    });
    if (questionList.modalIndex === -1) {
      questionList.modalIndex = 0;
    }
  }
  
  // モーダルの内容を更新
  updateModalContent(item);
  
  // ナビゲーションボタンの状態を更新
  updateModalNavigation();
  
  // 選択状態を更新
  updateModalSelection();
  
  // モーダルを表示
  var modalOverlay = dom.modalOverlay;
  if (modalOverlay) {
    modalOverlay.classList.add('active');
  }
}

// モーダルの内容を更新
function updateModalContent(item) {
  // 解答側タイトルをラベルに設定（入替え対応）
  var modalAnswerLabel = dom.modalAnswerLabel;
  if (modalAnswerLabel) {
    modalAnswerLabel.textContent = getEffectiveATitle(item) || '';
  }
  
  // 出題側タイトルをラベルに設定（入替え対応）
  var modalQuestionLabel = dom.modalQuestionLabel;
  if (modalQuestionLabel) {
    modalQuestionLabel.textContent = getEffectiveQTitle(item) || '';
  }
  
  // 質問文を表示（画像対応・入替え対応）
  var questionText = dom.modalQuestionText;
  if (questionText) {
    displayImageOrText(questionText, getEffectiveQuestion(item));
  }
  
  // 学習回数・最終学習日
  updateLearningMetaDisplay(item, 'modalLearningMeta');
  
  // 回答文を表示（画像対応・入替え対応）
  var answerText = dom.modalAnswerText;
  if (answerText) {
    displayImageOrText(answerText, getEffectiveAnswer(item));
  }
  
  // noteを常に表示（空欄でも note: を出す。背景透明度は変更しない）
  var noteSection = dom.modalNoteSection;
  var noteText = dom.modalNoteText;
  if (noteText) {
    noteText.textContent = item.note || '';
  }
  if (noteSection) {
    noteSection.style.display = 'block';
  }
}

// モーダル内のナビゲーションを更新
function updateModalNavigation() {
  var totalCount = categoryCatalog.items.length;
  var currentNo = questionList.modalIndex + 1;
  
  // 現在No/全No数を更新
  var navInfo = dom.modalNavInfo;
  if (navInfo) {
    navInfo.textContent = currentNo + '/' + totalCount;
  }
  
  // 前へボタンの状態を更新
  var prevButton = dom.modalPrevButton;
  if (prevButton) {
    if (questionList.modalIndex === 0) {
      prevButton.disabled = true;
    } else {
      prevButton.disabled = false;
    }
  }
  
  // 次へボタンの状態を更新
  var nextButton = dom.modalNextButton;
  if (nextButton) {
    if (questionList.modalIndex === totalCount - 1) {
      nextButton.disabled = true;
    } else {
      nextButton.disabled = false;
    }
  }
}

// モーダルを閉じる
function closeModal() {
  var modalOverlay = dom.modalOverlay;
  if (modalOverlay) {
    modalOverlay.classList.remove('active');
  }
}

// モーダル内の選択状態を更新
function updateModalSelection() {
  var selectButton = dom.modalSelectButton;
  if (!selectButton) return;
  
  var isSelected = questionList.selected.indexOf(questionList.modalIndex) !== -1;
  if (isSelected) {
    selectButton.classList.add('selected');
  } else {
    selectButton.classList.remove('selected');
  }
}

// モーダル内の選択/解除を実行
function handleModalSelection() {
  var index = questionList.modalIndex;
  var selectedIndex = questionList.selected.indexOf(index);
  
  if (selectedIndex === -1) {
    // 選択
    questionList.selected.push(index);
  } else {
    // 解除
    questionList.selected.splice(selectedIndex, 1);
  }
  
  // モーダル内の選択状態を更新
  updateModalSelection();
  
  // リスト側の選択状態も更新
  updateListSelection(index);
  
  // 選択数の表示を更新
  updateSelectionCount();
}

// リスト側の選択状態を更新
function updateListSelection(index) {
  var tableBody = dom.listTableBody;
  if (!tableBody) return;
  
  var rows = tableBody.querySelectorAll('tr');
  if (index >= 0 && index < rows.length) {
    var row = rows[index];
    var noCell = row.querySelector('td:first-child');
    var isSelected = questionList.selected.indexOf(index) !== -1;
    
    if (isSelected) {
      row.classList.add('selected-row');
      if (noCell) noCell.classList.add('selected-no');
    } else {
      row.classList.remove('selected-row');
      if (noCell) noCell.classList.remove('selected-no');
    }
  }
}

// 選択をクリア
function clearSelection() {
  var ui = getListUiConfig();
  // 選択状態をクリア
  questionList.selected = [];
  
  // 全行の選択状態を解除
  var tableBody = document.getElementById(ui.tableBodyId);
  if (tableBody) {
    var rows = tableBody.querySelectorAll('tr');
    rows.forEach(function(row) {
      var noCell = row.querySelector('td:first-child');
      if (noCell) {
        noCell.classList.remove('selected-no');
      }
      row.classList.remove('selected-row');
    });
  }
  
  // 選択数表示を更新（クリアボタンの状態も更新される）
  updateSelectionCount();
  if (studyEnd.done) {
    updateNavAnswerButton();
  }
}

// クリアボタンの有効/無効を更新
function updateClearButton() {
  var ui = getListUiConfig();
  var clearButton = document.getElementById(ui.clearButtonId);
  if (!clearButton) return;
  
  // 選択がない場合は無効化
  clearButton.disabled = questionList.selected.length === 0;
}

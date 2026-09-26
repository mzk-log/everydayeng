// 学習画面の鉛筆表示を更新
function setupFieldEditDoubleClick() {
  updateFieldEditPencils();
}

/**
 * 画面上の欄から、スプレッドシート保存先フィールドを解決する
 * @param {string} displayTarget - 'question' | 'answer' | 'note'
 * @returns {string} 'question' | 'answer' | 'note'
 */
function resolveStorageField(displayTarget) {
  if (displayTarget === 'note') {
    return 'note';
  }
  if (displayTarget === 'question') {
    return isSwapQAEnabled() ? 'answer' : 'question';
  }
  if (displayTarget === 'answer') {
    return isSwapQAEnabled() ? 'question' : 'answer';
  }
  return displayTarget;
}

/**
 * 編集UI要素のID等を返す
 * @param {string} displayTarget
 * @returns {Object|null}
 */
function getUpdateUiConfig(displayTarget) {
  if (displayTarget === 'question') {
    return {
      displayId: 'questionText',
      editId: 'questionTextEdit',
      controlsId: 'questionUpdateControls',
      sectionId: 'questionSection',
      confirmTitle: '出題（Question）を更新しますか？'
    };
  }
  if (displayTarget === 'answer') {
    return {
      displayId: 'answerTextDisplay',
      editId: 'answerTextEdit',
      controlsId: 'answerUpdateControls',
      sectionId: 'answerSection',
      confirmTitle: '解答（Answer）を更新しますか？'
    };
  }
  if (displayTarget === 'note') {
    return {
      displayId: 'noteText',
      editId: 'noteTextEdit',
      controlsId: 'noteUpdateControls',
      sectionId: 'noteSection',
      confirmTitle: 'noteを更新しますか？'
    };
  }
  return null;
}

/**
 * 保存先フィールドの確認モーダルタイトル（実体列ベース）
 * @param {string} storageField
 * @returns {string}
 */
function getConfirmTitleForStorageField(storageField) {
  if (storageField === 'question') {
    return '出題（Question列）を更新しますか？';
  }
  if (storageField === 'answer') {
    return '解答（Answer列）を更新しますか？';
  }
  if (storageField === 'note') {
    return 'note列を更新しますか？';
  }
  return '内容を更新しますか？';
}

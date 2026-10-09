function hideAddStudyItemStatusProgress() {
  var wrap = dom.addStudyItemStatusProgress;
  var bar = dom.addStudyItemStatusProgressBar;
  if (wrap) {
    wrap.hidden = true;
    wrap.setAttribute('aria-hidden', 'true');
  }
  if (bar) {
    bar.style.width = '0%';
  }
}

/**
 * 音声準備の進捗バー（0〜1）
 * @param {number} ratio
 */
function updateAddStudyItemStatusProgress(ratio) {
  var wrap = dom.addStudyItemStatusProgress;
  var bar = dom.addStudyItemStatusProgressBar;
  if (!wrap || !bar) {
    return;
  }
  var n = Number(ratio);
  if (isNaN(n) || n < 0) {
    n = 0;
  }
  if (n > 1) {
    n = 1;
  }
  wrap.hidden = false;
  wrap.setAttribute('aria-hidden', 'false');
  bar.style.width = Math.round(n * 100) + '%';
}

/**
 * 追加画面の認証失敗：ログイン必須処理へ回し、画面内は短い日本語にする
 * @param {string} rawMsg
 * @returns {boolean} 認証失敗として処理したとき true
 */
function handleAddStudyItemAuthFailure_(rawMsg) {
  var msg = String(rawMsg || '');
  if (!msg || typeof isGoogleAuthFailureMessage !== 'function' || !isGoogleAuthFailureMessage(msg)) {
    return false;
  }
  if (typeof showError === 'function') {
    showError(msg);
  } else if (typeof enforceGoogleAuthFailureLock === 'function') {
    enforceGoogleAuthFailureLock(msg);
  }
  setAddStudyItemStatus(
    msg.indexOf('Email not authorized') >= 0
      ? 'このGoogleアカウントは利用許可されていません。'
      : '認証に失敗しました。再度ログインしてください。',
    false
  );
  return true;
}

function setAddStudyItemStatus(message, isOk) {
  var el = dom.addStudyItemStatus;
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('is-ask');
  if (isOk) {
    el.classList.add('is-ok');
  } else {
    el.classList.remove('is-ok');
  }
  if (!addStudy.awaitingAudioPrepare && !addStudy.statusProgressVisible) {
    hideAddStudyItemStatusProgress();
  }
}

function setAddStudyItemAskStatus(message) {
  var el = dom.addStudyItemStatus;
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('is-ok');
  el.classList.add('is-ask');
  if (!addStudy.awaitingAudioPrepare && !addStudy.statusProgressVisible) {
    hideAddStudyItemStatusProgress();
  }
}

/**
 * 追加中／更新中の表示と同時に進捗バーを出す（0%）
 */
function beginAddStudyItemSaveProgress_() {
  addStudy.statusProgressVisible = true;
  updateAddStudyItemStatusProgress(0);
}

function endAddStudyItemSaveProgress_() {
  addStudy.statusProgressVisible = false;
  hideAddStudyItemStatusProgress();
}

function isAddStudyItemNewCategorySelected() {
  var select = dom.addStudyItemCategorySelect;
  return !!(select && select.value === '__new__');
}

function isAddStudyItemCategoryChosen() {
  var select = dom.addStudyItemCategorySelect;
  return !!(select && String(select.value || '').trim());
}

function escapeAddStudyItemHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function previewAddStudyItemText(text) {
  var t = studyFieldDisplayText(text).replace(/\s+/g, ' ').trim();
  return t || '（空）';
}

function getAddStudyItemItemsSorted(categoryNo) {
  var items = getItemsForCategoryFromLocal(categoryNo).slice();
  items.sort(function(a, b) {
    return (Number(a && a.no) || 0) - (Number(b && b.no) || 0);
  });
  return items;
}

function findAddStudyItemById(id) {
  var key = String(id || '');
  if (!key) return null;
  var all = getMemoryAllStudyItems();
  for (var i = 0; i < all.length; i++) {
    if (all[i] && String(all[i].id) === key) {
      return all[i];
    }
  }
  return null;
}

function resetAddStudyItemEditor(options) {
  options = options || {};
  addStudy.mode = 'add';
  addStudy.editingId = '';
  addStudy.insertAfterId = '';
  addStudy.insertAtStart = false;
  addStudy.confirmKind = '';
  addStudy.pendingDeleteId = '';
  addStudy.pendingReorderPosition = '';
  addStudy.pendingReorderRelativeNo = '';
  addStudy.formConfirming = false;
  addStudy.formBusy = false;
  if (options.clearFields) {
    addStudy.noteOpen = false;
  }
  if (options.clearFields) {
    var q = dom.addStudyItemQuestion;
    var a = dom.addStudyItemAnswer;
    var n = dom.addStudyItemNote;
    if (q) q.value = '';
    if (a) a.value = '';
    if (n) n.value = '';
    if (!options.keepCategory) {
      var nameEl = dom.addStudyItemCategoryName;
      var qt = dom.addStudyItemQTitle;
      var at = dom.addStudyItemATitle;
      if (nameEl) nameEl.value = '';
      if (qt) qt.value = '';
      if (at) at.value = '';
    }
  }
  syncAddStudyItemEditorUi();
  if (options.clearFields) {
    markAddStudyItemClean_();
  }
}

/**
 * 入力欄の現在値
 * @param {HTMLInputElement|HTMLTextAreaElement|null} el
 * @returns {string}
 */
function addStudyItemFieldValue_(el) {
  return el ? String(el.value || '') : '';
}

/**
 * いまの入力を未保存判定の基準にする
 */
function markAddStudyItemClean_() {
  var select = dom.addStudyItemCategorySelect;
  addStudy.committedCategoryValue = select ? String(select.value || '') : '';
  addStudy.baseline = {
    question: addStudyItemFieldValue_(dom.addStudyItemQuestion),
    answer: addStudyItemFieldValue_(dom.addStudyItemAnswer),
    note: addStudyItemFieldValue_(dom.addStudyItemNote),
    categoryName: addStudyItemFieldValue_(dom.addStudyItemCategoryName),
    qTitle: addStudyItemFieldValue_(dom.addStudyItemQTitle),
    aTitle: addStudyItemFieldValue_(dom.addStudyItemATitle),
    renameName: addStudyItemFieldValue_(dom.addStudyItemRenameName)
  };
}

/**
 * 出題・解答・note・新規カテゴリの入力・カテゴリ名の変更があるか
 * 並びの選択だけでは未保存にしない
 * @returns {boolean}
 */
function isAddStudyItemDirty_() {
  var base = addStudy.baseline;
  if (!base) {
    return false;
  }
  if (addStudyItemFieldValue_(dom.addStudyItemQuestion) !== base.question) return true;
  if (addStudyItemFieldValue_(dom.addStudyItemAnswer) !== base.answer) return true;
  if (addStudyItemFieldValue_(dom.addStudyItemNote) !== base.note) return true;
  if (isAddStudyItemNewCategorySelected()) {
    if (addStudyItemFieldValue_(dom.addStudyItemCategoryName) !== base.categoryName) return true;
    if (addStudyItemFieldValue_(dom.addStudyItemQTitle) !== base.qTitle) return true;
    if (addStudyItemFieldValue_(dom.addStudyItemATitle) !== base.aTitle) return true;
  }
  if (isAddStudyItemRenameVisible() &&
      addStudyItemFieldValue_(dom.addStudyItemRenameName) !== base.renameName) {
    return true;
  }
  return false;
}

/**
 * 破棄確認中か
 * @returns {boolean}
 */
function isAddStudyItemDiscardConfirming_() {
  return !!(addStudy.confirmPending && addStudy.confirmKind === 'discard');
}

/**
 * 追加画面で追加／削除等を止めるか（再生中含む）
 * @returns {boolean}
 */
function isAddStudyItemOpsLocked_() {
  return !!(addStudy.formBusy || addStudy.formConfirming || addStudy.audioBusy ||
    addStudy.moveBusy || addStudy.modalBusy || isAddStudyItemDiscardConfirming_());
}

/**
 * 再生中以外の操作ロック（formBusy 等）
 * @returns {boolean}
 */
function isAddStudyItemFormLocked_() {
  return !!(addStudy.formBusy || addStudy.formConfirming);
}

function syncAddStudyItemEditorUi() {
  var confirming = addStudy.formConfirming;
  var confirmingRename = confirming && addStudy.confirmKind === 'rename';
  var confirmingReorder = confirming && addStudy.confirmKind === 'reorder';
  var opsLocked = isAddStudyItemOpsLocked_();
  var formLocked = isAddStudyItemFormLocked_();
  var saveBtn = dom.addStudyItemSaveButton;
  if (saveBtn) {
    var saveIsConfirm = confirming && !confirmingRename && !confirmingReorder;
    saveBtn.textContent = saveIsConfirm
      ? '確定'
      : (addStudy.mode === 'update'
        ? '更新'
        : (addStudy.mode === 'insert' ? '挿入' : '追加'));
    saveBtn.classList.toggle('is-confirm', saveIsConfirm);
  }
  var renameBtn = dom.addStudyItemRenameButton;
  var renameInput = dom.addStudyItemRenameName;
  if (renameBtn) {
    if (opsLocked && !confirmingRename) {
      renameBtn.disabled = true;
      renameBtn.textContent = '名前を更新';
      renameBtn.classList.remove('is-confirm');
    } else if (confirmingRename) {
      renameBtn.disabled = !!addStudy.audioBusy;
      renameBtn.textContent = '確定';
      renameBtn.classList.add('is-confirm');
    } else {
      renameBtn.textContent = '名前を更新';
      renameBtn.classList.remove('is-confirm');
      var renameErr = validateAddStudyItemRenameName(
        renameInput ? renameInput.value : '',
        currentAddStudyItemCategoryName()
      );
      renameBtn.disabled = !isAddStudyItemRenameVisible() || !!renameErr || !!addStudy.audioBusy;
    }
  }
  var reorderBtn = dom.addStudyItemReorderButton;
  if (reorderBtn) {
    if (opsLocked && !confirmingReorder) {
      reorderBtn.disabled = true;
      reorderBtn.textContent = '移動';
      reorderBtn.classList.remove('is-confirm');
    } else if (confirmingReorder) {
      reorderBtn.disabled = !!addStudy.audioBusy;
      reorderBtn.textContent = '確定';
      reorderBtn.classList.add('is-confirm');
    } else {
      reorderBtn.textContent = '移動';
      reorderBtn.classList.remove('is-confirm');
      var parsedPos = parseAddStudyItemOrderPositionValue(
        dom.addStudyItemReorderPosition ? dom.addStudyItemReorderPosition.value : ''
      );
      reorderBtn.disabled = !isAddStudyItemReorderVisible() || !parsedPos.ok ||
        parsedPos.noop || !!addStudy.audioBusy;
    }
  }
  var cancelBtn = dom.addStudyItemCancelButton;
  if (cancelBtn) {
    cancelBtn.textContent = confirming ? 'キャンセル' : '閉じる';
    // 再生中は閉じ可（停止して閉じる）。formBusy のみ不可
    cancelBtn.disabled = !!addStudy.formBusy;
  }
  var closeBtn = dom.addStudyItemCloseButton;
  if (closeBtn) {
    closeBtn.disabled = !!addStudy.formBusy;
  }
  var backBtn = dom.addStudyItemBackToAddButton;
  if (backBtn) {
    backBtn.style.display = (!confirming && addStudy.mode !== 'add') ? 'inline-block' : 'none';
    backBtn.disabled = !!opsLocked;
  }
  var select = dom.addStudyItemCategorySelect;
  if (select) {
    select.disabled = addStudy.mode !== 'add' || formLocked || !!addStudy.audioBusy ||
      isAddStudyItemDiscardConfirming_();
  }
  syncAddStudyItemInputLock();
  syncAddStudyItemRenameFields(false);
  syncAddStudyItemReorderFields(false);
  syncAddStudyItemCategorySettingsUi_();
  syncAddStudyItemNoteUi_();
  syncAddStudyItemSsmlControls_();
  refreshAddStudyListPlayButtons();
}

/**
 * カテゴリ名と並びは、既存カテゴリの追加モードで開いたときだけ出す
 */
function syncAddStudyItemCategorySettingsUi_() {
  var toggle = dom.addStudyItemCategorySettingsToggle;
  var panel = dom.addStudyItemCategorySettings;
  var canShow = isAddStudyItemRenameVisible();
  if (!canShow) {
    addStudy.categorySettingsOpen = false;
  }
  if (toggle) {
    toggle.hidden = !canShow;
    toggle.setAttribute('aria-expanded', addStudy.categorySettingsOpen ? 'true' : 'false');
  }
  if (panel) {
    panel.hidden = !canShow || !addStudy.categorySettingsOpen;
  }
}

/**
 * note は開いているときだけ入力欄を出す
 */
function syncAddStudyItemNoteUi_() {
  var area = dom.addStudyItemNote;
  var toggle = dom.addStudyItemNoteToggle;
  if (area) {
    area.hidden = !addStudy.noteOpen;
  }
  if (toggle) {
    toggle.setAttribute('aria-expanded', addStudy.noteOpen ? 'true' : 'false');
    toggle.disabled = !isAddStudyItemCategoryChosen() || isAddStudyItemFormLocked_() ||
      !!addStudy.audioBusy || isAddStudyItemDiscardConfirming_();
  }
}

/**
 * 読み／英語ボタンの有効状態
 */
function syncAddStudyItemSsmlControls_() {
  var enabled = isAddStudyItemCategoryChosen() && !isAddStudyItemFormLocked_() && !addStudy.audioBusy;
  var ids = [
    'addStudyItemQuestionYomiganaButton',
    'addStudyItemQuestionEnglishButton',
    'addStudyItemAnswerYomiganaButton',
    'addStudyItemAnswerEnglishButton'
  ];
  for (var i = 0; i < ids.length; i++) {
    var btn = document.getElementById(ids[i]);
    if (btn) {
      btn.disabled = !enabled;
    }
  }
}

function syncAddStudyItemNewCategoryFields() {
  var wrap = dom.addStudyItemNewCategoryFields;
  if (!wrap) return;
  wrap.style.display = isAddStudyItemNewCategorySelected() ? 'block' : 'none';
  if (isAddStudyItemNewCategorySelected()) {
    fillAddStudyItemOrderPositionSelect(dom.addStudyItemNewOrderPosition, '', 'end');
  }
}

function isAddStudyItemRenameVisible() {
  return isAddStudyItemCategoryChosen() && !isAddStudyItemNewCategorySelected() && addStudy.mode === 'add';
}

function isAddStudyItemReorderVisible() {
  return isAddStudyItemRenameVisible() && getConfigurableCategories().length >= 2;
}

/**
 * 並び位置セレクトの選択肢を埋める
 * @param {HTMLSelectElement|null} select
 * @param {string} excludeNo 除外するカテゴリ番号（並び替え対象自身）
 * @param {string} [keepValue]
 */
function fillAddStudyItemOrderPositionSelect(select, excludeNo, keepValue) {
  if (!select) return;
  var keep = keepValue != null ? String(keepValue) : String(select.value || 'end');
  var exclude = String(excludeNo || '');
  var cats = getConfigurableCategories();
  var html = '';
  html += '<option value="end">末尾（既定）</option>';
  html += '<option value="start">先頭</option>';
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i];
    if (!cat || String(cat.no) === exclude) {
      continue;
    }
    var label = String(cat.name || ('Category ' + cat.no)).replace(/</g, '&lt;').replace(/"/g, '&quot;');
    var no = String(cat.no).replace(/"/g, '');
    html += '<option value="before:' + no + '">「' + label + '」の前</option>';
    html += '<option value="after:' + no + '">「' + label + '」の後</option>';
  }
  select.innerHTML = html;
  if (keep && select.querySelector('option[value="' + keep.replace(/"/g, '\\"') + '"]')) {
    select.value = keep;
  } else {
    select.value = 'end';
  }
}

/**
 * @param {string} raw
 * @returns {{ok:boolean, position?:string, relativeCategoryNo?:string, noop?:boolean, label?:string}}
 */
function parseAddStudyItemOrderPositionValue(raw) {
  var v = String(raw || '').trim();
  if (!v || v === 'end') {
    return { ok: true, position: 'end', relativeCategoryNo: '', label: '末尾' };
  }
  if (v === 'start') {
    return { ok: true, position: 'start', relativeCategoryNo: '', label: '先頭' };
  }
  var m = /^(before|after):(.+)$/.exec(v);
  if (!m) {
    return { ok: false };
  }
  var rel = String(m[2] || '').trim();
  if (!rel) {
    return { ok: false };
  }
  var cat = findCategoryByNo(rel);
  var name = cat ? String(cat.name || rel) : rel;
  return {
    ok: true,
    position: m[1],
    relativeCategoryNo: rel,
    label: '「' + name + '」の' + (m[1] === 'before' ? '前' : '後')
  };
}

function syncAddStudyItemReorderFields(refill) {
  var wrap = dom.addStudyItemReorderFields;
  var select = dom.addStudyItemReorderPosition;
  var visible = isAddStudyItemReorderVisible();
  if (wrap) {
    wrap.style.display = visible ? 'block' : 'none';
  }
  if (!visible || !select) {
    return;
  }
  var currentNo = '';
  var catSelect = dom.addStudyItemCategorySelect;
  if (catSelect) {
    currentNo = String(catSelect.value || '');
  }
  if (refill || !select.options.length) {
    fillAddStudyItemOrderPositionSelect(select, currentNo, select.value || 'end');
  }
  select.disabled = addStudy.formConfirming || addStudy.formBusy;
}

function currentAddStudyItemCategoryName() {
  var select = dom.addStudyItemCategorySelect;
  if (!select || isAddStudyItemNewCategorySelected() || !String(select.value || '')) {
    return '';
  }
  var items = getItemsForCategoryFromLocal(String(select.value));
  for (var i = 0; i < items.length; i++) {
    if (items[i] && String(items[i].category || '').trim()) {
      return String(items[i].category).trim();
    }
  }
  var cats = getConfigurableCategories();
  for (var c = 0; c < cats.length; c++) {
    if (String(cats[c].no) === String(select.value)) {
      return String(cats[c].name || '').trim();
    }
  }
  return '';
}

function syncAddStudyItemRenameFields(fillName) {
  var wrap = dom.addStudyItemRenameFields;
  var input = dom.addStudyItemRenameName;
  if (wrap) {
    wrap.style.display = isAddStudyItemRenameVisible() ? 'block' : 'none';
  }
  if (fillName && input && !addStudy.formConfirming && !addStudy.formBusy) {
    input.value = currentAddStudyItemCategoryName();
    if (addStudy.baseline) {
      addStudy.baseline.renameName = input.value;
    }
  }
}

function validateAddStudyItemRenameName(name, currentName) {
  var next = String(name || '').trim();
  var current = String(currentName || '').trim();
  if (!next) {
    return 'カテゴリ名を入力してください。';
  }
  if (next === 'END') {
    return 'このカテゴリ名は使えません。';
  }
  if (next.toLowerCase() === current.toLowerCase()) {
    return '名前が変わっていません。';
  }
  var select = dom.addStudyItemCategorySelect;
  var currentNo = select ? String(select.value || '') : '';
  var cats = getConfigurableCategories();
  for (var i = 0; i < cats.length; i++) {
    if (String(cats[i].no) === currentNo) {
      continue;
    }
    if (String(cats[i].name || '').trim().toLowerCase() === next.toLowerCase()) {
      return 'このカテゴリ名は既にあります。';
    }
  }
  return '';
}

function syncAddStudyItemInputLock() {
  var enabled = isAddStudyItemCategoryChosen();
  var formLocked = isAddStudyItemFormLocked_();
  var audioLocked = !!addStudy.audioBusy;
  var ids = [
    'addStudyItemQuestion',
    'addStudyItemAnswer',
    'addStudyItemNote'
  ];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) {
      el.disabled = !enabled || formLocked || audioLocked;
    }
  }
  var renameInput = dom.addStudyItemRenameName;
  if (renameInput) {
    renameInput.disabled = formLocked || audioLocked || !isAddStudyItemRenameVisible();
  }
  var newIds = ['addStudyItemCategoryName', 'addStudyItemQTitle', 'addStudyItemATitle'];
  for (var n = 0; n < newIds.length; n++) {
    var newEl = document.getElementById(newIds[n]);
    if (newEl) {
      newEl.disabled = formLocked || audioLocked;
    }
  }
  var newOrder = dom.addStudyItemNewOrderPosition;
  if (newOrder) {
    newOrder.disabled = formLocked || audioLocked;
  }
  var reorderPos = dom.addStudyItemReorderPosition;
  if (reorderPos) {
    reorderPos.disabled = formLocked || audioLocked || !isAddStudyItemReorderVisible();
  }
  var saveBtn = dom.addStudyItemSaveButton;
  if (saveBtn) {
    if (addStudy.formBusy || audioLocked ||
        (addStudy.formConfirming && (addStudy.confirmKind === 'rename' || addStudy.confirmKind === 'reorder'))) {
      saveBtn.disabled = true;
    } else if (addStudy.formConfirming) {
      saveBtn.disabled = false;
    } else {
      var canSave = enabled && !validateAddStudyItemDraft(collectAddStudyItemDraft());
      saveBtn.disabled = !canSave;
    }
  }
}

function scrollAddStudyItemListToEnd() {
  var list = dom.addStudyItemList;
  if (!list) return;
  var pin = function() {
    list.scrollTop = list.scrollHeight;
  };
  pin();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(pin);
  }
}

/**
 * 一覧内の指定 ID の行が見える位置までスクロールする
 * @param {string|number} id
 */
function scrollAddStudyItemListToId_(id) {
  var list = dom.addStudyItemList;
  if (!list || id == null || String(id) === '') return;
  var key = String(id);
  var pin = function() {
    var rows = list.querySelectorAll('[data-add-id]');
    var row = null;
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-add-id') === key) {
        row = rows[i];
        break;
      }
    }
    if (!row) return;
    var top = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    var next = top - 8;
    if (next < 0) next = 0;
    list.scrollTop = next;
  };
  pin();
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(pin);
  }
}

function renderAddStudyItemList() {
  var wrap = dom.addStudyItemListWrap;
  var list = dom.addStudyItemList;
  var countEl = dom.addStudyItemListCount;
  if (!wrap || !list) return;
  if (!isAddStudyItemCategoryChosen() || isAddStudyItemNewCategorySelected()) {
    wrap.style.display = 'none';
    list.innerHTML = '';
    if (countEl) countEl.textContent = '';
    return;
  }
  var select = dom.addStudyItemCategorySelect;
  var categoryNo = select ? String(select.value || '') : '';
  var items = getAddStudyItemItemsSorted(categoryNo);
  wrap.style.display = 'flex';
  if (countEl) {
    countEl.textContent = items.length + '件';
  }
  if (!items.length) {
    list.innerHTML = '<p class="add-study-list-empty">このカテゴリには問題がありません。</p>';
    return;
  }
  var showPlay = canShowAddStudyListPlayButtons_();
  var html = '';
  html += '<div class="add-study-list-start' +
    (addStudy.mode === 'insert' && addStudy.insertAtStart ? ' is-selected' : '') + '">';
  html += '<button type="button" class="add-study-list-mini" data-add-insert-start="1">先頭に挿入</button>';
  html += '</div>';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var id = String(it.id);
    var selected = (addStudy.mode === 'update' && String(addStudy.editingId) === id) ||
      (addStudy.mode === 'insert' && !addStudy.insertAtStart && String(addStudy.insertAfterId) === id) ||
      (addStudy.mode === 'add' && addStudy.lastUpdatedId && String(addStudy.lastUpdatedId) === id);
    html += '<div class="add-study-list-row' + (selected ? ' is-selected' : '') +
      '" role="listitem" data-add-id="' + escapeAddStudyItemHtml(id) + '">';
    html += '<div class="add-study-list-body">';
    html += '<div class="add-study-list-row-main">';
    html += '<span class="add-study-list-no">' + escapeAddStudyItemHtml(it.no) + '</span>';
    html += '<div class="add-study-list-texts">';
    html += '<div class="add-study-list-field-row">';
    html += '<div class="add-study-list-q">' + escapeAddStudyItemHtml(previewAddStudyItemText(it.question)) + '</div>';
    if (showPlay && canPlayAddStudyItemField_(it, 'question')) {
      html += '<button type="button" class="add-study-list-play" data-add-play="question" data-add-id="' +
        escapeAddStudyItemHtml(id) + '" aria-label="出題を再生">▶</button>';
    }
    html += '</div>';
    html += '<div class="add-study-list-field-row">';
    html += '<div class="add-study-list-a">' + escapeAddStudyItemHtml(previewAddStudyItemText(it.answer)) + '</div>';
    if (showPlay && canPlayAddStudyItemField_(it, 'answer')) {
      html += '<button type="button" class="add-study-list-play" data-add-play="answer" data-add-id="' +
        escapeAddStudyItemHtml(id) + '" aria-label="解答を再生">▶</button>';
    }
    html += '</div>';
    if (String(it.note || '').trim()) {
      html += '<span class="add-study-list-note">noteあり</span>';
    }
    html += '</div></div>';
    html += '<div class="add-study-list-row-actions">';
    html += '<button type="button" class="add-study-list-mini" data-add-insert="' +
      escapeAddStudyItemHtml(id) + '">下に挿入</button>';
    html += '<button type="button" class="add-study-list-mini add-study-list-mini-del" data-add-del="' +
      escapeAddStudyItemHtml(id) + '">削除</button>';
    html += '</div></div>';
    html += '<div class="add-study-list-move">';
    html += '<button type="button" class="add-study-list-move-btn" data-add-move="up" data-add-id="' +
      escapeAddStudyItemHtml(id) + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="上へ">▲</button>';
    html += '<button type="button" class="add-study-list-move-btn" data-add-move="down" data-add-id="' +
      escapeAddStudyItemHtml(id) + '"' + (i === items.length - 1 ? ' disabled' : '') +
      ' aria-label="下へ">▼</button>';
    html += '</div></div>';
  }
  list.innerHTML = html;
  bindAddStudyListPlayButtons_();
  refreshAddStudyListPlayButtons();
}

/**
 * 音声準備中などで一覧再生ボタンを出してよいか
 * @returns {boolean}
 */
function canShowAddStudyListPlayButtons_() {
  return !addStudy.awaitingAudioPrepare && !addStudy.formBusy;
}

/**
 * 当該欄を再生できる本文があるか（保存済み item）
 * @param {Object} item
 * @param {'question'|'answer'} field
 * @returns {boolean}
 */
function canPlayAddStudyItemField_(item, field) {
  if (!item) {
    return false;
  }
  var text = field === 'answer'
    ? (item.answer != null ? String(item.answer) : '')
    : (item.question != null ? String(item.question) : '');
  text = String(text || '').trim();
  if (!text) {
    return false;
  }
  if (typeof isImageUrl === 'function' && isImageUrl(text)) {
    return false;
  }
  return true;
}

/**
 * 一覧の再生ボタンに短押し／長押しを割り当て
 */
function bindAddStudyListPlayButtons_() {
  var list = dom.addStudyItemList;
  if (!list) {
    return;
  }
  var buttons = list.querySelectorAll('.add-study-list-play[data-add-play]');
  for (var i = 0; i < buttons.length; i++) {
    bindAddStudyListPlayButton_(buttons[i]);
  }
}

/**
 * @param {HTMLElement} button
 */
function bindAddStudyListPlayButton_(button) {
  if (!button || button.getAttribute('data-add-play-bound') === '1') {
    return;
  }
  button.setAttribute('data-add-play-bound', '1');
  var pressTimer = null;
  var longPressFired = false;
  var pressActive = false;
  var activePointerId = null;

  function clearPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    button.classList.remove('is-long-pressing');
  }

  button.addEventListener('pointerdown', function(e) {
    if (button.disabled) {
      return;
    }
    if (typeof e.button === 'number' && e.button !== 0) {
      return;
    }
    e.stopPropagation();
    pressActive = true;
    longPressFired = false;
    activePointerId = e.pointerId;
    clearPressTimer();
    try {
      button.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
    pressTimer = setTimeout(function() {
      pressTimer = null;
      if (!pressActive || button.disabled) {
        return;
      }
      longPressFired = true;
      button.classList.add('is-long-pressing');
      if (navigator.vibrate) {
        try { navigator.vibrate(30); } catch (vErr) { /* ignore */ }
      }
      runAddStudyItemFieldPlay_(button, true);
      button.classList.remove('is-long-pressing');
    }, FIELD_PLAY_LONG_PRESS_MS);
  });

  function handlePressEnd(e) {
    if (activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) {
      return;
    }
    var wasActive = pressActive;
    var wasLong = longPressFired;
    clearPressTimer();
    pressActive = false;
    activePointerId = null;
    try {
      if (e.pointerId != null && button.hasPointerCapture && button.hasPointerCapture(e.pointerId)) {
        button.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // ignore
    }
    if (!wasActive || wasLong || button.disabled) {
      return;
    }
    runAddStudyItemFieldPlay_(button, false);
  }

  button.addEventListener('pointerup', handlePressEnd);
  button.addEventListener('pointercancel', function(e) {
    if (activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) {
      return;
    }
    longPressFired = true;
    clearPressTimer();
    pressActive = false;
    activePointerId = null;
  });
  button.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  button.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
}

/**
 * @param {HTMLElement} button
 * @param {boolean} forceRefresh
 */
function runAddStudyItemFieldPlay_(button, forceRefresh) {
  var id = button.getAttribute('data-add-id');
  var field = button.getAttribute('data-add-play');
  if (!id || (field !== 'question' && field !== 'answer')) {
    return;
  }
  var item = findAddStudyItemById(id);
  if (!item || !canPlayAddStudyItemField_(item, field)) {
    return;
  }
  if (typeof playAddStudyItemFieldAudio === 'function') {
    playAddStudyItemFieldAudio(item, field, !!forceRefresh);
  }
}

/**
 * 再生中表示・無効状態を一覧ボタンへ反映
 */
function refreshAddStudyListPlayButtons() {
  var list = dom.addStudyItemList;
  if (!list) {
    return;
  }
  var buttons = list.querySelectorAll('.add-study-list-play[data-add-play]');
  var opsBlocked = !!(addStudy.formBusy || addStudy.formConfirming || addStudy.awaitingAudioPrepare);
  for (var i = 0; i < buttons.length; i++) {
    var btn = buttons[i];
    var id = String(btn.getAttribute('data-add-id') || '');
    var field = btn.getAttribute('data-add-play');
    var isCurrent = addStudy.audioBusy && addStudy.audioPlayId === id && addStudy.audioPlayField === field;
    btn.classList.toggle('is-playing', !!isCurrent);
    btn.textContent = isCurrent ? '■' : '▶';
    btn.setAttribute('aria-label', (field === 'answer' ? '解答' : '出題') + (isCurrent ? 'を停止' : 'を再生'));
    // 再生中も中断のため押せる。formBusy／確認中のみ不可
    btn.disabled = opsBlocked;
    btn.classList.toggle('is-inactive', opsBlocked);
  }
}

/**
 * 追加画面の再生ビジーを解除
 */
function clearAddStudyAudioBusy_() {
  if (!addStudy.audioBusy && !addStudy.audioPlayId && !addStudy.audioPlayField) {
    return;
  }
  addStudy.audioBusy = false;
  addStudy.audioPlayId = '';
  addStudy.audioPlayField = '';
  syncAddStudyItemEditorUi();
}

function handleAddStudyItemListClick(e) {
  if (addStudy.formConfirming || addStudy.formBusy || addStudy.audioBusy ||
      isAddStudyItemDiscardConfirming_()) {
    return;
  }
  var target = e.target;
  if (!target) return;
  var delBtn = target.closest ? target.closest('[data-add-del]') : null;
  if (delBtn) {
    e.preventDefault();
    e.stopPropagation();
    showAddStudyItemDeleteConfirm(delBtn.getAttribute('data-add-del'));
    return;
  }
  var moveBtn = target.closest ? target.closest('[data-add-move]') : null;
  if (moveBtn) {
    e.preventDefault();
    e.stopPropagation();
    if (moveBtn.disabled) {
      return;
    }
    submitMoveStudyItem(moveBtn.getAttribute('data-add-id'), moveBtn.getAttribute('data-add-move'));
    return;
  }
  var startBtn = target.closest ? target.closest('[data-add-insert-start]') : null;
  if (startBtn) {
    e.preventDefault();
    e.stopPropagation();
    beginAddStudyItemInsertStart();
    return;
  }
  var insBtn = target.closest ? target.closest('[data-add-insert]') : null;
  if (insBtn) {
    e.preventDefault();
    e.stopPropagation();
    beginAddStudyItemInsert(insBtn.getAttribute('data-add-insert'));
    return;
  }
  var row = target.closest ? target.closest('[data-add-id]') : null;
  if (row) {
    beginAddStudyItemUpdate(row.getAttribute('data-add-id'));
  }
}

function beginAddStudyItemUpdate(id) {
  var item = findAddStudyItemById(id);
  if (!item) return;
  addStudy.mode = 'update';
  addStudy.editingId = String(item.id);
  addStudy.lastUpdatedId = '';
  addStudy.insertAfterId = '';
  addStudy.insertAtStart = false;
  var q = dom.addStudyItemQuestion;
  var a = dom.addStudyItemAnswer;
  var n = dom.addStudyItemNote;
  if (q) q.value = item.question != null ? String(item.question) : '';
  if (a) a.value = item.answer != null ? String(item.answer) : '';
  if (n) n.value = item.note != null ? String(item.note) : '';
  addStudy.categorySettingsOpen = false;
  addStudy.noteOpen = !!(n && String(n.value || '').trim());
  syncAddStudyItemEditorUi();
  markAddStudyItemClean_();
  renderAddStudyItemList();
  setAddStudyItemStatus('No.' + item.no + ' を編集中です。', true);
}

function beginAddStudyItemInsert(id) {
  var item = findAddStudyItemById(id);
  if (!item) return;
  addStudy.mode = 'insert';
  addStudy.editingId = '';
  addStudy.lastUpdatedId = '';
  addStudy.insertAfterId = String(item.id);
  addStudy.insertAtStart = false;
  var q = dom.addStudyItemQuestion;
  var a = dom.addStudyItemAnswer;
  var n = dom.addStudyItemNote;
  if (q) q.value = '';
  if (a) a.value = '';
  if (n) n.value = '';
  addStudy.categorySettingsOpen = false;
  addStudy.noteOpen = false;
  syncAddStudyItemEditorUi();
  markAddStudyItemClean_();
  renderAddStudyItemList();
  setAddStudyItemStatus('No.' + item.no + ' の下に挿入します。', true);
}

function beginAddStudyItemInsertStart() {
  addStudy.mode = 'insert';
  addStudy.editingId = '';
  addStudy.lastUpdatedId = '';
  addStudy.insertAfterId = '';
  addStudy.insertAtStart = true;
  var q = dom.addStudyItemQuestion;
  var a = dom.addStudyItemAnswer;
  var n = dom.addStudyItemNote;
  if (q) q.value = '';
  if (a) a.value = '';
  if (n) n.value = '';
  addStudy.categorySettingsOpen = false;
  addStudy.noteOpen = false;
  syncAddStudyItemEditorUi();
  markAddStudyItemClean_();
  renderAddStudyItemList();
  setAddStudyItemStatus('先頭（No.1の前）に挿入します。', true);
}

function fillAddStudyItemCategoryOptions(selectedValue) {
  var select = dom.addStudyItemCategorySelect;
  if (!select) return;
  var keep = selectedValue != null ? String(selectedValue) : (select.value || '');
  var newOpt = '<option value="__new__">新しいカテゴリ</option>';
  var html = '<option value="">カテゴリを選択してください</option>';
  html += newOpt;
  var cats = getConfigurableCategories();
  for (var i = 0; i < cats.length; i++) {
    var cat = cats[i];
    var label = cat.name || ('Category ' + cat.no);
    html += '<option value="' + String(cat.no).replace(/"/g, '') + '">' +
      String(label).replace(/</g, '&lt;') + '</option>';
  }
  html += newOpt;
  select.innerHTML = html;
  if (keep && select.querySelector('option[value="' + keep.replace(/"/g, '') + '"]')) {
    select.value = keep;
  } else {
    select.value = '';
  }
  syncAddStudyItemNewCategoryFields();
  syncAddStudyItemEditorUi();
  syncAddStudyItemRenameFields(true);
  syncAddStudyItemReorderFields(true);
  renderAddStudyItemList();
}

function openAddStudyItemOverlay() {
  if (!isHomeScreenActive()) {
    return;
  }
  closeSideMenu();
  addStudy.lastUpdatedId = '';
  addStudy.categorySettingsOpen = false;
  addStudy.noteOpen = false;
  resetAddStudyItemEditor({ clearFields: true });
  fillAddStudyItemCategoryOptions('');
  setAddStudyItemStatus('', false);
  markAddStudyItemClean_();
  var overlay = dom.addStudyItemOverlay;
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }
}

/**
 * カテゴリ選択を反映する（未保存確認のあと）
 */
function applyAddStudyItemCategorySelection_() {
  addStudy.lastUpdatedId = '';
  addStudy.categorySettingsOpen = false;
  addStudy.noteOpen = false;
  resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
  syncAddStudyItemNewCategoryFields();
  syncAddStudyItemInputLock();
  renderAddStudyItemList();
  setAddStudyItemStatus('', false);
  syncAddStudyItemRenameFields(true);
  syncAddStudyItemReorderFields(true);
  markAddStudyItemClean_();
}

/**
 * 未保存なら確認してから破棄動作を行う
 * @param {'close'|'back'|'category'} action
 * @param {string} [categoryValue]
 */
function requestAddStudyItemDiscard_(action, categoryValue) {
  if (addStudy.formBusy) {
    return;
  }
  if (!isAddStudyItemDirty_()) {
    runAddStudyItemDiscardAction_(action, categoryValue);
    return;
  }
  addStudy.discardAction = action;
  addStudy.pendingCategoryValue = categoryValue != null ? String(categoryValue) : '';
  addStudy.confirmPending = true;
  addStudy.confirmKind = 'discard';
  var title = dom.answerUpdateConfirmTitle;
  if (title) {
    title.textContent = '記入を破棄しますか？';
  }
  var okButton = dom.answerUpdateConfirmOkButton;
  if (okButton) {
    okButton.textContent = '破棄';
  }
  var modal = dom.answerUpdateConfirmModal;
  if (modal) {
    modal.classList.add('active');
  }
  syncAddStudyItemEditorUi();
}

/**
 * @param {'close'|'back'|'category'} action
 * @param {string} [categoryValue]
 */
function runAddStudyItemDiscardAction_(action, categoryValue) {
  if (action === 'back') {
    resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
    renderAddStudyItemList();
    setAddStudyItemStatus('', false);
    return;
  }
  if (action === 'category') {
    var select = dom.addStudyItemCategorySelect;
    if (select) {
      select.value = categoryValue != null ? String(categoryValue) : '';
    }
    applyAddStudyItemCategorySelection_();
    return;
  }
  closeAddStudyItemOverlay();
}

function closeAddStudyItemOverlay() {
  if (addStudy.audioBusy || fieldPlay.field) {
    stopCurrentAudioPlayback({ skipButtonUpdate: true });
  }
  addStudy.confirmPending = false;
  addStudy.lastUpdatedId = '';
  addStudy.audioBusy = false;
  addStudy.audioPlayId = '';
  addStudy.audioPlayField = '';
  resetAddStudyItemEditor({ clearFields: true });
  var overlay = dom.addStudyItemOverlay;
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
}

function collectAddStudyItemDraft() {
  var select = dom.addStudyItemCategorySelect;
  var isNew = isAddStudyItemNewCategorySelected();
  var categoryNo = (select && !isNew) ? String(select.value || '') : '';
  var question = dom.addStudyItemQuestion;
  var answer = dom.addStudyItemAnswer;
  var note = dom.addStudyItemNote;
  var draft = {
    isNew: isNew,
    categoryNo: categoryNo,
    categoryName: '',
    qTitle: '',
    aTitle: '',
    question: question ? String(question.value || '') : '',
    answer: answer ? String(answer.value || '') : '',
    note: note ? String(note.value || '') : '',
    categoryOrderPosition: 'end',
    relativeCategoryNo: ''
  };
  if (isNew) {
    var nameEl = dom.addStudyItemCategoryName;
    var qt = dom.addStudyItemQTitle;
    var at = dom.addStudyItemATitle;
    draft.categoryName = nameEl ? String(nameEl.value || '').trim() : '';
    draft.qTitle = qt ? String(qt.value || '').trim() : '';
    draft.aTitle = at ? String(at.value || '').trim() : '';
    var parsedNew = parseAddStudyItemOrderPositionValue(
      dom.addStudyItemNewOrderPosition ? dom.addStudyItemNewOrderPosition.value : 'end'
    );
    if (parsedNew.ok) {
      draft.categoryOrderPosition = parsedNew.position;
      draft.relativeCategoryNo = parsedNew.relativeCategoryNo || '';
    }
  } else if (categoryNo) {
    var items = getItemsForCategoryFromLocal(categoryNo);
    if (items && items[0]) {
      draft.qTitle = String(items[0].q_title || '').trim();
      draft.aTitle = String(items[0].a_title || '').trim();
      draft.categoryName = String(items[0].category || '').trim();
    }
  }
  return draft;
}

function validateAddStudyItemDraft(draft) {
  if (!draft) {
    return '入力内容を確認してください。';
  }
  if (!String(draft.question || '').trim() && !String(draft.answer || '').trim()) {
    return '出題または解答のいずれかを入力してください。';
  }
  if (draft.isNew) {
    if (!draft.categoryName) {
      return '新しいカテゴリ名を入力してください。';
    }
    if (draft.categoryName === 'END') {
      return 'このカテゴリ名は使えません。';
    }
    if (!draft.qTitle || !draft.aTitle) {
      return '出題と解答の見出しを入力してください。';
    }
  } else {
    if (!draft.categoryNo) {
      return 'カテゴリを選択してください。';
    }
    if (!draft.qTitle || !draft.aTitle) {
      return 'このカテゴリの見出しが取れません。';
    }
  }
  return '';
}

function addStudyItemConfirmQuestion() {
  if (addStudy.mode === 'update') {
    return 'この内容を更新しますか？';
  }
  if (addStudy.mode === 'insert') {
    return 'この位置に挿入しますか？';
  }
  if (isAddStudyItemNewCategorySelected()) {
    var parsed = parseAddStudyItemOrderPositionValue(
      dom.addStudyItemNewOrderPosition ? dom.addStudyItemNewOrderPosition.value : 'end'
    );
    if (parsed.ok && parsed.position !== 'end') {
      return 'この内容を追加しますか？（並び：' + parsed.label + '）';
    }
  }
  return 'この内容を追加しますか？';
}

function addStudyItemBusyMessage() {
  if (addStudy.mode === 'update') {
    return '更新中...';
  }
  if (addStudy.mode === 'insert') {
    return '挿入中...';
  }
  return '追加中...';
}

function cancelAddStudyItemFormConfirm() {
  addStudy.formConfirming = false;
  addStudy.formBusy = false;
  addStudy.awaitingAudioPrepare = false;
  addStudy.confirmPending = false;
  addStudy.confirmKind = '';
  endAddStudyItemSaveProgress_();
  setAddStudyItemStatus('', false);
  syncAddStudyItemEditorUi();
  // 保存待ち中は fill が抑止されるため、解除後に既存カテゴリ名を再表示
  syncAddStudyItemRenameFields(true);
  syncAddStudyItemReorderFields(true);
}

function finishAddStudyItemFormConfirm() {
  addStudy.formConfirming = false;
  addStudy.formBusy = false;
  addStudy.awaitingAudioPrepare = false;
  addStudy.confirmPending = false;
  addStudy.confirmKind = '';
  endAddStudyItemSaveProgress_();
  syncAddStudyItemEditorUi();
  // 新規カテゴリ追加直後など：busy 解除後に「カテゴリ名」へ現在名を入れて編集可能にする
  syncAddStudyItemRenameFields(true);
  syncAddStudyItemReorderFields(true);
  if (typeof notifyAddStudyAudioGateChanged === 'function') {
    notifyAddStudyAudioGateChanged();
  }
}

/**
 * 保存成功後：対象問題の音声準備が終わるまで待ってからフォームを解放する（案E）
 * @param {Object|null} item
 * @param {string} successMessage
 * @param {{scrollEnd?: boolean, scrollToId?: string}} [options]
 */
function finishAddStudyItemAfterAudioPrepare_(item, successMessage, options) {
  options = options || {};
  function finishUi() {
    addStudy.awaitingAudioPrepare = false;
    endAddStudyItemSaveProgress_();
    if (options.scrollToId) {
      addStudy.lastUpdatedId = String(options.scrollToId);
    }
    resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
    renderAddStudyItemList();
    if (options.scrollToId) {
      scrollAddStudyItemListToId_(options.scrollToId);
    } else if (options.scrollEnd) {
      scrollAddStudyItemListToEnd();
    }
    setAddStudyItemStatus(successMessage, true);
    finishAddStudyItemFormConfirm();
  }
  if (!item || typeof prepareStudyItemsAudio !== 'function') {
    finishUi();
    return;
  }
  addStudy.awaitingAudioPrepare = true;
  setAddStudyItemAskStatus('音声準備中...');
  // バーは「追加中...」から出している。ここでは消さず、準備進捗の更新に引き継ぐ
  if (!addStudy.statusProgressVisible) {
    beginAddStudyItemSaveProgress_();
  }
  syncAddStudyItemEditorUi();
  prepareStudyItemsAudio([item], finishUi);
}

function showAddStudyItemRenameConfirm() {
  if (!isAddStudyItemRenameVisible()) {
    setAddStudyItemStatus('カテゴリを選択してください。', false);
    return;
  }
  var input = dom.addStudyItemRenameName;
  var err = validateAddStudyItemRenameName(input ? input.value : '', currentAddStudyItemCategoryName());
  if (err) {
    setAddStudyItemStatus(err, false);
    return;
  }
  addStudy.confirmPending = true;
  addStudy.confirmKind = 'rename';
  addStudy.formConfirming = true;
  setAddStudyItemAskStatus('このカテゴリ名に更新しますか？');
  syncAddStudyItemEditorUi();
}

function submitRenameStudyCategory() {
  var select = dom.addStudyItemCategorySelect;
  var input = dom.addStudyItemRenameName;
  var err = validateAddStudyItemRenameName(input ? input.value : '', currentAddStudyItemCategoryName());
  if (err || !select || !String(select.value || '')) {
    finishAddStudyItemFormConfirm();
    setAddStudyItemStatus(err || 'カテゴリを選択してください。', false);
    return;
  }
  var categoryNo = String(select.value);
  var categoryName = String(input.value || '').trim();
  addStudy.formBusy = true;
  if (typeof pauseBackgroundAudioForAddStudy_ === 'function') {
    pauseBackgroundAudioForAddStudy_();
  }
  setAddStudyItemAskStatus('更新中...');
  syncAddStudyItemEditorUi();
  var params = new URLSearchParams();
  params.append('action', 'renameStudyCategory');
  params.append('categoryNo', categoryNo);
  params.append('categoryName', categoryName);
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params)
    .then(function(data) {
      if (!data || !data.success) {
        throw new Error((data && data.error) || '名前の更新に失敗しました');
      }
      if (isStudyItemList_(data.categoryItems)) {
        applySheetCategoryItems(categoryNo, data.categoryItems, data.dataGeneration, categoryNo);
      } else {
        var items = getMemoryAllStudyItems().slice();
        for (var i = 0; i < items.length; i++) {
          if (items[i] && String(items[i].category_no) === categoryNo) {
            items[i].category = categoryName;
          }
        }
        applyAddStudyItemLocalItems(items, data.dataGeneration, categoryNo);
      }
      syncAddStudyItemRenameFields(true);
      setAddStudyItemStatus('名前を更新しました。', true);
    })
    .catch(function(error) {
      var msg = String(error && (error.message || error) || '名前の更新に失敗しました');
      if (handleAddStudyItemAuthFailure_(msg)) {
        return;
      }
      if (msg.indexOf('already exists') >= 0) {
        msg = 'このカテゴリ名は既にあります。';
      } else if (msg.indexOf('Invalid category') >= 0) {
        msg = 'このカテゴリ名は使えません。';
      } else if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度お試しください。';
      }
      setAddStudyItemStatus(msg, false);
    })
    .then(function() {
      finishAddStudyItemFormConfirm();
    });
}

function showAddStudyItemReorderConfirm() {
  if (!isAddStudyItemReorderVisible()) {
    return;
  }
  var parsed = parseAddStudyItemOrderPositionValue(
    dom.addStudyItemReorderPosition ? dom.addStudyItemReorderPosition.value : ''
  );
  if (!parsed.ok) {
    setAddStudyItemStatus('移動先を選んでください。', false);
    return;
  }
  var select = dom.addStudyItemCategorySelect;
  var currentNo = select ? String(select.value || '') : '';
  var currentName = currentAddStudyItemCategoryName() || currentNo;
  // 既にその位置なら何もしない（先頭／末尾の実質ノーオペはサーバー側で同値になり得る）
  addStudy.pendingReorderPosition = parsed.position;
  addStudy.pendingReorderRelativeNo = parsed.relativeCategoryNo || '';
  addStudy.confirmPending = true;
  addStudy.confirmKind = 'reorder';
  addStudy.formConfirming = true;
  setAddStudyItemAskStatus('「' + currentName + '」を' + parsed.label + 'にしますか？');
  syncAddStudyItemEditorUi();
}

function submitReorderStudyCategory() {
  var select = dom.addStudyItemCategorySelect;
  var categoryNo = select ? String(select.value || '') : '';
  var position = addStudy.pendingReorderPosition || '';
  var relativeCategoryNo = addStudy.pendingReorderRelativeNo || '';
  if (!categoryNo || !position) {
    finishAddStudyItemFormConfirm();
    setAddStudyItemStatus('移動先を選んでください。', false);
    return;
  }
  addStudy.formBusy = true;
  if (typeof pauseBackgroundAudioForAddStudy_ === 'function') {
    pauseBackgroundAudioForAddStudy_();
  }
  setAddStudyItemAskStatus('移動中...');
  syncAddStudyItemEditorUi();
  var params = new URLSearchParams();
  params.append('action', 'reorderStudyCategory');
  params.append('categoryNo', categoryNo);
  params.append('position', position);
  params.append('relativeCategoryNo', relativeCategoryNo);
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params)
    .then(function(data) {
      if (!data || !data.success) {
        throw new Error((data && data.error) || '並び替えに失敗しました');
      }
      if (isStudyItemList_(data.categoryItems)) {
        applySheetCategoryItems(
          categoryNo,
          data.categoryItems,
          data.dataGeneration,
          categoryNo,
          data.categoryOrders
        );
      } else {
        applyCategoryOrdersFromResponse_(data, categoryNo);
      }
      setAddStudyItemStatus('カテゴリの並びを更新しました。', true);
    })
    .catch(function(error) {
      var msg = String(error && (error.message || error) || '並び替えに失敗しました');
      if (handleAddStudyItemAuthFailure_(msg)) {
        return;
      }
      if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度お試しください。';
      } else if (msg.indexOf('not found') >= 0) {
        msg = '移動先のカテゴリが見つかりません。';
      }
      setAddStudyItemStatus(msg, false);
    })
    .then(function() {
      finishAddStudyItemFormConfirm();
    });
}

function showAddStudyItemConfirm() {
  var draft = collectAddStudyItemDraft();
  var err = validateAddStudyItemDraft(draft);
  if (err) {
    setAddStudyItemStatus(err, false);
    return;
  }
  if (addStudy.mode === 'insert' && !addStudy.insertAfterId && !addStudy.insertAtStart) {
    setAddStudyItemStatus('挿入位置を選んでください。', false);
    return;
  }
  if (addStudy.mode === 'update' && !addStudy.editingId) {
    setAddStudyItemStatus('更新する問題を選んでください。', false);
    return;
  }
  addStudy.confirmPending = true;
  addStudy.confirmKind = addStudy.mode;
  addStudy.formConfirming = true;
  setAddStudyItemAskStatus(addStudyItemConfirmQuestion());
  syncAddStudyItemEditorUi();
}

function showAddStudyItemDeleteConfirm(id) {
  var item = findAddStudyItemById(id);
  if (!item) return;
  addStudy.pendingDeleteId = String(item.id);
  addStudy.confirmPending = true;
  addStudy.confirmKind = 'delete';
  var title = dom.answerUpdateConfirmTitle;
  if (title) {
    title.textContent = 'No.' + item.no + ' を削除しますか？';
  }
  var modal = dom.answerUpdateConfirmModal;
  if (modal) {
    modal.classList.add('active');
  }
}

function applyAddStudyItemLocalItems(items, dataGeneration, keepCategoryNo) {
  writeLocalStudyBundle(items, dataGeneration);
  var topSelect = dom.categorySelect;
  applyStudyItemsToApp(items, {
    preserveValue: topSelect ? topSelect.value : ''
  });
  fillAddStudyItemCategoryOptions(keepCategoryNo || '');
}

/**
 * 応答の categoryOrders で端末全問の category_order を更新する
 * @param {Array|{no:string, order:number}} categoryOrders
 * @param {Array} items
 * @returns {Array}
 */
function applyCategoryOrdersToItems_(items, categoryOrders) {
  if (!categoryOrders || !categoryOrders.length || !items) {
    return items;
  }
  var map = {};
  for (var i = 0; i < categoryOrders.length; i++) {
    var e = categoryOrders[i];
    if (!e || e.no == null) continue;
    var ord = Number(e.order);
    if (!isFinite(ord)) continue;
    map[String(e.no)] = ord;
  }
  for (var j = 0; j < items.length; j++) {
    if (!items[j]) continue;
    var no = String(items[j].category_no || '');
    if (Object.prototype.hasOwnProperty.call(map, no)) {
      items[j].category_order = map[no];
    }
  }
  return items;
}

function applyCategoryOrdersFromResponse_(data, keepCategoryNo) {
  if (!data || !data.categoryOrders || !data.categoryOrders.length) {
    return;
  }
  var items = getMemoryAllStudyItems().slice();
  applyCategoryOrdersToItems_(items, data.categoryOrders);
  applyAddStudyItemLocalItems(items, data.dataGeneration, keepCategoryNo || '');
}

function isStudyItemList_(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

function applySheetCategoryItems(categoryNo, categoryItems, dataGeneration, keepCategoryNo, categoryOrders) {
  var key = String(categoryNo || '');
  var kept = getMemoryAllStudyItems().filter(function(it) {
    return it && String(it.category_no) !== key;
  });
  var incoming = isStudyItemList_(categoryItems) ? categoryItems : [];
  var merged = kept.concat(incoming);
  applyCategoryOrdersToItems_(merged, categoryOrders);
  applyAddStudyItemLocalItems(merged, dataGeneration, keepCategoryNo || key);
}

function setConfirmModalBusy(busy, busyTitle) {
  addStudy.modalBusy = !!busy;
  var modal = dom.answerUpdateConfirmModal;
  var title = dom.answerUpdateConfirmTitle;
  var okButton = dom.answerUpdateConfirmOkButton;
  var cancelButton = dom.answerUpdateConfirmCancelButton;
  var closeButton = dom.answerUpdateConfirmCloseButton;
  if (modal) {
    modal.classList.toggle('is-busy', !!busy);
  }
  if (okButton) {
    okButton.disabled = !!busy;
  }
  if (cancelButton) {
    cancelButton.disabled = !!busy;
  }
  if (closeButton) {
    closeButton.disabled = !!busy;
  }
  if (busy && title && busyTitle) {
    title.textContent = busyTitle;
  }
}

function submitAddStudyItemConfirm() {
  if (addStudy.confirmKind === 'rename') {
    submitRenameStudyCategory();
    return;
  }
  if (addStudy.confirmKind === 'reorder') {
    submitReorderStudyCategory();
    return;
  }
  if (addStudy.confirmKind === 'delete') {
    submitDeleteStudyItem();
    return;
  }
  if (addStudy.confirmKind === 'discard') {
    var discardAction = addStudy.discardAction;
    var categoryValue = addStudy.pendingCategoryValue;
    closeUpdateConfirmModal();
    runAddStudyItemDiscardAction_(discardAction, categoryValue);
    return;
  }
  if (addStudy.confirmKind === 'update') {
    submitUpdateStudyItem();
    return;
  }
  submitAddStudyItem();
}

function submitUpdateStudyItem() {
  var draft = collectAddStudyItemDraft();
  var err = validateAddStudyItemDraft(draft);
  var item = findAddStudyItemById(addStudy.editingId);
  if (err || !item) {
    finishAddStudyItemFormConfirm();
    setAddStudyItemStatus(err || '更新する問題が見つかりません。', false);
    return;
  }
  addStudy.formBusy = true;
  if (typeof pauseBackgroundAudioForAddStudy_ === 'function') {
    pauseBackgroundAudioForAddStudy_();
  }
  setAddStudyItemAskStatus(addStudyItemBusyMessage());
  beginAddStudyItemSaveProgress_();
  syncAddStudyItemEditorUi();
  var oldQuestion = item.question != null ? String(item.question) : '';
  var oldAnswer = item.answer != null ? String(item.answer) : '';
  var params = new URLSearchParams();
  params.append('action', 'updateItemFields');
  params.append('id', String(item.id));
  params.append('fields', JSON.stringify({
    question: draft.question || '',
    answer: draft.answer || '',
    note: draft.note || ''
  }));
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params)
    .then(function(data) {
      if (!data || data.success === false) {
        throw new Error((data && data.error) || '更新に失敗しました');
      }
      item.question = draft.question || '';
      item.answer = draft.answer || '';
      item.note = draft.note || '';
      var items = getMemoryAllStudyItems().slice();
      applyAddStudyItemLocalItems(items, data.dataGeneration, String(item.category_no));
      var questionChanged = oldQuestion !== item.question;
      var answerChanged = oldAnswer !== item.answer;
      var deleteJobs = [];
      if (questionChanged) {
        clearLocalAudioCachesForText(oldQuestion);
        clearLocalAudioCachesForText(item.question);
        deleteJobs.push(deleteDriveAudioAsync(item, 'question'));
      }
      if (answerChanged) {
        clearLocalAudioCachesForText(oldAnswer);
        clearLocalAudioCachesForText(item.answer);
        deleteJobs.push(deleteDriveAudioAsync(item, 'answer'));
      }
      var prepareFields = [];
      if (questionChanged) {
        prepareFields.push('question');
      }
      if (answerChanged) {
        prepareFields.push('answer');
      }
      return Promise.all(deleteJobs).then(function() {
        if (prepareFields.length) {
          finishAddStudyItemAfterAudioPrepare_(item, '更新しました。', {
            scrollToId: String(item.id)
          });
          return { audioWait: true };
        }
        addStudy.lastUpdatedId = String(item.id);
        resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
        renderAddStudyItemList();
        scrollAddStudyItemListToId_(item.id);
        setAddStudyItemStatus('更新しました。', true);
        return { audioWait: false };
      });
    })
    .catch(function(error) {
      var msg = String(error && (error.message || error) || '更新に失敗しました');
      if (!handleAddStudyItemAuthFailure_(msg)) {
        setAddStudyItemStatus(msg, false);
      }
      return { audioWait: false, failed: true };
    })
    .then(function(result) {
      if (result && result.audioWait) {
        return;
      }
      finishAddStudyItemFormConfirm();
    });
}

function submitDeleteStudyItem() {
  var item = findAddStudyItemById(addStudy.pendingDeleteId);
  if (!item) {
    addStudy.confirmPending = false;
    closeUpdateConfirmModal();
    setAddStudyItemStatus('削除する問題が見つかりません。', false);
    return;
  }
  setConfirmModalBusy(true, '削除中...');
  if (typeof pauseBackgroundAudioForAddStudy_ === 'function') {
    pauseBackgroundAudioForAddStudy_();
  }
  var params = new URLSearchParams();
  params.append('action', 'deleteStudyItem');
  params.append('id', String(item.id));
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params)
    .then(function(data) {
      if (!data || !data.success) {
        throw new Error((data && data.error) || '削除に失敗しました');
      }
      deleteDriveAudioAsync(item, 'question');
      deleteDriveAudioAsync(item, 'answer');
      var keepCat = String((data && data.categoryNo) || item.category_no || '');
      if (isStudyItemList_(data.categoryItems)) {
        applySheetCategoryItems(keepCat, data.categoryItems, data.dataGeneration, keepCat);
      } else {
        var deletedId = String(item.id);
        var items = getMemoryAllStudyItems().filter(function(it) {
          return it && String(it.id) !== deletedId;
        });
        applyAddStudyItemLocalItems(items, data.dataGeneration, keepCat);
      }
      resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
      renderAddStudyItemList();
      setAddStudyItemStatus('削除しました。', true);
    })
    .catch(function(error) {
      var msg = String(error && (error.message || error) || '削除に失敗しました');
      if (handleAddStudyItemAuthFailure_(msg)) {
        return;
      }
      if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度お試しください。';
      }
      setAddStudyItemStatus(msg, false);
    })
    .then(function() {
      addStudy.confirmPending = false;
      addStudy.pendingDeleteId = '';
      closeUpdateConfirmModal();
      if (typeof notifyAddStudyAudioGateChanged === 'function') {
        notifyAddStudyAudioGateChanged();
      }
    });
}

function submitMoveStudyItem(id, direction) {
  if (addStudy.moveBusy) {
    return;
  }
  var item = findAddStudyItemById(id);
  if (!item) {
    return;
  }
  var dir = String(direction || '') === 'up' ? 'up' : 'down';
  addStudy.moveBusy = true;
  if (typeof pauseBackgroundAudioForAddStudy_ === 'function') {
    pauseBackgroundAudioForAddStudy_();
  }
  setAddStudyItemStatus(dir === 'up' ? '上へ移動中...' : '下へ移動中...', false);
  var params = new URLSearchParams();
  params.append('action', 'moveStudyItem');
  params.append('id', String(item.id));
  params.append('direction', dir);
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params)
    .then(function(data) {
      if (!data || !data.success) {
        throw new Error((data && data.error) || '並べ替えに失敗しました');
      }
      var keepCat = String((data && data.categoryNo) || item.category_no || '');
      if (isStudyItemList_(data.categoryItems)) {
        applySheetCategoryItems(keepCat, data.categoryItems, data.dataGeneration, keepCat);
      } else {
        var items = getMemoryAllStudyItems().slice();
        var swapped = data.swappedNos || [];
        for (var s = 0; s < swapped.length; s++) {
          var sh = swapped[s];
          if (!sh || sh.id == null) continue;
          for (var i = 0; i < items.length; i++) {
            if (items[i] && String(items[i].id) === String(sh.id)) {
              items[i].no = sh.no;
              break;
            }
          }
        }
        applyAddStudyItemLocalItems(items, data.dataGeneration, keepCat);
      }
      if (addStudy.mode === 'update' && String(addStudy.editingId) === String(item.id)) {
        var updated = findAddStudyItemById(item.id);
        if (updated) {
          setAddStudyItemStatus('No.' + updated.no + ' を編集中です。', true);
        }
      } else if (addStudy.mode === 'insert') {
        setAddStudyItemStatus(addStudy.insertAtStart
          ? '先頭（No.1の前）に挿入します。'
          : '挿入位置のままです。', true);
      } else {
        setAddStudyItemStatus('並べ替えました。', true);
      }
      renderAddStudyItemList();
    })
    .catch(function(error) {
      var msg = String(error && (error.message || error) || '並べ替えに失敗しました');
      if (handleAddStudyItemAuthFailure_(msg)) {
        return;
      }
      if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度お試しください。';
      }
      setAddStudyItemStatus(msg, false);
    })
    .then(function() {
      addStudy.moveBusy = false;
      if (typeof notifyAddStudyAudioGateChanged === 'function') {
        notifyAddStudyAudioGateChanged();
      }
    });
}

function submitAddStudyItem() {
  var draft = collectAddStudyItemDraft();
  var err = validateAddStudyItemDraft(draft);
  if (err) {
    finishAddStudyItemFormConfirm();
    setAddStudyItemStatus(err, false);
    return;
  }
  var isInsert = addStudy.mode === 'insert';
  addStudy.formBusy = true;
  if (typeof pauseBackgroundAudioForAddStudy_ === 'function') {
    pauseBackgroundAudioForAddStudy_();
  }
  setAddStudyItemAskStatus(addStudyItemBusyMessage());
  beginAddStudyItemSaveProgress_();
  syncAddStudyItemEditorUi();
  var params = new URLSearchParams();
  params.append('action', 'addStudyItem');
  params.append('newCategory', draft.isNew ? '1' : '0');
  params.append('categoryNo', draft.categoryNo || '');
  params.append('categoryName', draft.categoryName || '');
  params.append('qTitle', draft.qTitle || '');
  params.append('aTitle', draft.aTitle || '');
  params.append('question', draft.question || '');
  params.append('answer', draft.answer || '');
  params.append('note', draft.note || '');
  if (draft.isNew) {
    params.append('categoryOrderPosition', draft.categoryOrderPosition || 'end');
    if (draft.relativeCategoryNo) {
      params.append('relativeCategoryNo', draft.relativeCategoryNo);
    }
  }
  if (isInsert && addStudy.insertAtStart) {
    params.append('insertAtStart', '1');
  } else if (isInsert && addStudy.insertAfterId) {
    params.append('insertAfterId', addStudy.insertAfterId);
  }
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');

  postGasJson(params)
    .then(function(data) {
      if (!data || !data.success || !data.item) {
        throw new Error((data && data.error) || (isInsert ? '挿入に失敗しました' : '追加に失敗しました'));
      }
      var keepCat = String(data.item.category_no || '');
      if (isStudyItemList_(data.categoryItems)) {
        applySheetCategoryItems(
          keepCat,
          data.categoryItems,
          data.dataGeneration,
          keepCat,
          data.categoryOrders
        );
      } else {
        var items = getMemoryAllStudyItems().slice();
        var shifted = data.shiftedNos || [];
        for (var s = 0; s < shifted.length; s++) {
          var sh = shifted[s];
          if (!sh || sh.id == null) continue;
          for (var i = 0; i < items.length; i++) {
            if (items[i] && String(items[i].id) === String(sh.id)) {
              items[i].no = sh.no;
              break;
            }
          }
        }
        items.push(data.item);
        applyCategoryOrdersToItems_(items, data.categoryOrders);
        applyAddStudyItemLocalItems(items, data.dataGeneration, keepCat);
      }
      finishAddStudyItemAfterAudioPrepare_(
        data.item,
        isInsert ? '挿入しました。続けて入力できます。' : '追加しました。続けて入力できます。',
        { scrollEnd: !isInsert }
      );
      return { audioWait: true };
    })
    .catch(function(error) {
      var msg = String(error && (error.message || error) || (isInsert ? '挿入に失敗しました' : '追加に失敗しました'));
      if (handleAddStudyItemAuthFailure_(msg)) {
        return { audioWait: false, failed: true };
      }
      if (msg.indexOf('already exists') >= 0) {
        msg = 'このカテゴリ名は既にあります。';
      } else if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度追加してください。';
      }
      setAddStudyItemStatus(msg, false);
      return { audioWait: false, failed: true };
    })
    .then(function(result) {
      if (result && result.audioWait) {
        return;
      }
      finishAddStudyItemFormConfirm();
    });
}

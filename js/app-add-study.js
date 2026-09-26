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
}

function setAddStudyItemAskStatus(message) {
  var el = dom.addStudyItemStatus;
  if (!el) return;
  el.textContent = message || '';
  el.classList.remove('is-ok');
  el.classList.add('is-ask');
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
  var t = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
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
  addStudy.formConfirming = false;
  addStudy.formBusy = false;
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
}

function syncAddStudyItemEditorUi() {
  var confirming = addStudy.formConfirming;
  var confirmingRename = confirming && addStudy.confirmKind === 'rename';
  var saveBtn = dom.addStudyItemSaveButton;
  if (saveBtn) {
    var saveIsConfirm = confirming && !confirmingRename;
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
    if (addStudy.formBusy || (confirming && !confirmingRename)) {
      renameBtn.disabled = true;
      renameBtn.textContent = '名前を更新';
      renameBtn.classList.remove('is-confirm');
    } else if (confirmingRename) {
      renameBtn.disabled = false;
      renameBtn.textContent = '確定';
      renameBtn.classList.add('is-confirm');
    } else {
      renameBtn.textContent = '名前を更新';
      renameBtn.classList.remove('is-confirm');
      var renameErr = validateAddStudyItemRenameName(
        renameInput ? renameInput.value : '',
        currentAddStudyItemCategoryName()
      );
      renameBtn.disabled = !isAddStudyItemRenameVisible() || !!renameErr;
    }
  }
  var cancelBtn = dom.addStudyItemCancelButton;
  if (cancelBtn) {
    cancelBtn.textContent = confirming ? 'キャンセル' : '閉じる';
    cancelBtn.disabled = !!addStudy.formBusy;
  }
  var closeBtn = dom.addStudyItemCloseButton;
  if (closeBtn) {
    closeBtn.disabled = !!addStudy.formBusy;
  }
  var backBtn = dom.addStudyItemBackToAddButton;
  if (backBtn) {
    backBtn.style.display = (!confirming && addStudy.mode !== 'add') ? 'inline-block' : 'none';
  }
  var select = dom.addStudyItemCategorySelect;
  if (select) {
    select.disabled = addStudy.mode !== 'add' || addStudy.formConfirming || addStudy.formBusy;
  }
  syncAddStudyItemInputLock();
  syncAddStudyItemRenameFields(false);
}

function syncAddStudyItemNewCategoryFields() {
  var wrap = dom.addStudyItemNewCategoryFields;
  if (!wrap) return;
  wrap.style.display = isAddStudyItemNewCategorySelected() ? 'block' : 'none';
}

function isAddStudyItemRenameVisible() {
  return isAddStudyItemCategoryChosen() && !isAddStudyItemNewCategorySelected() && addStudy.mode === 'add';
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
  var ids = [
    'addStudyItemQuestion',
    'addStudyItemAnswer',
    'addStudyItemNote'
  ];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) {
      el.disabled = !enabled || addStudy.formConfirming || addStudy.formBusy;
    }
  }
  var renameInput = dom.addStudyItemRenameName;
  if (renameInput) {
    renameInput.disabled = addStudy.formConfirming || addStudy.formBusy || !isAddStudyItemRenameVisible();
  }
  var newIds = ['addStudyItemCategoryName', 'addStudyItemQTitle', 'addStudyItemATitle'];
  for (var n = 0; n < newIds.length; n++) {
    var newEl = document.getElementById(newIds[n]);
    if (newEl) {
      newEl.disabled = addStudy.formConfirming || addStudy.formBusy;
    }
  }
  var saveBtn = dom.addStudyItemSaveButton;
  if (saveBtn) {
    if (addStudy.formBusy || (addStudy.formConfirming && addStudy.confirmKind === 'rename')) {
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
  var html = '';
  html += '<div class="add-study-list-start' +
    (addStudy.mode === 'insert' && addStudy.insertAtStart ? ' is-selected' : '') + '">';
  html += '<button type="button" class="add-study-list-mini" data-add-insert-start="1">先頭に挿入</button>';
  html += '</div>';
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var id = String(it.id);
    var selected = (addStudy.mode === 'update' && String(addStudy.editingId) === id) ||
      (addStudy.mode === 'insert' && !addStudy.insertAtStart && String(addStudy.insertAfterId) === id);
    html += '<div class="add-study-list-row' + (selected ? ' is-selected' : '') +
      '" role="listitem" data-add-id="' + escapeAddStudyItemHtml(id) + '">';
    html += '<div class="add-study-list-body">';
    html += '<div class="add-study-list-row-main">';
    html += '<span class="add-study-list-no">' + escapeAddStudyItemHtml(it.no) + '</span>';
    html += '<div class="add-study-list-texts">';
    html += '<div class="add-study-list-q">' + escapeAddStudyItemHtml(previewAddStudyItemText(it.question)) + '</div>';
    html += '<div class="add-study-list-a">' + escapeAddStudyItemHtml(previewAddStudyItemText(it.answer)) + '</div>';
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
}

function handleAddStudyItemListClick(e) {
  if (addStudy.formConfirming || addStudy.formBusy) {
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
  addStudy.insertAfterId = '';
  addStudy.insertAtStart = false;
  var q = dom.addStudyItemQuestion;
  var a = dom.addStudyItemAnswer;
  var n = dom.addStudyItemNote;
  if (q) q.value = item.question != null ? String(item.question) : '';
  if (a) a.value = item.answer != null ? String(item.answer) : '';
  if (n) n.value = item.note != null ? String(item.note) : '';
  syncAddStudyItemEditorUi();
  renderAddStudyItemList();
  setAddStudyItemStatus('No.' + item.no + ' を編集中です。', true);
}

function beginAddStudyItemInsert(id) {
  var item = findAddStudyItemById(id);
  if (!item) return;
  addStudy.mode = 'insert';
  addStudy.editingId = '';
  addStudy.insertAfterId = String(item.id);
  addStudy.insertAtStart = false;
  var q = dom.addStudyItemQuestion;
  var a = dom.addStudyItemAnswer;
  var n = dom.addStudyItemNote;
  if (q) q.value = '';
  if (a) a.value = '';
  if (n) n.value = '';
  syncAddStudyItemEditorUi();
  renderAddStudyItemList();
  setAddStudyItemStatus('No.' + item.no + ' の下に挿入します。', true);
}

function beginAddStudyItemInsertStart() {
  addStudy.mode = 'insert';
  addStudy.editingId = '';
  addStudy.insertAfterId = '';
  addStudy.insertAtStart = true;
  var q = dom.addStudyItemQuestion;
  var a = dom.addStudyItemAnswer;
  var n = dom.addStudyItemNote;
  if (q) q.value = '';
  if (a) a.value = '';
  if (n) n.value = '';
  syncAddStudyItemEditorUi();
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
  renderAddStudyItemList();
}

function openAddStudyItemOverlay() {
  if (!isHomeScreenActive()) {
    return;
  }
  closeSideMenu();
  resetAddStudyItemEditor({ clearFields: true });
  fillAddStudyItemCategoryOptions('');
  setAddStudyItemStatus('', false);
  var overlay = dom.addStudyItemOverlay;
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }
}

function closeAddStudyItemOverlay() {
  addStudy.confirmPending = false;
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
    note: note ? String(note.value || '') : ''
  };
  if (isNew) {
    var nameEl = dom.addStudyItemCategoryName;
    var qt = dom.addStudyItemQTitle;
    var at = dom.addStudyItemATitle;
    draft.categoryName = nameEl ? String(nameEl.value || '').trim() : '';
    draft.qTitle = qt ? String(qt.value || '').trim() : '';
    draft.aTitle = at ? String(at.value || '').trim() : '';
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
  addStudy.confirmPending = false;
  addStudy.confirmKind = '';
  setAddStudyItemStatus('', false);
  syncAddStudyItemEditorUi();
}

function finishAddStudyItemFormConfirm() {
  addStudy.formConfirming = false;
  addStudy.formBusy = false;
  addStudy.confirmPending = false;
  addStudy.confirmKind = '';
  syncAddStudyItemEditorUi();
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

function isStudyItemList_(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}

function applySheetCategoryItems(categoryNo, categoryItems, dataGeneration, keepCategoryNo) {
  var key = String(categoryNo || '');
  var kept = getMemoryAllStudyItems().filter(function(it) {
    return it && String(it.category_no) !== key;
  });
  var incoming = isStudyItemList_(categoryItems) ? categoryItems : [];
  applyAddStudyItemLocalItems(kept.concat(incoming), dataGeneration, keepCategoryNo || key);
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
  if (addStudy.confirmKind === 'delete') {
    submitDeleteStudyItem();
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
  setAddStudyItemAskStatus(addStudyItemBusyMessage());
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
      if (oldQuestion !== item.question) {
        clearLocalAudioCachesForText(oldQuestion);
        clearLocalAudioCachesForText(item.question);
        deleteDriveAudioAsync(item, 'question');
      }
      if (oldAnswer !== item.answer) {
        clearLocalAudioCachesForText(oldAnswer);
        clearLocalAudioCachesForText(item.answer);
        deleteDriveAudioAsync(item, 'answer');
      }
      resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
      renderAddStudyItemList();
      setAddStudyItemStatus('更新しました。', true);
    })
    .catch(function(error) {
      setAddStudyItemStatus(String(error && (error.message || error) || '更新に失敗しました'), false);
    })
    .then(function() {
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
      if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度お試しください。';
      }
      setAddStudyItemStatus(msg, false);
    })
    .then(function() {
      addStudy.confirmPending = false;
      addStudy.pendingDeleteId = '';
      closeUpdateConfirmModal();
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
      if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度お試しください。';
      }
      setAddStudyItemStatus(msg, false);
    })
    .then(function() {
      addStudy.moveBusy = false;
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
  setAddStudyItemAskStatus(addStudyItemBusyMessage());
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
        applySheetCategoryItems(keepCat, data.categoryItems, data.dataGeneration, keepCat);
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
        applyAddStudyItemLocalItems(items, data.dataGeneration, keepCat);
      }
      resetAddStudyItemEditor({ keepCategory: true, clearFields: true });
      renderAddStudyItemList();
      if (!isInsert) {
        scrollAddStudyItemListToEnd();
      }
      setAddStudyItemStatus(isInsert ? '挿入しました。続けて入力できます。' : '追加しました。続けて入力できます。', true);
    })
    .catch(function(error) {
      var msg = String(error && (error.message || error) || (isInsert ? '挿入に失敗しました' : '追加に失敗しました'));
      if (msg.indexOf('already exists') >= 0) {
        msg = 'このカテゴリ名は既にあります。';
      } else if (msg.indexOf('Update busy') >= 0) {
        msg = '保存が混み合っています。もう一度追加してください。';
      }
      setAddStudyItemStatus(msg, false);
    })
    .then(function() {
      finishAddStudyItemFormConfirm();
    });
}

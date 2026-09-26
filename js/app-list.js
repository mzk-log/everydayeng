/**
 * 学習完了直後のListか（閲覧操作前＝解答側表示）
 * Next／<<>>／ドロップダウンでのカテゴリ・ページ切替後は false
 */
function isCompletionSessionListView() {
  if (!studyEnd.done) {
    return false;
  }
  if (isDurationQuestionMethod()) {
    return !!studyEnd.durationSession;
  }
  if (isLastDateQuestionMethod()) {
    return !!studyEnd.lastDateSession;
  }
  return !!studyEnd.categorySession;
}

// カテゴリデータを読み込む
function loadCategoryData(categoryNo) {
  if (!googleAuth.email) {
    try {
    googleAuth.email = localStorage.getItem('userEmail');
    } catch (e) {
      googleAuth.email = googleAuth.email || null;
  }
  }
  if (!googleAuth.email) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  var items = getItemsForCategoryFromLocal(categoryNo);
  var listContainer = dom.listContainer;
  if (items && items.length) {
    categoryCatalog.byNo[String(categoryNo)] = items;
    applyLoadedCategoryData(categoryNo, items);
  } else {
    applyLoadedCategoryData(categoryNo, []);
  }
          hideCategoryLoadingSpinner();
          if (listContainer) listContainer.style.pointerEvents = 'auto';
  maybeRefreshStudyItemsFromGeneration({
    preserveValue: String(categoryNo),
    source: 'categorySwitch'
    });
}

/**
 * カテゴリList用：現在の並びを保ったまま最新アイテム参照へ差し替え
 * @param {Array} currentItems
 * @param {Array} freshItems
 * @returns {Array}
 */
function mergeCategoryItemsPreserveOrder(currentItems, freshItems) {
  var byId = {};
  (freshItems || []).forEach(function(it) {
    if (it && it.id != null) {
      byId[String(it.id)] = it;
    }
  });
  var result = [];
  (currentItems || []).forEach(function(it) {
    if (!it) return;
    if (it.id != null && byId[String(it.id)]) {
      result.push(byId[String(it.id)]);
      delete byId[String(it.id)];
    } else {
      result.push(it);
    }
  });
  Object.keys(byId).forEach(function(id) {
    result.push(byId[id]);
  });
  return result;
}

/**
 * 取得済みカテゴリデータを画面へ反映
 * カテゴリ毎（シャッフル）時は表示用配列のみシャッフル（categoryCatalog.byNo の順は維持）
 * @param {string|number} categoryNo
 * @param {Array} items
 */
function applyLoadedCategoryData(categoryNo, items) {
  var source = items || [];
  if (isCategoryShuffleQuestionMethod()) {
    categoryCatalog.items = shuffleArray(source);
  } else {
    categoryCatalog.items = source;
  }
  categoryCatalog.no = categoryNo;
  questionList.selected = [];
  displayList();
  syncCategoryLastDateFromList();
  updateListNavButtons();
  
  updateStartButtonEnabled();
  
  var listContainer = dom.listContainer;
  if (listContainer) listContainer.style.pointerEvents = 'auto';
}

/**
 * 現在のList UI 要素ID（初期画面／学習完了画面）
 * @returns {Object}
 */
function getListUiConfig() {
  if (studyEnd.done) {
    return {
      tableBodyId: 'completionListTableBody',
      headerId: 'completionListTableHeader',
      messageId: 'completionListMessage',
      containerId: 'completionListContainer',
      selectionCountId: 'completionSelectionCount',
      clearButtonId: 'completionClearSelectionButton',
      allowPreviewModal: false,
      allowRowSelect: false,
      showStartButton: false
    };
  }
  return {
    tableBodyId: 'listTableBody',
    headerId: 'listTableHeader',
    messageId: 'listMessage',
    containerId: 'listContainer',
    selectionCountId: 'selectionCount',
    clearButtonId: 'clearSelectionButton',
    allowPreviewModal: true,
    allowRowSelect: true,
    showStartButton: true
  };
}

/**
 * 完了Listの高さ維持用 minHeight を適用（ページスクロール方式のため上限は設けない）
 * @param {HTMLElement} listContainerEl
 * @param {number} heightPx
 */
function applyCompletionListMinHeight(listContainerEl, heightPx) {
  if (!listContainerEl) {
    return;
  }
  var n = Math.max(0, Math.floor(Number(heightPx) || 0));
  if (n > 0) {
    listContainerEl.style.minHeight = n + 'px';
  }
}

/**
 * 完了Listの minHeight を解除（実コンテンツ高へ縮められるようにする）
 * @param {HTMLElement|null} listContainerEl
 */
function clearCompletionListMinHeight(listContainerEl) {
  if (!listContainerEl) {
    return;
  }
  listContainerEl.style.minHeight = '';
}

// リストを表示。HOME／完了直後／完了後の閲覧は、将来別表示にできるよう別関数
function displayList() {
  if (!studyEnd.done) {
    displayHomeList();
    return;
  }
  if (isCompletionSessionListView()) {
    displayLearningJustCompletedList();
    return;
  }
  displayLearningBrowsedList();
}

/**
 * テキストまたは画像URLを List の1セルへ入れる（この関数内だけで使う）
 * @param {HTMLElement} row
 * @param {string} content
 */
function appendHomeListSideCell(row, content) {
  var cell = document.createElement('td');
  if (isImageUrl(content)) {
    var imageUrl = convertGoogleDriveUrl(content);
    var img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'list-thumbnail';
    img.alt = '画像';
    img.style.maxWidth = '100px';
    img.style.maxHeight = '60px';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    img.addEventListener('error', function() {
      cell.textContent = '[画像]';
    });
    cell.appendChild(img);
  } else {
    cell.textContent = content;
  }
  row.appendChild(cell);
}

/**
 * HOME の List。左が実効出題側、右が実効解答側（入替えONで左右入替）
 */
function displayHomeList() {
  var tableBody = dom.listTableBody;
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (categoryCatalog.items.length > 0) {
    var leftHeader = dom.listTableHeader;
    var rightHeader = dom.listTableHeaderRight;
    if (leftHeader) {
      leftHeader.textContent = getEffectiveQTitle(categoryCatalog.items[0]) || '';
    }
    if (rightHeader) {
      rightHeader.textContent = getEffectiveATitle(categoryCatalog.items[0]) || '';
    }
  }
  categoryCatalog.items.forEach(function(item, index) {
    var row = document.createElement('tr');
    var isSelected = questionList.selected.indexOf(index) !== -1;
    if (isSelected) {
      row.classList.add('selected-row');
    }
    var noCell = document.createElement('td');
    noCell.textContent = item.no || '';
    if (isSelected) {
      noCell.classList.add('selected-no');
    }
    row.appendChild(noCell);
    appendHomeListSideCell(row, getEffectiveQuestion(item));
    appendHomeListSideCell(row, getEffectiveAnswer(item));
    var studyCountCell = document.createElement('td');
    studyCountCell.className = 'list-col-study-count';
    studyCountCell.textContent = formatStudyCountForList(item);
    var durationOldCell = document.createElement('td');
    durationOldCell.className = 'list-col-duration list-col-duration-old';
    durationOldCell.textContent = formatDurationForDisplay(item.duration_old);
    var durationCell = document.createElement('td');
    durationCell.className = 'list-col-duration list-col-duration-latest';
    durationCell.textContent = formatDurationForDisplay(item.duration);
    var lastDateCell = document.createElement('td');
    lastDateCell.className = 'list-col-lastdate';
    lastDateCell.textContent = formatYmdForDisplay(item.last_date);
    row.appendChild(studyCountCell);
    row.appendChild(durationOldCell);
    row.appendChild(durationCell);
    row.appendChild(lastDateCell);
    var clickTimer = null;
    row.addEventListener('click', function(e) {
      if (clickTimer === null) {
        clickTimer = setTimeout(function() {
          clickTimer = null;
          toggleQuestionSelection(index, row);
        }, 300);
      }
    });
    row.addEventListener('dblclick', function(e) {
      e.preventDefault();
      if (clickTimer) {
        clearTimeout(clickTimer);
        clickTimer = null;
      }
      var itemIndex = categoryCatalog.items.indexOf(item);
      showModal(item, itemIndex);
    });
    tableBody.appendChild(row);
  });
  updateSelectionCount();
  var listMessage = dom.listMessage;
  var listContainer = dom.listContainer;
  if (listMessage) listMessage.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  setStartButtonVisible(true);
}

/**
 * テキストまたは画像URLを完了直後 List の1セルへ入れる
 * @param {HTMLElement} row
 * @param {string} content
 */
function appendJustCompletedListSideCell(row, content) {
  var cell = document.createElement('td');
  if (isImageUrl(content)) {
    var imageUrl = convertGoogleDriveUrl(content);
    var img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'list-thumbnail';
    img.alt = '画像';
    img.style.maxWidth = '100px';
    img.style.maxHeight = '60px';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    img.addEventListener('error', function() {
      cell.textContent = '[画像]';
    });
    cell.appendChild(img);
  } else {
    cell.textContent = content;
  }
  row.appendChild(cell);
}

/**
 * 学習完了直後の List。列は HOME と同じ（左が実効出題側、右が実効解答側）
 */
function displayLearningJustCompletedList() {
  var tableBody = dom.completionListTableBody;
  if (!tableBody) return;
  var listContainerEl = dom.completionListContainer;
  var pinnedMinHeight = 0;
  if (listContainerEl) {
    pinnedMinHeight = Math.max(0, Math.floor(listContainerEl.offsetHeight || 0));
    if (pinnedMinHeight > 0) {
      applyCompletionListMinHeight(listContainerEl, pinnedMinHeight);
    }
  }
  tableBody.innerHTML = '';
  if (categoryCatalog.items.length > 0) {
    var leftHeader = dom.completionListTableHeader;
    var rightHeader = dom.completionListTableHeaderRight;
    if (leftHeader) {
      leftHeader.textContent = getEffectiveQTitle(categoryCatalog.items[0]) || '';
    }
    if (rightHeader) {
      rightHeader.textContent = getEffectiveATitle(categoryCatalog.items[0]) || '';
    }
  }
  categoryCatalog.items.forEach(function(item) {
    var row = document.createElement('tr');
    var noCell = document.createElement('td');
    noCell.textContent = item.no || '';
    row.appendChild(noCell);
    appendJustCompletedListSideCell(row, getEffectiveQuestion(item));
    appendJustCompletedListSideCell(row, getEffectiveAnswer(item));
    var studyCountCell = document.createElement('td');
    studyCountCell.className = 'list-col-study-count';
    studyCountCell.textContent = formatStudyCountForList(item);
    var durationOldCell = document.createElement('td');
    durationOldCell.className = 'list-col-duration list-col-duration-old';
    durationOldCell.textContent = formatDurationForDisplay(item.duration_old);
    var durationCell = document.createElement('td');
    durationCell.className = 'list-col-duration list-col-duration-latest';
    durationCell.textContent = formatDurationForDisplay(item.duration);
    var lastDateCell = document.createElement('td');
    lastDateCell.className = 'list-col-lastdate';
    lastDateCell.textContent = formatYmdForDisplay(item.last_date);
    row.appendChild(studyCountCell);
    row.appendChild(durationOldCell);
    row.appendChild(durationCell);
    row.appendChild(lastDateCell);
    tableBody.appendChild(row);
  });
  updateSelectionCount();
  var listMessage = dom.completionListMessage;
  var listContainer = dom.completionListContainer;
  if (listMessage) listMessage.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  if (listContainerEl) {
    clearCompletionListMinHeight(listContainerEl);
    var contentHeight = Math.max(0, Math.floor(listContainerEl.offsetHeight || 0));
    if (contentHeight > 0) {
      applyCompletionListMinHeight(listContainerEl, contentHeight);
    }
    bindCompletionListImagesToKeepScroll(listContainerEl);
  }
  updateNavAnswerButton();
  maintainCompletionScrollAtBottom();
}

/**
 * テキストまたは画像URLを、完了後に切り替えた List の1セルへ入れる
 * @param {HTMLElement} row
 * @param {string} content
 */
function appendLearningBrowsedListSideCell(row, content) {
  var cell = document.createElement('td');
  if (isImageUrl(content)) {
    var imageUrl = convertGoogleDriveUrl(content);
    var img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'list-thumbnail';
    img.alt = '画像';
    img.style.maxWidth = '100px';
    img.style.maxHeight = '60px';
    img.style.height = 'auto';
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    img.addEventListener('error', function() {
      cell.textContent = '[画像]';
    });
    cell.appendChild(img);
  } else {
    cell.textContent = content;
  }
  row.appendChild(cell);
}

/**
 * 完了後にカテゴリやページを切り替えた List。列は HOME と同じ
 */
function displayLearningBrowsedList() {
  var tableBody = dom.completionListTableBody;
  if (!tableBody) return;
  var listContainerEl = dom.completionListContainer;
  var pinnedMinHeight = 0;
  if (listContainerEl) {
    pinnedMinHeight = Math.max(0, Math.floor(listContainerEl.offsetHeight || 0));
    if (pinnedMinHeight > 0) {
      applyCompletionListMinHeight(listContainerEl, pinnedMinHeight);
    }
  }
  tableBody.innerHTML = '';
  if (categoryCatalog.items.length > 0) {
    var leftHeader = dom.completionListTableHeader;
    var rightHeader = dom.completionListTableHeaderRight;
    if (leftHeader) {
      leftHeader.textContent = getEffectiveQTitle(categoryCatalog.items[0]) || '';
    }
    if (rightHeader) {
      rightHeader.textContent = getEffectiveATitle(categoryCatalog.items[0]) || '';
    }
  }
  categoryCatalog.items.forEach(function(item) {
    var row = document.createElement('tr');
    var noCell = document.createElement('td');
    noCell.textContent = item.no || '';
    row.appendChild(noCell);
    appendLearningBrowsedListSideCell(row, getEffectiveQuestion(item));
    appendLearningBrowsedListSideCell(row, getEffectiveAnswer(item));
    var studyCountCell = document.createElement('td');
    studyCountCell.className = 'list-col-study-count';
    studyCountCell.textContent = formatStudyCountForList(item);
    var durationOldCell = document.createElement('td');
    durationOldCell.className = 'list-col-duration list-col-duration-old';
    durationOldCell.textContent = formatDurationForDisplay(item.duration_old);
    var durationCell = document.createElement('td');
    durationCell.className = 'list-col-duration list-col-duration-latest';
    durationCell.textContent = formatDurationForDisplay(item.duration);
    var lastDateCell = document.createElement('td');
    lastDateCell.className = 'list-col-lastdate';
    lastDateCell.textContent = formatYmdForDisplay(item.last_date);
    row.appendChild(studyCountCell);
    row.appendChild(durationOldCell);
    row.appendChild(durationCell);
    row.appendChild(lastDateCell);
    tableBody.appendChild(row);
  });
  updateSelectionCount();
  var listMessage = dom.completionListMessage;
  var listContainer = dom.completionListContainer;
  if (listMessage) listMessage.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  if (listContainerEl) {
    clearCompletionListMinHeight(listContainerEl);
    var contentHeight = Math.max(0, Math.floor(listContainerEl.offsetHeight || 0));
    if (contentHeight > 0) {
      applyCompletionListMinHeight(listContainerEl, contentHeight);
    }
    bindCompletionListImagesToKeepScroll(listContainerEl);
  }
  updateNavAnswerButton();
  maintainCompletionScrollAtBottom();
}

// 問題の選択/解除をトグル
function toggleQuestionSelection(index, row) {
  if (studyEnd.done) {
    return;
  }
  var selectedIndex = questionList.selected.indexOf(index);
  var noCell = row.querySelector('td:first-child'); // No列を取得
  if (selectedIndex === -1) {
    // 選択
    questionList.selected.push(index);
    row.classList.add('selected-row');
    if (noCell) noCell.classList.add('selected-no');
  } else {
    // 解除
    questionList.selected.splice(selectedIndex, 1);
    row.classList.remove('selected-row');
    if (noCell) noCell.classList.remove('selected-no');
  }
  updateSelectionCount();
  if (studyEnd.done) {
    updateNavAnswerButton();
  }
}

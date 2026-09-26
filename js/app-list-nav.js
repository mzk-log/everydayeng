/**
 * 選択可能カテゴリのうち、指定番号が何番目か（1始まり）と総数を返す
 * @param {string|number} categoryNo
 * @returns {{ position: number, total: number }|null}
 */
function getSelectableCategoryNavInfo(categoryNo) {
  if (categoryNo == null || categoryNo === '' || !categoryCatalog.list || categoryCatalog.list.length === 0) {
    return null;
  }
  var selectable = [];
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (isCategorySelectable(categoryCatalog.list[i])) {
      selectable.push(categoryCatalog.list[i]);
    }
  }
  if (selectable.length === 0) {
    return null;
  }
  var position = 0;
  for (var j = 0; j < selectable.length; j++) {
    if (String(selectable[j].no) === String(categoryNo)) {
      position = j + 1;
      break;
    }
  }
  if (position === 0) {
    return null;
  }
  return { position: position, total: selectable.length };
}

/**
 * カテゴリ位置表示を更新（学習日優先・解答時間優先は非表示）
 * @param {HTMLElement|null} indicatorEl
 * @param {string|number|null} categoryNo
 */
function updateCategoryNavIndicatorElement(indicatorEl, categoryNo) {
  if (!indicatorEl) {
    return;
  }
  if (isCrossCategoryQuestionMethod() || categoryNo == null || categoryNo === '') {
    indicatorEl.textContent = '';
    indicatorEl.style.display = 'none';
    return;
  }
  var info = getSelectableCategoryNavInfo(categoryNo);
  if (!info) {
    indicatorEl.textContent = '';
    indicatorEl.style.display = 'none';
    return;
  }
  indicatorEl.textContent = info.position + ' / ' + info.total;
  indicatorEl.style.display = '';
}

/**
 * Listナビコンテナの表示／非表示
 * @param {string} containerId
 * @param {boolean} visible
 */
function setListNavContainerVisible(containerId, visible) {
  var listNavContainer = document.getElementById(containerId);
  if (!listNavContainer) {
    return;
  }
  if (containerId === 'screen2ListNavContainer' && studyEnd.done && !studyEnd.browseStarted) {
    listNavContainer.style.display = 'none';
    listNavContainer.style.visibility = 'hidden';
    listNavContainer.style.pointerEvents = 'none';
    return;
  }
  listNavContainer.style.visibility = visible ? 'visible' : 'hidden';
  if (containerId === 'screen2ListNavContainer') {
    // 学習完了中は display:none せず高さを維持（<<>> 出現で下にズレるのを防ぐ）
    if (studyEnd.done) {
      listNavContainer.style.display = '';
      listNavContainer.style.pointerEvents = visible ? '' : 'none';
    } else {
      listNavContainer.style.display = visible ? '' : 'none';
      listNavContainer.style.pointerEvents = visible ? '' : 'none';
    }
  }
}

// Listナビゲーションボタンを表示
function showListNavButtons() {
  setListNavContainerVisible('screen1ListNavContainer', true);
  if (studyEnd.done) {
    setListNavContainerVisible('screen2ListNavContainer', true);
  }
}

// Listナビゲーションボタンを非表示
function hideListNavButtons() {
  setListNavContainerVisible('screen1ListNavContainer', false);
  setListNavContainerVisible('screen2ListNavContainer', false);
}

/**
 * 1組の Listナビ（<< >> と位置表示）を更新
 * @param {{ containerId: string, prevId: string, nextId: string, indicatorId: string, selectId: string, active: boolean }} config
 */
function updateListNavPair(config) {
  var prevButton = document.getElementById(config.prevId);
  var nextButton = document.getElementById(config.nextId);
  var indicator = document.getElementById(config.indicatorId);
  var select = document.getElementById(config.selectId);

  if (!prevButton || !nextButton) {
    return;
  }

  if (!config.active) {
    setListNavContainerVisible(config.containerId, false);
    updateCategoryNavIndicatorElement(indicator, null);
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  // 解答時間優先：7件ページ送り
  if (isDurationQuestionMethod()) {
    updateCategoryNavIndicatorElement(indicator, null);
    if (studyEnd.done && studyEnd.durationSession) {
      setListNavContainerVisible(config.containerId, true);
      prevButton.disabled = true;
      nextButton.disabled = false;
      return;
    }
    var pageCount = getDurationModePageCount();
    if (pageCount <= 0) {
      setListNavContainerVisible(config.containerId, false);
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }
    setListNavContainerVisible(config.containerId, true);
    prevButton.disabled = durationMode.pageIndex <= 0;
    nextButton.disabled = durationMode.pageIndex >= pageCount - 1;
    return;
  }

  // 学習日優先
  if (isLastDateQuestionMethod()) {
    updateCategoryNavIndicatorElement(indicator, null);
    if (isLastDateNormalQuestionMethod()) {
      if ((studyEnd.done && studyEnd.lastDateSession) || lastDateMode.needsResort) {
        setListNavContainerVisible(config.containerId, true);
        prevButton.disabled = true;
        nextButton.disabled = false;
        return;
      }
      var lastDatePageCount = getLastDateModePageCount();
      if (lastDatePageCount <= 0) {
        setListNavContainerVisible(config.containerId, false);
        prevButton.disabled = true;
        nextButton.disabled = true;
        return;
      }
      setListNavContainerVisible(config.containerId, true);
      prevButton.disabled = lastDateMode.pageIndex <= 0;
      nextButton.disabled = lastDateMode.pageIndex >= lastDatePageCount - 1;
      return;
    }
    // シャッフル：> で再抽選（< は無効）
    setListNavContainerVisible(config.containerId, true);
    prevButton.disabled = true;
    nextButton.disabled = false;
    return;
  }

  if (!select || categoryCatalog.list.length === 0) {
    setListNavContainerVisible(config.containerId, false);
    updateCategoryNavIndicatorElement(indicator, null);
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  if (!select.value) {
    setListNavContainerVisible(config.containerId, false);
    updateCategoryNavIndicatorElement(indicator, null);
    prevButton.disabled = true;
    nextButton.disabled = true;
    return;
  }

  setListNavContainerVisible(config.containerId, true);
  updateCategoryNavIndicatorElement(indicator, select.value);

  var currentIndex = -1;
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (categoryCatalog.list[i].no == select.value) {
      currentIndex = i;
      break;
    }
  }

  if (currentIndex === -1) {
    prevButton.disabled = true;
    nextButton.disabled = true;
  } else {
    prevButton.disabled = (findSelectableCategoryIndex(currentIndex, -1) < 0);
    nextButton.disabled = (findSelectableCategoryIndex(currentIndex, 1) < 0);
  }
}

// Listナビゲーションボタンの状態を更新
function updateListNavButtons() {
  updateListNavPair({
    containerId: 'screen1ListNavContainer',
    prevId: 'listPrevButton',
    nextId: 'listNextButton',
    indicatorId: 'categoryNavInfo',
    selectId: 'categorySelect',
    active: true
  });
  updateListNavPair({
    containerId: 'screen2ListNavContainer',
    prevId: 'learningListPrevButton',
    nextId: 'learningListNextButton',
    indicatorId: 'learningCategoryNavInfo',
    selectId: 'learningCategorySelect',
    active: studyEnd.done
  });
}

// 前のカテゴリに移動（学習日優先時はページ戻し）
function navigateToPreviousCategory() {
  if (isDurationQuestionMethod()) {
    navigateDurationModePage(-1);
    return;
  }
  if (isLastDateQuestionMethod()) {
    navigateLastDateModePage(-1);
    return;
  }
  var select = dom.categorySelect;
  if (!select || !select.value || categoryCatalog.list.length === 0) {
    return;
  }
  
  // ボタンを無効化
  var prevButton = dom.listPrevButton;
  var nextButton = dom.listNextButton;
  if (prevButton) prevButton.disabled = true;
  if (nextButton) nextButton.disabled = true;
  
  // 現在選択されているカテゴリのインデックスを取得
  var currentIndex = -1;
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (categoryCatalog.list[i].no == select.value) {
      currentIndex = i;
      break;
    }
  }
  
  // 前の選択可能カテゴリへ
  var previousIndex = findSelectableCategoryIndex(currentIndex, -1);
  if (previousIndex >= 0) {
    select.value = categoryCatalog.list[previousIndex].no;
    var event = new Event('change', { bubbles: true });
    select.dispatchEvent(event);
    syncCustomCategorySelect(select);
  }
}

// 次のカテゴリに移動（学習日優先時はページ送り）
function navigateToNextCategory() {
  if (isDurationQuestionMethod()) {
    navigateDurationModePage(1);
    return;
  }
  if (isLastDateQuestionMethod()) {
    navigateLastDateModePage(1);
    return;
  }
  var select = dom.categorySelect;
  if (!select || !select.value || categoryCatalog.list.length === 0) {
    return;
  }
  
  // ボタンを無効化
  var prevButton = dom.listPrevButton;
  var nextButton = dom.listNextButton;
  if (prevButton) prevButton.disabled = true;
  if (nextButton) nextButton.disabled = true;
  
  // 現在選択されているカテゴリのインデックスを取得
  var currentIndex = -1;
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (categoryCatalog.list[i].no == select.value) {
      currentIndex = i;
      break;
    }
  }
  
  // 次の選択可能カテゴリへ
  var nextIndex = findSelectableCategoryIndex(currentIndex, 1);
  if (nextIndex >= 0) {
    select.value = categoryCatalog.list[nextIndex].no;
    var event = new Event('change', { bubbles: true });
    select.dispatchEvent(event);
    syncCustomCategorySelect(select);
  }
}

// 選択数の表示を更新
function updateSelectionCount() {
  var ui = getListUiConfig();
  var selectionCount = document.getElementById(ui.selectionCountId);
  if (!selectionCount) return;
  if (studyEnd.done || ui.allowRowSelect === false) {
    selectionCount.style.display = 'none';
    return;
  }
  
  var totalCount = categoryCatalog.items.length;
  var selectedCount = questionList.selected.length;
  
  if (selectedCount === 0) {
    // 未選択時は全問表示
    selectionCount.textContent = '全' + totalCount + '問';
    selectionCount.style.display = 'inline';
  } else {
    // 選択された問題のNoを取得して表示
    var selectedNos = [];
    questionList.selected.sort(function(a, b) { return a - b; }); // インデックスをソート
    questionList.selected.forEach(function(index) {
      if (index >= 0 && index < categoryCatalog.items.length) {
        var no = categoryCatalog.items[index].no;
        if (no) {
          selectedNos.push(no);
        }
      }
    });
    selectionCount.textContent = '全' + selectedCount + '問(' + selectedNos.join(',') + ')';
    selectionCount.style.display = 'inline';
  }
  
  // クリアボタンの有効/無効を更新
  updateClearButton();
}

/**
 * TOP の START ドック（ぼかし帯＋ボタン）の表示切替
 * @param {boolean} visible
 */
function setStartButtonVisible(visible) {
  var dock = dom.startButtonDock;
  var startButton = dom.startButton;
  var display = visible ? 'block' : 'none';
  if (dock) {
    dock.style.display = display;
    dock.setAttribute('aria-hidden', visible ? 'false' : 'true');
  }
  if (startButton && !visible) {
    startButton.disabled = false;
  } else if (visible) {
    updateStartButtonEnabled();
  }
}

/**
 * TOP の START を効果音／本問音声中は無効化する
 */
function updateStartButtonEnabled() {
  var startButton = dom.startButton;
  if (!startButton) {
    return;
  }
  var dock = dom.startButtonDock;
  var hidden = !dock || dock.style.display === 'none';
  if (hidden) {
    return;
  }
  var spinner = dom.categoryLoadingSpinner;
  var loading = !!(spinner && spinner.style.display === 'block');
  startButton.disabled = loading || isNavActionLockedByAudio();
}

// リスト表示をリセット
function resetListDisplay() {
  var listMessage = dom.listMessage;
  var listContainer = dom.listContainer;
  var selectionCount = dom.selectionCount;
  
  hideCategoryLoadingSpinner();
  
  if (listMessage) {
    listMessage.style.display = 'block';
    listMessage.style.whiteSpace = '';
    listMessage.textContent = 'Categoryを選択してください。';
  }
  if (listContainer) listContainer.style.display = 'none';
  setStartButtonVisible(false);
  if (selectionCount) selectionCount.style.display = 'none';
  
  // ボタンを非表示
  hideListNavButtons();
  // ボタンの状態をリセット
  updateListNavButtons();
}

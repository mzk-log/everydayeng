/**
 * 学習日優先（ノーマル）の総ページ数
 * @returns {number}
 */
function getLastDateModePageCount() {
  if (!lastDateMode.allItems.length) return 0;
  return Math.ceil(lastDateMode.allItems.length / CROSS_CATEGORY_LIST_SIZE);
}

/**
 * 学習日優先（ノーマル）：現在ページを List へ反映
 */
function applyLastDateModePageToList() {
  if (isActiveLearningSession()) {
    return;
  }
  studyEnd.lastDateSession = false;
  lastDateMode.needsResort = false;
  var pageCount = getLastDateModePageCount();
  if (pageCount <= 0) {
    categoryCatalog.items = [];
    categoryCatalog.no = null;
    questionList.selected = [];
    var listMessage = document.getElementById(studyEnd.done ? 'completionListMessage' : 'listMessage');
    var listContainer = document.getElementById(studyEnd.done ? 'completionListContainer' : 'listContainer');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
    updateListNavButtons();
    if (studyEnd.done) {
      refreshAdvanceNavControls();
      tryPlayStartWaitCharge();
    }
    return;
  }
  if (lastDateMode.pageIndex >= pageCount) {
    lastDateMode.pageIndex = pageCount - 1;
  }
  if (lastDateMode.pageIndex < 0) {
    lastDateMode.pageIndex = 0;
  }
  var start = lastDateMode.pageIndex * CROSS_CATEGORY_LIST_SIZE;
  categoryCatalog.items = lastDateMode.allItems.slice(start, start + CROSS_CATEGORY_LIST_SIZE);
  categoryCatalog.no = null;
  questionList.selected = [];
  displayList();
  updateListNavButtons();
  if (studyEnd.done) {
    refreshAdvanceNavControls();
    tryPlayStartWaitCharge();
  }
}

/**
 * 学習日優先：再ソート→（シャッフル＝抽選／ノーマル＝先頭ページ）→List表示
 */
function regenerateLastDateModeList() {
  if (isActiveLearningSession()) {
    return;
  }
  if (lastDateMode.allItems.length > 0) {
    sortItemsForLastDatePriorityMode(lastDateMode.allItems);
  }
  studyEnd.lastDateSession = false;
  if (isLastDateNormalQuestionMethod()) {
    lastDateMode.pageIndex = 0;
    applyLastDateModePageToList();
    return;
  }
  lastDateMode.needsResort = false;
  categoryCatalog.items = pickLastDateModeListItems(lastDateMode.allItems);
  categoryCatalog.no = null;
  questionList.selected = [];
  displayList();
  updateListNavButtons();
  if (studyEnd.done) {
    refreshAdvanceNavControls();
    tryPlayStartWaitCharge();
  }
}

/**
 * 学習日優先：完了直後に今回学習分を List 表示
 */
function applyLastDateModeSessionToCompletionList() {
  categoryCatalog.items = (lastDateMode.sessionItems && lastDateMode.sessionItems.length > 0)
    ? lastDateMode.sessionItems.slice()
    : [];
  categoryCatalog.no = null;
  questionList.selected = [];
  studyEnd.lastDateSession = true;
  if (isLastDateNormalQuestionMethod()) {
    lastDateMode.needsResort = true;
  }

  var listMessage = dom.completionListMessage;
  var listContainer = dom.completionListContainer;
  if (categoryCatalog.items.length === 0) {
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
  } else {
    displayList();
  }
  updateListNavButtons();
  refreshAdvanceNavControls();
}

/**
 * 学習日優先：完了セッション表示から再ソート／再抽選へ
 * @returns {boolean}
 */
function exitLastDateCompletionSessionWithRegenerate() {
  if (!studyEnd.done || !studyEnd.lastDateSession) {
    return false;
  }
  if (lastDateMode.allItems.length > 0) {
    regenerateLastDateModeList();
  } else {
    loadLastDateModeData({ regenerate: true, forceFetch: true });
  }
  maintainCompletionScrollAtBottom();
  return true;
}

/**
 * 学習日優先データを取得・ソート・抽選して表示
 * @param {Object} [options]
 * @param {boolean} [options.regenerate] - 再ソート＋再抽選
 * @param {boolean} [options.forceFetch]
 */
function loadLastDateModeData(options) {
  options = options || {};
  var regenerate = options.regenerate !== false;
  var forceFetch = !!options.forceFetch;

  applyQuestionMethodModeUi();

  if (!forceFetch && lastDateMode.allItems.length > 0) {
    if (regenerate) {
      regenerateLastDateModeList();
    } else if (categoryCatalog.items.length > 0) {
      questionList.selected = [];
      if (isLastDateNormalQuestionMethod()) {
        lastDateMode.needsResort = true;
      }
      displayList();
      updateListNavButtons();
      if (studyEnd.done) {
        refreshAdvanceNavControls();
      }
    } else {
      regenerateLastDateModeList();
    }
    return;
  }

  if (!googleAuth.email) {
    googleAuth.email = localStorage.getItem('userEmail');
  }
  if (!googleAuth.email) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }

  lastDateMode.loadRequestId++;
  var requestId = lastDateMode.loadRequestId;
  var holdOverlay = shouldHoldPageLoadingForAllStudy(options);

  function applyLastDateItems(rawItems, fromServer) {
    var extra = fromServer ? [] : lastDateMode.allItems;
    var items = mergeAllStudyItemsWithMemory(rawItems || [], extra, {
      preferIncomingStudyMeta: !!fromServer
    });
    lastDateMode.allItems = filterItemsByVisibleCategories(items);
    sortItemsForLastDatePriorityMode(lastDateMode.allItems);
    if (isActiveLearningSession()) {
      return;
    }
    regenerateLastDateModeList();
  }

  var localItems = getMemoryAllStudyItems();
  if (localItems.length) {
    applyLastDateItems(localItems, false);
    if (holdOverlay) finishPageLoadingAndUnlock();
    return;
  }

  var usedLocal = false;
  beginAllStudyItemsNetworkWait(holdOverlay);

  fetchAllStudyItemsFromServer(function(error, items, meta) {
    if (requestId !== lastDateMode.loadRequestId) return;
    if (!isLastDateQuestionMethod()) {
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
      cancelStartWaitCharge();
      return;
    }
    if (error) {
        clearAllStudyItemsLoadingUi('データの取得に失敗しました。再読み込みしてください。');
        showError('アクセスエラー: ' + error.toString());
      if (holdOverlay) finishPageLoadingAndUnlock();
      cancelStartWaitCharge();
      return;
    }
    if ((meta && meta.droppedStale) || !items || !items.length) {
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
      return;
    }
    writeLocalStudyBundle(items || [], meta && meta.dataGeneration);
    setTimeout(function() {
      if (requestId !== lastDateMode.loadRequestId) return;
      if (!isLastDateQuestionMethod()) {
        clearAllStudyItemsLoadingUi();
        if (holdOverlay) finishPageLoadingAndUnlock();
        return;
      }
      applyLastDateItems(items || [], true);
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
    }, 0);
  });
}

/**
 * 学習日優先のページ操作
 * シャッフル：> で再抽選（< は無効）
 * ノーマル：要再ソート時は再ソート→先頭ページ。以降はページ送り（末尾で>無効、先頭で<無効）
 * @param {number} direction -1 | 1
 * @returns {boolean}
 */
function navigateLastDateModePage(direction) {
  if (isLastDateNormalQuestionMethod()) {
    if (direction < 0) {
      if (studyEnd.done && studyEnd.lastDateSession) {
        return false;
      }
      if (lastDateMode.needsResort) {
        return false;
      }
      if (lastDateMode.pageIndex <= 0) {
        return false;
      }
      lastDateMode.pageIndex -= 1;
      applyLastDateModePageToList();
      if (studyEnd.done) {
        maintainCompletionScrollAtBottom();
      }
      return true;
    }

    if (studyEnd.done && studyEnd.lastDateSession) {
      return exitLastDateCompletionSessionWithRegenerate();
    }
    if (lastDateMode.needsResort) {
      if (lastDateMode.allItems.length > 0) {
        regenerateLastDateModeList();
      } else {
        loadLastDateModeData({ regenerate: true, forceFetch: false });
      }
      if (studyEnd.done) {
        maintainCompletionScrollAtBottom();
      }
      return true;
    }
    var pageCount = getLastDateModePageCount();
    if (pageCount <= 0 || lastDateMode.pageIndex >= pageCount - 1) {
      return false;
    }
    lastDateMode.pageIndex += 1;
    applyLastDateModePageToList();
    if (studyEnd.done) {
      maintainCompletionScrollAtBottom();
    }
    return true;
  }

  // シャッフル
  if (direction < 0) {
    return false;
  }
  if (studyEnd.done && studyEnd.lastDateSession) {
    return exitLastDateCompletionSessionWithRegenerate();
  }
  if (lastDateMode.allItems.length > 0) {
    regenerateLastDateModeList();
    if (studyEnd.done) {
      maintainCompletionScrollAtBottom();
    }
    return true;
  }
  loadLastDateModeData({ regenerate: true, forceFetch: false });
  return true;
}

/**
 * 解答時間優先：完了直後に今回学習分を List 表示
 */
function applyDurationModeSessionToCompletionList() {
  categoryCatalog.items = (durationMode.sessionItems && durationMode.sessionItems.length > 0)
    ? durationMode.sessionItems.slice()
    : [];
  categoryCatalog.no = null;
  questionList.selected = [];
  studyEnd.durationSession = true;

  var listMessage = dom.completionListMessage;
  var listContainer = dom.completionListContainer;
  if (categoryCatalog.items.length === 0) {
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
  } else {
    displayList();
  }
  updateListNavButtons();
  refreshAdvanceNavControls();
}

/**
 * 解答時間優先：完了セッション表示から再ソートして先頭ページへ
 * @returns {boolean}
 */
function exitDurationCompletionSessionWithResort() {
  if (!studyEnd.done || !studyEnd.durationSession) {
    return false;
  }
  studyEnd.durationSession = false;
  if (durationMode.sortedItems.length > 0) {
    sortItemsForDurationMode(durationMode.sortedItems);
    durationMode.pageIndex = 0;
    applyDurationModePageToList();
  } else {
    loadDurationModeData({ resetPage: true, resort: true, forceFetch: true });
  }
  maintainCompletionScrollAtBottom();
  return true;
}

/**
 * 学習日優先の総ページ数
 * @returns {number}
 */
function getDurationModePageCount() {
  if (!durationMode.sortedItems.length) return 0;
  return Math.ceil(durationMode.sortedItems.length / CROSS_CATEGORY_LIST_SIZE);
}

/**
 * 現在ページの件数を categoryCatalog.items へ反映してList表示
 */
function applyDurationModePageToList() {
  if (isActiveLearningSession()) {
    return;
  }
  studyEnd.durationSession = false;
  var pageCount = getDurationModePageCount();
  if (pageCount <= 0) {
    durationMode.pageIndex = 0;
    categoryCatalog.items = [];
    questionList.selected = [];
    var listMessage = document.getElementById(studyEnd.done ? 'completionListMessage' : 'listMessage');
    var listContainer = document.getElementById(studyEnd.done ? 'completionListContainer' : 'listContainer');
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
    }
    if (listContainer) listContainer.style.display = 'none';
    if (!studyEnd.done) setStartButtonVisible(false);
    updateListNavButtons();
    if (studyEnd.done) {
      refreshAdvanceNavControls();
      tryPlayStartWaitCharge();
    }
    return;
  }
  
  if (durationMode.pageIndex < 0) durationMode.pageIndex = 0;
  if (durationMode.pageIndex >= pageCount) durationMode.pageIndex = pageCount - 1;
  
  var start = durationMode.pageIndex * CROSS_CATEGORY_LIST_SIZE;
  categoryCatalog.items = durationMode.sortedItems.slice(start, start + CROSS_CATEGORY_LIST_SIZE);
  categoryCatalog.no = null;
  questionList.selected = [];
  displayList();
  
  if (!studyEnd.done) {
    setStartButtonVisible(true);
    showListNavButtons();
  }
  updateListNavButtons();
  if (studyEnd.done) {
    refreshAdvanceNavControls();
    tryPlayStartWaitCharge();
  }
}

/**
 * 学習日優先データを取得・ソートして表示
 * @param {Object} [options]
 * @param {boolean} [options.resetPage]
 * @param {boolean} [options.resort]
 * @param {boolean} [options.forceFetch]
 */
function loadDurationModeData(options) {
  options = options || {};
  var resetPage = options.resetPage !== false;
  var resort = options.resort !== false;
  var forceFetch = !!options.forceFetch;
  
  applyQuestionMethodModeUi();
  
  if (!forceFetch && durationMode.sortedItems.length > 0) {
    if (resort) {
      sortItemsForDurationMode(durationMode.sortedItems);
    }
    if (resetPage) {
      durationMode.pageIndex = 0;
    }
    applyDurationModePageToList();
    return;
  }
  
  if (!googleAuth.email) {
    googleAuth.email = localStorage.getItem('userEmail');
  }
  if (!googleAuth.email) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    return;
  }
  
  durationMode.loadRequestId++;
  var requestId = durationMode.loadRequestId;
  var holdOverlay = shouldHoldPageLoadingForAllStudy(options);

  function applyDurationItems(rawItems, fromServer) {
    var extra = fromServer ? [] : durationMode.sortedItems;
    var items = mergeAllStudyItemsWithMemory(rawItems || [], extra, {
      preferIncomingStudyMeta: !!fromServer
    });
    durationMode.sortedItems = filterItemsByVisibleCategories(items);
    sortItemsForDurationMode(durationMode.sortedItems);
    if (isActiveLearningSession()) {
      return;
    }
    if (resetPage) durationMode.pageIndex = 0;
    applyDurationModePageToList();
  }

  var localItems = getMemoryAllStudyItems();
  if (localItems.length) {
    applyDurationItems(localItems, false);
    if (holdOverlay) finishPageLoadingAndUnlock();
    return;
  }

  beginAllStudyItemsNetworkWait(holdOverlay);

  fetchAllStudyItemsFromServer(function(error, items, meta) {
    if (requestId !== durationMode.loadRequestId) return;
    if (!isDurationQuestionMethod()) {
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
      cancelStartWaitCharge();
      return;
    }
    if (error) {
        clearAllStudyItemsLoadingUi('データの取得に失敗しました。再読み込みしてください。');
        showError('アクセスエラー: ' + error.toString());
      if (holdOverlay) finishPageLoadingAndUnlock();
      cancelStartWaitCharge();
      return;
    }
    if ((meta && meta.droppedStale) || !items || !items.length) {
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
      return;
    }
    writeLocalStudyBundle(items || [], meta && meta.dataGeneration);
    setTimeout(function() {
      if (requestId !== durationMode.loadRequestId) return;
      if (!isDurationQuestionMethod()) {
        clearAllStudyItemsLoadingUi();
        if (holdOverlay) finishPageLoadingAndUnlock();
        return;
      }
      applyDurationItems(items || [], true);
      clearAllStudyItemsLoadingUi();
      if (holdOverlay) finishPageLoadingAndUnlock();
    }, 0);
  });
}

/**
 * 学習日優先：ページ移動（再ソートしない）
 * @param {number} direction -1 | 1
 * @returns {boolean} 移動できたか
 */
function navigateDurationModePage(direction) {
  if (studyEnd.done && studyEnd.durationSession) {
    if (direction > 0) {
      return exitDurationCompletionSessionWithResort();
    }
    return false;
  }
  var pageCount = getDurationModePageCount();
  if (pageCount <= 0) return false;
  var nextPage = durationMode.pageIndex + direction;
  if (nextPage < 0 || nextPage >= pageCount) return false;
  durationMode.pageIndex = nextPage;
  applyDurationModePageToList();
  if (studyEnd.done) {
    maintainCompletionScrollAtBottom();
  }
  return true;
}

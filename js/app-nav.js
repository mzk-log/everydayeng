// 次の問題に進む
function goToNextQuestion() {
  if (isAdvanceNavBlockedByAudio()) return;
  flushPendingAnsSheetPersist();
  clearAudioSourceDebug();
  
  // 現在の問題を完了リストに追加（重複チェック）
  if (questionCursor.completed.indexOf(questionCursor.index) === -1) {
    questionCursor.completed.push(questionCursor.index);
  }
  
  if (retryMode.active) {
    // 再チャレンジモードの場合、その問題をリストから削除
    var indexInRetry = retryMode.indices.indexOf(questionCursor.index);
    if (indexInRetry !== -1) {
      retryMode.indices.splice(indexInRetry, 1);
      // 削除後、現在のインデックスを調整
      if (retryMode.index > indexInRetry) {
        retryMode.index--;
      }
    }
    // 次の再チャレンジ問題があるか確認
    if (retryMode.indices.length > 0) {
      // 次の再チャレンジ問題に進む
      if (retryMode.index < retryMode.indices.length) {
        questionCursor.index = retryMode.indices[retryMode.index];
        displayQuestion();
      } else {
        // retryMode.indexが範囲外だが、再チャレンジ問題が残っている場合は再度再チャレンジを開始
        startRetryQuestions();
      }
    } else {
      // 再チャレンジ問題が全て終わった場合
      retryMode.active = false;
      retryMode.index = 0;
      studyEnd.done = true;
      // 出題数表示を更新（完了済みとして表示）
      updateQuestionInfoDisplay();
      // 学習完了メッセージを表示
      showCompletionMessage();
    }
  } else {
    // 通常モード
    if (questionCursor.index < categoryCatalog.items.length - 1) {
      questionCursor.index++;
      displayQuestion();
    } else {
      // 最後の問題の場合
      if (retryMode.indices.length > 0) {
        // 再チャレンジ問題があれば表示
        startRetryQuestions();
      } else {
        // 再チャレンジ問題がなければ学習完了
        studyEnd.done = true;
        // 出題数表示を更新（完了済みとして表示）
        updateQuestionInfoDisplay();
        // 学習完了メッセージを表示
        showCompletionMessage();
      }
    }
  }
  updateNavigationButtons();
  updatePlusButton();
}

// プラスボタンクリック処理
function handlePlusButtonClick() {
  if (isCategoryTransitionInProgress) return;
  
  // 学習完了時：同じカテゴリを全問で再学習（位置はそのまま）
  if (studyEnd.done) {
    restartCurrentCategoryLearning();
    return;
  }
  
  if (!questionCursor.answerShown) return;
  if (isAdvanceNavBlockedByAudio()) return;
  flushPendingAnsSheetPersist();
  
  // RetryCount を非同期で +1（学習フローは止めない）
  var plusTargetItem = getCurrentLearningItem();
  incrementRetryCountAsync(plusTargetItem);
    
    if (retryMode.active) {
      // 再チャレンジモードの場合
      // 現在の問題を再チャレンジリストに追加（重複チェック）
      if (retryMode.indices.indexOf(questionCursor.index) === -1) {
        retryMode.indices.push(questionCursor.index);
      }
      
      // 完了リストから削除（プラスボタンを押したら黒色通常に戻す）
      var completedIndex = questionCursor.completed.indexOf(questionCursor.index);
      if (completedIndex !== -1) {
        questionCursor.completed.splice(completedIndex, 1);
      }
      
      // 出題数表示を更新
      updateQuestionInfoDisplay();
      
      // 次の再チャレンジ問題に進む
      retryMode.index++;
      if (retryMode.index < retryMode.indices.length) {
        // 次の再チャレンジ問題がある場合
        questionCursor.index = retryMode.indices[retryMode.index];
        displayQuestion();
        updateNavigationButtons();
      } else {
        // 最後の再チャレンジ問題の場合、再チャレンジリストに残っている問題があれば再度再チャレンジを開始
        if (retryMode.indices.length > 0) {
          startRetryQuestions();
        } else {
          // 再チャレンジ問題がなければ学習完了
          studyEnd.done = true;
          updateNavigationButtons();
          updatePlusButton();
          // 学習完了メッセージを表示
          showCompletionMessage();
        }
      }
    } else {
      // 通常モードの場合
      // 現在の問題を再チャレンジリストに追加（重複チェック）
      if (retryMode.indices.indexOf(questionCursor.index) === -1) {
        retryMode.indices.push(questionCursor.index);
      }
      
      // 完了リストから削除（プラスボタンを押したら黒色通常に戻す）
      var completedIndex = questionCursor.completed.indexOf(questionCursor.index);
      if (completedIndex !== -1) {
        questionCursor.completed.splice(completedIndex, 1);
      }
      
      // 出題数表示を更新
      updateQuestionInfoDisplay();
      
      // 次の問題に進む
      if (questionCursor.index < categoryCatalog.items.length - 1) {
        // 最後の問題でない場合、次の問題に進む
        questionCursor.index++;
        displayQuestion();
        updateNavigationButtons();
      } else {
        // 最後の問題の場合、最初に戻って再チャレンジ問題を出題
        startRetryQuestions();
      }
    }
}

/**
 * 学習完了時：現在カテゴリ／学習日優先セッションを再学習開始する
 */
function restartCurrentCategoryLearning() {
  if (!studyEnd.done) {
    return;
  }
  if (isDurationQuestionMethod()) {
    if (!durationMode.sessionItems || durationMode.sessionItems.length === 0) {
      return;
    }
    categoryCatalog.items = durationMode.sessionItems.slice();
    questionList.selected = [];
    studyEnd.categoryNo = null;
    studyEnd.durationSession = false;
    studyEnd.categorySession = false;
    hideCompletionMessage();
    startLearning();
    return;
  }
  if (isLastDateQuestionMethod()) {
    if (!lastDateMode.sessionItems || lastDateMode.sessionItems.length === 0) {
      return;
    }
    categoryCatalog.items = lastDateMode.sessionItems.slice();
    questionList.selected = [];
    studyEnd.categoryNo = null;
    studyEnd.lastDateSession = false;
    studyEnd.categorySession = false;
    hideCompletionMessage();
    startLearning();
    return;
  }
  var targetNo = studyEnd.categoryNo != null ? studyEnd.categoryNo : categoryCatalog.no;
  if (targetNo == null) {
    return;
  }
  loadCategoryDataAndStartLearning(targetNo, true);
}

// 出題数表示を更新する関数
function updateQuestionInfoDisplay() {
  var questionInfo = dom.questionInfo;
  if (!questionInfo) return;
  
  // 元の全問題データを使用（選択されなかった問題も表示するため）
  var totalQuestions = questionList.original.length > 0 ? questionList.original.length : categoryCatalog.items.length;
  var displayItems = [];
  
  // 現在の問題が元のデータのどのインデックスに対応するかを取得
  var originalCurrentIndex = -1;
  if (questionCursor.index >= 0 && questionCursor.index < categoryCatalog.items.length) {
    var currentItem = getCurrentLearningItem() || categoryCatalog.items[questionCursor.index];
    // 元のデータから同じ問題を検索
    for (var idx = 0; idx < questionList.original.length; idx++) {
      if (questionList.original[idx] === currentItem || 
          (questionList.original[idx].no === currentItem.no && 
           questionList.original[idx].question === currentItem.question)) {
        originalCurrentIndex = idx;
        break;
      }
    }
  }
  
  // 選択された問題のインデックスを元のデータのインデックスに変換
  var originalSelectedIndices = [];
  if (questionList.selected.length > 0) {
    originalSelectedIndices = questionList.selected.slice();
  } else {
    // 未選択時は全問が選択されている
    for (var j = 0; j < totalQuestions; j++) {
      originalSelectedIndices.push(j);
    }
  }
  
  // retryMode.indicesを元のデータのインデックスに変換
  var originalRetryIndices = [];
  if (retryMode.indices.length > 0 && questionList.original.length > 0) {
    retryMode.indices.forEach(function(filteredIndex) {
      if (filteredIndex >= 0 && filteredIndex < categoryCatalog.items.length) {
        var retryItem = categoryCatalog.items[filteredIndex];
        // 元のデータから同じ問題を検索
        for (var retryIdx = 0; retryIdx < questionList.original.length; retryIdx++) {
          if (questionList.original[retryIdx] === retryItem || 
              (questionList.original[retryIdx].no === retryItem.no && 
               questionList.original[retryIdx].question === retryItem.question)) {
            originalRetryIndices.push(retryIdx);
            break;
          }
        }
      }
    });
  }
  
  // questionCursor.completedを元のデータのインデックスに変換
  var originalCompletedIndices = [];
  if (questionCursor.completed.length > 0 && questionList.original.length > 0) {
    questionCursor.completed.forEach(function(filteredIndex) {
      if (filteredIndex >= 0 && filteredIndex < categoryCatalog.items.length) {
        var completedItem = categoryCatalog.items[filteredIndex];
        // 元のデータから同じ問題を検索
        for (var completedIdx = 0; completedIdx < questionList.original.length; completedIdx++) {
          if (questionList.original[completedIdx] === completedItem || 
              (questionList.original[completedIdx].no === completedItem.no && 
               questionList.original[completedIdx].question === completedItem.question)) {
            originalCompletedIndices.push(completedIdx);
            break;
          }
        }
      }
    });
  }
  
  for (var i = 0; i < totalQuestions; i++) {
    var questionNum = i + 1;
    var isCurrent = (i === originalCurrentIndex);
    var isCompleted = (originalCompletedIndices.indexOf(i) !== -1);
    var isRetry = (originalRetryIndices.indexOf(i) !== -1);
    var isSelected = (originalSelectedIndices.indexOf(i) !== -1);
    
    if (!isSelected) {
      // 選択されなかった問題：グレー色
      displayItems.push('<span style="color: #999;">' + questionNum + '</span>');
    } else if (isCompleted) {
      // 完了済み（＞ボタンを押した）：灰色通常（最優先）
      displayItems.push('<span style="color: #999;">' + questionNum + '</span>');
    } else if (isCurrent && isRetry) {
      // 再チャレンジ問題を出題中：赤色太字
      displayItems.push('<strong style="color: #f00;">' + questionNum + '</strong>');
    } else if (isCurrent) {
      // 現在出題中：黒色太字
      displayItems.push('<strong style="color: #000;">' + questionNum + '</strong>');
    } else if (isRetry) {
      // 再チャレンジ対象（プラスボタンを押した）：赤色通常
      displayItems.push('<span style="color: #f00;">' + questionNum + '</span>');
    } else {
      // 未出題：黒色通常
      displayItems.push('<span style="color: #000;">' + questionNum + '</span>');
    }
  }
  
  questionInfo.innerHTML = displayItems.join(',');
}

// 再チャレンジ問題開始関数
function startRetryQuestions() {
  if (retryMode.indices.length > 0) {
    retryMode.active = true;
    studyEnd.done = false; // 再チャレンジ開始時は学習完了フラグをリセット
    retryMode.index = 0;
    questionCursor.index = retryMode.indices[0];
    displayQuestion();
    updateNavigationButtons();
    updatePlusButton();
    updateListNavButtons();
    // 学習完了メッセージを非表示
    hideCompletionMessage();
  } else {
    // 再チャレンジ問題がない場合は学習完了
    studyEnd.done = true;
    updateNavigationButtons();
    updatePlusButton();
    // 学習完了メッセージを表示
    showCompletionMessage();
  }
}

// ナビゲーションボタンの状態を更新
function updateNavigationButtons() {
  syncLearningCompletedScreenClass();
  
  // 学習中・完了とも：[Ans再生] [中央] [プラス] [Q再生] [HOME]
  setLearningNavIconsNormal();
  updateNavAnswerButton();
  updateHomeButton();
}

/**
 * 学習完了時の screen2 クラスを同期（完了画面のスクロールバー非表示用）
 */
function syncLearningCompletedScreenClass() {
  var screen2 = dom.screen2;
  if (!screen2) return;
  if (studyEnd.done) {
    screen2.classList.add('is-learning-completed');
  } else {
    screen2.classList.remove('is-learning-completed');
  }
}

/**
 * 中央ナビボタン（Ans / Next）のクリック処理
 */
function handleNavAnswerButtonClick() {
  var navAnswerButton = dom.navAnswerButton;
  if (navAnswerButton && navAnswerButton.disabled) return;
  if (isNavActionLockedByAudio()) return;
  
  if (studyEnd.done) {
    var afterCompletionNavClick = function() {
      if (shouldShowCompletionStartButton()) {
        startLearningFromCompletion();
      } else {
        navigateCompletionCategory(1);
      }
    };
    if (shouldShowCompletionStartButton()) {
      playStartSfxThen(afterCompletionNavClick);
    } else {
      uiSfx.pendingCharge = true;
      if (isCategoryTransitionInProgress) {
        cancelStartWaitCharge();
        return;
      }
      navigateCompletionCategory(1);
    }
    return;
  }
  if (questionCursor.answerShown) {
    if (isAdvanceNavBlockedByAudio()) return;
    if (isLastQuestionInCurrentFlow()) {
      if (navAnswerButton) {
        navAnswerButton.disabled = true;
      }
      stopCurrentAudioPlayback({ skipButtonUpdate: true, keepAudioQueue: false });
      goToNextQuestion();
      return;
    }
    playUiClickSfxThen(goToNextQuestion);
    return;
  }
  playUiClickSfxThen(showAnswer);
}

/**
 * 中央ナビボタンのラベル／有効状態を更新（Ans / Next / End）
 * ストップウォッチ表示は維持する
 */
function updateNavAnswerButton() {
  var navAnswerButton = dom.navAnswerButton;
  var navAnswerText = dom.navAnswerText;
  if (!navAnswerButton || !navAnswerText) return;
  
  if (studyEnd.done) {
    if (shouldShowCompletionStartButton()) {
      navAnswerText.textContent = 'Start';
      navAnswerButton.disabled = isCategoryTransitionInProgress || isNavActionLockedByAudio();
      if (isCategoryTransitionInProgress) {
        navAnswerButton.title = 'カテゴリの切り替え中です';
      } else if (isNavActionLockedByAudio()) {
        navAnswerButton.title = '音声の再生が終わるまでお待ちください';
      } else {
        navAnswerButton.removeAttribute('title');
      }
    } else {
      navAnswerText.textContent = 'Next';
      navAnswerText.classList.remove('blinking');
      var blocked;
      if (isDurationQuestionMethod()) {
        if (studyEnd.durationSession) {
          blocked = isCategoryTransitionInProgress;
        } else {
          var pageCount = getDurationModePageCount();
          blocked = pageCount <= 0 || durationMode.pageIndex >= pageCount - 1 || isCategoryTransitionInProgress;
        }
      } else if (isLastDateQuestionMethod()) {
        blocked = isCategoryTransitionInProgress;
      } else {
        var idx = getCurrentCategoryIndex();
        blocked = (idx < 0 || findSelectableCategoryIndex(idx, 1) < 0) || isCategoryTransitionInProgress;
      }
      navAnswerButton.disabled = blocked || isNavActionLockedByAudio();
      if (isCategoryTransitionInProgress) {
        navAnswerButton.title = 'カテゴリの切り替え中です';
      } else if (isNavActionLockedByAudio()) {
        navAnswerButton.title = '音声の再生が終わるまでお待ちください';
      } else if (blocked) {
        if (isDurationQuestionMethod()) {
          navAnswerButton.title = '次のページがありません';
        } else if (isLastDateQuestionMethod()) {
          navAnswerButton.removeAttribute('title');
        } else {
          navAnswerButton.title = '次のカテゴリがありません';
        }
      } else {
        navAnswerButton.removeAttribute('title');
      }
    }
    return;
  }
  
  if (questionCursor.answerShown) {
    // 最終問は End、それ以外は Next
    navAnswerText.textContent = isLastQuestionInCurrentFlow() ? 'End' : 'Next';
    navAnswerText.classList.remove('blinking');
    if (isAdvanceNavBlockedByAudio()) {
      navAnswerButton.disabled = true;
      navAnswerButton.title = '音声の再生が終わるまでお待ちください';
    } else {
      navAnswerButton.disabled = false;
      navAnswerButton.removeAttribute('title');
    }
    return;
  }
  
  navAnswerText.textContent = 'Ans';
  if (fieldPlay.ansGate || isNavActionLockedByAudio()) {
    navAnswerText.classList.remove('blinking');
    navAnswerButton.disabled = true;
    navAnswerButton.title = '音声の再生が終わるまでお待ちください';
  } else {
    navAnswerText.classList.add('blinking');
    navAnswerButton.disabled = false;
    navAnswerButton.removeAttribute('title');
  }
}

/**
 * 現在フローにおける最終問かどうか（通常／再チャレンジ）
 * @returns {boolean}
 */
function isLastQuestionInCurrentFlow() {
  if (retryMode.active) {
    if (!retryMode.indices || retryMode.indices.length === 0) {
      return true;
    }
    return retryMode.index >= retryMode.indices.length - 1;
  }
  // 通常モード：最終問でも再チャレンジ対象が残っていれば Next 表示
  if (questionCursor.index < categoryCatalog.items.length - 1) {
    return false;
  }
  return retryMode.indices.length === 0;
}

/**
 * 現在カテゴリの categoryCatalog.list 内インデックスを返す
 * @returns {number}
 */
function getCurrentCategoryIndex() {
  if (categoryCatalog.no == null || categoryCatalog.list.length === 0) {
    return -1;
  }
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (categoryCatalog.list[i].no == categoryCatalog.no) {
      return i;
    }
  }
  return -1;
}

/**
 * 学習ナビを通常状態にする（左＝Ans再生、右＝Q再生）
 */
function setLearningNavIconsNormal() {
  var navBar = document.querySelector('.navigation-bar');
  if (navBar) {
    navBar.classList.remove('completion-browse-order');
  }
  updateNavAnswerButton();
}

/**
 * 学習完了時の下ナビ前後は廃止。通常レイアウトのまま中央 Next／Category 下ナビで閲覧する
 */
function setLearningNavIconsCategoryMode() {
  setLearningNavIconsNormal();
  updateFieldPlayButtons();
}

/**
 * 学習完了画面のListセクションを表示
 */
function showCompletionListSection() {
  var section = dom.completionListSection;
  if (section) section.style.display = 'block';
}

/**
 * 学習完了画面のListセクションを非表示
 */
function hideCompletionListSection() {
  var section = dom.completionListSection;
  var message = dom.completionListMessage;
  var container = dom.completionListContainer;
  var selectionCount = dom.completionSelectionCount;
  if (section) section.style.display = 'none';
  if (message) message.style.display = 'none';
  if (container) {
    container.style.display = 'none';
    container.style.minHeight = '';
  }
  if (selectionCount) selectionCount.style.display = 'none';
}

/**
 * 学習完了画面のList操作有効／無効
 * @param {boolean} enabled
 */
function setCompletionListInteractionEnabled(enabled) {
  var container = dom.completionListContainer;
  if (container) {
    container.style.pointerEvents = enabled ? 'auto' : 'none';
  }
  var clearButton = dom.completionClearSelectionButton;
  if (clearButton) {
    clearButton.disabled = !enabled || questionList.selected.length === 0;
  }
}

/**
 * 学習完了画面の中央ボタンを Start 表示にするか
 * @returns {boolean}
 */
function shouldShowCompletionStartButton() {
  if (!studyEnd.done || isCategoryTransitionInProgress) {
    return false;
  }
  if (isDurationQuestionMethod()) {
    // 完了直後（今回学習分表示）＋未選択 → Next（再ソートへ）
    // 選択あり → Start（今回分の選択学習）
    // 再ソート後（セッション表示終了）→ Start（未選択＝表示中ページ全件）
    if (studyEnd.durationSession) {
      return questionList.selected.length > 0;
    }
    return true;
  }
  if (isLastDateQuestionMethod()) {
    // 完了直後（今回学習分表示）＋未選択 → Next（再抽選へ）
    // 選択あり → Start（今回分の選択学習）
    // 再抽選後 → Start（未選択＝表示中7件全件）
    if (studyEnd.lastDateSession) {
      return questionList.selected.length > 0;
    }
    return true;
  }
  if (studyEnd.categoryNo == null || categoryCatalog.no == null) {
    return false;
  }
  if (String(categoryCatalog.no) === String(studyEnd.categoryNo)) {
    return questionList.selected.length > 0;
  }
  return true;
}

/**
 * 学習完了画面：前後カテゴリのListを表示（学習開始しない）
 * @param {number} direction -1: 前, 1: 次
 */
function navigateCompletionCategory(direction) {
  if (!studyEnd.done || isCategoryTransitionInProgress) {
    return;
  }
  // Next / << / >> 操作時はお祝いメッセージを透明化し、出題ブロックを畳んで上端へ
  hideCompletionCongratsMessage();
  revealCompletionBrowseChrome(true);
  ensureCompletionBrowseLayout(function() {
    if (isDurationQuestionMethod()) {
      if (!navigateDurationModePage(direction)) {
        cancelStartWaitCharge();
      }
      return;
    }
    if (isLastDateQuestionMethod()) {
      if (!navigateLastDateModePage(direction)) {
        cancelStartWaitCharge();
      }
      return;
    }
    var select = dom.learningCategorySelect;
    if (!select || !select.value || categoryCatalog.list.length === 0) {
      return;
    }
    var currentIndex = -1;
    for (var i = 0; i < categoryCatalog.list.length; i++) {
      if (String(categoryCatalog.list[i].no) === String(select.value)) {
        currentIndex = i;
        break;
      }
    }
    var targetIndex = findSelectableCategoryIndex(currentIndex, direction);
    if (targetIndex < 0) {
      cancelStartWaitCharge();
      return;
    }
    var targetNo = categoryCatalog.list[targetIndex].no;
    select.value = targetNo;
    syncCustomCategorySelect(select);
    loadCategoryDataForCompletionBrowse(targetNo);
  });
}

/**
 * 学習完了画面：カテゴリデータを取得してList表示（学習開始しない）
 * @param {string|number} categoryNo
 */
function loadCategoryDataForCompletionBrowse(categoryNo) {
  if (!studyEnd.done) {
    return;
  }
  hideCompletionCongratsMessage();
  revealCompletionBrowseChrome(false);
  ensureCompletionBrowseLayout(function() {
    loadCategoryDataForCompletionBrowseInner(categoryNo);
  });
}

/**
 * 学習完了画面：カテゴリデータ取得の本体（レイアウト畳み込み後）
 * @param {string|number} categoryNo
 */
function loadCategoryDataForCompletionBrowseInner(categoryNo) {
  // 閲覧操作後は出題側Listへ（完了直後セッション表示を終了）
  studyEnd.categorySession = false;
  var targetCat = null;
  for (var ti = 0; ti < categoryCatalog.list.length; ti++) {
    if (String(categoryCatalog.list[ti].no) === String(categoryNo)) {
      targetCat = categoryCatalog.list[ti];
      break;
    }
  }
  if (targetCat && isEndCategory(targetCat)) {
    cancelStartWaitCharge();
    return;
  }
  if (!googleAuth.email) {
    googleAuth.email = localStorage.getItem('userEmail');
  }
  if (!googleAuth.email) {
    showError('メールアドレスが設定されていません。');
    checkUserEmail();
    cancelStartWaitCharge();
    return;
  }
  
  var categoryKey = String(categoryNo);
  var learningSelect = dom.learningCategorySelect;
  var listMessage = dom.completionListMessage;
  var listContainer = dom.completionListContainer;
  
  studyEnd.browseRequestId++;
  var requestId = studyEnd.browseRequestId;
  
  maintainCompletionScrollAtBottom();
  
  isCategoryTransitionInProgress = true;
  setLearningCategorySelectDisabled(true);
  setCompletionListInteractionEnabled(false);
  refreshAdvanceNavControls();
  
  var localCached = getItemsForCategoryFromLocal(categoryNo);
  if (localCached && localCached.length > 0) {
    categoryCatalog.byNo[categoryKey] = localCached;
    if (isCategoryShuffleQuestionMethod() && String(categoryCatalog.no) === categoryKey && categoryCatalog.items.length > 0) {
      categoryCatalog.items = mergeCategoryItemsPreserveOrder(categoryCatalog.items, localCached);
        displayList();
        syncCategoryLastDateFromList();
        finishCompletionCategoryBrowse();
      } else {
      applyLoadedCompletionCategoryData(categoryNo, localCached, false);
    }
  } else {
        if (listMessage) {
          listMessage.style.display = 'block';
      listMessage.textContent = '表示できる問題がありません。';
      }
      finishCompletionCategoryBrowse();
  }
  maybeRefreshStudyItemsFromGeneration({
    preserveValue: categoryKey,
    source: 'completionBrowse'
    });
}

/**
 * 学習完了画面：取得済みデータをListへ反映
 * @param {string|number} categoryNo
 * @param {Array} items
 * @param {boolean} keepTransitionLock - true のとき遷移ロックを維持（裏取得待ち）
 */
function applyLoadedCompletionCategoryData(categoryNo, items, keepTransitionLock) {
  maintainCompletionScrollAtBottom();
  
  var source = items || [];
  var categoryKey = String(categoryNo);
  categoryCatalog.byNo[categoryKey] = source;

  if (isCategoryShuffleQuestionMethod()) {
    categoryCatalog.items = shuffleArray(source);
  } else {
    categoryCatalog.items = source;
  }
  categoryCatalog.no = categoryNo;
  questionList.selected = [];
  
  var learningSelect = dom.learningCategorySelect;
  if (learningSelect) {
    learningSelect.value = categoryNo;
    syncCustomCategorySelect(learningSelect);
  }
  
  displayList();
  syncCategoryLastDateFromList();
  
  if (!keepTransitionLock) {
    finishCompletionCategoryBrowse();
  }
}

/**
 * 学習完了画面：カテゴリList参照の読込完了処理
 */
function finishCompletionCategoryBrowse() {
  isCategoryTransitionInProgress = false;
  setLearningCategorySelectDisabled(false);
  setCompletionListInteractionEnabled(true);
  refreshAdvanceNavControls();
  updateListNavButtons();
  maintainCompletionScrollAtBottom();
  tryPlayStartWaitCharge();
}

/**
 * 学習完了画面：表示中カテゴリで学習開始
 */
function startLearningFromCompletion() {
  if (!studyEnd.done || isCategoryTransitionInProgress) {
    return;
  }
  if (!shouldShowCompletionStartButton()) {
    return;
  }
  if (!categoryCatalog.items || categoryCatalog.items.length === 0) {
    showError('データがありません。');
    return;
  }
  hideCompletionListSection();
  studyEnd.categoryNo = null;
  studyEnd.durationSession = false;
  studyEnd.lastDateSession = false;
  studyEnd.categorySession = false;
  startLearning();
}

/**
 * 指定カテゴリのデータを取得し、学習画面のまま学習開始する
 * @param {string|number} categoryNo
 * @param {boolean} [forceAllQuestions=false] - true のとき選択をクリアして全問開始（Plus用）
 */
function loadCategoryDataAndStartLearning(categoryNo, forceAllQuestions) {
  var targetCat = null;
  for (var ti = 0; ti < categoryCatalog.list.length; ti++) {
    if (String(categoryCatalog.list[ti].no) === String(categoryNo)) {
      targetCat = categoryCatalog.list[ti];
      break;
    }
  }
  if (targetCat && isEndCategory(targetCat)) {
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
  
  releaseCurrentAudioElement();
  fieldPlay.field = null;
  
  isCategoryTransitionInProgress = true;
  setLearningCategorySelectDisabled(true);
  setCompletionListInteractionEnabled(false);
  refreshAdvanceNavControls();
  
  var learningSelect = dom.learningCategorySelect;
  if (learningSelect) {
    learningSelect.value = categoryNo;
    syncCustomCategorySelect(learningSelect);
  }
  var homeSelect = dom.categorySelect;
  if (homeSelect && !studyEnd.done) {
    homeSelect.value = categoryNo;
    syncCustomCategorySelect(homeSelect);
  }
  
  var items = getItemsForCategoryFromLocal(categoryNo);
  if (!items.length) {
    showError('データがありません');
    finishCompletionCategoryBrowse();
    return;
  }
  categoryCatalog.byNo[String(categoryNo)] = items;
      if (isCategoryShuffleQuestionMethod()) {
    categoryCatalog.items = shuffleArray(items);
      } else {
    categoryCatalog.items = items;
      }
      categoryCatalog.no = categoryNo;
      if (forceAllQuestions) {
        questionList.selected = [];
      }
      hideCompletionListSection();
      studyEnd.categoryNo = null;
      studyEnd.durationSession = false;
      studyEnd.lastDateSession = false;
      studyEnd.categorySession = false;
      startLearning();
}

// プラスボタンの状態を更新
function updatePlusButton() {
  var plusButton = dom.plusButton;
  if (!plusButton) return;

  var retrySlot = dom.navRetrySlot;
  var badge = plusButton.querySelector('.plus-retry-badge');

  function setRetrySlotInactive(inactive) {
    if (!retrySlot) {
      return;
    }
    retrySlot.classList.toggle('is-inactive', !!inactive);
  }
  
  if (studyEnd.done) {
    plusButton.disabled = isCategoryTransitionInProgress || isNavActionLockedByAudio();
    plusButton.setAttribute('aria-label', '同じカテゴリをもう一度');
    plusButton.title = isCategoryTransitionInProgress ? 'カテゴリの切り替え中です' : '同じカテゴリをもう一度';
    setRetrySlotInactive(plusButton.disabled);
    if (badge) badge.style.display = '';
    return;
  }
  
  if (!questionCursor.answerShown) {
    plusButton.disabled = true;
    plusButton.removeAttribute('title');
    plusButton.setAttribute('aria-label', 'もう一度');
    setRetrySlotInactive(true);
    if (badge) badge.style.display = '';
    return;
  }
  
  if (isAdvanceNavBlockedByAudio() || isNavActionLockedByAudio()) {
    plusButton.disabled = true;
    plusButton.title = '音声の再生が終わるまでお待ちください';
    setRetrySlotInactive(true);
  } else {
    plusButton.disabled = false;
    plusButton.removeAttribute('title');
    setRetrySlotInactive(false);
  }
  plusButton.setAttribute('aria-label', 'もう一度');
  if (badge) badge.style.display = '';
}

/**
 * ページ（window）を上端へスクロール
 * @param {boolean} [smooth]
 */
function scrollPageToTop(smooth) {
  var useSmooth = smooth === true;
  try {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: useSmooth ? 'smooth' : 'auto' });
      return;
    }
  } catch (e) {
    // fall through
  }
  window.scrollTo(0, 0);
  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
  }
}

/**
 * ページ（window）を最下部へスクロール
 */
function scrollPageToBottom() {
  var top = Math.max(
    document.documentElement ? document.documentElement.scrollHeight : 0,
    document.body ? document.body.scrollHeight : 0
  );
  try {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, top);
      return;
    }
  } catch (e) {
    // fall through
  }
  if (document.documentElement) {
    document.documentElement.scrollTop = top;
  }
  if (document.body) {
    document.body.scrollTop = top;
  }
}

/**
 * 学習画面下ナビ＋余白のクリアランス（px）
 * @returns {number}
 */
function getLearningBottomNavClearancePx() {
  var navH = 58;
  try {
    var raw = window.getComputedStyle(document.documentElement)
      .getPropertyValue('--app-nav-height')
      .trim();
    if (raw) {
      var parsed = parseFloat(raw);
      if (!isNaN(parsed) && parsed > 0) {
        navH = parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  // .container.learning-mode の padding-bottom（nav+12）に少し余裕
  return navH + 12 + 8;
}

/**
 * 完了メッセージ全体が固定下ナビの上に見える位置へスクロール
 */
function scrollPageToShowCompletionMessage() {
  var section = dom.completionMessageSection;
  if (!section || section.style.display === 'none') {
    scrollPageToBottom();
    return;
  }
  var clearance = getLearningBottomNavClearancePx();
  var rect = section.getBoundingClientRect();
  var pageY = window.pageYOffset ||
    (document.documentElement ? document.documentElement.scrollTop : 0) ||
    (document.body ? document.body.scrollTop : 0) ||
    0;
  var absoluteBottom = pageY + rect.bottom;
  var target = Math.max(0, absoluteBottom - window.innerHeight + clearance);
  try {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, target);
      return;
    }
  } catch (e) {
    // fall through
  }
  if (document.documentElement) {
    document.documentElement.scrollTop = target;
  }
  if (document.body) {
    document.body.scrollTop = target;
  }
}

/**
 * 学習完了画面：ページを上端に同期固定（カテゴリ切替後用）
 */
function maintainCompletionScrollAtTop() {
  if (!studyEnd.done) {
    return;
  }
  function pin() {
    scrollPageToTop(false);
  }
  pin();
  requestAnimationFrame(function() {
    pin();
    requestAnimationFrame(pin);
  });
}

/**
 * 学習完了画面：ページを最下部に同期固定（初回完了表示用）
 * 出題ブロック畳み後は上端固定に切り替える
 * ※最下部固定ではなく、完了メッセージが下ナビ上に収まる位置へ合わせる
 */
function maintainCompletionScrollAtBottom() {
  if (studyEnd.browseStarted) {
    maintainCompletionScrollAtTop();
    return;
  }
  if (!studyEnd.done) {
    return;
  }
  var completionSection = dom.completionMessageSection;
  if (!completionSection || completionSection.style.display === 'none') {
    return;
  }
  function pin() {
    scrollPageToShowCompletionMessage();
  }
  pin();
  requestAnimationFrame(function() {
    pin();
    requestAnimationFrame(pin);
  });
}

/**
 * 完了画面の出題／解答／note 要素を取得
 * @returns {HTMLElement[]}
 */
function getCompletionStudyFieldElements() {
  var ids = ['questionSection', 'answerSection', 'noteSection'];
  var els = [];
  for (var i = 0; i < ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) {
      els.push(el);
    }
  }
  return els;
}

/**
 * 完了後カテゴリ切替レイアウト：出題ブロックをフェードアウトして非表示にし、上端へスクロール
 * @param {Function} [done]
 * @param {{scrollToTop?: boolean}} [options] - false のとき End 直後。上端へは送らない
 */
function ensureCompletionBrowseLayout(done, options) {
  var after = typeof done === 'function' ? done : function() {};
  options = options || {};
  var scrollToTop = options.scrollToTop !== false;

  if (studyEnd.fieldsTimer !== null) {
    clearTimeout(studyEnd.fieldsTimer);
    studyEnd.fieldsTimer = null;
  }

  if (studyEnd.fieldsCollapsed) {
    if (scrollToTop) {
      studyEnd.browseStarted = true;
      maintainCompletionScrollAtTop();
    }
    after();
    return;
  }

  isCategoryTransitionInProgress = true;
  refreshAdvanceNavControls();

  var els = getCompletionStudyFieldElements();
  var visibleCount = 0;
  for (var i = 0; i < els.length; i++) {
    if (els[i].style.display === 'none') {
      continue;
    }
    visibleCount++;
    els[i].style.opacity = '0';
  }

  function finishCollapse() {
    studyEnd.fieldsTimer = null;
    for (var j = 0; j < els.length; j++) {
      els[j].style.display = 'none';
      els[j].style.opacity = '';
    }
    studyEnd.fieldsCollapsed = true;
    if (scrollToTop) {
      studyEnd.browseStarted = true;
      scrollPageToTop(true);
      maintainCompletionScrollAtTop();
    }
    isCategoryTransitionInProgress = false;
    refreshAdvanceNavControls();
    after();
  }

  if (visibleCount === 0) {
    finishCollapse();
    return;
  }

  studyEnd.fieldsTimer = setTimeout(finishCollapse, COMPLETION_STUDY_FIELDS_FADE_MS);
}

/**
 * 出題／解答／note を学習表示用に復帰（Start／Plus／HOME 時）
 */
function restoreCompletionStudyFields() {
  if (studyEnd.fieldsTimer !== null) {
    clearTimeout(studyEnd.fieldsTimer);
    studyEnd.fieldsTimer = null;
  }
  studyEnd.fieldsCollapsed = false;
  studyEnd.browseStarted = false;
  var questionSection = dom.questionSection;
  var answerSection = dom.answerSection;
  var noteSection = dom.noteSection;
  if (questionSection) {
    questionSection.style.display = '';
    questionSection.style.opacity = '';
  }
  if (answerSection) {
    answerSection.style.display = '';
    answerSection.style.opacity = '';
  }
  if (noteSection) {
    noteSection.style.opacity = '';
    // 表示／非表示は displayQuestion に任せる（畳み込みで none にしたあとでも一旦 none のまま）
    noteSection.style.display = 'none';
  }
}

/**
 * 完了List内の画像読み込み後にもスクロール位置を維持する
 * @param {HTMLElement|null} listContainerEl
 */
function bindCompletionListImagesToKeepScroll(listContainerEl) {
  if (!listContainerEl || !studyEnd.done) {
    return;
  }
  var imgs = listContainerEl.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var img = imgs[i];
    if (img.complete) {
      continue;
    }
    img.addEventListener('load', maintainCompletionScrollAtBottom);
    img.addEventListener('error', maintainCompletionScrollAtBottom);
  }
}

/**
 * 学習完了時：List が見えるようページを最下部までスクロール（初回表示用）
 */
function scrollLearningContentToCompletionView() {
  if (!studyEnd.done) {
    return;
  }
  maintainCompletionScrollAtBottom();
  requestAnimationFrame(function() {
    maintainCompletionScrollAtBottom();
  });
}

/**
 * 学習完了効果音を止める
 */
function stopCompletionSfx() {
  stopStaticSfxList(uiSfx.completion);
  uiSfx.completion = [];
}

/**
 * 学習完了効果音を1回再生する（ボタン効果音の終了後）
 */
function playCompletionSfx() {
  runAfterUiClickSfx(function() {
    playStaticSfx(COMPLETION_SFX_URL, uiSfx.completion, 1);
  });
}

/**
 * 静的効果音の再生を止める
 * @param {HTMLAudioElement[]} list
 */
function stopStaticSfxList(list) {
  if (!list || !list.length) return;
  for (var i = 0; i < list.length; i++) {
    var audio = list[i];
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  }
}

/**
 * 静的mp3を1回再生する（TTSとは別）
 * @param {string} url
 * @param {HTMLAudioElement[]} bucket
 * @param {number} volume
 */
function playStaticSfx(url, bucket, volume) {
  stopStaticSfxList(bucket);
  bucket.length = 0;
  var audio = new Audio(buildStaticSfxUrl(url));
  audio.volume = (typeof volume === 'number') ? volume : 1;
  bucket.push(audio);
  audio.onerror = function() {};
  var playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function() {});
  }
}

/**
 * 静的効果音URL（版クエリ付き。ブラウザキャッシュ対象）
 * @param {string} url
 * @returns {string}
 */
function buildStaticSfxUrl(url) {
  var ver = (typeof window.APP_FRONT_VERSION === 'string' && window.APP_FRONT_VERSION)
    ? window.APP_FRONT_VERSION
    : '';
  return url + (ver ? ('?v=' + ver) : '');
}

function flushUiClickSfxWaiters() {
  var list = uiSfx.clickWaiters;
  uiSfx.clickWaiters = [];
  for (var i = 0; i < list.length; i++) {
    try {
      list[i]();
    } catch (e) {}
  }
}

function runAfterUiClickSfx(fn) {
  if (typeof fn !== 'function') return;
  if (!uiSfx.clickPlaying) {
    fn();
    return;
  }
  uiSfx.clickWaiters.push(fn);
}

/**
 * 効果音 Audio を止める
 * @param {HTMLAudioElement|null} audio
 */
function stopSfxAudioElement_(audio) {
  if (!audio) {
    return;
  }
  audio.onended = null;
  audio.onerror = null;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {}
}

/**
 * ボタン効果音を止める（待ち処理は実行しない）
 */
function stopUiClickSfx() {
  uiSfx.clickPlaying = false;
  uiSfx.clickWaiters = [];
  stopSfxAudioElement_(uiSfx.click);
  stopSfxAudioElement_(uiSfx.start);
  stopSfxAudioElement_(uiSfx.retry);
  stopSfxAudioElement_(uiSfx.charge);
  refreshAudioLockControls_();
}

/**
 * 静的効果音用 Audio を用意する
 * @param {HTMLAudioElement|null} existing
 * @param {string} url
 * @returns {HTMLAudioElement}
 */
function ensureStaticSfxAudio_(existing, url) {
  if (existing) {
    return existing;
  }
  var audio = new Audio(buildStaticSfxUrl(url));
  audio.preload = 'auto';
  audio.volume = UI_CLICK_SFX_VOLUME;
  return audio;
}

/**
 * ボタン効果音用 Audio を用意する（未作成なら生成）
 * @returns {HTMLAudioElement}
 */
function ensureUiClickSfxAudio() {
  uiSfx.click = ensureStaticSfxAudio_(uiSfx.click, UI_CLICK_SFX_URL);
    return uiSfx.click;
  }

/**
 * START効果音用 Audio を用意する（未作成なら生成）
 * @returns {HTMLAudioElement}
 */
function ensureStartSfxAudio() {
  uiSfx.start = ensureStaticSfxAudio_(uiSfx.start, START_SFX_URL);
  return uiSfx.start;
}

function ensureRetrySfxAudio() {
  uiSfx.retry = ensureStaticSfxAudio_(uiSfx.retry, RETRY_SFX_URL);
  return uiSfx.retry;
}

/**
 * 起動時にボタン効果音を先読みする
 */
function preloadUiClickSfx() {
  try {
    ensureUiClickSfxAudio().load();
    ensureStartSfxAudio().load();
    ensureRetrySfxAudio().load();
    ensureChargeSfxAudio().load();
  } catch (e) {}
}

/**
 * 効果音開始を優先し、画面遷移などは次ティックへ回す
 * @param {function(): void} fn
 */
function playUiClickSfxThen(fn) {
  playUiClickSfx();
  if (typeof fn !== 'function') {
    return;
  }
  setTimeout(fn, 0);
}

/**
 * START効果音開始を優先し、画面遷移などは次ティックへ回す
 * @param {function(): void} fn
 */
function playStartSfxThen(fn) {
  playStartSfx();
  if (typeof fn !== 'function') {
    return;
  }
  setTimeout(fn, 0);
}

function playRetrySfxThen(fn) {
  playRetrySfx();
  if (typeof fn !== 'function') {
    return;
  }
  setTimeout(fn, 0);
}

/**
 * 指定 Audio をボタン効果音として再生する
 * @param {HTMLAudioElement} audio
 */
function playButtonSfxAudio_(audio) {
  stopCompletionSfx();
  stopCurrentAudioPlayback({ skipButtonUpdate: true, keepAudioQueue: false });
  uiSfx.clickWaiters = [];
  if (audio !== uiSfx.click) {
    stopSfxAudioElement_(uiSfx.click);
  }
  if (audio !== uiSfx.start) {
    stopSfxAudioElement_(uiSfx.start);
  }
  if (audio !== uiSfx.retry) {
    stopSfxAudioElement_(uiSfx.retry);
  }
  if (audio !== uiSfx.charge) {
    stopSfxAudioElement_(uiSfx.charge);
  }
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {}
  uiSfx.clickPlaying = true;
  refreshAudioLockControls_();
  audio.onended = function() {
    uiSfx.clickPlaying = false;
    flushUiClickSfxWaiters();
    refreshAudioLockControls_();
  };
  audio.onerror = function() {
    uiSfx.clickPlaying = false;
    flushUiClickSfxWaiters();
    refreshAudioLockControls_();
  };
  var playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(function() {
      uiSfx.clickPlaying = false;
      flushUiClickSfxWaiters();
      refreshAudioLockControls_();
    });
  }
}

/**
 * 効果音／本問音声ロックに合わせて START と中央ボタンを更新する
 */
function refreshAudioLockControls_() {
  updateNavAnswerButton();
  updateStartButtonEnabled();
  updatePlusButton();
}

/**
 * Ans / Next / End / 完了画面 Next の効果音
 */
function playUiClickSfx() {
  playButtonSfxAudio_(ensureUiClickSfxAudio());
}

/**
 * トップ START / 学習完了時 Start の効果音
 */
function playStartSfx() {
  playButtonSfxAudio_(ensureStartSfxAudio());
}

function playRetrySfx() {
  playButtonSfxAudio_(ensureRetrySfxAudio());
}

function ensureChargeSfxAudio() {
  uiSfx.charge = ensureStaticSfxAudio_(uiSfx.charge, CHARGE_SFX_URL);
  return uiSfx.charge;
}

function playChargeSfx() {
  playButtonSfxAudio_(ensureChargeSfxAudio());
}

function cancelStartWaitCharge() {
  if (!uiSfx.pendingCharge) {
    return;
  }
  uiSfx.pendingCharge = false;
  playUiClickSfx();
}

function isStartWaitChargeReady_() {
  return studyEnd.done
    && !isCategoryTransitionInProgress
    && shouldShowCompletionStartButton()
    && categoryCatalog.items
    && categoryCatalog.items.length > 0;
}

function tryPlayStartWaitCharge() {
  if (!uiSfx.pendingCharge) {
    return;
  }
  if (isCategoryTransitionInProgress) {
    return;
  }
  if (!isStartWaitChargeReady_()) {
    uiSfx.pendingCharge = false;
    return;
  }
  uiSfx.pendingCharge = false;
  if (!studyEnd.done || !shouldShowCompletionStartButton()) {
    return;
  }
  if (!categoryCatalog.items || categoryCatalog.items.length === 0) {
    return;
  }
  playChargeSfx();
}

/**
 * 完了直後の Category / <<>> を、最初の Next またはドロップダウン操作から出す
 * @param {boolean} showCategorySelect - カテゴリ毎の Next ではドロップダウンを開く
 */
function revealCompletionBrowseChrome(showCategorySelect) {
  studyEnd.browseStarted = true;
  if (isDurationQuestionMethod() || isLastDateQuestionMethod()) {
    hideLearningCategorySelect();
  } else if (showCategorySelect) {
    showLearningCategorySelect();
  }
  updateListNavButtons();
}

/**
 * 完了メッセージを List のあとに出す（フェード完了後）
 */
function presentCompletionCongratsMessage() {
  var completionSection = dom.completionMessageSection;
  var completionMessageText = document.querySelector('#completionMessage .completion-message-text');
  var completionMessageIcon = dom.completionMessageIcon;
  if (!completionSection || !completionMessageText || !completionMessageIcon) {
    return;
  }
  if (studyEnd.iconTimer !== null) {
    clearTimeout(studyEnd.iconTimer);
    studyEnd.iconTimer = null;
  }
  studyEnd.congratsCleared = false;

  var randomMessageIndex = Math.floor(Math.random() * COMPLETION_MESSAGES.length);
  var message = COMPLETION_MESSAGES[randomMessageIndex];
  var randomImageIndex = Math.floor(Math.random() * COMPLETION_MESSAGE_IMAGES.length);
  var imageFileName = COMPLETION_MESSAGE_IMAGES[randomImageIndex];

  completionMessageText.textContent = message;
  completionMessageText.style.color = '';
  completionMessageIcon.src = 'img/msg/' + imageFileName;

  completionSection.style.display = 'block';
  completionMessageIcon.style.visibility = 'hidden';
  completionMessageIcon.style.opacity = '0';
  completionMessageIcon.style.transform = 'scale(0.8)';

  studyEnd.iconTimer = setTimeout(function() {
    studyEnd.iconTimer = null;
    if (!studyEnd.done || studyEnd.congratsCleared) {
      return;
    }
    completionMessageIcon.style.visibility = 'visible';
    requestAnimationFrame(function() {
      completionMessageIcon.style.opacity = '1';
      completionMessageIcon.style.transform = 'scale(1)';
      scrollLearningContentToCompletionView();
    });
  }, 500);
}

function showCompletionMessage() {
  playCompletionSfx();
  updateFieldEditPencils();
  scheduleAudioPrefetch();
  studyEnd.categoryNo = categoryCatalog.no;
  studyEnd.browseStarted = false;

  var completionSection = dom.completionMessageSection;
  if (completionSection) {
    completionSection.style.display = 'none';
  }
  hideLearningCategorySelect();

  if (isDurationQuestionMethod()) {
    studyEnd.categorySession = false;
    questionList.selected = [];
    applyQuestionMethodModeUi();
    showCompletionListSection();
    applyDurationModeSessionToCompletionList();
  } else if (isLastDateQuestionMethod()) {
    studyEnd.categorySession = false;
    questionList.selected = [];
    applyQuestionMethodModeUi();
    showCompletionListSection();
    applyLastDateModeSessionToCompletionList();
  } else {
    if (questionList.original.length > 0) {
      categoryCatalog.items = questionList.original.slice();
      if (!isCategoryShuffleQuestionMethod()) {
        categoryCatalog.byNo[String(categoryCatalog.no)] = categoryCatalog.items.slice();
      }
    }
    questionList.selected = [];
    studyEnd.categorySession = true;
    showCompletionListSection();
    displayList();
    loadCategories({
      preserveValue: categoryCatalog.no,
      quiet: true
    });
  }
  setLearningNavIconsCategoryMode();
  refreshAdvanceNavControls();
  updateListNavButtons();

  ensureCompletionBrowseLayout(function() {
    presentCompletionCongratsMessage();
    scrollLearningContentToCompletionView();
  }, { scrollToTop: false });
}

/**
 * Next / << / >> 時：文言・アイコンを透明にする（文字はそのまま残し領域を維持）
 */
function hideCompletionCongratsMessage() {
  if (studyEnd.iconTimer !== null) {
    clearTimeout(studyEnd.iconTimer);
    studyEnd.iconTimer = null;
  }
  studyEnd.congratsCleared = true;

  var completionMessageText = document.querySelector('#completionMessage .completion-message-text');
  var completionMessageIcon = dom.completionMessageIcon;
  if (completionMessageText) {
    completionMessageText.style.color = 'transparent';
  }
  if (completionMessageIcon) {
    // visibility:hidden だとレイアウトが変わる場合があるため opacity のみ
    completionMessageIcon.style.visibility = 'visible';
    completionMessageIcon.style.opacity = '0';
    completionMessageIcon.style.transform = 'scale(1)';
  }
}

// 学習完了メッセージを非表示（HOME／再学習開始時など、領域ごと閉じる）
function hideCompletionMessage() {
  stopCompletionSfx();
  if (studyEnd.iconTimer !== null) {
    clearTimeout(studyEnd.iconTimer);
    studyEnd.iconTimer = null;
  }
  studyEnd.congratsCleared = false;
  restoreCompletionStudyFields();

  var completionSection = dom.completionMessageSection;
  var completionMessageText = document.querySelector('#completionMessage .completion-message-text');
  var completionMessageIcon = dom.completionMessageIcon;
  if (completionSection) {
    completionSection.style.display = 'none';
  }
  if (completionMessageText) {
    completionMessageText.textContent = '';
    completionMessageText.style.color = '';
  }
  if (completionMessageIcon) {
    completionMessageIcon.src = '';
    completionMessageIcon.style.visibility = '';
    completionMessageIcon.style.opacity = '';
    completionMessageIcon.style.transform = '';
  }
  hideLearningCategorySelect();
  hideCompletionListSection();
}

// ホームに戻る
function goToHome() {
  if (isCategoryTransitionInProgress) return;
  if (isFieldAudioBusy()) return;
  
  // 万一の抜け対策：再生中音声を停止してから遷移する
  flushPendingAnsSheetPersist();
  stopCurrentAudioPlayback();
  cancelStartWaitCharge();
  stopUiClickSfx();
  clearAudioSourceDebug();
  
  // ストップウォッチを停止
  stopStopwatch();
  questionCursor.item = null;
  
  // 完了時カテゴリナビ用アイコンを通常に戻す
  setLearningNavIconsNormal();
  
  // 画面遷移
  var screen2 = dom.screen2;
  var screen1 = dom.screen1;
  if (screen2) screen2.classList.remove('active');
  if (screen1) screen1.classList.add('active');
  
  // トグルボタンの位置を更新（screen1に戻った時）
  requestAnimationFrame(function() {
    requestAnimationFrame(syncAppHeaderHeight);
  });
  
  // コンテナのパディングを元に戻す
  var container = document.querySelector('.container');
  if (container) container.classList.remove('learning-mode');
  
  // 出題画面HOMEは今回学習分を維持。完了後HOMEはカテゴリ全問へ戻す
  var homeFromIncompleteLearning = !studyEnd.done;
  var incompleteSessionItems = homeFromIncompleteLearning ? categoryCatalog.items.slice() : [];
  if (!homeFromIncompleteLearning && questionList.original.length > 0 && !isCrossCategoryQuestionMethod()) {
    categoryCatalog.items = questionList.original.slice();
  } else if (homeFromIncompleteLearning) {
    categoryCatalog.items = incompleteSessionItems;
  }
  questionList.selected = [];
  questionList.original = [];
  
  // 学習完了メッセージを非表示（初期画面List描画前に完了フラグを戻す）
  hideCompletionMessage();
  studyEnd.categoryNo = null;
  studyEnd.durationSession = false;
  studyEnd.lastDateSession = false;
  studyEnd.categorySession = false;
  studyEnd.done = false;
  syncLearningCompletedScreenClass();
  
  if (homeFromIncompleteLearning) {
    applyQuestionMethodModeUi();
    if (isLastDateNormalQuestionMethod()) {
      lastDateMode.needsResort = false;
      if (lastDateMode.allItems.length > 0) {
        regenerateLastDateModeList();
      } else {
        loadLastDateModeData({ regenerate: true, forceFetch: false });
      }
    } else {
      if (isDurationQuestionMethod() && durationMode.sortedItems.length > 0) {
        sortItemsForDurationMode(durationMode.sortedItems);
      }
      if (categoryCatalog.items.length > 0) {
        displayList();
        if (!isCrossCategoryQuestionMethod()) {
          syncCategoryLastDateFromList();
        }
        updateListNavButtons();
      }
    }
  } else if (isDurationQuestionMethod()) {
    applyQuestionMethodModeUi();
    loadDurationModeData({ resetPage: true, resort: true, forceFetch: false });
  } else if (isLastDateQuestionMethod()) {
    applyQuestionMethodModeUi();
    loadLastDateModeData({ regenerate: true, forceFetch: false });
  } else if (categoryCatalog.items.length > 0) {
    // Listを再描画（メモリ上の retry_count / total_study_count / duration / last_date を反映）
    displayList();
    // Listと同一ルールでカテゴリ最終学習日を即時反映（全問埋まり→最新日、空欄あり→-）
    syncCategoryLastDateFromList();
    updateListNavButtons();
  }
  
  // カテゴリ一覧を再取得し、ドロップダウンの最終学習日をシート集計でも更新
  if (!isCrossCategoryQuestionMethod() && categoryCatalog.no != null && categoryCatalog.no !== '') {
    loadCategories({
      preserveValue: categoryCatalog.no,
      quiet: true
    });
  }
  
  updateLearningLockedSideMenuControls();
  ensureAudioPrefetchInventory();
  
  // 学習時間はリセットしない（継続）
}

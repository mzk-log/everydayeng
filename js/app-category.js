/**
 * 端末全問からカテゴリ一覧と今日の A/B を作る
 * @param {Array} items
 * @param {string} todayYmd
 * @returns {{categories: Array, today_ymd: string, today_item_count: number, today_ans_count: number}}
 */
function buildCategoriesAndTodayStatsFromItems(items, todayYmd) {
  var today = todayYmd || getTodayYmdLocal();
  var categoryMap = {};
  var categoriesList = [];
  var todayItemCount = 0;
  var todayAnsCount = 0;
  (items || []).forEach(function(item) {
    if (!item) return;
    var categoryNo = item.category_no != null ? String(item.category_no) : '';
    var categoryName = item.category != null ? String(item.category) : categoryNo;
    if (!categoryNo) return;
    var retryNum = Number(item.retry_count);
    var totalNum = Number(item.total_study_count);
    var dailyNum = Number(item.daily_study_count);
    if (isNaN(retryNum) || retryNum < 0) retryNum = 0;
    if (isNaN(totalNum) || totalNum < 0) totalNum = 0;
    if (isNaN(dailyNum) || dailyNum < 0) dailyNum = 0;
    var lastDateYmd = item.last_date ? String(item.last_date) : '';
    if (lastDateYmd && lastDateYmd.substring(0, 10) === today) {
      todayItemCount += 1;
      todayAnsCount += (dailyNum < 1) ? 1 : dailyNum;
    }
    if (!categoryMap[categoryNo]) {
      categoryMap[categoryNo] = {
        name: categoryName,
        count: 0,
        hasEmptyLastDate: false,
        latestLastDate: '',
        maxRetryCount: retryNum,
        minTotalStudyCount: totalNum
      };
      categoriesList.push({ no: categoryNo });
    } else {
      if (!categoryMap[categoryNo].name && categoryName) {
        categoryMap[categoryNo].name = categoryName;
      }
      if (retryNum > categoryMap[categoryNo].maxRetryCount) {
        categoryMap[categoryNo].maxRetryCount = retryNum;
      }
      if (totalNum < categoryMap[categoryNo].minTotalStudyCount) {
        categoryMap[categoryNo].minTotalStudyCount = totalNum;
      }
    }
    categoryMap[categoryNo].count += 1;
    if (!lastDateYmd) {
      categoryMap[categoryNo].hasEmptyLastDate = true;
    } else if (!categoryMap[categoryNo].hasEmptyLastDate) {
      if (!categoryMap[categoryNo].latestLastDate || lastDateYmd > categoryMap[categoryNo].latestLastDate) {
        categoryMap[categoryNo].latestLastDate = lastDateYmd;
      }
    }
  });
  var out = [];
  for (var i = 0; i < categoriesList.length; i++) {
    var no = categoriesList[i].no;
    var info = categoryMap[no];
    out.push({
      no: no,
      name: info.name,
      count: info.count,
      last_date: info.hasEmptyLastDate ? '' : (info.latestLastDate || ''),
      max_retry_count: info.maxRetryCount,
      min_total_study_count: info.minTotalStudyCount
    });
  }
  return {
    categories: out,
    today_ymd: today,
    today_item_count: todayItemCount,
    today_ans_count: todayAnsCount
  };
}

function getMemoryAllStudyItems() {
  if (localStudy.items && localStudy.items.length) {
    return localStudy.items;
  }
  var bundle = readLocalStudyBundle();
  localStudy.items = (bundle && bundle.items) ? bundle.items : [];
  return localStudy.items;
}

function setMemoryAllStudyItems(items) {
  localStudy.items = items || [];
}

function getItemsForCategoryFromLocal(categoryNo) {
  var key = String(categoryNo);
  return getMemoryAllStudyItems().filter(function(it) {
    return it && String(it.category_no) === key;
  });
}

function rebuildCategoryDataByNoFromItems(items) {
  categoryCatalog.byNo = {};
  (items || []).forEach(function(it) {
    if (!it || it.category_no == null || it.category_no === '') return;
    var key = String(it.category_no);
    if (!categoryCatalog.byNo[key]) {
      categoryCatalog.byNo[key] = [];
    }
    categoryCatalog.byNo[key].push(it);
  });
}

function recountTodayStudyStatsFromLocalItems() {
  var built = buildCategoriesAndTodayStatsFromItems(getMemoryAllStudyItems(), getTodayYmdLocal());
  applyTodayStudiedItemCount(built.today_item_count, built.today_ymd);
  applyTodayStudiedAnsCount(built.today_ans_count, built.today_ymd);
}

/**
 * 端末全問を画面へ反映（カテゴリ一覧・今日件数・List）
 * @param {Array} items
 * @param {{preserveValue?: string, skipLearningArrays?: boolean, isBoot?: boolean}} [options]
 */
function applyStudyItemsToApp(items, options) {
  options = options || {};
  var skipLearningArrays = !!options.skipLearningArrays;
  setMemoryAllStudyItems(items || []);
  rebuildCategoryDataByNoFromItems(items || []);
  var built = buildCategoriesAndTodayStatsFromItems(items || [], getTodayYmdLocal());
  categoryCatalog.list = built.categories;
  categoryCatalog.ready = true;
  applyTodayStudiedItemCount(built.today_item_count, built.today_ymd);
  applyTodayStudiedAnsCount(built.today_ans_count, built.today_ymd);
  reconcileVisibleCategorySetting();

  var select = dom.categorySelect;
  var preserveValue = options.preserveValue != null && options.preserveValue !== ''
    ? String(options.preserveValue)
    : ((select && select.value) || (categoryCatalog.no != null ? String(categoryCatalog.no) : ''));
  if (select) {
    var valueToRestore = preserveValue || '';
    if (valueToRestore && !isCategoryNoVisible(valueToRestore)) {
      valueToRestore = '';
      if (!skipLearningArrays && !isDurationQuestionMethod() && !isLastDateQuestionMethod()) {
        categoryCatalog.no = null;
        categoryCatalog.items = [];
        questionList.selected = [];
        resetListDisplay();
      }
    }
    select.disabled = false;
    populateCategorySelectOptions(select, valueToRestore);
  }
  var learningSelectContainer = dom.learningCategorySelectContainer;
  if (learningSelectContainer && learningSelectContainer.style.display !== 'none' && studyEnd.done) {
    var learningSelectEl = dom.learningCategorySelect;
    var learningValueToRestore = '';
    if (learningSelectEl && learningSelectEl.value) {
      learningValueToRestore = String(learningSelectEl.value);
    } else if (categoryCatalog.no != null && categoryCatalog.no !== '') {
      learningValueToRestore = String(categoryCatalog.no);
    }
    if (learningValueToRestore && !isCategoryNoVisible(learningValueToRestore)) {
      learningValueToRestore = (categoryCatalog.no != null && isCategoryNoVisible(categoryCatalog.no))
        ? String(categoryCatalog.no)
        : '';
    }
    populateCategorySelectOptions(learningSelectEl, learningValueToRestore);
  }

  if (!skipLearningArrays) {
    if (isDurationQuestionMethod()) {
      applyQuestionMethodModeUi();
      durationMode.sortedItems = filterItemsByVisibleCategories((items || []).slice());
      sortItemsForDurationMode(durationMode.sortedItems);
      if (!isActiveLearningSession()) {
        durationMode.pageIndex = 0;
        applyDurationModePageToList();
      }
    } else if (isLastDateQuestionMethod()) {
      applyQuestionMethodModeUi();
      lastDateMode.allItems = filterItemsByVisibleCategories((items || []).slice());
      sortItemsForLastDatePriorityMode(lastDateMode.allItems);
      if (!isActiveLearningSession()) {
        regenerateLastDateModeList();
      }
    } else if (categoryCatalog.no != null && categoryCatalog.no !== '') {
      var catItems = getItemsForCategoryFromLocal(categoryCatalog.no);
      if (isCategoryShuffleQuestionMethod() && categoryCatalog.items.length > 0) {
        categoryCatalog.items = mergeCategoryItemsPreserveOrder(categoryCatalog.items, catItems);
        displayList();
        syncCategoryLastDateFromList();
        updateListNavButtons();
        updateStartButtonEnabled();
      } else {
        applyLoadedCategoryData(categoryCatalog.no, catItems);
      }
    }
  } else if (studyEnd.done && categoryCatalog.no != null && categoryCatalog.no !== '') {
    var listItems = getItemsForCategoryFromLocal(categoryCatalog.no);
    categoryCatalog.items = mergeCategoryItemsPreserveOrder(categoryCatalog.items, listItems);
    displayList();
    syncCategoryLastDateFromList();
  }

  hideCategoryLoadingSpinner();
  updateListNavButtons();
  if (studyEnd.done) {
    if (studyEnd.browseStarted) {
      maintainCompletionScrollAtTop();
    } else {
      maintainCompletionScrollAtBottom();
    }
  }
  syncDailyStudyStatsDisplay();
  lastEffectiveVisibleCategoriesKey = getEffectiveVisibleCategoriesKey();
}

/**
 * 裏で世代だけ確認し、違えば全問1本で差し替える
 * @param {{preserveValue?: string, source?: string}} [options]
 */
function maybeRefreshStudyItemsFromGeneration(options) {
  options = options || {};
  if (dataGenerationCheckInFlight) {
    return;
  }
  dataGenerationCheckInFlight = true;
  fetchDataGeneration(function(err, gen) {
    dataGenerationCheckInFlight = false;
    if (err) {
      if (isGoogleAuthFailureMessage(String(err.message || err))) {
        showError(String(err.message || err));
      }
      return;
    }
    var local = readLocalStudyBundle();
    if (hasCompleteLocalStudyData(local) && Number(local.dataGeneration) === Number(gen)) {
      return;
    }
    fetchAllStudyItemsFromServer(function(fetchErr, items, meta) {
      if (fetchErr) {
        if (isGoogleAuthFailureMessage(String(fetchErr.message || fetchErr))) {
          showError(String(fetchErr.message || fetchErr));
        }
        return;
      }
      if ((meta && meta.droppedStale) || !items || !items.length) {
        return;
      }
      var nextGen = (meta && meta.dataGeneration != null) ? meta.dataGeneration : gen;
      writeLocalStudyBundle(items || [], nextGen);
      applyStudyItemsToApp(items || [], {
        preserveValue: options.preserveValue,
        skipLearningArrays: isActiveLearningSession()
      });
    });
  });
}

function fetchDataGeneration(onDone) {
  var params = new URLSearchParams();
  params.append('action', 'getDataGeneration');
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params)
    .then(function(data) {
      if (!data || !data.success) {
        throw new Error((data && data.error) || '世代の取得に失敗しました');
      }
      if (typeof onDone === 'function') {
        onDone(null, data.dataGeneration);
      }
    })
    .catch(function(error) {
      if (typeof onDone === 'function') {
        onDone(error, null);
      }
    });
}

// カテゴリ一覧を読み込む（端末全問から。通信は世代確認のみ）
// options.preserveValue: 再取得後に選択を復元する値
// options.quiet: 読み込み中表示を出さず、裏で更新する（HOME復帰時など）
function loadCategories(options) {
  options = options || {};
  var preserveValue = options.preserveValue != null && options.preserveValue !== ''
    ? String(options.preserveValue)
    : null;
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
  var items = getMemoryAllStudyItems();
  if (items.length) {
    applyStudyItemsToApp(items, {
      preserveValue: preserveValue,
      skipLearningArrays: isActiveLearningSession() || !!options.quiet
    });
    hideCategoryLoadingSpinner();
    if (!options.quiet && hasUsableAuth() && !isPageLoadingVisible()) {
        setAppAuthUiLocked(false);
      }
  }
  maybeRefreshStudyItemsFromGeneration({
    preserveValue: preserveValue,
    source: options.quiet ? 'home' : 'loadCategories'
    });
}

/**
 * カテゴリ名が END（選択不可の区切り）か
 * @param {Object} cat
 * @returns {boolean}
 */
function isEndCategory(cat) {
  if (!cat || cat.name == null) {
    return false;
  }
  return String(cat.name).trim() === 'END';
}

/**
 * 表示カテゴリ設定の localStorage キー（メール単位）
 * @returns {string}
 */
function getVisibleCategoriesStorageKey() {
  var email = googleAuth.email || '';
  try {
    if (!email) {
      email = localStorage.getItem('userEmail') || '';
    }
  } catch (e) {
    email = '';
  }
  return 'visibleCategoryNos:' + String(email);
}

/**
 * 保存済みの表示カテゴリ番号配列を取得
 * @returns {string[]|null} 未設定時は null
 */
function getSavedVisibleCategoryNos() {
  try {
    var raw = localStorage.getItem(getVisibleCategoriesStorageKey());
    if (raw == null || raw === '') {
      return null;
    }
    var parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    return parsed.map(function(no) {
      return String(no);
    });
  } catch (e) {
    return null;
  }
}

/**
 * 表示カテゴリ設定を保存
 * @param {string[]} nos
 */
function saveVisibleCategoryNos(nos) {
  try {
    localStorage.setItem(
      getVisibleCategoriesStorageKey(),
      JSON.stringify((nos || []).map(function(no) {
        return String(no);
      }))
    );
    scheduleUserSettingsSync();
  } catch (e) {
    console.warn('表示カテゴリ設定の保存に失敗しました。');
  }
}

/**
 * 表示カテゴリ設定を削除（未設定＝全表示）
 */
function clearVisibleCategorySetting() {
  try {
    localStorage.removeItem(getVisibleCategoriesStorageKey());
    scheduleUserSettingsSync();
  } catch (e) {
    // ignore
  }
}

/**
 * Category_No でカテゴリを探す
 * @param {string|number} no
 * @returns {Object|null}
 */
function findCategoryByNo(no) {
  if (no == null || no === '' || !categoryCatalog.list || !categoryCatalog.list.length) {
    return null;
  }
  var key = String(no);
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (String(categoryCatalog.list[i].no) === key) {
      return categoryCatalog.list[i];
    }
  }
  return null;
}

/**
 * END 以外の設定対象カテゴリ（シート順＝Category_No 昇順）
 * @returns {Object[]}
 */
function getConfigurableCategories() {
  var list = (categoryCatalog.list || []).filter(function(cat) {
    return cat && !isEndCategory(cat);
  });
  list.sort(function(a, b) {
    return getCategoryNoSortValue(a.no) - getCategoryNoSortValue(b.no);
  });
  return list;
}

/**
 * 表示カテゴリの「希望」（localStorage）。IdB 完了は見ない
 * @param {string|number} no
 * @returns {boolean}
 */
function isCategoryNoInVisiblePreference(no) {
  if (no == null || no === '') {
    return false;
  }
  var cat = findCategoryByNo(no);
  if (cat && isEndCategory(cat)) {
    return false;
  }
  var saved = getSavedVisibleCategoryNos();
  if (saved === null) {
    // 未設定：END 以外は希望ON。カテゴリ一覧に無い番号は表示扱い（横断データの欠落対策）
    return !(cat && isEndCategory(cat));
  }
  return saved.indexOf(String(no)) >= 0;
}

/**
 * IdB 進捗が未完了か（target>0 かつ ready<source）
 * @param {{ready: number, target: number}|null|undefined} progress
 * @returns {boolean}
 */
function isCategoryIdbProgressIncomplete(progress) {
  return !!(progress && progress.target && progress.ready < progress.target);
}

/**
 * この端末でカテゴリ音声が IdB 完了しているか。
 * 一覧未取得時は true（起動直後に全部消えないようにする）
 * @param {string|number} no
 * @returns {boolean}
 */
function isCategoryIdbReadyForVisible(no) {
  if (!audioStock || !audioStock.idbInventoryReady) {
    return true;
  }
  if (typeof buildCategoryIdbProgressMap !== 'function') {
    return true;
  }
  var progress = buildCategoryIdbProgressMap()[String(no)];
  return !isCategoryIdbProgressIncomplete(progress);
}

/**
 * カテゴリ番号が表示対象か（希望ON。END は常に false）。
 * IdB 未完了でも一覧には出す（Start 前準備で埋める）
 * @param {string|number} no
 * @returns {boolean}
 */
function isCategoryNoVisible(no) {
  return isCategoryNoInVisiblePreference(no);
}

/**
 * ドロップダウン／ナビ用の表示カテゴリ一覧（希望ON）
 * @returns {Object[]}
 */
function getVisibleCategories() {
  return getConfigurableCategories().filter(function(cat) {
    return isCategoryNoVisible(cat.no);
  });
}

/**
 * 選択可能なカテゴリか（表示対象かつ END でない）
 * @param {Object} cat
 * @returns {boolean}
 */
function isCategorySelectable(cat) {
  return !!(cat && !isEndCategory(cat) && isCategoryNoVisible(cat.no));
}

/**
 * 保存済み希望をシート上のカテゴリと突合。有効 0 件なら未設定に戻す。
 * カテゴリ未反映時や IdB 完了状況では呼ばない／判定に使わない。
 * @returns {boolean} 未設定へリセットした場合 true
 */
function reconcileVisibleCategorySetting() {
  if (!categoryCatalog.ready) {
    return false;
  }
  var saved = getSavedVisibleCategoryNos();
  if (saved === null) {
    return false;
  }
  var configurable = getConfigurableCategories();
  var validSet = {};
  configurable.forEach(function(cat) {
    validSet[String(cat.no)] = true;
  });
  var valid = saved.filter(function(no) {
    return !!validSet[String(no)];
  });
  if (valid.length === 0) {
    clearVisibleCategorySetting();
    showError('表示できるカテゴリがありません。設定をリセットしました。');
    return true;
  }
  if (valid.length !== saved.length) {
    saveVisibleCategoryNos(valid);
  }
  return false;
}

/**
 * 横断モード用：表示カテゴリに属する問題だけ残す
 * @param {Array} items
 * @returns {Array}
 */
function filterItemsByVisibleCategories(items) {
  return (items || []).filter(function(it) {
    return it && isCategoryNoVisible(it.category_no);
  });
}

/**
 * HOME（初期画面）表示中か
 * @returns {boolean}
 */
function isHomeScreenActive() {
  var screen1 = dom.screen1;
  return !!(screen1 && screen1.classList.contains('active'));
}

/**
 * 表示カテゴリの全画面パネルを閉じる（未保存は破棄）
 */
function closeVisibleCategoriesOverlay() {
  var overlay = dom.visibleCategoriesOverlay;
  if (overlay) {
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
  }
  hideVisibleCategoriesError();
}

/**
 * 互換名（閉じる処理）
 */
function closeVisibleCategoriesSubmenu() {
  closeVisibleCategoriesOverlay();
}

/**
 * 表示カテゴリの全画面パネルが開いているか
 * @returns {boolean}
 */
function isVisibleCategoriesOverlayOpen() {
  var overlay = dom.visibleCategoriesOverlay;
  return !!(overlay && overlay.style.display !== 'none');
}

/**
 * 表示カテゴリエラー文言を隠す
 */
function hideVisibleCategoriesError() {
  var el = dom.visibleCategoriesError;
  if (el) {
    el.style.display = 'none';
    el.textContent = '';
  }
}

/**
 * 表示カテゴリエラー文言を表示
 * @param {string} message
 */
function showVisibleCategoriesError(message) {
  var el = dom.visibleCategoriesError;
  if (el) {
    el.textContent = message || '';
    el.style.display = message ? 'block' : 'none';
  }
}

/**
 * 未完了のときだけ付ける IdB 表示文言
 * @param {{ready: number, target: number}|null|undefined} progress
 * @returns {string}
 */
function formatVisibleCategoryIdbSuffix(progress) {
  if (!isCategoryIdbProgressIncomplete(progress)) {
    return '';
  }
  return ' IdB ' + progress.ready + '/' + progress.target;
}

/**
 * 表示カテゴリ1行の IdB ラベルを同期（未完了でも選択可。Start 前準備で埋める）
 * @param {HTMLInputElement} input
 * @param {HTMLElement} idbEl
 * @param {string} catNo
 * @param {{ready: number, target: number}|null|undefined} progress
 */
function syncVisibleCategoryRowIdbState(input, idbEl, catNo, progress) {
  if (!idbEl) {
    return;
  }
  var incomplete = isCategoryIdbProgressIncomplete(progress);
  idbEl.textContent = formatVisibleCategoryIdbSuffix(progress);
  var label = input && (input.closest ? input.closest('label') : input.parentNode);
  if (label && label.classList) {
    label.classList.toggle('is-idb-incomplete', incomplete);
  }
  if (input) {
    input.disabled = false;
  }
}

/**
 * 表示カテゴリ一覧の IdB ラベルと選択可否を更新する
 */
function updateVisibleCategoriesIdbLabels() {
  if (!isVisibleCategoriesOverlayOpen()) {
    return;
  }
  var container = dom.visibleCategoriesChecklist;
  if (!container || typeof buildCategoryIdbProgressMap !== 'function') {
    return;
  }
  var map = buildCategoryIdbProgressMap();
  var nodes = container.querySelectorAll('.visible-categories-check-idb');
  for (var i = 0; i < nodes.length; i++) {
    var el = nodes[i];
    var no = el.getAttribute('data-category-no');
    var label = el.closest ? el.closest('label') : el.parentNode && el.parentNode.parentNode;
    var input = label ? label.querySelector('input[type="checkbox"]') : null;
    syncVisibleCategoryRowIdbState(input, el, no, map[String(no)]);
  }
  updateVisibleCategoriesCount();
}

var lastEffectiveVisibleCategoriesKey = null;
var refreshingVisibleCategoriesRuntimeUi = false;

/**
 * 実行時表示対象の指紋（Category_No をカンマ連結）
 * @returns {string}
 */
function getEffectiveVisibleCategoriesKey() {
  return getVisibleCategories().map(function(cat) {
    return String(cat.no);
  }).join(',');
}

/**
 * 実行時の表示対象（希望∩IdB完了）に合わせて TOP／横断 UI を更新する。
 * 希望設定のシート突合（reconcile）は行わない。
 */
function refreshVisibleCategoriesRuntimeUi() {
  if (refreshingVisibleCategoriesRuntimeUi) {
    return;
  }
  refreshingVisibleCategoriesRuntimeUi = true;
  try {
    var select = dom.categorySelect;
    var previousValue = select ? select.value : '';
    var stillVisible = previousValue && isCategoryNoVisible(previousValue);

    if (select) {
      populateCategorySelectOptions(select, stillVisible ? previousValue : '');
    }

    if (previousValue && !stillVisible) {
      categoryCatalog.no = null;
      categoryCatalog.items = [];
      questionList.selected = [];
      questionList.original = [];
      hideCategoryLoadingSpinner();
      if (!isDurationQuestionMethod() && !isLastDateQuestionMethod()) {
        resetListDisplay();
      }
    }

    if (isDurationQuestionMethod()) {
      loadDurationModeData({ resetPage: true, resort: true, forceFetch: true, pageLoading: true });
    } else if (isLastDateQuestionMethod()) {
      loadLastDateModeData({ regenerate: true, forceFetch: true, pageLoading: true });
    } else {
      updateListNavButtons();
    }
    syncDailyStudyStatsDisplay();
    lastEffectiveVisibleCategoriesKey = getEffectiveVisibleCategoriesKey();
    // 先読み対象集合は変わらないが、優先（表示カテゴリ希望ON）を組み直す
    if (typeof scheduleAudioPrefetch === 'function') {
      scheduleAudioPrefetch();
    }
  } finally {
    refreshingVisibleCategoriesRuntimeUi = false;
  }
}

/**
 * IdB 集計更新後：パネルの選択可否を更新し、実行時表示が変わったら HOME UI だけ同期する。
 * 希望設定のリセット（reconcile）はしない。
 */
function syncVisibleCategoriesAfterIdbChange() {
  updateVisibleCategoriesIdbLabels();
  if (!isHomeScreenActive() || !categoryCatalog.ready) {
    return;
  }
  if (getEffectiveVisibleCategoriesKey() === lastEffectiveVisibleCategoriesKey) {
    return;
  }
  refreshVisibleCategoriesRuntimeUi();
}

/**
 * チェックリストを現在の保存状態（未設定＝全ON）で描画。IdB未完了は選択不可
 */
function renderVisibleCategoriesChecklist() {
  var container = dom.visibleCategoriesChecklist;
  if (!container) {
    return;
  }
  hideVisibleCategoriesError();
  container.innerHTML = '';
  var list = getConfigurableCategories();
  if (list.length === 0) {
    container.innerHTML = '<div class="visible-categories-check-item">カテゴリがありません</div>';
    updateVisibleCategoriesCount();
    return;
  }
  var idbMap = (typeof buildCategoryIdbProgressMap === 'function')
    ? buildCategoryIdbProgressMap()
    : {};
  list.forEach(function(cat) {
    var catNo = String(cat.no);
    var progress = idbMap[catNo];
    var incomplete = isCategoryIdbProgressIncomplete(progress);
    var label = document.createElement('label');
    label.className = 'visible-categories-check-item';
    if (incomplete) {
      label.classList.add('is-idb-incomplete');
    }
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.value = catNo;
    input.checked = isCategoryNoInVisiblePreference(cat.no);
    input.addEventListener('change', function() {
      updateVisibleCategoriesCount();
    });
    var text = document.createElement('span');
    text.className = 'visible-categories-check-text';
    var main = document.createElement('span');
    main.className = 'visible-categories-check-main';
    main.textContent = formatCategoryOptionText(cat);
    var idb = document.createElement('span');
    idb.className = 'visible-categories-check-idb';
    idb.setAttribute('data-category-no', catNo);
    idb.textContent = formatVisibleCategoryIdbSuffix(progress);
    text.appendChild(main);
    text.appendChild(idb);
    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  });
  updateVisibleCategoriesCount();
}

/**
 * 表示カテゴリの選択件数（選択 / 全件）を更新
 */
function updateVisibleCategoriesCount() {
  var countEl = dom.visibleCategoriesCount;
  var container = dom.visibleCategoriesChecklist;
  if (!countEl) {
    return;
  }
  if (!container) {
    countEl.textContent = '0 / 0';
    return;
  }
  var inputs = container.querySelectorAll('input[type="checkbox"]');
  var total = inputs.length;
  var selected = 0;
  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].checked) {
      selected++;
    }
  }
  countEl.textContent = selected + ' / ' + total;
}

/**
 * チェックリストから選択中番号を取得
 * @returns {string[]}
 */
function getCheckedVisibleCategoryNosFromUi() {
  var container = dom.visibleCategoriesChecklist;
  if (!container) {
    return [];
  }
  var nos = [];
  var inputs = container.querySelectorAll('input[type="checkbox"]');
  for (var i = 0; i < inputs.length; i++) {
    if (inputs[i].checked) {
      nos.push(String(inputs[i].value));
    }
  }
  return nos;
}

/**
 * チェックリストの全選択／全解除
 * @param {boolean} checked
 */
function setAllVisibleCategoryChecks(checked) {
  var container = dom.visibleCategoriesChecklist;
  if (!container) {
    return;
  }
  hideVisibleCategoriesError();
  var inputs = container.querySelectorAll('input[type="checkbox"]');
  for (var i = 0; i < inputs.length; i++) {
    inputs[i].checked = !!checked;
  }
  updateVisibleCategoriesCount();
}

/**
 * 表示カテゴリの全画面パネルを開く（HOME 時のみ）
 */
function openVisibleCategoriesOverlay() {
  if (!isHomeScreenActive()) {
    return;
  }
  closeSideMenu();
  renderVisibleCategoriesChecklist();
  var overlay = dom.visibleCategoriesOverlay;
  if (overlay) {
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }
  if (typeof refreshAudioIdbStats === 'function') {
    refreshAudioIdbStats();
  }
}

/**
 * 互換名（開閉。開いていれば閉じ、閉じていれば開く）
 */
function toggleVisibleCategoriesSubmenu() {
  if (isVisibleCategoriesOverlayOpen()) {
    closeVisibleCategoriesOverlay();
    return;
  }
  openVisibleCategoriesOverlay();
}

/**
 * 表示カテゴリの希望変更・全問反映後の反映（シート突合＋実行時 UI）
 */
function applyVisibleCategoriesChange() {
  reconcileVisibleCategorySetting();
  refreshVisibleCategoriesRuntimeUi();
}

/**
 * 表示カテゴリ設定を保存ボタン処理
 */
function saveVisibleCategoriesFromUi() {
  var checked = getCheckedVisibleCategoryNosFromUi();
  if (checked.length === 0) {
    showVisibleCategoriesError('一つ以上選択してください。');
    return;
  }
  saveVisibleCategoryNos(checked);
  hideVisibleCategoriesError();
  applyVisibleCategoriesChange();
  closeVisibleCategoriesOverlay();
}

/**
 * 指定インデックスから前後方向に、選択可能なカテゴリのインデックスを探す
 * @param {number} fromIndex
 * @param {number} direction -1=前 / 1=次
 * @returns {number} 見つからなければ -1
 */
function findSelectableCategoryIndex(fromIndex, direction) {
  if (!categoryCatalog.list || categoryCatalog.list.length === 0) {
    return -1;
  }
  var i = fromIndex + direction;
  while (i >= 0 && i < categoryCatalog.list.length) {
    if (isCategorySelectable(categoryCatalog.list[i])) {
      return i;
    }
    i += direction;
  }
  return -1;
}

/**
 * カテゴリselectへ option を設定する（初期画面／学習完了時で共用）
 * @param {HTMLSelectElement} select
 * @param {string|number|null} selectedValue
 */
function populateCategorySelectOptions(select, selectedValue) {
  if (!select) return;
  
  select.innerHTML = '<option value="">Categoryを選択してください</option>';
  getVisibleCategories().forEach(function(cat) {
    var option = document.createElement('option');
    option.value = cat.no;
    option.textContent = formatCategoryOptionText(cat);
    select.appendChild(option);
  });
  
  if (selectedValue != null && selectedValue !== '' && isCategoryNoVisible(selectedValue)) {
    select.value = String(selectedValue);
  } else {
    select.value = '';
  }
  
  syncCustomCategorySelect(select);
}

/**
 * ネイティブselect用のカスタムUIを用意（全文折り返し表示）
 * @param {HTMLSelectElement} select
 */
function ensureCustomCategorySelect(select) {
  if (!select || select.dataset.customSelectReady === '1') {
    return;
  }
  var container = select.closest('.select-container');
  if (!container) {
    return;
  }
  
  select.classList.add('native-category-select-hidden');
  
  var custom = document.createElement('div');
  custom.className = 'custom-category-select';
  custom.setAttribute('data-for-select', select.id || '');
  
  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-category-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  
  var panel = document.createElement('div');
  panel.className = 'custom-category-select-panel';
  panel.setAttribute('role', 'listbox');
  
  custom.appendChild(trigger);
  custom.appendChild(panel);
  if (select.nextSibling) {
    container.insertBefore(custom, select.nextSibling);
  } else {
    container.appendChild(custom);
  }
  
  trigger.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (select.disabled || trigger.disabled) {
      return;
    }
    var willOpen = !custom.classList.contains('is-open');
    closeAllCustomCategorySelects();
    if (willOpen) {
      custom.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      // レイアウト確定後に選択中項目へスクロール（未選択時は先頭のまま）
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          scrollCustomCategorySelectToSelected(custom);
        });
      });
    }
  });
  
  select.dataset.customSelectReady = '1';
}

/**
 * カスタムカテゴリパネルを選択中オプションが見える位置へスクロール
 * 未選択（空value）のときは先頭のまま
 * @param {HTMLElement} custom
 */
function scrollCustomCategorySelectToSelected(custom) {
  if (!custom) return;
  var panel = custom.querySelector('.custom-category-select-panel');
  if (!panel) return;
  
  var selected = panel.querySelector('.custom-category-select-option.is-selected');
  if (!selected) return;
  
  var selectedValue = selected.getAttribute('data-value');
  if (!selectedValue) return; // プレースホルダ（未選択）は先頭のまま
  
  try {
    selected.scrollIntoView({ block: 'center', inline: 'nearest' });
  } catch (e) {
    // 古い環境向けフォールバック
    var panelTop = panel.scrollTop;
    var optionTop = selected.offsetTop;
    var optionBottom = optionTop + selected.offsetHeight;
    var viewBottom = panelTop + panel.clientHeight;
    if (optionTop < panelTop) {
      panel.scrollTop = optionTop;
    } else if (optionBottom > viewBottom) {
      panel.scrollTop = optionBottom - panel.clientHeight;
    }
  }
}

/**
 * 開いているカスタムカテゴリselectをすべて閉じる
 */
function closeAllCustomCategorySelects() {
  var opens = document.querySelectorAll('.custom-category-select.is-open');
  for (var i = 0; i < opens.length; i++) {
    opens[i].classList.remove('is-open');
    var trig = opens[i].querySelector('.custom-category-select-trigger');
    if (trig) {
      trig.setAttribute('aria-expanded', 'false');
    }
  }
}

/**
 * ネイティブselectの内容をカスタムUIへ同期
 * @param {HTMLSelectElement} select
 */
function syncCustomCategorySelect(select) {
  if (!select) return;
  ensureCustomCategorySelect(select);
  var container = select.closest('.select-container');
  if (!container) return;
  var custom = container.querySelector('.custom-category-select');
  if (!custom) return;
  var trigger = custom.querySelector('.custom-category-select-trigger');
  var panel = custom.querySelector('.custom-category-select-panel');
  if (!trigger || !panel) return;
  
  trigger.disabled = !!select.disabled;
  panel.innerHTML = '';
  
  var selectedLabel = 'Categoryを選択してください';
  for (var i = 0; i < select.options.length; i++) {
    var opt = select.options[i];
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'custom-category-select-option';
    btn.textContent = opt.textContent;
    btn.setAttribute('data-value', opt.value);
    btn.setAttribute('role', 'option');
    
    if (opt.disabled) {
      btn.disabled = true;
      btn.classList.add('is-disabled');
    }
    if (opt.selected || String(opt.value) === String(select.value)) {
      btn.classList.add('is-selected');
      btn.setAttribute('aria-selected', 'true');
      selectedLabel = opt.textContent || selectedLabel;
    } else {
      btn.setAttribute('aria-selected', 'false');
    }
    
    (function(optionValue, isDisabled) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isDisabled) {
          return;
        }
        if (String(select.value) !== String(optionValue)) {
          select.value = optionValue;
          var changeEvent = new Event('change', { bubbles: true });
          select.dispatchEvent(changeEvent);
        }
        closeAllCustomCategorySelects();
        syncCustomCategorySelect(select);
      });
    })(opt.value, opt.disabled);
    
    panel.appendChild(btn);
  }
  
  trigger.textContent = selectedLabel;
}

/**
 * 学習完了時：Categoryドロップダウンを表示（Listは出さない）
 */
function showLearningCategorySelect() {
  var currentCategory = dom.currentCategory;
  var container = dom.learningCategorySelectContainer;
  var learningSelect = dom.learningCategorySelect;
  
  if (currentCategory) {
    currentCategory.classList.add('is-hidden');
    currentCategory.style.display = 'none';
  }
  if (container) {
    container.style.display = 'block';
  }
  populateCategorySelectOptions(learningSelect, categoryCatalog.no);
}

/**
 * 学習中表示に戻す（ドロップダウンを隠す）
 */
function hideLearningCategorySelect() {
  var currentCategory = dom.currentCategory;
  var container = dom.learningCategorySelectContainer;
  var learningSelect = dom.learningCategorySelect;
  
  if (currentCategory) {
    currentCategory.classList.remove('is-hidden');
    currentCategory.style.display = '';
  }
  if (container) {
    container.style.display = 'none';
  }
  if (learningSelect) {
    learningSelect.value = '';
  }
  setListNavContainerVisible('screen2ListNavContainer', false);
  // 完了UIを閉じるときは領域も解放（高さ予約を残さない）
  var screen2Nav = dom.screen2ListNavContainer;
  if (screen2Nav) {
    screen2Nav.style.display = 'none';
  }
  var learningListPrevButton = dom.learningListPrevButton;
  var learningListNextButton = dom.learningListNextButton;
  if (learningListPrevButton) {
    learningListPrevButton.disabled = true;
  }
  if (learningListNextButton) {
    learningListNextButton.disabled = true;
  }
  updateCategoryNavIndicatorElement(dom.learningCategoryNavInfo, null);
}

/**
 * カテゴリドロップダウン用の表示文言を生成
 * 例）[1] 名前（5問）：2026/8/1 （3/1回） ／ 空欄ありは（5問）：-（回数なし）
 * @param {Object} cat
 * @returns {string}
 */
function formatCategoryOptionText(cat) {
  // ENDは区切り表示のみ（番号・問数・日付・回数なし）
  if (isEndCategory(cat)) {
    return 'END';
  }
  var displayText = '[' + cat.no + '] ' + cat.name;
  if (cat.count !== undefined && cat.count !== null) {
    displayText += '（' + cat.count + '問）';
    var lastDateValue = normalizeLastDate(cat.last_date || '');
    if (lastDateValue) {
      // 全行に学習日あり → 日時 + MAX(Retry)/MIN(Total)
      var n = getRetryCountNumber(cat.max_retry_count);
      var m = getRetryCountNumber(cat.min_total_study_count);
      displayText += '：' + formatYmdForDisplay(lastDateValue) + ' （' + n + '/' + m + '回）';
    } else {
      // 学習日が1つでも空 →「-」（回数は出さない）
      displayText += '：-';
    }
  }
  return displayText;
}

/**
 * List（当該カテゴリの全問）から最終学習日時を算出
 * 1つでも空欄なら空文字、全行埋まりなら最新日時（yyyy-mm-dd HH:mm または日付のみ）
 * @param {Array} items
 * @returns {string}
 */
function computeCategoryLastDateFromItems(items) {
  if (!items || items.length === 0) {
    return '';
  }
  var latest = '';
  for (var i = 0; i < items.length; i++) {
    var ymdHm = normalizeLastDate(items[i] ? items[i].last_date : '');
    if (!ymdHm) {
      return '';
    }
    if (!latest || ymdHm > latest) {
      latest = ymdHm;
    }
  }
  return latest;
}

/**
 * Listから回数集計（n=MAX RetryCount, m=MIN TotalStudyCount。空欄は0）
 * @param {Array} items
 * @returns {{max_retry_count: number, min_total_study_count: number}}
 */
function computeCategoryStudyCountsFromItems(items) {
  var maxRetry = 0;
  var minTotal = 0;
  if (!items || items.length === 0) {
    return { max_retry_count: 0, min_total_study_count: 0 };
  }
  for (var i = 0; i < items.length; i++) {
    var item = items[i] || {};
    var retryNum = getRetryCountNumber(item.retry_count);
    var totalNum = getRetryCountNumber(item.total_study_count);
    if (i === 0) {
      maxRetry = retryNum;
      minTotal = totalNum;
    } else {
      if (retryNum > maxRetry) maxRetry = retryNum;
      if (totalNum < minTotal) minTotal = totalNum;
    }
  }
  return {
    max_retry_count: maxRetry,
    min_total_study_count: minTotal
  };
}

/**
 * 表示中Listの学習日・回数をカテゴリドロップダウンへ反映（HOME時の即時更新用）
 */
function syncCategoryLastDateFromList() {
  if (categoryCatalog.no == null || categoryCatalog.no === '') {
    return;
  }
  if (!categoryCatalog.items || categoryCatalog.items.length === 0) {
    return;
  }
  var lastDate = computeCategoryLastDateFromItems(categoryCatalog.items);
  var studyCounts = computeCategoryStudyCountsFromItems(categoryCatalog.items);
  var catRef = null;
  if (categoryCatalog.list && categoryCatalog.list.length) {
    for (var i = 0; i < categoryCatalog.list.length; i++) {
      if (String(categoryCatalog.list[i].no) === String(categoryCatalog.no)) {
        categoryCatalog.list[i].last_date = lastDate;
        categoryCatalog.list[i].count = categoryCatalog.items.length;
        categoryCatalog.list[i].max_retry_count = studyCounts.max_retry_count;
        categoryCatalog.list[i].min_total_study_count = studyCounts.min_total_study_count;
        catRef = categoryCatalog.list[i];
        break;
      }
    }
  }
  var select = dom.categorySelect;
  if (select && catRef) {
    for (var j = 0; j < select.options.length; j++) {
      if (String(select.options[j].value) === String(categoryCatalog.no)) {
        select.options[j].textContent = formatCategoryOptionText(catRef);
        break;
      }
    }
    syncCustomCategorySelect(select);
  }
  var learningSelect = dom.learningCategorySelect;
  var learningContainer = dom.learningCategorySelectContainer;
  if (learningSelect && catRef && learningContainer && learningContainer.style.display !== 'none') {
    for (var k = 0; k < learningSelect.options.length; k++) {
      if (String(learningSelect.options[k].value) === String(categoryCatalog.no)) {
        learningSelect.options[k].textContent = formatCategoryOptionText(catRef);
        break;
      }
    }
    syncCustomCategorySelect(learningSelect);
  }
}

// ========================================
// カテゴリ毎（サイクル）
// ========================================

var CYCLE_WEIGHT_BANDS = [
  { max: 9, weight: 1.0 },
  { max: 19, weight: 0.5 },
  { max: 29, weight: 0.33 },
  { max: 39, weight: 0.25 },
  { max: 49, weight: 0.2 },
  { max: Infinity, weight: 0.1 }
];

var cycleMode = {
  nextKind: 'new', // 'new' | 'review'
  lastCategoryNo: null,
  dateYmd: '',
  currentCategoryNo: null,
  slotAdvancePending: false // End 後、Next／HOME で反転するまで true（Plus では進めない）
};

/**
 * A_Title がサイクル除外語か
 * @param {*} aTitle
 * @returns {boolean}
 */
function isCycleExcludedATitle(aTitle) {
  var t = String(aTitle == null ? '' : aTitle).trim();
  return t === '解説' || t === '説明';
}

/**
 * サイクル対象行だけ残す
 * @param {Array} items
 * @returns {Array}
 */
function filterCycleStudyItems(items) {
  return (items || []).filter(function(it) {
    return it && !isCycleExcludedATitle(it.a_title);
  });
}

/**
 * カテゴリのサイクル用問題（解説除外＋音声DL OFF時は揃いのみ）
 * @param {string|number} categoryNo
 * @returns {Array}
 */
function getCycleItemsForCategory(categoryNo) {
  var raw = sortCategoryItemsByNo_(getMemoryAllStudyItems().filter(function(it) {
    return it && String(it.category_no) === String(categoryNo);
  }));
  var filtered = filterCycleStudyItems(raw);
  if (typeof filterItemsForAudioDownloadMode === 'function') {
    return filterItemsForAudioDownloadMode(filtered);
  }
  return filtered;
}

/**
 * 対象問題の学習回数 m（TotalStudyCount 最小）
 * @param {Array} items
 * @returns {number}
 */
function getCycleMinTotalStudyCount(items) {
  if (!items || items.length === 0) {
    return 0;
  }
  var min = null;
  for (var i = 0; i < items.length; i++) {
    var n = typeof getRetryCountNumber === 'function'
      ? getRetryCountNumber(items[i].total_study_count)
      : (Number(items[i].total_study_count) || 0);
    if (min === null || n < min) {
      min = n;
    }
  }
  return min == null ? 0 : min;
}

/**
 * 対象問題がすべて今日学習済みか
 * @param {Array} items
 * @param {string} [todayYmd]
 * @returns {boolean}
 */
function isCycleCategoryCompletedToday(items, todayYmd) {
  var today = todayYmd || getTodayYmdLocal();
  if (!items || items.length === 0) {
    return false;
  }
  for (var i = 0; i < items.length; i++) {
    var ymd = normalizeToYmd(items[i].last_date);
    if (!ymd || ymd !== today) {
      return false;
    }
  }
  return true;
}

/**
 * 復習重み
 * @param {number} m
 * @returns {number}
 */
function getCycleReviewWeight(m) {
  var n = Number(m);
  if (isNaN(n) || n < 0) {
    n = 0;
  }
  for (var i = 0; i < CYCLE_WEIGHT_BANDS.length; i++) {
    if (n <= CYCLE_WEIGHT_BANDS[i].max) {
      return CYCLE_WEIGHT_BANDS[i].weight;
    }
  }
  return 0.1;
}

/**
 * 日付跨ぎでスロットを new に戻す
 */
function ensureCycleSlotDate_() {
  var today = getTodayYmdLocal();
  if (cycleMode.dateYmd !== today) {
    cycleMode.nextKind = 'new';
    cycleMode.lastCategoryNo = null;
    cycleMode.slotAdvancePending = false;
    cycleMode.dateYmd = today;
    persistCycleSlotState_();
  }
}

/**
 * localStorage へスロット状態を書く
 */
function persistCycleSlotState_() {
  try {
    localStorage.setItem('practiceCycleNextKind', cycleMode.nextKind === 'review' ? 'review' : 'new');
    if (cycleMode.lastCategoryNo == null || cycleMode.lastCategoryNo === '') {
      localStorage.removeItem('practiceCycleLastCategoryNo');
    } else {
      localStorage.setItem('practiceCycleLastCategoryNo', String(cycleMode.lastCategoryNo));
    }
    localStorage.setItem('practiceCycleDateYmd', cycleMode.dateYmd || getTodayYmdLocal());
  } catch (e) {
    // ignore
  }
}

/**
 * localStorage からスロット状態を読む
 */
function loadCycleSlotStateFromLocal() {
  try {
    var kind = localStorage.getItem('practiceCycleNextKind');
    cycleMode.nextKind = (kind === 'review') ? 'review' : 'new';
    var last = localStorage.getItem('practiceCycleLastCategoryNo');
    cycleMode.lastCategoryNo = (last == null || last === '') ? null : last;
    cycleMode.dateYmd = localStorage.getItem('practiceCycleDateYmd') || '';
  } catch (e) {
    cycleMode.nextKind = 'new';
    cycleMode.lastCategoryNo = null;
    cycleMode.dateYmd = '';
  }
  ensureCycleSlotDate_();
}

/**
 * Settings json 用のスロットオブジェクト
 * @returns {{nextKind: string, lastCategoryNo: string|null, dateYmd: string}}
 */
function getCycleSlotStateForSettings() {
  ensureCycleSlotDate_();
  return {
    nextKind: cycleMode.nextKind === 'review' ? 'review' : 'new',
    lastCategoryNo: cycleMode.lastCategoryNo == null ? null : String(cycleMode.lastCategoryNo),
    dateYmd: cycleMode.dateYmd || getTodayYmdLocal()
  };
}

/**
 * サーバ／端末のスロットを適用
 * @param {Object} slot
 */
function applyCycleSlotStateFromSettings(slot) {
  if (!slot || typeof slot !== 'object') {
    return;
  }
  if (slot.nextKind === 'review' || slot.nextKind === 'new') {
    cycleMode.nextKind = slot.nextKind;
  }
  if (slot.lastCategoryNo == null || slot.lastCategoryNo === '') {
    cycleMode.lastCategoryNo = null;
  } else {
    cycleMode.lastCategoryNo = String(slot.lastCategoryNo);
  }
  if (slot.dateYmd) {
    cycleMode.dateYmd = String(slot.dateYmd);
  }
  persistCycleSlotState_();
  ensureCycleSlotDate_();
}

/**
 * サイクル候補カテゴリ一覧（Order 順・対象問題1件以上）
 * @returns {Array<{no: string|number, items: Array, m: number}>}
 */
function getCycleEligibleCategories_() {
  var visible = typeof getVisibleCategories === 'function' ? getVisibleCategories() : [];
  var out = [];
  for (var i = 0; i < visible.length; i++) {
    var cat = visible[i];
    if (!cat || isEndCategory(cat)) {
      continue;
    }
    var items = getCycleItemsForCategory(cat.no);
    if (!items.length) {
      continue;
    }
    out.push({
      no: cat.no,
      items: items,
      m: getCycleMinTotalStudyCount(items)
    });
  }
  return out;
}

/**
 * 新規候補：今日未完走のうち m 最小（同値は Order → Category_No）
 * @returns {string|number|null}
 */
function pickCycleNewCategoryNo_() {
  var today = getTodayYmdLocal();
  var list = getCycleEligibleCategories_();
  var best = null;
  var bestOrder = null;
  var bestNo = null;
  for (var i = 0; i < list.length; i++) {
    var entry = list[i];
    if (isCycleCategoryCompletedToday(entry.items, today)) {
      continue;
    }
    var cat = null;
    for (var c = 0; c < categoryCatalog.list.length; c++) {
      if (String(categoryCatalog.list[c].no) === String(entry.no)) {
        cat = categoryCatalog.list[c];
        break;
      }
    }
    var order = typeof getCategoryOrderSortValue === 'function'
      ? getCategoryOrderSortValue(cat || entry)
      : 0;
    var noVal = typeof getCategoryNoSortValue === 'function'
      ? getCategoryNoSortValue(entry.no)
      : Number(entry.no) || 0;
    if (!best ||
        entry.m < best.m ||
        (entry.m === best.m && order < bestOrder) ||
        (entry.m === best.m && order === bestOrder && noVal < bestNo)) {
      best = entry;
      bestOrder = order;
      bestNo = noVal;
    }
  }
  return best ? best.no : null;
}

/**
 * 復習候補から重み抽選
 * @returns {string|number|null}
 */
function pickCycleReviewCategoryNo_() {
  var list = getCycleEligibleCategories_();
  var lastNo = cycleMode.lastCategoryNo;
  var candidates = [];
  var weights = [];
  var total = 0;
  for (var i = 0; i < list.length; i++) {
    var entry = list[i];
    if (entry.m < 1) {
      continue;
    }
    if (lastNo != null && String(entry.no) === String(lastNo)) {
      continue;
    }
    var w = getCycleReviewWeight(entry.m);
    if (w <= 0) {
      continue;
    }
    candidates.push(entry.no);
    weights.push(w);
    total += w;
  }
  if (!candidates.length || total <= 0) {
    // 直前除外だけで空なら同一カテゴリを許可（対象1件時の行き止まり防止）
    if (lastNo != null) {
      for (var k = 0; k < list.length; k++) {
        var lastEntry = list[k];
        if (String(lastEntry.no) !== String(lastNo)) {
          continue;
        }
        if (lastEntry.m >= 1 && getCycleReviewWeight(lastEntry.m) > 0) {
          return lastEntry.no;
        }
        break;
      }
    }
    return null;
  }
  var r = Math.random() * total;
  var acc = 0;
  for (var j = 0; j < candidates.length; j++) {
    acc += weights[j];
    if (r <= acc) {
      return candidates[j];
    }
  }
  return candidates[candidates.length - 1];
}

/**
 * 完了画面 Next で次スロットへ進めるか（スロット状態は変えない）
 * End 直後の slotAdvancePending は反転後の kind として見る
 * @returns {boolean}
 */
function canBrowseNextCycleFromCompletion() {
  ensureCycleSlotDate_();
  var kind = cycleMode.nextKind === 'review' ? 'review' : 'new';
  if (cycleMode.slotAdvancePending) {
    kind = (kind === 'new') ? 'review' : 'new';
  }
  if (kind === 'review') {
    if (pickCycleReviewCategoryNo_() != null) {
      return true;
    }
    kind = 'new';
  }
  if (pickCycleNewCategoryNo_() != null) {
    return true;
  }
  return pickCycleReviewCategoryNo_() != null;
}

/**
 * 次に出すべきカテゴリを決定（スロット更新を含む）
 * @returns {{categoryNo: string|number, kind: string}|null}
 */
function decideNextCycleCategory() {
  ensureCycleSlotDate_();
  var kind = cycleMode.nextKind === 'review' ? 'review' : 'new';

  if (kind === 'review') {
    var reviewNo = pickCycleReviewCategoryNo_();
    if (reviewNo == null) {
      cycleMode.nextKind = 'new';
      persistCycleSlotState_();
      kind = 'new';
    } else {
      return { categoryNo: reviewNo, kind: 'review' };
    }
  }

  var newNo = pickCycleNewCategoryNo_();
  if (newNo != null) {
    cycleMode.nextKind = 'new';
    persistCycleSlotState_();
    return { categoryNo: newNo, kind: 'new' };
  }

  // 新規尽きた → 復習のみ
  var onlyReview = pickCycleReviewCategoryNo_();
  if (onlyReview == null) {
    return null;
  }
  cycleMode.nextKind = 'review';
  persistCycleSlotState_();
  return { categoryNo: onlyReview, kind: 'review' };
}

/**
 * End 時：直前カテゴリを記録（スロット反転は Next／HOME まで保留。Plus 再学習では進めない）
 * @param {string|number} categoryNo
 */
function markCycleCategoryCompleted(categoryNo) {
  ensureCycleSlotDate_();
  cycleMode.lastCategoryNo = categoryNo == null ? null : String(categoryNo);
  cycleMode.slotAdvancePending = true;
  persistCycleSlotState_();
  if (typeof scheduleUserSettingsSync === 'function') {
    scheduleUserSettingsSync();
  }
}

/**
 * 保留中なら次スロットへ反転（完了画面の Next／HOME で呼ぶ）
 */
function commitCycleSlotAdvanceIfPending() {
  if (!cycleMode.slotAdvancePending) {
    return;
  }
  ensureCycleSlotDate_();
  cycleMode.nextKind = (cycleMode.nextKind === 'new') ? 'review' : 'new';
  cycleMode.slotAdvancePending = false;
  persistCycleSlotState_();
  if (typeof scheduleUserSettingsSync === 'function') {
    scheduleUserSettingsSync();
  }
}

/**
 * サイクル用カテゴリを List に載せる
 * @param {string|number} categoryNo
 * @param {{forCompletionBrowse?: boolean}} [options]
 * @returns {boolean}
 */
function applyCycleCategoryToList(categoryNo, options) {
  options = options || {};
  var items = getCycleItemsForCategory(categoryNo);
  if (!items.length) {
    return false;
  }
  categoryCatalog.byNo[String(categoryNo)] = items.slice();
  categoryCatalog.items = items.slice();
  categoryCatalog.no = categoryNo;
  cycleMode.currentCategoryNo = categoryNo;
  questionList.selected = [];
  if (!options.forCompletionBrowse) {
    displayList();
    syncCategoryLastDateFromList();
    updateListNavButtons();
    updateStartButtonEnabled();
  } else {
    displayList();
    updateListNavButtons();
  }
  updateCycleCategoryLabelUi();
  return true;
}

/**
 * TOP／モード切替：次カテゴリを決めて List 表示
 * @returns {boolean}
 */
/**
 * @param {{forceRedecide?: boolean, commitPending?: boolean}} [options]
 */
function refreshCycleModeHomeList(options) {
  options = options || {};
  if (options.commitPending) {
    commitCycleSlotAdvanceIfPending();
  }
  durationMode.sortedItems = [];
  durationMode.pageIndex = 0;
  durationMode.sessionItems = [];
  studyEnd.durationSession = false;
  lastDateMode.allItems = [];
  lastDateMode.sessionItems = [];
  lastDateMode.pageIndex = 0;
  lastDateMode.needsResort = false;
  studyEnd.lastDateSession = false;
  studyEnd.categorySession = false;

  applyQuestionMethodModeUi();
  hideListNavButtons();

  if (!options.forceRedecide && cycleMode.currentCategoryNo != null && !cycleMode.slotAdvancePending) {
    var kept = getCycleItemsForCategory(cycleMode.currentCategoryNo);
    if (kept.length) {
      applyCycleCategoryToList(cycleMode.currentCategoryNo);
      return true;
    }
  }

  var decided = decideNextCycleCategory();
  var listMessage = dom.listMessage;
  var listContainer = dom.listContainer;

  if (!decided) {
    cycleMode.currentCategoryNo = null;
    categoryCatalog.items = [];
    categoryCatalog.no = null;
    questionList.selected = [];
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '出題できるカテゴリがありません。';
    }
    if (listContainer) {
      listContainer.style.display = 'none';
    }
    setStartButtonVisible(false);
    updateCycleCategoryLabelUi();
    updateListNavButtons();
    return false;
  }

  if (!applyCycleCategoryToList(decided.categoryNo)) {
    if (listMessage) {
      listMessage.style.display = 'block';
      listMessage.textContent = '出題できるカテゴリがありません。';
    }
    if (listContainer) {
      listContainer.style.display = 'none';
    }
    setStartButtonVisible(false);
    updateCycleCategoryLabelUi();
    return false;
  }
  return true;
}

/**
 * 完了画面 Next：次スロットのカテゴリへ着地（学習開始しない）
 * @returns {boolean}
 */
function browseNextCycleCategoryFromCompletion() {
  commitCycleSlotAdvanceIfPending();
  var decided = decideNextCycleCategory();
  if (!decided) {
    return false;
  }
  if (!applyCycleCategoryToList(decided.categoryNo, { forCompletionBrowse: true })) {
    return false;
  }
  var learningSelect = dom.learningCategorySelect;
  if (learningSelect) {
    learningSelect.value = String(decided.categoryNo);
    if (typeof syncCustomCategorySelect === 'function') {
      syncCustomCategorySelect(learningSelect);
    }
  }
  var currentCategory = dom.currentCategory;
  var cat = null;
  for (var i = 0; i < categoryCatalog.list.length; i++) {
    if (String(categoryCatalog.list[i].no) === String(decided.categoryNo)) {
      cat = categoryCatalog.list[i];
      break;
    }
  }
  if (currentCategory && cat) {
    currentCategory.classList.remove('is-hidden');
    currentCategory.style.display = 'block';
    currentCategory.textContent = formatCategoryOptionText(cat, { breakAfterColon: true });
    currentCategory.style.whiteSpace = 'pre-line';
  }
  return true;
}

/**
 * TOP のサイクル用カテゴリ表示を更新
 */
function updateCycleCategoryLabelUi() {
  var label = document.getElementById('cycleCategoryLabel');
  if (!label) {
    return;
  }
  if (typeof isCategoryCycleQuestionMethod !== 'function' || !isCategoryCycleQuestionMethod()) {
    label.style.display = 'none';
    label.textContent = '';
    return;
  }
  var no = cycleMode.currentCategoryNo != null ? cycleMode.currentCategoryNo : categoryCatalog.no;
  var cat = null;
  if (no != null && no !== '') {
    for (var i = 0; i < categoryCatalog.list.length; i++) {
      if (String(categoryCatalog.list[i].no) === String(no)) {
        cat = categoryCatalog.list[i];
        break;
      }
    }
  }
  if (!cat) {
    label.style.display = 'block';
    label.textContent = '出題できるカテゴリがありません';
    return;
  }
  label.style.display = 'block';
  label.textContent = String(formatCategoryOptionText(cat) || '').replace('：', '：\n');
  label.style.whiteSpace = 'pre-line';
}

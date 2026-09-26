/**
 * LastDate 比較用キー（空は先頭＝最小。昇順で先頭になる）
 * @param {string} value
 * @returns {string}
 */
function getLastDateSortKey(value) {
  var normalized = normalizeLastDate(value);
  if (!normalized) {
    return '';
  }
  return normalized;
}

/**
 * Duration 比較用ミリ秒（空は数値MAX）
 * @param {string} value
 * @returns {number}
 */
function getDurationSortMs(value) {
  var ms = parseDurationToMs(value);
  if (ms === null) {
    return 1e15;
  }
  return ms;
}

/**
 * カテゴリ番号の数値化（比較用）
 * @param {*} value
 * @returns {number}
 */
function getCategoryNoSortValue(value) {
  var n = Number(value);
  return isNaN(n) ? 0 : n;
}

/**
 * 解答時間優先のソート（破壊的）
 * Duration降順（空=MAX）→ LastDate昇順（空先頭）→ Category_No降順
 * @param {Array} items
 * @returns {Array}
 */
function sortItemsForDurationMode(items) {
  if (!items || items.length === 0) {
    return items || [];
  }
  items.sort(function(a, b) {
    var durA = getDurationSortMs(a ? a.duration : '');
    var durB = getDurationSortMs(b ? b.duration : '');
    if (durA < durB) return 1;
    if (durA > durB) return -1;
    
    var dateA = getLastDateSortKey(a ? a.last_date : '');
    var dateB = getLastDateSortKey(b ? b.last_date : '');
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;
    
    var catA = getCategoryNoSortValue(a ? a.category_no : 0);
    var catB = getCategoryNoSortValue(b ? b.category_no : 0);
    if (catA < catB) return 1;
    if (catA > catB) return -1;
    return 0;
  });
  return items;
}

/**
 * Fisher-Yates シャッフル（非破壊）
 * @param {Array} items
 * @returns {Array}
 */
function shuffleArray(items) {
  var arr = (items || []).slice();
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * 学習日優先のソート（破壊的）
 * LastDate昇順（空先頭）→ Duration降順（空=MAX）→ Category_No降順
 * @param {Array} items
 * @returns {Array}
 */
function sortItemsForLastDatePriorityMode(items) {
  if (!items || items.length === 0) {
    return items || [];
  }
  items.sort(function(a, b) {
    var dateA = getLastDateSortKey(a ? a.last_date : '');
    var dateB = getLastDateSortKey(b ? b.last_date : '');
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;

    var durA = getDurationSortMs(a ? a.duration : '');
    var durB = getDurationSortMs(b ? b.duration : '');
    if (durA < durB) return 1;
    if (durA > durB) return -1;

    var catA = getCategoryNoSortValue(a ? a.category_no : 0);
    var catB = getCategoryNoSortValue(b ? b.category_no : 0);
    if (catA < catB) return 1;
    if (catA > catB) return -1;
    return 0;
  });
  return items;
}

/**
 * 学習日優先（シャッフル）：上位プールからランダムに最大7件を抽選（順序もランダム）
 * @param {Array} sortedItems
 * @returns {Array}
 */
function pickRandomLastDateModeItems(sortedItems) {
  if (!sortedItems || sortedItems.length === 0) {
    return [];
  }
  var poolSize = Math.min(LAST_DATE_POOL_SIZE, sortedItems.length);
  var pool = sortedItems.slice(0, poolSize);
  var pickCount = Math.min(CROSS_CATEGORY_LIST_SIZE, pool.length);
  return shuffleArray(pool).slice(0, pickCount);
}

/**
 * 学習日優先（ノーマル）：昇順ソート結果の先頭から最大7件（順序はソート順のまま）
 * @param {Array} sortedItems
 * @returns {Array}
 */
function pickTopLastDateModeItems(sortedItems) {
  if (!sortedItems || sortedItems.length === 0) {
    return [];
  }
  return sortedItems.slice(0, Math.min(CROSS_CATEGORY_LIST_SIZE, sortedItems.length));
}

/**
 * 学習日優先：現在モードに応じて List 用の最大7件を取得
 * @param {Array} sortedItems
 * @returns {Array}
 */
function pickLastDateModeListItems(sortedItems) {
  if (isLastDateNormalQuestionMethod()) {
    return pickTopLastDateModeItems(sortedItems);
  }
  return pickRandomLastDateModeItems(sortedItems);
}

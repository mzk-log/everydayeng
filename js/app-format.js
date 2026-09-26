/**
 * 端末ローカルの現在日時を yyyy-mm-dd HH:mm で返す
 * @returns {string}
 */
function getNowYmdHmLocal() {
  var now = new Date();
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  var d = now.getDate();
  var hh = now.getHours();
  var mi = now.getMinutes();
  return y + '-' + (m < 10 ? '0' + m : String(m)) + '-' + (d < 10 ? '0' + d : String(d)) +
    ' ' + (hh < 10 ? '0' + hh : String(hh)) + ':' + (mi < 10 ? '0' + mi : String(mi));
}

/**
 * 端末ローカルの今日を yyyy-mm-dd で返す（互換）
 * @returns {string}
 */
function getTodayYmdLocal() {
  return getNowYmdHmLocal().substring(0, 10);
}

/**
 * LastDate 値を yyyy-mm-dd または yyyy-mm-dd HH:mm に正規化
 * @param {*} value
 * @returns {string}
 */
function normalizeLastDate(value) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    var y = value.getFullYear();
    var m = value.getMonth() + 1;
    var d = value.getDate();
    var hh = value.getHours();
    var mi = value.getMinutes();
    return y + '-' + (m < 10 ? '0' + m : String(m)) + '-' + (d < 10 ? '0' + d : String(d)) +
      ' ' + (hh < 10 ? '0' + hh : String(hh)) + ':' + (mi < 10 ? '0' + mi : String(mi));
  }
  var s = String(value).trim();
  if (!s) {
    return '';
  }
  var dtMatched = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})[ T](\d{1,2}):(\d{2})/);
  if (dtMatched) {
    var mm = dtMatched[2].length === 1 ? '0' + dtMatched[2] : dtMatched[2];
    var dd = dtMatched[3].length === 1 ? '0' + dtMatched[3] : dtMatched[3];
    var h = dtMatched[4].length === 1 ? '0' + dtMatched[4] : dtMatched[4];
    return dtMatched[1] + '-' + mm + '-' + dd + ' ' + h + ':' + dtMatched[5];
  }
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    var dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      return normalizeLastDate(dt);
    }
  }
  var matched = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (matched) {
    var mm2 = matched[2].length === 1 ? '0' + matched[2] : matched[2];
    var dd2 = matched[3].length === 1 ? '0' + matched[3] : matched[3];
    return matched[1] + '-' + mm2 + '-' + dd2;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.substring(0, 10);
  }
  return '';
}

/**
 * 日付値を yyyy-mm-dd に正規化（日付部分のみ。互換用）
 * @param {*} value
 * @returns {string}
 */
function normalizeToYmd(value) {
  var normalized = normalizeLastDate(value);
  if (!normalized) {
    return '';
  }
  return normalized.substring(0, 10);
}

/**
 * LastDate を表示用 yyyy/m/d または yyyy/m/d H:mm に変換
 * @param {string} value
 * @returns {string}
 */
function formatYmdForDisplay(value) {
  var normalized = normalizeLastDate(value);
  if (!normalized) {
    return '-';
  }
  var matched = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!matched) {
    return '-';
  }
  var text = Number(matched[1]) + '/' + Number(matched[2]) + '/' + Number(matched[3]);
  if (matched[4] !== undefined && matched[5] !== undefined) {
    text += ' ' + Number(matched[4]) + ':' + matched[5];
  }
  return text;
}

/**
 * RetryCount を表示用数値にする（空欄は0）
 * @param {*} value
 * @returns {number}
 */
function getRetryCountNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return 0;
  }
  var n = Number(value);
  if (isNaN(n) || n < 0) {
    return 0;
  }
  return n;
}

/**
 * 経過ミリ秒をシート保存用 Duration（MM:SS:CS）に変換
 * @param {number} elapsedMs
 * @returns {string}
 */
function formatDurationForSheet(elapsedMs) {
  var elapsed = Math.max(0, Math.round(Number(elapsedMs) || 0));
  var totalSeconds = Math.floor(elapsed / 1000);
  var minutes = Math.floor(totalSeconds / 60);
  var seconds = totalSeconds % 60;
  var centiseconds = Math.floor((elapsed % 1000) / 10);
  return String(minutes).padStart(2, '0') + ':' +
         String(seconds).padStart(2, '0') + ':' +
         String(centiseconds).padStart(2, '0');
}

/**
 * Duration を MM:SS:CS に正規化（不正・空は空文字）
 * シート由来の Date.toString（1899 基準）も H:M:S → MM:SS:CS として復元する
 * @param {*} duration
 * @returns {string}
 */
function coerceDurationToMmSsCs(duration) {
  if (duration === '' || duration === null || duration === undefined) {
    return '';
  }
  var text = String(duration).trim();
  if (!text) {
    return '';
  }
  if (/^\d{1,3}:\d{2}:\d{2}$/.test(text)) {
    var partsOk = text.split(':');
    var mmOk = String(parseInt(partsOk[0], 10) || 0);
    var ssOk = String(parseInt(partsOk[1], 10) || 0);
    var csOk = String(parseInt(partsOk[2], 10) || 0);
    while (mmOk.length < 2) mmOk = '0' + mmOk;
    while (ssOk.length < 2) ssOk = '0' + ssOk;
    while (csOk.length < 2) csOk = '0' + csOk;
    return mmOk + ':' + ssOk + ':' + csOk;
  }
  // 例: Sat Dec 30 1899 00:10:28 GMT+0900 (...)
  if (/1899/.test(text)) {
    var matched = text.match(/\b(\d{1,2}):(\d{2}):(\d{2})\b/);
    if (matched) {
      var mmD = String(parseInt(matched[1], 10) || 0);
      var ssD = String(parseInt(matched[2], 10) || 0);
      var csD = String(parseInt(matched[3], 10) || 0);
      while (mmD.length < 2) mmD = '0' + mmD;
      while (ssD.length < 2) ssD = '0' + ssD;
      while (csD.length < 2) csD = '0' + csD;
      return mmD + ':' + ssD + ':' + csD;
    }
  }
  return '';
}

/**
 * Duration（MM:SS:CS）をミリ秒に変換。不正・空は null
 * @param {string} duration
 * @returns {number|null}
 */
function parseDurationToMs(duration) {
  var text = coerceDurationToMmSsCs(duration);
  if (!text) {
    return null;
  }
  var parts = text.split(':');
  var minutes = parseInt(parts[0], 10);
  var seconds = parseInt(parts[1], 10);
  var centiseconds = parseInt(parts[2], 10);
  if (isNaN(minutes) || isNaN(seconds) || isNaN(centiseconds)) {
    return null;
  }
  return (minutes * 60 + seconds) * 1000 + centiseconds * 10;
}

/**
 * Duration（MM:SS:CS）を画面表示用「m.n秒」に変換（1分超も秒換算）
 * @param {string} duration
 * @returns {string}
 */
function formatDurationForDisplay(duration) {
  var text = coerceDurationToMmSsCs(duration);
  if (!text) {
    return '-';
  }
  var parts = text.split(':');
  var minutes = parseInt(parts[0], 10) || 0;
  var seconds = parseInt(parts[1], 10) || 0;
  var centiseconds = parseInt(parts[2], 10) || 0;
  var totalSec = minutes * 60 + seconds + (centiseconds / 100);
  return totalSec.toFixed(1) + '秒';
}

/**
 * List用の学習回数表示（m／n回）
 * @param {Object} item
 * @returns {string}
 */
function formatStudyCountForList(item) {
  var m = getRetryCountNumber(item ? item.retry_count : 0);
  var n = getRetryCountNumber(item ? item.total_study_count : 0);
  return m + '／' + n + '回';
}

/**
 * 学習メタ情報テキストを生成
 * @param {Object} item
 * @returns {string}
 */
function buildLearningMetaText(item, variant) {
  var m = getRetryCountNumber(item ? item.retry_count : 0);
  var n = getRetryCountNumber(item ? item.total_study_count : 0);
  var durationOldText = formatDurationForDisplay(item ? item.duration_old : '');
  var durationText = formatDurationForDisplay(item ? item.duration : '');
  var lastDateText = formatYmdForDisplay(item ? item.last_date : '');
  if (variant === 'list') {
    return '学習回数：' + m + '／' + n + '回　平均(前回)：' + durationOldText + '　平均(最新)：' + durationText + '　最終学習日時：' + lastDateText;
  }
  return '回数：' + m + '／' + n + '回　平均：' + durationOldText + '⇒' + durationText + '　日時：' + lastDateText;
}

/**
 * 学習メタ情報を要素へ表示
 * @param {Object} item
 * @param {string} elementId
 */
function updateLearningMetaDisplay(item, elementId) {
  var el = document.getElementById(elementId);
  if (!el) return;
  var variant = (elementId === 'modalLearningMeta') ? 'list' : 'learning';
  el.textContent = buildLearningMetaText(item, variant);
}

/**
 * ISO 8601形式の日時文字列かどうかを判定
 * @param {string} text - 判定する文字列
 * @returns {boolean} ISO 8601形式の日時文字列の場合true
 */
function isIsoDateTimeString(text) {
  if (!text || typeof text !== 'string') return false;
  var trimmed = text.trim();
  // ISO 8601形式のパターン（例: 1868-03-31T14:41:01.000Z または 1868-03-31T14:41:01Z）
  var isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
  return isoPattern.test(trimmed);
}

/**
 * ISO 8601形式の日時文字列を「YYYY年M月」形式に変換
 * @param {string} isoString - ISO 8601形式の日時文字列
 * @returns {string} 「YYYY年M月」形式の文字列
 */
function formatIsoDateTimeToYearMonth(isoString) {
  if (!isoString || typeof isoString !== 'string') return isoString;
  
  try {
    // ISO 8601文字列をDateオブジェクトに変換
    var date = new Date(isoString);
    
    // 無効な日付の場合は元の文字列を返す
    if (isNaN(date.getTime())) {
      return isoString;
    }
    
    // 年と月を取得
    var year = date.getFullYear();
    var month = date.getMonth() + 1; // getMonth()は0-11を返すため+1
    
    // 「YYYY年M月」形式に変換
    return year + '年' + month + '月';
  } catch (e) {
    // エラーが発生した場合は元の文字列を返す
    return isoString;
  }
}

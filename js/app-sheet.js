/**
 * GAS シート更新ジョブをキューに追加（直列実行）
 * @param {Object} job
 * @param {string} job.action - 'updateItemField' | 'updateItemFields'
 * @param {string} job.id
 * @param {string} [job.field]
 * @param {string|number} [job.value]
 * @param {Object} [job.fields]
 * @param {Function} [job.onSuccess]
 * @param {Function} [job.onFinalError]
 */
function enqueueGasSheetUpdate(job) {
  if (!job || !job.id || !job.action) {
    showError('更新リクエストが不正です。');
    return;
  }
  gasSheetUpdate.queue.push(job);
  processGasSheetUpdateQueue();
}

function processGasSheetUpdateQueue() {
  if (gasSheetUpdate.running) return;
  if (gasSheetUpdate.queue.length === 0) return;
  gasSheetUpdate.running = true;
  runGasSheetUpdateJob(gasSheetUpdate.queue[0], 0);
}

function finishGasSheetUpdateJob() {
  gasSheetUpdate.queue.shift();
  gasSheetUpdate.running = false;
  processGasSheetUpdateQueue();
}

/**
 * @param {Object} job
 * @param {number} attemptIndex - 0始まり
 */
function runGasSheetUpdateJob(job, attemptIndex) {
  if (!googleAuth.email) {
    googleAuth.email = localStorage.getItem('userEmail');
  }
  if (!googleAuth.email) {
    showError('メールアドレスが設定されていません。');
    if (typeof job.onFinalError === 'function') {
      job.onFinalError(new Error('メールアドレスが設定されていません。'));
    }
    gasSheetUpdate.failCount += 1;
    refreshLoadDiagUi();
    finishGasSheetUpdateJob();
    return;
  }

  beginLoadDiag('run', '更新', GAS_UPDATE_MAX_ATTEMPTS, {
    attempt: attemptIndex,
    kind: 'update',
    status: '通信待ち',
    queueWait: Math.max(0, gasSheetUpdate.queue.length - 1)
  });

  var params = new URLSearchParams();
  params.append('action', job.action);
  params.append('id', job.id);
  appendAuthParams(params);
  params.append('referer', window.location.origin);

  if (job.action === 'updateItemFields') {
    params.append('fields', JSON.stringify(job.fields || {}));
  } else {
    params.append('field', job.field);
    params.append('value', String(job.value));
  }

  postGasJson(params)
  .then(function(data) {
    if (!data.success) {
      throw new Error(data.error || 'Unknown error');
    }
    finishLoadDiag('run', 'OK', {
      ok: true,
      kind: 'update',
      bytes: approxJsonBytes(data)
    });
    gasSheetUpdate.okCount += 1;
    refreshLoadDiagUi();
    var fields = job.fields || {};
    if (job.field) {
      fields[job.field] = job.value;
    }
    if (data && data.fields && typeof data.fields === 'object' && !Array.isArray(data.fields) &&
        Object.keys(data.fields).length) {
      fields = data.fields;
    }
    if (job.id && fields && Object.keys(fields).length) {
      patchLocalStudyItemFields(job.id, fields, data.dataGeneration);
      recordCompletedSheetStudyWrite(job.id, fields, data.dataGeneration);
    }
    if (typeof job.onSuccess === 'function') {
      job.onSuccess(data);
    }
    finishGasSheetUpdateJob();
  })
  .catch(function(error) {
    updateLoadDiag('run', {
      attempt: attemptIndex,
      status: loadDiagStatusFromError(error),
      queueWait: Math.max(0, gasSheetUpdate.queue.length - 1)
    });
    var nextAttempt = attemptIndex + 1;
    if (nextAttempt < GAS_UPDATE_MAX_ATTEMPTS) {
      var delay = GAS_UPDATE_BASE_DELAY_MS * Math.pow(2, attemptIndex);
      setTimeout(function() {
        runGasSheetUpdateJob(job, nextAttempt);
      }, delay);
      return;
    }
    gasSheetUpdate.failCount += 1;
    finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false, kind: 'update' });
    refreshLoadDiagUi();
    showError('更新エラー: ' + error.toString());
    if (typeof job.onFinalError === 'function') {
      job.onFinalError(error);
    }
    finishGasSheetUpdateJob();
  });
}

/**
 * updateItemField をキュー経由で呼び出す（失敗時はリトライ後にエラー表示）
 * @param {Object} item
 * @param {string} field
 * @param {string|number} value
 * @param {Function} [onSuccess]
 * @param {Function} [onFinalError]
 */
function updateItemFieldAsync(item, field, value, onSuccess, onFinalError) {
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    if (typeof onFinalError === 'function') {
      onFinalError(new Error('IDが見つかりません。'));
    }
    return;
  }
  enqueueGasSheetUpdate({
    action: 'updateItemField',
    id: item.id,
    field: field,
    value: value,
    onSuccess: onSuccess,
    onFinalError: onFinalError
  });
}

/**
 * 複数フィールドを1リクエストで更新（キュー＋リトライ）
 * @param {Object} item
 * @param {Object} fields
 * @param {Function} [onSuccess]
 * @param {Function} [onFinalError]
 */
function updateItemFieldsAsync(item, fields, onSuccess, onFinalError) {
  if (!item || !item.id) {
    showError('IDが見つかりません。');
    if (typeof onFinalError === 'function') {
      onFinalError(new Error('IDが見つかりません。'));
    }
    return;
  }
  var job = {
    action: 'updateItemFields',
    id: item.id,
    fields: fields,
    onSuccess: onSuccess,
    onFinalError: onFinalError
  };
  if (fields && (fields.ans_apply === 1 || fields.ans_apply === '1' || fields.ans_apply === true)) {
    job.studyOverlay = pickStudyStatFields(item);
  }
  enqueueGasSheetUpdate(job);
}

/**
 * Ans押下時: TotalStudyCount / DailyStudyCount / Duration_old / Duration / LastDate をメモリ更新し、1リクエストで保存
 * @param {Object} item
 * @param {number} elapsedMs
 * @param {{deferNetwork?: boolean}} [options] - true のときネット送信を保留（音声優先）
 */
function persistAnsStudyStatsAsync(item, elapsedMs, options) {
  if (!item) return;
  options = options || {};

  var nextCount = getRetryCountNumber(item.total_study_count) + 1;
  item.total_study_count = nextCount;

  var nextDaily = isItemLastDateToday(item)
    ? (getRetryCountNumber(item.daily_study_count) + 1)
    : 1;
  item.daily_study_count = nextDaily;

  // 更新前の Duration（移動平均）を Duration_old へコピー（空欄もコピー）
  var previousDuration = (item.duration === null || item.duration === undefined) ? '' : item.duration;
  item.duration_old = previousDuration;

  var currentMs = Math.max(0, Number(elapsedMs) || 0);
  currentMs = Math.round(currentMs * getSessionRetryDurationMultiplier(item));
  var previousMs = parseDurationToMs(previousDuration);
  var averagedMs = (previousMs === null) ? currentMs : Math.round((previousMs + currentMs) / 2);
  var duration = formatDurationForSheet(averagedMs);
  item.duration = duration;

  var now = getNowYmdHmLocal();
  item.last_date = now;

  var fields = {
    ans_apply: 1,
    elapsed_ms: currentMs,
    last_date: now
  };

  if (options.deferNetwork) {
    scheduleAnsSheetPersist(item, fields);
    return;
  }
  updateItemFieldsAsync(item, fields, function(data) {
    applyServerAnsFieldsToOpenItem(item, data);
  });
}

/**
 * シートが計算した Ans の5項目を、出題中の表示と今日の件数へ反映する
 * @param {Object} item
 * @param {Object} data
 */
function applyServerAnsFieldsToOpenItem(item, data) {
  var written = data && data.fields;
  if (!item || !written) {
    return;
  }
  var keys = ['total_study_count', 'daily_study_count', 'duration_old', 'duration', 'last_date'];
  if (questionCursor.item && String(questionCursor.item.id) === String(item.id)) {
    for (var i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(written, keys[i])) {
        questionCursor.item[keys[i]] = written[keys[i]];
      }
    }
    updateLearningMetaDisplay(questionCursor.item, 'learningMeta');
  }
  recountTodayStudyStatsFromLocalItems();
}

/**
 * Ansシート更新の保留をクリアして即送信
 */
function flushPendingAnsSheetPersist() {
  if (ansSheetPersist.timer) {
    clearTimeout(ansSheetPersist.timer);
    ansSheetPersist.timer = null;
  }
  if (!ansSheetPersist.pending) {
    return;
  }
  var pending = ansSheetPersist.pending;
  ansSheetPersist.pending = null;
  updateItemFieldsAsync(pending.item, pending.fields, function(data) {
    applyServerAnsFieldsToOpenItem(pending.item, data);
  });
}

/**
 * 音声ネット取得を優先するため、シート更新を短時間保留（上限後は強制送信）
 * @param {Object} item
 * @param {Object} fields
 */
function scheduleAnsSheetPersist(item, fields) {
  if (ansSheetPersist.timer) {
    clearTimeout(ansSheetPersist.timer);
    ansSheetPersist.timer = null;
  }
  ansSheetPersist.pending = { item: item, fields: fields };
  beginLoadDiag('run', '更新待機', 0, {
    status: '音声優先',
    kind: 'update'
  });
  ansSheetPersist.timer = setTimeout(function() {
    ansSheetPersist.timer = null;
    flushPendingAnsSheetPersist();
  }, ANS_SHEET_PERSIST_MAX_DEFER_MS);
}

/**
 * プラス押下時: RetryCount を +1（非同期）
 * 学習画面のメタ表示は更新せず、メモリとシートのみ更新する
 * @param {Object} item
 */
function incrementRetryCountAsync(item) {
  if (!item) return;

  incrementSessionRetryPressCount(item);
  
  var nextCount = getRetryCountNumber(item.retry_count) + 1;
  item.retry_count = nextCount;
  
  updateItemFieldAsync(item, 'retry_count', nextCount);
}

/**
 * このSTART以降の、当該問題へのリトライ押下を1加算
 * @param {Object} item
 */
function incrementSessionRetryPressCount(item) {
  if (!item || item.id == null) return;
  var key = String(item.id);
  sessionRetryPressCountById[key] = (Number(sessionRetryPressCountById[key]) || 0) + 1;
}

/**
 * リトライ再出題時の今回時間倍率。最初の周は常に1
 * @param {Object} item
 * @returns {number}
 */
function getSessionRetryDurationMultiplier(item) {
  if (!retryMode.active || !item || item.id == null) {
    return 1;
  }
  var n = Number(sessionRetryPressCountById[String(item.id)]) || 0;
  if (n <= 0) return 1;
  if (n === 1) return 2.5;
  if (n === 2) return 3;
  return 3.5;
}

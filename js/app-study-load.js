/**
 * getAllStudyItems 取得結果をセッション内メモリでマージ
 * @param {Array} items - 取得した配列（サーバ or 端末）
 * @param {Array} [extraItems]
 * @param {{preferIncomingStudyMeta?: boolean}} [options]
 *   preferIncomingStudyMeta=true：学習メタ（日時・回数・duration）は items 側を優先（シート正）
 * @returns {Array}
 */
function mergeAllStudyItemsWithMemory(items, extraItems, options) {
  options = options || {};
  var preferIncomingStudyMeta = !!options.preferIncomingStudyMeta;
  var byId = {};
  Object.keys(categoryCatalog.byNo).forEach(function(catKey) {
    var catItems = categoryCatalog.byNo[catKey] || [];
    catItems.forEach(function(it) {
      if (it && it.id != null) {
        if (it.category_no == null || it.category_no === '') {
          it.category_no = catKey;
        }
        byId[String(it.id)] = it;
      }
    });
  });
  (extraItems || []).forEach(function(it) {
    if (it && it.id != null) {
      byId[String(it.id)] = it;
    }
  });
  return (items || []).map(function(it) {
    var mem = it && it.id != null ? byId[String(it.id)] : null;
    if (!mem) return it;
    var retryCount;
    var totalStudyCount;
    var dailyStudyCount;
    var durationOld;
    var duration;
    var lastDate;
    if (preferIncomingStudyMeta) {
      retryCount = it.retry_count != null ? it.retry_count : mem.retry_count;
      totalStudyCount = it.total_study_count != null ? it.total_study_count : mem.total_study_count;
      dailyStudyCount = it.daily_study_count != null ? it.daily_study_count : mem.daily_study_count;
      durationOld = it.duration_old != null ? it.duration_old : mem.duration_old;
      duration = it.duration != null ? it.duration : mem.duration;
      lastDate = it.last_date != null ? it.last_date : mem.last_date;
    } else {
      retryCount = mem.retry_count != null ? mem.retry_count : it.retry_count;
      totalStudyCount = mem.total_study_count != null ? mem.total_study_count : it.total_study_count;
      dailyStudyCount = mem.daily_study_count != null ? mem.daily_study_count : it.daily_study_count;
      durationOld = mem.duration_old != null ? mem.duration_old : it.duration_old;
      duration = mem.duration != null ? mem.duration : it.duration;
      lastDate = mem.last_date != null ? mem.last_date : it.last_date;
    }
    return {
      id: it.id,
      category_no: it.category_no != null ? it.category_no : mem.category_no,
      category: it.category != null ? it.category : mem.category,
      no: it.no,
      q_title: it.q_title,
      question: mem.question != null ? mem.question : it.question,
      a_title: it.a_title,
      answer: mem.answer != null ? mem.answer : it.answer,
      note: mem.note != null ? mem.note : it.note,
      retry_count: retryCount,
      total_study_count: totalStudyCount,
      daily_study_count: dailyStudyCount,
      duration_old: durationOld,
      duration: duration,
      last_date: lastDate
    };
  });
}

/**
 * 全問データの端末キャッシュキー（メール単位）
 * @returns {string}
 */
function getAllStudyItemsLocalStorageKey() {
  return 'allStudyItemsLocal_v1:' + resolveAuthEmail();
}

/**
 * 端末に保存した全問＋世代を読む
 * @returns {{items: Array, dataGeneration: number|null}|null}
 */
function readLocalStudyBundle() {
  try {
    var raw = localStorage.getItem(getAllStudyItemsLocalStorageKey());
    if (!raw) {
      return null;
    }
    var parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
      return null;
    }
    var gen = parsed.dataGeneration;
    if (gen == null || gen === '') {
      return { items: parsed.items, dataGeneration: null };
    }
    var n = Number(gen);
    return {
      items: parsed.items,
      dataGeneration: (isFinite(n) ? n : null)
    };
  } catch (e) {
    return null;
  }
}

/**
 * 全問と世代が揃っているか（省略判定用。容量不足で書けなかった世代なしは不可）
 * @param {{items?: Array, dataGeneration?: number|null}|null} bundle
 * @returns {boolean}
 */
function hasCompleteLocalStudyData(bundle) {
  return !!(bundle && bundle.items && bundle.items.length &&
    bundle.dataGeneration != null && isFinite(Number(bundle.dataGeneration)));
}

/**
 * 端末に保存した全問データを読む
 * @returns {Array|null}
 */
function readLocalAllStudyItems() {
  var bundle = readLocalStudyBundle();
  return bundle && bundle.items && bundle.items.length ? bundle.items : null;
}

/**
 * 全問データを端末へ保存（容量超過時は静かに失敗し、次回は省略しない）
 * @param {Array} items
 * @param {number|null} [dataGeneration]
 */
function writeLocalStudyBundle(items, dataGeneration) {
  var gen = dataGeneration;
  if (gen == null) {
    var prev = readLocalStudyBundle();
    gen = prev ? prev.dataGeneration : null;
  }
  try {
    localStorage.setItem(getAllStudyItemsLocalStorageKey(), JSON.stringify({
      savedAt: Date.now(),
      dataGeneration: gen,
      items: items || []
    }));
    localStudy.persistOk = true;
    setMemoryAllStudyItems(items || []);
  } catch (e) {
    localStudy.persistOk = false;
    console.warn('全問データの端末キャッシュ保存に失敗:', e);
  }
}

/**
 * Ans／編集後：端末全問の当該行と世代を更新する
 * @param {string} id
 * @param {Object} fields
 * @param {number} [dataGeneration]
 */
function patchLocalStudyItemFields(id, fields, dataGeneration) {
  if (!id || !fields) {
    return;
  }
  var items = getMemoryAllStudyItems().slice();
  var found = false;
  for (var i = 0; i < items.length; i++) {
    if (String(items[i].id) === String(id)) {
      var keys = Object.keys(fields);
      for (var k = 0; k < keys.length; k++) {
        items[i][keys[k]] = fields[keys[k]];
      }
      found = true;
      break;
    }
  }
  if (found) {
    writeLocalStudyBundle(items, dataGeneration);
    rebuildCategoryDataByNoFromItems(items);
  } else if (dataGeneration != null) {
    var bundle = readLocalStudyBundle();
    if (bundle && bundle.items) {
      writeLocalStudyBundle(bundle.items, dataGeneration);
    }
  }
}

/**
 * List の「読み込み中...」とカテゴリスピナーを解除
 * @param {string} [fallbackMessage] - 解除後に出すメッセージ（任意）
 */
function clearAllStudyItemsLoadingUi(fallbackMessage) {
  hideCategoryLoadingSpinner();
  var listMessage = document.getElementById(
    studyEnd.done ? 'completionListMessage' : 'listMessage'
  );
  if (!listMessage) {
    return;
  }
  if (fallbackMessage) {
    listMessage.style.display = 'block';
    listMessage.textContent = fallbackMessage;
    return;
  }
  if (listMessage.textContent === '読み込み中...') {
    listMessage.style.display = 'none';
    listMessage.textContent = '';
  }
}

/**
 * 全問取得の一時失敗か
 * @param {*} error
 * @returns {boolean}
 */
function isTransientAllStudyItemsError(error) {
  if (!error) {
    return false;
  }
  var msg = String(error.message || error.toString() || '');
  if (/Failed to fetch|NetworkError|network error|Load failed|タイムアウト/i.test(msg)) {
    return true;
  }
  if (/ネットワークエラー:\s*(404|408|425|429|5\d\d)\b/.test(msg)) {
    return true;
  }
  return false;
}

/**
 * 応答ボディを読みつつ進捗を返す（Content-Length が無い場合は受信バイトのみ）
 * @param {Response} response
 * @param {function(number, number): void} [onProgress]
 * @returns {Promise<Object>}
 */
function parseJsonResponseWithProgress(response, onProgress) {
  var total = Number(response.headers.get('Content-Length') || 0);
  if (!response.body || typeof response.body.getReader !== 'function') {
    if (typeof onProgress === 'function') {
      onProgress(0, total);
    }
    return response.json();
  }
  var reader = response.body.getReader();
  var chunks = [];
  var received = 0;
  function pump() {
    return reader.read().then(function(result) {
      if (result.done) {
        var bytes = new Uint8Array(received);
        var offset = 0;
        for (var i = 0; i < chunks.length; i++) {
          bytes.set(chunks[i], offset);
          offset += chunks[i].length;
        }
        var text = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(text);
      }
      chunks.push(result.value);
      received += result.value.byteLength;
      if (typeof onProgress === 'function') {
        onProgress(received, total);
      }
      return pump();
    });
  }
  return pump();
}

/**
 * 学習記録だけを取り出す（本文は含めない）
 * @param {Object} source
 * @returns {Object|null}
 */
function pickStudyStatFields(source) {
  if (!source) {
    return null;
  }
  var out = null;
  for (var i = 0; i < STUDY_STAT_FIELD_KEYS.length; i++) {
    var key = STUDY_STAT_FIELD_KEYS[i];
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (!out) {
        out = {};
      }
      out[key] = source[key];
    }
  }
  return out;
}

/**
 * シート更新の成功時に、学習記録と世代を残す
 * @param {string} id
 * @param {Object} fields
 * @param {number} dataGeneration
 */
function recordCompletedSheetStudyWrite(id, fields, dataGeneration) {
  var picked = pickStudyStatFields(fields);
  if (!id || !picked) {
    return;
  }
  var gen = Number(dataGeneration);
  localStudy.writeLog.push({
    id: String(id),
    fields: picked,
    dataGeneration: isFinite(gen) ? gen : null
  });
}

/**
 * 全問配列の当該行へ学習記録だけを重ねる
 * @param {Array} items
 * @param {string} id
 * @param {Object} fields
 */
function overlayStudyStatFields(items, id, fields) {
  var picked = pickStudyStatFields(fields);
  if (!items || !picked) {
    return;
  }
  var idText = String(id);
  for (var i = 0; i < items.length; i++) {
    if (!items[i] || String(items[i].id) !== idText) {
      continue;
    }
    var copy = {};
    var srcKeys = Object.keys(items[i]);
    for (var s = 0; s < srcKeys.length; s++) {
      copy[srcKeys[s]] = items[i][srcKeys[s]];
    }
    var keys = Object.keys(picked);
    for (var k = 0; k < keys.length; k++) {
      copy[keys[k]] = picked[keys[k]];
    }
    items[i] = copy;
    return;
  }
}

/**
 * 未送信・送信中の Ans が持つ学習記録
 * @returns {Array<{id: string, fields: Object}>}
 */
function collectInFlightAnsStudyOverlays() {
  var list = [];
  if (ansSheetPersist.pending && ansSheetPersist.pending.item && ansSheetPersist.pending.item.id != null) {
    var pendingFields = pickStudyStatFields(ansSheetPersist.pending.item);
    if (pendingFields) {
      list.push({ id: ansSheetPersist.pending.item.id, fields: pendingFields });
    }
  }
  for (var i = 0; i < gasSheetUpdate.queue.length; i++) {
    var job = gasSheetUpdate.queue[i];
    if (!job || !job.studyOverlay || job.id == null) {
      continue;
    }
    list.push({ id: job.id, fields: job.studyOverlay });
  }
  return list;
}

/**
 * 全問応答を端末へ書く前に、古い世代は捨て、新しい Ans の学習記録は残す
 * @param {Array} items
 * @param {{dataGeneration?: number}} meta
 * @param {number} guardStart
 * @returns {{items: Array, meta: Object}|null}
 */
function reconcileAllStudyItemsWithLocalAns(items, meta, guardStart) {
  var local = readLocalStudyBundle();
  var localGen = (local && local.dataGeneration != null) ? Number(local.dataGeneration) : null;
  var respGen = (meta && meta.dataGeneration != null) ? Number(meta.dataGeneration) : null;
  var localGenOk = localGen != null && !isNaN(localGen);
  var respGenOk = respGen != null && !isNaN(respGen);
  if (localGenOk && respGenOk && respGen < localGen) {
    return null;
  }
  var nextItems = (items || []).slice();
  var start = guardStart > 0 ? guardStart : 0;
  for (var i = start; i < localStudy.writeLog.length; i++) {
    var entry = localStudy.writeLog[i];
    if (!entry) {
      continue;
    }
    if (respGenOk && entry.dataGeneration != null && respGen > entry.dataGeneration) {
      continue;
    }
    overlayStudyStatFields(nextItems, entry.id, entry.fields);
  }
  var inflight = collectInFlightAnsStudyOverlays();
  for (var j = 0; j < inflight.length; j++) {
    overlayStudyStatFields(nextItems, inflight[j].id, inflight[j].fields);
  }
  return { items: nextItems, meta: meta || {} };
}

/**
 * GAS getAllStudyItems をタイムアウト付きで取得（一時失敗は自動リトライ）
 * @param {function(*, Array|null, Object=): void} onDone - (error, items, meta)
 * @param {{noRetryNotFound?: boolean}} [options] - true のとき HTTP 404 は再試行しない
 */
function fetchAllStudyItemsFromServer(onDone, options) {
  options = options || {};
  var guardStart = localStudy.writeLog.length;
  function deliver(err, items, meta) {
    if (typeof onDone !== 'function') {
      return;
    }
    if (err || !items || !items.length) {
      onDone(err, items || null, meta);
      return;
    }
    var reconciled = reconcileAllStudyItemsWithLocalAns(items, meta, guardStart);
    if (!reconciled) {
      onDone(null, null, {
        droppedStale: true,
        dataGeneration: meta && meta.dataGeneration
      });
      return;
    }
    onDone(null, reconciled.items, reconciled.meta);
  }
  function attempt(attemptIndex) {
    beginLoadDiag('run', '全問', ALL_STUDY_ITEMS_FETCH_MAX_ATTEMPTS, { attempt: attemptIndex, kind: 'all' });
    updateAllStudyFetchProgress(0, 0);
    var controller = null;
    var timeoutId = null;
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timeoutId = setTimeout(function() {
        try {
          controller.abort();
        } catch (eAbort) {
          // ignore
        }
      }, ALL_STUDY_ITEMS_FETCH_TIMEOUT_MS);
    }

    var params = new URLSearchParams();
    params.append('action', 'getAllStudyItems');
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params, {
      signal: controller ? controller.signal : null,
      readJson: function(response) {
        return parseJsonResponseWithProgress(response, updateAllStudyFetchProgress);
      }
      })
      .then(function(data) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (!data || !data.success) {
          throw new Error((data && data.error) || 'データの取得に失敗しました');
        }
        var bytes = approxJsonBytes(data);
        finishLoadDiag('run', 'OK', { ok: true, bytes: bytes, kind: 'all' });
        if (typeof onDone === 'function') {
          deliver(null, data.items || [], {
            dataGeneration: data.dataGeneration
          });
        }
      })
      .catch(function(error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        var err = error;
        if (error && (error.name === 'AbortError' || isAbortError(error))) {
          err = new Error('タイムアウト: 全問データの取得が時間切れです');
        }
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(err)
        });
        var notFound = /ネットワークエラー:\s*404\b/.test(String(err && (err.message || err) || ''));
        if (
          attemptIndex + 1 < ALL_STUDY_ITEMS_FETCH_MAX_ATTEMPTS &&
          isTransientAllStudyItemsError(err) &&
          !(options.noRetryNotFound && notFound)
        ) {
          var delay = ALL_STUDY_ITEMS_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
          setTimeout(function() {
            attempt(attemptIndex + 1);
          }, delay);
          return;
        }
        finishLoadDiag('run', loadDiagStatusFromError(err), { ok: false });
        if (typeof onDone === 'function') {
          deliver(err, null);
        }
      });
  }

  attempt(0);
}

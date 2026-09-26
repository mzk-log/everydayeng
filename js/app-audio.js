// 音声キャッシュをクリア
function clearAudioCache() {
  // メモリキャッシュをクリア
  audioCache = {};
  
  // localStorageのキャッシュをクリア
  try {
    var keysToRemove = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(function(key) {
      localStorage.removeItem(key);
    });
  } catch (e) {
    console.warn('キャッシュのクリアに失敗しました。', e);
  }
}

/**
 * 出題／解答欄の再生ボタン参照を返す
 * @param {string} fieldType - 'question' | 'answer'
 * @returns {HTMLElement|null}
 */
function getFieldPlayButton(fieldType) {
  return document.getElementById(fieldType === 'answer' ? 'answerPlayButton' : 'questionPlayButton');
}

/**
 * 再生ボタンに短押し再生／長押し再作成を割り当て（マウス・タッチ両対応）
 * @param {HTMLElement|null} button
 * @param {string} fieldType - 'question' | 'answer'
 */
function bindFieldPlayButton(button, fieldType) {
  if (!button) return;
  
  var pressTimer = null;
  var longPressFired = false;
  var pressActive = false;
  var activePointerId = null;
  
  function clearPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
    button.classList.remove('is-long-pressing');
  }
  
  button.addEventListener('pointerdown', function(e) {
    if (button.disabled) return;
    if (typeof e.button === 'number' && e.button !== 0) return;
    
    pressActive = true;
    longPressFired = false;
    activePointerId = e.pointerId;
    clearPressTimer();
    
    try {
      button.setPointerCapture(e.pointerId);
    } catch (err) {
      // ignore
    }
    
    pressTimer = setTimeout(function() {
      pressTimer = null;
      if (!pressActive || button.disabled) return;
      longPressFired = true;
      button.classList.add('is-long-pressing');
      if (navigator.vibrate) {
        try { navigator.vibrate(30); } catch (err) { /* ignore */ }
      }
      recreateFieldAudio(fieldType);
      button.classList.remove('is-long-pressing');
    }, FIELD_PLAY_LONG_PRESS_MS);
  });
  
  function handlePressEnd(e) {
    if (activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) {
      return;
    }
    var wasActive = pressActive;
    var wasLong = longPressFired;
    clearPressTimer();
    pressActive = false;
    activePointerId = null;
    
    try {
      if (e.pointerId != null && button.hasPointerCapture && button.hasPointerCapture(e.pointerId)) {
        button.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // ignore
    }
    
    if (!wasActive || wasLong || button.disabled) return;
    playFieldAudio(fieldType, false);
  }
  
  button.addEventListener('pointerup', handlePressEnd);
  button.addEventListener('pointercancel', function(e) {
    if (activePointerId != null && e.pointerId != null && e.pointerId !== activePointerId) {
      return;
    }
    longPressFired = true; // 短押し再生を抑止
    clearPressTimer();
    pressActive = false;
    activePointerId = null;
  });
  
  // click は pointer で処理済み（二重発火防止）
  button.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });
  
  // 長押し時のコンテキストメニューを抑止
  button.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
}

/**
 * 出題／解答の再生ボタン有効／無効を更新
 * 出題再生＝下ナビ（リトライとHOMEの間）、解答再生＝下ナビ左。無効時も枠維持し薄い表示（is-inactive）
 */
function updateFieldPlayButtons() {
  var item = getCurrentLearningItem();
  var qBtn = getFieldPlayButton('question');
  var aBtn = getFieldPlayButton('answer');
  var questionPlaySlot = dom.navQuestionPlaySlot;
  var answerPlaySlot = dom.navAnswerPlaySlot;
  
  function isLoading(btn) {
    return !!(btn && btn.querySelector('.play-button-spinner'));
  }
  
  if (!item || studyEnd.done) {
    if (qBtn && !isLoading(qBtn)) qBtn.disabled = true;
    if (aBtn && !isLoading(aBtn)) aBtn.disabled = true;
    if (questionPlaySlot) {
      questionPlaySlot.classList.add('is-inactive');
    }
    if (answerPlaySlot) {
      answerPlaySlot.classList.add('is-inactive');
    }
    // 学習完了時はナビの再入更新ループを避ける
    if (!studyEnd.done) {
      refreshAdvanceNavControls();
    }
    return;
  }
  
  var qText = getEffectiveQuestion(item);
  var audioBusy = fieldPlay.field !== null;
  var canPlayQuestion = !!qText && !isImageUrl(qText) && !audioBusy;
  if (qBtn && !isLoading(qBtn)) {
    qBtn.disabled = !canPlayQuestion;
  }
  if (questionPlaySlot) {
    questionPlaySlot.classList.toggle('is-inactive', !canPlayQuestion || isLoading(qBtn));
  }
  
  var aText = getEffectiveAnswer(item);
  var canPlayAnswer = !!questionCursor.answerShown && !!aText && !isImageUrl(aText) && !audioBusy;
  if (aBtn && !isLoading(aBtn)) {
    aBtn.disabled = !canPlayAnswer;
  }
  if (answerPlaySlot) {
    // 取得中スピナー表示中は操作不可だが、枠は維持（薄い表示）
    answerPlaySlot.classList.toggle('is-inactive', !canPlayAnswer || isLoading(aBtn));
  }
  
  refreshAdvanceNavControls();
}

/**
 * 出題／解答の TTS 取得中または再生中か
 * @returns {boolean}
 */
function isFieldAudioBusy() {
  return fieldPlay.field !== null;
}

/**
 * 効果音または本問音声のあいだ、START／Ans／Next／End を止めるか
 * @returns {boolean}
 */
function isNavActionLockedByAudio() {
  return uiSfx.clickPlaying || isFieldAudioBusy();
}

/**
 * Audio に紐づく Object URL を解放する
 * @param {HTMLAudioElement|null} audio
 */
function revokeAudioObjectUrl(audio) {
  if (!audio || !audio._objectUrl) {
    return;
  }
  try {
    URL.revokeObjectURL(audio._objectUrl);
  } catch (e) {
    // ignore
  }
  audio._objectUrl = null;
}

function clearAudioBusyWatchdogs_() {
  if (audioWatch.busyTimer) {
    clearTimeout(audioWatch.busyTimer);
    audioWatch.busyTimer = null;
  }
  if (audioWatch.pauseTimer) {
    clearTimeout(audioWatch.pauseTimer);
    audioWatch.pauseTimer = null;
  }
  if (audioWatch.playStartTimer) {
    clearTimeout(audioWatch.playStartTimer);
    audioWatch.playStartTimer = null;
  }
}

/**
 * 再生残り時間から操作復帰の期限を決める
 * @param {HTMLAudioElement|null} audio
 * @returns {number}
 */
function getAudioBusyDeadlineMs_(audio) {
  var d = audio && audio.duration;
  if (typeof d === 'number' && isFinite(d) && d > 0) {
    var remain = d - (audio.currentTime || 0);
    if (remain < 0) {
      remain = 0;
    }
    return Math.ceil(remain * 1000) + AUDIO_PLAY_END_GRACE_MS;
  }
  return AUDIO_PLAY_UNKNOWN_DURATION_MS;
}

function armAudioBusyWatchdog_(audio) {
  if (audioWatch.busyTimer) {
    clearTimeout(audioWatch.busyTimer);
    audioWatch.busyTimer = null;
  }
  var ms = getAudioBusyDeadlineMs_(audio);
  audioWatch.busyTimer = setTimeout(function() {
    audioWatch.busyTimer = null;
    forceReleaseFieldAudioBusy_('fail');
  }, ms);
}

/**
 * 音声 busy を強制解除（エラーバナーは出さない）
 * @param {string} [reason]
 */
function forceReleaseFieldAudioBusy_(reason) {
  var field = fieldPlay.field;
  clearAudioBusyWatchdogs_();
  if (field == null && !fieldPlay.audio) {
    return;
  }
  fieldPlay.field = null;
  releaseCurrentAudioElement();
  if (field) {
    hidePlayButtonLoading(field);
  } else {
    hidePlayButtonLoading('question');
    hidePlayButtonLoading('answer');
  }
  updateFieldPlayButtons();
  if (field === 'question') {
    onQuestionAudioSettled(reason || 'fail');
  }
  audioPrefetch.playBlocked = false;
  scheduleAudioPrefetch();
  processGasAudioFetchQueue();
}

/**
 * 現在の Audio 要素を停止し、Object URL／src を解放する
 */
function releaseCurrentAudioElement() {
  if (!fieldPlay.audio) {
    return;
  }
  var audio = fieldPlay.audio;
  fieldPlay.audio = null;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch (e) {
    // ignore
  }
  revokeAudioObjectUrl(audio);
  try {
    audio.removeAttribute('src');
    audio.load();
  } catch (e) {
    // ignore
  }
}

/**
 * base64 文字列を Uint8Array に変換する
 * @param {string} base64
 * @returns {Uint8Array}
 */
function decodeBase64ToUint8Array(base64) {
  var raw = String(base64 || '').replace(/\s/g, '');
  var binary = atob(raw);
  var len = binary.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * メモリ上の audioData に mp3 Blob を載せ、再利用する（再生ごとの base64 再デコードを避ける）
 * @param {Object} audioData
 * @returns {Blob|null}
 */
function ensureMp3BlobOnAudioData(audioData) {
  if (!audioData) {
    return null;
  }
  if (audioData.blob instanceof Blob && audioData.blob.size > 0) {
    return audioData.blob;
  }
  if (!audioData.audioContent) {
    return null;
  }
  var bytes = decodeBase64ToUint8Array(audioData.audioContent);
  audioData.blob = new Blob([bytes], { type: 'audio/mpeg' });
  return audioData.blob;
}

/**
 * audioData の Blob から Object URL 付き Audio を生成する
 * @param {Object} audioData
 * @returns {HTMLAudioElement}
 */
function createMp3AudioFromAudioData(audioData) {
  var blob = ensureMp3BlobOnAudioData(audioData);
  if (!blob) {
    throw new Error('empty audio');
  }
  var objectUrl = URL.createObjectURL(blob);
  var audio = new Audio();
  audio.preload = 'auto';
  audio._objectUrl = objectUrl;
  audio.src = objectUrl;
  return audio;
}

/**
 * canplay 後（または短時間タイムアウト後）に再生する
 * @param {HTMLAudioElement} audio
 * @returns {Promise}
 */
function playAudioElementWhenReady(audio) {
  return new Promise(function(resolve, reject) {
    var settled = false;
    var timer = null;

    function cleanup() {
      audio.removeEventListener('canplay', onReady);
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function finishReady() {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve();
    }

    function onReady() {
      finishReady();
    }

    function onError() {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(audio.error || new Error('audio error'));
    }

    if (audio.readyState >= 3) {
      finishReady();
      return;
    }

    audio.addEventListener('canplay', onReady);
    audio.addEventListener('canplaythrough', onReady);
    audio.addEventListener('error', onError);
    timer = setTimeout(finishReady, AUDIO_PLAY_CANPLAY_TIMEOUT_MS);
  }).then(function() {
    if (fieldPlay.audio !== audio) {
      var abortErr = new Error('interrupted by a call to pause');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    return audio.play();
  });
}

/**
 * 進行中の音声取得を無効化し、キューを空にする
 */
function invalidateGasAudioFetches() {
  audioFetch.generation += 1;
  audioFetch.queue = [];
  audioFetch.prefetchQueue = [];
  audioPrefetch.playBlocked = false;
  if (audioFetch.abort) {
    try {
      audioFetch.abort.abort();
    } catch (e) {
      // ignore
    }
    audioFetch.abort = null;
  }
}

/**
 * 実行中の先読みだけ中断する（本問の generation は変えない）
 */
function abortRunningAudioPrefetch() {
  audioFetch.prefetchQueue = [];
  if (audioFetch.prefetchRunning && audioFetch.abort) {
    try {
      audioFetch.abort.abort();
    } catch (e) {
      // ignore
    }
  }
}

/**
 * 音声取得ジョブを直列キューへ追加（同時1本）
 * @param {function(AbortSignal|null, number, function(): void): void} taskFn
 * @param {{prefetch?: boolean}} [options]
 */
function enqueueGasAudioFetch(taskFn, options) {
  if (typeof taskFn !== 'function') {
    return;
  }
  options = options || {};
  if (options.prefetch) {
    if (!ENABLE_AUDIO_PREFETCH || audioPrefetch.stopped) {
      return;
    }
    audioFetch.prefetchQueue.push(taskFn);
  } else {
    abortRunningAudioPrefetch();
    audioPrefetch.playBlocked = true;
  audioFetch.queue.push(taskFn);
  }
  processGasAudioFetchQueue();
}

function processGasAudioFetchQueue() {
  if (audioFetch.running) {
    return;
  }
  var task = null;
  var isPrefetch = false;
  if (audioFetch.queue.length > 0) {
    task = audioFetch.queue.shift();
  } else if (
    ENABLE_AUDIO_PREFETCH &&
    !audioPrefetch.stopped &&
    !audioPrefetch.playBlocked &&
    !isFieldAudioBusy() &&
    audioFetch.prefetchQueue.length > 0
  ) {
    task = audioFetch.prefetchQueue.shift();
    isPrefetch = true;
  }
  if (!task) {
    if (!isFieldAudioBusy()) {
      audioPrefetch.playBlocked = false;
    }
    return;
  }

  audioFetch.running = true;
  audioFetch.prefetchRunning = isPrefetch;
  var generation = audioFetch.generation;
  var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  audioFetch.abort = controller;
  var finished = false;

  function done() {
    if (finished) {
      return;
    }
    finished = true;
    if (audioFetch.abort === controller) {
      audioFetch.abort = null;
    }
    audioFetch.running = false;
    audioFetch.prefetchRunning = false;
    if (!isPrefetch) {
      audioPrefetch.playBlocked = audioFetch.queue.length > 0;
    }
    processGasAudioFetchQueue();
    if (!isPrefetch && audioFetch.queue.length === 0 && !isFieldAudioBusy()) {
      audioPrefetch.playBlocked = false;
      scheduleAudioPrefetch();
    } else if (
      isPrefetch &&
      audioFetch.prefetchQueue.length === 0 &&
      audioFetch.queue.length === 0 &&
      !isFieldAudioBusy()
    ) {
      onAudioPrefetchQueueIdle_();
    }
  }

  try {
    task(controller ? controller.signal : null, generation, done);
  } catch (e) {
    done();
  }
}

/**
 * 音声取得の中断時UI復帰（切替・停止時。時間打ち切りは行わない）
 * @param {string} fieldType
 */
function handleAudioFetchAbortOrTimeout(fieldType) {
  hidePlayButtonLoading(fieldType);
  fieldPlay.field = null;
  updateFieldPlayButtons();
  refreshAdvanceNavControls();
  if (fieldType === 'question') {
    onQuestionAudioSettled('abort');
  }
}

/**
 * fetch が Abort か判定
 * @param {*} error
 * @returns {boolean}
 */
function isAbortError(error) {
  if (!error) {
    return false;
  }
  if (error.name === 'AbortError' || error.code === 20) {
    return true;
  }
  var msg = String(error.message || error);
  return /interrupted by a call to pause/i.test(msg);
}

/**
 * 再生中の音声を停止し、欄の再生ボタン状態を戻す
 * @param {{ skipButtonUpdate?: boolean, preserveBusy?: boolean, keepAudioQueue?: boolean }} [options]
 */
function stopCurrentAudioPlayback(options) {
  options = options || {};
  var prevField = fieldPlay.field;
  clearAudioBusyWatchdogs_();
  releaseCurrentAudioElement();
  if (!options.preserveBusy) {
    fieldPlay.field = null;
  }
  if (!options.keepAudioQueue) {
    invalidateGasAudioFetches();
  }
  if (prevField) {
    var prevBtn = getFieldPlayButton(prevField);
    if (prevBtn && prevBtn.querySelector('.play-button-spinner')) {
      hidePlayButtonLoading(prevField);
      if (!options.skipButtonUpdate) {
        updateFieldPlayButtons();
      }
      return;
    }
  }
  if (!options.skipButtonUpdate) {
    updateFieldPlayButtons();
  }
}

/**
 * 表示上の出題／解答をシート列（question／answer）に変換
 * @param {string} displayFieldType - 'question' | 'answer'
 * @returns {string}
 */
function getSheetAudioFieldType(displayFieldType) {
  if (isSwapQAEnabled()) {
    return displayFieldType === 'question' ? 'answer' : 'question';
  }
  return displayFieldType === 'answer' ? 'answer' : 'question';
}

/**
 * 問題の Category_No を解決
 * @param {Object} item
 * @returns {string|number|null}
 */
function resolveItemCategoryNo(item) {
  if (item && item.category_no != null && String(item.category_no) !== '') {
    return item.category_no;
  }
  if (categoryCatalog.no != null && categoryCatalog.no !== '') {
    return categoryCatalog.no;
  }
  return null;
}

/**
 * Drive 音声メタとして使えるか
 * @param {Object} item
 * @returns {boolean}
 */
function canUseDriveAudioMeta(item) {
  if (!item || item.id == null || String(item.id) === '') {
    return false;
  }
  if (item.no == null || String(item.no) === '') {
    return false;
  }
  var catNo = resolveItemCategoryNo(item);
  return catNo != null && String(catNo) !== '';
}

/**
 * 指定テキストのローカル音声キャッシュを声・速さ違い含めて削除
 * @param {string} text
 */
function clearLocalAudioCachesForText(text) {
  if (!text) {
    return;
  }
  var genders = ['female', 'male'];
  var speeds = ['fast', 'medium', 'slow'];
  for (var i = 0; i < genders.length; i++) {
    for (var j = 0; j < speeds.length; j++) {
      removeCachedAudio(text, genders[i], speeds[j]);
    }
  }
}

/**
 * Drive へ音声を保存（失敗は無視）
 * @param {Object} item
 * @param {string} sheetField
 * @param {string} voiceGender
 * @param {string} speed
 * @param {string} audioContent
 */
function saveDriveAudioAsync(item, sheetField, voiceGender, speed, audioContent) {
  if (!canUseDriveAudioMeta(item) || !audioContent || !googleAuth.email) {
    return;
  }
  if (sheetField !== 'question' && sheetField !== 'answer') {
    return;
  }
  try {
    var params = new URLSearchParams();
    params.append('action', 'saveDriveAudio');
    params.append('id', String(item.id));
    params.append('categoryNo', String(resolveItemCategoryNo(item)));
    params.append('no', String(item.no));
    params.append('field', sheetField);
    params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
    params.append('speed', speed || AUDIO_SPEED_FIXED);
    params.append('audioContent', audioContent);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params).catch(function() {
      // Drive失敗は学習を止めない
    });
  } catch (e) {
    // ignore
  }
}

/**
 * Drive 上の当該フィールド音声を削除（失敗は無視）
 * @param {Object} item
 * @param {string} sheetField
 */
function deleteDriveAudioAsync(item, sheetField) {
  if (!canUseDriveAudioMeta(item) || !googleAuth.email) {
    return;
  }
  if (sheetField !== 'question' && sheetField !== 'answer') {
    return;
  }
  try {
    var params = new URLSearchParams();
    params.append('action', 'deleteDriveAudio');
    params.append('id', String(item.id));
    params.append('categoryNo', String(resolveItemCategoryNo(item)));
    params.append('no', String(item.no));
    params.append('field', sheetField);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params).catch(function() {
      // ignore
    });
  } catch (e) {
    // ignore
  }
}

/**
 * 指定欄のテキストを読み上げる
 * @param {string} fieldType - 'question' | 'answer'
 * @param {boolean} [forceRefresh=false] - true のときキャッシュ／Driveを使わず再生成
 * @param {{onSettled?: function(): void}} [options] - ネット取得不要または完了時（キャッシュヒット含む）
 */
function playFieldAudio(fieldType, forceRefresh, options) {
  if (uiSfx.clickPlaying) {
    runAfterUiClickSfx(function() {
      playFieldAudio(fieldType, forceRefresh, options);
    });
    return;
  }
  options = options || {};
  var onSettled = typeof options.onSettled === 'function' ? options.onSettled : null;
  var settled = false;
  function settleAudioNetwork() {
    if (settled) {
      return;
    }
    settled = true;
    if (onSettled) {
      try {
        onSettled();
      } catch (eSettle) {
        console.warn(eSettle);
      }
    }
  }

  var item = getCurrentLearningItem();
  if (!item || studyEnd.done) {
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    settleAudioNetwork();
    return;
  }
  
  if (fieldType === 'answer' && !questionCursor.answerShown) {
    settleAudioNetwork();
    return;
  }
  
  var text = fieldType === 'answer' ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
  if (!text || isImageUrl(text)) {
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    settleAudioNetwork();
    return;
  }
  
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    showError('音声読み上げの設定が完了していません。WebアプリURLを設定してください。');
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    settleAudioNetwork();
    return;
  }
  
  // 停止〜取得開始のあいだも busy を維持（Ans直後の Q/Next 押下防止）
  stopCurrentAudioPlayback({ skipButtonUpdate: true, keepAudioQueue: false });
  fieldPlay.field = fieldType;
  updateFieldPlayButtons();
  
  var voiceGender = fieldType === 'question' ? getAudioVoice('question') : getAudioVoice('answer');
  var speed = fieldType === 'question' ? getAudioSpeed('question') : getAudioSpeed('answer');
  var sheetField = getSheetAudioFieldType(fieldType);
  
  if (!forceRefresh) {
    var cachedResult = getCachedAudio(text, voiceGender, speed);
    if (cachedResult && cachedResult.audioData) {
      beginLoadDiag('run', 'Mem', 0, {
        status: 'OK',
        bytes: cachedResult.audioData.audioContent
          ? String(cachedResult.audioData.audioContent).length
          : null
      });
      finishLoadDiag('run', 'OK', {
        ok: true,
        bytes: cachedResult.audioData.audioContent
          ? String(cachedResult.audioData.audioContent).length
          : null
      });
      setTimeout(function() {
        playAudioFromCache(cachedResult.audioData, fieldType, cachedResult.source);
      }, 0);
      settleAudioNetwork();
      return;
    }
    getCachedAudioFromIdb(text, voiceGender, speed, function(idbResult) {
      if (getCurrentLearningItem() !== item) {
          settleAudioNetwork();
        return;
      }
      if (idbResult && idbResult.audioData) {
        beginLoadDiag('run', 'IdB', 0, {
          status: 'OK',
          bytes: idbResult.audioData.audioContent
            ? String(idbResult.audioData.audioContent).length
            : null
        });
        finishLoadDiag('run', 'OK', {
          ok: true,
          bytes: idbResult.audioData.audioContent
            ? String(idbResult.audioData.audioContent).length
            : null
        });
        setTimeout(function() {
          playAudioFromCache(idbResult.audioData, fieldType, 'indexedDB');
        }, 0);
        settleAudioNetwork();
      return;
    }
      enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork);
    });
    return;
  }

  enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork);
}

/**
 * 本問の Drive／TTS 取得をキューへ（トークン更新つき）
 */
function enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork) {
  enqueueGasAudioFetch(function(signal, generation, done) {
    ensureFreshGoogleAuthToken(function() {
      if (generation !== audioFetch.generation) {
      done();
      settleAudioNetwork();
        return;
      }
      var after = function() {
        done();
        settleAudioNetwork();
      };
      if (canUseDriveAudioMeta(item)) {
        fetchAudioFromDriveOrTts(text, voiceGender, speed, fieldType, sheetField, item, signal, generation, after);
      } else {
        fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, after);
      }
    }, function() {
      done();
      settleAudioNetwork();
      if (fieldPlay.field === fieldType) {
        hidePlayButtonLoading(fieldType);
        clearAudioBusyWatchdogs_();
        fieldPlay.field = null;
        updateFieldPlayButtons();
        if (fieldType === 'question') onQuestionAudioSettled('fail');
      }
    });
  });
}

/**
 * 指定欄のキャッシュを消して音声を再作成・再生する
 * @param {string} fieldType - 'question' | 'answer'
 */
function recreateFieldAudio(fieldType) {
  var item = getCurrentLearningItem();
  if (!item || studyEnd.done) return;
  if (fieldType === 'answer' && !questionCursor.answerShown) return;
  
  var text = fieldType === 'answer' ? getEffectiveAnswer(item) : getEffectiveQuestion(item);
  if (!text || isImageUrl(text)) return;
  
  var voiceGender = fieldType === 'question' ? getAudioVoice('question') : getAudioVoice('answer');
  var speed = fieldType === 'question' ? getAudioSpeed('question') : getAudioSpeed('answer');
  
  removeCachedAudio(text, voiceGender, speed);
  playFieldAudio(fieldType, true);
}

/**
 * 指定キーの音声キャッシュをメモリ／localStorage から削除
 * @param {string} text
 * @param {string} voiceGender
 * @param {string} speed
 */
function removeCachedAudio(text, voiceGender, speed) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  if (audioCache[cacheKey]) {
    delete audioCache[cacheKey];
  }
  deleteAudioIdbRecord(audioIdbRecordId(cacheKey));
  try {
    localStorage.removeItem(CACHE_PREFIX + hashText(cacheKey));
  } catch (e) {
    // ignore
  }
  setTimeout(refreshAudioIdbStats, 0);
}

/**
 * デバッグ用：再生音声の取得元を表示（ENABLE_AUDIO_SOURCE_DEBUG が true のときのみ）
 * @param {string} source - 'memory' | 'localStorage' | 'Drive' | 'TTS'
 */
function showAudioSourceDebug(source) {
  var el = dom.audioSourceDebug;
  if (!el) {
    return;
  }
  if (ENABLE_AUDIO_SOURCE_DEBUG !== true) {
    el.style.display = 'none';
    el.textContent = '';
    return;
  }
  var labelMap = {
    memory: 'Mem',
    localStorage: 'IdB',
    indexedDB: 'IdB',
    Drive: 'Drv',
    TTS: 'TTS'
  };
  var label = labelMap[source] || String(source || '');
  el.textContent = label;
  el.style.display = 'inline-block';
}

/**
 * ヘッダーの音声取得元デバッグ表示を消す
 */
function clearAudioSourceDebug() {
  var el = dom.audioSourceDebug;
  if (!el) {
    return;
  }
  el.textContent = '';
  el.style.display = 'none';
}

function openAudioIdb() {
  if (audioDb.conn) {
    return Promise.resolve(audioDb.conn);
  }
  if (audioDb.opening) {
    return audioDb.opening;
  }
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  audioDb.opening = new Promise(function(resolve) {
    try {
      var req = indexedDB.open(AUDIO_IDB_NAME, AUDIO_IDB_VERSION);
      req.onupgradeneeded = function() {
        var db = req.result;
        if (!db.objectStoreNames.contains(AUDIO_IDB_STORE)) {
          var store = db.createObjectStore(AUDIO_IDB_STORE, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      req.onsuccess = function() {
        audioDb.conn = req.result;
        resolve(audioDb.conn);
      };
      req.onerror = function() {
        audioDb.opening = null;
        resolve(null);
      };
    } catch (e) {
      audioDb.opening = null;
      resolve(null);
    }
  });
  return audioDb.opening;
}

/**
 * @param {string} cacheKey
 * @returns {string}
 */
function audioIdbRecordId(cacheKey) {
  return hashText(cacheKey);
}

/**
 * 旧 localStorage 音声を IndexedDB へ移す
 */
function migrateLocalStorageAudioToIdb() {
  openAudioIdb().then(function(db) {
    if (!db) {
      return;
    }
    var toMove = [];
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf(CACHE_PREFIX) === 0) {
          toMove.push(key);
        }
      }
    } catch (e) {
      return;
    }
    toMove.forEach(function(key) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) {
          return;
        }
        var parsed = JSON.parse(raw);
        if (!parsed || !parsed.audioContent) {
          return;
        }
        var id = key.replace(CACHE_PREFIX, '');
        putAudioIdbRecord({
          id: id,
          audioContent: parsed.audioContent,
          timestamp: parsed.timestamp || Date.now(),
          textHash: parsed.textHash || id,
          byteLength: String(parsed.audioContent).length
        });
        localStorage.removeItem(key);
      } catch (e2) {
        // ignore
      }
    });
    refreshAudioIdbStats();
  });
}

/**
 * @param {Object} record
 */
function putAudioIdbRecord(record) {
  openAudioIdb().then(function(db) {
    if (!db || !record || !record.id) {
      return;
    }
    evictAudioIdbIfNeeded(record.byteLength || 0, function() {
      try {
        var tx = db.transaction(AUDIO_IDB_STORE, 'readwrite');
        tx.objectStore(AUDIO_IDB_STORE).put(record);
      } catch (e) {
        // ignore
      }
    });
  });
}

/**
 * @param {string} id
 * @param {function(Object|null): void} onDone
 */
function getAudioIdbRecord(id, onDone) {
  openAudioIdb().then(function(db) {
    if (!db) {
      onDone(null);
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readonly');
      var req = tx.objectStore(AUDIO_IDB_STORE).get(id);
      req.onsuccess = function() {
        onDone(req.result || null);
      };
      req.onerror = function() {
        onDone(null);
      };
  } catch (e) {
      onDone(null);
    }
  });
}

/**
 * @param {string} id
 */
function deleteAudioIdbRecord(id) {
  openAudioIdb().then(function(db) {
    if (!db || !id) {
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readwrite');
      tx.objectStore(AUDIO_IDB_STORE).delete(id);
    } catch (e) {
      // ignore
    }
  });
}

/**
 * 300MB を超えそうなら古い順に削除
 * @param {number} incomingBytes
 * @param {function(): void} onReady
 */
function evictAudioIdbIfNeeded(incomingBytes, onReady) {
  var done = typeof onReady === 'function' ? onReady : function() {};
  openAudioIdb().then(function(db) {
    if (!db) {
      done();
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readwrite');
      var store = tx.objectStore(AUDIO_IDB_STORE);
      var req = store.getAll();
      req.onsuccess = function() {
        var rows = req.result || [];
        var total = incomingBytes || 0;
        rows.forEach(function(row) {
          total += Number(row.byteLength || 0);
        });
        if (total <= MAX_AUDIO_IDB_BYTES) {
          done();
          return;
        }
        rows.sort(function(a, b) {
          return (a.timestamp || 0) - (b.timestamp || 0);
        });
        var i = 0;
        while (total > MAX_AUDIO_IDB_BYTES && i < rows.length) {
          total -= Number(rows[i].byteLength || 0);
          store.delete(rows[i].id);
          i++;
        }
        done();
      };
      req.onerror = function() {
        done();
      };
    } catch (e) {
      done();
    }
  });
}

function refreshAudioIdbStats(onDone) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  var targets = collectAudioPrefetchJobs();
  audioStock.idbTarget = targets.length;
  openAudioIdb().then(function(db) {
    if (!db) {
      audioStock.idbIds = {};
      audioStock.idbReady = 0;
      audioStock.idbBytes = 0;
      refreshLoadDiagUi();
      done();
      return;
    }
    try {
      var tx = db.transaction(AUDIO_IDB_STORE, 'readonly');
      var req = tx.objectStore(AUDIO_IDB_STORE).getAll();
      req.onsuccess = function() {
        var rows = req.result || [];
        var bytes = 0;
        var ready = 0;
        var have = {};
        rows.forEach(function(row) {
          bytes += Number(row.byteLength || 0);
          if (row && row.id) {
            have[row.id] = true;
          }
        });
        targets.forEach(function(job) {
          if (have[job.idbId]) {
            ready++;
          }
        });
        audioStock.idbIds = have;
        audioStock.idbBytes = bytes;
        audioStock.idbReady = ready;
        refreshLoadDiagUi();
        done();
      };
      req.onerror = function() {
        refreshLoadDiagUi();
        done();
      };
    } catch (e) {
      refreshLoadDiagUi();
      done();
    }
  });
}

/**
 * メモリキャッシュから取得（同期）
 */
function getCachedAudio(text, voiceGender, speed) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  if (audioCache[cacheKey]) {
    return { audioData: audioCache[cacheKey], source: 'memory' };
  }
  return null;
}

/**
 * IndexedDB から取得してメモリへ載せる
 * @param {function({ audioData: Object, source: string }|null): void} onDone
 */
function getCachedAudioFromIdb(text, voiceGender, speed, onDone) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  var mem = getCachedAudio(text, voiceGender, speed);
  if (mem) {
    onDone(mem);
    return;
  }
  getAudioIdbRecord(audioIdbRecordId(cacheKey), function(record) {
    if (!record || !record.audioContent) {
      onDone(null);
      return;
    }
    var audioData = {
      audioContent: record.audioContent,
      timestamp: record.timestamp,
      textHash: record.textHash
    };
    ensureMp3BlobOnAudioData(audioData);
    audioCache[cacheKey] = audioData;
    onDone({ audioData: audioData, source: 'indexedDB' });
  });
}

/**
 * 音声データをキャッシュに保存
 */
function saveAudioToCache(text, audioContent, voiceGender, speed) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  var audioData = {
    audioContent: audioContent,
    timestamp: Date.now(),
    textHash: hashText(cacheKey)
  };
  ensureMp3BlobOnAudioData(audioData);
  audioCache[cacheKey] = audioData;
  putAudioIdbRecord({
    id: audioIdbRecordId(cacheKey),
    audioContent: audioContent,
    timestamp: audioData.timestamp,
    textHash: audioData.textHash,
    byteLength: String(audioContent || '').length
  });
  setTimeout(refreshAudioIdbStats, 0);
  return audioData;
}

/**
 * TTS用にテキストを正規化
 * - 前後の空白を削除
 * - 特殊な空白文字を通常のスペースに変換
 * - 連続する空白を1つに正規化
 */
function normalizeTextForTTS(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  // 1. 前後の空白を削除
  var normalized = text.trim();
  
  // 2. 特殊な空白文字を通常のスペース（U+0020）に変換
  // 全角スペース（U+3000）、タブ（U+0009）、改行（U+000A, U+000D）、
  // ノンブレーキングスペース（U+00A0）などを通常のスペースに変換
  normalized = normalized.replace(/[\u3000\u0009\u000A\u000D\u00A0\u2000-\u200B\u2028\u2029]/g, ' ');
  
  // 3. 連続する空白を1つに正規化（2文字以上の空白を1文字に）
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * テキストをハッシュ化（localStorageのキー用）
 */
function hashText(text) {
  var hash = 0;
  for (var i = 0; i < text.length; i++) {
    var char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * キャッシュから音声を再生
 * @param {Object} audioData - キャッシュ音声データ
 * @param {string} fieldType - 'question' | 'answer'
 * @param {string} [source]
 */
function playAudioFromCache(audioData, fieldType, source) {
  if (!audioData || !audioData.audioContent) {
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    if (fieldPlay.field === fieldType) {
      clearAudioBusyWatchdogs_();
      fieldPlay.field = null;
      updateFieldPlayButtons();
    }
    return;
  }

  if (source) {
    showAudioSourceDebug(source);
  }
  
  try {
    clearAudioBusyWatchdogs_();
    releaseCurrentAudioElement();
    
    var audio = createMp3AudioFromAudioData(audioData);
    fieldPlay.audio = audio;
    fieldPlay.field = fieldType || null;
    updateFieldPlayButtons();
    
    var playbackStarted = false;

    function isThisAudio_() {
      return fieldPlay.audio === audio;
    }

    function settleThisPlay_(reason) {
      clearAudioBusyWatchdogs_();
      if (!isThisAudio_() && fieldPlay.field !== fieldType) {
        return;
      }
      if (isThisAudio_()) {
      fieldPlay.field = null;
      releaseCurrentAudioElement();
      } else if (fieldPlay.field === fieldType) {
        fieldPlay.field = null;
      }
      updateFieldPlayButtons();
      if (fieldType === 'question') {
        onQuestionAudioSettled(reason);
      }
      if (reason === 'ended' || reason === 'fail') {
        audioPrefetch.playBlocked = false;
        scheduleAudioPrefetch();
        processGasAudioFetchQueue();
      }
    }
    
    audio.addEventListener('ended', function() {
      if (!isThisAudio_()) return;
      settleThisPlay_('ended');
    });
    
    audio.addEventListener('error', function() {
      if (!isThisAudio_()) return;
      settleThisPlay_('fail');
    });

    audio.addEventListener('loadedmetadata', function() {
      if (!isThisAudio_()) return;
      if (audioWatch.busyTimer) {
        armAudioBusyWatchdog_(audio);
      }
    });

    audio.addEventListener('playing', function() {
      if (!isThisAudio_()) return;
      playbackStarted = true;
      if (audioWatch.pauseTimer) {
        clearTimeout(audioWatch.pauseTimer);
        audioWatch.pauseTimer = null;
      }
      if (audioWatch.playStartTimer) {
        clearTimeout(audioWatch.playStartTimer);
        audioWatch.playStartTimer = null;
      }
      armAudioBusyWatchdog_(audio);
    });

    audio.addEventListener('pause', function() {
      if (!isThisAudio_()) return;
      if (!playbackStarted) return;
      if (audio.ended) return;
      if (audioWatch.pauseTimer) {
        clearTimeout(audioWatch.pauseTimer);
      }
      audioWatch.pauseTimer = setTimeout(function() {
        audioWatch.pauseTimer = null;
        if (!isThisAudio_()) return;
        if (!audio.paused || audio.ended) return;
        settleThisPlay_('fail');
      }, AUDIO_PAUSE_STUCK_MS);
    });

    audioWatch.playStartTimer = setTimeout(function() {
      audioWatch.playStartTimer = null;
      if (!isThisAudio_()) return;
      settleThisPlay_('fail');
    }, AUDIO_PLAY_START_TIMEOUT_MS);
    
    playAudioElementWhenReady(audio).then(function() {
      if (audioWatch.playStartTimer) {
        clearTimeout(audioWatch.playStartTimer);
        audioWatch.playStartTimer = null;
      }
      if (!isThisAudio_()) return;
      armAudioBusyWatchdog_(audio);
    }).catch(function(error) {
      if (isAbortError(error)) {
        settleThisPlay_('abort');
        return;
      }
      showError('音声の再生に失敗しました: ' + error.toString());
      settleThisPlay_('fail');
    });
  } catch (error) {
    showError('音声の再生に失敗しました: ' + error.toString());
    clearAudioBusyWatchdogs_();
    fieldPlay.field = null;
    releaseCurrentAudioElement();
    updateFieldPlayButtons();
    if (fieldType === 'question') onQuestionAudioSettled('fail');
  }
}

/**
 * ローディング表示を開始
 * @param {string} fieldType - 'question' | 'answer'
 */
function showPlayButtonLoading(fieldType) {
  var playButton = getFieldPlayButton(fieldType);
  if (playButton) {
    playButton.disabled = true;
    var spinner = document.createElement('div');
    spinner.className = 'play-button-spinner';
    playButton.innerHTML = '';
    playButton.appendChild(spinner);
  }
}

/**
 * ローディング表示を終了
 * @param {string} fieldType - 'question' | 'answer'
 */
function hidePlayButtonLoading(fieldType) {
  var playButton = getFieldPlayButton(fieldType);
  if (playButton) {
    var playButtonImg = document.createElement('img');
    playButtonImg.src = 'img/play-button.png';
    playButtonImg.alt = '';
    playButton.innerHTML = '';
    playButton.appendChild(playButtonImg);
  }
  updateFieldPlayButtons();
}

/**
 * Drive から音声を取得し、無ければ TTS
 * @param {string} text
 * @param {string} voiceGender
 * @param {string} speed
 * @param {string} fieldType
 * @param {string} sheetField
 * @param {Object} item
 * @param {AbortSignal|null} signal
 * @param {number} generation
 * @param {function(): void} done
 */
function fetchAudioFromDriveOrTts(text, voiceGender, speed, fieldType, sheetField, item, signal, generation, done) {
  fieldPlay.field = fieldType || null;
  showPlayButtonLoading(fieldType);
  refreshAdvanceNavControls();
  beginLoadDiag('run', 'Drv', AUDIO_FETCH_MAX_ATTEMPTS, {
    queueWait: audioFetch.queue.length
  });

  function attemptDrive(attemptIndex) {
    if (generation !== audioFetch.generation) {
      done();
      return;
    }
    updateLoadDiag('run', {
      phase: 'Drv',
      attempt: attemptIndex,
      maxAttempts: AUDIO_FETCH_MAX_ATTEMPTS,
      status: '取得中',
      queueWait: audioFetch.queue.length
    });

    var params = new URLSearchParams();
    params.append('action', 'getDriveAudio');
    params.append('id', String(item.id));
    params.append('categoryNo', String(resolveItemCategoryNo(item)));
    params.append('no', String(item.no));
    params.append('field', sheetField);
    params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
    params.append('speed', speed || AUDIO_SPEED_FIXED);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params, {
      signal: signal,
      httpErrorPrefix: 'drive fetch failed: '
    })
    .then(function(data) {
      if (generation !== audioFetch.generation) {
        done();
        return;
      }
      if (data && data.success && data.found && data.audioContent) {
        hidePlayButtonLoading(fieldType);
        var cachedData = saveAudioToCache(text, data.audioContent, voiceGender || AUDIO_VOICE_DEFAULT, speed || AUDIO_SPEED_FIXED);
        finishLoadDiag('run', 'OK', {
          ok: true,
          bytes: String(data.audioContent).length
        });
        done();
        setTimeout(function() {
          if (generation !== audioFetch.generation) return;
          playAudioFromCache(cachedData, fieldType, 'Drive');
        }, 0);
        return;
      }
      var businessError = (data && data.error) ? String(data.error) : '';
      if (
        businessError &&
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioBusinessError(businessError)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(businessError)
        });
        var bizDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptDrive(attemptIndex + 1);
        }, bizDelay);
        return;
      }
      finishLoadDiag('run', data && data.success && data.found === false ? 'miss' : loadDiagStatusFromError(businessError || 'miss'), {
        ok: false
      });
      fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, done);
    })
    .catch(function(error) {
      if (generation !== audioFetch.generation) {
        done();
        return;
      }
      if (isAbortError(error)) {
        finishLoadDiag('run', 'abort', { ok: false });
        handleAudioFetchAbortOrTimeout(fieldType);
        done();
        return;
      }
      if (
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioNetworkError(error)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(error)
        });
        var netDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptDrive(attemptIndex + 1);
        }, netDelay);
        return;
      }
      finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false });
      fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, done);
    });
  }

  attemptDrive(0);
}

/**
 * APIから音声データを取得
 * @param {string} text - 読み上げるテキスト
 * @param {string} voiceGender - 音声の性別（'male' または 'female'）
 * @param {string} speed - 読み上げの速さ（'fast', 'medium', 'slow'）
 * @param {string} fieldType - 'question' | 'answer'
 * @param {Object} [item]
 * @param {string} [sheetField]
 * @param {AbortSignal|null} [signal]
 * @param {number} [generation]
 * @param {function(): void} [done]
 */
function fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, done) {
  fieldPlay.field = fieldType || null;
  showPlayButtonLoading(fieldType);
  refreshAdvanceNavControls();

  var gen = (generation == null) ? audioFetch.generation : generation;
  var finish = typeof done === 'function' ? done : function() {};

  beginLoadDiag('run', 'TTS', AUDIO_FETCH_MAX_ATTEMPTS, {
    queueWait: audioFetch.queue.length
  });

  function failAudio(errorText) {
    finishLoadDiag('run', loadDiagStatusFromError(errorText), { ok: false });
    hidePlayButtonLoading(fieldType);
    fieldPlay.field = null;
    updateFieldPlayButtons();
    showError(errorText);
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    finish();
  }

  function attemptTts(attemptIndex) {
    if (gen !== audioFetch.generation) {
      finish();
      return;
    }
    updateLoadDiag('run', {
      phase: 'TTS',
      attempt: attemptIndex,
      maxAttempts: AUDIO_FETCH_MAX_ATTEMPTS,
      status: '取得中',
      queueWait: audioFetch.queue.length
    });

    var params = new URLSearchParams();
    params.append('text', text);
    params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
    params.append('speed', speed || AUDIO_SPEED_FIXED);
    appendAuthParams(params);
    params.append('referer', window.location.origin);

    postGasJson(params, { signal: signal })
    .then(function(data) {
      if (gen !== audioFetch.generation) {
        finish();
        return;
      }

      if (data && data.success && data.audioContent) {
        hidePlayButtonLoading(fieldType);
        var cachedData = saveAudioToCache(text, data.audioContent, voiceGender || AUDIO_VOICE_DEFAULT, speed || AUDIO_SPEED_FIXED);
        if (item && sheetField) {
          saveDriveAudioAsync(item, sheetField, voiceGender || AUDIO_VOICE_DEFAULT, speed || AUDIO_SPEED_FIXED, data.audioContent);
        }
        finishLoadDiag('run', 'OK', {
          ok: true,
          bytes: String(data.audioContent).length
        });
        finish();
        setTimeout(function() {
          if (gen !== audioFetch.generation) return;
          playAudioFromCache(cachedData, fieldType, 'TTS');
        }, 0);
        return;
      }

      var errMsg = (data && data.error) || 'Unknown error';
      if (
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioBusinessError(errMsg)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(errMsg)
        });
        var bizDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptTts(attemptIndex + 1);
        }, bizDelay);
        return;
      }
      failAudio('音声の生成に失敗しました: ' + errMsg);
    })
    .catch(function(error) {
      if (gen !== audioFetch.generation) {
        finish();
        return;
      }
      if (isAbortError(error)) {
        finishLoadDiag('run', 'abort', { ok: false });
        handleAudioFetchAbortOrTimeout(fieldType);
        finish();
        return;
      }
      if (
        attemptIndex + 1 < AUDIO_FETCH_MAX_ATTEMPTS &&
        isTransientAudioNetworkError(error)
      ) {
        updateLoadDiag('run', {
          attempt: attemptIndex,
          status: loadDiagStatusFromError(error)
        });
        var netDelay = AUDIO_FETCH_RETRY_BASE_DELAY_MS * Math.pow(2, attemptIndex);
        setTimeout(function() {
          attemptTts(attemptIndex + 1);
        }, netDelay);
        return;
      }
      failAudio('音声読み上げエラー: ' + error.toString());
    });
  }

  attemptTts(0);
}

function preloadAudioForCurrentAndNext() {
  scheduleAudioPrefetch();
}

function preloadNextQuestions() {
  scheduleAudioPrefetch();
}

/**
 * 先読み対象アイテム（表示カテゴリ、重複なし）
 * @returns {Object[]}
 */
function collectAudioPrefetchItems() {
  var byId = {};
  function addList(list) {
    (list || []).forEach(function(it) {
      if (!it || it.id == null) {
        return;
      }
      if (!isCategoryNoVisible(it.category_no != null ? it.category_no : resolveItemCategoryNo(it))) {
    return;
      }
      byId[String(it.id)] = it;
    });
  }
  addList(categoryCatalog.items);
  addList(durationMode.sortedItems);
  addList(lastDateMode.allItems);
  Object.keys(categoryCatalog.byNo).forEach(function(key) {
    addList(categoryCatalog.byNo[key]);
  });
  addList(readLocalAllStudyItems());
  var items = [];
  Object.keys(byId).forEach(function(id) {
    items.push(byId[id]);
  });
  return items;
}

/**
 * Drive／IdB 揃い用ジョブ（出題＋解答、いまの声・速さ）
 * @returns {Array<{item: Object, text: string, voice: string, speed: string, field: string, idbId: string, priority: number}>}
 */
function collectAudioPrefetchJobs() {
  var qVoice = getAudioVoice('question');
  var qSpeed = getAudioSpeed('question');
  var aVoice = getAudioVoice('answer');
  var aSpeed = getAudioSpeed('answer');
  var jobs = [];
  var currentId = null;
  var current = getCurrentLearningItem();
  if (current && current.id != null) {
    currentId = String(current.id);
  }
  var sessionIds = {};
  (categoryCatalog.items || []).forEach(function(it, idx) {
    if (it && it.id != null) {
      sessionIds[String(it.id)] = idx;
    }
  });
  var items = collectAudioPrefetchItems();
  items.forEach(function(item) {
    var idStr = String(item.id);
    var sessionIdx = sessionIds.hasOwnProperty(idStr) ? sessionIds[idStr] : 9999;
    var pri = 50;
    if (currentId && idStr === currentId) {
      pri = 0;
    } else if (sessionIdx >= 0 && sessionIdx < 9999) {
      var dist = Math.abs(sessionIdx - (questionCursor.index || 0));
      pri = dist <= 2 ? dist : 10 + dist;
    }
    function pushField(displayField, text, voice, speed) {
      if (!text || isImageUrl(text)) {
        return;
      }
      var cacheKey = normalizeTextForTTS(text) + '_' + voice + '_' + speed;
      jobs.push({
        item: item,
        text: text,
        voice: voice,
        speed: speed,
        field: getSheetAudioFieldType(displayField),
        idbId: audioIdbRecordId(cacheKey),
        priority: pri
      });
    }
    pushField('question', getEffectiveQuestion(item), qVoice, qSpeed);
    pushField('answer', getEffectiveAnswer(item), aVoice, aSpeed);
  });
  jobs.sort(function(a, b) {
    return a.priority - b.priority;
  });
  return jobs;
}

/**
 * 先読みの再確認タイマーを止める
 */
function clearAudioPrefetchRecheck_() {
  if (audioPrefetch.recheckTimer) {
    clearTimeout(audioPrefetch.recheckTimer);
    audioPrefetch.recheckTimer = null;
  }
}

/**
 * 先読み失敗後の再開間隔
 * @returns {number}
 */
function audioPrefetchBackoffMs_() {
  var exp = Math.max(0, audioPrefetch.failStreak - 1);
  var ms = AUDIO_PREFETCH_FAIL_BACKOFF_MS * Math.pow(2, exp);
  return Math.min(AUDIO_PREFETCH_FAIL_BACKOFF_MAX_MS, ms);
}

/**
 * 未取得が残るとき、間隔後に先読みを組み直す
 * @param {number} delayMs
 */
function armAudioPrefetchRecheck_(delayMs) {
  clearAudioPrefetchRecheck_();
  if (!ENABLE_AUDIO_PREFETCH || audioPrefetch.stopped) {
    return;
  }
  audioPrefetch.recheckTimer = setTimeout(function() {
    audioPrefetch.recheckTimer = null;
    scheduleAudioPrefetch();
  }, delayMs);
}

/**
 * 先読みキューが空になったあと、未取得が残れば再確認する
 */
function onAudioPrefetchQueueIdle_() {
  refreshAudioIdbStats(function() {
    if (audioPrefetch.stopped) {
    return;
    }
    if (audioStock.idbTarget > 0 && audioStock.idbReady >= audioStock.idbTarget) {
      return;
    }
    armAudioPrefetchRecheck_(AUDIO_PREFETCH_RECHECK_MS);
  });
}

/**
 * 先読みの通信失敗。完全停止せず間隔を空けて再開する
 */
function noteAudioPrefetchFailure_() {
  audioPrefetch.failStreak += 1;
  audioFetch.prefetchQueue = [];
  armAudioPrefetchRecheck_(audioPrefetchBackoffMs_());
}

/**
 * 先読みキューを組み直す（Driveのみ。TTSしない）
 */
function scheduleAudioPrefetch() {
  if (!ENABLE_AUDIO_PREFETCH || audioPrefetch.stopped) {
    return;
  }
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    return;
  }
  if (!googleAuth.email || !hasUsableAuth()) {
    return;
  }
  if (audioFetch.prefetchQueue.length > 0 || audioFetch.prefetchRunning) {
    return;
  }
  if (isFieldAudioBusy() || audioPrefetch.playBlocked) {
    armAudioPrefetchRecheck_(AUDIO_PREFETCH_RECHECK_MS);
    return;
  }
  clearAudioPrefetchRecheck_();
  var jobs = collectAudioPrefetchJobs();
  audioStock.idbTarget = jobs.length;
  var queued = 0;
  jobs.forEach(function(job) {
    if (getCachedAudio(job.text, job.voice, job.speed)) {
      return;
    }
    if (audioStock.idbIds[job.idbId]) {
      return;
    }
    queued += 1;
    enqueueGasAudioFetch(function(signal, generation, done) {
      prefetchOneDriveAudio(job, signal, generation, done);
    }, { prefetch: true });
  });
  if (queued === 0) {
    onAudioPrefetchQueueIdle_();
    return;
  }
  refreshAudioIdbStats();
  processGasAudioFetchQueue();
}

function ensureAudioPrefetchInventory() {
  if (getMemoryAllStudyItems().length) {
    scheduleAudioPrefetch();
    return;
  }
  fetchAllStudyItemsFromServer(function(err, items, meta) {
    if (items && items.length) {
      writeLocalStudyBundle(items, meta && meta.dataGeneration);
    }
    scheduleAudioPrefetch();
  });
}

/**
 * 先読み1本（Drive hit のみ。miss は TTS しない）
 */
function prefetchOneDriveAudio(job, signal, generation, done) {
  if (generation !== audioFetch.generation) {
    done();
    return;
  }
  if (!canUseDriveAudioMeta(job.item)) {
    done();
    return;
  }
  getCachedAudioFromIdb(job.text, job.voice, job.speed, function(cached) {
    if (cached) {
      done();
      return;
    }
    ensureFreshGoogleAuthToken(function() {
      if (generation !== audioFetch.generation) {
        done();
        return;
      }
      beginLoadDiag('run', '先読み', 1, {
        status: '取得中',
        queueWait: audioFetch.prefetchQueue.length
      });
      var timedOut = false;
      var timeoutId = setTimeout(function() {
        timedOut = true;
        try {
          if (signal && typeof signal.throwIfAborted !== 'function' && audioFetch.abort) {
            audioFetch.abort.abort();
          } else if (audioFetch.abort) {
            audioFetch.abort.abort();
          }
        } catch (eAbort) {
          // ignore
        }
      }, AUDIO_PREFETCH_TIMEOUT_MS);

      var params = new URLSearchParams();
      params.append('action', 'getDriveAudio');
      params.append('id', String(job.item.id));
      params.append('categoryNo', String(resolveItemCategoryNo(job.item)));
      params.append('no', String(job.item.no));
      params.append('field', job.field);
      params.append('voiceGender', job.voice);
      params.append('speed', job.speed);
      appendAuthParams(params);
      params.append('referer', window.location.origin);

      postGasJson(params, {
        signal: signal,
        httpErrorPrefix: 'drive fetch failed: '
      })
        .then(function(data) {
          if (timedOut) {
            throw new Error('タイムアウト');
          }
          clearTimeout(timeoutId);
          if (generation !== audioFetch.generation) {
            done();
          return;
        }
          if (data && data.success && data.found && data.audioContent) {
            saveAudioToCache(job.text, data.audioContent, job.voice, job.speed);
            finishLoadDiag('run', 'OK', { ok: true, bytes: String(data.audioContent).length });
            audioPrefetch.failStreak = 0;
            done();
            return;
          }
          finishLoadDiag('run', 'miss', { ok: false });
          audioPrefetch.failStreak = 0;
          done();
        })
        .catch(function(error) {
          clearTimeout(timeoutId);
          if (generation !== audioFetch.generation || isAbortError(error)) {
            if (timedOut) {
              finishLoadDiag('run', 'timeout', { ok: false });
              noteAudioPrefetchFailure_();
            }
            done();
            return;
          }
          finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false });
          noteAudioPrefetchFailure_();
          done();
        });
    }, function() {
      audioPrefetch.stopped = true;
      audioFetch.prefetchQueue = [];
      clearAudioPrefetchRecheck_();
      done();
    });
  });
}

function fetchDriveAudioCoverage() {
  if (!googleAuth.email || !hasUsableAuth()) {
    return;
  }
  var nos = getSavedVisibleCategoryNos();
  if (!nos || !nos.length) {
    nos = (categoryCatalog.list || []).filter(function(cat) {
      return cat && !isEndCategory(cat);
    }).map(function(cat) {
      return cat.no;
    });
  }
  var params = new URLSearchParams();
  params.append('action', 'getDriveAudioCoverage');
  params.append('categoryNos', JSON.stringify(nos || []));
  params.append('voiceGenderQuestion', getAudioVoice('question'));
  params.append('speedQuestion', getAudioSpeed('question'));
  params.append('voiceGenderAnswer', getAudioVoice('answer'));
  params.append('speedAnswer', getAudioSpeed('answer'));
  appendAuthParams(params);
  params.append('referer', window.location.origin);
  postGasJson(params)
      .then(function(data) {
      if (data && data.success) {
        audioStock.driveTarget = Number(data.target) || 0;
        audioStock.driveReady = Number(data.ready) || 0;
        refreshLoadDiagUi();
      }
      })
      .catch(function() {
      // 診断用。失敗しても学習は続ける
    });
}

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
      if (fieldType === 'answer' && typeof isCategoryGuideAwaitingAdvance === 'function' &&
          isCategoryGuideAwaitingAdvance()) {
        replayCategoryGuideFromWait_(true);
      } else if (fieldType === 'answer' && typeof isCompletionAnnounceReplayActive === 'function' &&
          isCompletionAnnounceReplayActive()) {
        replayCompletionAnnounce_(true);
      } else {
        recreateFieldAudio(fieldType);
      }
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
    if (fieldType === 'answer' && typeof isCategoryGuideAwaitingAdvance === 'function' &&
        isCategoryGuideAwaitingAdvance()) {
      replayCategoryGuideFromWait_(false);
      return;
    }
    if (fieldType === 'answer' && typeof isCompletionAnnounceReplayActive === 'function' &&
        isCompletionAnnounceReplayActive()) {
      replayCompletionAnnounce_(false);
      return;
    }
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
  var answerPlayLabel = dom.navAnswerPlayLabel;
  var guideWait = typeof isCategoryGuideAwaitingAdvance === 'function' &&
    isCategoryGuideAwaitingAdvance();
  
  function isLoading(btn) {
    return !!(btn && btn.querySelector('.play-button-spinner'));
  }

  var completionReplay = typeof isCompletionAnnounceReplayActive === 'function' &&
    isCompletionAnnounceReplayActive();
  var completionLabel = 'Title';
  if (completionReplay && categoryAnnounce.completionReplayKind === 'end') {
    completionLabel = 'End';
  }

  if (answerPlayLabel) {
    if (guideWait) {
      answerPlayLabel.textContent = 'Title';
    } else if (completionReplay) {
      answerPlayLabel.textContent = completionLabel;
    } else {
      answerPlayLabel.textContent = 'Ans';
    }
  }
  
  if (guideWait) {
    if (qBtn && !isLoading(qBtn)) qBtn.disabled = true;
    if (aBtn && !isLoading(aBtn)) aBtn.disabled = false;
    if (questionPlaySlot) {
      questionPlaySlot.classList.add('is-inactive');
    }
    if (answerPlaySlot) {
      answerPlaySlot.classList.remove('is-inactive');
    }
    refreshAdvanceNavControls();
    return;
  }

  if (completionReplay) {
    var replayBlocked = !!isCategoryTransitionInProgress ||
      (typeof startAudioPrepare !== 'undefined' && startAudioPrepare && startAudioPrepare.busy);
    if (qBtn && !isLoading(qBtn)) qBtn.disabled = true;
    if (aBtn && !isLoading(aBtn)) aBtn.disabled = replayBlocked;
    if (questionPlaySlot) {
      questionPlaySlot.classList.add('is-inactive');
    }
    if (answerPlaySlot) {
      if (replayBlocked) {
        answerPlaySlot.classList.add('is-inactive');
      } else {
        answerPlaySlot.classList.remove('is-inactive');
      }
    }
    return;
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
 * @param {{buffer?: AudioBuffer, source?: AudioBufferSourceNode}|null} audio
 * @returns {number}
 */
function getAudioBusyDeadlineMs_(audio) {
  var d = audio && audio.buffer ? audio.buffer.duration : 0;
  var rate = 1;
  if (audio && audio.source && audio.source.playbackRate) {
    var rawRate = Number(audio.source.playbackRate.value);
    if (isFinite(rawRate) && rawRate > 0) {
      rate = rawRate;
    }
  }
  if (typeof d === 'number' && isFinite(d) && d > 0) {
    return Math.ceil((d / rate) * 1000) + AUDIO_PLAY_END_GRACE_MS;
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
 * 現在の読み上げを止める。stop は最後まで鳴ったことにはしない。
 */
function releaseCurrentAudioElement() {
  if (!fieldPlay.audio) {
    return;
  }
  var audio = fieldPlay.audio;
  fieldPlay.audio = null;
  stopPcmPlayback_(audio);
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

var pcmAudio = {
  ctx: null,
  urlBuffers: {},
  urlPromises: {}
};

/**
 * @returns {AudioContext}
 */
function getPcmAudioContext_() {
  if (!pcmAudio.ctx) {
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error('Web Audio is not available');
    }
    pcmAudio.ctx = new AudioCtx();
  }
  return pcmAudio.ctx;
}

/**
 * Android は操作のあとで音声機能が眠るので、再生の直前に起こす。
 * @returns {Promise<AudioContext>}
 */
function kickPcmAudioContext_() {
  try {
    var ctx = getPcmAudioContext_();
    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume();
    }
  } catch (e) {
    // 再生側で失敗にする
  }
}

function resumePcmAudioContext_() {
  var ctx;
  try {
    ctx = getPcmAudioContext_();
  } catch (e) {
    return Promise.reject(e);
  }
  if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
    return ctx.resume().then(function() {
      return ctx;
    }).catch(function() {
      return ctx;
    });
  }
  return Promise.resolve(ctx);
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<AudioBuffer>}
 */
function decodeArrayBuffer_(arrayBuffer) {
  return resumePcmAudioContext_().then(function(ctx) {
    var copy = arrayBuffer.slice(0);
    return new Promise(function(resolve, reject) {
      var ret = ctx.decodeAudioData(copy, function(buffer) {
        resolve(buffer);
      }, function(err) {
        reject(err || new Error('decode failed'));
      });
      if (ret && typeof ret.then === 'function') {
        ret.then(resolve, reject);
      }
    });
  });
}

/**
 * 読み上げ mp3 を PCM にする。同じ audioData は画面を開いているあいだ使い回す。
 * @param {Object} audioData
 * @returns {Promise<AudioBuffer>}
 */
function decodeAudioDataToBuffer_(audioData) {
  if (!audioData) {
    return Promise.reject(new Error('empty audio'));
  }
  if (audioData.pcmBuffer) {
    return resumePcmAudioContext_().then(function() {
      return audioData.pcmBuffer;
    });
  }
  if (audioData.pcmPromise) {
    return audioData.pcmPromise;
  }
  var blob = ensureMp3BlobOnAudioData(audioData);
  if (!blob || typeof blob.arrayBuffer !== 'function') {
    return Promise.reject(new Error('empty audio'));
  }
  audioData.pcmPromise = blob.arrayBuffer().then(decodeArrayBuffer_).then(function(buffer) {
    audioData.pcmBuffer = buffer;
    audioData.pcmPromise = null;
    return buffer;
  }, function(err) {
    audioData.pcmPromise = null;
    throw err;
  });
  return audioData.pcmPromise;
}

/**
 * 効果音 URL を PCM にする。先に読んだ分はメモリに残す。
 * @param {string} url
 * @returns {Promise<AudioBuffer>}
 */
function decodeSfxUrl_(url) {
  if (!url) {
    return Promise.reject(new Error('empty sfx url'));
  }
  if (pcmAudio.urlBuffers[url]) {
    return resumePcmAudioContext_().then(function() {
      return pcmAudio.urlBuffers[url];
    });
  }
  if (pcmAudio.urlPromises[url]) {
    return pcmAudio.urlPromises[url];
  }
  pcmAudio.urlPromises[url] = fetch(url).then(function(response) {
    if (!response.ok) {
      throw new Error('sfx fetch failed');
    }
    return response.arrayBuffer();
  }).then(decodeArrayBuffer_).then(function(buffer) {
    pcmAudio.urlBuffers[url] = buffer;
    delete pcmAudio.urlPromises[url];
    if (typeof noteSfxLoadResult_ === 'function') {
      noteSfxLoadResult_(url, true);
    }
    return buffer;
  }, function(err) {
    delete pcmAudio.urlPromises[url];
    if (typeof noteSfxLoadResult_ === 'function') {
      noteSfxLoadResult_(url, false);
    }
    throw err;
  });
  return pcmAudio.urlPromises[url];
}

/**
 * @param {string} url
 * @returns {Promise}
 */
function preloadPcmUrl_(url) {
  return decodeSfxUrl_(url).catch(function() {});
}

/**
 * PCM を1本鳴らす。onEnded は最後まで鳴ったときだけ。
 * @param {AudioBuffer} buffer
 * @param {{volume?: number, playbackRate?: number, onEnded?: function(): void}} [options]
 * @returns {{source: AudioBufferSourceNode, gain: GainNode, buffer: AudioBuffer, stopped: boolean, onEnded: function(): void|null}}
 */
function playPcmBuffer_(buffer, options) {
  options = options || {};
  var ctx = getPcmAudioContext_();
  var source = ctx.createBufferSource();
  var gain = ctx.createGain();
  source.buffer = buffer;
  var rate = Number(options.playbackRate);
  source.playbackRate.value = (isFinite(rate) && rate > 0) ? rate : 1;
  var volume = Number(options.volume);
  gain.gain.value = isFinite(volume) ? volume : 1;
  source.connect(gain);
  gain.connect(ctx.destination);
  var handle = {
    source: source,
    gain: gain,
    buffer: buffer,
    stopped: false,
    onEnded: typeof options.onEnded === 'function' ? options.onEnded : null
  };
  source.onended = function() {
    if (handle.stopped) {
      return;
    }
    handle.stopped = true;
    var cb = handle.onEnded;
    handle.onEnded = null;
    if (typeof cb === 'function') {
      cb();
    }
  };
  source.start(0);
  return handle;
}

/**
 * 再生を止める。終了コールバックは呼ばない。
 * @param {{source?: AudioBufferSourceNode, gain?: GainNode, stopped?: boolean, onEnded?: function(): void}|null} handle
 */
function stopPcmPlayback_(handle) {
  if (!handle || !handle.source || handle.stopped) {
    return;
  }
  handle.stopped = true;
  handle.onEnded = null;
  try {
    handle.source.onended = null;
  } catch (e0) {
    // ignore
  }
  try {
    handle.source.stop(0);
  } catch (e1) {
    // ignore
  }
  try {
    handle.source.disconnect();
  } catch (e2) {
    // ignore
  }
  try {
    if (handle.gain) {
      handle.gain.disconnect();
    }
  } catch (e3) {
    // ignore
  }
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

/**
 * 問題追加の GAS 待ち中は、先読み／準備音声を動かさない。
 * 保存後の音声準備待ち（awaitingAudioPrepare）のあいだは準備を動かす。
 * @returns {boolean}
 */
function isAddStudyDeferringAudio_() {
  if (addStudy.awaitingAudioPrepare) {
    return false;
  }
  return !!(addStudy.formBusy || addStudy.moveBusy || addStudy.modalBusy);
}

/**
 * 学習中または追加の音声準備待ち中は、全カテゴリ先読みを動かさない
 * @returns {boolean}
 */
function shouldSuppressAudioPrefetch_() {
  if (addStudy.awaitingAudioPrepare) {
    return true;
  }
  if (startAudioPrepare && startAudioPrepare.busy) {
    return true;
  }
  if (typeof isActiveLearningSession === 'function' && isActiveLearningSession()) {
    return true;
  }
  return false;
}

/**
 * 追加操作の開始時：実行中の先読みだけ止める（本問キューは触らない）
 */
function pauseBackgroundAudioForAddStudy_() {
  abortRunningAudioPrefetch();
}

/**
 * 追加の待ちが解けたら、保存後準備と先読みを再開する
 */
function notifyAddStudyAudioGateChanged() {
  if (isAddStudyDeferringAudio_()) {
    pauseBackgroundAudioForAddStudy_();
    return;
  }
  flushStudyAudioPrepareQueue_();
  scheduleAudioPrefetch();
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
    !isAddStudyDeferringAudio_() &&
    ENABLE_AUDIO_PREFETCH &&
    !audioPrefetch.stopped &&
    !audioPrefetch.playBlocked &&
    !isFieldAudioBusy() &&
    studyAudioPrepare.queue.length > 0
  ) {
    // 保存後準備／Start前準備：先読みより前。queue に残すので本問再生の abort で消えない
    var prepJob = studyAudioPrepare.queue.shift();
    studyAudioPrepare.activeItemId = prepJob && prepJob.item
      ? String(prepJob.item.id)
      : '';
    task = function(signal, generation, done) {
      ensureStudyItemFieldAudio_(prepJob, signal, generation, function() {
        if (studyAudioPrepare.activeItemId && prepJob && prepJob.item &&
            studyAudioPrepare.activeItemId === String(prepJob.item.id)) {
          var stillPending = false;
          for (var pi = 0; pi < studyAudioPrepare.queue.length; pi++) {
            var pending = studyAudioPrepare.queue[pi];
            if (pending && pending.item &&
                String(pending.item.id) === String(prepJob.item.id)) {
              stillPending = true;
              break;
            }
          }
          if (!stillPending) {
            studyAudioPrepare.activeItemId = '';
          }
        }
        notifyAddStudyAudioPrepareProgress_();
        notifyStudyAudioPrepareMaybeIdle_();
        done();
      });
    };
    isPrefetch = true;
  } else if (
    !isAddStudyDeferringAudio_() &&
    !shouldSuppressAudioPrefetch_() &&
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
      flushStudyAudioPrepareQueue_();
      scheduleAudioPrefetch();
    } else if (
      isPrefetch &&
      studyAudioPrepare.queue.length === 0 &&
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
  // 切替直後は新再生が fieldPlay／addStudy busy を立て直していることがあるため、
  // ここでは addStudy busy を触らない（停止は stopCurrentAudioPlayback／再生終了側）
  if (fieldPlay.field === fieldType) {
    fieldPlay.field = null;
  }
  updateFieldPlayButtons();
  if (typeof refreshAddStudyListPlayButtons === 'function') {
    refreshAddStudyListPlayButtons();
  }
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
  if (!options.keepCategoryAnnounce) {
    stopCategoryAnnounce({ cancelPending: true });
  }
  var prevField = fieldPlay.field;
  clearAudioBusyWatchdogs_();
  releaseCurrentAudioElement();
  if (!options.preserveBusy) {
    fieldPlay.field = null;
    if (!options.keepAddStudyAudioBusy && typeof clearAddStudyAudioBusy_ === 'function') {
      clearAddStudyAudioBusy_();
    }
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
/**
 * Drive へ音声を保存（失敗は無視。Promise を返す）
 * @param {Object} item
 * @param {string} sheetField
 * @param {string} voiceGender
 * @param {string} speed
 * @param {string} audioContent
 * @returns {Promise<*>}
 */
function saveDriveAudioAsync(item, sheetField, voiceGender, speed, audioContent) {
  if (!isAudioDownloadEnabled()) {
    return Promise.resolve(null);
  }
  if (!canUseDriveAudioMeta(item) || !audioContent || !googleAuth.email) {
    return Promise.resolve(null);
  }
  if (sheetField !== 'question' && sheetField !== 'answer') {
    return Promise.resolve(null);
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
    return postGasJson(params).catch(function() {
      return null;
    });
  } catch (e) {
    return Promise.resolve(null);
  }
}

/**
 * Drive 上の当該フィールド音声を削除（失敗は無視。Promise を返す）
 * @param {Object} item
 * @param {string} sheetField
 * @returns {Promise<*>}
 */
function deleteDriveAudioAsync(item, sheetField) {
  if (!canUseDriveAudioMeta(item) || !googleAuth.email) {
    return Promise.resolve(null);
  }
  if (sheetField !== 'question' && sheetField !== 'answer') {
    return Promise.resolve(null);
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
    return postGasJson(params).catch(function() {
      return null;
    });
  } catch (e) {
    return Promise.resolve(null);
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
      if (!isAudioDownloadEnabled()) {
        hidePlayButtonLoading(fieldType);
        fieldPlay.field = null;
        updateFieldPlayButtons();
        if (fieldType === 'question') onQuestionAudioSettled('fail');
        settleAudioNetwork();
        return;
      }
      enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork, forceRefresh);
    });
    return;
  }

  if (!isAudioDownloadEnabled()) {
    hidePlayButtonLoading(fieldType);
    fieldPlay.field = null;
    updateFieldPlayButtons();
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    settleAudioNetwork();
    return;
  }
  enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork, forceRefresh);
}

/**
 * 問題追加一覧：保存済み本文の出題／解答を再生（自動再生なし）
 * 短押しで同一欄再押しなら停止。長押し（forceRefresh）は Drive を読まず再TTS
 * @param {Object} item
 * @param {'question'|'answer'} fieldType - シート列（入替設定の影響を受けない）
 * @param {boolean} [forceRefresh=false]
 */
function playAddStudyItemFieldAudio(item, fieldType, forceRefresh) {
  if (!item || (fieldType !== 'question' && fieldType !== 'answer')) {
    return;
  }
  var itemId = String(item.id);
  if (!forceRefresh && addStudy.audioBusy && addStudy.audioPlayId === itemId &&
      addStudy.audioPlayField === fieldType) {
    stopCurrentAudioPlayback();
    return;
  }

  var text = fieldType === 'answer'
    ? (item.answer != null ? String(item.answer) : '')
    : (item.question != null ? String(item.question) : '');
  if (!text || !String(text).trim() || isImageUrl(text)) {
    return;
  }
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    showError('音声読み上げの設定が完了していません。WebアプリURLを設定してください。');
    return;
  }

  // 切替時は addStudy busy をいったん残し、すぐ下で付け直す
  stopCurrentAudioPlayback({ skipButtonUpdate: true, keepAudioQueue: false, keepAddStudyAudioBusy: true });
  addStudy.audioBusy = true;
  addStudy.audioPlayId = itemId;
  addStudy.audioPlayField = fieldType;
  fieldPlay.field = fieldType;
  if (typeof syncAddStudyItemEditorUi === 'function') {
    syncAddStudyItemEditorUi();
  } else {
    updateFieldPlayButtons();
  }

  var voiceGender = fieldType === 'question' ? getAudioVoice('question') : getAudioVoice('answer');
  var speed = fieldType === 'question' ? getAudioSpeed('question') : getAudioSpeed('answer');
  var sheetField = fieldType;

  function settleAudioNetwork() {
    // ネット取得完了。再生開始／失敗は playAudioFromCache／fail 側で busy 解除
  }

  function stillSameTarget_() {
    return addStudy.audioBusy && addStudy.audioPlayId === itemId &&
      addStudy.audioPlayField === fieldType;
  }

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
        if (!stillSameTarget_()) {
          return;
        }
        playAudioFromCache(cachedResult.audioData, fieldType, cachedResult.source);
      }, 0);
      settleAudioNetwork();
      return;
    }
    getCachedAudioFromIdb(text, voiceGender, speed, function(idbResult) {
      if (!stillSameTarget_()) {
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
          if (!stillSameTarget_()) {
            return;
          }
          playAudioFromCache(idbResult.audioData, fieldType, 'indexedDB');
        }, 0);
        settleAudioNetwork();
        return;
      }
      if (!isAudioDownloadEnabled()) {
        if (typeof clearAddStudyAudioBusy_ === 'function') {
          clearAddStudyAudioBusy_();
        }
        fieldPlay.field = null;
        if (typeof syncAddStudyItemEditorUi === 'function') {
          syncAddStudyItemEditorUi();
        } else {
          updateFieldPlayButtons();
        }
        settleAudioNetwork();
        return;
      }
      enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork, forceRefresh);
    });
    return;
  }

  // 長押し再TTS：ローカルキャッシュ削除のうえ Drive スキップ
  if (!isAudioDownloadEnabled()) {
    if (typeof clearAddStudyAudioBusy_ === 'function') {
      clearAddStudyAudioBusy_();
    }
    fieldPlay.field = null;
    if (typeof syncAddStudyItemEditorUi === 'function') {
      syncAddStudyItemEditorUi();
    } else {
      updateFieldPlayButtons();
    }
    settleAudioNetwork();
    return;
  }
  removeCachedAudio(text, voiceGender, speed);
  enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork, true);
}

/**
 * 本問の Drive／TTS 取得をキューへ（トークン更新つき）
 * @param {boolean} [forceRefresh=false] - true のとき Drive を読まず TTS で再作成（Drive 同名は TTS 成功後に上書き）
 */
function enqueuePlayAudioFetch(text, voiceGender, speed, fieldType, sheetField, item, settleAudioNetwork, forceRefresh) {
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
      // 長押し再作成：古い Drive 音声を返さない（仕様：TTS → Drive 上書き）
      if (forceRefresh || !canUseDriveAudioMeta(item)) {
        fetchAudioFromAPI(text, voiceGender, speed, fieldType, item, sheetField, signal, generation, after);
      } else {
        fetchAudioFromDriveOrTts(text, voiceGender, speed, fieldType, sheetField, item, signal, generation, after);
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
 * IndexedDB へ1件保存する。完了後に onDone(ok) を呼ぶ。
 * @param {Object} record
 * @param {function(boolean): void} [onDone]
 */
function putAudioIdbRecord(record, onDone) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  openAudioIdb().then(function(db) {
    if (!db || !record || !record.id) {
      done(false);
      return;
    }
    evictAudioIdbIfNeeded(record.byteLength || 0, function() {
      try {
        var tx = db.transaction(AUDIO_IDB_STORE, 'readwrite');
        tx.objectStore(AUDIO_IDB_STORE).put(record);
        var settled = false;
        function finish(ok) {
          if (settled) {
            return;
          }
          settled = true;
          done(!!ok);
        }
        tx.oncomplete = function() {
          finish(true);
        };
        tx.onerror = function() {
          finish(false);
        };
        tx.onabort = function() {
          finish(false);
        };
      } catch (e) {
        done(false);
      }
    });
  });
}

/**
 * IdB 揃いフラグを立てる（put 成功後専用）
 * @param {string} idbId
 */
function markAudioIdbIdReady_(idbId) {
  if (!idbId) {
    return;
  }
  if (!audioStock.idbIds) {
    audioStock.idbIds = {};
  }
  if (!audioStock.idbIds[idbId]) {
    audioStock.idbIds[idbId] = true;
    audioStock.idbReady = (audioStock.idbReady || 0) + 1;
  }
  invalidateCategoryIdbProgressCache();
}

/**
 * Mem にある音声を IdB へ書き戻す（既に idbIds にあれば何もしない）
 * @param {string} text
 * @param {string} voice
 * @param {string} speed
 * @param {function(boolean): void} [onDone]
 */
function ensureAudioPersistedToIdb_(text, voice, speed, onDone) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  var phrase = normalizeTextForTTS(text || '');
  if (!phrase) {
    done(true);
    return;
  }
  var v = voice || AUDIO_VOICE_DEFAULT;
  var sp = speed || AUDIO_SPEED_FIXED;
  var cacheKey = phrase + '_' + v + '_' + sp;
  var idbId = audioIdbRecordId(cacheKey);
  if (audioStock.idbIds && audioStock.idbIds[idbId]) {
    done(true);
    return;
  }
  var mem = audioCache[cacheKey];
  if (!mem || !mem.audioContent) {
    done(false);
    return;
  }
  putAudioIdbRecord({
    id: idbId,
    audioContent: mem.audioContent,
    timestamp: mem.timestamp || Date.now(),
    textHash: mem.textHash || hashText(cacheKey),
    byteLength: String(mem.audioContent || '').length
  }, function(ok) {
    if (ok) {
      markAudioIdbIdReady_(idbId);
      if (typeof syncAudioStockStatusUi === 'function') {
        syncAudioStockStatusUi();
      }
    }
    done(ok);
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

function notifyVisibleCategoriesAfterIdbStats() {
  if (typeof syncVisibleCategoriesAfterIdbChange === 'function') {
    syncVisibleCategoriesAfterIdbChange();
    return;
  }
  if (typeof updateVisibleCategoriesIdbLabels === 'function') {
    updateVisibleCategoriesIdbLabels();
  }
}

function invalidateCategoryIdbProgressCache() {
  categoryIdbProgressCache.key = '';
  categoryIdbProgressCache.map = null;
}

/**
 * 再生可否用：Mem または IdB（IdB 未集計時は Mem のみ）
 * @param {string} text
 * @param {string} voice
 * @param {string} speed
 * @returns {boolean|null} null=確認中
 */
function isTextAudioLocalReady_(text, voice, speed) {
  var phrase = normalizeTextForTTS(text || '');
  if (!phrase) {
    return true;
  }
  if (getCachedAudio(phrase, voice, speed)) {
    return true;
  }
  if (!audioStock.idbInventoryReady) {
    return null;
  }
  var idbId = audioIdbRecordId(phrase + '_' + voice + '_' + speed);
  return !!(audioStock.idbIds && audioStock.idbIds[idbId]);
}

/**
 * メニュー／状況表示用：IdB 実在のみ（Mem だけでは済にしない）
 * @param {string} text
 * @param {string} voice
 * @param {string} speed
 * @returns {boolean|null} null=確認中
 */
function isTextAudioIdbReady_(text, voice, speed) {
  var phrase = normalizeTextForTTS(text || '');
  if (!phrase) {
    return true;
  }
  if (!audioStock.idbInventoryReady) {
    return null;
  }
  var idbId = audioIdbRecordId(phrase + '_' + voice + '_' + speed);
  return !!(audioStock.idbIds && audioStock.idbIds[idbId]);
}

/**
 * カテゴリ案内の IdB キー（本文・表示順に依存しない。再起動後の件数ズレ防止）
 * @param {string|number} categoryNo
 * @param {string} [voice]
 * @param {string} [speed]
 * @returns {string}
 */
function categoryGuideIdbId_(categoryNo, voice, speed) {
  return 'cg_' + String(categoryNo) + '_' +
    (voice || AUDIO_VOICE_DEFAULT) + '_' +
    (speed || AUDIO_SPEED_FIXED);
}

/**
 * 「{名前}、終わり」が端末 IdB にあるか
 * @param {Object|null} cat
 * @returns {boolean|null} null=対象外または確認中／true=済／false=未
 */
function isCategoryEndAudioReady(cat) {
  var text = typeof buildCategoryEndText_ === 'function' ? buildCategoryEndText_(cat) : '';
  if (!cat || !text) {
    return null;
  }
  if (!audioStock.idbInventoryReady) {
    return null;
  }
  var voice = (typeof getAudioVoice === 'function') ? getAudioVoice('question') : AUDIO_VOICE_DEFAULT;
  return isTextAudioIdbReady_(text, voice, AUDIO_SPEED_FIXED) === true;
}

/**
 * カテゴリ案内が端末 IdB にあるか（cg_ または旧本文キー）
 * @param {Object|null} cat
 * @returns {boolean|null}
 */
function isCategoryGuideAudioReady_(cat) {
  var text = buildCategoryGuideText_(cat);
  if (!cat || !text) {
    return null;
  }
  if (!audioStock.idbInventoryReady) {
    return null;
  }
  var voice = (typeof getAudioVoice === 'function') ? getAudioVoice('question') : AUDIO_VOICE_DEFAULT;
  var stableId = categoryGuideIdbId_(cat.no, voice, AUDIO_SPEED_FIXED);
  if (audioStock.idbIds && audioStock.idbIds[stableId]) {
    return true;
  }
  // 旧：本文ハッシュキーで保存済みのものも済とみなす
  return isTextAudioIdbReady_(text, voice, AUDIO_SPEED_FIXED) === true;
}

/**
 * タイトル（案内全文＋「終わり」）が端末 IdB に揃っているか（メニュー／一覧用）
 * @param {Object|null} cat
 * @returns {boolean|null} null=対象外または確認中
 */
function isCategoryTitleAudioReady(cat) {
  var guideReady = isCategoryGuideAudioReady_(cat);
  if (guideReady !== true) {
    return guideReady;
  }
  var endText = typeof buildCategoryEndText_ === 'function' ? buildCategoryEndText_(cat) : '';
  if (!endText) {
    return true;
  }
  var endReady = isCategoryEndAudioReady(cat);
  if (endReady === null) {
    return null;
  }
  return endReady === true;
}

/**
 * 問題の出題・解答が両方揃っているか（Mem／IdB。学習フィルタ用）
 * @param {Object} item
 * @returns {boolean}
 */
function isStudyItemQaLocalReady(item) {
  return typeof isStudyItemLocalAudioReady === 'function'
    ? isStudyItemLocalAudioReady(item)
    : getStudyItemMissingAudioFields(item).length === 0;
}

/**
 * 問題の出題・解答が IdB に揃っているか（メニュー／一覧の済未用）
 * @param {Object} item
 * @returns {boolean}
 */
function isStudyItemQaIdbReady(item) {
  if (!item) {
    return false;
  }
  if (!audioStock.idbInventoryReady) {
    return false;
  }
  return getStudyItemMissingAudioFields(item, { idbOnly: true }).length === 0;
}

/**
 * 学習画面の表示側（出題／解答）テキストが IdB にあるか
 * @param {Object|null} item
 * @param {'question'|'answer'} displaySide
 * @returns {boolean|null} true=揃い／対象外、false=未、null=確認中
 */
function isStudyDisplaySideIdbReady(item, displaySide) {
  if (!item || (displaySide !== 'question' && displaySide !== 'answer')) {
    return true;
  }
  if (!audioStock.idbInventoryReady) {
    return null;
  }
  var text = displaySide === 'answer'
    ? (typeof getEffectiveAnswer === 'function' ? getEffectiveAnswer(item) : item.answer)
    : (typeof getEffectiveQuestion === 'function' ? getEffectiveQuestion(item) : item.question);
  if (!text || (typeof isImageUrl === 'function' && isImageUrl(text))) {
    return true;
  }
  var voice = (typeof getAudioVoice === 'function')
    ? getAudioVoice(displaySide)
    : AUDIO_VOICE_DEFAULT;
  var speed = (typeof getAudioSpeed === 'function')
    ? getAudioSpeed(displaySide)
    : AUDIO_SPEED_FIXED;
  return isTextAudioIdbReady_(text, voice, speed) === true;
}

/**
 * カテゴリ別：タイトル＋問題単位の出題・解答
 * @returns {Object.<string, {titleReady: boolean|null, itemReady: number, itemTarget: number, checking: boolean}>}
 */
function buildCategoryAudioStatusMap() {
  var qVoice = getAudioVoice('question');
  var qSpeed = getAudioSpeed('question');
  var aVoice = getAudioVoice('answer');
  var aSpeed = getAudioSpeed('answer');
  var items = getMemoryAllStudyItems();
  var cacheKey = [
    'status',
    qVoice,
    qSpeed,
    aVoice,
    aSpeed,
    audioStock.idbReady,
    audioStock.idbTarget,
    audioStock.idbInventoryReady ? '1' : '0',
    items.length,
    Object.keys(audioStock.idbIds || {}).length
  ].join('|');
  if (categoryIdbProgressCache.map && categoryIdbProgressCache.key === cacheKey) {
    return categoryIdbProgressCache.map;
  }

  var map = {};
  var cats = (typeof getConfigurableCategories === 'function')
    ? getConfigurableCategories()
    : [];
  var i;
  for (i = 0; i < cats.length; i++) {
    var cat = cats[i];
    if (!cat || cat.no == null) {
      continue;
    }
    var catKey = String(cat.no);
    var titleReady = isCategoryTitleAudioReady(cat);
    map[catKey] = {
      titleReady: titleReady,
      itemReady: 0,
      itemTarget: 0,
      checking: titleReady === null && !!buildCategoryGuideText_(cat)
    };
  }

  items.forEach(function(item) {
    if (!item || item.category_no == null || item.category_no === '') {
      return;
    }
    var catKey = String(item.category_no);
    if (!map[catKey]) {
      map[catKey] = {
        titleReady: null,
        itemReady: 0,
        itemTarget: 0,
        checking: !audioStock.idbInventoryReady
      };
    }
    map[catKey].itemTarget += 1;
    if (isStudyItemQaIdbReady(item)) {
      map[catKey].itemReady += 1;
    } else if (!audioStock.idbInventoryReady) {
      map[catKey].checking = true;
    }
  });

  categoryIdbProgressCache.key = cacheKey;
  categoryIdbProgressCache.map = map;
  return map;
}

/**
 * 全体のタイトル／出題・解答／効果音サマリ（メニュー用）
 * @returns {{titleReady: number, titleTarget: number, itemReady: number, itemTarget: number, sfxReady: number, sfxTarget: number, idbChecking: boolean, sfxChecking: boolean}}
 */
function getAudioStockStatusSummary() {
  var map = buildCategoryAudioStatusMap();
  var titleReady = 0;
  var titleTarget = 0;
  var itemReady = 0;
  var itemTarget = 0;
  var keys = Object.keys(map);
  var i;
  for (i = 0; i < keys.length; i++) {
    var row = map[keys[i]];
    var cat = findCatalogCategory_(keys[i]);
    if (buildCategoryGuideText_(cat)) {
      titleTarget += 1;
      if (row.titleReady === true) {
        titleReady += 1;
      }
    }
    itemReady += row.itemReady || 0;
    itemTarget += row.itemTarget || 0;
  }
  audioStock.titleReady = titleReady;
  audioStock.titleTarget = titleTarget;
  audioStock.itemReady = itemReady;
  audioStock.itemTarget = itemTarget;
  return {
    titleReady: titleReady,
    titleTarget: titleTarget,
    itemReady: itemReady,
    itemTarget: itemTarget,
    sfxReady: sfxStock.ready || 0,
    sfxTarget: sfxStock.target || 7,
    idbChecking: !audioStock.idbInventoryReady,
    sfxChecking: !sfxStock.inventoryReady
  };
}

/**
 * メニュー／表示カテゴリ／追加編集の音声状況表示を同期
 */
function syncAudioStockStatusUi() {
  var summary = getAudioStockStatusSummary();
  function setVal(el, text, kind) {
    if (!el) {
      return;
    }
    el.textContent = text;
    el.classList.remove('is-ok', 'is-lack', 'is-wait');
    el.classList.add(kind === 'ok' ? 'is-ok' : (kind === 'wait' ? 'is-wait' : 'is-lack'));
  }
  if (summary.idbChecking) {
    setVal(dom.audioStockTitleValue, '確認中', 'wait');
    setVal(dom.audioStockQaValue, '確認中', 'wait');
  } else {
    setVal(
      dom.audioStockTitleValue,
      summary.titleReady + '/' + summary.titleTarget,
      summary.titleReady >= summary.titleTarget && summary.titleTarget > 0 ? 'ok' : 'lack'
    );
    setVal(
      dom.audioStockQaValue,
      summary.itemReady + '/' + summary.itemTarget,
      summary.itemReady >= summary.itemTarget && summary.itemTarget > 0 ? 'ok' : 'lack'
    );
  }
  // 効果音の内部集計は継続するが、メニューには出さない
  if (typeof updateVisibleCategoriesIdbLabels === 'function') {
    updateVisibleCategoriesIdbLabels();
  }
  if (typeof syncAddStudyItemAudioStatusUi === 'function') {
    syncAddStudyItemAudioStatusUi();
  }
  if (typeof refreshHomeCategoryAudioDlUi === 'function') {
    refreshHomeCategoryAudioDlUi();
  }
  if (typeof refreshLearningIdbStatusUi === 'function') {
    refreshLearningIdbStatusUi();
  }
}

/**
 * 効果音の読み込み結果を記録
 * @param {string} url
 * @param {boolean} ok
 */
function noteSfxLoadResult_(url, ok) {
  if (!url) {
    return;
  }
  var prev = sfxStock.byUrl[url];
  sfxStock.byUrl[url] = !!ok;
  if (prev === true && !ok && sfxStock.ready > 0) {
    sfxStock.ready -= 1;
  } else if (prev !== true && ok) {
    sfxStock.ready += 1;
  }
  var keys = Object.keys(sfxStock.byUrl);
  if (keys.length >= sfxStock.target) {
    sfxStock.inventoryReady = true;
  }
  if (typeof syncAudioStockStatusUi === 'function') {
    syncAudioStockStatusUi();
  }
}

function refreshAudioIdbStats(onDone) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  // 学習中は IdB 全件 getAll を抑止（タップ応答性優先。Mem キャッシュは別途更新される）
  if (typeof isActiveLearningSession === 'function' && isActiveLearningSession()) {
    done();
    return;
  }
  var targets = collectAudioPrefetchJobs();
  audioStock.idbTarget = targets.length;
  openAudioIdb().then(function(db) {
    if (!db) {
      audioStock.idbIds = {};
      audioStock.idbReady = 0;
      audioStock.idbBytes = 0;
      audioStock.idbInventoryReady = true;
      invalidateCategoryIdbProgressCache();
      refreshLoadDiagUi();
      notifyVisibleCategoriesAfterIdbStats();
      if (typeof syncAudioStockStatusUi === 'function') {
        syncAudioStockStatusUi();
      }
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
        audioStock.idbInventoryReady = true;
        invalidateCategoryIdbProgressCache();
        refreshLoadDiagUi();
        notifyVisibleCategoriesAfterIdbStats();
        if (typeof syncAudioStockStatusUi === 'function') {
          syncAudioStockStatusUi();
        }
        done();
      };
      req.onerror = function() {
        audioStock.idbInventoryReady = true;
        refreshLoadDiagUi();
        notifyVisibleCategoriesAfterIdbStats();
        if (typeof syncAudioStockStatusUi === 'function') {
          syncAudioStockStatusUi();
        }
        done();
      };
    } catch (e) {
      audioStock.idbInventoryReady = true;
      refreshLoadDiagUi();
      notifyVisibleCategoriesAfterIdbStats();
      if (typeof syncAudioStockStatusUi === 'function') {
        syncAudioStockStatusUi();
      }
      done();
    }
  });
}

/**
 * カテゴリ別の揃い（問題単位）。互換のため ready/target を返す
 * @returns {Object.<string, {ready: number, target: number, titleReady: boolean|null, checking: boolean}>}
 */
function buildCategoryIdbProgressMap() {
  var status = buildCategoryAudioStatusMap();
  var out = {};
  var keys = Object.keys(status);
  var i;
  for (i = 0; i < keys.length; i++) {
    var row = status[keys[i]];
    out[keys[i]] = {
      ready: row.itemReady || 0,
      target: row.itemTarget || 0,
      titleReady: row.titleReady,
      checking: !!row.checking
    };
  }
  return out;
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
  var idbId = audioIdbRecordId(cacheKey);
  getAudioIdbRecord(idbId, function(record) {
    if (!record || !record.audioContent) {
      // idbIds が残っていても実体が無いときは欠落とみなし、準備スキップを防ぐ
      clearStaleAudioIdbId_(idbId);
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
 * IdB 実体が無いのに idbIds だけ残っている場合の補正
 * @param {string} idbId
 */
function clearStaleAudioIdbId_(idbId) {
  if (!idbId || !audioStock.idbIds || !audioStock.idbIds[idbId]) {
    return;
  }
  delete audioStock.idbIds[idbId];
  if (audioStock.idbReady > 0) {
    audioStock.idbReady -= 1;
  }
  invalidateCategoryIdbProgressCache();
}

/**
 * 音声データをキャッシュに保存（Mem は即時。IdB は put 成功後に揃い扱い）
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
  var idbId = audioIdbRecordId(cacheKey);
  putAudioIdbRecord({
    id: idbId,
    audioContent: audioContent,
    timestamp: audioData.timestamp,
    textHash: audioData.textHash,
    byteLength: String(audioContent || '').length
  }, function(ok) {
    if (!ok) {
      return;
    }
    markAudioIdbIdReady_(idbId);
    if (typeof syncAudioStockStatusUi === 'function') {
      syncAudioStockStatusUi();
    }
    // 学習中は全件 getAll を避け、アイドル時のみ診断用に更新
    if (!(typeof isActiveLearningSession === 'function' && isActiveLearningSession())) {
      setTimeout(refreshAudioIdbStats, 0);
    }
  });
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

var TTS_TEXT_MAX_LENGTH = 1500;

/**
 * 出題／解答が読み上げ上限を超えたら、入力欄の下へ知らせる
 * @param {HTMLTextAreaElement|null} textarea
 * @param {HTMLElement|null} warningEl
 * @param {boolean} [forceHide]
 */
function refreshTtsLengthWarning(textarea, warningEl, forceHide) {
  if (!warningEl) {
    return;
  }
  var n = normalizeTextForTTS(textarea ? textarea.value : '').length;
  var over = !forceHide && n > TTS_TEXT_MAX_LENGTH;
  warningEl.hidden = !over;
  warningEl.textContent = over
    ? (TTS_TEXT_MAX_LENGTH + '文字を超えています（' + n + '文字）。このままでは読み上げできません。')
    : '';
  if (textarea) {
    textarea.classList.toggle('is-tts-too-long', over);
  }
}

function ttsLengthWarningElFor_(textarea) {
  if (!textarea) {
    return null;
  }
  if (textarea.id === 'questionTextEdit') {
    return dom.questionTtsLengthWarning;
  }
  if (textarea.id === 'answerTextEdit') {
    return dom.answerTtsLengthWarning;
  }
  if (textarea.id === 'addStudyItemQuestion') {
    return dom.addStudyItemQuestionTtsWarning;
  }
  if (textarea.id === 'addStudyItemAnswer') {
    return dom.addStudyItemAnswerTtsWarning;
  }
  return null;
}

function refreshTtsLengthWarningFor(textarea, forceHide) {
  refreshTtsLengthWarning(textarea, ttsLengthWarningElFor_(textarea), forceHide);
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
      if (typeof clearAddStudyAudioBusy_ === 'function') {
        clearAddStudyAudioBusy_();
      }
      updateFieldPlayButtons();
    }
    return;
  }

  if (source) {
    showAudioSourceDebug(source);
  }
  
  try {
    kickPcmAudioContext_();
    clearAudioBusyWatchdogs_();
    releaseCurrentAudioElement();

    var token = { kind: 'pending' };
    fieldPlay.audio = token;
    fieldPlay.field = fieldType || null;
    updateFieldPlayButtons();
    if (typeof refreshAddStudyListPlayButtons === 'function') {
      refreshAddStudyListPlayButtons();
    }

    var settled = false;

    function isThisPlay_() {
      return fieldPlay.audio === token ||
        (fieldPlay.audio && fieldPlay.audio.owner === token);
    }

    function settleThisPlay_(reason) {
      if (settled) {
        return;
      }
      if (!isThisPlay_() && fieldPlay.field !== fieldType) {
        return;
      }
      settled = true;
      clearAudioBusyWatchdogs_();
      if (isThisPlay_()) {
        fieldPlay.field = null;
        releaseCurrentAudioElement();
      } else if (fieldPlay.field === fieldType) {
        fieldPlay.field = null;
      }
      if (typeof clearAddStudyAudioBusy_ === 'function') {
        clearAddStudyAudioBusy_();
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

    audioWatch.playStartTimer = setTimeout(function() {
      audioWatch.playStartTimer = null;
      if (!isThisPlay_()) {
        return;
      }
      settleThisPlay_('fail');
    }, AUDIO_PLAY_START_TIMEOUT_MS);

    decodeAudioDataToBuffer_(audioData).then(function(buffer) {
      if (audioWatch.playStartTimer) {
        clearTimeout(audioWatch.playStartTimer);
        audioWatch.playStartTimer = null;
      }
      if (fieldPlay.audio !== token) {
        return;
      }
      var handle = playPcmBuffer_(buffer, {
        onEnded: function() {
          if (fieldPlay.audio !== handle) {
            return;
          }
          settleThisPlay_('ended');
        }
      });
      handle.owner = token;
      fieldPlay.audio = handle;
      armAudioBusyWatchdog_(handle);
    }).catch(function(error) {
      if (fieldPlay.audio !== token && !(fieldPlay.audio && fieldPlay.audio.owner === token)) {
        return;
      }
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
    if (typeof clearAddStudyAudioBusy_ === 'function') {
      clearAddStudyAudioBusy_();
    }
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
  if (!isAudioDownloadEnabled()) {
    hidePlayButtonLoading(fieldType);
    fieldPlay.field = null;
    updateFieldPlayButtons();
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    done();
    return;
  }
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
  if (!isAudioDownloadEnabled()) {
    hidePlayButtonLoading(fieldType);
    fieldPlay.field = null;
    updateFieldPlayButtons();
    if (fieldType === 'question') onQuestionAudioSettled('fail');
    done();
    return;
  }
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
    if (typeof clearAddStudyAudioBusy_ === 'function') {
      clearAddStudyAudioBusy_();
    }
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
 * 先読み対象から除外するカテゴリか（END のみ。表示カテゴリ OFF でも先読みする）
 * @param {string|number|null} categoryNo
 * @returns {boolean}
 */
function isAudioPrefetchExcludedCategory_(categoryNo) {
  if (categoryNo == null || categoryNo === '') {
    return true;
  }
  var cat = findCategoryByNo(categoryNo);
  return !!(cat && isEndCategory(cat));
}

/**
 * 先読み対象アイテム（END 以外の全カテゴリ、重複なし）
 * @returns {Object[]}
 */
function collectAudioPrefetchItems() {
  var byId = {};
  function addList(list) {
    (list || []).forEach(function(it) {
      if (!it || it.id == null) {
        return;
      }
      var catNo = it.category_no != null ? it.category_no : resolveItemCategoryNo(it);
      if (isAudioPrefetchExcludedCategory_(catNo)) {
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
    var catNo = item.category_no != null ? item.category_no : resolveItemCategoryNo(item);
    // 先読み優先の「表示カテゴリON」は希望（IdB未完了でも優先して埋める）
    var inVisiblePref = (typeof isCategoryNoInVisiblePreference === 'function')
      ? isCategoryNoInVisiblePreference(catNo)
      : (typeof isCategoryNoVisible === 'function' && isCategoryNoVisible(catNo));
    // いまの問題 → 学習List近傍 → 表示カテゴリ希望ON → その他
    var pri = inVisiblePref ? 40 : 50;
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
    var studyReady = audioStock.idbTarget > 0 && audioStock.idbReady >= audioStock.idbTarget;
    if (studyReady && !categoryGuidePrefetchPending_()) {
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
 * カテゴリ案内の先読み（出題・解答の idbReady/target には入れない）
 * 今のカテゴリ（カテゴリ毎だけ）は focus。ほかは出題ジョブの後ろ。
 * @returns {Array<{kind: string, categoryNo: *, text: string, voice: string, speed: string, idbId: string, focus: boolean}>}
 */
function collectCategoryGuidePrefetchJobs_() {
  var voice = (typeof getAudioVoice === 'function') ? getAudioVoice('question') : AUDIO_VOICE_DEFAULT;
  var speed = AUDIO_SPEED_FIXED;
  var cats = (typeof getConfigurableCategories === 'function') ? getConfigurableCategories() : [];
  var focusNo = '';
  var cross = (typeof isCrossCategoryQuestionMethod === 'function') && isCrossCategoryQuestionMethod();
  if (!cross && categoryCatalog && categoryCatalog.no != null && categoryCatalog.no !== '') {
    focusNo = String(categoryCatalog.no);
  }
  var jobs = [];
  var i;
  for (i = 0; i < cats.length; i++) {
    var cat = cats[i];
    var text = buildCategoryGuideText_(cat);
    if (!cat || cat.no == null || String(cat.no) === '' || !text) {
      continue;
    }
    var phrase = normalizeTextForTTS(text);
    if (!phrase || phrase.length > TTS_TEXT_MAX_LENGTH) {
      continue;
    }
    jobs.push({
      kind: 'categoryGuide',
      categoryNo: cat.no,
      text: phrase,
      voice: voice,
      speed: speed,
      idbId: categoryGuideIdbId_(cat.no, voice, speed),
      focus: focusNo !== '' && String(cat.no) === focusNo
    });
  }
  return jobs;
}

/**
 * 「終わり」の先読み（Drive 無し。ON時 TTS。出題・解答の idbReady/target には入れない）
 * @returns {Array<{kind: string, categoryNo: *, text: string, voice: string, speed: string, idbId: string, focus: boolean}>}
 */
function collectCategoryEndPrefetchJobs_() {
  var voice = (typeof getAudioVoice === 'function') ? getAudioVoice('question') : AUDIO_VOICE_DEFAULT;
  var speed = AUDIO_SPEED_FIXED;
  var cats = (typeof getConfigurableCategories === 'function') ? getConfigurableCategories() : [];
  var focusNo = '';
  var cross = (typeof isCrossCategoryQuestionMethod === 'function') && isCrossCategoryQuestionMethod();
  if (!cross && categoryCatalog && categoryCatalog.no != null && categoryCatalog.no !== '') {
    focusNo = String(categoryCatalog.no);
  }
  var jobs = [];
  var i;
  for (i = 0; i < cats.length; i++) {
    var cat = cats[i];
    var text = typeof buildCategoryEndText_ === 'function' ? buildCategoryEndText_(cat) : '';
    if (!cat || cat.no == null || String(cat.no) === '' || !text) {
      continue;
    }
    var phrase = normalizeTextForTTS(text);
    if (!phrase || phrase.length > TTS_TEXT_MAX_LENGTH) {
      continue;
    }
    var cacheKey = phrase + '_' + voice + '_' + speed;
    jobs.push({
      kind: 'categoryEnd',
      categoryNo: cat.no,
      text: phrase,
      voice: voice,
      speed: speed,
      idbId: audioIdbRecordId(cacheKey),
      focus: focusNo !== '' && String(cat.no) === focusNo
    });
  }
  return jobs;
}

/**
 * 案内全文または「終わり」がメモリにも端末にも無い
 * @returns {boolean}
 */
function categoryGuidePrefetchPending_() {
  var jobs = collectCategoryGuidePrefetchJobs_().concat(collectCategoryEndPrefetchJobs_());
  var i;
  for (i = 0; i < jobs.length; i++) {
    var job = jobs[i];
    if (getCachedAudio(job.text, job.voice, job.speed)) {
      continue;
    }
    if (audioStock.idbIds && audioStock.idbIds[job.idbId]) {
      continue;
    }
    return true;
  }
  return false;
}

/**
 * 先読みで取った案内を端末フラグに反映（IdB put 成功後に呼ぶ）
 * @param {string} idbId
 */
function noteCategoryGuideCached_(idbId) {
  if (!idbId) {
    return;
  }
  markAudioIdbIdReady_(idbId);
  if (typeof syncAudioStockStatusUi === 'function') {
    syncAudioStockStatusUi();
  }
}

/**
 * 先読みキューを組み直す（Driveのみ。TTSしない）
 */
function scheduleAudioPrefetch() {
  if (!ENABLE_AUDIO_PREFETCH || audioPrefetch.stopped) {
    return;
  }
  if (!isAudioDownloadEnabled()) {
    // OFF でも端末集計は更新する（起動直後のタイトル 0 誤表示を防ぐ）
    refreshAudioIdbStats();
    return;
  }
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    return;
  }
  if (!googleAuth.email || !hasUsableAuth()) {
    return;
  }
  if (shouldSuppressAudioPrefetch_()) {
    return;
  }
  if (isAddStudyDeferringAudio_()) {
    armAudioPrefetchRecheck_(AUDIO_PREFETCH_RECHECK_MS);
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
  var guideJobs = collectCategoryGuidePrefetchJobs_();
  var endJobs = collectCategoryEndPrefetchJobs_();
  var maxPri = 0;
  var gi;
  for (gi = 0; gi < jobs.length; gi++) {
    if (jobs[gi].priority > maxPri) {
      maxPri = jobs[gi].priority;
    }
  }
  for (gi = 0; gi < guideJobs.length; gi++) {
    guideJobs[gi].priority = guideJobs[gi].focus ? 0.5 : (maxPri + 1);
    jobs.push(guideJobs[gi]);
  }
  for (gi = 0; gi < endJobs.length; gi++) {
    // 案内の直後に「終わり」（focus は 0.55、他は案内と同じ帯の直後）
    endJobs[gi].priority = endJobs[gi].focus ? 0.55 : (maxPri + 1.1);
    jobs.push(endJobs[gi]);
  }
  jobs.sort(function(a, b) {
    return a.priority - b.priority;
  });
  var queued = 0;
  jobs.forEach(function(job) {
    if (getCachedAudio(job.text, job.voice, job.speed)) {
      // Mem だけでスキップせず、IdB 未書き込みなら書き戻す
      if (!(audioStock.idbIds && audioStock.idbIds[job.idbId])) {
        if (job.kind === 'categoryGuide') {
          ensureCategoryGuidePersistedToIdb_(job);
        } else {
          ensureAudioPersistedToIdb_(job.text, job.voice, job.speed);
        }
      }
      return;
    }
    if (audioStock.idbIds && audioStock.idbIds[job.idbId]) {
      return;
    }
    queued += 1;
    enqueueGasAudioFetch(function(signal, generation, done) {
      if (job.kind === 'categoryGuide') {
        prefetchOneCategoryGuide_(job, signal, generation, done);
        return;
      }
      if (job.kind === 'categoryEnd') {
        prefetchOneCategoryEnd_(job, signal, generation, done);
        return;
      }
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

/**
 * カテゴリ案内の先読み1本（Drive hit のみ。miss は TTS しない。揃い件数は増やさない）
 */
function prefetchOneCategoryGuide_(job, signal, generation, done) {
  if (generation !== audioFetch.generation) {
    done();
    return;
  }
  if (!job || job.categoryNo == null || String(job.categoryNo) === '' || !job.text) {
    done();
    return;
  }
  getCategoryGuideFromIdb_(job.categoryNo, job.text, job.voice, job.speed, function(cached) {
    if (cached) {
      if (cached.source === 'indexedDB' || (audioStock.idbIds && audioStock.idbIds[job.idbId])) {
        noteCategoryGuideCached_(job.idbId);
        done();
        return;
      }
      ensureCategoryGuidePersistedToIdb_(job, function() {
        done();
      });
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
      params.append('field', 'category');
      params.append('categoryNo', String(job.categoryNo));
      params.append('voiceGender', job.voice);
      params.append('speed', job.speed);
      appendAuthParams(params);
      params.append('referer', window.location.origin || '');

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
            rememberCategoryGuideAudio_(job.text, data.audioContent, job.voice, job.speed, job.categoryNo);
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

/**
 * 「終わり」の先読み1本（Drive 無し。Cloud TTS → IdB／Mem。再生しない）
 */
function prefetchOneCategoryEnd_(job, signal, generation, done) {
  if (generation !== audioFetch.generation) {
    done();
    return;
  }
  if (!job || !job.text) {
    done();
    return;
  }
  getCachedAudioFromIdb(job.text, job.voice, job.speed, function(cached) {
    if (cached) {
      if (cached.source === 'indexedDB' || (audioStock.idbIds && audioStock.idbIds[job.idbId])) {
        markAudioIdbIdReady_(job.idbId);
        if (typeof syncAudioStockStatusUi === 'function') {
          syncAudioStockStatusUi();
        }
        done();
        return;
      }
      ensureAudioPersistedToIdb_(job.text, job.voice, job.speed, function() {
        done();
      });
      return;
    }
    ensureFreshGoogleAuthToken(function() {
      if (generation !== audioFetch.generation) {
        done();
        return;
      }
      beginLoadDiag('run', '先読み', 1, {
        status: 'TTS',
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

      synthesizeTtsAudioContent_(job.text, job.voice, job.speed, signal)
        .then(function(audioContent) {
          if (timedOut) {
            throw new Error('タイムアウト');
          }
          clearTimeout(timeoutId);
          if (generation !== audioFetch.generation) {
            done();
            return;
          }
          saveAudioToCache(job.text, audioContent, job.voice, job.speed);
          finishLoadDiag('run', 'OK', { ok: true, bytes: String(audioContent).length });
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

/**
 * Cloud TTS のみ（再生しない）
 * @param {string} text
 * @param {string} voiceGender
 * @param {string} speed
 * @param {AbortSignal|null} [signal]
 * @returns {Promise<string>}
 */
function synthesizeTtsAudioContent_(text, voiceGender, speed, signal) {
  var params = new URLSearchParams();
  params.append('text', text);
  params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
  params.append('speed', speed || AUDIO_SPEED_FIXED);
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  return postGasJson(params, { signal: signal }).then(function(data) {
    if (data && data.success && data.audioContent) {
      return String(data.audioContent);
    }
    throw new Error((data && data.error) || 'TTS failed');
  });
}

/**
 * 保存成功後の音声準備ジョブを積む（追加の GAS 待ちが明けてから実行）
 * @param {Object} item
 * @param {{fields?: string[]}} [options] fields は sheet 基準 'question'|'answer'
 */
function enqueueStudyItemAudioPrepare(item, options) {
  if (!item || item.id == null || !canUseDriveAudioMeta(item)) {
    return;
  }
  if (!ENABLE_AUDIO_PREFETCH) {
    return;
  }
  if (!WEB_APP_URL || WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    return;
  }
  if (!googleAuth.email || !hasUsableAuth()) {
    return;
  }
  options = options || {};
  var fields = options.fields && options.fields.length
    ? options.fields.slice()
    : ['question', 'answer'];
  // Drive ファイル名は列基準。入替えONでも Q列／A列の本文で準備する
  var qVoice = getAudioVoice(isSwapQAEnabled() ? 'answer' : 'question');
  var aVoice = getAudioVoice(isSwapQAEnabled() ? 'question' : 'answer');
  var speed = AUDIO_SPEED_FIXED;
  for (var i = 0; i < fields.length; i++) {
    var sheetField = fields[i] === 'answer' ? 'answer' : 'question';
    var text = sheetField === 'answer'
      ? (item.answer != null ? String(item.answer) : '')
      : (item.question != null ? String(item.question) : '');
    text = normalizeTextForTTS(text);
    if (!text || isImageUrl(text)) {
      continue;
    }
    var voice = sheetField === 'answer' ? aVoice : qVoice;
    var cacheKey = text + '_' + voice + '_' + speed;
    var idbId = audioIdbRecordId(cacheKey);
    var dup = false;
    for (var q = 0; q < studyAudioPrepare.queue.length; q++) {
      var pending = studyAudioPrepare.queue[q];
      if (pending && pending.idbId === idbId &&
          String(pending.item && pending.item.id) === String(item.id) &&
          pending.field === sheetField) {
        dup = true;
        break;
      }
    }
    if (dup) {
      continue;
    }
    studyAudioPrepare.queue.push({
      item: {
        id: item.id,
        no: item.no,
        category_no: item.category_no != null ? item.category_no : resolveItemCategoryNo(item),
        question: item.question,
        answer: item.answer
      },
      text: text,
      voice: voice,
      speed: speed,
      field: sheetField,
      idbId: idbId
    });
  }
  flushStudyAudioPrepareQueue_();
}

/**
 * 準備キューを処理開始する（追加の GAS 待ち・本問再生中は process 側で動かさない）
 */
function flushStudyAudioPrepareQueue_() {
  if (isAddStudyDeferringAudio_()) {
    return;
  }
  if (!studyAudioPrepare.queue.length) {
    notifyStudyAudioPrepareMaybeIdle_();
    return;
  }
  processGasAudioFetchQueue();
}

/**
 * 音声準備が動いているか
 * @returns {boolean}
 */
function isStudyAudioPrepareBusy() {
  return studyAudioPrepare.queue.length > 0 || !!studyAudioPrepare.activeItemId;
}

/**
 * 準備キューが空になったら待ちコールバックを実行
 */
function notifyStudyAudioPrepareMaybeIdle_() {
  if (isStudyAudioPrepareBusy()) {
    return;
  }
  var waiters = studyAudioPrepare.waiters.slice();
  studyAudioPrepare.waiters = [];
  for (var i = 0; i < waiters.length; i++) {
    try {
      waiters[i]();
    } catch (e) {
      // ignore
    }
  }
}

/**
 * 追加画面の進捗バーを更新（準備待ち中のみ）
 */
function refreshAddStudyAudioPrepareProgressUi_() {
  if (!studyAudioPrepare.progressActive) {
    return;
  }
  if (typeof updateAddStudyItemStatusProgress !== 'function') {
    return;
  }
  if (!addStudy.awaitingAudioPrepare) {
    return;
  }
  var total = studyAudioPrepare.progressTotal || 0;
  if (total <= 0) {
    updateAddStudyItemStatusProgress(1);
    return;
  }
  updateAddStudyItemStatusProgress(studyAudioPrepare.progressDone / total);
}

/**
 * Start 前準備の進捗表示を更新
 */
function refreshStartAudioPrepareProgressUi_() {
  if (typeof syncStartAudioPrepareUi === 'function') {
    syncStartAudioPrepareUi();
  }
}

/**
 * 準備1本が完了（再キューしない経路）したときの進捗
 */
function noteStudyAudioPrepareProgressStep_() {
  if (!studyAudioPrepare.progressActive) {
    return;
  }
  studyAudioPrepare.progressDone += 1;
  if (studyAudioPrepare.progressDone > studyAudioPrepare.progressTotal) {
    studyAudioPrepare.progressDone = studyAudioPrepare.progressTotal;
  }
  refreshAddStudyAudioPrepareProgressUi_();
  refreshStartAudioPrepareProgressUi_();
}

/**
 * 進捗トラッキング終了
 */
function clearStudyAudioPrepareProgress_() {
  studyAudioPrepare.progressActive = false;
  studyAudioPrepare.progressTotal = 0;
  studyAudioPrepare.progressDone = 0;
  if (typeof hideAddStudyItemStatusProgress === 'function' && !addStudy.awaitingAudioPrepare) {
    hideAddStudyItemStatusProgress();
  }
  if (typeof syncStartAudioPrepareUi === 'function' && startAudioPrepare && !startAudioPrepare.busy) {
    syncStartAudioPrepareUi();
  }
}

/**
 * 複数問題の不足音声を準備し、完了後に onDone
 * @param {Object[]} items
 * @param {function(): void} [onDone]
 * @param {{skipIdbRefresh?: boolean}} [options] Start 直前に既に再集計済みなら skip
 */
function prepareStudyItemsAudio(items, onDone, options) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  var list = items || [];
  if (!list.length) {
    done();
    return;
  }
  options = options || {};
  function runPrepare() {
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      var missing = getStudyItemMissingAudioFields(list[i]);
      total += missing.length;
      if (missing.length) {
        enqueueStudyItemAudioPrepare(list[i], { fields: missing });
      }
    }
    // 追加画面：シート保存完了を1ステップ数え、音声準備中に入った時点でバーを進める
    if (addStudy.awaitingAudioPrepare) {
      studyAudioPrepare.progressActive = true;
      studyAudioPrepare.progressTotal = total + 1;
      studyAudioPrepare.progressDone = 1;
      refreshAddStudyAudioPrepareProgressUi_();
    } else if (startAudioPrepare && startAudioPrepare.busy) {
      // Start 前準備：不足欄数だけ（保存ステップは無し）
      studyAudioPrepare.progressActive = true;
      studyAudioPrepare.progressTotal = total;
      studyAudioPrepare.progressDone = 0;
      refreshStartAudioPrepareProgressUi_();
    }
    if (!isStudyAudioPrepareBusy()) {
      if (addStudy.awaitingAudioPrepare || (startAudioPrepare && startAudioPrepare.busy)) {
        studyAudioPrepare.progressDone = studyAudioPrepare.progressTotal;
        refreshAddStudyAudioPrepareProgressUi_();
        refreshStartAudioPrepareProgressUi_();
        clearStudyAudioPrepareProgress_();
      }
      done();
      return;
    }
    studyAudioPrepare.waiters.push(function() {
      clearStudyAudioPrepareProgress_();
      done();
    });
    flushStudyAudioPrepareQueue_();
  }
  // idbIds の陳腐化で不足判定を誤らないよう、準備前に IdB 実在を再集計する
  if (!options.skipIdbRefresh && typeof refreshAudioIdbStats === 'function') {
    refreshAudioIdbStats(runPrepare);
    return;
  }
  runPrepare();
}

/**
 * 音声の Drive／TTS 取得が許可されているか（セッション・既定 OFF）
 * @returns {boolean}
 */
function isAudioDownloadEnabled() {
  return audioDownloadEnabled === true;
}

/**
 * 出題・解答の必要音声が Mem／IdB に揃っているか
 * @param {Object} item
 * @returns {boolean}
 */
function isStudyItemLocalAudioReady(item) {
  if (!item) {
    return false;
  }
  return getStudyItemMissingAudioFields(item).length === 0;
}

/**
 * カテゴリ内のローカル音声揃い問題数
 * @param {string|number} categoryNo
 * @returns {number}
 */
function countLocalReadyItemsInCategory(categoryNo) {
  if (categoryNo == null || categoryNo === '') {
    return 0;
  }
  var key = String(categoryNo);
  var items = (typeof getMemoryAllStudyItems === 'function')
    ? getMemoryAllStudyItems()
    : [];
  var n = 0;
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it || String(it.category_no) !== key) {
      continue;
    }
    if (isStudyItemLocalAudioReady(it)) {
      n += 1;
    }
  }
  return n;
}

/**
 * 音声ダウンロード OFF 時はローカル揃い問題だけ残す
 * @param {Array} items
 * @returns {Array}
 */
function filterItemsForAudioDownloadMode(items) {
  if (isAudioDownloadEnabled()) {
    return items || [];
  }
  return (items || []).filter(function(it) {
    return isStudyItemLocalAudioReady(it);
  });
}

/**
 * 当該問題で無い欄（sheet 基準。Start前準備・追加保存後準備で使用）
 * @param {Object} item
 * @param {{idbOnly?: boolean}} [options] - true なら IdB のみ（メニュー済未用）。省略時は Mem／IdB
 * @returns {string[]} 'question'|'answer'
 */
function getStudyItemMissingAudioFields(item, options) {
  var missing = [];
  options = options || {};
  var idbOnly = !!options.idbOnly;
  if (!item || item.id == null) {
    return missing;
  }
  var qVoice = getAudioVoice(isSwapQAEnabled() ? 'answer' : 'question');
  var aVoice = getAudioVoice(isSwapQAEnabled() ? 'question' : 'answer');
  var speed = AUDIO_SPEED_FIXED;
  var fields = [
    { field: 'question', text: item.question, voice: qVoice },
    { field: 'answer', text: item.answer, voice: aVoice }
  ];
  for (var i = 0; i < fields.length; i++) {
    var sheetField = fields[i].field;
    var text = normalizeTextForTTS(fields[i].text != null ? String(fields[i].text) : '');
    if (!text || isImageUrl(text)) {
      continue;
    }
    var voice = fields[i].voice;
    if (!idbOnly && getCachedAudio(text, voice, speed)) {
      continue;
    }
    var idbId = audioIdbRecordId(text + '_' + voice + '_' + speed);
    if (audioStock.idbIds && audioStock.idbIds[idbId]) {
      continue;
    }
    missing.push(sheetField);
  }
  return missing;
}

/**
 * 追加の音声準備進捗に合わせ、表示カテゴリの IdB ラベル等を更新
 */
function notifyAddStudyAudioPrepareProgress_() {
  if (typeof refreshAudioIdbStats !== 'function') {
    if (typeof syncAudioStockStatusUi === 'function') {
      syncAudioStockStatusUi();
    }
    return;
  }
  refreshAudioIdbStats(function() {
    if (typeof syncAudioStockStatusUi === 'function') {
      syncAudioStockStatusUi();
    }
  });
}

/**
 * 1欄：Mem／IdB → Drive → 無ければ TTS→Drive保存→IdB（再生しない）
 * @param {Object} job
 * @param {AbortSignal|null} signal
 * @param {number} generation
 * @param {function(): void} done
 */
function ensureStudyItemFieldAudio_(job, signal, generation, done) {
  var settled = false;
  var requeued = false;
  function finish() {
    if (settled) {
      return;
    }
    settled = true;
    if (!requeued) {
      noteStudyAudioPrepareProgressStep_();
    }
    done();
  }
  function requeueAndFinish() {
    requeued = true;
    studyAudioPrepare.queue.unshift(job);
    finish();
  }

  if (!job || generation !== audioFetch.generation) {
    finish();
    return;
  }
  if (isAddStudyDeferringAudio_()) {
    requeueAndFinish();
    return;
  }
  if (getCachedAudio(job.text, job.voice, job.speed)) {
    finish();
    return;
  }
  getCachedAudioFromIdb(job.text, job.voice, job.speed, function(cached) {
    if (cached) {
      finish();
      return;
    }
    if (!isAudioDownloadEnabled()) {
      finish();
      return;
    }
    ensureFreshGoogleAuthToken(function() {
      if (generation !== audioFetch.generation) {
        finish();
        return;
      }
      if (!isAudioDownloadEnabled()) {
        finish();
        return;
      }
      if (isAddStudyDeferringAudio_()) {
        requeueAndFinish();
        return;
      }
      beginLoadDiag('run', '準備', 1, {
        status: '取得中',
        queueWait: audioFetch.prefetchQueue.length
      });
      var params = new URLSearchParams();
      params.append('action', 'getDriveAudio');
      params.append('id', String(job.item.id));
      params.append('categoryNo', String(resolveItemCategoryNo(job.item)));
      params.append('no', String(job.item.no));
      params.append('field', job.field);
      params.append('voiceGender', job.voice);
      params.append('speed', job.speed);
      appendAuthParams(params);
      params.append('referer', window.location.origin || '');

      postGasJson(params, {
        signal: signal,
        httpErrorPrefix: 'drive fetch failed: '
      })
        .then(function(data) {
          if (generation !== audioFetch.generation) {
            finish();
            return;
          }
          if (data && data.success && data.found && data.audioContent) {
            saveAudioToCache(job.text, data.audioContent, job.voice, job.speed);
            finishLoadDiag('run', 'OK', {
              ok: true,
              bytes: String(data.audioContent).length
            });
            finish();
            return;
          }
          updateLoadDiag('run', { phase: 'TTS', status: '取得中' });
          return synthesizeTtsAudioContent_(job.text, job.voice, job.speed, signal)
            .then(function(audioContent) {
              if (generation !== audioFetch.generation) {
                finish();
                return;
              }
              saveAudioToCache(job.text, audioContent, job.voice, job.speed);
              return saveDriveAudioAsync(
                job.item,
                job.field,
                job.voice,
                job.speed,
                audioContent
              ).then(function() {
                finishLoadDiag('run', 'OK', {
                  ok: true,
                  bytes: String(audioContent).length
                });
                finish();
              });
            });
        })
        .catch(function(error) {
          if (generation !== audioFetch.generation) {
            finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false });
            finish();
            return;
          }
          if (isAbortError(error)) {
            // 本問再生や追加待ちで中断：キューに戻して再開を待つ
            finishLoadDiag('run', 'abort', { ok: false });
            requeueAndFinish();
            return;
          }
          finishLoadDiag('run', loadDiagStatusFromError(error), { ok: false });
          console.warn('study audio prepare failed:', error);
          finish();
        });
    }, function() {
      finish();
    });
  });
}

function fetchDriveAudioCoverage() {
  if (!isAudioDownloadEnabled()) {
    return;
  }
  if (!googleAuth.email || !hasUsableAuth()) {
    return;
  }
  // IdB／先読みと同じく END 以外全カテゴリ（表示カテゴリ ON/OFF に依存しない）
  var nos = (typeof getConfigurableCategories === 'function'
    ? getConfigurableCategories()
    : (categoryCatalog.list || []).filter(function(cat) {
      return cat && !isEndCategory(cat);
    })).map(function(cat) {
    return cat.no;
  });
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

/**
 * カテゴリ案内（カテゴリ毎だけ）。揃い件数はタイトルとしてメニュー等で表示する。
 */
var categoryAnnounce = {
  generation: 0,
  audio: null,
  pendingStart: null,
  heard: null,
  editPlaying: false,
  finish: null,
  awaitingAdvance: false,
  waitShowFirst: null,
  waitCategoryNo: null,
  // 完了画面の聞き直し（中央は奪わない）。'end' | 'title' | null
  completionReplayKind: null,
  completionReplayCategoryNo: null
};

/**
 * @param {*} categoryNo
 * @returns {Object|null}
 */
function findCatalogCategory_(categoryNo) {
  if (categoryNo == null || String(categoryNo) === '') {
    return null;
  }
  var want = String(categoryNo);
  var list = (categoryCatalog && categoryCatalog.list) ? categoryCatalog.list : [];
  var i;
  for (i = 0; i < list.length; i++) {
    if (list[i] && String(list[i].no) === want) {
      return list[i];
    }
  }
  if (typeof getConfigurableCategories === 'function') {
    var cats = getConfigurableCategories();
    for (i = 0; i < cats.length; i++) {
      if (cats[i] && String(cats[i].no) === want) {
        return cats[i];
      }
    }
  }
  return null;
}

/**
 * @param {Object|null} cat
 * @returns {string}
 */
function buildCategoryGuideText_(cat) {
  if (!cat) {
    return '';
  }
  var raw = String(cat.name || cat.category || '').trim();
  var visible = (typeof categoryVisibleName_ === 'function')
    ? categoryVisibleName_(raw)
    : raw;
  if (!visible || visible === 'END') {
    return '';
  }
  var order = (typeof getCategoryOrderSortValue === 'function')
    ? getCategoryOrderSortValue(cat)
    : (cat.no != null ? cat.no : '');
  return 'カテゴリ。' + order + '。' + raw;
}

/**
 * @param {Object|null} cat
 * @returns {string}
 */
function buildCategoryEndText_(cat) {
  if (!cat) {
    return '';
  }
  var raw = String(cat.name || cat.category || '').trim();
  var visible = (typeof categoryVisibleName_ === 'function')
    ? categoryVisibleName_(raw)
    : raw;
  if (!visible || visible === 'END') {
    return '';
  }
  return raw + '、終わり';
}

function releaseCategoryAnnounceAudio_() {
  var audio = categoryAnnounce.audio;
  categoryAnnounce.audio = null;
  stopPcmPlayback_(audio);
}

/**
 * 案内の再生を止める。
 * keepPending: 最初の出題はまだ出さない。
 * continueStart: 止めたあと最初の出題へ進む。
 * cancelPending: 最初の出題は出さない。
 * @param {{keepPending?: boolean, continueStart?: boolean, cancelPending?: boolean}} [options]
 * @returns {boolean} 案内待ちの最初の出題を出したとき true
 */
function stopCategoryAnnounce(options) {
  options = options || {};
  categoryAnnounce.generation += 1;
  releaseCategoryAnnounceAudio_();
  if (typeof audioPrefetch !== 'undefined' && audioPrefetch) {
    audioPrefetch.playBlocked = false;
  }
  var fin = categoryAnnounce.finish;
  categoryAnnounce.finish = null;
  if (typeof fin === 'function') {
    fin('abort');
  }
  var next = null;
  if (!options.keepPending) {
    next = categoryAnnounce.pendingStart;
    categoryAnnounce.pendingStart = null;
  }
  if (options.continueStart && typeof next === 'function') {
    next();
    return true;
  }
  return false;
}

/**
 * Mem にあるカテゴリ案内を安定キーで IdB へ書き戻す
 * @param {{categoryNo: *, text: string, voice: string, speed: string, idbId: string}} job
 * @param {function(boolean): void} [onDone]
 */
function ensureCategoryGuidePersistedToIdb_(job, onDone) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  if (!job || !job.idbId) {
    done(false);
    return;
  }
  if (audioStock.idbIds && audioStock.idbIds[job.idbId]) {
    done(true);
    return;
  }
  var mem = getCachedAudio(job.text, job.voice, job.speed);
  var audioData = mem && mem.audioData ? mem.audioData : null;
  if (!audioData || !audioData.audioContent) {
    done(false);
    return;
  }
  putAudioIdbRecord({
    id: job.idbId,
    audioContent: audioData.audioContent,
    timestamp: audioData.timestamp || Date.now(),
    textHash: audioData.textHash || hashText(job.text + '_' + job.voice + '_' + job.speed),
    byteLength: String(audioData.audioContent || '').length,
    categoryNo: job.categoryNo != null ? String(job.categoryNo) : ''
  }, function(ok) {
    if (ok) {
      noteCategoryGuideCached_(job.idbId);
    }
    done(ok);
  });
}

/**
 * IdB のカテゴリ案内を Mem に載せる（安定キー優先、旧本文キーも可）
 * @param {string|number} categoryNo
 * @param {string} text
 * @param {string} voice
 * @param {string} speed
 * @param {function({audioData: Object, source: string}|null): void} onDone
 */
function getCategoryGuideFromIdb_(categoryNo, text, voice, speed, onDone) {
  var done = typeof onDone === 'function' ? onDone : function() {};
  var v = voice || AUDIO_VOICE_DEFAULT;
  var sp = speed || AUDIO_SPEED_FIXED;
  var phrase = normalizeTextForTTS(text || '');
  var stableId = categoryGuideIdbId_(categoryNo, v, sp);
  var mem = getCachedAudio(phrase, v, sp);
  if (mem) {
    done(mem);
    return;
  }
  getAudioIdbRecord(stableId, function(record) {
    if (record && record.audioContent) {
      var cacheKey = phrase + '_' + v + '_' + sp;
      var audioData = {
        audioContent: record.audioContent,
        timestamp: record.timestamp || Date.now(),
        textHash: record.textHash || hashText(cacheKey)
      };
      ensureMp3BlobOnAudioData(audioData);
      if (phrase) {
        audioCache[cacheKey] = audioData;
      }
      done({ audioData: audioData, source: 'indexedDB' });
      return;
    }
    getCachedAudioFromIdb(phrase, v, sp, function(legacy) {
      if (legacy && legacy.audioData && legacy.audioData.audioContent) {
        putAudioIdbRecord({
          id: stableId,
          audioContent: legacy.audioData.audioContent,
          timestamp: legacy.audioData.timestamp || Date.now(),
          textHash: legacy.audioData.textHash || hashText(phrase + '_' + v + '_' + sp),
          byteLength: String(legacy.audioData.audioContent || '').length,
          categoryNo: String(categoryNo)
        }, function(ok) {
          if (ok) {
            noteCategoryGuideCached_(stableId);
          }
        });
      }
      done(legacy);
    });
  });
}

/**
 * 案内を Mem に置き、IdB put 成功後に揃いフラグを立てる（安定キー）。
 * @param {string} text
 * @param {string} audioContent
 * @param {string} voiceGender
 * @param {string} speed
 * @param {string|number} [categoryNo]
 * @returns {Object}
 */
function rememberCategoryGuideAudio_(text, audioContent, voiceGender, speed, categoryNo) {
  var normalizedText = normalizeTextForTTS(text);
  var cacheKey = normalizedText + '_' + (voiceGender || AUDIO_VOICE_DEFAULT) + '_' + (speed || AUDIO_SPEED_FIXED);
  var audioData = {
    audioContent: audioContent,
    timestamp: Date.now(),
    textHash: hashText(cacheKey)
  };
  ensureMp3BlobOnAudioData(audioData);
  audioCache[cacheKey] = audioData;
  var idbId = (categoryNo != null && String(categoryNo) !== '')
    ? categoryGuideIdbId_(categoryNo, voiceGender, speed)
    : audioIdbRecordId(cacheKey);
  putAudioIdbRecord({
    id: idbId,
    audioContent: audioContent,
    timestamp: audioData.timestamp,
    textHash: audioData.textHash,
    byteLength: String(audioContent || '').length,
    categoryNo: categoryNo != null ? String(categoryNo) : ''
  }, function(ok) {
    if (ok) {
      noteCategoryGuideCached_(idbId);
    }
  });
  return audioData;
}

function saveCategoryGuideDriveAudio_(categoryNo, audioContent, voiceGender, speed, text) {
  if (!audioContent || !googleAuth.email || categoryNo == null || String(categoryNo) === '') {
    return;
  }
  try {
    var params = new URLSearchParams();
    params.append('action', 'saveDriveAudio');
    params.append('field', 'category');
    params.append('categoryNo', String(categoryNo));
    params.append('voiceGender', voiceGender || AUDIO_VOICE_DEFAULT);
    params.append('speed', speed || AUDIO_SPEED_FIXED);
    params.append('text', text || '');
    params.append('audioContent', audioContent);
    appendAuthParams(params);
    params.append('referer', window.location.origin || '');
    postGasJson(params).catch(function() {});
  } catch (e) {
    // 保存に失敗しても再生は続ける
  }
}

function deleteCategoryGuideAudio_(categoryNo) {
  if (categoryNo == null || String(categoryNo) === '' || !googleAuth.email) {
    return;
  }
  try {
    var params = new URLSearchParams();
    params.append('action', 'deleteDriveAudio');
    params.append('field', 'category');
    params.append('categoryNo', String(categoryNo));
    appendAuthParams(params);
    params.append('referer', window.location.origin || '');
    postGasJson(params).catch(function() {});
  } catch (e) {
    // 削除に失敗しても学習は続ける
  }
}

function startCategoryAnnouncePlayback_(audioData, gen, finish) {
  if (gen !== categoryAnnounce.generation) {
    return;
  }
  kickPcmAudioContext_();
  var token = { kind: 'pending', gen: gen };
  categoryAnnounce.audio = token;
  if (categoryAnnounce.editPlaying && typeof syncAddStudyItemEditorUi === 'function') {
    syncAddStudyItemEditorUi();
  }
  decodeAudioDataToBuffer_(audioData).then(function(buffer) {
    if (gen !== categoryAnnounce.generation || categoryAnnounce.audio !== token) {
      return;
    }
    var handle = playPcmBuffer_(buffer, {
      onEnded: function() {
        if (categoryAnnounce.audio !== handle) {
          return;
        }
        categoryAnnounce.audio = null;
        finish('ended');
      }
    });
    categoryAnnounce.audio = handle;
  }).catch(function() {
    if (gen !== categoryAnnounce.generation || categoryAnnounce.audio !== token) {
      return;
    }
    categoryAnnounce.audio = null;
    finish('fail');
  });
}

function fetchCategoryGuideFromNet_(phrase, categoryNo, voice, speed, gen, options, finish) {
  if (typeof audioPrefetch !== 'undefined' && audioPrefetch) {
    audioPrefetch.playBlocked = true;
  }
  var isEndPhrase = options && options.kind === 'end';
  function useContent(audioContent, fromDrive) {
    if (gen !== categoryAnnounce.generation) {
      return;
    }
    if (!audioContent) {
      finish('fail');
      return;
    }
    // 「終わり」は案内安定キー cg_ に書かない（本文キーの Mem／IdB のみ）
    var audioData = isEndPhrase
      ? saveAudioToCache(phrase, audioContent, voice, speed)
      : rememberCategoryGuideAudio_(phrase, audioContent, voice, speed, categoryNo);
    if (!isEndPhrase && options.saveDrive && !fromDrive) {
      saveCategoryGuideDriveAudio_(categoryNo, audioContent, voice, speed, phrase);
    }
    if (options.silent) {
      finish('ended');
      return;
    }
    startCategoryAnnouncePlayback_(audioData, gen, finish);
  }
  function tts() {
    var params = new URLSearchParams();
    params.append('text', phrase);
    params.append('voiceGender', voice);
    params.append('speed', speed);
    appendAuthParams(params);
    params.append('referer', window.location.origin || '');
    postGasJson(params).then(function(data) {
      if (gen !== categoryAnnounce.generation) {
        return;
      }
      if (data && data.success && data.audioContent) {
        useContent(data.audioContent);
        return;
      }
      finish('fail', data && data.error ? String(data.error) : '');
    }).catch(function(error) {
      if (gen === categoryAnnounce.generation) {
        finish('fail', error && error.message ? String(error.message) : '');
      }
    });
  }
  if (options.forceRefresh || !options.saveDrive) {
    tts();
    return;
  }
  var params = new URLSearchParams();
  params.append('action', 'getDriveAudio');
  params.append('field', 'category');
  params.append('categoryNo', String(categoryNo));
  params.append('voiceGender', voice);
  params.append('speed', speed);
  appendAuthParams(params);
  params.append('referer', window.location.origin || '');
  postGasJson(params).then(function(data) {
    if (gen !== categoryAnnounce.generation) {
      return;
    }
    if (data && data.success && data.found && data.audioContent) {
      useContent(data.audioContent, true);
      return;
    }
    tts();
  }).catch(function() {
    if (gen === categoryAnnounce.generation) {
      tts();
    }
  });
}

/**
 * カテゴリ案内／「終わり」を再生する。
 * kind:'end' は案内安定キー cg_ を使わず、本文キーの Mem／IdB／TTS のみ。
 * @param {string} text
 * @param {string|number} categoryNo
 * @param {{kind?: 'guide'|'end', saveDrive?: boolean, silent?: boolean, forceRefresh?: boolean, markHeard?: boolean, forEdit?: boolean, onDone?: function(string): void}} [options]
 */
function playCategoryPhrase_(text, categoryNo, options) {
  options = options || {};
  var phrase = normalizeTextForTTS(text || '');
  var done = typeof options.onDone === 'function' ? options.onDone : function() {};
  var isEndPhrase = options.kind === 'end';
  if (!phrase || categoryNo == null || String(categoryNo) === '' || phrase.length > TTS_TEXT_MAX_LENGTH) {
    done('skip');
    return;
  }
  if (categoryAnnounce.finish || categoryAnnounce.audio) {
    stopCategoryAnnounce({ cancelPending: true });
  }
  stopCurrentAudioPlayback({
    keepCategoryAnnounce: true,
    skipButtonUpdate: true,
    keepAddStudyAudioBusy: true
  });
  releaseCategoryAnnounceAudio_();
  var gen = ++categoryAnnounce.generation;
  var voice = (typeof getAudioVoice === 'function') ? getAudioVoice('question') : AUDIO_VOICE_DEFAULT;
  var speed = AUDIO_SPEED_FIXED;
  var settled = false;
  if (options.forEdit) {
    addStudy.audioBusy = true;
    addStudy.audioPlayId = String(categoryNo);
    addStudy.audioPlayField = 'category';
    categoryAnnounce.editPlaying = true;
    if (typeof syncAddStudyItemEditorUi === 'function') {
      syncAddStudyItemEditorUi();
    }
    if (typeof refreshAddStudyListPlayButtons === 'function') {
      refreshAddStudyListPlayButtons();
    }
  }
  if (typeof options.pendingStart === 'function') {
    categoryAnnounce.pendingStart = options.pendingStart;
  }
  function finish(reason, detail) {
    if (settled) {
      return;
    }
    if (reason !== 'abort' && gen !== categoryAnnounce.generation) {
      return;
    }
    settled = true;
    if (categoryAnnounce.finish === finish) {
      categoryAnnounce.finish = null;
    }
    if (typeof audioPrefetch !== 'undefined' && audioPrefetch) {
      audioPrefetch.playBlocked = false;
    }
    if (options.forEdit) {
      categoryAnnounce.editPlaying = false;
      if (typeof clearAddStudyAudioBusy_ === 'function') {
        clearAddStudyAudioBusy_();
      }
    }
    if (reason === 'fail' && options.forEdit && typeof setAddStudyItemStatus === 'function') {
      var failMsg = 'カテゴリ名の音声を用意できませんでした。';
      if (detail) {
        failMsg += ' ' + String(detail);
      }
      setAddStudyItemStatus(failMsg, false);
    }
    if (reason === 'ended' && options.markHeard) {
      categoryAnnounce.heard = { no: String(categoryNo), text: phrase };
    }
    var next = null;
    if (reason !== 'abort') {
      next = categoryAnnounce.pendingStart;
      categoryAnnounce.pendingStart = null;
    }
    done(reason);
    if (typeof next === 'function') {
      next();
    }
  }
  categoryAnnounce.finish = finish;
  function begin() {
    if (gen !== categoryAnnounce.generation) {
      return;
    }
    if (typeof uiSfx !== 'undefined' && uiSfx.clickPlaying && typeof runAfterUiClickSfx === 'function') {
      runAfterUiClickSfx(begin);
      return;
    }
    if (!options.forceRefresh) {
      var mem = getCachedAudio(phrase, voice, speed);
      if (mem && mem.audioData) {
        if (options.silent) {
          finish('ended');
          return;
        }
        startCategoryAnnouncePlayback_(mem.audioData, gen, finish);
        return;
      }
    }
    function afterIdb(idbResult) {
      if (gen !== categoryAnnounce.generation) {
        return;
      }
      if (!options.forceRefresh && idbResult && idbResult.audioData) {
        if (options.silent) {
          finish('ended');
          return;
        }
        startCategoryAnnouncePlayback_(idbResult.audioData, gen, finish);
        return;
      }
      if (!isAudioDownloadEnabled()) {
        finish(options.forEdit ? 'fail' : 'skip');
        return;
      }
      fetchCategoryGuideFromNet_(phrase, categoryNo, voice, speed, gen, options, finish);
    }
    if (options.forceRefresh) {
      afterIdb(null);
      return;
    }
    if (isEndPhrase) {
      // 「終わり」は cg_（案内全文）を読まない
      getCachedAudioFromIdb(phrase, voice, speed, afterIdb);
      return;
    }
    getCategoryGuideFromIdb_(categoryNo, phrase, voice, speed, afterIdb);
  }
  begin();
}

/**
 * カテゴリ案内の操作待ち中か
 * @returns {boolean}
 */
function isCategoryGuideAwaitingAdvance() {
  return !!categoryAnnounce.awaitingAdvance;
}

/**
 * 案内待ち UI（Title／Next）を反映
 */
function syncCategoryGuideWaitUi_() {
  if (typeof updateNavAnswerButton === 'function') {
    updateNavAnswerButton();
  }
  if (typeof updateFieldPlayButtons === 'function') {
    updateFieldPlayButtons();
  }
  if (typeof updatePlusButton === 'function') {
    updatePlusButton();
  }
  if (typeof updateHomeButton === 'function') {
    updateHomeButton();
  }
}

/**
 * 案内待ちに入る（聞き直し機会のため、直前に聞いた案内でも待つ）
 * @param {Object|null} cat
 * @param {function(): void} showFirst
 */
function enterCategoryGuideWait_(cat, showFirst) {
  clearCompletionAnnounceReplay_();
  categoryAnnounce.awaitingAdvance = true;
  categoryAnnounce.waitShowFirst = typeof showFirst === 'function' ? showFirst : null;
  categoryAnnounce.waitCategoryNo = cat && cat.no != null ? cat.no : null;
  categoryAnnounce.pendingStart = null;
  if (typeof hideStudyFieldsForCategoryGuideWait_ === 'function') {
    hideStudyFieldsForCategoryGuideWait_();
  }
  syncCategoryGuideWaitUi_();
}

/**
 * 案内待ちを解除して1問目へ
 */
function advanceFromCategoryGuideWait_() {
  if (!categoryAnnounce.awaitingAdvance) {
    return;
  }
  stopCategoryAnnounce({ cancelPending: true });
  var show = categoryAnnounce.waitShowFirst;
  categoryAnnounce.awaitingAdvance = false;
  categoryAnnounce.waitShowFirst = null;
  categoryAnnounce.waitCategoryNo = null;
  categoryAnnounce.heard = null;
  if (typeof showStudyFieldsAfterCategoryGuideWait_ === 'function') {
    showStudyFieldsAfterCategoryGuideWait_();
  }
  syncCategoryGuideWaitUi_();
  if (typeof show === 'function') {
    show();
  }
}

/**
 * 案内待ち中の Title 聞き直し
 * @param {boolean} [forceRefresh]
 */
function replayCategoryGuideFromWait_(forceRefresh) {
  if (!categoryAnnounce.awaitingAdvance) {
    return;
  }
  var cat = findCatalogCategory_(categoryAnnounce.waitCategoryNo);
  var text = buildCategoryGuideText_(cat);
  if (!cat || !text) {
    return;
  }
  playCategoryPhrase_(text, cat.no, {
    saveDrive: true,
    markHeard: true,
    forceRefresh: !!forceRefresh
  });
}

/**
 * HOME 等で案内待ちを破棄
 */
function clearCategoryGuideWait_() {
  if (!categoryAnnounce.awaitingAdvance) {
    return;
  }
  stopCategoryAnnounce({ cancelPending: true });
  categoryAnnounce.awaitingAdvance = false;
  categoryAnnounce.waitShowFirst = null;
  categoryAnnounce.waitCategoryNo = null;
  if (typeof showStudyFieldsAfterCategoryGuideWait_ === 'function') {
    showStudyFieldsAfterCategoryGuideWait_();
  }
  syncCategoryGuideWaitUi_();
}

/**
 * 完了画面の「終わり／着地タイトル」聞き直しが有効か
 * @returns {boolean}
 */
function isCompletionAnnounceReplayActive() {
  return !!(typeof studyEnd !== 'undefined' && studyEnd && studyEnd.done) &&
    !!categoryAnnounce.completionReplayKind &&
    !(typeof isCrossCategoryQuestionMethod === 'function' && isCrossCategoryQuestionMethod());
}

/**
 * 完了画面の聞き直し UI を反映
 */
function syncCompletionAnnounceReplayUi_() {
  if (typeof updateFieldPlayButtons === 'function') {
    updateFieldPlayButtons();
  }
}

/**
 * 完了画面の聞き直しを開始／更新する
 * @param {'end'|'title'} kind
 * @param {string|number|null|undefined} categoryNo
 */
function setCompletionAnnounceReplay_(kind, categoryNo) {
  if (typeof isCrossCategoryQuestionMethod === 'function' && isCrossCategoryQuestionMethod()) {
    clearCompletionAnnounceReplay_();
    return;
  }
  if (!studyEnd || !studyEnd.done || (kind !== 'end' && kind !== 'title') ||
      categoryNo == null || String(categoryNo) === '') {
    clearCompletionAnnounceReplay_();
    return;
  }
  categoryAnnounce.completionReplayKind = kind;
  categoryAnnounce.completionReplayCategoryNo = categoryNo;
  syncCompletionAnnounceReplayUi_();
}

/**
 * End 直後：「名前、終わり」の聞き直しを有効化
 */
function enterCompletionEndAnnounceReplay_() {
  if (!studyEnd || !studyEnd.done) {
    return;
  }
  var catNo = studyEnd.categoryNo != null ? studyEnd.categoryNo : categoryCatalog.no;
  setCompletionAnnounceReplay_('end', catNo);
}

/**
 * 完了画面の表示カテゴリに合わせて聞き直し種別を更新する
 */
function refreshCompletionAnnounceReplayForBrowse_() {
  if (!studyEnd || !studyEnd.done) {
    clearCompletionAnnounceReplay_();
    return;
  }
  if (typeof isCrossCategoryQuestionMethod === 'function' && isCrossCategoryQuestionMethod()) {
    clearCompletionAnnounceReplay_();
    return;
  }
  var shownNo = categoryCatalog && categoryCatalog.no != null ? categoryCatalog.no : null;
  if (shownNo == null || String(shownNo) === '') {
    clearCompletionAnnounceReplay_();
    return;
  }
  if (studyEnd.categoryNo != null && String(shownNo) === String(studyEnd.categoryNo)) {
    setCompletionAnnounceReplay_('end', studyEnd.categoryNo);
    return;
  }
  setCompletionAnnounceReplay_('title', shownNo);
}

/**
 * 完了画面の聞き直しを解除
 */
function clearCompletionAnnounceReplay_() {
  if (!categoryAnnounce.completionReplayKind && categoryAnnounce.completionReplayCategoryNo == null) {
    return;
  }
  categoryAnnounce.completionReplayKind = null;
  categoryAnnounce.completionReplayCategoryNo = null;
  syncCompletionAnnounceReplayUi_();
}

/**
 * 完了画面：終わり／着地タイトルの聞き直し
 * @param {boolean} [forceRefresh]
 */
function replayCompletionAnnounce_(forceRefresh) {
  if (!isCompletionAnnounceReplayActive()) {
    return;
  }
  var cat = findCatalogCategory_(categoryAnnounce.completionReplayCategoryNo);
  if (!cat) {
    return;
  }
  if (categoryAnnounce.completionReplayKind === 'end') {
    playCategoryEndAnnouncement_(cat, { forceRefresh: !!forceRefresh });
    return;
  }
  var text = buildCategoryGuideText_(cat);
  if (!text) {
    return;
  }
  playCategoryPhrase_(text, cat.no, {
    saveDrive: true,
    markHeard: true,
    forceRefresh: !!forceRefresh
  });
}

/**
 * 効果音のあと、最初の出題の前に案内を読む（カテゴリ毎は操作待ち）。
 * @param {Object|null} cat
 * @param {function(): void} showFirst
 */
function playCategoryGuideThen_(cat, showFirst) {
  var show = typeof showFirst === 'function' ? showFirst : function() {};
  if (typeof isCrossCategoryQuestionMethod === 'function' && isCrossCategoryQuestionMethod()) {
    show();
    return;
  }
  var text = buildCategoryGuideText_(cat);
  if (!cat || !text) {
    show();
    return;
  }
  // 着地案内で聞き済みでも、学習開始時は再再生する（無音の Title/Next 待ちを避ける）
  enterCategoryGuideWait_(cat, show);
  playCategoryPhrase_(text, cat.no, {
    saveDrive: true,
    markHeard: true
  });
}

function announceLandedCategoryGuide_() {
  if (typeof isCrossCategoryQuestionMethod === 'function' && isCrossCategoryQuestionMethod()) {
    return;
  }
  var cat = findCatalogCategory_(categoryCatalog.no);
  var text = buildCategoryGuideText_(cat);
  if (!cat || !text) {
    return;
  }
  playCategoryPhrase_(text, cat.no, { saveDrive: true, markHeard: true });
}

function playTopCategoryGuideFromSingleClick_() {
  var screen1 = dom.screen1;
  if (!screen1 || !screen1.classList.contains('active')) {
    return;
  }
  announceLandedCategoryGuide_();
}

/**
 * @param {Object|null} cat
 * @param {{forceRefresh?: boolean}} [options]
 */
function playCategoryEndAnnouncement_(cat, options) {
  options = options || {};
  if (typeof isCrossCategoryQuestionMethod === 'function' && isCrossCategoryQuestionMethod()) {
    return;
  }
  var text = buildCategoryEndText_(cat);
  if (!cat || !text) {
    return;
  }
  playCategoryPhrase_(text, cat.no, {
    kind: 'end',
    saveDrive: false,
    markHeard: false,
    forceRefresh: !!options.forceRefresh
  });
}

function prepareCategoryGuideAudio_(cat, onDone) {
  var text = buildCategoryGuideText_(cat);
  if (!cat || !text) {
    if (typeof onDone === 'function') {
      onDone();
    }
    return;
  }
  playCategoryPhrase_(text, cat.no, {
    saveDrive: true,
    silent: true,
    onDone: function() {
      if (typeof onDone === 'function') {
        onDone();
      }
    }
  });
}

function playSavedCategoryGuide_(forceRefresh) {
  if (typeof isAddStudyItemRenameVisible === 'function' && !isAddStudyItemRenameVisible()) {
    return;
  }
  var select = dom.addStudyItemCategorySelect;
  var categoryNo = select ? String(select.value || '') : '';
  var cat = findCatalogCategory_(categoryNo);
  var text = buildCategoryGuideText_(cat);
  if (!cat || !text) {
    return;
  }
  if (!forceRefresh && addStudy.audioBusy && addStudy.audioPlayField === 'category') {
    stopCategoryAnnounce({ cancelPending: true });
    return;
  }
  playCategoryPhrase_(text, cat.no, {
    saveDrive: true,
    markHeard: true,
    forEdit: true,
    forceRefresh: !!forceRefresh
  });
}

/**
 * Offline WSOLA time-stretch（音程維持）。
 * HTML Audio は使わず、AudioBuffer → AudioBuffer。
 * timeScale 0.5 = 半分の速さ（長さ約2倍）。
 *
 * @param {BaseAudioContext} audioContext
 * @param {AudioBuffer} inputBuffer
 * @param {number} timeScale
 * @returns {AudioBuffer}
 */
function stretchAudioBufferWsola_(audioContext, inputBuffer, timeScale) {
  if (!audioContext || !inputBuffer) {
    return inputBuffer;
  }
  var scale = Number(timeScale);
  if (!isFinite(scale) || scale <= 0 || Math.abs(scale - 1) < 0.001) {
    return inputBuffer;
  }
  if (scale < 0.25) {
    scale = 0.25;
  }
  if (scale > 4) {
    scale = 4;
  }

  var sampleRate = inputBuffer.sampleRate;
  var numChannels = inputBuffer.numberOfChannels;
  var inputFrames = inputBuffer.length;
  if (inputFrames < 32) {
    return inputBuffer;
  }

  var sequence = Math.max(64, Math.floor(sampleRate * 0.082));
  var seekWindow = Math.max(0, Math.floor(sampleRate * 0.028));
  var overlap = Math.max(16, Math.floor(sampleRate * 0.012));
  // 短いクリップでは窓を入力長に合わせて縮める
  if (inputFrames < sequence + seekWindow + overlap + 8) {
    sequence = Math.max(32, Math.floor(inputFrames / 3));
    overlap = Math.max(8, Math.floor(sequence / 3));
    seekWindow = Math.max(0, Math.min(seekWindow, Math.floor(inputFrames / 8)));
  }
  if (overlap * 2 >= sequence) {
    overlap = Math.floor(sequence / 3);
  }
  var outputHop = sequence - overlap;
  if (outputHop < 1) {
    outputHop = 1;
  }

  var outputFrames = Math.max(1, Math.ceil(inputFrames / scale));
  var inputs = [];
  var outputs = [];
  var c;
  for (c = 0; c < numChannels; c++) {
    inputs.push(inputBuffer.getChannelData(c));
    outputs.push(new Float32Array(outputFrames));
  }

  // 最初のブロック
  var copy0 = Math.min(sequence, inputFrames, outputFrames);
  for (c = 0; c < numChannels; c++) {
    outputs[c].set(inputs[c].subarray(0, copy0), 0);
  }

  var outPos = outputHop;
  var inPosIdeal = outputHop * scale;

  while (outPos + sequence <= outputFrames) {
    var nominal = Math.floor(inPosIdeal);
    var searchStart = Math.max(0, nominal - seekWindow);
    var searchEnd = Math.min(inputFrames - sequence, nominal + seekWindow);
    if (searchEnd < searchStart) {
      searchStart = Math.max(0, Math.min(nominal, inputFrames - sequence));
      searchEnd = searchStart;
    }

    var bestOffset = searchStart;
    if (seekWindow > 0 && searchEnd > searchStart && outPos >= overlap) {
      var bestCorr = -Infinity;
      var o;
      for (o = searchStart; o <= searchEnd; o++) {
        var corr = 0;
        var i;
        // 相関は先頭チャンネルで十分（TTS は多くが mono）
        var prev = outputs[0];
        var next = inputs[0];
        for (i = 0; i < overlap; i++) {
          corr += prev[outPos - overlap + i] * next[o + i];
        }
        if (corr > bestCorr) {
          bestCorr = corr;
          bestOffset = o;
        }
      }
    }

    // overlap-add（線形クロスフェード）＋残りはコピー
    var ch;
    for (ch = 0; ch < numChannels; ch++) {
      var src = inputs[ch];
      var dst = outputs[ch];
      var j;
      for (j = 0; j < overlap; j++) {
        var t = j / overlap;
        var dstIdx = outPos - overlap + j;
        if (dstIdx >= 0 && dstIdx < outputFrames && bestOffset + j < inputFrames) {
          dst[dstIdx] = dst[dstIdx] * (1 - t) + src[bestOffset + j] * t;
        }
      }
      for (j = overlap; j < sequence; j++) {
        var di = outPos - overlap + j;
        var si = bestOffset + j;
        if (di >= 0 && di < outputFrames && si < inputFrames) {
          dst[di] = src[si];
        }
      }
    }

    outPos += outputHop;
    inPosIdeal += outputHop * scale;
    if (inPosIdeal > inputFrames - sequence) {
      break;
    }
  }

  // 末尾の隙間をゼロのままにせず、入力末尾を薄く足す
  if (outPos < outputFrames) {
    var remain = outputFrames - outPos;
    var srcStart = Math.max(0, inputFrames - remain);
    for (c = 0; c < numChannels; c++) {
      var n = Math.min(remain, inputFrames - srcStart);
      if (n > 0) {
        outputs[c].set(inputs[c].subarray(srcStart, srcStart + n), outPos);
      }
    }
  }

  var outBuffer = audioContext.createBuffer(numChannels, outputFrames, sampleRate);
  for (c = 0; c < numChannels; c++) {
    if (typeof outBuffer.copyToChannel === 'function') {
      outBuffer.copyToChannel(outputs[c], c);
    } else {
      outBuffer.getChannelData(c).set(outputs[c]);
    }
  }
  return outBuffer;
}

/**
 * 非同期ラッパ（メインスレッドを1ティック譲る）
 * @param {BaseAudioContext} audioContext
 * @param {AudioBuffer} inputBuffer
 * @param {number} timeScale
 * @returns {Promise<AudioBuffer>}
 */
function stretchPcmBufferAsync_(audioContext, inputBuffer, timeScale) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      try {
        resolve(stretchAudioBufferWsola_(audioContext, inputBuffer, timeScale));
      } catch (e) {
        reject(e);
      }
    }, 0);
  });
}

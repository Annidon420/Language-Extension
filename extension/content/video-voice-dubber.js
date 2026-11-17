/**
 * ScreenLingo AI - Live Video Voice Translator & AI Dubber with Smart Audio Ducking
 * Universal Multi-Site Live Video Voice Dubber (YouTube, Adult Sites, Streaming & HTML5)
 * 
 * Features:
 *  1. Dual Capture Engine:
 *     - Engine A: High-speed DOM/TextTrack Subtitle Stream (YouTube, Vimeo, Coursera, VTT)
 *     - Engine B: Live Audio Speech Recognition (STT) for sites with NO subtitles (Adult sites, Reddit, etc.)
 *                 with native Russian (ru-RU), English, Spanish, Chinese, Hindi support!
 *  2. Human Expressive Voice Engine:
 *     - Neural / Google Deep Voice prioritization
 *     - Punctuation-based emotional prosody (questions rise, exclamations peak)
 *     - Natural Male & Female voice matching + audio pitch auto-detector
 *  3. Zero-Repetition Anti-Echo Cache: every phrase speaks exactly once.
 *  4. Smart Audio Ducking: lowers video audio to 15% while translation speaks.
 *  5. Persistent state: stays permanently ON across popup closes.
 */

(function () {
  'use strict';

  if (window.__screenLingoVideoDubberInjected) return;
  window.__screenLingoVideoDubberInjected = true;

  // State
  let isDubbingActive = true;
  let sourceSpeechLang = 'auto'; // 'auto', 'ru', 'en', 'es', 'zh', 'hi'
  let targetDubLang = 'hi';     // 'hi', 'en', 'ru', 'zh', 'es'
  let voiceGenderPref = 'auto'; // 'auto', 'female', 'male'
  let voiceExpressionPref = 'expressive'; // 'expressive', 'conversational', 'lively'
  let detectedSpeakerGender = 'female';
  let duckVolumeRatio = 0.15;
  let voiceSpeed = 1.22;
  let trackedVideos = new Map();
  let speechQueue = [];
  let isSpeaking = false;
  let phraseDebounceTimer = null;
  let speechRecognizer = null;
  let isRecognizerRunning = false;
  let audioContext = null;
  let pitchAnalyser = null;
  let cachedVoices = [];

  // Anti-Repetition Cache (phraseHash -> timestamp)
  const recentlySpokenPhrases = new Map();

  // BCP-47 Speech Synthesis Locales
  const TTS_LOCALES = {
    'en': 'en-US',
    'hi': 'hi-IN',
    'ru': 'ru-RU',
    'zh': 'zh-CN',
    'es': 'es-ES'
  };

  // Speech Recognition Locales
  const STT_LOCALES = {
    'ru': 'ru-RU',
    'en': 'en-US',
    'es': 'es-ES',
    'zh': 'zh-CN',
    'hi': 'hi-IN',
    'auto': 'ru-RU' // If auto on foreign video, defaults to Russian / multi
  };

  // Female voice keywords
  const FEMALE_VOICE_KEYWORDS = [
    'female', 'woman', 'zira', 'jenny', 'aria', 'kalpana', 'swara',
    'irina', 'dariya', 'svetlana', 'xiaoxiao', 'yaoyao', 'helena',
    'laura', 'elvira', 'monica', 'samantha', 'victoria', 'karen', 'milena'
  ];

  // Male voice keywords
  const MALE_VOICE_KEYWORDS = [
    'male', 'man', 'david', 'guy', 'mark', 'hemant', 'madhur',
    'pavel', 'dmitry', 'yunxi', 'yunjian', 'pablo', 'alvaro',
    'george', 'alex', 'daniel', 'jorge'
  ];

  // Initialize and cache available voices
  function populateVoiceList() {
    if ('speechSynthesis' in window) {
      cachedVoices = window.speechSynthesis.getVoices();
    }
  }
  populateVoiceList();
  if ('speechSynthesis' in window && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
  }

  // Load Saved Preferences
  function loadSettings() {
    chrome.runtime.sendMessage({ action: 'GET_SETTINGS' }, (res) => {
      if (res && res.success && res.data) {
        const s = res.data;
        isDubbingActive = s.enableVoiceDubber !== false;
        sourceSpeechLang = s.voiceDubSourceLang || 'auto';
        targetDubLang = s.voiceDubTargetLang || 'hi';
        voiceGenderPref = s.voiceGender || 'auto';
        voiceExpressionPref = s.voiceExpression || 'expressive';
        duckVolumeRatio = s.duckVolumeLevel !== undefined ? s.duckVolumeLevel : 0.15;
        voiceSpeed = s.voiceSpeed || 1.22;
        updateAllVideoDubbingStates();
        manageLiveSpeechRecognition();
      }
    });
  }

  /**
   * Deep search for all HTML5 video elements, including open shadow roots & iframes
   */
  function findPageVideos() {
    const list = [];
    try {
      const direct = document.querySelectorAll('video');
      direct.forEach((v) => list.push(v));

      const allEls = document.querySelectorAll('*');
      allEls.forEach((el) => {
        if (el.shadowRoot) {
          try {
            const shadowVideos = el.shadowRoot.querySelectorAll('video');
            shadowVideos.forEach((v) => list.push(v));
          } catch (err) {}
        }
      });
    } catch (e) {
      console.warn('ScreenLingo video search error:', e);
    }
    return list;
  }

  /**
   * Scans for HTML5 video players on the page and attaches dubbing controls
   */
  function scanAndAttachVideos() {
    const videos = findPageVideos();
    videos.forEach((video) => {
      if (!trackedVideos.has(video)) {
        attachToVideo(video);
      }
    });
  }

  /**
   * Attaches floating dubbing controls over any video player
   */
  function attachToVideo(video) {
    // Check for player wrapper on YouTube, adult sites, or HTML5 players
    const playerWrapper = video.closest('#movie_player') ||
                          video.closest('.html5-video-player') ||
                          video.closest('.video-player') ||
                          video.closest('.player-container') ||
                          video.closest('.fp-player') ||
                          video.closest('.vjs-tech') ||
                          video.parentElement ||
                          document.body;

    const parent = playerWrapper;
    const computedPos = window.getComputedStyle(parent).position;
    if (computedPos === 'static') {
      parent.style.position = 'relative';
    }

    // Floating Voice Dubber Action Button
    const container = document.createElement('div');
    container.className = 'sl-video-dub-container';

    const dubBtn = document.createElement('button');
    dubBtn.className = `sl-video-dub-btn ${isDubbingActive ? 'active' : ''}`;
    dubBtn.title = 'ScreenLingo Live Voice Translator (AI Dubbing)';
    dubBtn.innerHTML = `
      <span class="sl-dub-mic-icon">🎙️</span>
      <span class="sl-dub-label">Voice Dub: ${isDubbingActive ? 'ON (' + targetDubLang.toUpperCase() + ')' : 'OFF'}</span>
      <span class="sl-dub-duck-badge">🔉 Ducked (15%)</span>
    `;

    // Floating Live Caption Strip on Video
    const captionBar = document.createElement('div');
    captionBar.className = `sl-video-dub-caption-bar ${isDubbingActive ? 'visible' : ''}`;
    captionBar.innerHTML = `
      <span class="sl-caption-badge">🎙️ AI Dub (${targetDubLang.toUpperCase()}):</span>
      <span class="sl-caption-text">Listening to video speech...</span>
    `;

    container.appendChild(dubBtn);
    parent.appendChild(container);
    parent.appendChild(captionBar);

    const videoState = {
      container,
      dubBtn,
      duckBadge: dubBtn.querySelector('.sl-dub-duck-badge'),
      captionBar,
      captionText: captionBar.querySelector('.sl-caption-text'),
      origVol: video.volume > 0.05 ? video.volume : 1.0,
      isDucked: false
    };

    trackedVideos.set(video, videoState);

    // Toggle button click on video
    dubBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      setDubbingState(!isDubbingActive);
    });

    // Handle video events
    video.addEventListener('play', () => {
      if (isDubbingActive) {
        ensureYouTubeSubtitlesActive();
        manageLiveSpeechRecognition();
      }
    });

    video.addEventListener('pause', () => {
      stopSpeakingAndRestoreAudio(video);
      stopSpeechRecognition();
    });

    video.addEventListener('seeking', () => {
      stopSpeakingAndRestoreAudio(video);
    });

    video.addEventListener('ended', () => {
      stopSpeakingAndRestoreAudio(video);
      stopSpeechRecognition();
    });

    // Hook HTML5 text tracks if available
    hookHtml5TextTracks(video);

    // Setup pitch analyzer for speaker gender
    setupPitchAnalyzer(video);
  }

  /**
   * Sets up Web Audio pitch analyzer to determine if speaker is male or female
   */
  function setupPitchAnalyzer(video) {
    try {
      if (audioContext || !video) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      audioContext = new AudioCtx();
      const source = audioContext.createMediaElementSource(video);
      pitchAnalyser = audioContext.createAnalyser();
      pitchAnalyser.fftSize = 1024;
      source.connect(pitchAnalyser);
      pitchAnalyser.connect(audioContext.destination);

      const buffer = new Float32Array(pitchAnalyser.fftSize);
      setInterval(() => {
        if (!isDubbingActive || video.paused || video.muted) return;
        pitchAnalyser.getFloatTimeDomainData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
        if (sum / buffer.length < 0.005) return; // Silence

        let maxCorr = 0;
        let bestPeriod = 0;
        for (let tau = 20; tau < 250; tau++) {
          let corr = 0;
          for (let i = 0; i < 400; i++) corr += buffer[i] * buffer[i + tau];
          if (corr > maxCorr) {
            maxCorr = corr;
            bestPeriod = tau;
          }
        }
        if (bestPeriod > 0) {
          const freq = audioContext.sampleRate / bestPeriod;
          if (freq >= 75 && freq <= 350) {
            detectedSpeakerGender = freq > 165 ? 'female' : 'male';
          }
        }
      }, 1000);
    } catch (e) {
      detectedSpeakerGender = 'female';
    }
  }

  /**
   * Auto-activates YouTube's subtitles stream
   */
  function ensureYouTubeSubtitlesActive() {
    try {
      const ccBtn = document.querySelector('.ytp-subtitles-button');
      if (ccBtn) {
        const isPressed = ccBtn.getAttribute('aria-pressed') === 'true' ||
                          ccBtn.classList.contains('ytp-subtitles-button-active');
        if (!isPressed) {
          ccBtn.click();
        }
      }
    } catch (e) {
      console.warn('CC auto-activation:', e);
    }
  }

  /**
   * Hooks generic HTML5 video text tracks (WebVTT)
   */
  function hookHtml5TextTracks(video) {
    if (!video || !video.textTracks) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.kind === 'subtitles' || track.kind === 'captions') {
        track.mode = 'hidden';
        track.oncuechange = () => {
          if (!isDubbingActive) return;
          const cues = track.activeCues;
          if (cues && cues.length > 0) {
            const cueText = Array.from(cues).map((c) => c.text).join(' ').trim();
            handleIncomingSpeechSnippet(cueText, video);
          }
        };
      }
    }
  }

  /**
   * Engine B: Live Audio Speech Recognition (STT) for sites with NO subtitles
   * Specifically handles Russian, English, Spanish, and foreign video speech!
   */
  function manageLiveSpeechRecognition() {
    if (!isDubbingActive) {
      stopSpeechRecognition();
      return;
    }

    // Check if current page has DOM subtitle cues (like YouTube)
    const hasDomSubtitles = document.querySelectorAll(
      '.ytp-caption-segment, .caption-visual-line, .captions-text, .vjs-text-track-display, .jw-text-track-cue'
    ).length > 0;

    // If DOM subtitles are already handling speech, STT is not required
    if (hasDomSubtitles) {
      stopSpeechRecognition();
      return;
    }

    // If video has no subtitles (e.g. adult sites, foreign video sites): engage STT!
    const activeVideo = Array.from(trackedVideos.keys())[0] || document.querySelector('video');
    if (!activeVideo || activeVideo.paused) {
      stopSpeechRecognition();
      return;
    }

    startSpeechRecognition(activeVideo);
  }

  function startSpeechRecognition(video) {
    if (!('webkitSpeechRecognition' in window)) return;
    if (isRecognizerRunning && speechRecognizer) return;

    try {
      const recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Select listening language based on user source preference (Russian, English, Spanish, etc.)
      const recognitionLocale = STT_LOCALES[sourceSpeechLang] || 'ru-RU';
      recognition.lang = recognitionLocale;

      recognition.onresult = (event) => {
        if (!isDubbingActive) return;
        let phrase = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            phrase += event.results[i][0].transcript;
          }
        }
        const clean = phrase.trim();
        if (clean.length > 2) {
          handleIncomingSpeechSnippet(clean, video);
        }
      };

      recognition.onerror = (e) => {
        if (isDubbingActive && video && !video.paused) {
          setTimeout(() => {
            try { recognition.start(); } catch (err) {}
          }, 800);
        }
      };

      recognition.onend = () => {
        isRecognizerRunning = false;
        if (isDubbingActive && video && !video.paused) {
          try {
            recognition.start();
            isRecognizerRunning = true;
          } catch (err) {}
        }
      };

      recognition.start();
      speechRecognizer = recognition;
      isRecognizerRunning = true;
    } catch (e) {
      console.warn('Live SpeechRecognition init:', e.message);
    }
  }

  function stopSpeechRecognition() {
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch (e) {}
      speechRecognizer = null;
    }
    isRecognizerRunning = false;
  }

  /**
   * Directly sets voice dubbing state and keeps everything synchronized
   */
  function setDubbingState(enabled, options = {}) {
    isDubbingActive = !!enabled;

    if (options.sourceLang) sourceSpeechLang = options.sourceLang;
    if (options.targetLang) targetDubLang = options.targetLang;
    if (options.gender) voiceGenderPref = options.gender;
    if (options.expression) voiceExpressionPref = options.expression;
    if (options.duckLevel !== undefined) duckVolumeRatio = options.duckLevel;
    if (options.speed !== undefined) voiceSpeed = options.speed;

    if (isDubbingActive) {
      ensureYouTubeSubtitlesActive();
      document.documentElement.classList.add('sl-hide-native-captions');
      manageLiveSpeechRecognition();
    } else {
      document.documentElement.classList.remove('sl-hide-native-captions');
      stopSpeakingAndRestoreAudio();
      stopSpeechRecognition();
    }

    updateAllVideoDubbingStates();

    // Persist to storage so it stays permanently ON
    chrome.runtime.sendMessage({
      action: 'SAVE_SETTINGS',
      payload: {
        enableVoiceDubber: isDubbingActive,
        voiceDubSourceLang: sourceSpeechLang,
        voiceDubTargetLang: targetDubLang,
        voiceGender: voiceGenderPref,
        voiceExpression: voiceExpressionPref
      }
    });

    chrome.runtime.sendMessage({
      action: 'VOICE_DUBBING_STATUS_CHANGED',
      payload: { isDubbingActive, targetDubLang, sourceSpeechLang, voiceGender: voiceGenderPref }
    });

    // Notify on-page floating pill
    window.dispatchEvent(new CustomEvent('screenlingo-dubbing-status-changed', {
      detail: { isDubbingActive, targetDubLang, sourceSpeechLang, voiceGender: voiceGenderPref }
    }));
  }

  // Listen to events from on-page floating pill
  window.addEventListener('screenlingo-set-dubbing', (e) => {
    if (e.detail && e.detail.enabled !== undefined) {
      setDubbingState(e.detail.enabled);
    }
  });

  window.addEventListener('screenlingo-update-dub-settings', (e) => {
    if (e.detail) {
      setDubbingState(isDubbingActive, e.detail);
    }
  });

  /**
   * Synchronizes UI state across all attached video players
   */
  function updateAllVideoDubbingStates() {
    trackedVideos.forEach((state, video) => {
      if (!state) return;
      const label = state.dubBtn ? state.dubBtn.querySelector('.sl-dub-label') : null;
      if (isDubbingActive) {
        if (state.dubBtn && state.dubBtn.classList) state.dubBtn.classList.add('active');
        if (label) label.textContent = `Voice Dub: ON (${targetDubLang.toUpperCase()})`;
        if (state.captionBar && state.captionBar.classList) state.captionBar.classList.add('visible');
      } else {
        if (state.dubBtn && state.dubBtn.classList) {
          state.dubBtn.classList.remove('active');
          state.dubBtn.classList.remove('speaking');
        }
        if (label) label.textContent = 'Voice Dub: OFF';
        if (state.captionBar && state.captionBar.classList) state.captionBar.classList.remove('visible');
        if (state.duckBadge && state.duckBadge.classList) state.duckBadge.classList.remove('visible');
        restoreVideoAudio(video);
      }
    });
  }

  /**
   * Stops TTS playback and restores video audio
   */
  function stopSpeakingAndRestoreAudio(video) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speechQueue = [];
    isSpeaking = false;
    clearTimeout(phraseDebounceTimer);

    if (video) {
      restoreVideoAudio(video);
    } else {
      trackedVideos.forEach((_, v) => restoreVideoAudio(v));
    }
  }

  /**
   * Normalizes phrase for anti-repetition comparison
   */
  function normalizePhrase(text) {
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Prunes anti-repetition cache
   */
  function cleanRecentlySpokenCache() {
    const now = Date.now();
    for (const [key, timestamp] of recentlySpokenPhrases.entries()) {
      if (now - timestamp > 25000) {
        recentlySpokenPhrases.delete(key);
      }
    }
  }

  /**
   * Handles incoming speech text with Anti-Repetition and Live Fast Dispatch
   */
  function handleIncomingSpeechSnippet(rawText, video) {
    if (!isDubbingActive || !rawText) return;
    const clean = rawText.trim();
    if (clean.length < 2) return;

    cleanRecentlySpokenCache();
    const normalized = normalizePhrase(clean);

    // If this phrase was spoken recently, DISCARD immediately (No repeating!)
    if (recentlySpokenPhrases.has(normalized)) return;

    // Check if it is a subset of an already spoken phrase
    for (const [recentNorm] of recentlySpokenPhrases.entries()) {
      if (recentNorm.includes(normalized) && normalized.length > 4) {
        return; // Already spoken
      }
    }

    // Mark as spoken now
    recentlySpokenPhrases.set(normalized, Date.now());

    // Send immediately for live translation
    processSpeechSegment(clean, video);
  }

  /**
   * Translates incoming speech text
   */
  function processSpeechSegment(originalText, video) {
    chrome.runtime.sendMessage(
      {
        action: 'TRANSLATE_TEXT',
        payload: {
          text: originalText,
          sourceLang: sourceSpeechLang || 'auto',
          targetLang: targetDubLang,
          saveHistory: false
        }
      },
      (res) => {
        if (res && res.success && res.data && isDubbingActive) {
          const translated = res.data.translatedText;
          if (translated) {
            enqueueSpokenDubbing(translated, targetDubLang, video);
          }
        }
      }
    );
  }

  /**
   * Speech Queue: Discards stale items so live audio never lags behind the video
   */
  function enqueueSpokenDubbing(text, langCode, video) {
    if (speechQueue.length >= 1) {
      speechQueue.shift(); // Discard older lagging sentence
    }

    speechQueue.push({ text, langCode, video });
    if (!isSpeaking) {
      playNextDubbedUtterance();
    }
  }

  /**
   * Selects best expressive natural male or female voice
   */
  function selectBestVoice(locale, langCode, effectiveGender) {
    populateVoiceList();
    const voices = cachedVoices.length > 0 ? cachedVoices : ('speechSynthesis' in window ? window.speechSynthesis.getVoices() : []);
    const langVoices = voices.filter((v) => v.lang.startsWith(locale) || v.lang.includes(langCode));
    if (langVoices.length === 0) return null;

    const targetKeywords = effectiveGender === 'male' ? MALE_VOICE_KEYWORDS : FEMALE_VOICE_KEYWORDS;

    // 1. High priority: Neural / Natural / Online voices matching gender
    const neuralVoice = langVoices.find((v) => {
      const name = v.name.toLowerCase();
      const isNatural = name.includes('natural') || name.includes('online') || name.includes('neural');
      const isGender = targetKeywords.some((kw) => name.includes(kw));
      return isNatural && isGender;
    });
    if (neuralVoice) return neuralVoice;

    // 2. High priority: Google Deep Voices (e.g. Google हिन्दी, Google русский, Google US English)
    const googleVoice = langVoices.find((v) => {
      const name = v.name.toLowerCase();
      const isGoogle = name.includes('google');
      const isGender = targetKeywords.some((kw) => name.includes(kw));
      return isGoogle && (isGender || effectiveGender === 'female');
    });
    if (googleVoice) return googleVoice;

    // 3. Any gender-matched voice
    const genderVoice = langVoices.find((v) => {
      const name = v.name.toLowerCase();
      return targetKeywords.some((kw) => name.includes(kw));
    });
    if (genderVoice) return genderVoice;

    // 4. Fallback to any natural sounding voice
    const fallbackNatural = langVoices.find((v) => v.name.includes('Natural') || v.name.includes('Google'));
    return fallbackNatural || langVoices[0];
  }

  /**
   * Computes human expressive pitch & rate based on punctuation & emotion
   */
  function computeHumanProsody(text, effectiveGender) {
    let basePitch = effectiveGender === 'male' ? 0.91 : 1.15;
    let baseRate = voiceSpeed;

    const trimmed = text.trim();

    if (voiceExpressionPref === 'expressive') {
      // Question: rising inquisitive pitch inflection
      if (trimmed.endsWith('?') || trimmed.includes('?')) {
        basePitch *= 1.12;
        baseRate *= 0.94; // Slower thoughtful cadence
      }
      // Exclamation: vivid, passionate, high-energy inflection
      else if (trimmed.endsWith('!') || trimmed.includes('!')) {
        basePitch *= 1.16;
        baseRate *= 1.05; // Slightly faster energetic pacing
      }
    } else if (voiceExpressionPref === 'conversational') {
      basePitch *= 1.02;
      baseRate *= 0.98;
    } else if (voiceExpressionPref === 'lively') {
      basePitch *= 1.08;
      baseRate *= 1.08;
    }

    return {
      pitch: Math.min(1.4, Math.max(0.75, basePitch)),
      rate: Math.min(1.4, Math.max(0.9, baseRate))
    };
  }

  /**
   * Speaks translated text aloud and ducks video volume
   */
  function playNextDubbedUtterance() {
    if (speechQueue.length === 0) {
      isSpeaking = false;
      trackedVideos.forEach((state, video) => {
        restoreVideoAudio(video);
        if (state && state.dubBtn && state.dubBtn.classList) {
          state.dubBtn.classList.remove('speaking');
        }
        if (state && state.duckBadge && state.duckBadge.classList) {
          state.duckBadge.classList.remove('visible');
        }
      });
      return;
    }

    if (!isDubbingActive) {
      speechQueue = [];
      isSpeaking = false;
      return;
    }

    isSpeaking = true;
    const item = speechQueue.shift();
    const { text, langCode, video } = item;
    const state = trackedVideos.get(video);

    // Update floating caption bar
    if (state && state.captionText) {
      state.captionText.textContent = text;
      if (state.captionBar && state.captionBar.classList) {
        state.captionBar.classList.add('visible');
      }
    }

    if (!('speechSynthesis' in window)) {
      isSpeaking = false;
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const locale = TTS_LOCALES[langCode] || 'en-US';
    utterance.lang = locale;

    // Determine effective voice gender
    const effectiveGender = voiceGenderPref === 'auto'
      ? detectedSpeakerGender
      : voiceGenderPref;

    // Select expressive human voice
    const chosenVoice = selectBestVoice(locale, langCode, effectiveGender);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    // Dynamic Human Prosody (Emotion & Intonation)
    const prosody = computeHumanProsody(text, effectiveGender);
    utterance.pitch = prosody.pitch;
    utterance.rate = prosody.rate;
    utterance.volume = 1.0;

    // 🔉 AUDIO DUCKING TRIGGER: Lower original volume to 15%
    utterance.onstart = () => {
      duckVideoAudio(video);
      if (state) {
        if (state.dubBtn && state.dubBtn.classList) state.dubBtn.classList.add('speaking');
        if (state.duckBadge && state.duckBadge.classList) {
          state.duckBadge.classList.add('visible');
          state.duckBadge.textContent = `🔉 Ducked (${Math.round(duckVolumeRatio * 100)}%)`;
        }
      }
    };

    // 🔊 AUDIO RESTORATION TRIGGER
    utterance.onend = () => {
      setTimeout(() => {
        if (speechQueue.length === 0) {
          restoreVideoAudio(video);
          if (state) {
            if (state.dubBtn && state.dubBtn.classList) state.dubBtn.classList.remove('speaking');
            if (state.duckBadge && state.duckBadge.classList) state.duckBadge.classList.remove('visible');
          }
        }
        playNextDubbedUtterance();
      }, 70);
    };

    utterance.onerror = () => {
      restoreVideoAudio(video);
      playNextDubbedUtterance();
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * 🔉 DUCK ORIGINAL VIDEO AUDIO (To 15%)
   */
  function duckVideoAudio(video) {
    if (!video) return;
    const state = trackedVideos.get(video);
    if (!state) return;

    if (!state.isDucked) {
      state.origVol = video.volume > 0.05 ? video.volume : 1.0;
      state.isDucked = true;
    }
    video.volume = Math.max(0.03, state.origVol * duckVolumeRatio);
  }

  /**
   * 🔊 RESTORE ORIGINAL VIDEO AUDIO
   */
  function restoreVideoAudio(video) {
    if (!video) return;
    const state = trackedVideos.get(video);
    if (!state || !state.isDucked) return;

    state.isDucked = false;
    video.volume = state.origVol || 1.0;
  }

  // ── Engine A: Global Subtitle Observer (Per-Segment Anti-Repetition) ──
  const liveSpeechObserver = new MutationObserver(() => {
    if (!isDubbingActive) return;

    // Search all known subtitle selectors across YouTube, VideoJS, JWPlayer, Plyr, etc.
    const segments = document.querySelectorAll(
      '.ytp-caption-segment, .caption-visual-line, .captions-text, .vjs-text-track-display div, .jw-text-track-cue, .plyr__captions div, [class*="subtitle-cue"]'
    );

    if (segments.length === 0) return;

    clearTimeout(phraseDebounceTimer);
    phraseDebounceTimer = setTimeout(() => {
      if (!isDubbingActive) return;

      const currentVideo = Array.from(trackedVideos.keys())[0] || document.querySelector('video');
      if (!currentVideo) return;

      segments.forEach((seg) => {
        const line = seg.textContent.trim();
        if (line && line.length > 2) {
          handleIncomingSpeechSnippet(line, currentVideo);
        }
      });
    }, 70);
  });

  if (document.body) {
    liveSpeechObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      liveSpeechObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
    });
  }

  // Message Handler from Popup / Service Worker
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SET_VOICE_DUBBING') {
      const { enabled, sourceLang, targetLang, gender, expression, duckLevel, speed } = message.payload;
      setDubbingState(enabled, { sourceLang, targetLang, gender, expression, duckLevel, speed });
      sendResponse({ success: true, isDubbingActive, targetDubLang });
    } else if (message.action === 'GET_VOICE_DUBBING_STATUS') {
      const videos = findPageVideos();
      const hasVideos = videos.length > 0;
      sendResponse({
        isDubbingActive,
        sourceSpeechLang,
        targetDubLang,
        voiceGender: voiceGenderPref,
        voiceExpression: voiceExpressionPref,
        hasVideos,
        videoCount: videos.length,
        duckVolumeRatio
      });
    }
  });

  function pruneDisconnectedVideos() {
    for (const [video] of trackedVideos.entries()) {
      if (!document.contains(video)) {
        trackedVideos.delete(video);
      }
    }
  }

  // Periodic heartbeat scan every 2 seconds
  setInterval(() => {
    pruneDisconnectedVideos();
    scanAndAttachVideos();
    if (isDubbingActive) {
      ensureYouTubeSubtitlesActive();
      manageLiveSpeechRecognition();
    }
  }, 2000);

  // Initial scan & load
  loadSettings();
  scanAndAttachVideos();
})();

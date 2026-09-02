(function runPersonalityWeather(root) {
  'use strict';

  var data = root.WEATHER_DATA;
  var scoring = root.WEATHER_SCORING;
  if (!data || !scoring) return;

  var screens = {
    intro: document.getElementById('introScreen'),
    quiz: document.getElementById('quizScreen'),
    result: document.getElementById('resultScreen')
  };

  var elements = {
    start: document.getElementById('startButton'),
    resume: document.getElementById('resumeButton'),
    nameInput: document.getElementById('nameInput'),
    quit: document.getElementById('quitButton'),
    previous: document.getElementById('previousButton'),
    progressText: document.getElementById('progressText'),
    progressBar: document.getElementById('progressBar'),
    quizHint: document.querySelector('.quiz-hint'),
    questionCard: document.getElementById('questionCard'),
    questionNumber: document.getElementById('questionNumber'),
    questionTitle: document.getElementById('questionTitle'),
    options: document.getElementById('options'),
    chapterTransition: document.getElementById('chapterTransition'),
    transitionTitle: document.getElementById('transitionTitle'),
    transitionTicker: document.getElementById('transitionTicker'),
    restart: document.getElementById('restartButton'),
    friendRestart: document.getElementById('friendRestartButton'),
    posterMode: document.getElementById('posterModeButton'),
    posterModeBar: document.getElementById('posterModeBar'),
    exitPosterMode: document.getElementById('exitPosterModeButton'),
    resultPoster: document.getElementById('resultPoster'),
    resultOwner: document.getElementById('resultOwner'),
    resultPhoto: document.getElementById('resultPhoto'),
    resultName: document.getElementById('resultName'),
    resultVerdict: document.getElementById('resultVerdict'),
    resultQuote: document.getElementById('resultQuote'),
    resultTags: document.getElementById('resultTags'),
    posterDimensions: document.getElementById('posterDimensions'),
    companionName: document.getElementById('companionName'),
    companionVerdict: document.getElementById('companionVerdict'),
    relationshipGrid: document.getElementById('relationshipGrid'),
    companionCard: document.getElementById('companionCard'),
    companionLabel: document.getElementById('companionLabel'),
    companionDetailName: document.getElementById('companionDetailName'),
    companionExplanation: document.getElementById('companionExplanation'),
    companionAction: document.getElementById('companionAction'),
    secondaryCard: document.getElementById('secondaryCard'),
    secondaryName: document.getElementById('secondaryName'),
    secondaryExplanation: document.getElementById('secondaryExplanation'),
    resultMedal: document.getElementById('resultMedal'),
    resultEvidence: document.getElementById('resultEvidence'),
    resultFinal: document.getElementById('resultFinal'),
    resultSummary: document.getElementById('resultSummary'),
    resultStrength: document.getElementById('resultStrength'),
    resultMisread: document.getElementById('resultMisread')
  };

  var state = {
    ownerName: '',
    questions: [],
    answers: {},
    index: 0,
    tieAsked: false,
    specialAsked: false
  };

  var STORAGE_KEY = 'personality-weather-last-result-v4';
  var STORAGE_KEYS = [
    'personality-weather-last-result-v1',
    'personality-weather-last-result-v2',
    'personality-weather-last-result-v3',
    STORAGE_KEY
  ];
  var SCHEMA_VERSION = 4;
  var AUTO_ADVANCE_DELAY = 240;
  var CHAPTER_TRANSITION_DELAY = 1100;
  var POSTER_BAR_HIDE_DELAY = 1500;
  var advanceTimer = null;
  var transitionTimer = null;
  var posterBarTimer = null;

  function normaliseOwnerName(value) {
    var clean = String(value || '').trim().replace(/\s+/g, ' ');
    return Array.from(clean).slice(0, 12).join('');
  }

  function safeText(value, fallback) {
    var text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function toggle(key) {
      screens[key].classList.toggle('is-active', key === name);
    });
    root.scrollTo(0, 0);
  }

  function clearAdvanceTimer() {
    if (advanceTimer !== null) {
      root.clearTimeout(advanceTimer);
      advanceTimer = null;
    }
  }

  function clearTransitionTimer() {
    if (transitionTimer !== null) {
      root.clearTimeout(transitionTimer);
      transitionTimer = null;
    }
  }

  function clearPosterBarTimer() {
    if (posterBarTimer !== null) {
      root.clearTimeout(posterBarTimer);
      posterBarTimer = null;
    }
  }

  function showPosterModeBar() {
    clearPosterBarTimer();
    document.body.classList.remove('is-poster-bar-hidden');
    elements.posterModeBar.hidden = false;
    posterBarTimer = root.setTimeout(function hidePosterBar() {
      posterBarTimer = null;
      document.body.classList.add('is-poster-bar-hidden');
    }, POSTER_BAR_HIDE_DELAY);
  }

  function exitPosterMode() {
    clearPosterBarTimer();
    document.body.classList.remove('is-poster-mode');
    document.body.classList.remove('is-poster-bar-hidden');
    elements.posterModeBar.hidden = true;
  }

  function getQuestion() {
    return state.questions[state.index] || null;
  }

  function getOption(question, optionId) {
    if (!question || optionId === undefined || optionId === null) return null;
    return question.options.find(function find(option) {
      return option.id === optionId;
    }) || null;
  }

  function questionLabel(question) {
    if (question.isTieBreaker) return '加测';
    if (question.isSpecial) return '隐藏';
    return String(question.order || state.index + 1).padStart(2, '0');
  }

  function renderQuestion() {
    var question = getQuestion();
    if (!question) return;

    clearAdvanceTimer();
    clearTransitionTimer();
    screens.quiz.classList.remove('is-chapter-transition');
    elements.chapterTransition.hidden = true;
    elements.questionCard.hidden = false;
    elements.quizHint.hidden = false;
    elements.previous.hidden = false;
    var selectedId = state.answers[question.id];
    var isExtra = Boolean(question.isTieBreaker || question.isSpecial);
    var baseTotal = data.questions.length;
    var progress = isExtra
      ? 100
      : Math.min(100, ((question.order || state.index + 1) / Math.max(1, baseTotal)) * 100);

    if (isExtra) {
      var extraIndex = state.questions.slice(0, state.index + 1).filter(function countExtra(item) {
        return Boolean(item.isTieBreaker || item.isSpecial);
      }).length;
      elements.progressText.textContent = '定向加测 · ' + extraIndex;
    } else {
      elements.progressText.textContent = String(question.order || state.index + 1).padStart(2, '0') + ' / ' + baseTotal;
    }
    elements.progressBar.style.width = progress + '%';
    elements.questionNumber.textContent = questionLabel(question);
    elements.questionTitle.textContent = question.text;
    elements.options.innerHTML = '';

    question.options.forEach(function renderOption(option, optionIndex) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'option-button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', selectedId === option.id ? 'true' : 'false');
      button.setAttribute('aria-label', '选项 ' + String.fromCharCode(65 + optionIndex) + '：' + option.label);
      if (selectedId === option.id) button.classList.add('is-selected');

      var code = document.createElement('span');
      code.className = 'option-code';
      code.textContent = String.fromCharCode(65 + optionIndex);

      var label = document.createElement('span');
      label.className = 'option-label';
      label.textContent = option.label;

      button.appendChild(code);
      button.appendChild(label);
      button.addEventListener('click', function choose() {
        selectOption(question, option, button);
      });
      elements.options.appendChild(button);
    });

    elements.previous.disabled = state.index === 0;
    root.scrollTo(0, 0);
  }

  function renderChapterTransition(nextQuestion) {
    var chapter = data.chapters[nextQuestion.chapter] || {};
    var baseTotal = data.questions.length;
    clearTransitionTimer();
    screens.quiz.classList.add('is-chapter-transition');
    elements.questionCard.hidden = true;
    elements.quizHint.hidden = true;
    elements.previous.hidden = true;
    elements.chapterTransition.hidden = false;
    elements.transitionTitle.textContent = safeText(chapter.name, '下一观测区');
    elements.transitionTicker.textContent = safeText(
      chapter.ticker,
      data.tickers.default
    );
    elements.progressText.textContent = String(nextQuestion.order || state.index + 1).padStart(2, '0') + ' / ' + baseTotal;
    elements.progressBar.style.width = Math.min(100, ((nextQuestion.order || state.index + 1) / baseTotal) * 100) + '%';
    root.scrollTo(0, 0);
    transitionTimer = root.setTimeout(function continueAfterTransition() {
      transitionTimer = null;
      renderQuestion();
    }, CHAPTER_TRANSITION_DELAY);
  }

  function selectOption(question, option, button) {
    state.answers[question.id] = option.id;

    Array.prototype.forEach.call(elements.options.querySelectorAll('.option-button'), function clear(item) {
      item.classList.remove('is-selected');
      item.setAttribute('aria-checked', 'false');
    });
    button.classList.add('is-selected');
    button.setAttribute('aria-checked', 'true');

    clearAdvanceTimer();
    var expectedIndex = state.index;
    var expectedQuestionId = question.id;
    advanceTimer = root.setTimeout(function advanceAfterSelection() {
      advanceTimer = null;
      var current = getQuestion();
      if (state.index !== expectedIndex || !current || current.id !== expectedQuestionId) return;
      advanceFromCurrent();
    }, AUTO_ADVANCE_DELAY);
  }

  function startTest(options) {
    var keepOwner = options && options.keepOwner;
    clearAdvanceTimer();
    clearTransitionTimer();
    state.ownerName = keepOwner
      ? normaliseOwnerName(state.ownerName)
      : normaliseOwnerName(elements.nameInput.value);
    elements.nameInput.value = state.ownerName;
    state.questions = data.questions.slice();
    state.answers = {};
    state.index = 0;
    state.tieAsked = false;
    state.specialAsked = false;
    exitPosterMode();
    showScreen('quiz');
    renderQuestion();
  }

  function maybeAddSpecialQuestion() {
    if (state.specialAsked) return false;
    state.specialAsked = true;

    var analysis = scoring.analyse(state.answers, state.questions, data);
    if (!scoring.shouldRevealSpecial(analysis, data)) return false;

    state.questions.push(data.specialQuestion);
    state.index = state.questions.length - 1;
    renderQuestion();
    return true;
  }

  function maybeAddTieBreaker() {
    var analysis = scoring.analyse(state.answers, state.questions, data);
    if (state.tieAsked || analysis.gap >= data.settings.tieGap) return false;

    var tieQuestion = data.tieBreakers[analysis.tieDimension];
    if (!tieQuestion) return false;
    tieQuestion.isTieBreaker = true;
    state.questions.push(tieQuestion);
    state.tieAsked = true;
    state.index = state.questions.length - 1;
    renderQuestion();
    return true;
  }

  function advanceFromCurrent() {
    var question = getQuestion();
    if (!question || state.answers[question.id] === undefined) return;

    clearAdvanceTimer();
    if (state.index < state.questions.length - 1) {
      var currentChapter = question.chapter;
      state.index += 1;
      var nextQuestion = getQuestion();
      var entersNewChapter = nextQuestion
        && !question.isSpecial
        && !question.isTieBreaker
        && !nextQuestion.isSpecial
        && !nextQuestion.isTieBreaker
        && nextQuestion.chapter !== currentChapter;
      if (entersNewChapter) renderChapterTransition(nextQuestion);
      else renderQuestion();
      return;
    }

    if (maybeAddSpecialQuestion()) return;
    if (!maybeAddTieBreaker()) renderResult();
  }

  function removeStoredKey(key) {
    try {
      root.localStorage.removeItem(key);
    } catch (error) {
      // Local storage is optional in private or restricted containers.
    }
  }

  function clearSavedResults() {
    STORAGE_KEYS.forEach(removeStoredKey);
  }

  function storedResult() {
    try {
      var saved = JSON.parse(root.localStorage.getItem(STORAGE_KEY));
      if (!saved || saved.schemaVersion !== SCHEMA_VERSION) return null;
      if (!saved.answers || Array.isArray(saved.answers) || !Array.isArray(saved.questionIds)) return null;
      return saved;
    } catch (error) {
      return null;
    }
  }

  function saveLastResult() {
    try {
      removeStoredKey('personality-weather-last-result-v1');
      removeStoredKey('personality-weather-last-result-v2');
      removeStoredKey('personality-weather-last-result-v3');
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        schemaVersion: SCHEMA_VERSION,
        ownerName: state.ownerName,
        answers: state.answers,
        questionIds: state.questions.map(function id(question) { return question.id; }),
        savedAt: Date.now()
      }));
    } catch (error) {
      // The result still works when local storage is unavailable.
    }
    detectSavedResult();
  }

  function renderVerdict(profile) {
    var lines = Array.isArray(profile.verdict)
      ? profile.verdict.filter(function present(line) { return Boolean(String(line || '').trim()); })
      : [];

    elements.resultVerdict.textContent = '';
    lines.forEach(function addLine(line, index) {
      if (index) elements.resultVerdict.appendChild(document.createElement('br'));
      elements.resultVerdict.appendChild(document.createTextNode(line));
    });
    elements.resultQuote.textContent = lines.length
      ? ''
      : safeText(profile.quote, '这是你最稳定、也最难伪装的一种天气。');
  }

  function renderCardTags(profile, specialOption) {
    var tags = Array.isArray(profile.cardTags) ? profile.cardTags.slice(0, 2) : [];
    if (specialOption && specialOption.mark) {
      var mark = '暗号·' + specialOption.mark;
      if (tags.length >= 2) tags[1] = mark;
      else tags.push(mark);
    }
    if (!tags.length) tags.push(profile.name + '气象');

    elements.resultTags.innerHTML = '';
    tags.slice(0, 2).forEach(function addTag(tag) {
      var item = document.createElement('span');
      item.textContent = tag;
      elements.resultTags.appendChild(item);
    });
  }

  function renderDimensionBars(displayScores) {
    var labels = {
      humidity: '情绪湿度',
      wind: '行动风速',
      visibility: '自我能见度'
    };
    var keys = data.settings.shareDimensions || ['humidity', 'wind', 'visibility'];
    elements.posterDimensions.innerHTML = '';

    keys.forEach(function addDimension(key) {
      var value = Math.max(0, Math.min(100, Number(displayScores[key]) || 50));
      var row = document.createElement('div');
      row.className = 'poster-dimension';
      row.setAttribute('role', 'meter');
      row.setAttribute('aria-label', labels[key] || key);
      row.setAttribute('aria-valuemin', '0');
      row.setAttribute('aria-valuemax', '100');
      row.setAttribute('aria-valuenow', String(value));

      var label = document.createElement('span');
      label.textContent = labels[key] || key;
      var track = document.createElement('span');
      track.className = 'dimension-track';
      var fill = document.createElement('i');
      fill.style.width = value + '%';
      track.appendChild(fill);
      var number = document.createElement('strong');
      number.textContent = String(value);

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(number);
      elements.posterDimensions.appendChild(row);
    });
  }

  function renderEvidence(items) {
    elements.resultEvidence.innerHTML = '';
    (items || []).slice(0, 3).forEach(function addEvidence(text) {
      var item = document.createElement('li');
      item.textContent = text;
      elements.resultEvidence.appendChild(item);
    });
  }

  function findRelationshipVerdict(profile, companion) {
    if (!profile || !companion || !Array.isArray(data.relationshipPairs)) return '';
    var pair = data.relationshipPairs.find(function matches(candidate) {
      return Array.isArray(candidate.ids)
        && candidate.ids.indexOf(profile.id) !== -1
        && candidate.ids.indexOf(companion.id) !== -1;
    });
    return pair ? safeText(pair.verdict, '') : '';
  }

  function renderResult() {
    clearAdvanceTimer();
    clearTransitionTimer();
    var analysis = scoring.analyse(state.answers, state.questions, data);
    var profile = analysis.primary.profile;
    var secondary = analysis.secondary ? analysis.secondary.profile : profile;
    var specialAnswer = state.answers[data.specialQuestion.id];
    var specialOption = specialAnswer ? getOption(data.specialQuestion, specialAnswer) : null;
    var palette = Array.isArray(profile.palette) ? profile.palette : ['#2f4156', '#567c8d', '#c8d9e6'];
    var companion = data.profiles.find(function findCompanion(candidate) {
      return candidate.name === profile.companion;
    });
    var companionName = companion ? companion.name : profile.companion;
    var companionMatchesSecondary = Boolean(companion && secondary.id === companion.id);
    var relationshipVerdict = findRelationshipVerdict(profile, companion);

    elements.resultOwner.textContent = state.ownerName;
    elements.resultName.textContent = profile.name;
    elements.resultPhoto.hidden = false;
    elements.resultPoster.classList.remove('has-photo-error');
    elements.resultPhoto.onload = function photoLoaded() {
      elements.resultPoster.classList.remove('has-photo-error');
      elements.resultPhoto.hidden = false;
    };
    elements.resultPhoto.onerror = function photoFailed() {
      elements.resultPoster.classList.add('has-photo-error');
      elements.resultPhoto.hidden = true;
    };
    elements.resultPhoto.src = profile.photo;
    elements.resultPhoto.alt = safeText(profile.alt, profile.name + '气象实景照片');

    renderVerdict(profile);
    renderCardTags(profile, specialOption);
    renderDimensionBars(analysis.displayScores || analysis.scores);
    renderEvidence(analysis.evidence);
    elements.companionName.textContent = safeText(companionName, '待观测');
    elements.companionVerdict.textContent = safeText(
      relationshipVerdict,
      '你们会在彼此的天气里认出熟悉的信号。'
    );
    elements.companionDetailName.textContent = safeText(companionName, '待观测');
    elements.relationshipGrid.classList.toggle('is-merged', companionMatchesSecondary);
    elements.secondaryCard.hidden = companionMatchesSecondary;
    elements.companionLabel.textContent = companionMatchesSecondary
      ? '双重命中 · 适配气象也是你的次生气象'
      : '适配气象 · 更容易同频的人';
    elements.companionExplanation.textContent = safeText(
      profile.companionPrompt,
      '那个让你不必反复解释、也能接住你的人，可能就是你的' + safeText(companionName, '适配气象') + '。'
    );
    elements.companionAction.textContent = '把这张卡发给你的' + safeText(companionName, '适配气象') + '。';
    elements.secondaryName.textContent = secondary.name;
    elements.secondaryExplanation.textContent = '它是本次答案的算法第二名，说明你也有一点这种运行方式。';
    elements.resultMedal.textContent = safeText(profile.medal, '本台确认：你的天气具有稳定辨识度。');
    elements.resultFinal.textContent = safeText(profile.final, profile.quote);
    elements.resultSummary.textContent = safeText(
      profile.summary,
      '你的选择更接近「' + profile.name + '」：你习惯按自己的节奏感知环境、处理关系，并在关键时刻做出选择。'
    );
    elements.resultStrength.textContent = safeText(
      profile.strength,
      '你最稳定的能力，是把自己的感受和判断转成合适的行动。'
    );
    elements.resultMisread.textContent = safeText(
      profile.misread,
      '只是你的节奏不总写在脸上，别人偶尔会读错。'
    );

    elements.resultPoster.style.setProperty('--poster-a', palette[0] || '#2f4156');
    elements.resultPoster.style.setProperty('--poster-b', palette[1] || palette[0] || '#567c8d');
    elements.resultPoster.style.setProperty('--poster-c', palette[2] || palette[1] || '#c8d9e6');
    elements.resultPoster.setAttribute('data-weather', profile.id);
    elements.resultPoster.setAttribute('data-tone', profile.tone || 'light');
    elements.resultPoster.setAttribute('data-layout', profile.layout || 'upper-left');

    saveLastResult();
    exitPosterMode();
    showScreen('result');
  }

  function questionById(id) {
    var found = data.questions.find(function findBase(question) { return question.id === id; });
    if (found) return found;
    if (data.specialQuestion.id === id) return data.specialQuestion;

    var tieKeys = Object.keys(data.tieBreakers);
    for (var index = 0; index < tieKeys.length; index += 1) {
      var tieQuestion = data.tieBreakers[tieKeys[index]];
      if (tieQuestion.id === id) {
        tieQuestion.isTieBreaker = true;
        return tieQuestion;
      }
    }
    return null;
  }

  function savedResultIsComplete(saved, restoredQuestions) {
    if (restoredQuestions.length !== saved.questionIds.length) return false;
    var includesEveryBaseQuestion = data.questions.every(function included(question) {
      return saved.questionIds.indexOf(question.id) !== -1
        && saved.answers[question.id] !== undefined;
    });
    var includesEveryAnswer = restoredQuestions.every(function answered(question) {
      return saved.answers[question.id] !== undefined;
    });
    return includesEveryBaseQuestion && includesEveryAnswer;
  }

  function loadLastResult() {
    var saved = storedResult();
    if (!saved) {
      detectSavedResult();
      return;
    }

    var restoredQuestions = saved.questionIds.map(questionById).filter(Boolean);
    if (!savedResultIsComplete(saved, restoredQuestions)) {
      removeStoredKey(STORAGE_KEY);
      detectSavedResult();
      return;
    }

    clearAdvanceTimer();
    clearTransitionTimer();
    state.ownerName = normaliseOwnerName(saved.ownerName);
    elements.nameInput.value = state.ownerName;
    state.questions = restoredQuestions;
    state.answers = saved.answers;
    state.index = Math.max(0, state.questions.length - 1);
    state.tieAsked = state.questions.some(function hasTie(question) { return Boolean(question.isTieBreaker); });
    state.specialAsked = state.questions.some(function hasSpecial(question) { return Boolean(question.isSpecial); });
    exitPosterMode();
    renderResult();
  }

  function detectSavedResult() {
    var saved = storedResult();
    elements.resume.hidden = !saved;
    if (!saved) {
      elements.resume.textContent = '查看上一次结果';
      return;
    }

    var name = normaliseOwnerName(saved.ownerName);
    elements.resume.textContent = name ? '查看 ' + name + ' 的上一次结果' : '查看上一次结果';
  }

  function resetForFriend() {
    clearAdvanceTimer();
    clearTransitionTimer();
    clearPosterBarTimer();
    clearSavedResults();
    state.ownerName = '';
    state.questions = [];
    state.answers = {};
    state.index = 0;
    state.tieAsked = false;
    state.specialAsked = false;
    elements.nameInput.value = '';
    exitPosterMode();
    detectSavedResult();
    showScreen('intro');
    root.setTimeout(function focusName() { elements.nameInput.focus(); }, 240);
  }

  elements.start.addEventListener('click', function begin() {
    startTest();
  });
  elements.nameInput.addEventListener('keydown', function startOnEnter(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      startTest();
    }
  });
  elements.nameInput.addEventListener('blur', function cleanName() {
    elements.nameInput.value = normaliseOwnerName(elements.nameInput.value);
  });
  elements.resume.addEventListener('click', loadLastResult);
  elements.quit.addEventListener('click', function quitTest() {
    if (!root.confirm('退出后，本轮答案不会保存。确定退出吗？')) return;
    clearAdvanceTimer();
    clearTransitionTimer();
    exitPosterMode();
    showScreen('intro');
  });
  elements.previous.addEventListener('click', function goBack() {
    clearAdvanceTimer();
    clearTransitionTimer();
    if (state.index <= 0) return;
    state.index -= 1;
    renderQuestion();
  });
  elements.restart.addEventListener('click', function restartSamePerson() {
    startTest({ keepOwner: true });
  });
  elements.friendRestart.addEventListener('click', resetForFriend);
  elements.posterMode.addEventListener('click', function enterPosterMode() {
    document.body.classList.add('is-poster-mode');
    showPosterModeBar();
    root.scrollTo(0, 0);
  });
  elements.resultPoster.addEventListener('click', function revealPosterControls() {
    if (document.body.classList.contains('is-poster-mode')) showPosterModeBar();
  });
  elements.chapterTransition.addEventListener('click', function skipTransition() {
    clearTransitionTimer();
    renderQuestion();
  });
  elements.exitPosterMode.addEventListener('click', exitPosterMode);

  detectSavedResult();
}(window));

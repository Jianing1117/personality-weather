(function attachWeatherScoring(root) {
  'use strict';

  var DIMENSION_KEYS = ['pressure', 'humidity', 'wind', 'visibility', 'volatility'];
  // The option-centred raw signal is intentionally conservative: random answers
  // cluster in a narrow band around 50 even though the profile prototypes occupy
  // the full weather map. This global gain expands that same five-dimensional
  // signal before prototype matching. It is identical for every dimension and
  // every profile, so it does not assign quotas or manufacture "rare" types.
  var SCORE_SIGNAL_GAIN = 2.85;
  // Share-card bars are deliberately gentler. Classification keeps the original
  // five-axis gain while public values stay readable and rarely hit an endpoint.
  var DISPLAY_SIGNAL_GAIN = 1.8;
  // The hidden question is qualitative evidence, not a sixth score axis. It may
  // break a near-tie among the four configured low-visibility profiles, but it
  // must never drag a geometrically distant profile across the map.
  var DEFAULT_SPECIAL_BIAS_DISTANCE = 1.25;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function findOption(question, answerValue) {
    if (!question || answerValue === undefined || answerValue === null) return null;
    return question.options.find(function findById(option) {
      return option.id === answerValue;
    }) || null;
  }

  function calculateScores(answers, questions) {
    var totals = {};
    var counts = {};
    var maxAbsTotals = {};
    DIMENSION_KEYS.forEach(function initialise(key) {
      totals[key] = 0;
      counts[key] = 0;
      maxAbsTotals[key] = 0;
    });

    questions.forEach(function includeAnswer(question) {
      var option = findOption(question, answers[question.id]);
      if (!option || !option.delta) return;

      DIMENSION_KEYS.forEach(function includeDimension(key) {
        var values = question.options.map(function getDelta(candidate) {
          return candidate.delta && Object.prototype.hasOwnProperty.call(candidate.delta, key)
            ? Number(candidate.delta[key]) || 0
            : 0;
        });
        var measured = values.some(function hasSignal(value) { return value !== 0; });
        if (!measured) return;
        var mean = values.reduce(function add(sum, value) { return sum + value; }, 0) / values.length;
        var chosenValue = Object.prototype.hasOwnProperty.call(option.delta, key) ? Number(option.delta[key]) || 0 : 0;
        var maxAbs = Math.max.apply(null, values.map(function distanceFromMean(value) {
          return Math.abs(value - mean);
        }));
        totals[key] += chosenValue - mean;
        maxAbsTotals[key] += maxAbs;
        counts[key] += 1;
      });
    });

    var scores = {};
    var displayScores = {};
    var ratios = {};
    DIMENSION_KEYS.forEach(function normalise(key) {
      var ratio = maxAbsTotals[key] ? totals[key] / maxAbsTotals[key] : 0;
      ratios[key] = ratio;
      scores[key] = Math.round(clamp(50 + ratio * 44 * SCORE_SIGNAL_GAIN, 6, 94));
      displayScores[key] = Math.round(clamp(50 + ratio * 44 * DISPLAY_SIGNAL_GAIN, 15, 85));
    });

    return {
      scores: scores,
      displayScores: displayScores,
      ratios: ratios,
      totals: totals,
      counts: counts
    };
  }

  function rankProfiles(scores, profiles, dimensions) {
    var dimensionWeights = {};
    (dimensions || []).forEach(function indexWeight(dimension) {
      dimensionWeights[dimension.key] = dimension.weight || 1;
    });

    return profiles.map(function calculateDistance(profile) {
      var distanceTotal = 0;
      var weightTotal = 0;

      DIMENSION_KEYS.forEach(function compare(key) {
        var weight = dimensionWeights[key] || 1;
        var difference = (scores[key] || 50) - (profile.center[key] || 50);
        distanceTotal += weight * difference * difference;
        weightTotal += weight;
      });

      var distance = Math.sqrt(distanceTotal / Math.max(1, weightTotal));
      var similarity = Math.round(clamp(100 - distance * 0.72, 0, 97));
      return { profile: profile, distance: distance, similarity: similarity };
    }).sort(function nearestFirst(a, b) {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.profile.id).localeCompare(String(b.profile.id));
    });
  }

  function rankingDistance(item) {
    return Number.isFinite(item && item.rankingDistance)
      ? item.rankingDistance
      : item.distance;
  }

  function applySpecialProfileBias(ranked, answers, data) {
    var specialQuestion = data && data.specialQuestion;
    var specialSettings = data && data.settings && data.settings.special;
    var answerValue = specialQuestion && answers ? answers[specialQuestion.id] : null;
    var selectedOption = findOption(specialQuestion, answerValue);
    var targetIds = specialSettings && Array.isArray(specialSettings.targetIds)
      ? specialSettings.targetIds
      : [];
    var biasProfileId = selectedOption && selectedOption.biasProfile;

    if (!biasProfileId || targetIds.indexOf(biasProfileId) === -1 || !ranked.length) {
      return ranked;
    }

    var candidate = ranked.find(function findCandidate(item) {
      return item.profile.id === biasProfileId;
    });
    if (!candidate) return ranked;

    var candidateGap = Number(specialSettings.candidateGap);
    if (!Number.isFinite(candidateGap)) candidateGap = 4;
    if (candidate.distance - ranked[0].distance > candidateGap) return ranked;

    var biasDistance = Number(specialSettings.biasDistance);
    if (!Number.isFinite(biasDistance)) biasDistance = DEFAULT_SPECIAL_BIAS_DISTANCE;
    biasDistance = clamp(biasDistance, 0, candidateGap);

    return ranked.map(function attachRankingDistance(item) {
      var effectiveDistance = item.distance;
      if (item.profile.id === biasProfileId) {
        effectiveDistance = Math.max(0, item.distance - biasDistance);
      }
      return Object.assign({}, item, { rankingDistance: effectiveDistance });
    }).sort(function biasedNearestFirst(a, b) {
      var effectiveDifference = rankingDistance(a) - rankingDistance(b);
      if (effectiveDifference !== 0) return effectiveDifference;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return String(a.profile.id).localeCompare(String(b.profile.id));
    });
  }

  function largestDifferenceDimension(firstProfile, secondProfile) {
    var largestKey = DIMENSION_KEYS[0];
    var largestDifference = -1;

    DIMENSION_KEYS.forEach(function compareCenters(key) {
      var difference = Math.abs(firstProfile.center[key] - secondProfile.center[key]);
      if (difference > largestDifference) {
        largestDifference = difference;
        largestKey = key;
      }
    });

    return largestKey;
  }

  function getEvidence(answers, questions, scores, profile, limit) {
    var candidates = [];

    questions.forEach(function scoreEvidence(question) {
      var option = findOption(question, answers[question.id]);
      if (!option || !option.evidence) return;

      var relevance = 0;
      DIMENSION_KEYS.forEach(function compareDelta(key) {
        var delta = option.delta && option.delta[key];
        if (delta === undefined) return;
        var profileDirection = (profile.center[key] || 50) - 50;
        relevance += delta * profileDirection;
        relevance += Math.abs(delta) * Math.abs((scores[key] || 50) - 50) * 0.08;
      });

      candidates.push({
        text: option.evidence,
        chapter: question.chapter,
        relevance: relevance,
        order: question.order || 0
      });
    });

    candidates.sort(function strongestFirst(a, b) {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return a.order - b.order;
    });

    var selected = [];
    var usedChapters = {};
    candidates.forEach(function pick(candidate) {
      if (selected.length >= limit) return;
      if (usedChapters[candidate.chapter]) return;
      selected.push(candidate.text);
      usedChapters[candidate.chapter] = true;
    });

    candidates.forEach(function fill(candidate) {
      if (selected.length >= limit || selected.indexOf(candidate.text) !== -1) return;
      selected.push(candidate.text);
    });

    return selected.slice(0, limit);
  }

  function countTags(answers, questions) {
    var counts = {};
    questions.forEach(function includeTags(question) {
      var option = findOption(question, answers[question.id]);
      (option && option.tags ? option.tags : []).forEach(function count(tag) {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return counts;
  }

  function getWeatherMark(scores, tags) {
    if (scores.pressure >= 72 && scores.visibility <= 34) return '地下高压';
    if (scores.humidity >= 72 && scores.volatility >= 68) return '太阳雨体质';
    if (scores.wind >= 75 && scores.volatility >= 68) return '强对流体质';
    if (scores.visibility >= 72 && scores.humidity >= 66) return '透明降水';
    if (scores.wind <= 30 && scores.pressure >= 68) return '静止风暴';
    if (Object.keys(tags).length && (tags.caretake || 0) >= 4) return '公共放晴';

    var centered = DIMENSION_KEYS.every(function nearCenter(key) {
      return scores[key] >= 42 && scores[key] <= 58;
    });
    if (centered) return '锋面交汇';
    return '局部异象';
  }

  function shouldRevealSpecial(analysis, data) {
    var specialSettings = data && data.settings && data.settings.special;
    if (!analysis || !specialSettings || !Array.isArray(specialSettings.targetIds)) return false;

    var topCandidates = analysis.ranked.slice(0, 2);
    var targetCandidates = topCandidates.filter(function isTarget(item) {
      return specialSettings.targetIds.indexOf(item.profile.id) !== -1;
    });
    if (!targetCandidates.length || !topCandidates.length) return false;

    var nearestTargetDistance = Math.min.apply(null, targetCandidates.map(function getDistance(item) {
      return item.distance;
    }));
    var candidateGap = Number(specialSettings.candidateGap);
    if (!Number.isFinite(candidateGap)) candidateGap = 4;
    var candidateIsClose = nearestTargetDistance - topCandidates[0].distance <= candidateGap;

    var humidityMin = Number(specialSettings.humidityMin);
    var visibilityMax = Number(specialSettings.visibilityMax);
    var caretakeMin = Number(specialSettings.caretakeMin);
    var hideMin = Number(specialSettings.hideMin);
    var humiditySignal = !Number.isFinite(humidityMin) || analysis.scores.humidity >= humidityMin;
    var visibilitySignal = Number.isFinite(visibilityMax) && analysis.scores.visibility <= visibilityMax;
    var caretakeSignal = Number.isFinite(caretakeMin) && (analysis.tags.caretake || 0) >= caretakeMin;
    var hideSignal = Number.isFinite(hideMin) && (analysis.tags.hide || 0) >= hideMin;

    return candidateIsClose
      && humiditySignal
      && (visibilitySignal || caretakeSignal || hideSignal);
  }

  function makeReportNumber(answers) {
    var source = Object.keys(answers).sort().map(function serialise(key) {
      return key + ':' + answers[key];
    }).join('|');
    var hash = 2166136261;
    for (var i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return String(Math.abs(hash >>> 0) % 10000).padStart(4, '0');
  }

  function analyse(answers, questions, data) {
    var dimensionsResult = calculateScores(answers, questions);
    var rawRanked = rankProfiles(dimensionsResult.scores, data.profiles, data.dimensions);
    var ranked = applySpecialProfileBias(rawRanked, answers, data);
    var tags = countTags(answers, questions);
    var primary = ranked[0];
    var secondary = ranked[1];

    return {
      scores: dimensionsResult.scores,
      displayScores: dimensionsResult.displayScores,
      counts: dimensionsResult.counts,
      ranked: ranked,
      primary: primary,
      secondary: secondary,
      gap: secondary ? rankingDistance(secondary) - rankingDistance(primary) : 99,
      tieDimension: secondary ? largestDifferenceDimension(primary.profile, secondary.profile) : null,
      evidence: getEvidence(answers, questions, dimensionsResult.scores, primary.profile, 3),
      tags: tags,
      mark: getWeatherMark(dimensionsResult.scores, tags),
      reportNumber: makeReportNumber(answers)
    };
  }

  root.WEATHER_SCORING = {
    DIMENSION_KEYS: DIMENSION_KEYS,
    SCORE_SIGNAL_GAIN: SCORE_SIGNAL_GAIN,
    DISPLAY_SIGNAL_GAIN: DISPLAY_SIGNAL_GAIN,
    DEFAULT_SPECIAL_BIAS_DISTANCE: DEFAULT_SPECIAL_BIAS_DISTANCE,
    analyse: analyse,
    calculateScores: calculateScores,
    rankProfiles: rankProfiles,
    applySpecialProfileBias: applySpecialProfileBias,
    shouldRevealSpecial: shouldRevealSpecial,
    largestDifferenceDimension: largestDifferenceDimension,
    makeReportNumber: makeReportNumber
  };
}(typeof window !== 'undefined' ? window : globalThis));

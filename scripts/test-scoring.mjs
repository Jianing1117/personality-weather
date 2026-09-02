import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(path.join(projectRoot, 'src/assets/data.js')));
await import(pathToFileURL(path.join(projectRoot, 'src/assets/scoring.js')));

const data = globalThis.WEATHER_DATA;
const scoring = globalThis.WEATHER_SCORING;
const errors = [];
const dimensionKeys = scoring.DIMENSION_KEYS;
const expectedProfileIds = [
  'dew', 'sunset', 'rainbow', 'spring-breeze',
  'lightning', 'meteor', 'volcano', 'monsoon',
  'storm-eye', 'star', 'cold-front', 'cirrus',
  'mountain-mist', 'lunar-eclipse', 'tide', 'aurora'
];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(data && scoring, 'Data and scoring globals must load');
assert(data.questions.length === 20, `Expected 20 questions, received ${data.questions.length}`);
assert(data.profiles.length === expectedProfileIds.length, `Expected 16 profiles, received ${data.profiles.length}`);
assert(data.dimensions.length === 5, `Expected 5 dimensions, received ${data.dimensions.length}`);
assert(typeof scoring.shouldRevealSpecial === 'function', 'Scoring must expose the shared hidden-question trigger');
assert(typeof scoring.applySpecialProfileBias === 'function', 'Scoring must expose hidden-profile biasing for verification');
assert(scoring.DISPLAY_SIGNAL_GAIN < scoring.SCORE_SIGNAL_GAIN, 'Display gain must stay gentler than classification gain');

const actualProfileIds = data.profiles.map((profile) => profile.id).sort();
assert(
  JSON.stringify(actualProfileIds) === JSON.stringify(expectedProfileIds.slice().sort()),
  `Unexpected profile ids: ${actualProfileIds.join(', ')}`
);

const ids = new Set();
for (const question of data.questions) {
  assert(!ids.has(question.id), `Duplicate question id: ${question.id}`);
  ids.add(question.id);
  assert(question.options.length === 4, `${question.id} must contain 4 options`);
  for (const option of question.options) {
    assert(option.label && option.evidence, `${question.id}/${option.id} needs label and evidence`);
    assert(Object.keys(option.delta || {}).length <= 3, `${question.id}/${option.id} should score at most 3 dimensions`);
    for (const [key, value] of Object.entries(option.delta || {})) {
      assert(dimensionKeys.includes(key), `${question.id}/${option.id} has unknown dimension ${key}`);
      assert(Number.isFinite(value) && value >= -2 && value <= 2, `${question.id}/${option.id}/${key} delta must be -2..2`);
    }
  }
}

const profileByName = new Map(data.profiles.map((profile) => [profile.name, profile]));
for (const profile of data.profiles) {
  assert(profile.name && profile.quote && profile.summary && profile.palette, `${profile.id} is missing result copy`);
  assert(profile.companion && profileByName.has(profile.companion), `${profile.id} has an unknown fixed companion`);
  const companion = profileByName.get(profile.companion);
  assert(companion && companion.companion === profile.name, `${profile.id}/${profile.companion} companion mapping must be symmetric`);
  for (const key of dimensionKeys) {
    assert(Number.isFinite(profile.center[key]), `${profile.id} is missing center ${key}`);
    assert(profile.center[key] >= 0 && profile.center[key] <= 100, `${profile.id}/${key} center must be 0..100`);
  }
}

const dimensionWeights = Object.fromEntries(data.dimensions.map((dimension) => [dimension.key, dimension.weight || 1]));
function profileCenterDistance(first, second) {
  let total = 0;
  let weightTotal = 0;
  for (const key of dimensionKeys) {
    const weight = dimensionWeights[key] || 1;
    total += weight * (first.center[key] - second.center[key]) ** 2;
    weightTotal += weight;
  }
  return Math.sqrt(total / weightTotal);
}

let minimumCenterDistance = Number.POSITIVE_INFINITY;
let minimumCenterPair = [];
let geometricCompanionCount = 0;
for (let index = 0; index < data.profiles.length; index += 1) {
  const profile = data.profiles[index];
  const neighbours = data.profiles
    .filter((candidate) => candidate.id !== profile.id)
    .map((candidate) => ({ candidate, distance: profileCenterDistance(profile, candidate) }))
    .sort((first, second) => first.distance - second.distance);
  if (neighbours[0].candidate.name === profile.companion) geometricCompanionCount += 1;
  for (let otherIndex = index + 1; otherIndex < data.profiles.length; otherIndex += 1) {
    const distance = profileCenterDistance(profile, data.profiles[otherIndex]);
    if (distance < minimumCenterDistance) {
      minimumCenterDistance = distance;
      minimumCenterPair = [profile.id, data.profiles[otherIndex].id];
    }
  }
}
assert(minimumCenterDistance >= 18, `Closest profile centers should stay at least 18 apart; ${minimumCenterPair.join('/')} is ${minimumCenterDistance.toFixed(2)}`);
assert(geometricCompanionCount < data.profiles.length, 'Fixed companions must remain distinct from algorithmic second-nearest results');

for (const key of dimensionKeys) {
  const tieQuestion = data.tieBreakers[key];
  assert(tieQuestion, `Missing tie breaker for ${key}`);
  if (!tieQuestion) continue;
  const tieScores = tieQuestion.options.map((option) => {
    const tieAnswers = { [tieQuestion.id]: option.id };
    return scoring.calculateScores(tieAnswers, [tieQuestion]).scores[key];
  });
  assert(new Set(tieScores).size > 1, `Tie breaker ${key} must be able to change ${key}`);
}

const specialSettings = data.settings.special;
const specialTargetIds = specialSettings.targetIds || [];
const specialBiasIds = data.specialQuestion.options.map((option) => option.biasProfile);
assert(specialTargetIds.length === 4 && new Set(specialTargetIds).size === 4, 'Hidden question must configure exactly 4 unique target profiles');
assert(
  JSON.stringify(specialBiasIds.slice().sort()) === JSON.stringify(specialTargetIds.slice().sort()),
  'Hidden options must map one-to-one onto the 4 configured targets'
);
for (const option of data.specialQuestion.options) {
  assert(Object.keys(option.delta || {}).length === 0, `Hidden option ${option.id} must not alter five-dimensional scores`);
}

let seed = 20260805;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

// Uniform random choices are not a claim about the real population. They are a
// neutral stress test for the geometry: no prototype should own most of the map,
// and none should be practically impossible to reach.
const randomRuns = 48000;
const distribution = Object.fromEntries(data.profiles.map((profile) => [profile.id, 0]));
const baseDistribution = Object.fromEntries(data.profiles.map((profile) => [profile.id, 0]));
const partialQuestions = data.questions;
let tieBreakerCount = 0;
let specialQuestionCount = 0;
let biasEligibleCount = 0;
let biasPrimarySwitchCount = 0;
let biasScoreMutationCount = 0;
let biasScopeViolationCount = 0;
let excessiveBiasCount = 0;
let evidenceFailureCount = 0;
let secondaryDiffersFromFixedCompanionCount = 0;
for (let run = 0; run < randomRuns; run += 1) {
  const answers = {};
  for (const question of data.questions) {
    const option = question.options[Math.floor(random() * question.options.length)];
    answers[question.id] = option.id;
  }
  const baseResult = scoring.analyse(answers, data.questions, data);
  for (const key of dimensionKeys) {
    assert(
      baseResult.displayScores[key] >= 15 && baseResult.displayScores[key] <= 85,
      `Display score ${key} must stay within 15..85`
    );
  }
  baseDistribution[baseResult.primary.profile.id] += 1;
  let result = baseResult;
  let runQuestions = data.questions;

  const partial = scoring.analyse(answers, partialQuestions, data);
  if (scoring.shouldRevealSpecial(partial, data)) {
    specialQuestionCount += 1;
    const specialOption = data.specialQuestion.options[Math.floor(random() * data.specialQuestion.options.length)];
    answers[data.specialQuestion.id] = specialOption.id;
    runQuestions = [...data.questions, data.specialQuestion];

    const biasedRanking = scoring.applySpecialProfileBias(baseResult.ranked, answers, data);
    const biasedCandidate = biasedRanking.find((item) => item.profile.id === specialOption.biasProfile);
    if (biasedCandidate && Number.isFinite(biasedCandidate.rankingDistance)) biasEligibleCount += 1;
    if (biasedRanking[0].profile.id !== baseResult.primary.profile.id) biasPrimarySwitchCount += 1;
    for (const item of biasedRanking) {
      if (
        item.profile.id === specialOption.biasProfile
        && Number.isFinite(item.rankingDistance)
        && item.distance - item.rankingDistance > scoring.DEFAULT_SPECIAL_BIAS_DISTANCE + 1e-9
      ) {
        excessiveBiasCount += 1;
      }
      if (
        item.profile.id !== specialOption.biasProfile
        && Number.isFinite(item.rankingDistance)
        && Math.abs(item.rankingDistance - item.distance) > 1e-9
      ) {
        biasScopeViolationCount += 1;
      }
    }

    result = scoring.analyse(answers, runQuestions, data);
    if (dimensionKeys.some((key) => result.scores[key] !== baseResult.scores[key])) {
      biasScoreMutationCount += 1;
    }
  }

  if (result.gap < data.settings.tieGap) {
    tieBreakerCount += 1;
    const tieQuestion = data.tieBreakers[result.tieDimension];
    const tieOption = tieQuestion.options[Math.floor(random() * tieQuestion.options.length)];
    answers[tieQuestion.id] = tieOption.id;
    result = scoring.analyse(answers, [...runQuestions, tieQuestion], data);
  }

  distribution[result.primary.profile.id] += 1;
  if (result.secondary.profile.name !== result.primary.profile.companion) {
    secondaryDiffersFromFixedCompanionCount += 1;
  }
  if (result.evidence.length !== 3) evidenceFailureCount += 1;
}

const shares = Object.fromEntries(
  Object.entries(distribution).map(([id, count]) => [id, count / randomRuns])
);
const randomReach = Object.values(distribution).filter((count) => count > 0).length;
const minimumShare = Math.min(...Object.values(shares));
const maximumShare = Math.max(...Object.values(shares));
const tieBreakerRate = tieBreakerCount / randomRuns;
const specialQuestionRate = specialQuestionCount / randomRuns;
assert(randomReach === data.profiles.length, `Random simulation should cover all profiles, covered ${randomReach}`);
assert(minimumShare >= 0.015, `Smallest random-map share should be about 1.5% or more, received ${(minimumShare * 100).toFixed(2)}%`);
assert(maximumShare <= 0.15, `Largest random-map share should stay at 15% or less, received ${(maximumShare * 100).toFixed(2)}%`);
assert(tieBreakerRate >= 0.10 && tieBreakerRate <= 0.35, `Tie-breaker rate should remain useful without dominating, received ${(tieBreakerRate * 100).toFixed(2)}%`);
assert(specialQuestionRate >= 0.10 && specialQuestionRate <= 0.30, `Hidden-question rate should be 10-30%, received ${(specialQuestionRate * 100).toFixed(2)}%`);
assert(biasScoreMutationCount === 0, `Hidden bias altered five-dimensional scores in ${biasScoreMutationCount} runs`);
assert(biasScopeViolationCount === 0, `Hidden bias altered a non-selected profile in ${biasScopeViolationCount} runs`);
assert(excessiveBiasCount === 0, `Hidden bias exceeded its gentle distance cap in ${excessiveBiasCount} runs`);
assert(evidenceFailureCount === 0, `Every result must render 3 evidence items; ${evidenceFailureCount} failed`);
assert(secondaryDiffersFromFixedCompanionCount > 0, 'Algorithmic secondary result must not be replaced by the fixed companion mapping');

function rankOnly(answers) {
  const scoreResult = scoring.calculateScores(answers, data.questions);
  return scoring.rankProfiles(scoreResult.scores, data.profiles, data.dimensions);
}

function objectiveFor(profileId, answers) {
  const ranked = rankOnly(answers);
  const target = ranked.find((item) => item.profile.id === profileId);
  const competitor = Math.min(...ranked.filter((item) => item.profile.id !== profileId).map((item) => item.distance));
  return target.distance - competitor;
}

for (const target of data.profiles) {
  let bestResultId = null;
  let bestObjective = Number.POSITIVE_INFINITY;
  for (let restart = 0; restart < 12; restart += 1) {
    const answers = {};
    for (const question of data.questions) {
      answers[question.id] = question.options[Math.floor(random() * question.options.length)].id;
    }

    for (let pass = 0; pass < 3; pass += 1) {
      for (const question of data.questions) {
        let bestOption = answers[question.id];
        let bestLocalObjective = Number.POSITIVE_INFINITY;
        for (const candidate of question.options) {
          answers[question.id] = candidate.id;
          const value = objectiveFor(target.id, answers);
          if (value < bestLocalObjective) {
            bestLocalObjective = value;
            bestOption = candidate.id;
          }
        }
        answers[question.id] = bestOption;
      }
    }

    const ranked = rankOnly(answers);
    const objective = objectiveFor(target.id, answers);
    if (objective < bestObjective) {
      bestObjective = objective;
      bestResultId = ranked[0].profile.id;
    }
  }
  assert(bestResultId === target.id, `Profile ${target.id} is not reachable; nearest was ${bestResultId}`);
}

if (errors.length) {
  process.stderr.write(errors.map((error) => `- ${error}`).join('\n') + '\n');
  process.stderr.write(`Distribution: ${JSON.stringify(distribution)}\n`);
  process.exit(1);
}

const shareSummary = Object.fromEntries(
  Object.entries(shares).map(([id, share]) => [id, `${(share * 100).toFixed(2)}%`])
);
process.stdout.write(
  `Scoring checks passed. Uniform random-map shares (${randomRuns} runs): ${JSON.stringify(shareSummary)}\n`
  + `Tie-breaker: ${(tieBreakerRate * 100).toFixed(2)}%; hidden question: ${(specialQuestionRate * 100).toFixed(2)}%; `
  + `hidden bias eligible: ${biasEligibleCount}/${specialQuestionCount}, primary switches: ${biasPrimarySwitchCount}\n`
  + `Closest centers: ${minimumCenterPair.join('/')} ${minimumCenterDistance.toFixed(2)}; `
  + `fixed companion differs from algorithmic secondary in ${secondaryDiffersFromFixedCompanionCount}/${randomRuns} runs\n`
);

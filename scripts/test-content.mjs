import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await import(pathToFileURL(path.join(projectRoot, 'src/assets/data.js')));

const data = globalThis.WEATHER_DATA;
const errors = [];
const expectedNames = [
  '晨露', '晚霞', '彩虹', '春风', '闪电', '流星', '火山', '季风',
  '风眼', '恒星', '冷锋', '卷云', '山岚', '月食', '潮汐', '极光'
];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function chineseLength(value) {
  return Array.from(value || '').length;
}

assert(data.questions.length === 20, `Expected 20 base questions, received ${data.questions.length}`);
assert(data.profiles.length === 16, `Expected 16 profiles, received ${data.profiles.length}`);
assert(data.questions.filter((question) => question.mode === 'blind').length === 3, 'Expected exactly 3 blind-choice questions');

const questionIds = new Set();
const allQuestions = [data.specialQuestion, ...Object.values(data.tieBreakers), ...data.questions];
for (const question of allQuestions) {
  assert(!questionIds.has(question.id), `Duplicate question id: ${question.id}`);
  questionIds.add(question.id);
  assert(chineseLength(question.text) <= 28, `${question.id} prompt is too long for the simplified mobile rhythm`);
  assert(chineseLength(question.context) >= 4 && chineseLength(question.context) <= 8, `${question.id} needs a 4–8 character evidence context`);
  assert(!/[？?！!。]/.test(question.context || ''), `${question.id} context must not contain sentence-ending punctuation`);
  assert(question.options.length === 4, `${question.id} must have exactly 4 options`);
  const optionLabels = new Set();
  for (const option of question.options) {
    assert(!optionLabels.has(option.label), `${question.id} contains duplicate option copy`);
    optionLabels.add(option.label);
    assert(chineseLength(option.label) <= 18, `${question.id}/${option.id} is too long for a simplified mobile option`);
    assert(option.evidence && option.evidence.includes(`「${question.context}」`), `${question.id}/${option.id} evidence must use its explicit context`);
  }
}

const profileIds = new Set(data.profiles.map((profile) => profile.id));
const profileNames = new Set(data.profiles.map((profile) => profile.name));
assert(profileIds.size === 16, 'Profile ids must be unique');
assert(profileNames.size === 16, 'Profile names must be unique');
assert(expectedNames.every((name) => profileNames.has(name)), 'The final 16 weather names drifted from the approved set');

for (const profile of data.profiles) {
  const requiredText = ['name', 'kind', 'observation', 'photo', 'alt', 'quote', 'summary', 'strength', 'misread', 'trigger', 'medal', 'final', 'companionPrompt'];
  for (const key of requiredText) assert(Boolean(profile[key]), `${profile.id} is missing ${key}`);
  assert(Array.isArray(profile.verdict) && profile.verdict.length === 2, `${profile.id} needs a two-line verdict`);
  assert(profile.verdict.every((line) => chineseLength(line) <= 20), `${profile.id} verdict line is too long for the share card`);
  assert(profile.quote === profile.verdict.join(''), `${profile.id} quote must match its joined verdict exactly`);
  assert(Array.isArray(profile.cardTags) && profile.cardTags.length === 3, `${profile.id} needs three card tags`);
  assert(Array.isArray(profile.metrics) && profile.metrics.length === 3, `${profile.id} needs three technical metrics`);
  assert(Array.isArray(profile.honor) && profile.honor.length === 2, `${profile.id} needs a two-line honor translation`);
  assert(chineseLength(profile.summary) <= 96, `${profile.id} summary is too long for the result page`);
  assert(chineseLength(profile.strength) <= 50, `${profile.id} strength is too long for the result page`);
  assert(chineseLength(profile.misread) <= 52, `${profile.id} misread is too long for the result page`);
  assert(profileNames.has(profile.companion), `${profile.id} companion must be another approved profile`);
  const companion = data.profiles.find((candidate) => candidate.name === profile.companion);
  assert(companion && companion.companion === profile.name, `${profile.name}/${profile.companion} companion mapping must be symmetric`);
}

assert(Array.isArray(data.relationshipPairs) && data.relationshipPairs.length === 8, 'Expected exactly 8 relationship pairs');
const pairedProfileIds = [];
for (const pair of data.relationshipPairs || []) {
  assert(Array.isArray(pair.ids) && pair.ids.length === 2, 'Every relationship pair needs exactly two profile ids');
  assert(Boolean(pair.verdict), 'Every relationship pair needs share-card copy');
  for (const id of pair.ids || []) {
    assert(profileIds.has(id), `Relationship pair references unknown profile ${id}`);
    pairedProfileIds.push(id);
  }
  const first = data.profiles.find((profile) => profile.id === pair.ids[0]);
  const second = data.profiles.find((profile) => profile.id === pair.ids[1]);
  assert(first && second && first.companion === second.name && second.companion === first.name, `${pair.ids.join('/')} must match the fixed companion mapping`);
}
assert(new Set(pairedProfileIds).size === 16 && pairedProfileIds.length === 16, 'Every profile must appear in exactly one relationship pair');

const publicCopy = JSON.stringify({ questions: data.questions, profiles: data.profiles, relationshipPairs: data.relationshipPairs });
assert(!/MBTI|迈尔斯|布里格斯/i.test(publicCopy), 'MBTI references must stay hidden from public-facing copy');

if (errors.length) {
  process.stderr.write(errors.map((error) => `- ${error}`).join('\n') + '\n');
  process.exit(1);
}

process.stdout.write('Content checks passed: 20 base prompts + 6 candidate extras (maximum 22 per run), 3 blind choices, 16 compact weather profiles.\n');

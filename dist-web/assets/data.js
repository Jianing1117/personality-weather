(function attachWeatherData(root) {
  'use strict';

  var TAG_RULES = [
    { pattern: /rescue|care|share|harbor|bridge|attunement|support|anchor|atmosphere|warm/, tag: 'caretake' },
    { pattern: /investigation|preload|model|forensics|replay|interpret|research|audit|omen|suspension|mapping|inquiry|scenario/, tag: 'overthink' },
    { pattern: /camouflage|hidden|conceal|eclipse|deflection|disappear/, tag: 'hide' },
    { pattern: /boundary|cutoff|correction|separation|clearance|literal|limit|direct/, tag: 'boundary' },
    { pattern: /instant|immediate|action|motion|reroute|ignition|mobilizer|countermove|restart|rebuild|command/, tag: 'act' },
    { pattern: /humor|comedy|haha|joke|performance|punctuation/, tag: 'joke' },
    { pattern: /memory|nostalgia|archive|tide|old|delayed|curated/, tag: 'nostalgic' },
    { pattern: /flex|change|fluid|fate|drift|reweather|substitute|improvise|experimental/, tag: 'improvise' }
  ];

  function inferTags(evidenceKey) {
    return TAG_RULES.filter(function matches(rule) {
      return rule.pattern.test(evidenceKey);
    }).map(function toTag(rule) {
      return rule.tag;
    });
  }

  function option(id, label, delta, evidenceKey) {
    return { id: id, label: label, delta: delta, evidenceKey: evidenceKey, tags: inferTags(evidenceKey) };
  }

  function question(id, mode, text, options) {
    return { id: id, mode: mode, text: text, options: options };
  }

  var EVIDENCE_CONTEXTS = {
    q01: '计划临时改期',
    q02: '输入之后没发',
    q03: '进入陌生熟人局',
    q04: '丑照被发进群',
    q05: '独处画面盲选',
    q08: '无故持续低落',
    q09: '收到真诚夸奖',
    q10: '对方只回哈哈',
    q11: '朋友嘴上没事',
    q12: '重要决定依据',
    q14: '随身物件盲选',
    q15: '独处恢复方式',
    q16: '荒诞梦醒之后',
    q17: '疲惫时被需要',
    q18: '愿意承认的话',
    q19: '相册往日提醒',
    q21: '旅行突发混乱',
    q22: '多种穿衣风格',
    q23: '被说已经懂你',
    q24: '努力没有回响',
    'special-low-visibility': '想被懂却不说',
    'tb-pressure': '刺人消息回复',
    'tb-humidity': '聚会气氛不对',
    'tb-wind': '群聊点子领头',
    'tb-visibility': '聚会真实分享',
    'tb-volatility': '常去小店关门'
  };

  var questionBank = {
    q01: question('q01', 'normal', '期待已久的计划临时改期，你通常会怎么处理？', [
      option('A', '立刻改方案，今天照样过。', { pressure: -1, wind: 2, volatility: 2 }, 'instant_reroute_action'),
      option('B', '先问清原因，再重排时间。', { pressure: 1, wind: 1, volatility: -1 }, 'model_recalibration'),
      option('C', '嘴上说没事，心里办追悼会。', { pressure: 2, visibility: -2, volatility: -2 }, 'hidden_plan_archive'),
      option('D', '松一口气，顺势留在家里。', { pressure: -1, wind: -2, volatility: 1 }, 'private_shutdown_relief')
    ]),
    q02: question('q02', 'absurd', '对方显示“正在输入”七分钟，最后没发。你会？', [
      option('A', '继续等，看看消息会不会来。', { pressure: 1, humidity: 1, wind: -1 }, 'silent_wait'),
      option('B', '发个问号，直接结束悬念。', { pressure: -1, wind: 2, visibility: 2 }, 'direct_question_action'),
      option('C', '扣下手机，不再等这条消息。', { humidity: -2, visibility: -1, volatility: -1 }, 'private_boundary_shutdown'),
      option('D', '脑补四种结局，坏的先信。', { pressure: 2, visibility: -1, volatility: 2 }, 'scenario_preload')
    ]),
    q03: question('q03', 'normal', '走进大家都熟、只有你陌生的场合，你会？', [
      option('A', '先认识几个人，接入现场。', { humidity: 1, wind: 2, visibility: 2 }, 'social_bridge_action'),
      option('B', '先观察关系，再决定坐哪。', { pressure: 1, humidity: 1, wind: -1 }, 'social_mapping'),
      option('C', '先找一个温和的人聊。', { humidity: 2, visibility: -1, volatility: -1 }, 'one_person_harbor'),
      option('D', '安静待着，享受暂时匿名。', { humidity: -1, wind: -2, visibility: -2 }, 'anonymous_camouflage')
    ]),
    q04: question('q04', 'absurd', '朋友把你的闭眼丑照发进群，你会怎么做？', [
      option('A', '立刻发他的库存照反击。', { wind: 2, visibility: 2, volatility: 1 }, 'instant_countermove'),
      option('B', '私聊请他撤回，语气礼貌。', { pressure: 1, humidity: -1, visibility: 1 }, 'private_boundary_correction'),
      option('C', '跟着笑，晚上再独自放大看。', { pressure: 2, humidity: 1, visibility: -2 }, 'hidden_replay'),
      option('D', '不去管它，继续聊别的。', { pressure: -2, humidity: -1, volatility: -2 }, 'nonreaction_release')
    ]),
    q05: question('q05', 'blind', '别想含义，三秒选一个想独处十分钟的画面：', [
      option('A', '深夜唯一亮着的厨房窗。', { pressure: 2, humidity: 1, visibility: -1 }, 'private_night_light'),
      option('B', '陌生车站的空站台，列车即将进站。', { humidity: -1, wind: 2, volatility: 2 }, 'fate_drift'),
      option('C', '雨天温室里，被绿植围住的长椅。', { humidity: 2, wind: -2, visibility: -1 }, 'silent_attunement'),
      option('D', '雪地尽头清晰的地平线。', { humidity: -2, visibility: 2, volatility: -1 }, 'clearance_boundary')
    ]),
    q08: question('q08', 'normal', '连续几天状态低落却没原因，你通常先做什么？', [
      option('A', '先救作息，把生活拉回轨道。', { humidity: -1, wind: 2, volatility: -2 }, 'action_stability'),
      option('B', '找懂的人聊，把感受说清。', { pressure: -1, humidity: 2, visibility: 2 }, 'direct_emotional_share'),
      option('C', '减少见人，等自己慢慢恢复。', { pressure: 1, wind: -2, visibility: -2 }, 'private_withdraw'),
      option('D', '换个环境，给生活强制刷新。', { pressure: -1, wind: 2, volatility: 2 }, 'reweather_restart')
    ]),
    q09: question('q09', 'normal', '收到具体又真诚的夸奖，你第一反应更像？', [
      option('A', '认真接住，直接说谢谢。', { pressure: -1, visibility: 2, volatility: -1 }, 'praise_acceptance'),
      option('B', '先自嘲一句，降低亮度。', { pressure: 1, humidity: 1, visibility: -1 }, 'humor_praise_deflection'),
      option('C', '先怀疑客气，回家复盘。', { pressure: 2, humidity: 1, visibility: -2 }, 'compliment_forensics_audit'),
      option('D', '当场平静，回家记很久。', { pressure: 1, humidity: 2, volatility: 1 }, 'delayed_glow_archive')
    ]),
    q10: question('q10', 'absurd', '喜欢的人只回一个“哈哈”，你会怎么处理？', [
      option('A', '按字面理解，不再加戏。', { pressure: -1, humidity: -2, volatility: -1 }, 'literal_weather'),
      option('B', '反复琢磨两个哈的语气。', { pressure: 2, humidity: 1, visibility: -1 }, 'punctuation_forensics'),
      option('C', '回更大的哈哈，不能输。', { wind: 1, visibility: 2, volatility: 1 }, 'haha_countermove'),
      option('D', '暂时不回，等对方再开口。', { humidity: -1, wind: -1, visibility: -2 }, 'romantic_cooldown_withdraw')
    ]),
    q11: question('q11', 'normal', '朋友明显低气压，却坚持说“没事”。你：', [
      option('A', '听出不对，再认真问一句。', { pressure: 1, humidity: 2, visibility: 1 }, 'care_attunement_inquiry'),
      option('B', '陪着不问，等他自己开口。', { humidity: 1, wind: -1, visibility: -1 }, 'quiet_attunement'),
      option('C', '尊重原话，不替他定义。', { humidity: -1, visibility: 1, volatility: -1 }, 'literal_boundary'),
      option('D', '先递点吃的，走后勤通道。', { humidity: 1, wind: 2, visibility: -1 }, 'concrete_care_action')
    ]),
    q12: question('q12', 'normal', '遇到没有标准答案的重要决定，你更依靠什么？', [
      option('A', '查信息规则，再判断风险。', { pressure: 1, humidity: -1, volatility: -1 }, 'rule_model'),
      option('B', '听第一反应和身体直觉。', { humidity: 1, wind: 1, volatility: 1 }, 'body_intuition'),
      option('C', '听少数重要之人的看法。', { humidity: 2, visibility: 1, volatility: 1 }, 'relational_reference'),
      option('D', '继续等待，等局势更清楚。', { pressure: 2, wind: -2, visibility: -1 }, 'decision_suspension')
    ]),
    q14: question('q14', 'blind', '三秒盲选，桌上四件东西只能带走一件：', [
      option('A', '一颗还带余温的石头。', { pressure: 2, humidity: 1, volatility: -1 }, 'stored_heat'),
      option('B', '一小瓶抓不住的风。', { pressure: -1, wind: 2, volatility: 2 }, 'bottled_wind_drift'),
      option('C', '一面把你照清楚的镜子。', { humidity: -1, visibility: 2, volatility: -1 }, 'clear_mirror'),
      option('D', '一封写给你却没署名的信。', { pressure: 1, humidity: 2, visibility: -2 }, 'unsigned_private_letter')
    ]),
    q15: question('q15', 'normal', '真正能让你恢复电量的独处，更像哪一种？', [
      option('A', '彻底静音，不接任何消息。', { wind: -2, visibility: -2, volatility: -1 }, 'silent_recharge'),
      option('B', '随便走走，不安排主线。', { humidity: 1, wind: -1, volatility: 1 }, 'soft_private_drift'),
      option('C', '只留一个舒服的人在线。', { humidity: 2, visibility: 1, volatility: -1 }, 'one_person_harbor'),
      option('D', '独自去热闹的新地方逛。', { wind: 2, visibility: -1, volatility: 2 }, 'anonymous_stimulation')
    ]),
    q16: question('q16', 'absurd', '做了一个剧情完整但毫无常识的梦，醒来以后你：', [
      option('A', '当作乱梦，起床就忘。', { pressure: -1, humidity: -2, volatility: -1 }, 'dream_dismissal'),
      option('B', '查象征记细节，寻找暗示。', { pressure: 2, humidity: 1, volatility: 1 }, 'dream_interpretation'),
      option('C', '立刻讲给别人，让他也听听。', { humidity: 1, wind: 1, visibility: 2 }, 'dream_broadcast'),
      option('D', '闭眼睡回去，争取看续集。', { humidity: 1, wind: 1, volatility: 2 }, 'dream_reentry')
    ]),
    q17: question('q17', 'absurd', '你累到只想关机，重要的人忽然说“陪我一下”。你会？', [
      option('A', '先帮他处理一件具体的事。', { humidity: 2, wind: 1, visibility: -1 }, 'concrete_care'),
      option('B', '先安抚他，自己的累稍后说。', { pressure: 1, humidity: 2, visibility: 1 }, 'atmosphere_care'),
      option('C', '直说今晚接不住，约明天认真聊。', { pressure: -1, visibility: 2, volatility: -1 }, 'honest_capacity_boundary'),
      option('D', '先离线充电，恢复后再回消息。', { humidity: 1, wind: -1, visibility: -2 }, 'private_recharge')
    ]),
    q18: question('q18', 'blind', '不许解释，选一句你最愿意承认的话：', [
      option('A', '我在等方向清楚再行动。', { pressure: 2, wind: -2, volatility: 1 }, 'action_research'),
      option('B', '我的真心只对熟人可见。', { humidity: 1, visibility: -2, volatility: -1 }, 'hidden_private_care'),
      option('C', '我的行动总比解释先到。', { pressure: -1, wind: 2, volatility: 2 }, 'instant_action'),
      option('D', '我会替所有结局准备雨具。', { pressure: 2, humidity: 2, visibility: -1 }, 'scenario_preload_care')
    ]),
    q19: question('q19', 'normal', '相册提醒“三年前的今天”，你点开后会？', [
      option('A', '留下最好的一张，其余归档。', { pressure: 1, humidity: 2, volatility: -1 }, 'curated_memory_archive'),
      option('B', '先想起当时的人后来去了哪。', { pressure: 1, humidity: 2, volatility: 2 }, 'relational_tide'),
      option('C', '当下划走，晚上又突然想起。', { pressure: 2, humidity: 1, visibility: -2 }, 'delayed_eclipse'),
      option('D', '关闭提醒，不让过去来推送。', { pressure: -1, humidity: -2, wind: 1 }, 'decisive_cutoff')
    ]),
    q21: question('q21', 'absurd', '旅行坐反车，手机只剩 1%，大家又吵起来。你会？', [
      option('A', '先确认人、钱和下一班车。', { pressure: -1, wind: 1, volatility: -2 }, 'crisis_triage'),
      option('B', '先叫停争吵，再说清下一步。', { humidity: -1, wind: 1, visibility: 2 }, 'immediate_boundary_clearance'),
      option('C', '直接接管，回酒店再崩溃。', { pressure: 2, wind: 2, visibility: 1 }, 'volcanic_command'),
      option('D', '把坐反的方向改成目的地。', { pressure: -1, wind: 2, volatility: 2 }, 'fate_reroute')
    ]),
    q22: question('q22', 'absurd', '搬家翻出三种完全不同的穿衣风格，朋友问哪种才是你？', [
      option('A', '都是我，今天轮到不同版本。', { humidity: 1, visibility: 2, volatility: 2 }, 'identity_fluidity'),
      option('B', '看场合和同行的人自然换挡。', { humidity: 1, wind: 1, volatility: 2 }, 'seasonal_reweather'),
      option('C', '选现在最常穿的，当官方版本。', { pressure: 1, visibility: 1, volatility: -1 }, 'curated_archive'),
      option('D', '三套衣服就想定义我？样本不足。', { pressure: 2, humidity: -1, wind: -1 }, 'sample_model_inquiry')
    ]),
    q23: question('q23', 'normal', '刚认识的人说“我已经很懂你了”，你心里会？', [
      option('A', '礼貌笑笑，实际会更谨慎。', { pressure: 1, visibility: -2, volatility: -1 }, 'hidden_mountain_boundary'),
      option('B', '请他说说，真说中就更敞开。', { humidity: 2, visibility: 1, volatility: 2 }, 'rare_safe_reveal'),
      option('C', '直接纠正：你了解得还不够。', { pressure: -1, humidity: -1, visibility: 2 }, 'direct_correction_boundary'),
      option('D', '顺着他讲，不交出真实版本。', { pressure: -1, visibility: -1, volatility: 2 }, 'humor_deflection')
    ]),
    q24: question('q24', 'absurd', '认真做了半年仍没回响，你接下来更可能怎么做？', [
      option('A', '照原节奏继续，不追着反馈跑。', { pressure: 1, wind: 1, volatility: -2 }, 'steady_coordinate'),
      option('B', '换包装和路径，保留核心。', { pressure: 1, wind: 1, volatility: 2 }, 'adaptive_reweather'),
      option('C', '继续蓄力，下次集中突破。', { pressure: 2, wind: 2, visibility: -1 }, 'volcanic_release'),
      option('D', '体面收尾，转向新的目标。', { pressure: -1, wind: 2, volatility: 2 }, 'motion_restart')
    ])
  };

  var orderedQuestionIds = [
    'q01', 'q02', 'q03', 'q04',
    'q05', 'q08', 'q09', 'q10',
    'q11', 'q12', 'q14', 'q15',
    'q16', 'q17', 'q18', 'q19',
    'q21', 'q22', 'q23', 'q24'
  ];

  var questions = orderedQuestionIds.map(function prepare(id, index) {
    var item = questionBank[id];
    item.chapter = Math.floor(index / 4);
    item.order = index + 1;
    item.kind = item.mode === 'absurd'
      ? '非必要灾情模拟'
      : (item.mode === 'blind' ? '无题盲选' : '日常地面观测');
    item.context = EVIDENCE_CONTEXTS[item.id];
    item.options.forEach(function addEvidence(optionItem) {
      optionItem.evidence = '「' + item.context + '」这题，你选了「' + optionItem.label + '」';
    });
    return item;
  });

  var specialQuestion = question('special-low-visibility', 'absurd', '你很想被懂，却迟迟不说。最接近的原因是？', [
    option('A', '怕添麻烦，能消化就不说。', {}, 'private_care'),
    option('B', '关系还浅，对方还没通过试用期。', {}, 'hidden_mountain_boundary'),
    option('C', '白天撑住，夜里再消化。', {}, 'delayed_eclipse'),
    option('D', '等对方说准了，我才打开。', {}, 'rare_safe_reveal')
  ]);
  specialQuestion.chapter = 5;
  specialQuestion.kind = '雷达越权隐藏观测';
  specialQuestion.isSpecial = true;
  specialQuestion.context = EVIDENCE_CONTEXTS[specialQuestion.id];
  ['无声补水', '山口限流', '延时降水', '极光许可'].forEach(function attachMark(mark, index) {
    specialQuestion.options[index].mark = mark;
    specialQuestion.options[index].biasProfile = ['dew', 'mountain-mist', 'lunar-eclipse', 'aurora'][index];
    specialQuestion.options[index].evidence = '「' + specialQuestion.context + '」这题，你选了「' + specialQuestion.options[index].label + '」';
  });

  var tieBreakers = {
    pressure: question('tb-pressure', 'absurd', '收到略微刺人的消息，但不必立刻回复。你会？', [
      option('A', '当场说清，不留到明天。', { pressure: -2, visibility: 2, wind: 1 }, 'pressure_release'),
      option('B', '写十版回复，一版不发。', { pressure: 2, visibility: -1, wind: -1 }, 'pressure_storage'),
      option('C', '等情绪沉淀后再回复。', { pressure: 1, wind: -1, volatility: -1 }, 'pressure_settling'),
      option('D', '用玩笑绕过，暂时不谈。', { pressure: -1, visibility: -1, volatility: 1 }, 'pressure_deflection')
    ]),
    humidity: question('tb-humidity', 'normal', '你刚加入一桌聚会，气氛明显不对，却没人解释。你会？', [
      option('A', '马上察觉不对，问刚才发生了什么。', { humidity: 2, visibility: 1, pressure: 1 }, 'emotion_absorption'),
      option('B', '先安静坐下，等气氛自己松动。', { humidity: 1, wind: -1, visibility: -1 }, 'quiet_attunement'),
      option('C', '看见冷场，但维持自己的节奏。', { humidity: -1, visibility: 1, volatility: -1 }, 'emotional_separation'),
      option('D', '先聊眼前的事，气氛不归我负责。', { humidity: -2, wind: 1, visibility: 1 }, 'literal_boundary')
    ]),
    wind: question('tb-wind', 'normal', '群聊里有人提了个好点子，但一直没人领头。你通常会？', [
      option('A', '直接定时间分任务，把点子推起来。', { wind: 2, volatility: 1, pressure: -1 }, 'instant_motion'),
      option('B', '先列三步，再认领其中一件。', { wind: 1, pressure: 1, volatility: -1 }, 'directed_motion'),
      option('C', '先看看大家反应，有需要再加入。', { wind: -1, volatility: 1, humidity: 1 }, 'slow_activation'),
      option('D', '先研究可不可行，暂时不承诺。', { wind: -2, pressure: 2, visibility: -1 }, 'action_research')
    ]),
    visibility: question('tb-visibility', 'normal', '聚会轮到每个人讲一件最近真实发生的事。你会？', [
      option('A', '把真正影响我的那件事完整说完。', { visibility: 2, humidity: 1, pressure: -1 }, 'full_visibility'),
      option('B', '说一件真的，但只讲到自己舒服。', { visibility: 1, humidity: 1, pressure: 1 }, 'partial_visibility'),
      option('C', '挑个安全版本，重点全部省略。', { visibility: -2, pressure: 2, humidity: 1 }, 'weather_concealment'),
      option('D', '讲成段子，让大家笑完就翻篇。', { visibility: -1, volatility: 1, pressure: -1 }, 'humorous_eclipse')
    ]),
    volatility: question('tb-volatility', 'absurd', '专程去的常去小店突然关门，你会怎么办？', [
      option('A', '立刻找一家没去过的新店。', { volatility: 2, wind: 1, humidity: -1 }, 'rapid_reweather'),
      option('B', '在附近找个相似替代。', { volatility: 1, wind: 1, pressure: -1 }, 'adaptive_substitute'),
      option('C', '失去兴致，直接回家。', { volatility: -1, wind: -1, visibility: -1 }, 'plan_dependent_mood'),
      option('D', '站在门口查它为何倒闭。', { volatility: -2, pressure: 2, humidity: 1 }, 'climate_attachment')
    ])
  };

  Object.keys(tieBreakers).forEach(function prepareTie(key) {
    var item = tieBreakers[key];
    item.chapter = 0;
    item.kind = '两股气团定向加测';
    item.context = EVIDENCE_CONTEXTS[item.id];
    item.options.forEach(function addTieEvidence(optionItem) {
      optionItem.evidence = '「' + item.context + '」这题，你选了「' + optionItem.label + '」';
    });
  });

  var profiles = [
    {
      id: 'dew', name: '晨露', kind: 'Dawn Condensation', observation: 'DW—01', glyph: '·',
      photo: './assets/weather/dew.jpg', alt: '清晨草叶与露珠的写实微距照片',
      center: { pressure: 28, humidity: 76, wind: 28, visibility: 58, volatility: 28 },
      palette: ['#2f4156', '#567c8d', '#c8d9e6'], tone: 'light', layout: 'upper-left',
      verdict: ['你从不点破，', '但你全都知道。'],
      cardTags: ['情绪湿度计', '细微捕捉', '无声照料'],
      metrics: [['Humidity', '98%'], ['Dew Point', '8.2°C'], ['Formation', 'Dawn']], companion: '春风',
      companionPrompt: '那个总能让你停止观察、真正放松下来的人，可能就是你的春风。',
      honor: ['你总在天亮之前，', '替每一片叶子接住了光。'],
      quote: '你从不点破，但你全都知道。',
      summary: '你习惯先读懂空气，再决定自己该靠近还是退开。别人随口提过的小偏好你记得很久，气氛一变也总是最早察觉；只是你嘴上说“不计较”，心里却会记得谁看懂了那些没说出口的小事。',
      strength: '你让还没准备好解释自己的人，也能在不被追问的情况下，感到自己被认真放在心上。',
      misread: '别人只是晚回一会儿消息，你已经从标点推演到关系降温；猜得越准，越容易忘记亲口确认。',
      trigger: '重要的人语气轻了半度、说“真的没事”，却拒绝提供完整天气报告。',
      medal: '本台授予你“无声补水员”称号。请注意，照料别人不等于自动放弃自己的降水权。',
      final: '你总在天亮之前，替每一片叶子接住了光。下一次，也给自己留一滴。'
    },
    {
      id: 'sunset', name: '晚霞', kind: 'Afterglow Weather', observation: 'AG—02', glyph: '◒',
      photo: './assets/weather/sunset.jpg', alt: '粉橙与紫色晚霞云层的写实照片',
      center: { pressure: 72, humidity: 76, wind: 28, visibility: 72, volatility: 56 },
      palette: ['#2f4156', '#826f82', '#d8b4ad'], tone: 'dark', layout: 'upper-left',
      verdict: ['谁都经历过告别，', '但只有你的告别有颜色。'],
      cardTags: ['情绪调色', '记忆收藏', '告别美学'],
      metrics: [['Solar Angle', '−4°'], ['Wavelength', '620 nm'], ['Horizon', 'West']], companion: '潮汐',
      companionPrompt: '那个一句回应就能改变你心里潮位的人，去让 TA 测一下——可能是你的潮汐。',
      honor: ['你总能把一场告别，', '留成值得反复想起的颜色。'],
      quote: '谁都经历过告别，但只有你的告别有颜色。',
      summary: '你需要确认一段经历被认真发生过，才舍得把它归档。朋友搬家、换工作或失恋时，你总记得该留哪句话；明明最懂无常，却受不了重要时刻潦草退场，现实没给好台词，你会在脑内补写。',
      strength: '你让一段关系即使没有好结局，也不必被粗暴归类为失败；同行的人因此还能保留尊严。',
      misread: '相册都整理到第三遍了，你还说只是在做断舍离；往事被修得太美，下一程就迟迟不开场。',
      trigger: '旧歌、熟悉的光线、某个日期，以及一句当时没有来得及好好回答的话。',
      medal: '本台授予你“人类记忆调色师”资格。翻篇不等于必须黑白打印。',
      final: '你不是放不下，只是不愿让重要的东西以灰色退场。调完颜色，也记得继续往前。'
    },
    {
      id: 'rainbow', name: '彩虹', kind: 'Prismatic Weather', observation: 'RW—03', glyph: '⌒',
      photo: './assets/weather/rainbow.jpg', alt: '明亮云海上方出现一道巨大真实彩虹的照片',
      center: { pressure: 28, humidity: 78, wind: 58, visibility: 78, volatility: 72 },
      palette: ['#2f4156', '#6f8fa4', '#d7c6d7'], tone: 'light', layout: 'upper-left',
      verdict: ['一句话说得清的人，', '是因为他们只有一种颜色。'],
      cardTags: ['内在多声部', '偶尔自相矛盾', '全色域人格'],
      metrics: [['Refraction', '42°'], ['Condition', 'Rain + Sun'], ['Spectrum', 'Visible']], companion: '季风',
      companionPrompt: '那个从不逼你固定成一个版本、反而陪你一起换季的人，可能就是你的季风。',
      honor: ['一个答案，', '装不下完整的你。'],
      quote: '一句话说得清的人，是因为他们只有一种颜色。',
      summary: '你的大脑允许多个版本同时在线，理性和感性不必决出输赢。朋友争执时，你常能翻译双方真正想说的话；轮到自己决定，却要先让每种可能都发言——不是没原则，是内部会议稍微有点超时。',
      strength: '你能让互相矛盾的立场都被完整听见，再替它们找到一块可以继续合作的地面。',
      misread: '朋友问你晚饭吃什么，你先给四个答案补完适用条件；谁都没被冒犯，但饭也快打烊了。',
      trigger: '被要求“到底选一个”、被催着用一句话解释自己，或者有人把复杂当作不真诚。',
      medal: '本台向你发放“全色域人格合法持有证”。一个答案装不下完整的你。',
      final: '你的矛盾不是裂缝，是光穿过你以后留下的颜色。完整从来不等于单一。'
    },
    {
      id: 'spring-breeze', name: '春风', kind: 'Temperate Airflow', observation: 'BR—04', glyph: '≈',
      photo: './assets/weather/spring-breeze.jpg', alt: '被温柔春风吹向一侧的银绿色草穗照片',
      center: { pressure: 28, humidity: 74, wind: 72, visibility: 52, volatility: 28 },
      palette: ['#2f4156', '#739386', '#d6e3d3'], tone: 'light', layout: 'upper-left',
      verdict: ['你没有替谁停留，', '却让沿途的花都以为春天只来过这里。'],
      cardTags: ['普遍升温', '沿途开花', '容易被误会'],
      metrics: [['Velocity', '3.8 m/s'], ['Direction', 'SE'], ['Thermal', '+5°C']], companion: '晨露',
      companionPrompt: '那个不只接受你的温暖、还总能最先发现你累了的人，可能就是你的晨露。',
      honor: ['你很少推着谁往前，', '却总能让一整个季节开始松动。'],
      quote: '你没有替谁停留，却让沿途的花都以为春天只来过这里。',
      summary: '你判断关系是否舒服，看的是彼此能不能慢慢松弛下来。朋友卡住时，你不急着讲道理，常先让难堪变成能继续生活的小事；可你太会替别人回暖，自己的委屈往往被包装成一句“我都可以”。',
      strength: '你出现以后，拘谨的人敢多说一句，落单的人也有了位置；一个场子会因此真正松下来。',
      misread: '聚会里你给每个人都留了专属回应，散场后却没意识到，已经有人把礼貌读成了偏爱。',
      trigger: '场面变冷、有人进不了话题，或者所有人都在等别人先释放善意。',
      medal: '本台授予你“公共升温许可”。请在必要时附注：春风经过，不代表签订恋爱合同。',
      final: '你带来的温暖是真的，即使它并不只属于一个人。也别忘了给自己留一块回暖区。'
    },
    {
      id: 'lightning', name: '闪电', kind: 'Electrical Weather', observation: 'LT—05', glyph: 'ϟ',
      photo: './assets/weather/lightning.jpg', alt: '巨大闪电划过深靛蓝风暴云层的写实照片',
      center: { pressure: 68, humidity: 28, wind: 76, visibility: 80, volatility: 76 },
      palette: ['#22334d', '#5a72a5', '#d7e8ff'], tone: 'dark', layout: 'upper-right',
      verdict: ['别人绕十分钟的弯，', '你一秒劈到重点。'],
      cardTags: ['真相先到', '直接击穿', '雷声收尾'],
      metrics: [['Voltage', '300 MV'], ['Channel', '30 kK'], ['Duration', '0.2 s']], companion: '卷云',
      companionPrompt: '那个能接住你的结论，还能补完整张地图的人，可能就是你的卷云。',
      honor: ['你不负责漫长地照亮，', '只负责让世界突然看清。'],
      quote: '别人绕十分钟的弯，你一秒劈到重点。',
      summary: '信息越乱，你越想先找出那根真正带电的线。会议卡住时，你会问出所有人都在回避的关键问题，也习惯用行动验证猜测；但你最讨厌低效，偶尔却会为了证明判断没错，把三分钟的事辩成决赛。',
      strength: '你能让困在讨论里的团队突然拥有一个可执行的决定，关键时刻替所有人省下昂贵的犹豫。',
      misread: '朋友还在讲自己为什么受伤，你已经递上三步行动清单；问题有方案了，人却觉得自己被跳过了。',
      trigger: '明显的漏洞、反复兜圈、把废话包装成深思熟虑，以及有人要求你假装没看见。',
      medal: '本台授予你“真相瞬时照明奖”。照亮有效，雷声请酌情控制音量。',
      final: '你先照亮真相，再让雷声替你收拾气氛。偶尔让别人先戴好耳机，也不影响你的准确。'
    },
    {
      id: 'meteor', name: '流星', kind: 'Transient Light', observation: 'MT—06', glyph: '✦',
      photo: './assets/weather/meteor.jpg', alt: '一颗流星斜穿深蓝星空的写实照片',
      center: { pressure: 24, humidity: 32, wind: 78, visibility: 56, volatility: 82 },
      palette: ['#21334b', '#58738d', '#d4e6ee'], tone: 'dark', layout: 'lower-left',
      verdict: ['你敢在没人看好的时候先动身', '——多数人一辈子没做过一次。'],
      cardTags: ['即时心动', '先划再说', '后补逻辑'],
      metrics: [['Velocity', '48 km/s'], ['Altitude', '92 km'], ['Duration', '1.6 s']], companion: '极光',
      companionPrompt: '那个很少发光、一发光你就挪不开眼的人，可能就是你的极光。',
      honor: ['你知道有些光不必永久，', '出现过就足以改变愿望的方向。'],
      quote: '你敢在没人看好的时候先动身——多数人一辈子没做过一次。',
      summary: '你更容易被“可能发生什么”点亮，驱动你的不是计划，而是突然出现的意义。看到新点子、陌生城市或心动的人，你常先跨一步再长办法；也容易把高浓度的第一感觉认成命运通知，后来才发现只是推送。',
      strength: '很多后来被证明值得的事，最初都需要一个不等共识的人；你常常就是替它保住窗口的那个。',
      misread: '新项目第一晚你建了三个群、起了五个名字；一周后大家还在群里，你已经被下一个宇宙召走。',
      trigger: '一个让你眼睛亮起来的新可能，以及任何写着“先试了再说”的入口。',
      medal: '本台认证你为“未经审批心动持有者”。允许先划过，记得偶尔补一张地图。',
      final: '有些光不必永久，出现过就足以改变方向。只是别把每一次离场都解释成命运。'
    },
    {
      id: 'volcano', name: '火山', kind: 'Geothermal Weather', observation: 'VC—07', glyph: '▲',
      photo: './assets/weather/volcano.jpg', alt: '蓝调时刻火山与发光熔岩的写实照片',
      center: { pressure: 82, humidity: 68, wind: 82, visibility: 78, volatility: 48 },
      palette: ['#2f4156', '#8c5a56', '#d7a28d'], tone: 'dark', layout: 'upper-left',
      verdict: ['你很少小爆发，', '一到临界点就直接改地形。'],
      cardTags: ['长期蓄压', '临界改形', '不做小爆发'],
      metrics: [['Magma', '1050°C'], ['Plume', '4.2 km'], ['State', 'Active']], companion: '风眼',
      companionPrompt: '那个你发多大火都不躲的人，去让 TA 测一下——多半是你的风眼。',
      honor: ['你沉默太久的时候，', '往往在地下把意志烧得更纯。'],
      quote: '你很少小爆发，一到临界点就直接改地形。',
      summary: '你把在意当成重资产，不轻易启用，一旦认定便投入得近乎过热。日常里你能长期替团队扛事、替关系留余地；嘴上嫌煽情，给在意的人撑腰时却比谁都戏剧化，还坚持把那叫作“处理问题”。',
      strength: '别人习惯忍着的系统性问题，到你这里很难继续被粉饰；你会替所有人争来一次重谈规则的机会。',
      misread: '前十九次不舒服你都说算了，第二十次直接宣布制度废除；旁人只收到结果，没收到过程。',
      trigger: '忍耐太久以后，再一次被要求懂事、退让，或者假装地底从来不烫。',
      medal: '本台授予你“地心诚实表达奖”。火山会破坏旧地形，也会创造新的陆地。',
      final: '你当然可以有热量。只是别等到必须改地形时，才让人知道地底一直很烫。'
    },
    {
      id: 'monsoon', name: '季风', kind: 'Seasonal Wind', observation: 'MN—08', glyph: '≋',
      photo: './assets/weather/monsoon.jpg', alt: '斜向雨幕和被季风吹弯的草场写实照片',
      center: { pressure: 58, humidity: 72, wind: 82, visibility: 36, volatility: 80 },
      palette: ['#2f4156', '#557484', '#a9c0c6'], tone: 'dark', layout: 'upper-right',
      verdict: ['你的稳定，', '是定期换一种活法。'],
      cardTags: ['季节性重启', '感时而变', '定期换季'],
      metrics: [['Humidity', '91%'], ['Wind Field', 'SW'], ['Rainfall', '68 mm']], companion: '彩虹',
      companionPrompt: '那个从不问“哪个才是真的你”、每个版本都接得住的人，可能就是你的彩虹。',
      honor: ['你不是反复无常，', '只是比别人更早听见季节换向。'],
      quote: '你的稳定，是定期换一种活法。',
      summary: '你靠阶段性更新维持生命感，同一套节奏用久了，再有效也会觉得自己正在过期。你会重排作息、换掉方法，甚至重组关系的投入顺序；不少厌倦被你命名为成长，多数是真的，少数只是给旧问题换了新皮肤。',
      strength: '你让变化中的人知道，不必为了证明过去没错而困在旧版本；重新选择也不会让曾经白费。',
      misread: '新方向已经在你心里酝酿很久，对朋友却像周二突然宣布人生改版；你觉得顺理成章，别人只剩兼容问题。',
      trigger: '长期停滞、环境已经变了却还被要求照旧运行，以及闻到新季节的第一阵风。',
      medal: '本台向你签发“合法换季证明”。更新气候不构成人格违约。',
      final: '改变主意不等于辜负过去。只要核心愿望还在，每一次换季都仍然忠于自己。'
    },
    {
      id: 'storm-eye', name: '风眼', kind: 'Cyclonic Calm', observation: 'EY—09', glyph: '◎',
      photo: './assets/weather/storm-eye.jpg', alt: '从近地轨道俯瞰巨大风眼与螺旋云墙的照片',
      center: { pressure: 78, humidity: 30, wind: 76, visibility: 42, volatility: 22 },
      palette: ['#2f4156', '#4f7280', '#a8c7c9'], tone: 'dark', layout: 'lower-left',
      verdict: ['风暴再大，', '正中央永远留给最冷静的人。'],
      cardTags: ['高压稳场', '延迟情绪', '核心清醒'],
      metrics: [['Pressure', '936 hPa'], ['Diameter', '32 km'], ['State', 'Calm']], companion: '火山',
      companionPrompt: '那个平时安静、关键时刻敢替你掀桌重建的人，可能就是你的火山。',
      honor: ['你把最安静的位置，', '留在风暴正中央。'],
      quote: '风暴再大，正中央永远留给最冷静的人。',
      summary: '你平时未必强势，到了别人失去方向时，脑子却会自动切成应急指挥台。突发状况里你能排优先级、分任务，反倒可能为点哪杯饮料犹豫；嘴上嫌麻烦，心里对“这场还得我来稳”多少有点职业荣誉感。',
      strength: '你在最混乱的时刻让所有人重新获得判断力；只要你还在场，局面就不会只剩情绪互撞。',
      misread: '大家慌乱时你接管全场，事后别人去休息，你还在复盘哪里能更好；危机结束了，值班却没有。',
      trigger: '所有人同时慌乱、责任突然落下，或者现场没有第二个愿意保持清醒的人。',
      medal: '本台授予你“一级混乱稳定器”资格。救援结束后，请记得开放灾后情绪通道。',
      final: '风眼不是没有风，只是风暂时绕着你走。事情结束以后，也允许自己被接住一次。'
    },
    {
      id: 'star', name: '恒星', kind: 'Fixed Light', observation: 'ST—10', glyph: '✧',
      photo: './assets/weather/star-v2.jpg', alt: '深海军蓝宇宙中一颗从右侧进入画面的巨大金白恒星',
      center: { pressure: 24, humidity: 28, wind: 24, visibility: 44, volatility: 18 },
      palette: ['#2f4156', '#536b80', '#c8d9e6'], tone: 'dark', layout: 'lower-left',
      verdict: ['你不追着谁发光，', '久了大家自然拿你校准方向。'],
      cardTags: ['固定坐标', '长期发光', '不追着谁'],
      metrics: [['Magnitude', '1.98'], ['Distance', '447 ly'], ['Bearing', 'North']], companion: '冷锋',
      companionPrompt: '那个从不说漂亮废话、却总能替你清掉噪音的人，可能就是你的冷锋。',
      honor: ['你把每一次天亮交给时间，', '自己只负责守住不偏移的坐标。'],
      quote: '你不追着谁发光，久了大家自然拿你校准方向。',
      summary: '你把价值感放在长线里，别人急着回应的事，你先看它能否经得起反复。答应的事不多表态，很久后仍按计划出现；你说不需要认可大多是真的，只是长期没人看见时，会默默把对方从“懂我”名单降级。',
      strength: '有你在，长期项目不会因为一两次冷场就被放弃；别人敢把重要而缓慢的事交到你手里。',
      misread: '路线明明已经堵死，你还把坚持称作再等等；等旁人绕路抵达，你仍在原地维护原则的尊严。',
      trigger: '长期投入被短期数据否定，或者有人要求你为了掌声频繁改变方向。',
      medal: '本台认证你为“长期坐标保有者”。亮度不必追热点，方位仍然有效。',
      final: '不必用即时掌声证明一条长路值得。偶尔回应真正关心你的人，也不会削弱你的坚定。'
    },
    {
      id: 'cold-front', name: '冷锋', kind: 'Frontal Weather', observation: 'CF—11', glyph: '↘',
      photo: './assets/weather/cold-front.jpg', alt: '巨大的冷锋陆架云斜切蓝色天空与平原的照片',
      center: { pressure: 26, humidity: 20, wind: 82, visibility: 84, volatility: 24 },
      palette: ['#2f4156', '#567c8d', '#dceaf1'], tone: 'light', layout: 'upper-left',
      verdict: ['你说话不带温度，', '但句句直击真相。'],
      cardTags: ['废话降温', '边界清晰', '快速厘清'],
      metrics: [['Pressure Δ', '−8 hPa'], ['Thermal Drop', '−9°C'], ['Movement', '42 km/h']], companion: '恒星',
      companionPrompt: '那个听得懂你的直接、从不要求你软化立场的人，可能就是你的恒星。',
      honor: ['你让空气降温，', '也让混乱终于有了清晰边界。'],
      quote: '你说话不带温度，但句句直击真相。',
      summary: '你相信真正的尊重是把话说清楚，越重要的人，越不愿用漂亮话敷衍。朋友遇事时，你会厘清责任，也敢说出没人想说的“不”；你要求别人别猜，却默认他们能自动读懂——你的严格其实已经算很在乎。',
      strength: '有你在，大家不用靠猜维持合作；该负责的人、该停止的事和该决定的节点都会重新清楚。',
      misread: '会议里有人第三次说再看看，你当场追问负责人和截止日；项目活了，客套话也当场去世。',
      trigger: '含糊、拖拉、反复试探，以及把情绪当作不用提出明确请求的理由。',
      medal: '本台授予你“边界气候治理奖”。降温幅度明显，空气质量确有改善。',
      final: '直接不是无情，干燥也不是荒芜。只是人类偶尔需要先被抱一下，再接收解决方案。'
    },
    {
      id: 'cirrus', name: '卷云', kind: 'High-altitude Weather', observation: 'CI—12', glyph: '〰',
      photo: './assets/weather/cirrus.jpg', alt: '清晨高空中伸展的真实纤维状卷云照片',
      center: { pressure: 76, humidity: 26, wind: 28, visibility: 78, volatility: 26 },
      palette: ['#2f4156', '#718b9a', '#e3edf1'], tone: 'light', layout: 'lower-left',
      verdict: ['别人还在聊天气，', '你已经算完了气候。'],
      cardTags: ['高空建模', '过度追问', '先看风向'],
      metrics: [['Altitude', '9.6 km'], ['Crystal', 'Ice'], ['Wind Field', '128°']], companion: '闪电',
      companionPrompt: '那个能把你的整套理论一秒变成行动的人，可能就是你的闪电。',
      honor: ['你飘得高，不是为了远离人群，', '而是为了看清风从哪里来。'],
      quote: '别人还在聊天气，你已经算完了气候。',
      summary: '你要先理解规律才会安心，未知越大，越想站高一点看清来路和去向。别人分享一个现象，你会顺手连到社会、历史和人性；你很会解释自己为什么难过，至于先把难过好好感受完，这项功能还在高空测试。',
      strength: '你能替复杂问题找到别人没看见的长期因果，让团队少在同一种错误里反复缴纳学费。',
      misread: '朋友只是问餐厅好不好吃，你从供应链讲到城市结构；答案很完整，朋友已经自己点完外卖。',
      trigger: '逻辑断裂、规则没有来由、所有人都在执行却没人愿意问为什么。',
      medal: '本台授予你“高空理论建模许可”。请偶尔下降到人类可接收高度发布结论。',
      final: '你飘得高，不是为了远离人群，而是为了看清风从哪里来。看清以后，也记得落地。'
    },
    {
      id: 'mountain-mist', name: '山岚', kind: 'Orographic Mist', observation: 'MM—13', glyph: '≡',
      photo: './assets/weather/mountain-mist.jpg', alt: '青绿山脊间白雾层层流动的写实照片',
      center: { pressure: 68, humidity: 82, wind: 20, visibility: 16, volatility: 22 },
      palette: ['#2f4156', '#6f8b88', '#dce7e2'], tone: 'light', layout: 'upper-left',
      verdict: ['你的全貌是限量发行，', '不公开发售。'],
      cardTags: ['能见度限制', '慢热认证', '熟人全景'],
      metrics: [['Humidity', '96%'], ['Visibility', '1.8 km'], ['Flow', 'Valley']], companion: '月食',
      companionPrompt: '你身边有没有一个总说“让我自己待会儿”的人？TA 大概率就是你的月食。',
      honor: ['你的信任像山里的雾，', '要一层一层散，才肯露出真正的路。'],
      quote: '你的全貌是限量发行，不公开发售。',
      summary: '你把亲近看成逐步授权，分寸和守信比一时热烈更能让你打开自己。你会在小事里观察一个人是否可靠；陌生人眼里你像需预约的私人展馆，到了熟人区却全是幕后花絮，反差大到很难维持人设。',
      strength: '被你真正接纳的人，会得到一种不靠热闹维持的忠诚；关系越久，越能看见你的分量。',
      misread: '新朋友连续释放了三次善意，你还在静默审核；等你终于准备开放，对方已经以为申请被拒。',
      trigger: '被催着表态、要求快速熟络，或者有人拿到试读页就宣布已经登顶。',
      medal: '本台认证你为“低能见度高含金量区域”。山口限流，谢绝无证闯入。',
      final: '雾不需要向路人证明山一直都在。愿意慢慢走的人，自然会看见你的地形。'
    },
    {
      id: 'lunar-eclipse', name: '月食', kind: 'Umbra Event', observation: 'LE—14', glyph: '◑',
      photo: './assets/weather/lunar-eclipse-v2.jpg', alt: '深靛蓝宇宙中从右侧进入画面的巨大铜红月食天体',
      center: { pressure: 84, humidity: 72, wind: 18, visibility: 14, volatility: 62 },
      palette: ['#2f4156', '#67566f', '#c58d91'], tone: 'dark', layout: 'upper-left',
      verdict: ['你的情绪从不打扰任何人，', '它们只在你自己的夜里完整上演。'],
      cardTags: ['内部月食', '独处消化', '阴影过境'],
      metrics: [['Umbra', '100%'], ['Phase', 'Total'], ['Duration', '62 min']], companion: '山岚',
      companionPrompt: '那个从不催你开口、只把路安静留着的人，可能就是你的山岚。',
      honor: ['你并没有失去光，', '只是允许阴影完整地经过自己。'],
      quote: '你的情绪从不打扰任何人，它们只在你自己的夜里完整上演。',
      summary: '你要在无人催促时才听得清感受，独处是把情绪重新变成能说的话。难受时你会减少消息、照常做事，想明白后才交给少数人；你说“别管我”通常是真话，但最在意的人真不管，心里会立刻开无声听证会。',
      strength: '你很少让一时的情绪决定关系的终局；和你认真谈过的人，常能看见问题背后更深的一层。',
      misread: '一场争执结束三天后，你终于整理出真正介意的第七层；对方以为早翻篇了，你才刚进入正片。',
      trigger: '夜晚、关系悬而未决，以及那些没有正式说出口却已经发生的告别。',
      medal: '本台授予你“私人夜色管理局”权限。阴影过境合法，但建议给重要的人发一条停播通知。',
      final: '你不必等到所有人睡着以后才允许自己难过。月亮被看见时，也可以拥有阴影。'
    },
    {
      id: 'tide', name: '潮汐', kind: 'Gravitational Tide', observation: 'TD—15', glyph: '≈',
      photo: './assets/weather/tide-v2.jpg', alt: '蓝调时刻退潮滩涂上层层银蓝潮沟的写实航拍照片',
      center: { pressure: 48, humidity: 82, wind: 34, visibility: 28, volatility: 86 },
      palette: ['#2f4156', '#5f8797', '#c3dce3'], tone: 'light', layout: 'upper-left',
      verdict: ['你从不追谁，', '你只回应真实的引力。'],
      cardTags: ['关系雷达', '潮位记录', '靠近有数'],
      metrics: [['Range', '3.7 m'], ['Cycle', '12h 25m'], ['Gravity', 'Moon']], companion: '晚霞',
      companionPrompt: '那个每次退场后，仍在你心里留下颜色的人，可能就是你的晚霞。',
      honor: ['你看似反复，', '其实每一次靠近和退开都有真实的引力。'],
      quote: '你从不追谁，你只回应真实的引力。',
      summary: '你看重的不是一直黏在一起，而是每次靠近有没有同样的重量。真正投入时，你会把笑话、委屈和微不足道的小事都第一时间发给对方；嘴上最反感试探，退半步时却也想看看，谁会先发现海岸线变了。',
      strength: '你不会用表面热络掩盖失衡；和你靠近的人，很快就会知道这段关系有没有真实的来回。',
      misread: '聊天里对方少用一个表情，你先把热情调低两档；第二天才发现，人家只是换了输入法。',
      trigger: '重要的人突然靠近、退远，或者原本熟悉的回应节奏无预警改变。',
      medal: '本台认证你为“高级引力感应体”。潮起潮落均属合法运行，潮位表不必公开。',
      final: '你的变化不等于没有自我。海一直是海，只是它对真正的引力从不假装无动于衷。'
    },
    {
      id: 'aurora', name: '极光', kind: 'Polar Light', observation: 'AU—16', glyph: '✦',
      photo: './assets/weather/aurora.jpg', alt: '青绿极光帘掠过深靛蓝夜空与浅色雪原的照片',
      center: { pressure: 30, humidity: 60, wind: 22, visibility: 66, volatility: 82 },
      palette: ['#2f4156', '#4d817e', '#9fd6c3'], tone: 'dark', layout: 'upper-right',
      verdict: ['见过你真正样子的人很少，', '且都忘不掉。'],
      cardTags: ['安全磁场', '稀有显色', '接收方审美'],
      metrics: [['Altitude', '110 km'], ['Index', 'Kp 6'], ['Particle', 'Solar']], companion: '流星',
      companionPrompt: '那个总能让你突然亮起来、又不逼你一直发光的人，可能就是你的流星。',
      honor: ['你把大部分光藏在夜里，', '只在值得的时候显出颜色。'],
      quote: '见过你真正样子的人很少，且都忘不掉。',
      summary: '你不缺表达欲，只愿把高浓度的自己放在真正有回声的地方。多数场合你礼貌克制，遇到熟人、热爱的话题或深夜谈话却忽然话多梗多；你很少抢镜，却在意谁能准确发现自己，低调里藏着高级定制的胜负心。',
      strength: '真正进入你世界的人，常会得到一种少见的精神共振；普通话题到了你这里，也能突然长出新维度。',
      misread: '聚会里你判断接收条件不足，于是全程只展示礼貌版本；回家又嫌今晚没有一个人真正懂你。',
      trigger: '安全感真正成立，或者有人准确说中了你一直没有解释的部分。',
      medal: '本台向你颁发“罕见真心显色认证”。出现频率低，不影响观赏价值。',
      final: '极光不接受随叫随到。你也不必为了证明自己有光，长期在不合适的地方发亮。'
    }
  ];

  var relationshipPairs = [
    { ids: ['dew', 'spring-breeze'], verdict: '你测得出所有人的湿度，只有 TA 测得出你的。' },
    { ids: ['sunset', 'tide'], verdict: '你收藏告别，TA 收藏引力——你们都不承认自己在等。' },
    { ids: ['rainbow', 'monsoon'], verdict: 'TA 换季的时候，刚好路过你的全色域。' },
    { ids: ['lightning', 'cirrus'], verdict: '你一秒劈中的真相，TA 在高空早就算到了。' },
    { ids: ['meteor', 'aurora'], verdict: '一个从不停留，一个不常出现——但你们见过彼此。' },
    { ids: ['volcano', 'storm-eye'], verdict: '全场只有 TA，站得进你的爆发半径。' },
    { ids: ['star', 'cold-front'], verdict: '你们都不说废话，所以听得懂彼此的沉默。' },
    { ids: ['mountain-mist', 'lunar-eclipse'], verdict: '你的雾散的那晚，TA 的月亮刚好完整。' }
  ];

  root.WEATHER_DATA = {
    settings: {
      tieGap: 1.4,
      shareDimensions: ['humidity', 'wind', 'visibility'],
      special: {
        visibilityMax: 42,
        humidityMin: 62,
        caretakeMin: 3,
        hideMin: 2,
        candidateGap: 4,
        targetIds: ['dew', 'mountain-mist', 'lunar-eclipse', 'aurora']
      }
    },
    dimensions: [
      { key: 'pressure', name: '内压', weight: 1.1 },
      { key: 'humidity', name: '情绪湿度', weight: 1.05 },
      { key: 'wind', name: '行动风速', weight: 1 },
      { key: 'visibility', name: '自我能见度', weight: 1.1 },
      { key: 'volatility', name: '变天率', weight: 1 }
    ],
    chapters: [
      { name: '第一观测区 · 表层气流', label: '表层气流', ticker: '本台没有卫星，只能先从这些可疑选择开始。' },
      { name: '第二观测区 · 情绪回声', label: '情绪回声', ticker: '初步判断：你确实拥有天气，且前后略有打架。' },
      { name: '第三观测区 · 关系云层', label: '关系云层', ticker: '观测过半。你有两处互相矛盾，恭喜，人类系统运行正常。' },
      { name: '第四观测区 · 能量与记忆', label: '能量与记忆', ticker: '能见度持续波动。部分答案疑似本人不愿承认。' },
      { name: '第五观测区 · 极端天气', label: '极端天气', ticker: '只剩最后一段。两股气团正在争夺你的人格命名权。' }
    ],
    questions: questions,
    specialQuestion: specialQuestion,
    tieBreakers: tieBreakers,
    profiles: profiles,
    relationshipPairs: relationshipPairs,
    reactions: {
      caretake: '你又在替别人维护公共天气。本台已记录一次无偿气象服务。',
      overthink: '本台检测到一次没有资质的灾害建模。严谨，但真的没必要这么完整。',
      hide: '能见度再次下降，而你本人仍坚持声称天气良好。',
      boundary: '冷锋已过境。表达有点凉，但边界现在非常清楚。',
      act: '风速突然上升。你的身体已经行动，脑子稍后补交说明。',
      joke: '你选择用笑话疏散情绪。本台提醒：被疏散的情绪可能绕路回来。',
      nostalgic: '局部记忆湿度上升。旧事目前仍保有一点合法水汽。',
      improvise: '路线已经改变，你倒是很快给新天气办好了暂住证。',
      default: '该选择已进入云图。本台暂时不评价，主要是证据还不够。'
    },
    tickers: {
      opening: '本台没有卫星，只能靠你这些可疑选择推测。犹豫太久将视为美化口供。',
      default: '观测仍在继续。现在退出，只会得到一张不负责任的天气预报。',
      afterSix: '初步判断：你确实拥有天气。类型暂时不明，主要是前后有点打架。',
      halfway: '观测过半。你有两处互相矛盾，恭喜，人类系统运行正常。',
      afterEighteen: '能见度持续波动。部分答案疑似本人不愿承认，本台决定暂不追究。',
      lowVisibility: '本台多次尝试获取真实天气，均被一句“还好”驳回。',
      highPressure: '内部气压持续升高。请勿继续把“没事”当作排气系统。',
      tie: '两股气团正在争夺你的人格命名权。本台临时加测，不收加班费。'
    },
    fastAnswerFinal: '你的平均作答速度疑似超过了天气变化速度。本台仍给出结果，但建议你下次至少把选项看完。'
  };
}(typeof window !== 'undefined' ? window : globalThis));

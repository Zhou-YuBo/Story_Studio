import type { CharacterDetail } from './types'

export const mockCharacters: CharacterDetail[] = [
  {
    id: 'lin-che',
    profile: {
      name: '林澈',
      layer: '主角',
      brief: '修复旧物的工程师，习惯把关系也当成会损耗的结构。',
      logline: '他极度渴望人与人的链接，却坚信所有链接都会消失。',
    },
    truth: {
      coreSelf: '他是一个提前哀悼所有关系的人，但他以为自己只是清醒。',
      socialSelf: '在工作中表现得理性、可靠、克制，像一个不会被情绪干扰的人。',
      personalSelf: '在亲密关系里既渴望靠近，又不断测试对方会不会离开。',
      hiddenSelf: '他害怕自己不值得被留下，于是抢先把离开解释成必然。',
    },
    drive: {
      desire: '被一个人真正选择，并且不是因为责任或亏欠。',
      fear: '关系越重要，消失时就越证明自己不值得。',
      belief: '所有链接都会在某个时间点断掉。',
      doubt: '也许有人留下不是因为还没看清他，而是真的愿意留下。',
    },
    informationGap: {
      knows: '知道自己害怕失去，但不知道这种恐惧已经变成伤害别人的方式。',
      hides: '隐藏自己真正想被留下的需要，只展示理性和退路。',
      misunderstands: '误以为对方的沉默就是离开前兆。',
      audienceKnows: '观众能看到他每次切断关系前其实都在等待一句挽留。',
    },
    dimensions: [
      { id: 'connection-loss', positive: '渴望连接', negative: '相信消失', note: '他越渴望关系稳定，越会提前为失去做准备。', core: true },
      { id: 'control-collapse', positive: '控制', negative: '失控', note: '他用计划和秩序抵抗情感里的不可控。' },
      { id: 'honesty-deception', positive: '诚实', negative: '自我欺骗', note: '他要求别人坦白，却最擅长把自己的恐惧解释成理性。' },
      { id: 'tender-cruel', positive: '温柔', negative: '残酷', note: '他的温柔常常在压力下变成切断关系的冷酷。' },
    ],
    voice: {
      speakingStyle: '很少直接说需要，常用判断句和反问把情绪包起来。',
      sentenceLength: '短句居多，压力越大越趋向冷静、切断式表达。',
      vocabulary: '工程术语、维修隐喻、克制的讽刺。',
      gestures: '说谎或逃避时会整理袖口，像是在把自己重新扣紧。',
      possessions: '一只旧打火机，来自一段已经断掉但他从未真正放下的关系。',
    },
    notes: [
      { id: 'note-1', content: '如果一个人迟早要走，他宁愿先替对方决定。' },
      { id: 'note-2', content: '他不是不在乎，而是太早开始失去。' },
    ],
  },
  {
    id: 'zhou-yi-an',
    profile: {
      name: '周以安',
      layer: '第一圈人物',
      brief: '照顾型朋友，擅长把别人的混乱收拾成日常。',
      logline: '她用照顾别人证明自己有价值，却害怕别人真正看见她的需要。',
    },
    truth: {
      coreSelf: '她把被需要误认为被爱。',
      socialSelf: '稳定、周到、善于安排，像所有人的安全垫。',
      personalSelf: '越亲近越难开口索取，习惯让自己的需要退后。',
      hiddenSelf: '她害怕一旦停止付出，自己就会变得可有可无。',
    },
    drive: {
      desire: '被人主动照顾一次，而不是因为她先付出。',
      fear: '没人需要她时，她就失去留下来的理由。',
      belief: '爱必须通过行动证明。',
      doubt: '也许被爱不需要先证明自己有用。',
    },
    informationGap: {
      knows: '知道林澈在逃避关系，但不愿承认自己也在用照顾逃避索取。',
      hides: '隐藏自己的疲惫和嫉妒，尤其不愿说“我也想被照顾”。',
      misunderstands: '误以为只要安排得足够周到，对方就会自然留下。',
      audienceKnows: '观众能看到她的温柔里藏着强烈的控制欲和求救信号。',
    },
    dimensions: [
      { id: 'care-need', positive: '照顾他人', negative: '承认需要', note: '她把被需要误认为被爱。', core: true },
      { id: 'warm-control', positive: '温暖', negative: '控制', note: '她的照顾有时会越过边界，变成对关系的控制。' },
      { id: 'patience-anger', positive: '忍耐', negative: '愤怒', note: '她把愤怒训练成忍耐，但压力会让它以更锋利的形式回来。' },
    ],
    voice: {
      speakingStyle: '语气温和，习惯先确认对方状态，再说自己的判断。',
      sentenceLength: '中等长度，常有补充说明。',
      vocabulary: '生活细节、提醒、轻描淡写的自嘲。',
      gestures: '说到自己时会笑一下，把话题带回别人身上。',
      possessions: '一本写满待办事项的旧本子。',
    },
    notes: [
      { id: 'note-1', content: '她不是没有脾气，只是太熟练地把脾气变成安排。' },
    ],
  },
  {
    id: 'chen',
    profile: {
      name: '老陈',
      layer: '第二圈人物',
      brief: '旧街修理铺老板，知道很多人不愿说出口的过去。',
      logline: '他看似只管生意，实际总在用旁观者的方式推动别人做选择。',
    },
    truth: {
      coreSelf: '他相信人总要自己开口，别人替他说出来就不算数。',
      socialSelf: '嘴硬、现实、爱讲价。',
      personalSelf: '对亲近的人保持笨拙的关心。',
      hiddenSelf: '他害怕自己的好意变成别人的负担。',
    },
    drive: {
      desire: '让年轻人少走一点他走过的弯路。',
      fear: '干预太多会让别人重复他的错误。',
      belief: '选择必须自己做。',
      doubt: '沉默有时候也是一种逃避。',
    },
    informationGap: {
      knows: '知道旧街上一些没人愿意提起的过往。',
      hides: '隐藏自己曾经做错选择的细节。',
      misunderstands: '以为年轻人只需要被点到为止。',
      audienceKnows: '观众会逐渐意识到他每次嘴硬都在保护某个人。',
    },
    dimensions: [],
    voice: {
      speakingStyle: '话少，喜欢用物件和价格打比方。',
      sentenceLength: '短句，偶尔丢出一句准得吓人的判断。',
      vocabulary: '老街俗语、修理行话、价格隐喻。',
      gestures: '说重话前会擦工具。',
      possessions: '一套用了很多年的螺丝刀。',
    },
    notes: [{ id: 'note-1', content: '他是第二圈人物：有行动、有影响，但不需要完整维度。' }],
  },
]

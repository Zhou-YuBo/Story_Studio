export type CharacterLayer = '主角' | '第一圈人物' | '第二圈人物' | '第三圈人物'

export interface CharacterProfile {
  name: string
  layer: CharacterLayer
  brief: string
  logline: string
}

export interface CharacterTruth {
  coreSelf: string
  socialSelf: string
  personalSelf: string
  hiddenSelf: string
}

export interface CharacterDrive {
  desire: string
  fear: string
  belief: string
  doubt: string
}

export interface CharacterDimensionSummaryItem {
  id: string
  positive: string
  negative: string
  note: string
  core?: boolean
  inverted?: boolean
}

export interface CharacterVoiceBehavior {
  speakingStyle: string
  sentenceLength: string
  vocabulary: string
  gestures: string
  possessions: string
}

export interface CharacterQuickNote {
  id: string
  content: string
}

export interface CharacterDetail {
  id: string
  profile: CharacterProfile
  truth: CharacterTruth
  drive: CharacterDrive
  dimensions: CharacterDimensionSummaryItem[]
  voice: CharacterVoiceBehavior
  notes: CharacterQuickNote[]
}

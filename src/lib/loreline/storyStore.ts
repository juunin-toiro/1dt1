import { create } from 'zustand'

export type Trend = 'up' | 'down' | 'flat' | null

export interface CurvePoint {
  zeit: string
  value: number
  trend: Trend
}

export interface EffectEvent {
  type: string
  magnitude: number
  delaySeconds: number
}

export interface KnowledgeEntry {
  id: string
  title: string
  text: string
}

interface StoryState {
  glucoseValue: number | null
  trend: Trend
  lumiMood: string | null
  curvePoints: CurvePoint[]
  curveVisible: boolean
  effects: EffectEvent[]
  unlockedKnowledge: KnowledgeEntry[]
  // Zaehlt separat von unlockedKnowledge.length hoch - unlockKnowledge() feuert
  // sofort beim Waehlen der Choice (noch bevor das Modal ueberhaupt offen ist),
  // die Pop-Animation des StatusBar-Badges soll aber erst beim "aha"/Schliessen
  // des Modals sichtbar werden (siehe flyKnowledgeIconToStatusBar), deshalb ein
  // eigener Zaehler statt direkt an die Datenmenge gekoppelt zu sein.
  knowledgeBadgePulse: number
  isWaiting: boolean
  setCurve: (value: number, trend: Trend, zeit: string) => void
  setLumiMood: (mood: string | null) => void
  applyEffect: (type: string, magnitude: number, delaySeconds: number) => void
  revealCurve: () => void
  unlockKnowledge: (id: string, title: string, text: string) => void
  pulseKnowledgeBadge: () => void
  setWaiting: (waiting: boolean) => void
  reset: () => void
}

const initialState = {
  glucoseValue: null as number | null,
  trend: null as Trend,
  lumiMood: null as string | null,
  curvePoints: [] as CurvePoint[],
  curveVisible: false,
  effects: [] as EffectEvent[],
  unlockedKnowledge: [] as KnowledgeEntry[],
  knowledgeBadgePulse: 0,
  isWaiting: false,
}

export const useStoryStore = create<StoryState>((set) => ({
  ...initialState,

  setCurve: (value, trend, zeit) =>
    set((state) => ({
      glucoseValue: value,
      trend,
      curvePoints: [...state.curvePoints, { zeit, value, trend }],
    })),

  setLumiMood: (mood) => set({ lumiMood: mood }),

  applyEffect: (type, magnitude, delaySeconds) =>
    set((state) => ({
      effects: [...state.effects, { type, magnitude, delaySeconds }],
    })),

  revealCurve: () => set({ curveVisible: true }),

  unlockKnowledge: (id, title, text) =>
    set((state) => {
      if (state.unlockedKnowledge.some((entry) => entry.id === id)) {
        return state
      }
      return { unlockedKnowledge: [...state.unlockedKnowledge, { id, title, text }] }
    }),

  pulseKnowledgeBadge: () => set((state) => ({ knowledgeBadgePulse: state.knowledgeBadgePulse + 1 })),

  setWaiting: (waiting) => set({ isWaiting: waiting }),

  reset: () => set({ ...initialState, curvePoints: [], effects: [], unlockedKnowledge: [] }),
}))

export function normalizeTrend(raw: unknown): Trend {
  if (raw === 'rising') return 'up'
  if (raw === 'falling') return 'down'
  if (raw === 'stable') return 'flat'
  return null
}

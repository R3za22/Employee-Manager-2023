import type { ShiftGroup } from './types'

export type ShiftCode = 'M' | 'N' | 'Off'

/** Week starts on Saturday. Group A pattern; B and C are rotations of it. */
const BASE: ShiftCode[] = ['M', 'M', 'M', 'Off', 'Off', 'N', 'N']
const OFFSET: Record<Exclude<ShiftGroup, 'none'>, number> = { A: 0, B: 2, C: 4 }

export function weekPattern(group: ShiftGroup): ShiftCode[] {
  if (group === 'none') return ['Off', 'Off', 'Off', 'Off', 'Off', 'Off', 'Off']
  const o = OFFSET[group]
  return BASE.map((_, i) => BASE[(i + o) % 7])
}

/** `weekday`: Saturday = 0 ... Friday = 6. */
export function shiftOn(group: ShiftGroup, weekday: number): ShiftCode {
  return weekPattern(group)[((weekday % 7) + 7) % 7]
}

export const SHIFT_HOURS: Record<Exclude<ShiftCode, 'Off'>, string> = {
  M: '06:00-14:00',
  N: '22:00-06:00',
}

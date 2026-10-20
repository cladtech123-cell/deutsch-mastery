import type { Answer, ExerciseOut } from '../../api/types'

export const str = (v: Answer | undefined) => (typeof v === 'string' ? v : '')
export const list = (v: Answer | undefined) => (Array.isArray(v) ? v : [])
export const dict = (v: Answer | undefined) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})

export function isAnswered(ex: ExerciseOut, v: Answer | undefined): boolean {
  if (ex.type === 'match') return (ex.left ?? []).every((l) => dict(v)[l])
  if (ex.type === 'order_words') return list(v).length > 0 && list(v).length === (ex.options ?? []).length
  return str(v).trim().length > 0
}


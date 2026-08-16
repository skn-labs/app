import { useEffect, useState } from 'react'
import { BottomSheet, Button } from './ui'
import { ExperienceSentimentPicker, type ExperienceSentiment } from './ExperienceStatusBadge'

type Choice = ExperienceSentiment

export function BeforeChangeSheet({ open, title, pending, error, onClose, onChoose, onSkip }: {
  open: boolean
  title: string
  pending: boolean
  error?: string
  onClose: () => void
  onChoose: (choice: Choice) => void
  onSkip: () => void
}) {
  const [choice, setChoice] = useState<Choice | ''>('')
  useEffect(() => { if (!open) setChoice('') }, [open])
  return <BottomSheet open={open} onClose={pending ? () => undefined : onClose} title="새 루틴으로 바꾸기 전에">
    <p className="-mt-2 text-[10px] font-semibold tracking-[.06em] text-[#7084a3]">지금 사용 중인 루틴</p>
    <p className="mt-1.5 text-sm font-semibold leading-6 tracking-[-.02em]">{title}</p>
    <p className="mt-3 text-xs leading-5 text-muted">새 루틴을 시작하면 지금 루틴의 사용 기록은 여기서 마쳐요.<br/>마지막 기록을 남기거나, 바로 새 루틴을 시작할 수 있어요.</p>
    <ExperienceSentimentPicker value={choice} disabled={pending} compact className="mt-5" onChange={setChoice}/>
    {error && <p className="mt-3 text-xs leading-5 text-danger">{error}</p>}
    <Button disabled={!choice || pending} onClick={() => { if (choice) onChoose(choice) }} className="mt-4 w-full">{pending ? '저장하는 중…' : '기록 남기고 새 루틴 시작'}</Button>
    <Button disabled={pending} variant="ghost" onClick={onSkip} className="mt-1 w-full text-xs text-muted">기록 없이 새 루틴 시작</Button>
  </BottomSheet>
}

import { useRef, useState } from 'preact/hooks'
import { tick } from '../lib/haptics'

type Props = {
  value: number | null
  onChange: (v: number) => void
  onRelease?: (v: number) => void
  label: string
  p0: string
  p1: string
  prev?: number | null
  prevLabel?: string
  words?: string[]
  onActive?: (active: boolean) => void
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

// escala visual analógica em barra: começa vazia, tocar preenche até o ponto, arrastar ajusta.
// a marca do valor anterior só aparece depois que há uma resposta.
export function Vas({ value, onChange, onRelease, label, p0, p1, prev, prevLabel, words, onActive }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const last = useRef<number | null>(value)
  const dragging = useRef(false)
  const [active, setActiveState] = useState(false)
  const setActive = (a: boolean) => {
    setActiveState(a)
    onActive?.(a)
  }
  // a palavra do degrau, com a direção do movimento para a animação
  const step = value == null ? null : Math.max(0, Math.min(10, Math.round(value / 10)))
  const lastStep = useRef<number | null>(step)
  const dir = useRef<'up' | 'down'>('up')
  if (step != null && lastStep.current != null && step !== lastStep.current) dir.current = step > lastStep.current ? 'up' : 'down'
  lastStep.current = step
  const word = words && step != null ? words[step] : null

  const pos = (ev: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return clamp(((ev.clientX - r.left) / r.width) * 100)
  }
  const set = (v: number) => {
    // uma batida a cada degrau novo, e no primeiro toque
    if (last.current == null || Math.round(v / 10) !== Math.round(last.current / 10)) tick()
    last.current = v
    onChange(v)
  }
  const end = () => {
    if (!dragging.current) return
    dragging.current = false
    setActive(false)
    if (last.current != null) onRelease?.(last.current)
  }
  const showPrev = prev != null && value != null && !active

  return (
    <div class="vas-wrap">
      {words && (
        <div class="vas-word" aria-live="polite">
          {word ? (
            <span key={word} class={`vas-word-in ${dir.current}`}>
              {word}
            </span>
          ) : (
            <span class="vas-word-empty">·</span>
          )}
        </div>
      )}
      <div
        ref={ref}
        class={`vas${active ? ' is-active' : ''}${value == null ? ' is-empty' : ''}`}
        role="slider"
        tabIndex={0}
        aria-label={`${label}, de ${p0} a ${p1}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value == null ? undefined : Math.round(value)}
        onPointerDown={(ev) => {
          try {
            ref.current!.setPointerCapture(ev.pointerId)
          } catch {}
          dragging.current = true
          setActive(true)
          set(pos(ev))
        }}
        onPointerMove={(ev) => {
          if (dragging.current) set(pos(ev))
        }}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={(ev) => {
          if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
            ev.preventDefault()
            set(clamp((value ?? 50) + (ev.key === 'ArrowRight' ? 2 : -2)))
          }
          if (ev.key === 'Enter' && value != null) onRelease?.(value)
        }}
      >
        <i class="vas-mid" />
        {value != null && (
          <div class="vas-fill" style={{ width: `max(20px, ${value}%)` }}>
            <i class="vas-handle" />
          </div>
        )}
        {showPrev && <i class="vas-ghost" style={{ left: `${prev}%` }} />}
        <span class="vas-pole vas-p0">{p0}</span>
        <span class="vas-pole vas-p1">{p1}</span>
      </div>
      <div class="vas-under">
        {value == null ? (
          <span class="vas-hint">toque em qualquer ponto da barra</span>
        ) : showPrev && prevLabel ? (
          <span class="vas-ghost-label" style={{ left: `clamp(48px, ${prev}%, calc(100% - 48px))` }}>
            {prevLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}

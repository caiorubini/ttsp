import { useRef, useState } from 'preact/hooks'

type Props = {
  value: number | null
  onChange: (v: number) => void
  onRelease?: (v: number) => void
  label: string
  p0: string
  p1: string
  prev?: number | null
  prevLabel?: string
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

// escala visual analógica em barra: começa vazia, tocar preenche até o ponto, arrastar ajusta.
// a marca do valor anterior só aparece depois que há uma resposta.
export function Vas({ value, onChange, onRelease, label, p0, p1, prev, prevLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const last = useRef<number | null>(value)
  const dragging = useRef(false)
  const [active, setActive] = useState(false)

  const pos = (ev: PointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    return clamp(((ev.clientX - r.left) / r.width) * 100)
  }
  const set = (v: number) => {
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

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

// escala visual analógica: começa vazia, tocar posiciona, arrastar ajusta.
// o anel do valor anterior só aparece depois que há uma resposta.
export function Vas({ value, onChange, onRelease, label, p0, p1, prev, prevLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const last = useRef<number | null>(value)
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
    if (!active) return
    setActive(false)
    if (last.current != null) onRelease?.(last.current)
  }

  return (
    <div>
      <div
        ref={ref}
        class={`vas${active ? ' is-active' : ''}`}
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
          setActive(true)
          set(pos(ev))
        }}
        onPointerMove={(ev) => {
          if (active) set(pos(ev))
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
        <div class="vas-track" />
        <div class="vas-mid" />
        {prev != null && value != null && !active && (
          <div class="vas-ghost" style={{ left: `${prev}%` }}>
            <i>{prevLabel}</i>
          </div>
        )}
        {value != null && <div class="vas-thumb" style={{ left: `${value}%` }} />}
      </div>
      <div class="vas-poles">
        <span>{p0}</span>
        <span>{p1}</span>
      </div>
      <div class="vas-hint" style={{ opacity: value == null ? 1 : 0 }}>
        toque em qualquer ponto da linha
      </div>
    </div>
  )
}

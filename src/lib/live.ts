import { liveQuery } from 'dexie'
import { useEffect, useState } from 'preact/hooks'

// assina uma consulta do banco e re-renderiza quando os dados mudam
export function useLive<T>(query: () => Promise<T>, deps: unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    const sub = liveQuery(query).subscribe({
      next: (v) => setValue(() => v),
      error: (e) => console.error(e),
    })
    return () => sub.unsubscribe()
  }, deps)
  return value
}

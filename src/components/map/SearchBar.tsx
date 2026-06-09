import { useRef, useState, type FormEvent } from 'react'
import { Search, Loader2, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { config } from '@/lib/config'

interface SearchResult {
  lat: string
  lon: string
  display_name: string
}

interface SearchBarProps {
  onSelectLocation: (lat: number, lng: number) => void
}

export function SearchBar({ onSelectLocation }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)

  const search = (q: string) => {
    if (q.length < 3) {
      setResults([])
      setOpen(false)
      return
    }

    setLoading(true)
    fetch(
      `${config.nominatim.url}/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=cl`
    )
      .then(res => res.json())
      .then((data: SearchResult[]) => {
        setResults(data)
        setOpen(data.length > 0)
      })
      .catch(() => {
        setResults([])
        setOpen(false)
      })
      .finally(() => setLoading(false))
  }

  const handleInput = (value: string) => {
    setQuery(value)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(value), 300)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (results.length > 0) {
      const r = results[0]
      onSelectLocation(parseFloat(r.lat), parseFloat(r.lon))
      setQuery(r.display_name.split(',')[0])
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleSelect = (r: SearchResult) => {
    onSelectLocation(parseFloat(r.lat), parseFloat(r.lon))
    setQuery(r.display_name.split(',')[0])
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="absolute top-14 left-4 right-4 z-[500]">
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar dirección..."
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          className="pl-9 h-10 bg-background/95 backdrop-blur-sm shadow-lg border-border"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </form>

      {open && results.length > 0 && (
        <div className="mt-1 bg-popover border rounded-xl shadow-xl overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => handleSelect(r)}
              className="flex items-start gap-2 w-full px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors cursor-pointer border-b last:border-b-0 border-border"
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="text-foreground line-clamp-2">{r.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

import { cn } from '@/lib/utils'
import type { Category } from '@/types'
import { CircleDot, Signpost, Lightbulb, TriangleAlert, Shield } from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  CircleDot, Signpost, Lightbulb, TriangleAlert, Shield,
}

interface CategorySelectorProps {
  categories: Category[]
  selected: string | null
  onSelect: (id: string) => void
}

export function CategorySelector({ categories, selected, onSelect }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {categories.map((cat) => {
        const Icon = iconMap[cat.icon] ?? CircleDot
        const isSelected = selected === cat.id
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl p-3 transition-all cursor-pointer',
              'border text-sm font-medium',
              isSelected
                ? 'shadow-lg scale-105 text-white'
                : 'border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            style={isSelected ? {
              borderColor: cat.color,
              backgroundColor: cat.color,
              boxShadow: `0 0 12px ${cat.color}60`,
            } : undefined}
          >
            <Icon className="h-6 w-6" style={{ color: isSelected ? 'white' : cat.color }} />
            <span className="text-[11px] leading-tight">{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}

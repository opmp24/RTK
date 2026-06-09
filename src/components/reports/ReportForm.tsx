import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { CategorySelector } from './CategorySelector'
import type { Category, ReportFormData } from '@/types'

interface ReportFormProps {
  categories: Category[]
  preselectedCategoryId?: string | null
  lat: number
  lng: number
  onSubmit: (data: ReportFormData) => Promise<void>
  onCancel: () => void
}

export function ReportForm({ categories, preselectedCategoryId, lat, lng, onSubmit, onCancel }: ReportFormProps) {
  const [categoryId, setCategoryId] = useState<string | null>(preselectedCategoryId ?? null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (e) => setPhotoPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId) return
    setSubmitting(true)
    try {
      await onSubmit({
        category_id: categoryId,
        lat,
        lng,
        description: description.trim() || undefined,
        photo,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium">Tipo de reporte</label>
        <CategorySelector
          categories={categories}
          selected={categoryId}
          onSelect={setCategoryId}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Descripción (opcional)</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe el problema..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Foto (opcional)</label>
        <Input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
        />
        {photoPreview && (
          <img src={photoPreview} alt="Preview" className="h-32 w-full object-cover rounded-lg" />
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={!categoryId || submitting} className="flex-1">
          {submitting ? 'Enviando...' : 'Reportar'}
        </Button>
      </div>
    </form>
  )
}

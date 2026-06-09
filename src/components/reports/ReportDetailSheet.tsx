import { useState, useRef } from 'react'
import { ThumbsUp, ThumbsDown, Camera, Save, Loader2, Trash2, CircleDot, Signpost, Lightbulb, TriangleAlert, Shield } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import type { Report, Category } from '@/types'

const iconMap: Record<string, React.ElementType> = {
  CircleDot, Signpost, Lightbulb, TriangleAlert, Shield,
}

interface ReportDetailSheetProps {
  report: Report | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (reportId: string, data: { description?: string; photo?: File | null; category_id?: string }) => Promise<void>
  onVote: (reportId: string, vote: 'up' | 'down') => Promise<void>
  onDelete: (reportId: string) => Promise<void>
  categories: Category[]
  userId: string | undefined
}

export function ReportDetailSheet({ report, open, onOpenChange, onSave, onVote, onDelete, categories, userId }: ReportDetailSheetProps) {
  const [description, setDescription] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const initializedRef = useRef(false)
  const reportIdRef = useRef<string | undefined>(undefined)

  if (open && report?.id !== reportIdRef.current) {
    reportIdRef.current = report?.id
    initializedRef.current = false
  }

  if (open && !initializedRef.current) {
    initializedRef.current = true
    setDescription(report?.description ?? '')
    setPhotoFile(null)
    setPhotoPreview(null)
    setSelectedCategoryId(report?.category_id ?? '')
    setConfirmDelete(false)
  }

  if (!open) {
    initializedRef.current = false
    reportIdRef.current = undefined
  }

  const voteCount = report?.vote_count ?? { up: 0, down: 0 }
  const userVote = report?.user_vote ?? null
  const isOwner = userId != null && report?.user_id === userId

  const categoryChanged = selectedCategoryId !== (report?.category_id ?? '')
  const descChanged = description !== (report?.description ?? '')
  const photoChanged = photoFile !== null
  const hasChanges = categoryChanged || descChanged || photoChanged

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!report) return
    setSaving(true)
    try {
      await onSave(report.id, {
        description: descChanged ? (description || undefined) : undefined,
        photo: photoChanged ? photoFile : undefined,
        category_id: categoryChanged ? selectedCategoryId : undefined,
      })
      toast.success('Reporte actualizado')
    } catch {
      toast.error('Error al guardar cambios')
    } finally {
      setSaving(false)
    }
  }

  const handleVote = (vote: 'up' | 'down') => {
    if (!report) return
    onVote(report.id, vote).catch(() => {
      toast.error('Error al votar')
    })
  }

  const handleDelete = async () => {
    if (!report) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    setDeleting(true)
    try {
      await onDelete(report.id)
      toast.success('Reporte eliminado')
      onOpenChange(false)
    } catch {
      toast.error('Error al eliminar reporte')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const existingPhoto = report?.photo_url

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] sm:h-auto sm:max-w-md sm:mx-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Detalle del reporte</SheetTitle>
        </SheetHeader>

        {report ? (
          <div className="flex flex-col gap-4 overflow-y-auto px-4 pb-6">
            {/* Category selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const Icon = iconMap[cat.icon] ?? CircleDot
                  const isSelected = selectedCategoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                        isSelected
                          ? 'text-white border-transparent'
                          : 'text-muted-foreground border-border hover:bg-accent'
                      }`}
                      style={isSelected ? { backgroundColor: cat.color } : undefined}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Coordinates */}
            <p className="text-xs text-muted-foreground">
              {report.lat.toFixed(6)}, {report.lng.toFixed(6)}
            </p>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Descripción</label>
              <Textarea
                placeholder="Describe el problema..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Photo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Foto</label>
              {(existingPhoto && !photoPreview) ? (
                <div className="relative">
                  <img
                    src={existingPhoto}
                    alt="Foto del reporte"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              ) : null}
              {photoPreview && (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Nueva foto"
                    className="w-full h-40 object-cover rounded-lg"
                  />
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-1.5" />
                {photoFile ? 'Cambiar foto' : existingPhoto ? 'Cambiar foto' : 'Tomar foto'}
              </Button>
            </div>

            {/* Vote buttons */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                variant={userVote === 'up' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVote('up')}
                className="flex-1"
              >
                <ThumbsUp className="h-4 w-4 mr-1.5" />
                {voteCount.up}
              </Button>
              <Button
                type="button"
                variant={userVote === 'down' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleVote('down')}
                className="flex-1"
              >
                <ThumbsDown className="h-4 w-4 mr-1.5" />
                {voteCount.down}
              </Button>
            </div>

            {/* Owner-only controls */}
            {isOwner && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                {hasChanges && (
                  <Button
                    type="button"
                    size="lg"
                    className="w-full"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-1.5" />
                    )}
                    Guardar cambios
                  </Button>
                )}

                <Button
                  type="button"
                  variant={confirmDelete ? 'destructive' : 'ghost'}
                  size="sm"
                  className="w-full"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1.5" />
                  )}
                  {confirmDelete ? '¿Confirmar eliminación?' : 'Eliminar reporte'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            Reporte no encontrado
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

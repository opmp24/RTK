import { useCallback, useEffect, useState } from 'react'
import { Toaster, toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useReports } from '@/hooks/useReports'
import { useCategories } from '@/hooks/useCategories'
import { MapView } from '@/components/map/MapView'
import { SearchBar } from '@/components/map/SearchBar'
import { ReportDetailSheet } from '@/components/reports/ReportDetailSheet'
import { LoginButton } from '@/components/auth/LoginButton'
import { UserMenu } from '@/components/auth/UserMenu'
import { Plus, MapPin, Check, Loader2, AlertCircle, CircleDot, Signpost, Lightbulb, TriangleAlert, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

const iconMap: Record<string, React.ElementType> = {
  CircleDot, Signpost, Lightbulb, TriangleAlert, Shield,
}

export function MapaPage() {
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { reports, loading: reportsLoading, error: reportsError, createReport, updateReport, voteOnReport, deleteReport } = useReports()
  const { categories, loading: categoriesLoading } = useCategories()

  const [step, setStep] = useState<'idle' | 'picking'>('idle')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [userCenter, setUserCenter] = useState<[number, number]>()

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-fab-menu]')) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler, true)
    return () => document.removeEventListener('mousedown', handler, true)
  }, [menuOpen])

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCenter([pos.coords.latitude, pos.coords.longitude])
        },
        () => {}
      )
    }
  }, [])

  const selectedReport = selectedReportId
    ? reports.find(r => r.id === selectedReportId) ?? null
    : null

  const exitPicking = useCallback(() => {
    setStep('idle')
    setSelectedCategoryId(null)
    setMenuOpen(false)
  }, [])

  const handleFabClick = useCallback(() => {
    if (step === 'picking') {
      exitPicking()
      return
    }
    setMenuOpen(prev => !prev)
  }, [step, exitPicking])

  const handleCategorySelect = useCallback((id: string) => {
    setSelectedCategoryId(id)
    setStep('picking')
    setMenuOpen(false)
  }, [])

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    if (step !== 'picking' || !selectedCategoryId) return
    try {
      await createReport({ category_id: selectedCategoryId, lat, lng })
      toast.success('Reporte enviado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al enviar reporte')
    }
  }, [step, selectedCategoryId, createReport])

  const handleReportClick = useCallback((reportId: string) => {
    setSelectedReportId(reportId)
  }, [])

  const handleVote = useCallback(async (reportId: string, vote: 'up' | 'down') => {
    await voteOnReport(reportId, vote)
  }, [voteOnReport])

  const handleUpdateReport = useCallback(async (reportId: string, data: { description?: string; photo?: File | null; category_id?: string }) => {
    await updateReport(reportId, data)
  }, [updateReport])

  const handleDeleteReport = useCallback(async (reportId: string) => {
    await deleteReport(reportId)
  }, [deleteReport])

  const handleSearchLocation = useCallback((lat: number, lng: number) => {
    setUserCenter([lat, lng])
  }, [])

  const isLoading = authLoading || reportsLoading || categoriesLoading

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-background">
      <Toaster position="top-center" richColors />

      <header className="absolute top-0 left-0 right-0 z-[1000] flex items-center justify-between px-4 py-2 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">RTK — Reporta Tu Ciudad</h1>
        </div>
        <div className="flex items-center gap-2">
          {authLoading ? null : user ? (
            <UserMenu user={user} onSignOut={signOut} />
          ) : (
            <LoginButton onClick={signInWithGoogle} />
          )}
        </div>
      </header>

      <div className="h-full w-full pt-12">
        <MapView
          reports={reports}
          categories={categories}
          onMapClick={handleMapClick}
          pickingLocation={step === 'picking'}
          userCenter={userCenter}
          onReportClick={handleReportClick}
        />

        <SearchBar onSelectLocation={handleSearchLocation} />

        {isLoading && (
          <div className="absolute inset-0 top-12 bg-background/60 flex items-center justify-center z-[500]">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Cargando...</span>
            </div>
          </div>
        )}

        {reportsError && (
          <div className="absolute bottom-24 left-4 right-4 z-[500] flex items-center gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg px-4 py-3 backdrop-blur-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Error al cargar reportes: {reportsError}</span>
          </div>
        )}

        {step === 'picking' && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] flex items-center gap-2 bg-background/90 px-4 py-2 rounded-full text-sm text-foreground shadow-lg backdrop-blur-sm border">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            Toca el mapa para reportar
          </div>
        )}
      </div>

      {user && (
        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-end gap-2" data-fab-menu>
          {menuOpen && categories.length > 0 && (
            <div className="bg-popover border rounded-2xl shadow-xl py-2 min-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="px-4 pb-2 pt-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ¿Qué deseas reportar?
              </div>
              {categories.map((cat) => {
                const Icon = iconMap[cat.icon] ?? CircleDot
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
                  >
                    <span
                      className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: cat.color }} />
                    </span>
                    <span className="font-medium">{cat.name}</span>
                  </button>
                )
              })}
            </div>
          )}

          {step === 'picking' ? (
            <Button size="lg" className="h-14 w-14 rounded-full shadow-xl" onClick={handleFabClick}>
              <Check className="h-6 w-6" />
            </Button>
          ) : (
            <Button size="lg" className="h-14 w-14 rounded-full shadow-xl" onClick={handleFabClick}>
              <Plus className="h-6 w-6" />
            </Button>
          )}
        </div>
      )}

      <ReportDetailSheet
        report={selectedReport}
        open={selectedReportId !== null}
        onOpenChange={(open) => { if (!open) setSelectedReportId(null) }}
        onSave={handleUpdateReport}
        onVote={handleVote}
        onDelete={handleDeleteReport}
        categories={categories}
        userId={user?.id}
      />
    </div>
  )
}

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import type { Report, Category } from '@/types'

interface ReportCardProps {
  report: Report
  category?: Category
}

export function ReportCard({ report, category }: ReportCardProps) {
  return (
    <div className="min-w-[200px] space-y-2">
      {category && (
        <Badge style={{ backgroundColor: category.color }} className="text-white">
          {category.name}
        </Badge>
      )}
      {report.photo_url && (
        <img
          src={report.photo_url}
          alt="Foto del reporte"
          className="w-full h-32 object-cover rounded-md"
        />
      )}
      {report.description && (
        <p className="text-sm text-muted-foreground">{report.description}</p>
      )}
      {report.address && (
        <p className="text-xs text-muted-foreground">{report.address}</p>
      )}
      <p className="text-xs text-muted-foreground">
        {format(new Date(report.created_at), "d MMM yyyy, HH:mm", { locale: es })}
      </p>
    </div>
  )
}

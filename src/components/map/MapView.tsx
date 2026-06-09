import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { Report, Category } from '@/types'
import { config } from '@/lib/config'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const iconPaths: Record<string, string> = {
  CircleDot: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
  Signpost: '<path d="M12 3v18"/><path d="M18.4 5.6a2 2 0 0 1 0 2.8l-3.2 3.2a2 2 0 0 1-2.8 0l-3.2-3.2a2 2 0 0 1 0-2.8l3.2-3.2a2 2 0 0 1 2.8 0Z"/><path d="M6 12h12"/><path d="M6 16h12"/>',
  Lightbulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>',
  TriangleAlert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  Shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
}

function categoryIcon(color: string, icon: string, photoUrl?: string | null) {
  const paths = iconPaths[icon] ?? iconPaths.CircleDot
  const inner = photoUrl
    ? `<img src="${photoUrl}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;" />`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 32px; height: 32px;
      background: ${photoUrl ? 'transparent' : color};
      border: 3px solid ${color};
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    ">${inner}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  })
}

interface MapViewProps {
  reports: Report[]
  categories: Category[]
  onMapClick?: (lat: number, lng: number) => void
  pickingLocation?: boolean
  userCenter?: [number, number]
  onReportClick?: (reportId: string) => void
}

function MapCenterUpdater({ center }: { center?: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo(center, map.getZoom(), { duration: 1.5 })
    }
  }, [map, center])
  return null
}

function MapController({ pickingLocation, onMapClick }: { pickingLocation?: boolean; onMapClick?: (lat: number, lng: number) => void }) {
  const map = useMap()

  useEffect(() => {
    if (!pickingLocation) return
    const handler = (e: L.LeafletMouseEvent) => {
      onMapClick?.(e.latlng.lat, e.latlng.lng)
    }
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [map, pickingLocation, onMapClick])

  return null
}

export function MapView({ reports, categories, onMapClick, pickingLocation, userCenter, onReportClick }: MapViewProps) {
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach(c => map.set(c.id, c))
    return map
  }, [categories])

  const cursorClass = pickingLocation ? 'cursor-crosshair' : ''

  return (
    <div className={`h-full w-full ${cursorClass}`}>
      <MapContainer
        center={[config.app.defaultLat, config.app.defaultLng]}
        zoom={config.app.defaultZoom}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapCenterUpdater center={userCenter} />
        <MapController pickingLocation={pickingLocation} onMapClick={onMapClick} />

        <MarkerClusterGroup chunkedLoading>
          {reports.map((report) => {
            const category = categoryMap.get(report.category_id)
            return (
              <Marker
                key={report.id}
                position={[report.lat, report.lng]}
                icon={categoryIcon(category?.color ?? '#6b7280', category?.icon ?? 'CircleDot', report.photo_url)}
                eventHandlers={{
                  click: () => onReportClick?.(report.id),
                }}
              />
            )
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  )
}

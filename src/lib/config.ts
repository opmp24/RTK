export const config = {
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  },
  app: {
    name: 'RTK — Reporta Tu Ciudad',
    description: 'Reporta problemas en tu ciudad: baches, señaléticas, luminarias, accidentes y más.',
    defaultLat: -33.4489,
    defaultLng: -70.6693,
    defaultZoom: 13,
  },
  storage: {
    bucket: 'report-photos',
    maxSizeMB: 5,
  },
  cooldown: {
    seconds: 10,
  },
  nominatim: {
    url: 'https://nominatim.openstreetmap.org',
  },
} as const

import { config } from './config'

describe('config', () => {
  it('has supabase credentials', () => {
    expect(config.supabase.url).toContain('supabase.co')
    expect(config.supabase.anonKey).toBeTruthy()
  })

  it('has app defaults', () => {
    expect(config.app.name).toContain('RTK')
    expect(config.app.defaultZoom).toBe(13)
    expect(config.app.defaultLat).toBe(-33.4489)
    expect(config.app.defaultLng).toBe(-70.6693)
  })

  it('has storage config', () => {
    expect(config.storage.bucket).toBe('report-photos')
    expect(config.storage.maxSizeMB).toBe(5)
  })
})

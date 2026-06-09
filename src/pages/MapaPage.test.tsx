import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MapaPage } from './MapaPage'
import { useAuth } from '@/hooks/useAuth'
import { useReports } from '@/hooks/useReports'
import type { Category, Report } from '@/types'

const mockCategories: Category[] = [
  { id: '1', name: 'Bache', slug: 'bache', icon: 'CircleDot', color: '#ef4444' },
  { id: '2', name: 'Señalética', slug: 'senialetica', icon: 'Signpost', color: '#f97316' },
  { id: '3', name: 'Luminaria', slug: 'luminaria', icon: 'Lightbulb', color: '#eab308' },
  { id: '4', name: 'Accidente', slug: 'accidente', icon: 'TriangleAlert', color: '#ef4444' },
  { id: '5', name: 'Robo', slug: 'robo', icon: 'Shield', color: '#8b5cf6' },
]

const mockReports: Report[] = [
  {
    id: 'report-1',
    user_id: 'user-1',
    category_id: '1',
    lat: -33.45,
    lng: -70.67,
    address: null,
    description: 'Un bache grande',
    photo_url: null,
    created_at: '2024-01-01T00:00:00Z',
    category: mockCategories[0],
    vote_count: { up: 3, down: 1 },
    user_vote: null,
  },
]

const createMockUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: { avatar_url: 'https://example.com/avatar.png' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
}) as import('@supabase/supabase-js').User

const defaultAuth = {
  user: createMockUser(),
  loading: false,
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}

const createReport = vi.fn()
const updateReport = vi.fn()
const voteOnReport = vi.fn()
const deleteReport = vi.fn()

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ ...defaultAuth })),
}))

vi.mock('@/hooks/useReports', () => ({
  useReports: vi.fn(() => ({
    reports: mockReports,
    loading: false,
    error: null,
    createReport,
    updateReport,
    voteOnReport,
    deleteReport,
  })),
}))

vi.mock('@/hooks/useCategories', () => ({
  useCategories: vi.fn(() => ({
    categories: mockCategories,
    loading: false,
    error: null,
  })),
}))

vi.mock('@/components/map/MapView', () => ({
  MapView: vi.fn(({ onMapClick, pickingLocation, onReportClick }: {
    onMapClick?: (lat: number, lng: number) => void
    pickingLocation?: boolean
    onReportClick?: (reportId: string) => void
  }) => (
    <div data-testid="map-view">
      {pickingLocation && (
        <button
          data-testid="simulate-map-click"
          onClick={() => onMapClick?.(-33.45, -70.67)}
        >
          Simulate Map Click
        </button>
      )}
      <button
        data-testid="simulate-report-click"
        onClick={() => onReportClick?.('report-1')}
      >
        Simulate Report Click
      </button>
    </div>
  )),
}))

vi.mock('@/components/map/SearchBar', () => ({
  SearchBar: vi.fn(({ onSelectLocation }: {
    onSelectLocation?: (lat: number, lng: number) => void
  }) => (
    <div data-testid="search-bar">
      <button
        data-testid="simulate-search"
        onClick={() => onSelectLocation?.(-33.45, -70.67)}
      >
        Simulate Search
      </button>
    </div>
  )),
}))

vi.mock('@/components/reports/ReportDetailSheet', () => ({
  ReportDetailSheet: vi.fn(({ open, onOpenChange, report, onVote, onDelete }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    report: Report | null
    onVote: (reportId: string, vote: 'up' | 'down') => Promise<void>
    onDelete?: (reportId: string) => Promise<void>
  }) => {
    if (!open) return null
    return (
      <div data-testid="report-detail">
        <span data-testid="report-id">{report?.id}</span>
        <button
          data-testid="simulate-vote-up"
          onClick={() => onVote?.('report-1', 'up')}
        >
          Vote Up
        </button>
        <button
          data-testid="simulate-delete"
          onClick={() => onDelete?.('report-1')}
        >
          Delete
        </button>
        <button
          data-testid="simulate-close"
          onClick={() => onOpenChange(false)}
        >
          Close
        </button>
      </div>
    )
  }),
}))

const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) =>
    success({ coords: { latitude: -33.45, longitude: -70.67 } })
  ),
}
Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

function getFab() {
  const buttons = screen.getAllByRole('button')
  return buttons.find(b => b.closest('[data-fab-menu]') && b.tagName === 'BUTTON')
}

describe('MapaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ ...defaultAuth })
    vi.mocked(useReports).mockReturnValue({
      reports: mockReports,
      loading: false,
      error: null,
      createReport,
      updateReport,
      voteOnReport,
      deleteReport,
    })
  })

  it('renders the header with app title', () => {
    render(<MapaPage />)
    expect(screen.getByText('RTK — Reporta Tu Ciudad')).toBeInTheDocument()
  })

  it('shows the FAB button when user is logged in', () => {
    render(<MapaPage />)
    expect(getFab()).toBeInTheDocument()
  })

  it('opens category flyout when FAB is clicked', async () => {
    render(<MapaPage />)
    await userEvent.click(getFab()!)
    expect(screen.getByText('¿Qué deseas reportar?')).toBeInTheDocument()
    expect(screen.getByText('Bache')).toBeInTheDocument()
  })

  it('toggles flyout on repeated FAB clicks', async () => {
    render(<MapaPage />)
    await userEvent.click(getFab()!)
    expect(screen.getByText('¿Qué deseas reportar?')).toBeInTheDocument()
    await userEvent.click(getFab()!)
    expect(screen.queryByText('¿Qué deseas reportar?')).not.toBeInTheDocument()
  })

  it('enters picking mode when a category is selected', async () => {
    render(<MapaPage />)
    await userEvent.click(getFab()!)
    await userEvent.click(screen.getByText('Bache'))
    expect(screen.getByText('Toca el mapa para reportar')).toBeInTheDocument()
  })

  it('creates report immediately on map click in picking mode', async () => {
    render(<MapaPage />)
    await userEvent.click(getFab()!)
    await userEvent.click(screen.getByText('Bache'))
    await userEvent.click(screen.getByTestId('simulate-map-click'))

    expect(createReport).toHaveBeenCalledWith({
      category_id: '1',
      lat: -33.45,
      lng: -70.67,
    })
  })

  it('opens report detail sheet when marker is clicked', async () => {
    render(<MapaPage />)
    await userEvent.click(screen.getByTestId('simulate-report-click'))
    expect(screen.getByTestId('report-detail')).toBeInTheDocument()
    expect(screen.getByTestId('report-id')).toHaveTextContent('report-1')
  })

  it('closes detail sheet when close is clicked', async () => {
    render(<MapaPage />)
    await userEvent.click(screen.getByTestId('simulate-report-click'))
    expect(screen.getByTestId('report-detail')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('simulate-close'))
    expect(screen.queryByTestId('report-detail')).not.toBeInTheDocument()
  })

  it('calls voteOnReport when vote button is clicked in detail sheet', async () => {
    render(<MapaPage />)
    await userEvent.click(screen.getByTestId('simulate-report-click'))
    await userEvent.click(screen.getByTestId('simulate-vote-up'))
    expect(voteOnReport).toHaveBeenCalledWith('report-1', 'up')
  })

  it('shows loading overlay when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      ...defaultAuth,
      user: null,
      loading: true,
    })
    render(<MapaPage />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('calls deleteReport when delete button is clicked in detail sheet', async () => {
    render(<MapaPage />)
    await userEvent.click(screen.getByTestId('simulate-report-click'))
    expect(screen.getByTestId('report-detail')).toBeInTheDocument()
    await userEvent.click(screen.getByTestId('simulate-delete'))
    expect(deleteReport).toHaveBeenCalledWith('report-1')
  })

  it('calls geolocation on mount', () => {
    render(<MapaPage />)
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
  })

  it('searches location via SearchBar', async () => {
    render(<MapaPage />)
    await userEvent.click(screen.getByTestId('simulate-search'))
  })

  it('renders SearchBar component', () => {
    render(<MapaPage />)
    expect(screen.getByTestId('search-bar')).toBeInTheDocument()
  })
})

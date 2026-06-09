import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReportForm } from './ReportForm'
import type { Category } from '@/types'

const mockCategories: Category[] = [
  { id: '1', name: 'Bache', slug: 'bache', icon: 'CircleDot', color: '#ef4444' },
  { id: '2', name: 'Señalética', slug: 'senialetica', icon: 'Signpost', color: '#f97316' },
]

function renderForm(props: Partial<Parameters<typeof ReportForm>[0]> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  const utils = render(
    <ReportForm
      categories={mockCategories}
      preselectedCategoryId={null}
      lat={-33.4489}
      lng={-70.6693}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />
  )
  return { ...utils, onSubmit, onCancel }
}

describe('ReportForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders category selector, description, photo, and buttons', () => {
    renderForm()
    expect(screen.getByText('Tipo de reporte')).toBeInTheDocument()
    expect(screen.getByText('Descripción (opcional)')).toBeInTheDocument()
    expect(screen.getByText('Foto (opcional)')).toBeInTheDocument()
    expect(screen.getByText('Bache')).toBeInTheDocument()
    expect(screen.getByText('Señalética')).toBeInTheDocument()
  })

  it('disables submit when no category selected', () => {
    renderForm()
    expect(screen.getByText('Reportar')).toBeDisabled()
  })

  it('enables submit when category is selected', async () => {
    renderForm()
    await userEvent.click(screen.getByText('Bache'))
    expect(screen.getByText('Reportar')).toBeEnabled()
  })

  it('uses preselected category', () => {
    renderForm({ preselectedCategoryId: '2' })
    expect(screen.getByText('Reportar')).toBeEnabled()
  })

  it('calls onSubmit with form data', async () => {
    const { onSubmit } = renderForm()
    await userEvent.click(screen.getByText('Bache'))
    await userEvent.click(screen.getByText('Reportar'))
    expect(onSubmit).toHaveBeenCalledWith({
      category_id: '1',
      lat: -33.4489,
      lng: -70.6693,
      description: undefined,
      photo: null,
    })
  })

  it('calls onCancel when cancel is clicked', async () => {
    const { onCancel } = renderForm()
    await userEvent.click(screen.getByText('Cancelar'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('shows uploading state while submitting', async () => {
    const onSubmit = vi.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )
    renderForm({ onSubmit })
    await userEvent.click(screen.getByText('Bache'))
    await userEvent.click(screen.getByText('Reportar'))
    expect(screen.getByText('Enviando...')).toBeInTheDocument()
  })
})

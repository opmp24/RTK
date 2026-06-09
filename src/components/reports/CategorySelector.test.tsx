import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelector } from './CategorySelector'
import type { Category } from '@/types'

const mockCategories: Category[] = [
  { id: '1', name: 'Bache', slug: 'bache', icon: 'CircleDot', color: '#ef4444' },
  { id: '2', name: 'Señalética', slug: 'senialetica', icon: 'Signpost', color: '#f97316' },
  { id: '3', name: 'Luminaria', slug: 'luminaria', icon: 'Lightbulb', color: '#eab308' },
  { id: '4', name: 'Accidente', slug: 'accidente', icon: 'TriangleAlert', color: '#ef4444' },
  { id: '5', name: 'Robo', slug: 'robo', icon: 'Shield', color: '#8b5cf6' },
]

describe('CategorySelector', () => {
  it('renders all categories', () => {
    render(<CategorySelector categories={mockCategories} selected={null} onSelect={() => {}} />)
    mockCategories.forEach(cat => {
      expect(screen.getByText(cat.name)).toBeInTheDocument()
    })
  })

  it('shows 5 category buttons', () => {
    render(<CategorySelector categories={mockCategories} selected={null} onSelect={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
  })

  it('calls onSelect with category id when clicked', async () => {
    const onSelect = vi.fn()
    render(<CategorySelector categories={mockCategories} selected={null} onSelect={onSelect} />)
    await userEvent.click(screen.getByText('Bache'))
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('highlights selected category', () => {
    const { container } = render(
      <CategorySelector categories={mockCategories} selected="3" onSelect={() => {}} />
    )
    const buttons = container.querySelectorAll('button')
    const selectedButton = buttons[2]
    expect(selectedButton.style.backgroundColor).toBe('rgb(234, 179, 8)')
  })

  it('renders with empty categories', () => {
    const { container } = render(<CategorySelector categories={[]} selected={null} onSelect={() => {}} />)
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })
})

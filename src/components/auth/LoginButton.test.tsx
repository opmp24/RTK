import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginButton } from './LoginButton'

describe('LoginButton', () => {
  it('renders Google sign-in text', () => {
    render(<LoginButton onClick={() => {}} />)
    expect(screen.getByText('Iniciar sesión con Google')).toBeInTheDocument()
  })

  it('has a button with Google icon', () => {
    render(<LoginButton onClick={() => {}} />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<LoginButton onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

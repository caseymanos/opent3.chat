import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple test to verify test infrastructure works
describe('FileUpload Component - Simple Test', () => {
  it('renders a basic component without errors', () => {
    const TestComponent = () => <div data-testid="test">File Upload Test</div>
    
    render(<TestComponent />)
    
    expect(screen.getByTestId('test')).toBeInTheDocument()
    expect(screen.getByText('File Upload Test')).toBeInTheDocument()
  })

  it('can perform basic Jest assertions', () => {
    expect(true).toBe(true)
    expect('hello').toContain('ell')
    expect([1, 2, 3]).toHaveLength(3)
  })

  it('can mock functions', () => {
    const mockFn = jest.fn()
    mockFn('test')
    
    expect(mockFn).toHaveBeenCalledWith('test')
    expect(mockFn).toHaveBeenCalledTimes(1)
  })
})
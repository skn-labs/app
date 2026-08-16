/** @vitest-environment jsdom */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StaticProductImage } from './ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('StaticProductImage', () => {
  it('keeps ordinary product images as images', () => {
    const { container } = render(<StaticProductImage src="https://example.com/product.png" alt="제품"/>)

    expect(container.querySelector('img')).not.toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('replaces an animated GIF with a frozen canvas frame', () => {
    const drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D)
    const { container } = render(<StaticProductImage src="https://example.com/product.GIF?size=large" alt="제품"/>)
    const image = container.querySelector('img')!
    Object.defineProperties(image, {
      naturalWidth: { value: 1080 },
      naturalHeight: { value: 1296 },
    })

    fireEvent.load(image)

    const canvas = container.querySelector('canvas')!
    expect(image.classList).toContain('hidden')
    expect(canvas.classList).not.toContain('hidden')
    expect(canvas.getAttribute('aria-label')).toBe('제품')
    expect(drawImage).toHaveBeenCalledOnce()
  })
})

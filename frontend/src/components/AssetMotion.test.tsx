/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssetMotion } from './ui'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AssetMotion', () => {
  it('retries a transient autoplay failure instead of removing the video', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))
      .mockResolvedValue(undefined)
    const onEnded = vi.fn()
    const { container } = render(<AssetMotion name="check-motion" poster="/skn-assets/check-motion.png" onEnded={onEnded}/>)
    const video = container.querySelector('video')!

    fireEvent.canPlay(video)
    await waitFor(() => expect(play).toHaveBeenCalledTimes(1))
    expect(container.querySelector('video')).toBe(video)
    expect(onEnded).not.toHaveBeenCalled()

    fireEvent.canPlay(video)
    fireEvent.playing(video)
    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(video.classList).toContain('opacity-100')
  })

  it('uses the poster and completes once when no video source can load', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const onEnded = vi.fn()
    const { container } = render(<AssetMotion name="missing-motion" poster="/fallback.png" onEnded={onEnded}/>)

    fireEvent.error(container.querySelector('video')!)

    await waitFor(() => expect(onEnded).toHaveBeenCalledOnce())
    expect(container.querySelector('video')).toBeNull()
    expect(container.querySelector('img')?.getAttribute('src')).toBe('/fallback.png')
  })
})

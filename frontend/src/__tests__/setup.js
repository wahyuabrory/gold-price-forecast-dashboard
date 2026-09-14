import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'


afterEach(() => {
  cleanup()
})

global.fetch = vi.fn()

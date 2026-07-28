'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

const emptySubscribe = () => () => {}

interface ThemeToggleProps {
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function ThemeToggle({ className, size = 'icon' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)

  const handleToggle = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    // Also directly set the class for immediate visual feedback
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    root.style.colorScheme = newTheme
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size={size} className={cn("h-8 w-8", className)} disabled>
        <Sun className="h-4 w-4" />
        <span className="sr-only">Toggle tema</span>
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn("h-8 w-8", className)}
      onClick={handleToggle}
      title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle tema</span>
    </Button>
  )
}
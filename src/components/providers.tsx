'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { QueryProvider } from '@/components/query-provider'
import { Toaster } from '@/components/ui/toaster'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        {children}
        <Toaster />
      </QueryProvider>
    </NextThemesProvider>
  )
}

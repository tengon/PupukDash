'use client'

import React, { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { motion } from 'framer-motion'
import { Leaf, Lock, User, ShieldCheck, Sparkles, ArrowRight, Eye, EyeOff, Building2, CheckCircle2 } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const ROLES = [
  { id: 'admin', title: 'Admin Distributor', desc: 'Akses Penuh Pengelolaan Alokasi & Kuota' },
  { id: 'gudang', title: 'Petugas Gudang', desc: 'Monitoring Stok & Pencatatan Pasokan' },
  { id: 'kios', title: 'Kios PPTS', desc: 'Pencatatan Penebusan Pupuk Petani' },
]

export function LoginView() {
  const { login } = useAppStore()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('password123')
  const [selectedRole, setSelectedRole] = useState('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Username dan Password wajib diisi!')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Gagal memverifikasi login')
        setIsLoading(false)
        return
      }

      login({
        username: data.user.name,
        role: data.user.role,
      })
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan/server')
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickDemo = (roleId: string, defaultName: string) => {
    setSelectedRole(roleId)
    setUsername(defaultName)
    setPassword('demo1234')
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-background text-foreground p-4">
      {/* Background Aesthetic Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-background to-primary/5 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse-gentle" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-700/15 rounded-full blur-3xl pointer-events-none animate-pulse-gentle" />

      {/* Top Bar for Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md z-10 space-y-4"
      >
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-40 w-40 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-lg shadow-emerald-500/10 mb-1 p-1.5 overflow-hidden">
            <img src="/images/sipupuk-icon.png" alt="SiPUPUK" className="h-full w-full object-contain" />
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground font-medium flex items-center justify-center gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Sistem Informasi Alokasi Pupuk Bersubsidi
          </p>
        </div>

        {/* Login Card */}
        <Card className="glass shadow-xl border-border/60 overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
          <CardHeader className="pb-3 space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Masuk ke Sistem</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <ShieldCheck className="h-3 w-3 mr-1" /> Terenkripsi
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Silakan masukkan kredensial akun distributor resmi Anda.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3.5">

              {/* Role Selection Tabs */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Pilih Role Akses</Label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-xl text-xs">
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all truncate flex items-center justify-center gap-1 ${selectedRole === r.id
                        ? 'bg-background text-emerald-700 dark:text-emerald-300 shadow-xs border border-border/50'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {selectedRole === r.id && <CheckCircle2 className="h-3 w-3 shrink-0" />}
                      {r.title.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username Input */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-semibold">Username / Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Masukkan username..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-9 text-xs h-9"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
                  <span className="text-[10px] text-muted-foreground cursor-pointer hover:underline">Lupa Password?</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 text-xs h-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs shadow-md shadow-emerald-600/20"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Memverifikasi...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Masuk ke Portal SiPUPUK <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          </CardContent>

          {/* Quick Demo Credentials Footer */}
          <CardFooter className="flex flex-col gap-2 pt-2 border-t border-border/40 bg-muted/20 text-center">
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center justify-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" /> Uji Coba Cepat (Quick Demo Logins)
            </span>
            <div className="flex flex-wrap gap-1.5 justify-center w-full">
              <Badge
                variant="outline"
                className="cursor-pointer text-[10px] hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors"
                onClick={() => handleQuickDemo('admin', 'Budi Santoso')}
              >
                👤 Admin
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer text-[10px] hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors"
                onClick={() => handleQuickDemo('gudang', 'Rudi Gudang')}
              >
                📦 Petugas Gudang
              </Badge>
              <Badge
                variant="outline"
                className="cursor-pointer text-[10px] hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors"
                onClick={() => handleQuickDemo('kios', 'Kios Pringapus')}
              >
                🏪 Kios PPTS
              </Badge>
            </div>
          </CardFooter>
        </Card>

        {/* Footer Note */}
        <p className="text-[11px] text-center text-muted-foreground font-mono">
          &copy; {new Date().getFullYear()} SiPUPUK — Distributor Resmi Pupuk Indonesia
        </p>
      </motion.div>
    </div>
  )
}

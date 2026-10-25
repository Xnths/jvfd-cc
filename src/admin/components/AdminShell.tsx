'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
    ExternalLink,
    FileText,
    Image as ImageIcon,
    LayoutDashboard,
    LogOut,
    Mail,
    Menu,
    MessageSquare,
    MousePointerClick,
    Phone,
    X,
} from 'lucide-react'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { AdminGA4 } from './AdminGA4'

type Me = { id: string; email: string; role: string }

const NAV = [
    { href: '/admin', label: 'Painel', icon: LayoutDashboard, exact: true },
    { href: '/admin/posts', label: 'Posts', icon: FileText },
    { href: '/admin/leads', label: 'Leads', icon: MousePointerClick },
    { href: '/admin/comentarios', label: 'Comentários', icon: MessageSquare },
    { href: '/admin/assinantes', label: 'Assinantes', icon: Mail },
    { href: '/admin/contatos', label: 'Contatos', icon: Phone, clinicalOnly: true },
    { href: '/admin/midia', label: 'Mídia', icon: ImageIcon },
]

export function AdminShell({ me, children }: { me: Me; children: React.ReactNode }) {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const items = NAV.filter((i) => !i.clinicalOnly || me.role === 'clinical')

    async function logout() {
        await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
        window.location.href = '/'
    }

    const nav = (
        <nav className="flex flex-1 flex-col gap-1 p-3">
            {items.map(({ href, label, icon: Icon, exact }) => {
                const active = exact ? pathname === href : pathname.startsWith(href)
                return (
                    <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            active
                                ? 'bg-primary text-primary-foreground'
                                : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <Icon className="h-4 w-4" aria-hidden />
                        {label}
                    </Link>
                )
            })}
            <div className="mt-auto space-y-1 border-t pt-3 text-xs">
                <Link href="/" target="_blank" className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Ver o site
                </Link>
                <a href="/edit/enter?return=/" className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground hover:text-foreground">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Editar o site
                </a>
            </div>
        </nav>
    )

    return (
        <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
            <AdminGA4 />
            <aside className="hidden border-r bg-card md:sticky md:top-0 md:flex md:h-screen md:flex-col">
                <div className="border-b px-5 py-4">
                    <p className="font-serif text-lg leading-tight">Administração</p>
                    <p className="text-xs text-muted-foreground">psicologojoaofernandes.com</p>
                </div>
                {nav}
            </aside>

            {open && (
                <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
                    <button className="absolute inset-0 bg-black/40" aria-label="Fechar menu" onClick={() => setOpen(false)} />
                    <aside className="relative flex h-full w-64 flex-col bg-card shadow-xl">
                        <div className="flex items-center justify-between border-b px-5 py-4">
                            <p className="font-serif text-lg">Administração</p>
                            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        {nav}
                    </aside>
                </div>
            )}

            <div className="flex min-w-0 flex-col">
                <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
                    <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="ml-auto flex items-center gap-3 text-sm">
                        <span className="hidden text-muted-foreground sm:inline">{me.email}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {me.role === 'clinical' ? 'Clínico' : 'Técnico'}
                        </span>
                        <button onClick={logout} className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted">
                            <LogOut className="h-4 w-4" aria-hidden /> Sair
                        </button>
                    </div>
                </header>
                <main id="main-content" className="flex-1 p-4 md:p-6">{children}</main>
            </div>
            <Toaster richColors position="top-right" />
        </div>
    )
}

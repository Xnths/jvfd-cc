import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/admin/components/AdminShell'
import { getAdmin } from '@/admin/lib/server'
import '../../(website)/globals.css'

const inter = localFont({
    src: '../../../assets/fonts/Inter-Variable.woff2',
    weight: '100 900',
    display: 'swap',
    variable: '--font-inter',
})

const fraunces = localFont({
    src: '../../../assets/fonts/Fraunces-Variable.woff2',
    weight: '100 900',
    display: 'swap',
    variable: '--font-fraunces',
})

export const metadata: Metadata = {
    title: { default: 'Administração', template: '%s | Administração' },
    robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const me = await getAdmin()
    if (me === 'anonymous') redirect('/auth/refresh?return=/admin')

    return (
        <html lang="pt-BR" className={`${inter.variable} ${fraunces.variable}`}>
            <body className={`${inter.className} antialiased bg-background text-foreground`}>
                {me === 'unavailable' ? (
                    <main className="mx-auto max-w-md p-8 text-center">
                        <h1 className="text-xl font-semibold">Servidor indisponível</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Não foi possível falar com a API de administração. Tente novamente em instantes.
                        </p>
                    </main>
                ) : (
                    <AdminShell me={me}>{children}</AdminShell>
                )}
            </body>
        </html>
    )
}

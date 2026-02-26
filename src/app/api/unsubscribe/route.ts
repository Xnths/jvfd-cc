import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url)
    const encoded = searchParams.get('email')

    if (!encoded) {
        return new NextResponse(unsubscribePage('Parâmetro inválido.'), {
            status: 400,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
    }

    let email: string
    try {
        email = Buffer.from(encoded, 'base64').toString('utf-8')
    } catch {
        return new NextResponse(unsubscribePage('Link inválido.'), {
            status: 400,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
    }

    try {
        const payload = await getPayload({ config: configPromise })

        await payload.update({
            collection: 'subscribers',
            where: { email: { equals: email } },
            data: { active: false },
        })

        return new NextResponse(
            unsubscribePage('Você foi removido da lista. Não receberá mais novidades do blog.'),
            { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    } catch (err) {
        console.error('[unsubscribe] Error:', err)
        return new NextResponse(
            unsubscribePage('Ocorreu um erro. Por favor, tente novamente.'),
            { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    }
}

function unsubscribePage(message: string): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Cancelar inscrição | João Fernandes</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: #fff; border-radius: 12px; padding: 40px 48px; max-width: 420px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.06); }
    h1 { font-size: 20px; color: #0f172a; margin: 0 0 12px; }
    p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    a { color: #16a34a; font-weight: 600; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>João Fernandes · Psicólogo</h1>
    <p>${message}</p>
    <a href="https://psicologojoaofernandes.com">Voltar ao site</a>
  </div>
</body>
</html>`
}

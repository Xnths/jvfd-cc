import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { format } from 'date-fns'
import type { Where } from 'payload'

const CSV_HEADER = 'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency'
const CURRENCY = 'BRL'

// Action configs
const ACTIONS = {
    consulta: {
        conversionName: 'Consulta Marcada',
        value: '350',
        statusFilter: { status: { equals: 'converted' } } as Where,
        dateField: 'convertedAt' as const,
        emptyError: 'Nenhuma "Consulta Marcada" encontrada. Atualize o status dos leads antes de exportar.',
    },
    contato: {
        conversionName: 'Contato WhatsApp',
        value: '0',
        statusFilter: { status: { equals: 'qualified' } } as Where,
        dateField: 'clickedAt' as const,
        emptyError: 'Nenhum "Lead Qualificado" encontrado. Marque leads como qualificados (mandou mensagem) antes de exportar.',
    },
} as const

function toGoogleAdsTime(date: Date): string {
    const y = date.getUTCFullYear()
    const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
    const d = String(date.getUTCDate()).padStart(2, '0')
    const h = String(date.getUTCHours()).padStart(2, '0')
    const mi = String(date.getUTCMinutes()).padStart(2, '0')
    const s = String(date.getUTCSeconds()).padStart(2, '0')
    return `${y}-${mo}-${d} ${h}:${mi}:${s}+0000`
}

export async function GET(req: NextRequest) {
    try {
        const payload = await getPayload({ config: configPromise })

        // Admin-only
        const { user } = await payload.auth({ headers: req.headers })
        if (!user || (user as unknown as { collection: string }).collection !== 'users') {
            return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const actionParam = (searchParams.get('action') ?? 'consulta') as keyof typeof ACTIONS
        const sinceParam = searchParams.get('since')

        const action = ACTIONS[actionParam] ?? ACTIONS.consulta

        const andConditions: Where[] = [action.statusFilter]

        if (sinceParam) {
            const since = new Date(sinceParam)
            if (!isNaN(since.getTime())) {
                andConditions.push({
                    [action.dateField]: { greater_than_equal: since.toISOString() },
                })
            }
        }

        const { docs } = await payload.find({
            collection: 'leads',
            where: { and: andConditions },
            limit: 10000,
            pagination: false,
        })

        const rows = docs.map((lead) => {
            const dateValue = lead[action.dateField]
            const conversionTime = dateValue
                ? toGoogleAdsTime(new Date(dateValue as string))
                : ''
            return [lead.gclid, action.conversionName, conversionTime, action.value, CURRENCY].join(',')
        })

        if (rows.length === 0) {
            return NextResponse.json({ error: action.emptyError }, { status: 400 })
        }

        const csv = [CSV_HEADER, ...rows].join('\n') + '\n'
        const filename = `conversoes-${actionParam}-${format(new Date(), 'yyyy-MM-dd')}.csv`

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        })
    } catch (err) {
        console.error('[leads export] Error:', err)
        return NextResponse.json({ error: 'Erro ao exportar.' }, { status: 500 })
    }
}

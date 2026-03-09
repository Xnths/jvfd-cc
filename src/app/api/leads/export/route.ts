import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { format } from 'date-fns'
import type { Where } from 'payload'

const CSV_HEADER = 'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency'
const CURRENCY = 'BRL'

// Action configs — drive the GA conversion metadata
const ACTIONS = {
    consulta: {
        conversionName: 'Consulta Marcada',
        value: '350',
        defaultStatus: 'converted',
        defaultDateField: 'convertedAt' as const,
        emptyError: 'Nenhuma "Consulta Marcada" encontrada com os filtros aplicados.',
    },
    contato: {
        conversionName: 'Contato WhatsApp',
        value: '0',
        defaultStatus: 'qualified',
        defaultDateField: 'clickedAt' as const,
        emptyError: 'Nenhum "Lead Qualificado" encontrado com os filtros aplicados.',
    },
} as const

type DateField = 'convertedAt' | 'clickedAt'

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
        const action = ACTIONS[actionParam] ?? ACTIONS.consulta

        // Optional overrides for status and date range from the filter panel
        const statusParam = searchParams.get('status') // 'all' | 'clicked' | 'qualified' | 'converted' | null
        const fromParam = searchParams.get('from')
        const untilParam = searchParams.get('until')

        const andConditions: Where[] = []

        // Status filter — use override if set, otherwise use action's default
        if (statusParam && statusParam !== 'all') {
            andConditions.push({ status: { equals: statusParam } })
        } else if (!statusParam) {
            andConditions.push({ status: { equals: action.defaultStatus } })
        }
        // if statusParam === 'all' → no status filter, download everything

        // Determine which date field to filter/show in CSV
        // consulta → convertedAt, contato → clickedAt
        const dateField: DateField = action.defaultDateField

        if (fromParam) {
            const from = new Date(fromParam)
            if (!isNaN(from.getTime())) {
                andConditions.push({ [dateField]: { greater_than_equal: from.toISOString() } })
            }
        }

        if (untilParam) {
            const until = new Date(untilParam)
            if (!isNaN(until.getTime())) {
                // end of the day
                until.setUTCHours(23, 59, 59, 999)
                andConditions.push({ [dateField]: { less_than_equal: until.toISOString() } })
            }
        }

        const where: Where = andConditions.length > 0 ? { and: andConditions } : {}

        const { docs } = await payload.find({
            collection: 'leads',
            where,
            limit: 10000,
            pagination: false,
        })

        const rows = docs.map((lead) => {
            const dateValue = lead[dateField]
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

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

// Simple in-memory rate limiter (IP → [timestamps])
const rateLimitMap = new Map<string, number[]>()
const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 10

function isRateLimited(ip: string): boolean {
    const now = Date.now()
    const timestamps = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
    timestamps.push(now)
    rateLimitMap.set(ip, timestamps)
    return timestamps.length > MAX_REQUESTS
}

// GCLIDs are standard base64 — allow +, /, = in addition to base64url chars (-, _)
const GCLID_PATTERN = /^[A-Za-z0-9+/=_-]+$/

export async function POST(req: NextRequest) {
    try {
        const ip =
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
            req.headers.get('x-real-ip') ??
            'unknown'

        if (isRateLimited(ip)) {
            return NextResponse.json({ ok: false }, { status: 429 })
        }

        const { gclid } = await req.json()

        if (!gclid || typeof gclid !== 'string' || !GCLID_PATTERN.test(gclid)) {
            return NextResponse.json({ ok: false }, { status: 400 })
        }

        const payload = await getPayload({ config: configPromise })

        // Deduplicate — silently succeed if already stored
        const existing = await payload.find({
            collection: 'leads',
            where: { gclid: { equals: gclid } },
            limit: 1,
            pagination: false,
        })

        if (existing.totalDocs > 0) {
            return NextResponse.json({ ok: true }, { status: 200 })
        }

        await payload.create({
            collection: 'leads',
            data: {
                gclid,
                clickedAt: new Date().toISOString(),
                status: 'clicked',
            },
        })

        return NextResponse.json({ ok: true }, { status: 201 })
    } catch (err) {
        console.error('[leads POST] Error:', err)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}

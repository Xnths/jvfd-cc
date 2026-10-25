// Usage (from the repo root, with DATABASE_URI and PAYLOAD_SECRET set):
//   npx payload run scripts/update-treatments.ts            # dry run: shows what would change
//   npx payload run scripts/update-treatments.ts --apply    # writes a backup, then updates
//
// Only updates treatments that already exist (matched by slug). Never creates
// or deletes anything. The backup is written before any change.

import fs from 'node:fs'
import path from 'node:path'
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { treatments } from './content/treatments'

const apply = process.argv.includes('--apply')

const text = (value: string) => ({
    type: 'text', text: value, format: 0, detail: 0, mode: 'normal', style: '', version: 1,
})

// **bold** segments become bold text nodes.
function inline(line: string) {
    return line
        .split(/(\*\*[^*]+\*\*)/g)
        .filter(Boolean)
        .map((part) =>
            part.startsWith('**') ? { ...text(part.slice(2, -2)), format: 1 } : text(part),
        )
}

const block = { direction: 'ltr', format: '', indent: 0, version: 1 }

function toLexical(body: string) {
    const children: object[] = []
    for (const chunk of body.trim().split(/\n\s*\n/)) {
        const lines = chunk.split('\n')
        if (lines[0].startsWith('## ')) {
            children.push({ type: 'heading', tag: 'h2', children: inline(lines[0].slice(3)), ...block })
        } else if (lines.every((l) => l.startsWith('- '))) {
            children.push({
                type: 'list', listType: 'bullet', start: 1, tag: 'ul',
                children: lines.map((l, i) => ({
                    type: 'listitem', value: i + 1, children: inline(l.slice(2)), ...block,
                })),
                ...block,
            })
        } else {
            children.push({ type: 'paragraph', textFormat: 0, children: inline(lines.join(' ')), ...block })
        }
    }
    return { root: { type: 'root', children, ...block } }
}

async function main() {
    const payload = await getPayload({ config })
    const existing = await payload.find({ collection: 'treatments', limit: 100, pagination: false })

    const backupDir = path.resolve('backups')
    const backupFile = path.join(backupDir, `treatments-${new Date().toISOString().slice(0, 10)}.json`)

    console.log(`Found ${existing.docs.length} treatments in the database.`)
    for (const t of treatments) {
        const doc = existing.docs.find((d) => d.slug === t.slug)
        if (!doc) {
            console.log(`  skip  ${t.slug} (not in the database)`)
            continue
        }
        console.log(`  ${apply ? 'update' : 'would update'}  ${t.slug}: "${doc.title}" -> "${t.title}"`)
    }
    const missingFromScript = existing.docs.filter((d) => !treatments.some((t) => t.slug === d.slug))
    for (const d of missingFromScript) console.log(`  leave ${d.slug} (no new copy provided)`)

    if (!apply) {
        console.log('\nDry run only. Re-run with --apply to write a backup and update.')
        return
    }

    fs.mkdirSync(backupDir, { recursive: true })
    fs.writeFileSync(backupFile, JSON.stringify(existing.docs, null, 2))
    console.log(`\nBackup written to ${backupFile}`)

    for (const t of treatments) {
        const doc = existing.docs.find((d) => d.slug === t.slug)
        if (!doc) continue
        await payload.update({
            collection: 'treatments',
            id: doc.id,
            data: {
                title: t.title,
                subtitle: t.subtitle,
                metaTitle: t.metaTitle,
                metaDescription: t.metaDescription,
                content: toLexical(t.body) as never,
            },
        })
    }
    console.log('Done. Saving through Payload also refreshed the site cache.')
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })

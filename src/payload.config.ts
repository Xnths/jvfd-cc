import { mongooseAdapter } from '@payloadcms/db-mongodb'
import {
    BoldFeature,
    FixedToolbarFeature,
    HTMLConverterFeature,
    HeadingFeature,
    InlineToolbarFeature,
    ItalicFeature,
    LinkFeature,
    OrderedListFeature,
    ParagraphFeature,
    UnderlineFeature,
    UnorderedListFeature,
    lexicalEditor,
} from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Treatments } from './collections/Treatments'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
    admin: {
        user: Users.slug,
        importMap: {
            baseDir: path.resolve(dirname),
        },
    },
    collections: [Users, Treatments],
    editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
            ...defaultFeatures,
            HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
            ParagraphFeature(),
            LinkFeature({}),
            OrderedListFeature(),
            UnorderedListFeature(),
            BoldFeature(),
            ItalicFeature(),
            UnderlineFeature(),
            HTMLConverterFeature({}),
            FixedToolbarFeature(),
            InlineToolbarFeature(),
        ],
    }),
    secret: process.env.PAYLOAD_SECRET || 'YOUR_SECRET_HERE',
    typescript: {
        outputFile: path.resolve(dirname, 'payload-types.ts'),
    },
    db: mongooseAdapter({
        url: process.env.DATABASE_URI || '',
    }),
    sharp,
    plugins: [
        // storage-adapter-placeholder
    ],
})

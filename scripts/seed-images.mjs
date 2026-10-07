#!/usr/bin/env node
// Uploads every file in src/assets/ to R2 under seed/<filename>, matching the
// imageKey values in src/data/products.ts. Run once after setting up R2
// credentials: pnpm seed:images
import { readdirSync, readFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const CONTENT_TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' }

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const client = new S3Client({
  region: 'auto',
  endpoint: required('CLOUDFLARE_S3_URI'),
  credentials: {
    accessKeyId: required('CLOUDFLARE_ACCESS_KEY_ID'),
    secretAccessKey: required('CLOUDFLARE_SECRET_KEY'),
  },
})
const bucket = required('CLOUDFLARE_BUCKET')

const assetsDir = new URL('../src/assets/', import.meta.url).pathname
const files = readdirSync(assetsDir, { withFileTypes: true }).filter((entry) => entry.isFile())

for (const file of files) {
  const ext = extname(file.name).toLowerCase()
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) {
    console.log(`skip ${file.name} (unsupported extension)`)
    continue
  }
  const key = `seed/${file.name}`
  const body = readFileSync(join(assetsDir, file.name))
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
  console.log(`uploaded ${key} (${body.length} bytes)`)
}

import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const svg = readFileSync(resolve('public/icon.svg'))

const sizes = [48, 72, 96, 128, 144, 152, 192, 384, 512]

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(`public/icon-${size}.png`))
  console.log(`Generated icon-${size}.png`)
}

// Also generate apple-touch-icon
await sharp(svg)
  .resize(180, 180)
  .png()
  .toFile(resolve('public/apple-touch-icon.png'))
console.log('Generated apple-touch-icon.png')

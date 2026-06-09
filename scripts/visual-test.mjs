import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function startDevServer() {
  return new Promise((resolvePromise, reject) => {
    const viteBin = resolve(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
    const proc = spawn('node', [viteBin, '--host', '0.0.0.0', '--port', '5173'], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BROWSER: 'none' },
    })

    let started = false
    let baseUrl = 'http://localhost:5173'
    const timeout = setTimeout(() => {
      if (!started) {
        proc.kill()
        reject(new Error('Dev server did not start in 30s'))
      }
    }, 30000)

    proc.stdout.on('data', (data) => {
      const text = data.toString()
      const match = text.match(/Local:\s+(http:\/\/localhost:\d+)/)
      if (match) {
        baseUrl = match[1]
      }
      if (text.includes('Local:') || text.includes('localhost')) {
        started = true
        clearTimeout(timeout)
        setTimeout(() => resolvePromise({ proc, baseUrl }), 2000)
      }
    })

    proc.stderr.on('data', (data) => {
      console.error('[vite:err]', data.toString().trim())
    })

    proc.on('exit', (code) => {
      if (!started) reject(new Error(`Dev server exited with code ${code}`))
    })
  })
}

async function run() {
  console.log('Starting dev server...')
  const { proc: devProc, baseUrl } = await startDevServer()

  let browser
  try {
    console.log('Launching browser...')
    browser = await chromium.launch({ headless: true })
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    })

    const page = await context.newPage()
    const errors = []
    const warnings = []
    const logs = []

    page.on('console', (msg) => {
      const text = msg.text()
      const type = msg.type()
      logs.push(`[${type}] ${text}`)
      if (type === 'error') errors.push(text)
      if (type === 'warning') warnings.push(text)
    })

    page.on('pageerror', (err) => {
      errors.push(err.message)
    })

    console.log(`Navigating to ${baseUrl}...`)
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20000 })
    await sleep(3000)

    // Diagnostics
    console.log('\n=== PAGE DIAGNOSTICS ===')
    const title = await page.title()
    console.log(`  Title: ${title}`)

    const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML?.substring(0, 500) || 'EMPTY')
    console.log(`  Root innerHTML: ${rootHtml.substring(0, 300)}`)

    // Check for text in the page
    const bodyText = await page.evaluate(() => document.body.innerText)
    console.log(`  Visible text: ${bodyText.substring(0, 300)}`)

    // Check manifest (using fetch, NOT page.goto which navigates away)
    console.log('\n=== MANIFEST ===')
    const manifestLink = await page.$('link[rel="manifest"]')
    if (manifestLink) {
      const href = await manifestLink.getAttribute('href')
      console.log(`  Manifest href: ${href}`)
      const manifestResponse = await page.evaluate(async (url) => {
        const res = await fetch(url)
        return { status: res.status, contentType: res.headers.get('content-type'), json: await res.json() }
      }, `${baseUrl}${href}`)
      console.log(`  Status: ${manifestResponse.status}`)
      console.log(`  Content-Type: ${manifestResponse.contentType}`)
      console.log(`  Name: ${manifestResponse.json.name}`)
      console.log(`  Icons: ${manifestResponse.json.icons?.length ?? 0}`)
    } else {
      console.error('  No manifest link in HTML!')
    }

    // Check map
    console.log('\n=== MAP ===')
    try {
      await page.waitForSelector('.leaflet-container', { timeout: 10000 })
      const mapContainer = await page.$('.leaflet-container')
      console.log('  Map container: FOUND')
      const bounds = await mapContainer.boundingBox()
      console.log(`  Size: ${bounds?.width}x${bounds?.height}`)

      await sleep(3000)
      const tiles = await page.$$('.leaflet-tile-loaded')
      console.log(`  Loaded tiles: ${tiles.length}`)
      const markers = await page.$$('.leaflet-marker-icon')
      console.log(`  Markers: ${markers.length}`)
    } catch {
      console.error('  Map container: NOT FOUND after 10s wait')
      const allClasses = await page.evaluate(() => {
        return [...document.querySelectorAll('*')].slice(0, 20).map(el => {
          const cls = el.className
          return (typeof cls === 'string' ? cls : el.tagName) || el.tagName
        })
      })
      console.log(`  All element classes (first 20): ${JSON.stringify(allClasses)}`)

      // Check if map is in shadow DOM or iframe
      const iframes = await page.$$('iframe')
      console.log(`  Iframes: ${iframes.length}`)
      const mapDivs = await page.$$('[class*="leaflet"]')
      console.log(`  Elements with 'leaflet' in class: ${mapDivs.length}`)
      const mapDiv = await page.$('[class*="leaflet"]')
      if (mapDiv) {
        const tag = await mapDiv.evaluate(el => el.tagName)
        const cls = await mapDiv.evaluate(el => el.className)
        console.log(`  First leaflet element: <${tag} class="${cls}">`)
      }
    }

    // Screenshots
    await page.screenshot({ path: resolve(ROOT, 'screenshots/mobile.png'), fullPage: false })
    console.log('\nScreenshot: mobile.png')

    await page.setViewportSize({ width: 1280, height: 800 })
    await sleep(1000)
    await page.screenshot({ path: resolve(ROOT, 'screenshots/desktop.png'), fullPage: false })
    console.log('Screenshot: desktop.png')

    // Summary
    console.log('\n=== ERRORS ===')
    if (errors.length === 0) {
      console.log('  ✅ No console errors')
    } else {
      errors.forEach(e => console.log(`  ❌ ${e}`))
    }

    console.log('\n=== WARNINGS ===')
    warnings.forEach(w => console.log(`  ⚠️  ${w}`))

    console.log('\n=== ALL LOGS ===')
    logs.forEach(l => console.log(`  ${l}`))

  } finally {
    if (browser) await browser.close()
    devProc.kill()
    console.log('\nDone.')
  }
}

run().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})

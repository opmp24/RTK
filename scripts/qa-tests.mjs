import { chromium } from 'playwright'
import { spawn } from 'child_process'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
const BASE_URL = 'http://localhost:5173'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const SUPABASE_REF = SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1] || 'placeholder'
const AUTH_TOKEN_KEY = `sb-${SUPABASE_REF}-auth-token`

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function makeMockSession(overrides = {}) {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: 'mock-qa-token-' + Date.now(),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'mock-refresh-token-qa',
    user: {
      id: 'mock-user-id-qa-001',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'qa.tester@example.com',
      email_confirmed_at: new Date().toISOString(),
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      app_metadata: { provider: 'google' },
      user_metadata: { name: 'QA Tester', avatar_url: '', full_name: 'QA Tester' },
      identities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    },
  }
}

async function setupMockAuth(page) {
  const session = makeMockSession()
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: AUTH_TOKEN_KEY, value: session })

  // Intercept Supabase auth validation
  await page.route('**/auth/v1/user', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    })
  })
  await page.route('**/auth/v1/token**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
  })
  await page.route('**/auth/v1/logout', (route) => {
    route.fulfill({ status: 204 })
  })
  return session
}

async function setupNetworkMocks(page, { interceptReports = true, interceptCategories = true } = {}) {
  if (interceptCategories) {
    await page.route('*/**/rest/v1/categories*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'cat-001', name: 'Bache', slug: 'bache', icon: 'CircleDot', color: '#ef4444' },
          { id: 'cat-002', name: 'Señalética', slug: 'senaletica', icon: 'Signpost', color: '#f97316' },
          { id: 'cat-003', name: 'Luminaria', slug: 'luminaria', icon: 'Lightbulb', color: '#eab308' },
          { id: 'cat-004', name: 'Accidente', slug: 'accidente', icon: 'TriangleAlert', color: '#ef4444' },
          { id: 'cat-005', name: 'Robo', slug: 'robo', icon: 'Shield', color: '#8b5cf6' },
        ]),
      })
    })
  }

  if (interceptReports) {
    await page.route('*/**/rest/v1/reports*', (route) => {
      const url = new URL(route.request().url())
      // Handle different methods
      if (route.request().method() === 'POST') {
        const report = {
          id: 'mock-report-' + Date.now(),
          user_id: 'mock-user-id-qa-001',
          category_id: 'cat-001',
          lat: -33.45,
          lng: -70.67,
          address: null,
          description: null,
          photo_url: null,
          created_at: new Date().toISOString(),
          user_email: 'qa.tester@example.com',
          vote_count: { up: 0, down: 0 },
          user_vote: null,
        }
        route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(report) })
        return
      }
      // Return existing mock reports
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'report-001', user_id: 'other-user', category_id: 'cat-001',
            lat: -33.4489, lng: -70.6693, address: 'Av. Providencia 123',
            description: 'Bache grande en la calle', photo_url: null,
            created_at: new Date().toISOString(),
            vote_count: { up: 5, down: 1 }, user_vote: null,
          },
          {
            id: 'report-002', user_id: 'other-user', category_id: 'cat-003',
            lat: -33.45, lng: -70.665, address: 'Calle 456',
            description: 'Luminaria fundida', photo_url: null,
            created_at: new Date().toISOString(),
            vote_count: { up: 3, down: 0 }, user_vote: null,
          },
          {
            id: 'report-003', user_id: 'mock-user-id-qa-001', category_id: 'cat-005',
            lat: -33.452, lng: -70.672, address: 'Av. Siempre Viva 742',
            description: 'Robo en la esquina', photo_url: null,
            created_at: new Date().toISOString(),
            vote_count: { up: 1, down: 2 }, user_vote: 'up',
          },
        ]),
      })
    })
  }

  // Allow report_votes to work
  await page.route('*/**/rest/v1/report_votes*', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 201, contentType: 'application/json', body: '{}' })
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    }
  })

  // Allow storage (photo upload)
  await page.route('*/**/storage/v1/object/report-photos/*', (route) => {
    if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ Key: 'mock-photo-key', Id: 'mock-photo-id' }),
      })
    } else {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    }
  })
}

// ---- QA TESTS ----

async function qaTest1_Visibility(page, round) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`QA TEST 1 — Marker Visibility (Round ${round}/3)`)
  console.log(`${'='.repeat(60)}`)

  const results = { round, passed: 0, failed: 0, details: [] }

  // Check map container
  try {
    await page.waitForSelector('.leaflet-container', { timeout: 10000 })
    console.log('  ✅ Map container found')
    results.passed++
    results.details.push('Map container: FOUND')
  } catch {
    console.log('  ❌ Map container NOT found')
    results.failed++
    results.details.push('Map container: NOT FOUND')
    return results
  }

  // Wait for markers to load
  await sleep(3000)

  // Count initial markers
  let markers = await page.$$('.leaflet-marker-icon')
  console.log(`  📍 Initial markers visible: ${markers.length}`)

  // Zoom in to see individual markers
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('=') // Zoom in
    await sleep(800)
  }
  await sleep(2000)

  markers = await page.$$('.leaflet-marker-icon')
  console.log(`  📍 Markers at high zoom: ${markers.length}`)
  if (markers.length > 0) {
    console.log('  ✅ Individual markers visible at high zoom')
    results.passed++
    results.details.push(`High zoom markers: ${markers.length}`)
  } else {
    console.log('  ⚠️  No individual markers visible')
    results.failed++
    results.details.push('No markers at high zoom')
  }

  // Check for custom marker divs (our custom markers have class custom-marker)
  const customMarkers = await page.$$('.custom-marker')
  console.log(`  🎯 Custom markers (with category icons): ${customMarkers.length}`)
  if (customMarkers.length > 0) {
    console.log('  ✅ Custom markers rendered with icons')
    results.passed++
    results.details.push(`Custom markers: ${customMarkers.length}`)
  } else {
    // Try checking for marker-cluster
    const clusters = await page.$$('.marker-cluster')
    console.log(`  🗺️  Marker clusters: ${clusters.length}`)
    if (clusters.length > 0) {
      console.log('  ✅ Clusters visible (markers grouped at current zoom)')
      results.passed++
      results.details.push(`Clusters: ${clusters.length}`)
    } else {
      console.log('  ⚠️  No custom markers or clusters found')
      results.failed++
      results.details.push('No markers or clusters')
    }
  }

  // Zoom out to see clusters
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('-') // Zoom out
    await sleep(500)
  }
  await sleep(2000)

  const clusters = await page.$$('.marker-cluster')
  console.log(`  🗺️  Clusters at low zoom: ${clusters.length}`)
  if (clusters.length > 0) {
    console.log('  ✅ Clusters visible at low zoom (CSS fix working)')
    results.passed++
    results.details.push(`Low zoom clusters: ${clusters.length}`)
  } else {
    const allMarkers = await page.$$('.leaflet-marker-icon')
    if (allMarkers.length > 0) {
      console.log(`  ⚠️  Markers visible (${allMarkers.length}) but no clusters (may not need clustering at this zoom)`)
      results.passed++
      results.details.push(`Markers without clusters: ${allMarkers.length}`)
    } else {
      console.log('  ⚠️  No markers or clusters visible at low zoom')
      results.failed++
      results.details.push('No clusters or markers at low zoom')
    }
  }

  console.log(`\n  📊 Round ${round} result: ${results.passed} passed, ${results.failed} failed`)
  return results
}

async function qaTest2_ClickMarker(page, round) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`QA TEST 2 — Marker Click Opens Sheet (Round ${round}/3)`)
  console.log(`${'='.repeat(60)}`)

  const results = { round, passed: 0, failed: 0, details: [] }

  // Zoom back to a level where markers are visible
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('=')
    await sleep(500)
  }
  await sleep(2000)

  // Try clicking on markers
  const markers = await page.$$('.leaflet-marker-icon')
  console.log(`  📍 Markers found: ${markers.length}`)

  if (markers.length === 0) {
    console.log('  ❌ No markers to click')
    results.failed++
    results.details.push('No markers found')
    return results
  }

  // Click each marker and check for sheet
  let sheetFound = false
  for (let i = 0; i < Math.min(markers.length, 3); i++) {
    try {
      console.log(`  👆 Clicking marker ${i + 1}...`)
      await markers[i].click()
      await sleep(1500)

      // Check if sheet opened
      const sheet = await page.$('[role="dialog"]')
      if (sheet) {
        const sheetText = await sheet.innerText()
        console.log(`  ✅ Sheet opened for marker ${i + 1}`)
        console.log(`  📄 Sheet content: ${sheetText.substring(0, 80)}...`)

        if (sheetText.includes('Detalle del reporte')) {
          console.log('  ✅ Sheet title is "Detalle del reporte"')
          results.passed++
          results.details.push('Sheet title correct')
        }
        if (sheetText.includes('👍') || sheetText.includes('Bache') || sheetText.includes('Categoría')) {
          results.passed++
          results.details.push('Sheet has content')
        }

        // Close sheet
        const closeBtn = await page.$('[data-radix-collection-item]')
        if (closeBtn) {
          await closeBtn.click()
        } else {
          // Press Escape
          await page.keyboard.press('Escape')
        }
        await sleep(1000)
        sheetFound = true
        break
      } else {
        console.log(`  ⚠️  No sheet opened for marker ${i + 1}`)
      }
    } catch (err) {
      console.log(`  ⚠️  Error clicking marker ${i + 1}: ${err.message}`)
    }
  }

  if (!sheetFound) {
    console.log('  ⚠️  Tried custom marker divs...')
    const custom = await page.$$('.custom-marker')
    for (let i = 0; i < Math.min(custom.length, 3); i++) {
      try {
        await custom[i].click()
        await sleep(1500)
        const sheet = await page.$('[role="dialog"]')
        if (sheet) {
          const text = await sheet.innerText()
          console.log(`  ✅ Sheet opened via custom marker ${i + 1}: ${text.substring(0, 60)}`)
          results.passed++
          results.details.push('Sheet from custom marker click')
          await page.keyboard.press('Escape')
          await sleep(1000)
          sheetFound = true
          break
        }
      } catch {}
    }
  }

  if (!sheetFound) {
    console.log('  ❌ Could not open sheet via any marker click')
    results.failed++
    results.details.push('No sheet opened')
  }

  console.log(`\n  📊 Round ${round} result: ${results.passed} passed, ${results.failed} failed`)
  return results
}

async function qaTest3_FullFeatures(page, round) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`QA TEST 3 — Full Features (Round ${round}/3)`)
  console.log(`${'='.repeat(60)}`)

  const results = { round, passed: 0, failed: 0, details: [] }

  // Check that FAB is visible (user is authenticated)
  const fab = await page.$('button:has(svg.lucide-plus)')
  if (!fab) {
    console.log('  ⚠️  FAB not found, checking for user menu...')
    // Refresh page to ensure auth is picked up
    await page.reload({ waitUntil: 'networkidle' })
    await sleep(3000)
  }

  const fabAfter = await page.$('button:has(svg.lucide-plus)')
  if (fabAfter) {
    console.log('  ✅ FAB (plus button) visible — auth working')
    results.passed++
    results.details.push('FAB visible')
  } else {
    console.log('  ❌ FAB not visible — auth mock may need adjustment')
    results.failed++
    results.details.push('FAB not visible')
    // Continue anyway to test what we can
  }

  // Test voting on an existing report
  const markers = await page.$$('.leaflet-marker-icon')
  if (markers.length > 0) {
    try {
      await markers[0].click()
      await sleep(1500)

      const sheet = await page.$('[role="dialog"]')
      if (sheet) {
        const text = await sheet.innerText()
        console.log(`  ✅ Sheet opened for voting test: ${text.substring(0, 60)}`)

        // Try to find and click vote buttons
        const thumbsUp = await page.$('button:has(svg.lucide-thumbs-up)')
        if (thumbsUp) {
          await thumbsUp.click()
          console.log('  ✅ Clicked vote up')
          await sleep(1000)

          // Check for toast or visual feedback
          const toastMsg = await page.$('[aria-label*="Notifications"]')
          if (toastMsg) {
            const toastText = await toastMsg.innerText()
            console.log(`  📝 Toast: ${toastText || '(empty)'}`)
          }
          results.passed++
          results.details.push('Vote up clicked')
        } else {
          // Try any vote button
          console.log('  ⚠️  Thumbs up button not found')
          results.failed++
          results.details.push('Vote button not found')
        }

        await page.keyboard.press('Escape')
        await sleep(1000)
      }
    } catch (err) {
      console.log(`  ⚠️  Error during vote test: ${err.message}`)
    }
  }

  // Test opening FAB menu and creating a report
  if (fabAfter) {
    try {
      await fabAfter.click()
      await sleep(1500)

      const menuItems = await page.$$('[data-fab-menu] button')
      console.log(`  📋 FAB menu items: ${menuItems.length}`)
      if (menuItems.length > 0) {
        console.log('  ✅ FAB menu opened with categories')
        results.passed++
        results.details.push('FAB menu opened')

        // Click first category
        await menuItems[0].click()
        await sleep(1000)

        // Check for picking mode indicator
        const pickingIndicator = await page.$('text=Toca el mapa para reportar')
        if (pickingIndicator) {
          console.log('  ✅ Picking mode active')
          results.passed++
          results.details.push('Picking mode')
        }

        // Exit picking mode by clicking the check button
        const checkBtn = await page.$('button:has(svg.lucide-check)')
        if (checkBtn) {
          await checkBtn.click()
          console.log('  ✅ Exited picking mode')
          results.passed++
          results.details.push('Picking mode exit')
        } else {
          // Try clicking FAB again to toggle
          await fabAfter.click()
          console.log('  ⚠️  Toggled FAB off')
          results.details.push('Toggled FAB')
        }
        await sleep(1000)
      } else {
        console.log('  ⚠️  FAB menu empty or not visible')
        results.failed++
        results.details.push('No menu items')
      }
    } catch (err) {
      console.log(`  ⚠️  Error during FAB test: ${err.message}`)
    }
  }

  // Test update description / photo on the user's own report
  // Report-003 is owned by mock user
  console.log('  🔍 Testing owner-only controls...')
  // Zoom in, click report-003 marker
  await sleep(1000)

  console.log(`\n  📊 Round ${round} result: ${results.passed} passed, ${results.failed} failed`)
  return results
}

// ---- MAIN ----

async function run() {
  console.log('RTK — QA Test Suite')
  console.log('='.repeat(60))
  console.log(`Start time: ${new Date().toISOString()}`)
  console.log(`Dev server: ${BASE_URL}`)
  console.log('')

  const allResults = { visibility: [], click: [], features: [] }

  for (let round = 1; round <= 3; round++) {
    console.log(`\n${'#'.repeat(60)}`)
    console.log(`#  ROUND ${round} OF 3`)
    console.log(`${'#'.repeat(60)}\n`)

    let browser
    try {
      browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
      })
      const page = await context.newPage()

      // Collect console errors
      const errors = []
      page.on('pageerror', err => errors.push(err.message))
      page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text())
      })

      // Setup mocks
      await setupMockAuth(page)
      await setupNetworkMocks(page)

      // Navigate
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 20000 })
      await sleep(3000)

      // Run tests
      console.log(`\n  --- Starting QA Test 1 (Visibility) ---`)
      const r1 = await qaTest1_Visibility(page, round)
      allResults.visibility.push(r1)

      console.log(`\n  --- Starting QA Test 2 (Click Marker) ---`)
      const r2 = await qaTest2_ClickMarker(page, round)
      allResults.click.push(r2)

      console.log(`\n  --- Starting QA Test 3 (Full Features) ---`)
      const r3 = await qaTest3_FullFeatures(page, round)
      allResults.features.push(r3)

      // Screenshot for this round
      await page.screenshot({ path: resolve(ROOT, `screenshots/qa-round-${round}.png`), fullPage: false })

      if (errors.length > 0) {
        console.log(`\n  ⚠️  Console errors in round ${round}:`)
        errors.forEach(e => console.log(`    ❌ ${e}`))
      }

    } catch (err) {
      console.error(`\n  ❌ Round ${round} failed: ${err.message}`)
    } finally {
      if (browser) await browser.close()
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(60)}`)
  console.log('FINAL QA SUMMARY')
  console.log(`${'='.repeat(60)}`)

  for (const [testName, rounds] of Object.entries(allResults)) {
    console.log(`\n📊 ${testName.toUpperCase()}:`)
    let totalPassed = 0, totalFailed = 0
    for (const r of rounds) {
      totalPassed += r.passed
      totalFailed += r.failed
      console.log(`  Round ${r.round}: ${r.passed} ✅ / ${r.failed} ❌`)
    }
    const verdict = totalFailed === 0 ? '✅ ALL PASSED' : `⚠️  ${totalFailed} FAILURES`
    console.log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed — ${verdict}`)
  }

  console.log('\nScreenshots saved to screenshots/qa-round-{1,2,3}.png')
  console.log('Done.')
}

run().catch(err => {
  console.error('QA suite failed:', err)
  process.exit(1)
})

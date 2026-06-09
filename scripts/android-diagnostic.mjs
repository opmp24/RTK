import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = 'https://rtkapp.netlify.app';
const SCREENSHOT_PATH = 'G:\\TEST\\RTK\\screenshots\\android-sim.png';

async function run() {
  mkdirSync('G:\\TEST\\RTK\\screenshots', { recursive: true });

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 393, height: 851 },
    deviceScaleFactor: 2.75,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.7049.38 Mobile Safari/537.36',
    locale: 'es-ES',
    timezoneId: 'America/Santiago',
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  const consoleLogs = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  page.on('pageerror', (err) => {
    pageErrors.push({
      message: err.message,
      stack: err.stack,
    });
  });

  page.on('requestfailed', (req) => {
    failedRequests.push({
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText ?? 'unknown',
      resourceType: req.resourceType(),
    });
  });

  console.log(`Navigating to ${URL}...`);
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  console.log('Waiting 10 seconds for full page load...');
  await page.waitForTimeout(10000);

  console.log('Taking screenshot...');
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  console.log(`Screenshot saved to ${SCREENSHOT_PATH}`);

  // --- REPORT ---
  const report = [];

  report.push('='.repeat(70));
  report.push('ANDROID DIAGNOSTIC REPORT');
  report.push('='.repeat(70));
  report.push('');

  // Console messages
  report.push('--- CONSOLE MESSAGES (' + consoleLogs.length + ' total) ---');
  for (const log of consoleLogs) {
    report.push(`[${log.type.toUpperCase()}] ${log.text}`);
    if (log.location) {
      report.push(`  at ${log.location.url}:${log.location.lineNumber}:${log.location.columnNumber}`);
    }
  }
  report.push('');

  // Page errors
  report.push('--- PAGE ERRORS (' + pageErrors.length + ' total) ---');
  for (const err of pageErrors) {
    report.push(`Message: ${err.message}`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(0, 6).join('\n');
      report.push(`Stack:\n${lines}`);
    }
  }
  report.push('');

  // Failed network requests
  report.push('--- FAILED NETWORK REQUESTS (' + failedRequests.length + ' total) ---');
  for (const req of failedRequests) {
    report.push(`[${req.method}] ${req.url}`);
    report.push(`  Failure: ${req.failure}`);
    report.push(`  Type: ${req.resourceType}`);
  }
  report.push('');

  // DOM inspection
  report.push('--- DOM INSPECTION ---');

  const domInfo = await page.evaluate(() => {
    const info = {};

    // HTML element
    const html = document.documentElement;
    info.htmlClasses = html.className;
    info.htmlAttrs = {};
    for (const attr of html.attributes) {
      info.htmlAttrs[attr.name] = attr.value;
    }

    // Body element
    const body = document.body;
    info.bodyClasses = body.className;
    info.bodyAttrs = {};
    for (const attr of body.attributes) {
      info.bodyAttrs[attr.name] = attr.value;
    }
    info.bodyInnerHTML = body.innerHTML.length > 0;
    info.bodyInnerHTMLPreview = body.innerHTML.substring(0, 2000);

    // Root element
    const root = document.getElementById('root');
    if (root) {
      info.rootExists = true;
      info.rootChildCount = root.childElementCount;
      info.rootChildNodes = root.childNodes.length;
      info.rootInnerHTML = root.innerHTML.length > 0;
      info.rootInnerHTMLPreview = root.innerHTML.substring(0, 2000);
      info.rootTextContent = (root.textContent || '').substring(0, 500);

      // Check children
      const children = [];
      for (const child of root.children) {
        children.push({
          tag: child.tagName,
          classes: child.className,
          id: child.id,
          childCount: child.childElementCount,
        });
      }
      info.rootChildren = children;
    } else {
      info.rootExists = false;
    }

    // Loading spinners / error messages
    info.loadingElements = document.querySelectorAll('[class*="loading"], [class*="spinner"], [class*="loader"], [class*="cargando"]').length;
    info.errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], [class*="destructive"]').length;

    // Meta viewport
    const vp = document.querySelector('meta[name="viewport"]');
    info.viewportMeta = vp ? vp.getAttribute('content') : null;

    // Script tags
    info.scriptTags = document.querySelectorAll('script').length;

    // Style / link tags
    info.linkTags = document.querySelectorAll('link[rel="stylesheet"]').length;

    // Check if React root exists
    info.reactRoot = !!root?._reactRootContainer || !!root?.__reactContainer$ || false;

    return info;
  });

  report.push(`HTML classes: "${domInfo.htmlClasses}"`);
  report.push(`HTML attributes: ${JSON.stringify(domInfo.htmlAttrs)}`);
  report.push(`Body classes: "${domInfo.bodyClasses}"`);
  report.push(`Body attributes: ${JSON.stringify(domInfo.bodyAttrs)}`);
  report.push(`Body has innerHTML: ${domInfo.bodyInnerHTML}`);
  report.push('');
  report.push(`Root exists: ${domInfo.rootExists}`);
  if (domInfo.rootExists) {
    report.push(`Root child element count: ${domInfo.rootChildCount}`);
    report.push(`Root child node count: ${domInfo.rootChildNodes}`);
    report.push(`Root has innerHTML: ${domInfo.rootInnerHTML}`);
    report.push(`Root text content: "${domInfo.rootTextContent}"`);
    if (domInfo.rootChildren && domInfo.rootChildren.length > 0) {
      report.push(`Root children:`);
      for (const child of domInfo.rootChildren) {
        report.push(`  <${child.tag} id="${child.id}" class="${child.classes}"> children: ${child.childCount}`);
      }
    }
    report.push(`Root innerHTML preview:\n${domInfo.rootInnerHTMLPreview}`);
  }
  report.push('');
  report.push(`Loading spinner elements found: ${domInfo.loadingElements}`);
  report.push(`Error/alert elements found: ${domInfo.errorElements}`);
  report.push(`Viewport meta: ${domInfo.viewportMeta}`);
  report.push(`Script tags: ${domInfo.scriptTags}`);
  report.push(`Stylesheet link tags: ${domInfo.linkTags}`);
  report.push(`React root detected: ${domInfo.reactRoot}`);
  report.push('');

  // Check Leaflet CSS
  report.push('--- LEAFLET CSS CHECK ---');
  const leafletCss = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      if (sheet.href && sheet.href.includes('leaflet')) {
        return { loaded: true, href: sheet.href };
      }
    }
    return { loaded: false };
  });
  report.push(`Leaflet CSS loaded: ${leafletCss.loaded}`);
  if (leafletCss.loaded) {
    report.push(`Leaflet CSS href: ${leafletCss.href}`);
  }

  // Visual check
  report.push('');
  report.push('--- VISUAL CHECK ---');
  const visual = await page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root) return { rootVisible: false, message: '#root not found' };

    const rect = root.getBoundingClientRect();
    const bodyRect = document.body.getBoundingClientRect();
    return {
      rootVisible: rect.width > 0 && rect.height > 0,
      rootRect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
      bodyRect: { width: bodyRect.width, height: bodyRect.height },
      bodyBg: getComputedStyle(document.body).backgroundColor,
      rootBg: getComputedStyle(root).backgroundColor,
    };
  });
  report.push(`Root visible: ${visual.rootVisible}`);
  report.push(`Root bounding rect: ${JSON.stringify(visual.rootRect)}`);
  report.push(`Body bounding rect: ${JSON.stringify(visual.bodyRect)}`);
  report.push(`Body background: ${visual.bodyBg}`);
  report.push(`Root background: ${visual.rootBg}`);

  report.push('');
  report.push('='.repeat(70));
  report.push('END OF REPORT');
  report.push('='.repeat(70));

  const output = report.join('\n');
  console.log(output);

  // Also write the report to a file
  const { writeFileSync } = await import('fs');
  writeFileSync('G:\\TEST\\RTK\\screenshots\\android-diagnostic-report.txt', output, 'utf-8');
  console.log('\nReport also written to screenshots/android-diagnostic-report.txt');

  await browser.close();
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});

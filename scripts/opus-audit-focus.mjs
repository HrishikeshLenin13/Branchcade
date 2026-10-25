import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage()
await p.goto('http://127.0.0.1:4173/missions/m01', { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
await p.getByRole('button', { name: 'Mission briefing', exact: true }).focus()
await p.keyboard.press('Tab')
await p.screenshot({ path: process.argv[2], clip: { x: 20, y: 260, width: 520, height: 60 } })
await b.close()

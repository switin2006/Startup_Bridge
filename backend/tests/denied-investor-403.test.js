/**
 * Test: denied-investor chat leak — proves a denied investor gets 403
 *
 * Pre‑requisites:
 *   1. Backend running on http://localhost:5000
 *   2. At least one negotiation with a DENIED interest exists
 *      (or you can set up the scenario via the API — see "Setup" section below).
 *
 * Run:
 *   node tests/denied-investor-403.test.js
 *
 * What it does:
 *   - Registers a startup + investor (or reuses existing ones)
 *   - Startup creates & publishes a pitch
 *   - Investor expresses interest → Startup DENIES the interest
 *   - Investor tries to GET /api/messages?negotiationId=... → expects 403
 *   - Investor tries to POST /api/messages → expects 403
 *   - Investor tries to GET /api/negotiations/:id → expects 403
 */

const BASE = process.env.BASE_URL || 'http://localhost:5000'

async function api(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = text }

  return { status: res.status, json }
}

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    passed++
    console.log(`  ✅ ${label}`)
  } else {
    failed++
    console.error(`  ❌ ${label}`)
  }
}

// ─────────────────────────────────────────────────────────────
// If admin approval is required, you can call this helper.
// It logs in as admin and approves the given userId.
// ─────────────────────────────────────────────────────────────
async function adminApprove(userId) {
  const { json: loginRes } = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@startupbridge.com', password: 'admin123' }
  })
  const adminToken = loginRes.token
  if (!adminToken) throw new Error('Could not login as admin — make sure seed data exists')

  await api(`/api/admin/users/${userId}/approve`, {
    method: 'PUT',
    token: adminToken
  })
}

async function main() {
  console.log('\n🧪 Denied-Investor 403 Test\n')

  const ts = Date.now()

  // 1. Register startup
  console.log('1. Registering startup...')
  const { json: startupReg } = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: `TestStartup_${ts}`,
      email: `startup_${ts}@test.com`,
      password: 'Test1234!',
      role: 'startup',
      verificationNote: 'test startup'
    }
  })
  const startupToken = startupReg.token
  const startupId = startupReg.user?.id
  if (!startupToken) {
    console.error('  ❌ Startup registration failed:', startupReg)
    process.exit(1)
  }
  console.log(`  Startup registered: ${startupId}`)

  // 2. Register investor
  console.log('2. Registering investor...')
  const { json: investorReg } = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: `TestInvestor_${ts}`,
      email: `investor_${ts}@test.com`,
      password: 'Test1234!',
      role: 'investor',
      verificationNote: 'test investor'
    }
  })
  const investorToken = investorReg.token
  const investorId = investorReg.user?.id
  if (!investorToken) {
    console.error('  ❌ Investor registration failed:', investorReg)
    process.exit(1)
  }
  console.log(`  Investor registered: ${investorId}`)

  // 3. Admin-approve both users
  console.log('3. Admin approving both users...')
  await adminApprove(startupId)
  await adminApprove(investorId)
  console.log('  Both users approved.')

  // 4. Startup creates + publishes a pitch
  console.log('4. Creating and publishing pitch...')
  const { json: pitch } = await api('/api/startup/pitches', {
    method: 'POST',
    token: startupToken,
    body: {
      title: `DeniedTest_${ts}`,
      problem: 'Test problem',
      solution: 'Test solution',
      fundingAmount: '100000',
      equityPercent: 10,
      domain: 'SaaS'
    }
  })
  const pitchId = pitch?.id
  if (!pitchId) {
    console.error('  ❌ Pitch creation failed:', pitch)
    process.exit(1)
  }

  // Publish the pitch
  await api(`/api/startup/pitches/${pitchId}`, {
    method: 'PUT',
    token: startupToken,
    body: { status: 'published' }
  })

  // Manually publish via direct update since the PUT might not handle status
  // Let's check if there's a publish endpoint
  const { json: pitchCheck } = await api(`/api/startup/pitches/${pitchId}`, { token: startupToken })
  if (pitchCheck?.status !== 'published') {
    // Try the pitches endpoint
    console.log('  Note: Pitch status is:', pitchCheck?.status, '— trying to publish via admin...')
    const { json: loginRes } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@startupbridge.com', password: 'admin123' }
    })
    // Publish via admin if needed
    if (loginRes.token) {
      await api(`/api/admin/pitches/${pitchId}/publish`, {
        method: 'PUT',
        token: loginRes.token
      })
    }
  }
  console.log(`  Pitch created: ${pitchId}`)

  // 5. Investor expresses interest
  console.log('5. Investor expressing interest...')
  const { json: interestRes, status: intStatus } = await api('/api/investor/interests', {
    method: 'POST',
    token: investorToken,
    body: {
      pitchId,
      proposedAmount: '80000',
      proposedEquityPct: 8,
      message: 'Test interest'
    }
  })
  if (intStatus !== 201) {
    console.error(`  ❌ Interest creation failed (${intStatus}):`, interestRes)
    process.exit(1)
  }
  const interestId = interestRes.interest?.id
  console.log(`  Interest created: ${interestId}`)

  // Find the negotiation room
  const { json: startupPitch } = await api(`/api/startup/pitches/${pitchId}`, { token: startupToken })
  const negotiationId = startupPitch?.interests?.[0]?.negotiationId
  if (!negotiationId) {
    console.error('  ❌ Could not find negotiationId. Pitch data:', JSON.stringify(startupPitch, null, 2))
    process.exit(1)
  }
  console.log(`  NegotiationId: ${negotiationId}`)

  // 6. Startup DENIES the interest
  console.log('6. Startup denying interest...')
  const { status: denyStatus, json: denyRes } = await api(`/api/startup/interests/${interestId}/deny`, {
    method: 'POST',
    token: startupToken,
    body: {}
  })
  if (denyStatus !== 200) {
    console.error(`  ❌ Deny failed (${denyStatus}):`, denyRes)
    process.exit(1)
  }
  console.log('  Interest denied.')

  // ─────────────────────────────────────────────────────────────
  // 7. TESTS — denied investor should get 403 on all chat endpoints
  // ─────────────────────────────────────────────────────────────
  console.log('\n📋 Running assertions...\n')

  // 7a. GET /api/messages?negotiationId=...
  const msgRead = await api(`/api/messages?negotiationId=${negotiationId}`, { token: investorToken })
  assert(msgRead.status === 403, `GET /api/messages → 403 (got ${msgRead.status})`)

  // 7b. POST /api/messages
  const msgWrite = await api('/api/messages', {
    method: 'POST',
    token: investorToken,
    body: { negotiationId, content: 'Sneaky message from denied investor' }
  })
  assert(msgWrite.status === 403, `POST /api/messages → 403 (got ${msgWrite.status})`)

  // 7c. GET /api/negotiations/:id
  const negView = await api(`/api/negotiations/${negotiationId}`, { token: investorToken })
  assert(negView.status === 403, `GET /api/negotiations/:id → 403 (got ${negView.status})`)

  // 7d. GET /api/negotiations/mine should NOT include this negotiation
  const negMine = await api('/api/negotiations/mine', { token: investorToken })
  const hasRoom = (negMine.json.negotiations || []).some(n => n.id === negotiationId)
  assert(!hasRoom, `GET /api/negotiations/mine → does not include denied room (found: ${hasRoom})`)

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})

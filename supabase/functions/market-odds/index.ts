// Supabase Edge Function : proxy vers The Odds API (https://the-odds-api.com/) pour l'onglet
// "Market". Garde la clé API côté serveur (jamais exposée au client) et relaie aussi les
// en-têtes de quota (x-requests-remaining/used/last) renvoyés par l'API en amont.
//
// Déploiement : voir README section "Market (cotes)" pour la marche à suivre (déploiement de
// la fonction + secret ODDS_API_KEY côté Supabase).

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE_URL = 'https://api.the-odds-api.com/v4'
const BOOKMAKERS = 'draftkings,fanduel,betmgm,pinnacle'
const ALLOWED_SPORTS = ['americanfootball_nfl', 'baseball_mlb', 'basketball_nba', 'icehockey_nhl']

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...body }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

function fail(error: string) {
  return new Response(JSON.stringify({ ok: false, error }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  let body: { resource?: string; sport?: string; dateFrom?: string; dateTo?: string }
  try {
    body = await req.json()
  } catch {
    return fail('invalid_request')
  }

  if (body.resource !== 'odds' || !body.sport || !ALLOWED_SPORTS.includes(body.sport)) {
    return fail('invalid_request')
  }

  const apiKey = Deno.env.get('ODDS_API_KEY')
  if (!apiKey) return fail('server_not_configured')

  const url = new URL(`${BASE_URL}/sports/${body.sport}/odds`)
  url.searchParams.set('bookmakers', BOOKMAKERS)
  url.searchParams.set('markets', 'h2h,spreads,totals')
  url.searchParams.set('oddsFormat', 'decimal')
  url.searchParams.set('dateFormat', 'iso')
  if (body.dateFrom) url.searchParams.set('commenceTimeFrom', body.dateFrom)
  if (body.dateTo) url.searchParams.set('commenceTimeTo', body.dateTo)
  url.searchParams.set('apiKey', apiKey)

  let upstream: Response
  try {
    upstream = await fetch(url.toString())
  } catch (err) {
    console.error('market-odds upstream fetch failed:', err)
    return fail('network')
  }

  const quota = {
    remaining: numOrNull(upstream.headers.get('x-requests-remaining')),
    used: numOrNull(upstream.headers.get('x-requests-used')),
    last: numOrNull(upstream.headers.get('x-requests-last')),
  }

  if (!upstream.ok) {
    if (upstream.status === 401) return fail('auth')
    if (upstream.status === 403) return fail('plan')
    if (upstream.status === 429) return fail('quota')
    console.error('market-odds upstream error:', upstream.status, await upstream.text())
    return fail('unknown')
  }

  const data = await upstream.json()
  return ok({ data, quota })
})

function numOrNull(value: string | null): number | null {
  if (value === null) return null
  const n = Number(value)
  return Number.isNaN(n) ? null : n
}

// Supabase Edge Function : lit une capture d'écran de ticket de pari et en extrait
// les infos structurées (description, marché, ligue, cote, mise) via l'API Claude (vision).
//
// Déploiement : voir README section "OCR de bet slip" pour la marche à suivre
// (déploiement de la fonction + secret ANTHROPIC_API_KEY côté Supabase).

import Anthropic from 'npm:@anthropic-ai/sdk'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

const SYSTEM_PROMPT = `Tu es un assistant qui extrait les informations d'une capture d'écran de ticket de pari sportif (bet slip) d'une application de paris.

Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour et sans balises markdown, au format exact suivant :
{
  "bet_type": "single" | "parlay",
  "stake": number | null,
  "legs": [
    {
      "event_description": string,
      "market": string | null,
      "league": string | null,
      "odds_decimal": number
    }
  ]
}

Règles :
- "odds_decimal" est TOUJOURS au format décimal (ex: 1.85). Si la cote affichée est au format américain (ex: -110, +250) ou fractionnaire, convertis-la en décimal.
- "market" doit être un de "Spread", "Total", "Moneyline", "Prop", ou une courte description si aucun ne correspond bien.
- "league" doit être un de "MLB", "NBA", "NFL", "NHL", "Soccer", "Tennis", "WNBA", "NCAAF", "NCAAB", ou null si tu ne peux pas déterminer la ligue.
- "event_description" est une description courte et claire de l'événement et de la sélection (ex: "Lakers - Celtics, Lakers à gagner").
- S'il y a plusieurs sélections (parlay/combiné), "bet_type" est "parlay" et chaque sélection est un élément de "legs" (au moins 2).
- S'il n'y a qu'une seule sélection, "bet_type" est "single" et "legs" contient un seul élément.
- "stake" est le montant misé s'il est visible sur l'image, sinon null. N'inclus jamais le symbole de devise, juste le nombre.
- Si l'image ne montre visiblement pas un ticket de pari exploitable, réponds avec {"error": "raison courte en français"} et rien d'autre.`

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  let body: { image?: unknown; mediaType?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_request' }, 400)
  }

  const { image, mediaType } = body
  if (typeof image !== 'string' || !image || typeof mediaType !== 'string') {
    return jsonResponse({ error: 'missing_image' }, 400)
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return jsonResponse({ error: 'unsupported_media_type' }, 400)
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return jsonResponse({ error: 'server_not_configured' }, 500)

  try {
    const anthropic = new Anthropic({ apiKey })
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2000,
      output_config: { effort: 'medium' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'Extrait les informations de ce ticket de pari en JSON, selon le format demandé.' },
          ],
        },
      ],
    })

    const textBlock = response.content.find((block) => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return jsonResponse({ error: 'empty_response' }, 502)

    const match = textBlock.text.match(/\{[\s\S]*\}/)
    if (!match) return jsonResponse({ error: 'no_json' }, 502)

    try {
      const parsed = JSON.parse(match[0])
      return jsonResponse(parsed)
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 502)
    }
  } catch (err) {
    console.error('parse-bet-slip error:', err)
    return jsonResponse({ error: 'internal_error' }, 500)
  }
})

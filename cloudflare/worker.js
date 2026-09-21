/* =========================================================
   Dav AI — Cloudflare Worker backend (Phase 1 stub)
   ---------------------------------------------------------
   Phase 1 scope:
     - CORS handling based on env.ALLOWED_ORIGIN
     - GET  /            → service info
     - GET  /health      → health check
     - POST /api/chat    → 501 stub (Groq lands in Phase 4)
   Phase 4 will add:
     - Firebase ID token verification
     - Groq chat completions call
     - Optional tool orchestration + RTDB persistence
   ========================================================= */

/**
 * Build CORS headers for a given origin.
 * @param {string} origin
 */
function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

/**
 * JSON response helper.
 * @param {any} data
 * @param {number} status
 * @param {string} origin
 */
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin)
    }
  });
}

/**
 * Resolve which origin we should echo back.
 * If ALLOWED_ORIGIN is empty, fall back to the request origin (dev only).
 */
function resolveAllowedOrigin(requestOrigin, allowed) {
  if (!allowed) return requestOrigin || '*';
  return requestOrigin === allowed ? allowed : allowed;
}

export default {
  /**
   * @param {Request} request
   * @param {{ ALLOWED_ORIGIN?: string, GROQ_MODEL?: string,
   *           GROQ_API_KEY?: string, SEARCH_API_KEY?: string }} env
   * @param {ExecutionContext} ctx
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const requestOrigin = request.headers.get('Origin') || '';
    const allowedOrigin = resolveAllowedOrigin(
      requestOrigin,
      env.ALLOWED_ORIGIN
    );

    /* ---------- CORS preflight ---------- */
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowedOrigin)
      });
    }

    /* ---------- Origin guard ---------- */
    // Only enforce when ALLOWED_ORIGIN is set AND the request has an Origin.
    // (Server-to-server calls with no Origin header are allowed.)
    if (
      env.ALLOWED_ORIGIN &&
      requestOrigin &&
      requestOrigin !== env.ALLOWED_ORIGIN
    ) {
      return json(
        { ok: false, error: 'Origin not allowed' },
        403,
        allowedOrigin
      );
    }

    /* ---------- Routes ---------- */
    try {
      if (url.pathname === '/' && request.method === 'GET') {
        return json(
          {
            ok: true,
            service: 'dav-ai-backend',
            phase: 1,
            model: env.GROQ_MODEL || null,
            hasGroqKey: Boolean(env.GROQ_API_KEY),
            hasSearchKey: Boolean(env.SEARCH_API_KEY)
          },
          200,
          allowedOrigin
        );
      }

      if (url.pathname === '/health' && request.method === 'GET') {
        return json(
          { ok: true, status: 'healthy', ts: Date.now() },
          200,
          allowedOrigin
        );
      }

      if (url.pathname === '/api/chat' && request.method === 'POST') {
        return handleChatStub(request, env, allowedOrigin);
      }

      return json(
        { ok: false, error: 'Not found', path: url.pathname },
        404,
        allowedOrigin
      );
    } catch (err) {
      console.error('[worker] unhandled error:', err && err.stack);
      return json(
        { ok: false, error: 'Internal error' },
        500,
        allowedOrigin
      );
    }
  }
};

/* =========================================================
   /api/chat — Phase 1 stub
   ---------------------------------------------------------
   Expected body (Phase 4):
     { message: string, chatId?: string }
   Expected header:
     Authorization: Bearer <Firebase ID token>
   ========================================================= */
async function handleChatStub(request, env, origin) {
  let body = null;
  try {
    body = await request.json();
  } catch {
    return json(
      { ok: false, error: 'Invalid JSON body' },
      400,
      origin
    );
  }

  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return json(
      { ok: false, error: 'Missing "message" field' },
      400,
      origin
    );
  }

  const authHeader = request.headers.get('Authorization') || '';
  const hasAuth = authHeader.startsWith('Bearer ');

  // Not implemented yet — real Groq call lands in Phase 4.
  return json(
    {
      ok: false,
      error: 'Not implemented yet',
      detail:
        'Groq integration arrives in Phase 4. This endpoint currently only validates the request shape.',
      received: {
        messageLength: message.length,
        hasAuthHeader: hasAuth,
        model: env.GROQ_MODEL || null
      }
    },
    501,
    origin
  );
}

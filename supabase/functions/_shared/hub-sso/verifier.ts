/**
 * JWT verification against the hub JWKS (jose). Keys are fetched from the jwks_uri published in
 * the hub discovery document and cached by jose (a token with an unknown `kid` triggers a refetch,
 * so key rotation on the hub needs nothing here).
 *
 * "jose" resolves to npm:jose through supabase/functions/hub-sso/deno.json in the Edge Runtime and
 * to node_modules in the unit tests.
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { CLOCK_TOLERANCE, type JwtVerifier, type ProviderMetadata } from "./core.ts";

export function createJwtVerifier(issuer: string, discovery: () => Promise<ProviderMetadata>): JwtVerifier {
  let jwks: { uri: string; set: ReturnType<typeof createRemoteJWKSet> } | null = null;

  return async (token, options) => {
    const meta = await discovery();
    if (!jwks || jwks.uri !== meta.jwks_uri) {
      jwks = { uri: meta.jwks_uri, set: createRemoteJWKSet(new URL(meta.jwks_uri), { timeoutDuration: 5000 }) };
    }
    const { payload } = await jwtVerify(token, jwks.set, {
      issuer,
      audience: options.audience,
      algorithms: ["RS256"], // what the hub signs with (docs/SSO-INTEGRACAO.md in the hub)
      clockTolerance: CLOCK_TOLERANCE,
      maxTokenAge: options.maxTokenAgeSec,
      requiredClaims: options.requiredClaims,
    });
    return payload as Record<string, unknown>;
  };
}

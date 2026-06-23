import crypto from "crypto";
import { Router } from "express";

const router = Router();

type OAuthClient = {
  clientId: string;
  redirectUris: string[];
  clientName?: string;
};

type AuthorizationCode = {
  clientId: string;
  redirectUri: string;
  scope: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  expiresAt: number;
};

const clients = new Map<string, OAuthClient>();
const authorizationCodes = new Map<string, AuthorizationCode>();
const accessTokens = new Map<string, { clientId: string; scope: string; expiresAt: number }>();

function getBaseUrl(req: any) {
  const configured = process.env.PUBLIC_BASE_URL || process.env.EASYDATA_BASE_URL;

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function createRandomToken(prefix: string) {
  return `${prefix}_${crypto.randomBytes(24).toString("base64url")}`;
}

function readString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function sha256Base64Url(value: string) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}

function verifyPkce(code: AuthorizationCode, verifier: string | null) {
  if (!code.codeChallenge) {
    return true;
  }

  if (!verifier) {
    return false;
  }

  if (code.codeChallengeMethod === "S256") {
    return sha256Base64Url(verifier) === code.codeChallenge;
  }

  return verifier === code.codeChallenge;
}

router.get("/.well-known/oauth-authorization-server", (req, res) => {
  const baseUrl = getBaseUrl(req);

  return res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    registration_endpoint: `${baseUrl}/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256", "plain"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["mcp"],
  });
});

router.get(["/.well-known/oauth-protected-resource", "/.well-known/oauth-protected-resource/mcp"], (req, res) => {
  const baseUrl = getBaseUrl(req);

  return res.json({
    resource: `${baseUrl}/mcp`,
    resource_name: "EasyData MCP",
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp"],
  });
});

router.post("/oauth/register", (req, res) => {
  const clientId = createRandomToken("client");
  const redirectUris = Array.isArray(req.body?.redirect_uris)
    ? req.body.redirect_uris.filter((item: unknown) => typeof item === "string")
    : [];
  const clientName = readString(req.body?.client_name) ?? undefined;

  clients.set(clientId, {
    clientId,
    redirectUris,
    ...(clientName && { clientName }),
  });

  return res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: clientName ?? "EasyData MCP Client",
    redirect_uris: redirectUris,
    grant_types: ["authorization_code"],
    response_types: ["code"],
    token_endpoint_auth_method: "none",
  });
});

router.get("/oauth/authorize", (req, res) => {
  const clientId = readString(req.query.client_id);
  const redirectUri = readString(req.query.redirect_uri);
  const responseType = readString(req.query.response_type);
  const scope = readString(req.query.scope) ?? "mcp";
  const state = readString(req.query.state);
  const codeChallenge = readString(req.query.code_challenge) ?? undefined;
  const codeChallengeMethod = readString(req.query.code_challenge_method) ?? undefined;

  if (!clientId || !redirectUri || responseType !== "code") {
    return res.status(400).send("Invalid OAuth authorization request.");
  }

  const client = clients.get(clientId);
  if (client && client.redirectUris.length > 0 && !client.redirectUris.includes(redirectUri)) {
    return res.status(400).send("Redirect URI is not registered for this client.");
  }

  const code = createRandomToken("code");
  authorizationCodes.set(code, {
    clientId,
    redirectUri,
    scope,
    ...(codeChallenge && { codeChallenge }),
    ...(codeChallengeMethod && { codeChallengeMethod }),
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);
  if (state) {
    redirect.searchParams.set("state", state);
  }

  return res.redirect(302, redirect.toString());
});

router.post("/oauth/token", (req, res) => {
  const grantType = readString(req.body?.grant_type);
  const codeValue = readString(req.body?.code);
  const redirectUri = readString(req.body?.redirect_uri);
  const clientId = readString(req.body?.client_id);
  const codeVerifier = readString(req.body?.code_verifier);

  if (grantType !== "authorization_code" || !codeValue || !redirectUri || !clientId) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing or invalid authorization_code token request fields.",
    });
  }

  const code = authorizationCodes.get(codeValue);
  authorizationCodes.delete(codeValue);

  if (!code || code.expiresAt < Date.now()) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Authorization code is invalid or expired.",
    });
  }

  if (code.clientId !== clientId || code.redirectUri !== redirectUri || !verifyPkce(code, codeVerifier)) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Authorization code validation failed.",
    });
  }

  const accessToken = createRandomToken("mcp");
  const expiresIn = 60 * 60;
  accessTokens.set(accessToken, {
    clientId,
    scope: code.scope,
    expiresAt: Date.now() + expiresIn * 1000,
  });

  return res.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: expiresIn,
    scope: code.scope,
  });
});

export default router;

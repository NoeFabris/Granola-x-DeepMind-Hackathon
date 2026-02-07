import { randomUUID } from "node:crypto";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  UnauthorizedError,
  type OAuthClientProvider,
} from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { GranolaClientContext, GranolaProxyResult } from "@/types/granola";

const GRANOLA_MCP_ENDPOINT = "https://mcp.granola.ai/mcp";
const MCP_CLIENT_INFO = {
  name: "meeting-recap-feed",
  version: "0.1.0",
} as const;

export const GRANOLA_SESSION_COOKIE_NAME = "granola_session";

type GranolaOperation<T> = (client: Client) => Promise<T>;

interface GranolaAuthSession {
  clientInformation?: OAuthClientInformationMixed;
  tokens?: OAuthTokens;
  codeVerifier?: string;
  pendingAuthorizationUrl?: string;
  expectedState?: string;
}

const granolaSessions = new Map<string, GranolaAuthSession>();
const sessionIdsByState = new Map<string, string>();

function getOrCreateSession(sessionId: string): GranolaAuthSession {
  let session = granolaSessions.get(sessionId);
  if (!session) {
    session = {};
    granolaSessions.set(sessionId, session);
  }

  return session;
}

function getCallbackUrl(callbackBaseUrl: string): string {
  return new URL("/api/auth/granola", callbackBaseUrl).toString();
}

function createClient(): Client {
  return new Client(MCP_CLIENT_INFO, { capabilities: {} });
}

function createTransport(provider: OAuthClientProvider): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(GRANOLA_MCP_ENDPOINT), {
    authProvider: provider,
  });
}

function removeTrackedState(state?: string): void {
  if (state) {
    sessionIdsByState.delete(state);
  }
}

class GranolaOAuthProvider implements OAuthClientProvider {
  private readonly session: GranolaAuthSession;

  constructor(
    private readonly sessionId: string,
    private readonly callbackUrl: string
  ) {
    this.session = getOrCreateSession(sessionId);
  }

  get redirectUrl(): string {
    return this.callbackUrl;
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: "Meeting Recap Feed",
      redirect_uris: [this.callbackUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  state(): string {
    const state = randomUUID();

    removeTrackedState(this.session.expectedState);
    this.session.expectedState = state;
    sessionIdsByState.set(state, this.sessionId);

    return state;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this.session.clientInformation;
  }

  saveClientInformation(clientInformation: OAuthClientInformationMixed): void {
    this.session.clientInformation = clientInformation;
  }

  tokens(): OAuthTokens | undefined {
    return this.session.tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this.session.tokens = tokens;
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    this.session.pendingAuthorizationUrl = authorizationUrl.toString();
  }

  saveCodeVerifier(codeVerifier: string): void {
    this.session.codeVerifier = codeVerifier;
  }

  codeVerifier(): string {
    if (!this.session.codeVerifier) {
      throw new Error("Missing PKCE code verifier for Granola OAuth session.");
    }

    return this.session.codeVerifier;
  }
}

async function safelyCloseTransport(
  transport: StreamableHTTPClientTransport
): Promise<void> {
  await transport.close().catch(() => undefined);
}

function getPendingAuthorizationUrl(sessionId: string): string | undefined {
  return granolaSessions.get(sessionId)?.pendingAuthorizationUrl;
}

export function createGranolaSessionId(): string {
  return randomUUID();
}

export function getSessionIdForOAuthState(state: string | null): string | undefined {
  if (!state) {
    return undefined;
  }

  return sessionIdsByState.get(state);
}

export function hasGranolaConnection(sessionId: string): boolean {
  return Boolean(granolaSessions.get(sessionId)?.tokens);
}

export async function withGranolaClient<T>(
  context: GranolaClientContext,
  operation: GranolaOperation<T>
): Promise<GranolaProxyResult<T>> {
  const callbackUrl = getCallbackUrl(context.callbackBaseUrl);
  const provider = new GranolaOAuthProvider(context.sessionId, callbackUrl);
  const client = createClient();
  const transport = createTransport(provider);

  try {
    await client.connect(transport);
    const data = await operation(client);

    return {
      status: "ok",
      data,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      const authUrl = getPendingAuthorizationUrl(context.sessionId);

      if (!authUrl) {
        throw new Error(
          "Granola OAuth was required but no authorization URL was captured."
        );
      }

      return {
        status: "auth_required",
        authUrl,
      };
    }

    throw error;
  } finally {
    await safelyCloseTransport(transport);
  }
}

export async function beginGranolaOAuth(
  context: GranolaClientContext
): Promise<GranolaProxyResult<{ connected: true }>> {
  return withGranolaClient(context, async () => ({ connected: true }));
}

interface CompleteGranolaAuthorizationOptions {
  callbackBaseUrl: string;
  code: string;
  sessionId?: string;
  state?: string | null;
}

export async function completeGranolaAuthorization(
  options: CompleteGranolaAuthorizationOptions
): Promise<string> {
  const sessionId = options.sessionId ?? getSessionIdForOAuthState(options.state ?? null);

  if (!sessionId) {
    throw new Error("Unable to resolve a Granola session for this OAuth callback.");
  }

  const session = getOrCreateSession(sessionId);

  if (session.expectedState && !options.state) {
    throw new Error("Missing OAuth state in Granola callback.");
  }

  if (session.expectedState && options.state !== session.expectedState) {
    throw new Error("Granola OAuth state validation failed.");
  }

  const callbackUrl = getCallbackUrl(options.callbackBaseUrl);
  const provider = new GranolaOAuthProvider(sessionId, callbackUrl);
  const client = createClient();
  const transport = createTransport(provider);

  try {
    await transport.finishAuth(options.code);
    await client.connect(transport);

    session.pendingAuthorizationUrl = undefined;
    session.codeVerifier = undefined;
    removeTrackedState(session.expectedState);
    session.expectedState = undefined;

    return sessionId;
  } finally {
    await safelyCloseTransport(transport);
  }
}

import { z } from "zod";
import { env } from "@/lib/env";
import {
  APP_ROLE_HOME,
  mapTwentyRoleLabelToAppRole,
  normalizeString,
} from "./contract";
import {
  AppRole,
  AuthenticatedAppUser,
  AuthenticatedAppUserSchema,
  TwentyRole,
  TwentyRoleSchema,
} from "@/lib/schemas/auth";

const METADATA_TIMEOUT_MS = 15_000;

const GraphQLErrorSchema = z.object({
  errors: z
    .array(
      z.object({
        message: z.string(),
      })
    )
    .optional(),
  data: z.unknown().optional(),
});

const TokenLeafSchema = z.object({
  token: z.string().min(1),
});

const AccessTokensSchema = z
  .object({
    accessOrWorkspaceAgnosticToken: TokenLeafSchema.optional(),
    accessOrWorkspaceTokens: z.array(TokenLeafSchema).optional(),
    accessToken: TokenLeafSchema.optional(),
  })
  .passthrough();

const TOKEN_PAIR_FIELDS = `
  accessOrWorkspaceAgnosticToken { token }
`;

const AvailableWorkspaceSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().optional(),
  loginToken: z.string().optional(),
  workspaceUrls: z
    .object({
      subdomainUrl: z.string().optional(),
      customUrl: z.string().nullable().optional(),
    })
    .optional(),
});

const SignInResponseSchema = z.object({
  signIn: z
    .object({
      tokens: AccessTokensSchema.optional(),
      availableWorkspaces: z
        .object({
          availableWorkspacesForSignIn: z.array(AvailableWorkspaceSchema).optional(),
        })
        .optional(),
    })
    .optional(),
});

const LoginTokenResponseSchema = z.object({
  getLoginTokenFromCredentials: z
    .object({
      loginToken: TokenLeafSchema.optional(),
    })
    .optional(),
});

const AuthTokensResponseSchema = z.object({
  getAuthTokensFromLoginToken: z
    .object({
      tokens: AccessTokensSchema.optional(),
    })
    .optional(),
});

const CurrentUserResponseSchema = z.object({
  currentUser: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    workspaceMember: z
      .object({
        id: z.string().uuid(),
        userEmail: z.string().nullable().optional(),
        name: z
          .object({
            firstName: z.string().nullable().optional(),
            lastName: z.string().nullable().optional(),
          })
          .nullable()
          .optional(),
      })
      .nullable()
      .optional(),
  }),
});

const GetRolesResponseSchema = z.object({
  getRoles: z.array(TwentyRoleSchema),
});

export class TwentyAuthError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_CREDENTIALS" | "NO_APP_ROLE" | "CRM_ERROR" = "CRM_ERROR"
  ) {
    super(message);
    this.name = "TwentyAuthError";
  }
}

function getMetadataUrl(): string {
  if (env.TWENTY_METADATA_URL) {
    return env.TWENTY_METADATA_URL;
  }
  return `${env.TWENTY_API_URL.replace(/\/$/, "")}/metadata`;
}

let cachedTwentyAuthOrigin: string | null = null;

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

async function resolveTwentyAuthOrigin(): Promise<string> {
  if (env.TWENTY_AUTH_ORIGIN) {
    return normalizeOrigin(env.TWENTY_AUTH_ORIGIN);
  }

  if (cachedTwentyAuthOrigin) {
    return cachedTwentyAuthOrigin;
  }

  const data = await metadataFetch<{
    currentWorkspace: {
      workspaceUrls: {
        subdomainUrl?: string | null;
        customUrl?: string | null;
      };
    };
  }>(
    `
      query WorkspaceAuthOrigin {
        currentWorkspace {
          workspaceUrls {
            subdomainUrl
            customUrl
          }
        }
      }
    `
  );

  const workspaceUrl =
    data.currentWorkspace.workspaceUrls.customUrl ||
    data.currentWorkspace.workspaceUrls.subdomainUrl;

  if (!workspaceUrl) {
    throw new TwentyAuthError(
      "URL do workspace Twenty não configurado",
      "CRM_ERROR"
    );
  }

  cachedTwentyAuthOrigin = normalizeOrigin(workspaceUrl);
  return cachedTwentyAuthOrigin;
}

function extractAccessToken(tokens: z.infer<typeof AccessTokensSchema> | undefined): string | null {
  if (!tokens) return null;
  const workspaceAgnostic = tokens.accessOrWorkspaceAgnosticToken?.token;
  if (workspaceAgnostic) return workspaceAgnostic;
  const fromList = tokens.accessOrWorkspaceTokens?.[0]?.token;
  if (fromList) return fromList;
  return tokens.accessToken?.token ?? null;
}

async function metadataFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: { accessToken?: string; useServiceKey?: boolean } = {}
): Promise<T> {
  const { accessToken, useServiceKey = true } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  } else if (useServiceKey && env.TWENTY_API_KEY) {
    headers.Authorization = `Bearer ${env.TWENTY_API_KEY}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);

  try {
    const response = await fetch(getMetadataUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new TwentyAuthError(
        `Twenty metadata HTTP ${response.status}`,
        "CRM_ERROR"
      );
    }

    const payload = GraphQLErrorSchema.parse(await response.json());

    if (payload.errors?.length) {
      const message = payload.errors[0]?.message ?? "Twenty metadata error";
      const isAuthFailure =
        /invalid|incorrect|password|credentials|unauthorized|forbidden/i.test(
          message
        );
      throw new TwentyAuthError(
        message,
        isAuthFailure ? "INVALID_CREDENTIALS" : "CRM_ERROR"
      );
    }

    return payload.data as T;
  } catch (error) {
    if (error instanceof TwentyAuthError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new TwentyAuthError("Timeout ao contactar o Twenty CRM", "CRM_ERROR");
    }
    throw new TwentyAuthError(
      error instanceof Error ? error.message : "Falha de ligação ao Twenty CRM",
      "CRM_ERROR"
    );
  } finally {
    clearTimeout(timer);
  }
}

async function exchangeLoginTokenForAccessToken(
  loginToken: string,
  origin: string
): Promise<string> {
  const authTokensData = await metadataFetch(
    `
      mutation ExchangeLoginToken($loginToken: String!, $origin: String!) {
        getAuthTokensFromLoginToken(loginToken: $loginToken, origin: $origin) {
          tokens {
            ${TOKEN_PAIR_FIELDS}
          }
        }
      }
    `,
    { loginToken, origin },
    { useServiceKey: false }
  );

  const parsedAuthTokens = AuthTokensResponseSchema.parse(authTokensData);
  const accessToken = extractAccessToken(
    parsedAuthTokens.getAuthTokensFromLoginToken?.tokens
  );

  if (!accessToken) {
    throw new TwentyAuthError("Credenciais inválidas", "INVALID_CREDENTIALS");
  }

  return accessToken;
}

async function signInWithPassword(email: string, password: string): Promise<string> {
  const origin = await resolveTwentyAuthOrigin();

  try {
    const signInData = await metadataFetch(
      `
        mutation SignIn($email: String!, $password: String!) {
          signIn(email: $email, password: $password) {
            tokens {
              ${TOKEN_PAIR_FIELDS}
            }
            availableWorkspaces {
              availableWorkspacesForSignIn {
                id
                displayName
                loginToken
                workspaceUrls {
                  subdomainUrl
                  customUrl
                }
              }
            }
          }
        }
      `,
      { email, password },
      { useServiceKey: false }
    );

    const parsedSignIn = SignInResponseSchema.safeParse(signInData);
    const workspaces =
      parsedSignIn.data?.signIn?.availableWorkspaces?.availableWorkspacesForSignIn ??
      [];

    for (const workspace of workspaces) {
      if (!workspace.loginToken) continue;
      const workspaceOrigin = normalizeOrigin(
        workspace.workspaceUrls?.customUrl ||
          workspace.workspaceUrls?.subdomainUrl ||
          origin
      );
      return await exchangeLoginTokenForAccessToken(
        workspace.loginToken,
        workspaceOrigin
      );
    }

    const signInToken = extractAccessToken(parsedSignIn.data?.signIn?.tokens);
    if (signInToken) {
      const currentUser = await fetchCurrentWorkspaceUser(signInToken);
      if (currentUser.workspaceMemberId) {
        return signInToken;
      }
    }
  } catch (error) {
    if (
      error instanceof TwentyAuthError &&
      error.code === "INVALID_CREDENTIALS"
    ) {
      throw error;
    }
  }

  const loginTokenData = await metadataFetch(
    `
      mutation GetLoginToken($email: String!, $password: String!, $origin: String!) {
        getLoginTokenFromCredentials(email: $email, password: $password, origin: $origin) {
          loginToken { token }
        }
      }
    `,
    { email, password, origin },
    { useServiceKey: false }
  );

  const parsedLoginToken = LoginTokenResponseSchema.parse(loginTokenData);
  const loginToken = parsedLoginToken.getLoginTokenFromCredentials?.loginToken?.token;
  if (!loginToken) {
    throw new TwentyAuthError("Credenciais inválidas", "INVALID_CREDENTIALS");
  }

  return exchangeLoginTokenForAccessToken(loginToken, origin);
}

async function fetchCurrentWorkspaceUser(accessToken: string) {
  const data = await metadataFetch(
    `
      query CurrentUser {
        currentUser {
          id
          email
          firstName
          lastName
          workspaceMember {
            id
            userEmail
            name { firstName lastName }
          }
        }
      }
    `,
    {},
    { accessToken }
  );

  const parsed = CurrentUserResponseSchema.parse(data);
  const workspaceMember = parsed.currentUser.workspaceMember;

  if (!workspaceMember?.id) {
    throw new TwentyAuthError(
      "Utilizador sem membro de workspace no Twenty CRM",
      "NO_APP_ROLE"
    );
  }

  const memberFirst = workspaceMember.name?.firstName ?? "";
  const memberLast = workspaceMember.name?.lastName ?? "";
  const memberName = `${memberFirst} ${memberLast}`.trim();
  const fallbackName = `${parsed.currentUser.firstName ?? ""} ${parsed.currentUser.lastName ?? ""}`.trim();

  return {
    userId: parsed.currentUser.id,
    workspaceMemberId: workspaceMember.id,
    email: workspaceMember.userEmail || parsed.currentUser.email,
    name: memberName || fallbackName || parsed.currentUser.email,
  };
}

export async function fetchWorkspaceRoles(): Promise<TwentyRole[]> {
  const data = await metadataFetch<{ getRoles: TwentyRole[] }>(
    `
      query WorkspaceRoles {
        getRoles {
          id
          label
          workspaceMembers {
            id
            userEmail
            name { firstName lastName }
          }
        }
      }
    `
  );

  const parsed = GetRolesResponseSchema.parse(data);
  return parsed.getRoles;
}

export function resolveAppRoleFromRoles(
  workspaceMemberId: string,
  roles: TwentyRole[]
): { role: AppRole; twentyRoleLabel: string } | null {
  for (const role of roles) {
    const isMember = role.workspaceMembers.some(
      (member) => member.id === workspaceMemberId
    );
    if (!isMember) continue;

    const appRole = mapTwentyRoleLabelToAppRole(role.label);
    if (appRole) {
      return { role: appRole, twentyRoleLabel: role.label };
    }
  }

  return null;
}

export async function resolveAppRoleFromWorkspaceMember(
  workspaceMemberId: string
): Promise<{ role: AppRole; twentyRoleLabel: string } | null> {
  const roles = await fetchWorkspaceRoles();
  return resolveAppRoleFromRoles(workspaceMemberId, roles);
}

export async function authenticateWithTwenty(
  email: string,
  password: string
): Promise<AuthenticatedAppUser | null> {
  const accessToken = await signInWithPassword(email, password);
  const currentUser = await fetchCurrentWorkspaceUser(accessToken);
  const resolvedRole = await resolveAppRoleFromWorkspaceMember(
    currentUser.workspaceMemberId
  );

  if (!resolvedRole) {
    throw new TwentyAuthError(
      "Conta sem permissão na app. Contacte o administrador.",
      "NO_APP_ROLE"
    );
  }

  return AuthenticatedAppUserSchema.parse({
    id: currentUser.workspaceMemberId,
    userId: currentUser.userId,
    name: currentUser.name,
    email: currentUser.email,
    role: resolvedRole.role,
    twentyRoleLabel: resolvedRole.twentyRoleLabel,
  });
}

export function getHomePathForRole(role: AppRole): string {
  return APP_ROLE_HOME[role];
}

export function isTechnicianRoleLabel(label: string): boolean {
  const normalized = normalizeString(label);
  return normalized === "TECNICOS" || normalized === "TECNICO";
}

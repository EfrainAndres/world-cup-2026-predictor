import { apiRoutes } from "./routes.js";
import { buildApiMetadata } from "./schemas.js";
import type { ApiMetadata, ApiRoutes, ApiValidationIssue, SimulateMatchRequest } from "./schemas.js";

export interface ApiRuntime {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export interface ApiRuntimeErrorResponse {
  status: "error";
  error: {
    code: "method_not_allowed" | "not_found";
    message: string;
  };
  metadata: ApiMetadata;
}

export interface ApiRuntimeValidationErrorResponse {
  status: "validation_error";
  issues: readonly ApiValidationIssue[];
  metadata: ApiMetadata;
}

export type ApiRuntimeFailureResponse = ApiRuntimeErrorResponse | ApiRuntimeValidationErrorResponse;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8"
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS
  });
}

function runtimeMetadata(note: string): ApiMetadata {
  return buildApiMetadata([note]);
}

function methodNotAllowed(method: string, allowedMethod: string): Response {
  return jsonResponse(
    {
      status: "error",
      error: {
        code: "method_not_allowed",
        message: `${method} is not supported for this route. Use ${allowedMethod}.`
      },
      metadata: runtimeMetadata("Runtime adapter rejected the request before calling API handlers.")
    } satisfies ApiRuntimeErrorResponse,
    405
  );
}

function notFound(pathname: string): Response {
  return jsonResponse(
    {
      status: "error",
      error: {
        code: "not_found",
        message: `No API runtime route matches ${pathname}.`
      },
      metadata: runtimeMetadata("Runtime adapter could not match the request path.")
    } satisfies ApiRuntimeErrorResponse,
    404
  );
}

function validationError(field: string, message: string): Response {
  return jsonResponse(
    {
      status: "validation_error",
      issues: [{ field, message }],
      metadata: runtimeMetadata("Runtime adapter rejected the request before calling API handlers.")
    } satisfies ApiRuntimeValidationErrorResponse,
    400
  );
}

function responseForHandlerResult(result: { status?: string; error?: { code?: string } }): Response {
  if (result.status === "validation_error") {
    return jsonResponse(result, 400);
  }

  if (result.status === "not_found") {
    return jsonResponse(result, 404);
  }

  if (result.status === "error") {
    const status =
      result.error?.code === "invalid_provider" ||
      result.error?.code === "missing_database_url"
        ? 500
        : result.error?.code === "connection_unavailable" ||
            result.error?.code === "migration_missing"
          ? 503
          : 500;
    return jsonResponse(result, status);
  }

  return jsonResponse(result, 200);
}

async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseHistoricalYear(pathname: string): number | undefined {
  const match = /^\/historical\/([^/]+)$/.exec(pathname);

  if (match === null) {
    return undefined;
  }

  const [, yearSegment] = match;
  const year = Number(yearSegment);

  return Number.isInteger(year) ? year : undefined;
}

export async function handleApiRuntimeRequest(request: Request, routes: ApiRoutes = apiRoutes): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/health") {
    if (request.method !== "GET") return methodNotAllowed(request.method, "GET");

    return jsonResponse(routes.getHealth());
  }

  if (url.pathname === "/model-info") {
    if (request.method !== "GET") return methodNotAllowed(request.method, "GET");

    return jsonResponse(routes.getModelInfo());
  }

  if (url.pathname === "/simulate-match") {
    if (request.method !== "POST") return methodNotAllowed(request.method, "POST");

    const body = await parseJsonBody(request);

    if (!isJsonRecord(body)) {
      return validationError("body", "Request body must be a JSON object.");
    }

    return responseForHandlerResult(routes.simulateMatch(body as unknown as SimulateMatchRequest));
  }

  if (url.pathname === "/world-cup-2026/daily-matches") {
    if (request.method !== "GET") return methodNotAllowed(request.method, "GET");

    const date = url.searchParams.get("date") ?? undefined;
    const timezone = url.searchParams.get("timezone") ?? undefined;

    return responseForHandlerResult(
      await routes.getWorldCup2026DailyMatches({
        ...(date === undefined ? {} : { date }),
        ...(timezone === undefined ? {} : { timezone })
      })
    );
  }

  const historicalYear = parseHistoricalYear(url.pathname);

  if (historicalYear !== undefined) {
    if (request.method !== "GET") return methodNotAllowed(request.method, "GET");

    return responseForHandlerResult(routes.getHistoricalTournamentSummary(historicalYear));
  }

  if (url.pathname.startsWith("/historical/")) {
    if (request.method !== "GET") return methodNotAllowed(request.method, "GET");

    return validationError("year", "Historical tournament year must be an integer.");
  }

  if (url.pathname === "/historical-replay-audit") {
    if (request.method !== "GET") return methodNotAllowed(request.method, "GET");

    return jsonResponse(routes.getHistoricalReplayAudit());
  }

  return notFound(url.pathname);
}

export function createApiRuntime(routes: ApiRoutes = apiRoutes): ApiRuntime {
  return {
    fetch(input, init) {
      return handleApiRuntimeRequest(new Request(input, init), routes);
    }
  };
}

export const apiRuntime = createApiRuntime();

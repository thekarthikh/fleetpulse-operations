/**
 * HTTP plumbing shared by every FleetPulse REST endpoint:
 * consistent envelopes, structured logging and global exception handling.
 */
export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

export interface ApiProblem {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  details?: unknown;
}

export function problem(status: number, error: string, message: string, details?: unknown) {
  const body: ApiProblem = { timestamp: new Date().toISOString(), status, error, message, details };
  return json(body, status);
}

/** Global exception handler + request log, mirroring @RestControllerAdvice. */
export async function handle(name: string, fn: () => Promise<Response> | Response) {
  const started = Date.now();
  try {
    const res = await fn();
    console.info(`[fleetpulse] ${name} -> ${res.status} in ${Date.now() - started}ms`);
    return res;
  } catch (err) {
    console.error(`[fleetpulse] ${name} failed`, err);
    return problem(500, "INTERNAL_SERVER_ERROR", (err as Error)?.message ?? "Unexpected error");
  }
}

export function queryOf(request: Request) {
  const url = new URL(request.url);
  const get = (k: string) => url.searchParams.get(k) ?? undefined;
  const num = (k: string) => {
    const v = get(k);
    return v === undefined ? undefined : Number(v);
  };
  return { get, num, url };
}

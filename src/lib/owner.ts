/** Browser-side helpers for the delete token a scan hands to the person who ran it. */

const PREFIX = "msgdrift:owner:";

export function rememberOwnerToken(reportId: string, token: string): void {
  try {
    localStorage.setItem(PREFIX + reportId, token);
  } catch {
    // storage unavailable
  }
}

export function readOwnerToken(reportId: string): string | null {
  try {
    return localStorage.getItem(PREFIX + reportId);
  } catch {
    return null;
  }
}

export function forgetOwnerToken(reportId: string): void {
  try {
    localStorage.removeItem(PREFIX + reportId);
  } catch {
    // storage unavailable
  }
}

/** The token travels in the fragment so it never reaches a server log or a referrer. */
export function deleteLink(origin: string, reportId: string, token: string): string {
  return `${origin}/r/${reportId}/delete#t=${token}`;
}

export function tokenFromHash(hash: string): string | null {
  const m = hash.match(/(?:^#|&)t=([A-Za-z0-9_-]{24,64})(?:&|$)/);
  return m ? m[1] : null;
}

export async function deleteReport(reportId: string, token: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/reports/${reportId}`, { method: "DELETE", headers: { "x-owner-token": token } });
  if (res.ok) return { ok: true };
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return { ok: false, error: data.error ?? `Could not delete (${res.status}).` };
}

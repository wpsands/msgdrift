/**
 * Marks a browser as internal traffic. ?internal=1 sets the mark and
 * ?internal=0 clears it. The mark is kept in localStorage because PostHog's
 * cookieless mode stores nothing, so without it the flag only covered the
 * first page of a visit. Only browsers that opted in with ?internal=1 ever
 * get the key; visitors' browsers store nothing.
 */
export const INTERNAL_KEY = "msgdrift_internal";

type FlagStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function resolveInternalFlag(search: string, storage: FlagStorage | null): boolean {
  let param: string | null = null;
  try {
    param = new URLSearchParams(search).get("internal");
  } catch {
    param = null;
  }

  try {
    if (param === "1") {
      storage?.setItem(INTERNAL_KEY, "1");
      return true;
    }
    if (param === "0") {
      storage?.removeItem(INTERNAL_KEY);
      return false;
    }
    return storage?.getItem(INTERNAL_KEY) === "1";
  } catch {
    // Storage blocked (private mode, policy): fall back to the URL alone.
    return param === "1";
  }
}

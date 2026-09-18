import { useEffect, useState } from 'react';
import { fetchSports, Sport } from '../lib/profiles';

/** The approved sport/hobby catalogue, read from the server on mount.
 *
 *  Deliberately not cached across mounts: the table is a dozen rows, and the
 *  whole point is that a sport approved by an admin shows up without anyone
 *  restarting the app. A session-length cache would reintroduce exactly the
 *  staleness this replaces.
 *
 *  `sports` is null until the answer arrives. On failure it stays null and
 *  `failed` is set -- callers show a retry rather than a stale or invented
 *  list, because a filter naming a sport the server does not have matches
 *  nothing and looks like an empty database. */
export function useSports() {
  const [sports, setSports] = useState<Sport[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setFailed(false);
    fetchSports()
      .then((rows) => { if (active) setSports(rows); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);

  return { sports, failed, retry: () => setAttempt((value) => value + 1) };
}

/** Case-insensitive substring match, for the search field on every picker. */
export function matchesQuery(name: string, query: string) {
  const needle = query.trim().toLowerCase();
  return !needle || name.toLowerCase().includes(needle);
}

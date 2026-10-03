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

export type SportLayer = {
  kind: 'sport' | 'hobby';
  /** "Sports" or "Hobbies". */
  label: string;
  categories: { name: string; items: Sport[] }[];
};

/** The catalogue in its three layers: kind, then category, then entry.
 *
 *    Sports  >  Combat sports  >  Boxing, Muay Thai
 *    Hobbies >  Music          >  Guitar
 *
 *  A search matches an entry's own name OR its category, so typing "combat"
 *  finds Boxing and Muay Thai -- which is most of what the category layer is
 *  for. A layer with nothing matching is dropped rather than left as an empty
 *  heading, and the order is fixed (sports before hobbies, categories by their
 *  position, Other last) so the list does not reshuffle as someone types. */
export function layerSports(sports: Sport[], query: string): SportLayer[] {
  return ([['sport', 'Sports'], ['hobby', 'Hobbies']] as const)
    .map(([kind, label]) => {
      const matching = sports.filter((sport) =>
        sport.kind === kind
        && (matchesQuery(sport.name, query) || matchesQuery(sport.category ?? '', query)));
      const byCategory = new Map<string, { name: string; position: number; items: Sport[] }>();
      for (const sport of matching) {
        // An entry nobody has placed yet sits with Other rather than in a
        // heading of its own -- "Uncategorised" is not something a member
        // should have to read.
        const name = sport.category ?? (kind === 'sport' ? 'Other sports' : 'Other hobbies');
        const layer = byCategory.get(name) ?? { name, position: sport.categoryPosition, items: [] };
        // The rows themselves, not their names: two entries may share a name,
        // and only the id identifies which one someone actually chose.
        layer.items.push(sport);
        byCategory.set(name, layer);
      }
      const categories = [...byCategory.values()]
        .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
        .map(({ name, items }) => ({ name, items }));
      return { kind, label, categories };
    })
    .filter((layer) => layer.categories.length > 0);
}

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sport } from '../lib/profiles';
import { fetchCapabilities, mapSport, requestSport } from '../lib/gwin';
import { useTheme } from '../theme';
import { Button, Field, Icon, SectionHeading } from './ui';
import { layerSports } from './useSports';

// Search the catalogue, with the AI engine behind it.
//
// One component for every place a sport or hobby is chosen -- your interests,
// what you coach, what a community is about, the Discover filter -- so they all
// search the same way and none of them falls behind.
//
// Typing filters the list instantly, on the device. That is deliberate: the
// engine is a large model, and asking it on every keystroke would be seconds of
// latency and a real cost per letter, for a list of a few dozen rows a
// substring match already handles. The engine is for the case the list cannot
// answer:
//
//   * nothing matches -> once the member pauses, the engine is asked whether
//     what they typed is another name for something already listed ("footy",
//     "BJJ", "kickboxen"), and a match is offered as one tap.
//   * still nothing   -> "Add it" files a request, and the engine sorts it into
//     sport-or-hobby and a category before an admin sees it.
//
// Looking up is automatic; filing is one tap. Filing on a pause would file
// "Badmint" while somebody was still typing "Badminton", and the admin queue
// would fill with fragments of words.
//
// The results come in three layers -- Sports / Hobbies, then category, then the
// entry -- and a search matches the category too, so "combat" finds Boxing.

const LOOKUP_PAUSE_MS = 700;
const LOOKUP_MIN_CHARS = 3;

export function SportSearch({ sports, selected, onPick, single = false }: {
  sports: Sport[];
  selected: string[];
  /** Multi: toggle this id. Single: choose it. */
  onPick: (id: string) => void;
  single?: boolean;
}) {
  const { c, t } = useTheme();
  const [query, setQuery] = useState('');
  const typed = query.trim();
  const layers = layerSports(sports, query);
  const empty = layers.length === 0;

  // Presentation only: whether to offer the engine at all. The function
  // refuses on its own when the capability is off, so this never decides what
  // is allowed -- it just keeps the screen from offering a button that answers
  // 409.
  const [engine, setEngine] = useState(false);
  useEffect(() => {
    let active = true;
    // Both: the switch on AND a key behind it. Otherwise every pause would call
    // a function that can only answer "not available".
    void fetchCapabilities().then((can) => { if (active) setEngine(can.suggestsSports && can.engineReady); });
    return () => { active = false; };
  }, []);

  // --- the automatic lookup, when the list has nothing -----------------------
  const [suggestion, setSuggestion] = useState<Sport | null>(null);
  const [looking, setLooking] = useState(false);
  const asked = useRef('');
  useEffect(() => {
    setSuggestion(null);
    if (!engine || !empty || typed.length < LOOKUP_MIN_CHARS) return;
    let active = true;
    const timer = setTimeout(() => {
      asked.current = typed;
      setLooking(true);
      mapSport(typed)
        .then(({ match }) => {
          // A stale answer for something no longer in the box is dropped.
          if (!active || asked.current !== typed) return;
          setSuggestion(sports.find((sport) => sport.name === match) ?? null);
        })
        .catch(() => { /* the list and the Add button still work */ })
        .finally(() => { if (active) setLooking(false); });
    }, LOOKUP_PAUSE_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [engine, empty, typed, sports]);

  // --- filing a request -------------------------------------------------------
  const [filing, setFiling] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  useEffect(() => { setNote(null); }, [typed]);

  const file = async () => {
    if (!typed || filing) return;
    setFiling(true);
    setNote(null);
    try {
      // Placed by the engine, never by the member.
      const filed = await requestSport(typed);
      // Only name a category the engine actually chose. The Other fallback is
      // a placeholder for the admin, and presenting it as a decision is what
      // made this look like the categorisation had got it wrong.
      setNote({
        ok: true,
        text: filed.placedByEngine && filed.category
          ? `Requested “${typed}”, under ${filed.kind === 'hobby' ? 'Hobbies' : 'Sports'} › ${filed.category}. It appears here once an admin approves it.`
          // Held: it reaches the admins only once it has a category.
          : `Requested “${typed}”. It is being sorted into a category, then it goes to the admins.`,
      });
    } catch (error) {
      // The server's refusals are written to be read -- "Did you mean
      // Football?" -- so they are shown as they come.
      setNote({ ok: false, text: error instanceof Error ? error.message : 'That could not be sent. Try again.' });
    } finally {
      setFiling(false);
    }
  };

  const choose = (id: string) => {
    onPick(id);
    // A single choice is finished once made; clearing the box shows it took.
    if (single) setQuery('');
  };

  return (
    <View style={{ gap: 18 }}>
      <Field
        value={query}
        onChange={setQuery}
        icon="search"
        placeholder="Search a sport, a hobby or a category"
        label="Search sports and hobbies"
      />

      {empty && (
        <View style={{ gap: 10 }}>
          <Text accessibilityLiveRegion="polite" style={[t.bodySm, { color: c.txt3 }]}>
            {typed ? `Nothing listed matches “${typed}”.` : 'No sports or hobbies are available yet.'}
          </Text>

          {looking && (
            <Text accessibilityLiveRegion="polite" style={[t.caption, { color: c.txt3 }]}>
              Checking whether it goes by another name…
            </Text>
          )}

          {/* The engine found it under another name. */}
          {suggestion && (
            <Pressable
              onPress={() => choose(suggestion.id)}
              accessibilityRole="button"
              accessibilityLabel={`Did you mean ${suggestion.name}? Choose it`}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52,
                paddingHorizontal: 14, borderRadius: 14, borderWidth: 1,
                borderColor: c.volt, backgroundColor: c.surface,
              }}
            >
              <Icon name="zap" size={16} color={c.accent} />
              <Text style={[t.label, { flex: 1, color: c.txt }]}>
                Did you mean <Text style={{ color: c.accent }}>{suggestion.name}</Text>?
              </Text>
              <Icon name="chevron-right" size={18} color={c.txt3} />
            </Pressable>
          )}

          {/* Always available once something is typed, engine or not: a
              member who cannot find their sport must always be able to ask.
              One tap, and nobody is asked where it belongs -- the engine
              decides sport or hobby and the category. */}
          {typed.length > 0 && !note?.ok && (
            <Button
              icon="plus"
              label={`Add “${typed}”`}
              busy={filing}
              busyLabel="Sending…"
              accessibilityLabel={`Request ${typed} as a new sport or hobby`}
              onPress={() => void file()}
            />
          )}

          {note && (
            <Text
              accessibilityRole={note.ok ? undefined : 'alert'}
              accessibilityLiveRegion="polite"
              style={[t.bodySm, { color: note.ok ? c.txt2 : c.danger }]}
            >
              {note.text}
            </Text>
          )}
        </View>
      )}

      {layers.map((layer) => (
        <View key={layer.kind} style={{ gap: 10 }}>
          <SectionHeading>{layer.label}</SectionHeading>
          {layer.categories.map((category) => (
            <View key={category.name} style={{ gap: 6 }}>
              <Text style={[t.caption, { color: c.txt3, marginLeft: 2 }]}>{category.name}</Text>
              <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 14, overflow: 'hidden' }}>
                {category.items.map((sport, index) => {
                  const checked = selected.includes(sport.id);
                  return (
                    <Pressable
                      key={sport.id}
                      accessibilityRole={single ? 'radio' : 'checkbox'}
                      accessibilityLabel={`${sport.name}, ${category.name}`}
                      accessibilityState={single ? { selected: checked } : { checked }}
                      onPress={() => choose(sport.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48,
                        paddingHorizontal: 12,
                        backgroundColor: checked ? c.surface : 'transparent',
                        borderTopWidth: index === 0 ? 0 : 1, borderTopColor: c.line2,
                      }}
                    >
                      <View style={{
                        width: 18, height: 18, borderRadius: single ? 9 : 5, borderWidth: 1,
                        alignItems: 'center', justifyContent: 'center',
                        borderColor: checked ? c.volt : c.line,
                        backgroundColor: checked ? c.volt : 'transparent',
                      }}>
                        {checked && <Icon name="check" size={13} color={c.ink} />}
                      </View>
                      <Text numberOfLines={1} style={[t.label, { flex: 1, color: c.txt }]}>{sport.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

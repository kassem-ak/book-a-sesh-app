// What this database has, when the app ships ahead of its migration.
//
// PostgREST refuses a whole query that names a column the table does not have:
// there is no partial result and no soft failure. So a client deployed before
// its migration would not degrade, it would take the screen down -- My
// bookings and the package list both.
//
// One flag, set by the first read that finds out, read by everything that has
// to decide whether the feature exists yet. It lives in its own module so the
// two libraries that need it do not have to import each other.
//
// Delete this file and its readers once the migration is applied everywhere.

let fulfilment = true;
let ratings = true;

/** False once a read has proved the confirmation columns are not there yet. */
export function fulfilmentSchemaReady(): boolean {
  return fulfilment;
}

/** Called by the reader that got a 42703 back. */
export function markFulfilmentSchemaMissing(): void {
  fulfilment = false;
}

/** False once a read has proved the rating columns and table are not there.
 *
 *  Separate from the fulfilment flag because they arrive in separate
 *  migrations, and one being applied says nothing about the other. */
export function ratingsSchemaReady(): boolean {
  return ratings;
}

export function markRatingsSchemaMissing(): void {
  ratings = false;
}

let scheduleNotes = true;

/** False once a read has proved `coach_availability.note` is not there yet.
 *
 *  Its own flag for the same reason as the others: this column arrives in its
 *  own migration, and the schedule must still load without it. */
export function scheduleNotesSchemaReady(): boolean {
  return scheduleNotes;
}

export function markScheduleNotesSchemaMissing(): void {
  scheduleNotes = false;
}

let socials = true;

/** False once a read has proved the instagram/facebook/tiktok columns are not
 *  there yet. They land on `users` and `communities` in one migration, so one
 *  flag covers both. */
export function socialLinksSchemaReady(): boolean {
  return socials;
}

export function markSocialLinksSchemaMissing(): void {
  socials = false;
}

let community = true;

/** False once a read has proved the community-governance migration is not
 *  applied: privacy, sport_id, avatar_url, the join-request queue, the gallery
 *  and the suggestion inbox all arrive together, so one flag covers them. */
export function communitySchemaReady(): boolean {
  return community;
}

export function markCommunitySchemaMissing(): void {
  community = false;
}

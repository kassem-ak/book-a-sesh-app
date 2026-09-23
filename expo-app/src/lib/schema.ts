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

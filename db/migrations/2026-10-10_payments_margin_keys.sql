-- Payments: one commission rate per kind of thing paid for.
-- Courts and tournaments used to borrow the 'session' rate. Own file because a
-- new enum value cannot be used in the transaction that adds it.
alter type public.margin_key add value if not exists 'package';
alter type public.margin_key add value if not exists 'court';
alter type public.margin_key add value if not exists 'tournament';
alter type public.margin_key add value if not exists 'event';

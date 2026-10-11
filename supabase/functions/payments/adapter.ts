// The one shape every payment provider is wrapped in. The Test gateway is the
// only implementation today; Whish and a card gateway implement the same four
// calls later, so nothing outside this folder changes when they arrive.
export type Tokenised = { token: string; display: string; canPay: boolean; canReceive: boolean };
export type ChargeResult = { ok: true; ref: string; costCents: number } | { ok: false; message: string };
export type SendResult = { ok: true; ref: string; feeCents: number } | { ok: false; message: string };

export type MethodInput =
  | { kind: "card"; testCard: string }
  | { kind: "whish"; number: string };

export interface Gateway {
  tokenise(input: MethodInput): Promise<Tokenised>;
  charge(input: { token: string; amountCents: number; reference: string }): Promise<ChargeResult>;
  payout(input: { token: string; amountCents: number; reference: string }): Promise<SendResult>;
  refund(input: { chargeRef: string; amountCents: number; reference: string }): Promise<SendResult>;
}

/** A problem with what the member sent, safe to show them as is. */
export class InputError extends Error {}

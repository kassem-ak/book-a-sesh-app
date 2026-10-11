import { Gateway, InputError } from "./adapter.ts";

// Practice mode. No real money moves and no card number is ever entered: the
// member picks one of two preset cards, one that approves and one that declines.
const TEST_CARDS: Record<string, { token: string; display: string }> = {
  visa_ok: { token: "tok_test_visa_4242", display: "Visa ·· 4242 (test)" },
  visa_decline: { token: "tok_test_visa_0002", display: "Visa ·· 0002 (test, declines)" },
};

export const WHISH_NUMBER = /^\+?961\d{7,8}$/;

export const testGateway: Gateway = {
  async tokenise(input) {
    if (input.kind === "card") {
      const card = TEST_CARDS[input.testCard];
      if (!card) throw new InputError("Pick one of the test cards.");
      return { ...card, canPay: true, canReceive: false };
    }
    const number = input.number.replace(/[\s-]/g, "");
    if (!WHISH_NUMBER.test(number)) throw new InputError("Enter a Lebanese Whish number, like +961 71 123 456.");
    return { token: `tok_test_whish_${number}`, display: `Whish ·· ${number.slice(-4)} (test)`, canPay: true, canReceive: true };
  },
  async charge({ token }) {
    if (token === TEST_CARDS.visa_decline.token) return { ok: false, message: "The test card was declined. Try another method." };
    return { ok: true, ref: `test_ch_${crypto.randomUUID()}`, costCents: 0 };
  },
  async payout() {
    return { ok: true, ref: `test_po_${crypto.randomUUID()}`, feeCents: 0 };
  },
  async refund() {
    return { ok: true, ref: `test_rf_${crypto.randomUUID()}`, feeCents: 0 };
  },
};

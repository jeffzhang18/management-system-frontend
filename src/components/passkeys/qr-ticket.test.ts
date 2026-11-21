import { describe, expect, it } from "vitest";
import { parseQrTicket } from "./qr-ticket";

const session = "7d793330-8098-4ba7-97f5-bb139e2001e4";
const token = "a".repeat(43);
describe("QR confirmation links", () => {
	it("reads the scan credential from a fragment without accepting other URL destinations", () => {
		expect(parseQrTicket(`#session=${session}&token=${token}`)).toEqual({ sessionId: session, token });
	});
	it("rejects missing, malformed, or truncated scan credentials before making API calls", () => {
		for (const fragment of [
			"",
			`#session=${session}`,
			`#token=${token}`,
			`#session=invalid&token=${token}`,
			`#session=${session}&token=short`,
			`#session=${session}&token=${"/".repeat(43)}`,
		]) {
			expect(parseQrTicket(fragment)).toBeNull();
		}
	});
});

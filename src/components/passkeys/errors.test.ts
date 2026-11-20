import { describe, expect, it } from "vitest";
import { passkeyErrorKey } from "./errors";

describe("passkey failure guidance", () => {
	it("handles browser and wrapped library cancellations without showing a generic failure", () => {
		expect(passkeyErrorKey({ name: "NotAllowedError" })).toBe("sys.passkeys.cancelled");
		expect(passkeyErrorKey({ name: "WebAuthnError", cause: { name: "NotAllowedError" } })).toBe(
			"sys.passkeys.cancelled",
		);
		expect(passkeyErrorKey({ code: "ERROR_CEREMONY_ABORTED" })).toBe("sys.passkeys.cancelled");
	});
	it("offers a fallback for unsupported environments and duplicate enrollment", () => {
		expect(passkeyErrorKey({ code: "ERROR_INVALID_RP_ID" })).toBe("sys.passkeys.unsupported");
		expect(passkeyErrorKey({ name: "SecurityError" })).toBe("sys.passkeys.unsupported");
		expect(passkeyErrorKey({ code: "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED" })).toBe(
			"sys.passkeys.alreadyRegistered",
		);
	});
	it("does not expose server or authenticator diagnostics in the UI", () => {
		for (const error of [null, undefined, "private error", new Error("private diagnostics")]) {
			expect(passkeyErrorKey(error)).toBe("sys.passkeys.failed");
		}
	});
});

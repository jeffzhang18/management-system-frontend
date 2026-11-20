export function passkeyErrorKey(error: unknown) {
	const details = error && typeof error === "object" ? error : {};
	const name = "name" in details ? details.name : "";
	const code = "code" in details ? details.code : "";
	const cause = "cause" in details && details.cause && typeof details.cause === "object" ? details.cause : {};
	const causeName = "name" in cause ? cause.name : "";
	const names = [name, causeName];
	if (names.includes("NotAllowedError") || names.includes("AbortError") || code === "ERROR_CEREMONY_ABORTED") {
		return "sys.passkeys.cancelled";
	}
	if (names.includes("InvalidStateError") || code === "ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED") {
		return "sys.passkeys.alreadyRegistered";
	}
	if (
		names.includes("SecurityError") ||
		names.includes("NotSupportedError") ||
		code === "ERROR_INVALID_RP_ID" ||
		code === "ERROR_INVALID_DOMAIN"
	)
		return "sys.passkeys.unsupported";
	return "sys.passkeys.failed";
}

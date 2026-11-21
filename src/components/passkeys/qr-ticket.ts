import type { QrTicket } from "@/api/services/qrLoginService";

export function parseQrTicket(fragment: string): QrTicket | null {
	const params = new URLSearchParams(fragment.replace(/^#/, ""));
	const sessionId = params.get("session");
	const token = params.get("token");
	if (
		!sessionId ||
		!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId) ||
		!token ||
		!/^[A-Za-z0-9_-]{43}$/.test(token)
	)
		return null;
	return { sessionId, token };
}

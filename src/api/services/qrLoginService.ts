import type { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import apiClient from "../apiClient";
import type { SignInRes } from "./userService";

export type QrSession = {
	sessionId: string;
	desktopToken: string;
	qrUrl: string;
	verificationCode: string;
	expiresAt: string;
};
export type QrTicket = { sessionId: string; token: string };
export type QrStatus = {
	state: "waiting" | "approved" | "expired" | "cancelled" | "consumed";
	verificationCode: string;
	expiresAt: string;
};
const post = <T>(path: string, data?: unknown) =>
	apiClient.post<T>({ url: `/auth/qr-login/${path}`, data, suppressErrorToast: true });
export default {
	create: () => post<QrSession>("sessions"),
	status: (session: QrSession) =>
		post<QrStatus>("status", { sessionId: session.sessionId, token: session.desktopToken }),
	exchange: (session: QrSession) =>
		post<SignInRes>("exchange", { sessionId: session.sessionId, token: session.desktopToken }),
	cancel: (session: QrSession) =>
		post<{ cancelled: boolean }>("cancel", { sessionId: session.sessionId, token: session.desktopToken }),
	info: (ticket: QrTicket) => post<QrStatus>("info", ticket),
	options: (ticket: QrTicket) =>
		post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>("options", ticket),
	approve: (ticket: QrTicket, challengeId: string, response: AuthenticationResponseJSON) =>
		post<{ approved: boolean }>("approve", { ...ticket, challengeId, response }),
	reject: (ticket: QrTicket) => post<{ cancelled: boolean }>("reject", ticket),
};

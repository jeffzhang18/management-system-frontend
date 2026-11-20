import type {
	AuthenticationResponseJSON,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import apiClient from "../apiClient";
import type { SignInRes } from "./userService";

export type PasskeyMode = "local" | "phone";
export type PasskeyInfo = {
	id: string;
	name: string;
	createdAt: string;
	lastUsedAt: string | null;
	deviceType: string;
	backedUp: boolean;
};
const base = "/auth/passkeys";
const quiet = { suppressErrorToast: true };

export default {
	config: () => apiClient.get<{ enabled: boolean }>({ url: `${base}/config`, ...quiet }),
	list: () => apiClient.get<PasskeyInfo[]>({ url: base, ...quiet }),
	remove: (id: string) => apiClient.delete<{ deleted: boolean }>({ url: `${base}/${id}`, ...quiet }),
	sendRegistrationCode: () => apiClient.post<{ sent: boolean }>({ url: `${base}/register/code`, ...quiet }),
	registrationOptions: (mode: PasskeyMode) =>
		apiClient.post<{ challengeId: string; options: PublicKeyCredentialCreationOptionsJSON }>({
			url: `${base}/register/options`,
			data: { mode },
			...quiet,
		}),
	verifyRegistration: (data: { challengeId: string; response: RegistrationResponseJSON; name: string; code: string }) =>
		apiClient.post<{ verified: boolean }>({ url: `${base}/register/verify`, data, ...quiet }),
	authenticationOptions: (mode: PasskeyMode) =>
		apiClient.post<{ challengeId: string; options: PublicKeyCredentialRequestOptionsJSON }>({
			url: `${base}/login/options`,
			data: { mode },
			...quiet,
		}),
	verifyAuthentication: (data: { challengeId: string; response: AuthenticationResponseJSON }) =>
		apiClient.post<SignInRes>({ url: `${base}/login/verify`, data, ...quiet }),
};

import { browserSupportsWebAuthn, startAuthentication, WebAuthnAbortService } from "@simplewebauthn/browser";
import { useQuery } from "@tanstack/react-query";
import { Fingerprint, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import passkeyService from "@/api/services/passkeyService";
import { GLOBAL_CONFIG } from "@/global-config";
import { saveAuthSession, useUserActions } from "@/store/userStore";
import { Button } from "@/ui/button";
import { passkeyErrorKey } from "./errors";

export default function PasskeyLoginButton() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const actions = useUserActions();
	const [loading, setLoading] = useState(false);
	const pending = useRef(false);
	const active = useRef(true);
	useEffect(() => {
		active.current = true;
		return () => {
			active.current = false;
			if (pending.current) WebAuthnAbortService.cancelCeremony();
		};
	}, []);
	const supported = window.isSecureContext && browserSupportsWebAuthn();
	const config = useQuery({
		queryKey: ["passkey-config"],
		queryFn: passkeyService.config,
		retry: false,
		enabled: supported,
	});

	const login = async () => {
		if (pending.current) return;
		pending.current = true;
		setLoading(true);
		try {
			const { challengeId, options } = await passkeyService.authenticationOptions("local");
			if (!active.current) return;
			const response = await startAuthentication({ optionsJSON: options });
			if (!active.current) return;
			const result = await passkeyService.verifyAuthentication({ challengeId, response });
			if (!active.current) return;
			saveAuthSession(result, actions.setUserToken, actions.setUserInfo);
			navigate(GLOBAL_CONFIG.defaultRoute, { replace: true });
			toast.success(t("sys.login.loginSuccessTitle"));
		} catch (error) {
			if (active.current) toast.error(t(passkeyErrorKey(error)), { position: "top-center" });
		} finally {
			pending.current = false;
			if (active.current) setLoading(false);
		}
	};

	return (
		<div className="space-y-2">
			<Button
				type="button"
				variant="outline"
				className="w-full"
				disabled={!supported || loading || !config.data?.enabled}
				onClick={login}
			>
				{loading ? <Loader2 className="animate-spin" /> : <Fingerprint />}
				{t("sys.passkeys.loginButton")}
			</Button>
			<p className="text-xs text-muted-foreground">{t("sys.passkeys.localHint")}</p>
			{!supported && (
				<p className="text-xs text-muted-foreground" aria-live="polite">
					{t("sys.passkeys.unsupported")}
				</p>
			)}
			{supported && config.data?.enabled === false && (
				<p className="text-xs text-muted-foreground">{t("sys.passkeys.unavailable")}</p>
			)}
			{supported && config.isError && (
				<Button type="button" variant="link" onClick={() => config.refetch()}>
					{t("sys.passkeys.retry")}
				</Button>
			)}
		</div>
	);
}

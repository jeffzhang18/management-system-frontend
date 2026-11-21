import { browserSupportsWebAuthn, startAuthentication, WebAuthnAbortService } from "@simplewebauthn/browser";
import { CheckCircle2, Fingerprint, Loader2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import qrLoginService, { type QrStatus } from "@/api/services/qrLoginService";
import LocalePicker from "@/components/locale-picker";
import { passkeyErrorKey } from "@/components/passkeys/errors";
import { parseQrTicket } from "@/components/passkeys/qr-ticket";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

type State = QrStatus["state"] | "loading" | "failed" | "invalid";
export default function QrConfirmPage() {
	const { t } = useTranslation();
	const [ticket] = useState(() => parseQrTicket(window.location.hash));
	const [status, setStatus] = useState<QrStatus | null>(null);
	const [state, setState] = useState<State>(ticket ? "loading" : "invalid");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const pending = useRef(false);
	const active = useRef(true);
	const supported = window.isSecureContext && browserSupportsWebAuthn();

	useLayoutEffect(() => {
		// Keep the scan secret out of browser history and subsequent analytics events.
		window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
	}, []);
	useEffect(() => {
		active.current = true;
		if (ticket)
			void qrLoginService
				.info(ticket)
				.then((result) => {
					if (active.current) {
						setStatus(result);
						setState(result.state);
					}
				})
				.catch(() => {
					if (active.current) setState("invalid");
				});
		return () => {
			active.current = false;
			if (pending.current) WebAuthnAbortService.cancelCeremony();
		};
	}, [ticket]);
	useEffect(() => {
		if (!status || state !== "waiting") return;
		const timer = window.setInterval(() => {
			if (Date.now() >= new Date(status.expiresAt).getTime()) setState("expired");
		}, 1000);
		return () => window.clearInterval(timer);
	}, [state, status]);

	const approve = async () => {
		if (!ticket || pending.current) return;
		pending.current = true;
		setBusy(true);
		setError("");
		try {
			const { challengeId, options } = await qrLoginService.options(ticket);
			if (!active.current) return;
			const response = await startAuthentication({ optionsJSON: options });
			if (!active.current) return;
			await qrLoginService.approve(ticket, challengeId, response);
			if (active.current) setState("approved");
		} catch (cause) {
			if (active.current) setError(passkeyErrorKey(cause));
		} finally {
			pending.current = false;
			if (active.current) setBusy(false);
		}
	};
	const reject = async () => {
		if (!ticket || pending.current) return;
		pending.current = true;
		setBusy(true);
		try {
			await qrLoginService.reject(ticket);
			setState("cancelled");
		} catch {
			setError("sys.qrLogin.failed");
		} finally {
			pending.current = false;
			setBusy(false);
		}
	};

	return (
		<main className="grid min-h-svh place-items-center bg-background p-6">
			<div className="absolute right-3 top-3">
				<LocalePicker />
			</div>
			<Card className="w-full max-w-md">
				<CardContent className="space-y-5 text-center">
					<h1 className="text-2xl font-bold">{t("sys.qrLogin.confirmTitle")}</h1>
					{state === "loading" ? (
						<Loader2 className="mx-auto animate-spin" />
					) : state === "waiting" && status ? (
						<>
							<p className="text-sm">{t("sys.qrLogin.confirmDescription")}</p>
							<div className="rounded-lg border p-4">
								<p className="text-sm text-muted-foreground">{t("sys.qrLogin.pairCode")}</p>
								<p className="mt-2 font-mono text-3xl tracking-widest">{status.verificationCode}</p>
							</div>
							<p className="text-sm text-muted-foreground">{t("sys.qrLogin.confirmWarning")}</p>
							{supported ? (
								<Button type="button" className="w-full" disabled={busy} onClick={approve}>
									{busy ? <Loader2 className="animate-spin" /> : <Fingerprint />}
									{t("sys.qrLogin.verifyAndApprove")}
								</Button>
							) : (
								<p>{t("sys.passkeys.unsupported")}</p>
							)}
							<Button type="button" variant="outline" className="w-full" disabled={busy} onClick={reject}>
								{t("sys.qrLogin.reject")}
							</Button>
						</>
					) : state === "approved" || state === "consumed" ? (
						<>
							<CheckCircle2 className="mx-auto text-green-600" size={48} />
							<p>{t("sys.qrLogin.phoneApproved")}</p>
						</>
					) : (
						<p>{t(`sys.qrLogin.${state}`)}</p>
					)}
					{error && (
						<p role="alert" className="text-sm text-destructive">
							{t(error)}
						</p>
					)}
					<p className="text-xs text-muted-foreground">{t("sys.qrLogin.phoneRequirement")}</p>
					<Link to="/auth/login" className="text-sm underline">
						{t("sys.login.backSignIn")}
					</Link>
				</CardContent>
			</Card>
		</main>
	);
}

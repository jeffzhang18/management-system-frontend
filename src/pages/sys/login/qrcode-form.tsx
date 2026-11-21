import { Loader2, RefreshCw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import qrLoginService, { type QrSession, type QrStatus } from "@/api/services/qrLoginService";
import { GLOBAL_CONFIG } from "@/global-config";
import { saveAuthSession, useUserActions } from "@/store/userStore";
import { Button } from "@/ui/button";
import { ReturnButton } from "./components/ReturnButton";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

type State = QrStatus["state"] | "loading" | "failed";
function QrCodeForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin, setLoginState } = useLoginStateContext();
	const actions = useUserActions();
	const navigate = useNavigate();
	const context = useRef({ actions, navigate, t });
	context.current = { actions, navigate, t };
	const [generation, setGeneration] = useState(0);
	const [session, setSession] = useState<QrSession | null>(null);
	const [state, setState] = useState<State>("loading");
	const [now, setNow] = useState(Date.now());

	// biome-ignore lint/correctness/useExhaustiveDependencies: generation explicitly replaces the one-time QR session when Refresh is clicked.
	useEffect(() => {
		if (loginState !== LoginStateEnum.QR_CODE) return;
		let active = true;
		let current: QrSession | null = null;
		let timer: ReturnType<typeof setTimeout>;
		setState("loading");
		setSession(null);
		const poll = async () => {
			if (!current || !active) return;
			try {
				const result = await qrLoginService.status(current);
				if (!active) return;
				setState(result.state);
				if (result.state === "approved") {
					const payload = await qrLoginService.exchange(current);
					if (!active) return;
					const { actions: store, navigate: go, t: translate } = context.current;
					saveAuthSession(payload, store.setUserToken, store.setUserInfo);
					go(GLOBAL_CONFIG.defaultRoute, { replace: true });
					toast.success(translate("sys.login.loginSuccessTitle"));
				} else if (result.state === "waiting") {
					timer = setTimeout(poll, 2000);
				}
			} catch {
				if (active) setState("failed");
			}
		};
		void qrLoginService
			.create()
			.then((result) => {
				current = result;
				if (!active) {
					void qrLoginService.cancel(result).catch(() => {});
					return;
				}
				setSession(result);
				setState("waiting");
				setNow(Date.now());
				timer = setTimeout(poll, 1500);
			})
			.catch(() => {
				if (active) setState("failed");
			});
		const clock = setInterval(() => setNow(Date.now()), 1000);
		return () => {
			active = false;
			clearTimeout(timer);
			clearInterval(clock);
			if (current) void qrLoginService.cancel(current).catch(() => {});
		};
	}, [loginState, generation]);

	if (loginState !== LoginStateEnum.QR_CODE) return null;
	const seconds = session ? Math.max(0, Math.ceil((new Date(session.expiresAt).getTime() - now) / 1000)) : 0;
	const visibleState = state === "waiting" && seconds === 0 ? "expired" : state;
	return (
		<div className="space-y-4 text-center">
			<h1 className="text-2xl font-bold">{t("sys.qrLogin.title")}</h1>
			<p className="text-sm text-muted-foreground">{t("sys.qrLogin.description")}</p>
			<div className="flex min-h-64 items-center justify-center rounded-xl border p-4">
				{visibleState === "waiting" && session ? (
					<div className="rounded-lg bg-white p-3">
						<QRCodeSVG value={session.qrUrl} size={220} level="M" marginSize={2} />
					</div>
				) : visibleState === "loading" || visibleState === "approved" ? (
					<Loader2 className="animate-spin" size={36} />
				) : (
					<p>{t(`sys.qrLogin.${visibleState}`)}</p>
				)}
			</div>
			{visibleState === "waiting" && session && (
				<>
					<p className="text-sm">
						{t("sys.qrLogin.pairCode")}
						<strong className="ml-2 font-mono text-xl tracking-widest">{session.verificationCode}</strong>
					</p>
					<p className="text-xs text-muted-foreground">{t("sys.qrLogin.expiresIn", { seconds })}</p>
				</>
			)}
			{visibleState === "approved" && <p>{t("sys.qrLogin.approved")}</p>}
			<p className="text-xs text-muted-foreground">{t("sys.qrLogin.requirement")}</p>
			<Button
				type="button"
				variant="outline"
				className="w-full"
				disabled={state === "loading" || state === "approved"}
				onClick={() => setGeneration((value) => value + 1)}
			>
				<RefreshCw size={16} />
				{t("sys.qrLogin.refresh")}
			</Button>
			<Button type="button" variant="link" className="w-full" onClick={() => setLoginState(LoginStateEnum.EMAIL_CODE)}>
				{t("sys.login.emailCodeSignInTitle")}
			</Button>
			<ReturnButton onClick={backToLogin} />
		</div>
	);
}
export default QrCodeForm;

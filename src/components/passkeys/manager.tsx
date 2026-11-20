import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import passkeyService, { type PasskeyMode } from "@/api/services/passkeyService";
import { useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { passkeyErrorKey } from "./errors";

export default function PasskeyManager() {
	const { t, i18n } = useTranslation();
	const user = useUserInfo();
	const queryClient = useQueryClient();
	const queryKey = ["passkeys", user.id];
	const keys = useQuery({ queryKey, queryFn: passkeyService.list, retry: false });
	const config = useQuery({ queryKey: ["passkey-config"], queryFn: passkeyService.config, retry: false });
	const [name, setName] = useState("");
	const [code, setCode] = useState("");
	const [mode, setMode] = useState<PasskeyMode>("local");
	const [busy, setBusy] = useState(false);
	const pending = useRef(false);
	const cooldownKey = `passkey-code-available-at:${user.id}`;
	const remaining = useCallback(() => {
		const timestamp = Number(localStorage.getItem(cooldownKey) || 0);
		return Number.isFinite(timestamp) ? Math.max(0, Math.ceil((timestamp - Date.now()) / 1000)) : 0;
	}, [cooldownKey]);
	const [countdown, setCountdown] = useState(remaining);
	useEffect(() => {
		const update = () => setCountdown(remaining());
		update();
		const timer = window.setInterval(update, 1000);
		return () => window.clearInterval(timer);
	}, [remaining]);

	const supported = window.isSecureContext && browserSupportsWebAuthn();
	const enabled = supported && config.data?.enabled;
	const sendCode = async () => {
		if (pending.current || remaining() > 0) return;
		pending.current = true;
		setBusy(true);
		try {
			await passkeyService.sendRegistrationCode();
			localStorage.setItem(cooldownKey, String(Date.now() + 60000));
			setCountdown(60);
			toast.success(t("sys.login.codeSent"));
		} catch (error) {
			toast.error(t(passkeyErrorKey(error)));
		} finally {
			pending.current = false;
			setBusy(false);
		}
	};

	const register = async (event: React.FormEvent) => {
		event.preventDefault();
		if (pending.current) return;
		if (!/^\d{6}$/.test(code)) {
			toast.error(t("sys.login.codeInvalid"));
			return;
		}
		pending.current = true;
		setBusy(true);
		try {
			const { challengeId, options } = await passkeyService.registrationOptions(mode);
			const response = await startRegistration({ optionsJSON: options });
			await passkeyService.verifyRegistration({
				challengeId,
				response,
				code,
				name: name.trim() || t("sys.passkeys.defaultName"),
			});
			setCode("");
			setName("");
			await queryClient.invalidateQueries({ queryKey });
			toast.success(t("sys.passkeys.registered"));
		} catch (error) {
			toast.error(t(passkeyErrorKey(error)));
		} finally {
			pending.current = false;
			setBusy(false);
		}
	};

	const remove = async (id: string) => {
		if (pending.current || !window.confirm(t("sys.passkeys.deleteConfirm"))) return;
		pending.current = true;
		setBusy(true);
		try {
			await passkeyService.remove(id);
			await queryClient.invalidateQueries({ queryKey });
			toast.success(t("sys.passkeys.deleted"));
		} catch (error) {
			toast.error(t(passkeyErrorKey(error)));
		} finally {
			pending.current = false;
			setBusy(false);
		}
	};

	return (
		<Card>
			<CardContent className="space-y-5">
				<div className="space-y-2">
					<h3 className="flex items-center gap-2 font-semibold">
						<Fingerprint size={20} />
						{t("sys.passkeys.title")}
					</h3>
					<p className="text-sm text-muted-foreground">{t("sys.passkeys.description")}</p>
					<p className="text-sm text-muted-foreground">{t("sys.passkeys.phoneSetup")}</p>
				</div>
				{!supported && (
					<p aria-live="polite" className="text-sm text-muted-foreground">
						{t("sys.passkeys.unsupported")}
					</p>
				)}
				{config.data?.enabled === false && (
					<p aria-live="polite" className="text-sm text-muted-foreground">
						{t("sys.passkeys.unavailable")}
					</p>
				)}
				{(keys.isError || config.isError) && (
					<div role="alert" className="space-y-2">
						<p className="text-sm">{t("sys.passkeys.loadFailed")}</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								void keys.refetch();
								void config.refetch();
							}}
						>
							{t("sys.passkeys.retry")}
						</Button>
					</div>
				)}
				{(keys.isPending || config.isPending) && <p aria-live="polite">{t("sys.passkeys.loading")}</p>}
				{keys.data?.length === 0 && <p className="text-sm text-muted-foreground">{t("sys.passkeys.empty")}</p>}
				<ul className="space-y-3">
					{keys.data?.map((key) => (
						<li key={key.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
							<div className="min-w-0 space-y-1">
								<p className="break-words font-medium">{key.name}</p>
								<p className="text-xs text-muted-foreground">
									{t("sys.passkeys.createdAt", {
										date: new Date(key.createdAt).toLocaleDateString(i18n.language.replace("_", "-")),
									})}
								</p>
								<p className="text-xs text-muted-foreground">
									{key.lastUsedAt
										? t("sys.passkeys.lastUsedAt", {
												date: new Date(key.lastUsedAt).toLocaleString(i18n.language.replace("_", "-")),
											})
										: t("sys.passkeys.neverUsed")}
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="icon"
								disabled={busy}
								aria-label={t("sys.passkeys.deleteKey", { name: key.name })}
								onClick={() => remove(key.id)}
							>
								<Trash2 size={16} />
							</Button>
						</li>
					))}
				</ul>
				<form onSubmit={register} className="space-y-4 border-t pt-4">
					<div className="space-y-2">
						<label htmlFor="passkey-name" className="text-sm font-medium">
							{t("sys.passkeys.name")}
						</label>
						<Input
							id="passkey-name"
							value={name}
							onChange={(event) => setName(event.target.value)}
							maxLength={100}
							disabled={busy || !enabled}
							placeholder={t("sys.passkeys.namePlaceholder")}
						/>
					</div>
					<fieldset className="space-y-2" disabled={busy || !enabled}>
						<legend className="text-sm font-medium">{t("sys.passkeys.saveTo")}</legend>
						<div className="flex flex-wrap gap-4 text-sm">
							<label className="flex items-center gap-2">
								<input type="radio" name="passkey-mode" checked={mode === "local"} onChange={() => setMode("local")} />
								{t("sys.passkeys.thisDevice")}
							</label>
							<label className="flex items-center gap-2">
								<input type="radio" name="passkey-mode" checked={mode === "phone"} onChange={() => setMode("phone")} />
								{t("sys.passkeys.otherPhone")}
							</label>
						</div>
					</fieldset>
					<div className="space-y-2">
						<label htmlFor="passkey-code" className="text-sm font-medium">
							{t("sys.passkeys.emailCode", { email: user.email })}
						</label>
						<div className="flex gap-2">
							<Input
								id="passkey-code"
								value={code}
								onChange={(event) => setCode(event.target.value)}
								inputMode="numeric"
								autoComplete="one-time-code"
								pattern="[0-9]{6}"
								maxLength={6}
								required
								disabled={busy || !enabled}
								placeholder={t("sys.login.codePlaceholder")}
							/>
							<Button type="button" variant="outline" disabled={busy || countdown > 0 || !enabled} onClick={sendCode}>
								{countdown > 0 ? t("sys.login.resendIn", { seconds: countdown }) : t("sys.login.sendCode")}
							</Button>
						</div>
					</div>
					<Button type="submit" disabled={busy || !enabled || (keys.data?.length ?? 0) >= 10}>
						{busy && <Loader2 className="animate-spin" />}
						{t("sys.passkeys.add")}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

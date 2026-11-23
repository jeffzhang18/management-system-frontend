import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import userService, { type EmailCodeSignInReq } from "@/api/services/userService";
import { GLOBAL_CONFIG } from "@/global-config";
import { useEmailCodeSignIn } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "antd";
import { ReturnButton } from "./components/ReturnButton";
import { EmailInput } from "./email-input";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

const CODE_COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = "login-email-code-available-at";

const getRemainingSeconds = () => {
	const availableAt = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
	return Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
};

function EmailCodeForm() {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const signIn = useEmailCodeSignIn();
	const { loginState, backToLogin } = useLoginStateContext();
	const [countdown, setCountdown] = useState(getRemainingSeconds);
	const [sending, setSending] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			code: "",
		},
	});

	useEffect(() => {
		if (countdown <= 0) return;
		const timer = window.setTimeout(() => setCountdown(getRemainingSeconds()), 1000);
		return () => window.clearTimeout(timer);
	}, [countdown]);

	const sendCode = useCallback(async () => {
		if (sending || getRemainingSeconds() > 0) return;
		const valid = await form.trigger("email");
		const email = form.getValues("email").trim();
		if (!valid || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			toast.error(t("sys.login.emailInvalid"), { position: "top-center" });
			return;
		}
		setSending(true);
		try {
			await userService.sendLoginCode(email);
			localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + CODE_COOLDOWN_SECONDS * 1000));
			setCountdown(CODE_COOLDOWN_SECONDS);
			toast.success(t("sys.login.loginCodeSent"), { position: "top-center" });
		} catch {
			// The API client displays the error; allow sending again.
		} finally {
			setSending(false);
		}
	}, [form, sending, t]);

	const onFinish = async (values: EmailCodeSignInReq) => {
		try {
			await signIn({ email: values.email.trim(), code: values.code.trim() });
			navigate(GLOBAL_CONFIG.defaultRoute, { replace: true });
			toast.success(t("sys.login.loginSuccessTitle"), { closeButton: true });
		} catch {
			// The API client displays the error; preserve inputs for a retry.
		}
	};

	if (loginState !== LoginStateEnum.EMAIL_CODE) return null;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{t("sys.login.emailCodeSignInTitle")}</h1>
					<p className="text-sm text-muted-foreground">{t("sys.login.emailCodeSignInDescription")}</p>
				</div>

				<FormField
					control={form.control}
					name="email"
					rules={{
						required: t("sys.login.emaildPlaceholder"),
						validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || t("sys.login.emailInvalid"),
					}}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("sys.login.email")}</FormLabel>
							<FormControl>
								<EmailInput
									disabled={sending || form.formState.isSubmitting}
									placeholder={t("sys.login.email")}
									value={field.value}
									onChange={field.onChange}
									onBlur={field.onBlur}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="code"
					rules={{
						required: t("sys.login.codePlaceholder"),
						pattern: { value: /^\d{6}$/, message: t("sys.login.codeInvalid") },
					}}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("sys.login.code")}</FormLabel>
							<div className="flex gap-2">
								<FormControl>
									<Input
										disabled={form.formState.isSubmitting}
										allowClear
										autoComplete="one-time-code"
										inputMode="numeric"
										maxLength={6}
										placeholder={t("sys.login.code")}
										{...field}
									/>
								</FormControl>
								<Button
									type="button"
									variant="outline"
									className="shrink-0"
									disabled={sending || countdown > 0 || form.formState.isSubmitting}
									onClick={sendCode}
								>
									{sending && <Loader2 className="animate-spin" />}
									{countdown > 0 ? t("sys.login.resendIn", { seconds: countdown }) : t("sys.login.sendCode")}
								</Button>
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full" disabled={form.formState.isSubmitting || sending}>
					{form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
					{t("sys.login.loginButton")}
				</Button>

				<ReturnButton onClick={backToLogin} />
			</form>
		</Form>
	);
}

export default EmailCodeForm;

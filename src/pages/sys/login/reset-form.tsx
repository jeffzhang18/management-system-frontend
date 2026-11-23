import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import userService, { type ResetPasswordReq } from "@/api/services/userService";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "antd";
import { ReturnButton } from "./components/ReturnButton";
import { EmailInput } from "./email-input";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

const CODE_COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = "reset-password-code-available-at";

const getRemainingSeconds = () => {
	const availableAt = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
	return Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
};

function ResetForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();
	const [countdown, setCountdown] = useState(getRemainingSeconds);
	const [sending, setSending] = useState(false);

	const form = useForm({
		defaultValues: {
			email: "",
			code: "",
			password: "",
			confirmPassword: "",
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
			await userService.sendResetPasswordCode(email);
			localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + CODE_COOLDOWN_SECONDS * 1000));
			setCountdown(CODE_COOLDOWN_SECONDS);
			toast.success(t("sys.login.resetCodeSent"), { position: "top-center" });
		} catch {
			// The API client displays the error; allow sending again.
		} finally {
			setSending(false);
		}
	}, [form, sending, t]);

	const onFinish = async (values: ResetPasswordReq & { confirmPassword: string }) => {
		try {
			await userService.resetPassword({
				email: values.email.trim(),
				password: values.password,
				code: values.code.trim(),
			});
			form.reset();
			toast.success(t("sys.login.resetPasswordSuccess"), { position: "top-center" });
			backToLogin();
		} catch {
			// The API client displays the error; preserve inputs for a retry.
		}
	};

	if (loginState !== LoginStateEnum.RESET_PASSWORD) return null;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{t("sys.login.forgetFormTitle")}</h1>
					<p className="text-sm text-muted-foreground">{t("sys.login.forgetFormSecondTitle")}</p>
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

				<FormField
					control={form.control}
					name="password"
					rules={{
						required: t("sys.login.passwordPlaceholder"),
						minLength: { value: 6, message: t("sys.login.passwordLength") },
						maxLength: { value: 72, message: t("sys.login.passwordLength") },
					}}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("sys.login.newPassword")}</FormLabel>
							<FormControl>
								<Input.Password
									allowClear
									autoComplete="new-password"
									placeholder={t("sys.login.newPassword")}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="confirmPassword"
					rules={{
						required: t("sys.login.confirmPasswordPlaceholder"),
						validate: (value) => value === form.getValues("password") || t("sys.login.diffPwd"),
					}}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("sys.login.confirmPassword")}</FormLabel>
							<FormControl>
								<Input.Password
									allowClear
									autoComplete="new-password"
									placeholder={t("sys.login.confirmPassword")}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full" disabled={form.formState.isSubmitting || sending}>
					{form.formState.isSubmitting && <Loader2 className="mr-2 animate-spin" />}
					{t("sys.login.resetPasswordButton")}
				</Button>

				<ReturnButton onClick={backToLogin} />
			</form>
		</Form>
	);
}

export default ResetForm;

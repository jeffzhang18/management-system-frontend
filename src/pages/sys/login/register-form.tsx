import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import userService, { type SignUpReq } from "@/api/services/userService";
import { useSignUp } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "antd";
import { ReturnButton } from "./components/ReturnButton";
import { EmailInput } from "./email-input";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

const CODE_COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = "register-code-available-at";

const getRemainingSeconds = () => {
	const availableAt = Number(localStorage.getItem(COOLDOWN_STORAGE_KEY) || 0);
	return Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
};

function RegisterForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();
	const signUp = useSignUp();
	const [countdown, setCountdown] = useState(getRemainingSeconds);
	const [sending, setSending] = useState(false);

	const form = useForm({
		defaultValues: {
			username: "",
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
			await userService.sendRegisterCode(email);
			localStorage.setItem(COOLDOWN_STORAGE_KEY, String(Date.now() + CODE_COOLDOWN_SECONDS * 1000));
			setCountdown(CODE_COOLDOWN_SECONDS);
			toast.success(t("sys.login.codeSent"), { position: "top-center" });
		} finally {
			setSending(false);
		}
	}, [form, sending, t]);

	const onFinish = async (values: any) => {
		const signUpReq: SignUpReq = {
			email: values.email.trim(),
			userName: values.username,
			password: values.password,
			code: values.code.trim(),
		};

		const res = await signUp(signUpReq);
		if (res) backToLogin();
	};

	if (loginState !== LoginStateEnum.REGISTER) return null;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{t("sys.login.signUpFormTitle")}</h1>
				</div>

				<FormField
					control={form.control}
					name="username"
					rules={{ required: t("sys.login.accountPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("sys.login.userName")}</FormLabel>
							<FormControl>
								<Input allowClear placeholder={t("sys.login.userName")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="email"
					rules={{ required: t("sys.login.emaildPlaceholder") }}
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
									<Input allowClear inputMode="numeric" maxLength={6} placeholder={t("sys.login.code")} {...field} />
								</FormControl>
								<Button
									type="button"
									variant="outline"
									className="shrink-0"
									disabled={sending || countdown > 0}
									onClick={sendCode}
								>
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
					rules={{ required: t("sys.login.passwordPlaceholder") }}
					render={({ field }) => (
						<FormItem>
							<FormLabel>{t("sys.login.password")}</FormLabel>
							<FormControl>
								<Input.Password allowClear placeholder={t("sys.login.password")} {...field} />
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
								<Input.Password allowClear placeholder={t("sys.login.confirmPassword")} {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full">
					{t("sys.login.registerButton")}
				</Button>

				<div className="mb-2 text-xs text-gray">
					<span>{t("sys.login.registerAndAgree")}</span>
					<a href="./" className="text-sm underline! text-primary!">
						{t("sys.login.termsOfService")}
					</a>
					{" & "}
					<a href="./" className="text-sm underline! text-primary!">
						{t("sys.login.privacyPolicy")}
					</a>
				</div>

				<ReturnButton onClick={backToLogin} />
			</form>
		</Form>
	);
}

export default RegisterForm;

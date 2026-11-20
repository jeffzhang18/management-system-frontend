import { ScanQrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import PasskeyLoginButton from "@/components/passkeys/login-button";
import { Button } from "@/ui/button";
import { ReturnButton } from "./components/ReturnButton";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

function QrCodeForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin, setLoginState } = useLoginStateContext();
	if (loginState !== LoginStateEnum.QR_CODE) return null;
	return (
		<div className="space-y-5">
			<div className="flex flex-col items-center gap-3 text-center">
				<ScanQrCode size={56} className="text-primary" />
				<h1 className="text-2xl font-bold">{t("sys.passkeys.scanTitle")}</h1>
				<p className="text-sm text-muted-foreground">{t("sys.passkeys.scanDescription")}</p>
			</div>
			<ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
				<li>{t("sys.passkeys.scanStep1")}</li>
				<li>{t("sys.passkeys.scanStep2")}</li>
				<li>{t("sys.passkeys.scanStep3")}</li>
			</ol>
			<PasskeyLoginButton mode="phone" />
			<p className="text-xs text-muted-foreground">{t("sys.passkeys.scanRequirement")}</p>
			<Button type="button" variant="link" className="w-full" onClick={() => setLoginState(LoginStateEnum.EMAIL_CODE)}>
				{t("sys.login.emailCodeSignInTitle")}
			</Button>
			<ReturnButton onClick={backToLogin} />
		</div>
	);
}
export default QrCodeForm;

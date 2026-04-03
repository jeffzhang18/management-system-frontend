import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import GeneralTab from "./general-tab";
import NotificationsTab from "./notifications-tab";
import SecurityTab from "./security-tab";

function UserAccount() {
	const { t } = useTranslation();

	return (
		<Tabs defaultValue="1" orientation="vertical">
			<TabsList>
				<TabsTrigger value="1">
					<div className="flex items-center">
						<Icon icon="solar:user-id-bold" size={24} className="mr-2" />
						<span>{t("sys.account.tabs.general")}</span>
					</div>
				</TabsTrigger>
				<TabsTrigger value="2">
					<div className="flex items-center">
						<Icon icon="solar:bell-bing-bold-duotone" size={24} className="mr-2" />
						<span>{t("sys.account.tabs.notifications")}</span>
					</div>
				</TabsTrigger>
				<TabsTrigger value="3">
					<div className="flex items-center">
						<Icon icon="solar:key-minimalistic-square-3-bold-duotone" size={24} className="mr-2" />
						<span>{t("sys.account.tabs.security")}</span>
					</div>
				</TabsTrigger>
			</TabsList>
			<TabsContent value="1">
				<GeneralTab />
			</TabsContent>
			<TabsContent value="2">
				<NotificationsTab />
			</TabsContent>
			<TabsContent value="3">
				<SecurityTab />
			</TabsContent>
		</Tabs>
	);
}

export default UserAccount;

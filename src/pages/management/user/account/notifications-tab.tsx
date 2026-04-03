import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Card, CardContent, CardFooter } from "@/ui/card";
import { Switch } from "@/ui/switch";

export default function NotificationsTab() {
	const { t } = useTranslation();

	const handleClick = () => {
		toast.success(t("sys.account.messages.updateSuccess"));
	};

	return (
		<Card>
			<CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div className="flex-1">
					<h4>{t("sys.account.notifications.activity.title")}</h4>
					<p className="text-text-secondary">{t("sys.account.notifications.activity.description")}</p>
				</div>
				<div className="flex-2">
					<div className="flex w-full flex-col gap-4 rounded-lg px-6 py-8 bg-bg-neutral">
						<div className="flex w-full justify-between">
							<div>{t("sys.account.notifications.activity.items.formAnswer")}</div>
							<Switch defaultChecked />
						</div>
						<div className="flex w-full justify-between">
							<div>{t("sys.account.notifications.activity.items.articleComment")}</div>
							<Switch />
						</div>
						<div className="flex w-full justify-between">
							<div>{t("sys.account.notifications.activity.items.newFollower")}</div>
							<Switch defaultChecked />
						</div>
					</div>
				</div>

				<div className="flex-1">
					<h4>{t("sys.account.notifications.applications.title")}</h4>
					<p className="text-text-secondary">{t("sys.account.notifications.applications.description")}</p>
				</div>
				<div className="flex-2">
					<div className="flex w-full flex-col gap-4 rounded-lg px-6 py-8 bg-bg-neutral">
						<div className="flex w-full justify-between">
							<div>{t("sys.account.notifications.applications.items.news")}</div>
							<Switch />
						</div>
						<div className="flex w-full justify-between">
							<div>{t("sys.account.notifications.applications.items.productUpdates")}</div>
							<Switch defaultChecked />
						</div>
						<div className="flex w-full justify-between">
							<div>{t("sys.account.notifications.applications.items.blogDigest")}</div>
							<Switch />
						</div>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex w-full justify-end">
				<Button onClick={handleClick}>{t("sys.account.actions.saveChanges")}</Button>
			</CardFooter>
		</Card>
	);
}

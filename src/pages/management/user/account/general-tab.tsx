import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { UserInfo } from "#/entity";
import { StorageEnum } from "#/enum";
import userService from "@/api/services/userService";
import { UploadAvatar } from "@/components/upload";
import { useUserActions, useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent, CardFooter } from "@/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Textarea } from "@/ui/textarea";
import { Text } from "@/ui/typography";

type FieldType = {
	name?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	code?: string;
	about: string;
};

export default function GeneralTab() {
	const { t } = useTranslation();
	const userInfo = useUserInfo();
	const { setUserInfo } = useUserActions();
	const { avatar, username, email } = userInfo;

	const currentUserId = useMemo(
		() => userInfo.user_id || localStorage.getItem(StorageEnum.UserId) || userInfo.id || "",
		[userInfo.id, userInfo.user_id],
	);

	const form = useForm<FieldType>({
		defaultValues: {
			name: username || "",
			email: email || "",
			phone: userInfo.contact || "",
			address: "",
			city: userInfo.country || "",
			code: "",
			about: userInfo.about || "",
		},
	});

	useEffect(() => {
		form.reset({
			name: userInfo.name || userInfo.username || "",
			email: userInfo.email || "",
			phone: userInfo.contact || "",
			address: "",
			city: userInfo.country || "",
			code: "",
			about: userInfo.about || "",
		});
	}, [form, userInfo.about, userInfo.contact, userInfo.country, userInfo.email, userInfo.name, userInfo.username]);

	const handleSubmit = async (values: FieldType) => {
		if (!currentUserId) {
			toast.error(t("sys.account.messages.missingUser"));
			return;
		}

		try {
			await userService.updateById(currentUserId, {
				name: values.name,
				email: values.email,
				contact: values.phone,
				country: values.city,
				about: values.about,
				address: values.address,
				code: values.code,
			});

			setUserInfo({
				...userInfo,
				name: values.name,
				email: values.email,
				contact: values.phone,
				country: values.city,
				about: values.about,
			} as UserInfo);
			toast.success(t("sys.account.messages.updateSuccess"));
		} catch {}
	};

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div className="col-span-1">
				<Card className="flex-col items-center px-6! pb-10! pt-20!">
					<UploadAvatar defaultAvatar={avatar} />

					<div className="flex items-center py-6 gap-2 w-40">
						<Text variant="body1">{t("sys.account.general.publicProfile")}</Text>
						<Switch />
					</div>

					<Button variant="destructive" className="w-40">
						{t("sys.account.general.deleteUser")}
					</Button>
				</Card>
			</div>
			<div className="col-span-1">
				<Card>
					<CardContent>
						<Form {...form}>
							<form onSubmit={form.handleSubmit(handleSubmit)}>
								<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.username")}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="email"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.email")}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="phone"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.phone")}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="address"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.address")}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="city"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.city")}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="code"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.code")}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
								</div>
								<div className="mt-4">
									<FormField
										control={form.control}
										name="about"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.about")}</FormLabel>
												<FormControl>
													<Textarea {...field} />
												</FormControl>
											</FormItem>
										)}
									/>
								</div>
								<CardFooter className="flex justify-end px-0">
									<Button type="submit">{t("sys.account.actions.saveChanges")}</Button>
								</CardFooter>
							</form>
						</Form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

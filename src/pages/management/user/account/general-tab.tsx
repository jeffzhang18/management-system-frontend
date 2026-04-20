import { useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { UserInfo } from "#/entity";
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
	userName?: string;
	phone?: string;
	country?: string;
	city?: string;
	about: string;
};

export default function GeneralTab() {
	const { t } = useTranslation();
	const userInfo = useUserInfo();
	const { setUserInfo } = useUserActions();
	const { avatar, username, isPublic } = userInfo;

	const form = useForm<FieldType>({
		defaultValues: {
			userName: username || "",
			phone: userInfo.contact || "",
			country: userInfo.country || "",
			city: userInfo.city || "",
			about: userInfo.about || "",
		},
	});

	useEffect(() => {
		form.reset({
			userName: userInfo.username || userInfo.user_name || "",
			phone: userInfo.contact || "",
			country: userInfo.country || "",
			city: userInfo.city || "",
			about: userInfo.about || "",
		});
	}, [form, userInfo.about, userInfo.city, userInfo.contact, userInfo.country, userInfo.user_name, userInfo.username]);

	const publicProfileMutation = useMutation({
		mutationFn: (checked: boolean) => userService.updateProfile({ isPublic: checked }),
		onSuccess: (profile, checked) => {
			setUserInfo({
				...userInfo,
				...profile,
				isPublic: profile?.isPublic ?? checked,
			} as UserInfo);
			toast.success(t("sys.account.messages.updateSuccess"));
		},
	});

	const handleSubmit = async (values: FieldType) => {
		try {
			const profile = await userService.updateProfile({
				userName: values.userName,
				contact: values.phone,
				country: values.country,
				city: values.city,
				about: values.about,
				avatar,
			});

			setUserInfo({
				...userInfo,
				...profile,
				username: profile?.username ?? values.userName ?? userInfo.username,
				user_name: profile?.user_name ?? values.userName ?? userInfo.user_name,
				contact: profile?.contact ?? values.phone,
				country: profile?.country ?? values.country,
				city: profile?.city ?? values.city,
				about: profile?.about ?? values.about,
			} as UserInfo);
			toast.success(t("sys.account.messages.updateSuccess"));
		} catch {}
	};

	const handlePublicProfileChange = (checked: boolean) => {
		publicProfileMutation.mutate(checked);
	};

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div className="col-span-1">
				<Card className="flex-col items-center px-6! pb-10! pt-20!">
					<UploadAvatar defaultAvatar={avatar} />

					<div className="flex items-center py-6 gap-2 w-40">
						<Text variant="body1">{t("sys.account.general.publicProfile")}</Text>
						<Switch
							checked={Boolean(isPublic)}
							disabled={publicProfileMutation.isPending}
							onCheckedChange={handlePublicProfileChange}
						/>
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
										name="userName"
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
										name="country"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{t("sys.account.general.fields.country")}</FormLabel>
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
								<CardFooter className="mt-6 flex justify-center px-0 pb-0">
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

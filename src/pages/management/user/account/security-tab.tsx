import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";

type FieldType = {
	oldPassword: string;
	newPassword: string;
	confirmPassword: string;
};

export default function SecurityTab() {
	const { t } = useTranslation();

	const form = useForm<FieldType>({
		defaultValues: {
			oldPassword: "",
			newPassword: "",
			confirmPassword: "",
		},
	});

	const handleSubmit = () => {
		// Handle form submission here
		toast.success(t("sys.account.messages.updateSuccess"));
	};

	return (
		<Card>
			<CardContent>
				<Form {...form}>
					<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="oldPassword"
							rules={{ required: t("sys.account.security.validation.oldPasswordRequired") }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("sys.account.security.fields.oldPassword")}</FormLabel>
									<FormControl>
										<Input type="password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="newPassword"
							rules={{ required: t("sys.account.security.validation.newPasswordRequired") }}
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("sys.account.security.fields.newPassword")}</FormLabel>
									<FormControl>
										<Input type="password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="confirmPassword"
							rules={{
								required: t("sys.account.security.validation.confirmPasswordRequired"),
								validate: (value) =>
									value === form.getValues("newPassword") || t("sys.account.security.validation.passwordNotMatch"),
							}}
							render={({ field }) => (
								<FormItem>
									<FormLabel>{t("sys.account.security.fields.confirmPassword")}</FormLabel>
									<FormControl>
										<Input type="password" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex w-full justify-center pt-2">
							<Button type="submit">{t("sys.account.actions.saveChanges")}</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
}

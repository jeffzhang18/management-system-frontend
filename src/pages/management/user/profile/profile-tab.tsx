import { faker } from "@faker-js/faker";
import { Timeline } from "antd";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { useUserInfo } from "@/store/userStore";
import { themeVars } from "@/theme/theme.css";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Text } from "@/ui/typography";

export default function ProfileTab() {
	const { t } = useTranslation();
	const { name, username, email, about, country, city, language, contact, roles } = useUserInfo();
	const displayName = name || username || email || "-";
	const displayRole =
		roles
			?.map((role) => role.name || role.code)
			.filter(Boolean)
			.join(", ") || "-";
	const aboutText = about || t("sys.profile.emptyAbout");

	const aboutItems = [
		{
			icon: <Icon icon="fa-solid:user" size={18} />,
			label: t("sys.profile.about.fullName"),
			val: displayName,
		},
		{
			icon: <Icon icon="eos-icons:role-binding" size={18} />,
			label: t("sys.profile.about.role"),
			val: displayRole,
		},
		{
			icon: <Icon icon="tabler:location-filled" size={18} />,
			label: t("sys.profile.about.country"),
			val: country || "-",
		},
		{
			icon: <Icon icon="tabler:map-pin-filled" size={18} />,
			label: t("sys.profile.about.city"),
			val: city || "-",
		},
		{
			icon: <Icon icon="ion:language" size={18} />,
			label: t("sys.profile.about.language"),
			val: language || "-",
		},
		{
			icon: <Icon icon="ph:phone-fill" size={18} />,
			label: t("sys.profile.about.contact"),
			val: contact || "-",
		},
		{
			icon: <Icon icon="ic:baseline-email" size={18} />,
			label: t("sys.profile.about.email"),
			val: email || "-",
		},
	];

	const connectionsItems = Array.from({ length: 5 }, () => ({
		avatar: faker.image.avatarGitHub(),
		name: faker.person.fullName(),
		connections: `${faker.number.int(100)} ${t("sys.profile.labels.connections")}`,
		connected: faker.datatype.boolean(),
	}));

	const teamItems = [
		{
			avatar: <Icon icon="devicon:react" size={36} />,
			name: "React Developers",
			members: `${faker.number.int(100)} ${t("sys.profile.labels.members")}`,
			tag: <Badge variant="warning">{t("sys.profile.tags.developer")}</Badge>,
		},
		{
			avatar: <Icon icon="devicon:figma" size={36} />,
			name: "UI Designer",
			members: `${faker.number.int(100)} ${t("sys.profile.labels.members")}`,
			tag: <Badge variant="info">{t("sys.profile.tags.designer")}</Badge>,
		},
		{
			avatar: <Icon icon="logos:jest" size={36} />,
			name: "Test Team",
			members: `${faker.number.int(100)} ${t("sys.profile.labels.members")}`,
			tag: <Badge variant="success">{t("sys.profile.tags.test")}</Badge>,
		},
		{
			avatar: <Icon icon="logos:nestjs" size={36} />,
			name: "Nest.js Developers",
			members: `${faker.number.int(100)} ${t("sys.profile.labels.members")}`,
			tag: <Badge variant="warning">{t("sys.profile.tags.developer")}</Badge>,
		},
		{
			avatar: <Icon icon="logos:twitter" size={36} />,
			name: "Digital Marketing",
			members: `${faker.number.int(100)} ${t("sys.profile.labels.members")}`,
			tag: <Badge variant="info">{t("sys.profile.tags.marketing")}</Badge>,
		},
	];

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<Card className="col-span-1">
					<CardHeader>
						<CardTitle>{t("sys.profile.cards.about")}</CardTitle>
						<CardDescription>{aboutText}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col gap-4">
							{aboutItems.map((item) => (
								<div className="flex" key={item.label}>
									<div className="mr-2">{item.icon}</div>
									<div className="mr-2">{item.label}:</div>
									<div className="opacity-50">{item.val}</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className="col-span-1 md:col-span-2">
					<CardHeader>
						<CardTitle>{t("sys.profile.cards.activityTimeline")}</CardTitle>
					</CardHeader>
					<CardContent>
						<Timeline
							className="mt-4! w-full"
							items={[
								{
									color: themeVars.colors.palette.error.default,
									children: (
										<div className="flex flex-col">
											<div className="flex items-center justify-between">
												<Text>{t("sys.profile.timeline.invoicesPaid.title")}</Text>
												<div className="opacity-50">{t("sys.profile.timeline.invoicesPaid.time")}</div>
											</div>
											<Text variant="caption" color="secondary">
												{t("sys.profile.timeline.invoicesPaid.description")}
											</Text>

											<div className="mt-2 flex items-center gap-2">
												<Icon icon="local:file-pdf" size={30} />
												<span className="font-medium opacity-60">invoice.pdf</span>
											</div>
										</div>
									),
								},
								{
									color: themeVars.colors.palette.primary.default,
									children: (
										<div className="flex flex-col">
											<div className="flex items-center justify-between">
												<Text>{t("sys.profile.timeline.newProject.title")}</Text>
												<div className="opacity-50">{t("sys.profile.timeline.newProject.time")}</div>
											</div>
											<Text variant="caption" color="secondary">
												{t("sys.profile.timeline.newProject.description")}
											</Text>
											<div className="mt-2 flex items-center gap-2">
												<img alt="" src={faker.image.avatarGitHub()} className="h-8 w-8 rounded-full" />
												<span className="font-medium opacity-60">
													{faker.person.fullName()} ({t("sys.profile.labels.client")})
												</span>
											</div>
										</div>
									),
								},
								{
									color: themeVars.colors.palette.info.default,
									children: (
										<div className="flex flex-col">
											<div className="flex items-center justify-between">
												<Text>{t("sys.profile.timeline.order.title")}</Text>
												<div className="opacity-50">{t("sys.profile.timeline.order.time")}</div>
											</div>
											<Text variant="caption" color="secondary">
												{t("sys.profile.timeline.order.description")}
											</Text>
										</div>
									),
								},
								{
									color: themeVars.colors.palette.warning.default,
									children: (
										<div className="flex flex-col">
											<div className="flex items-center justify-between">
												<Text>{t("sys.profile.timeline.meeting.title")}</Text>
												<div className="opacity-50">{t("sys.profile.timeline.meeting.time")}</div>
											</div>
										</div>
									),
								},
							]}
						/>
					</CardContent>
				</Card>
			</div>
			<div className="flex flex-col gap-4 md:flex-row">
				<div className="flex-1">
					<Card>
						<CardHeader>
							<CardTitle className="flex w-full items-center justify-between">
								<span>{t("sys.profile.cards.connections")}</span>
								<Button variant="ghost" size="icon" aria-label={t("common.more")}>
									<Icon icon="fontisto:more-v-a" />
								</Button>
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex w-full flex-col gap-4">
								{connectionsItems.map((item) => (
									<div className="flex" key={item.name}>
										<img alt="" src={item.avatar} className="h-10 w-10 flex-none rounded-full" />
										<div className="ml-4 flex flex-1 flex-col">
											<span className="font-semibold">{item.name}</span>
											<span className="mt-1 text-xs opacity-50">{item.connections}</span>
										</div>
										<div
											className="flex h-8 w-8 flex-none items-center justify-center rounded"
											style={{
												backgroundColor: item.connected ? themeVars.colors.palette.primary.default : "transparent",
												border: item.connected ? "" : `1px solid ${themeVars.colors.palette.primary.default}`,
											}}
										>
											<Icon
												icon="tdesign:user"
												color={item.connected ? "#fff" : themeVars.colors.palette.primary.default}
												size={20}
											/>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
				<div className="flex-1">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>{t("sys.profile.cards.teams")}</CardTitle>
								<Button variant="ghost" size="icon" aria-label={t("common.more")}>
									<Icon icon="fontisto:more-v-a" />
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex w-full flex-col gap-4">
								{teamItems.map((item) => (
									<div className="flex" key={item.name}>
										{item.avatar}
										<div className="ml-4 flex flex-1 flex-col">
											<span className="font-semibold">{item.name}</span>
											<span className="mt-1 text-xs opacity-50">{item.members}</span>
										</div>
										<div className="h-6">{item.tag}</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

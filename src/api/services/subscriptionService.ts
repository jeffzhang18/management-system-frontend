import apiClient from "../apiClient";

export const currencies = ["USD", "CNY", "AUD"] as const;
export type Currency = (typeof currencies)[number];
export type Device = "phone" | "computer" | "other";
export type CycleUnit = "day" | "month" | "year" | "once";

export interface SubscriptionInput {
	name: string;
	devices: Device[];
	startDate: string;
	endDate: string | null;
	cycleUnit: CycleUnit;
	cycleInterval: number;
	amount: string;
	currency: Currency;
	autoRenew: boolean;
}

export interface Subscription extends SubscriptionInput {
	id: string;
	createdAt: string;
	updatedAt: string;
	status: "active" | "scheduled" | "ended";
	nextRenewalDate: string | null;
	expiresOn: string | null;
	upcoming: boolean;
}

export interface RateSnapshot {
	base: Currency;
	rates: Record<Currency, number> | null;
	rateDate: string | null;
	fetchedAt: string | null;
	source: string;
	stale: boolean;
	available: boolean;
}

export interface SubscriptionSummary {
	asOf: string;
	currency: Currency;
	totalCount: number;
	activeCount: number;
	monthlyEstimate: string | null;
	annualEstimate: string | null;
	upcoming30Days: string | null;
	exchange: RateSnapshot;
}

const subscriptionService = {
	list: () =>
		apiClient.get<{ asOf: string; items: Subscription[] }>({ url: "/subscriptions", suppressErrorToast: true }),
	summary: (currency: Currency) =>
		apiClient.get<SubscriptionSummary>({
			url: "/subscriptions/summary",
			params: { currency },
			suppressErrorToast: true,
		}),
	create: (data: SubscriptionInput) => apiClient.post<Subscription>({ url: "/subscriptions", data }),
	update: (id: string, data: SubscriptionInput) =>
		apiClient.request<Subscription>({
			url: `/subscriptions/${id}`,
			method: "PATCH",
			data,
		}),
	remove: (id: string) => apiClient.delete({ url: `/subscriptions/${id}` }),
};
export default subscriptionService;

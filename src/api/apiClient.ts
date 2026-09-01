import axios, { AxiosHeaders, type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { toast } from "sonner";
import type { Result } from "#/api";
import { ResultStatus } from "#/enum";
import { GLOBAL_CONFIG } from "@/global-config";
import { t } from "@/locales/i18n";
import userStore from "@/store/userStore";

const REFRESH_URL = "/auth/refresh-token";
const TOAST_DEDUP_MS = 1200;

type RequestConfigWithRetry = AxiosRequestConfig & {
	_retry?: boolean;
};

type RefreshTokenResponse = {
	accessToken?: string;
	refreshToken?: string;
};

const axiosInstance = axios.create({
	baseURL: GLOBAL_CONFIG.apiBaseUrl,
	timeout: 50000,
	headers: { "Content-Type": "application/json;charset=utf-8" },
});

let refreshPromise: Promise<string | null> | null = null;
let lastToast = {
	message: "",
	time: 0,
};

const showErrorToastDedup = (message: string) => {
	const now = Date.now();
	if (lastToast.message === message && now - lastToast.time < TOAST_DEDUP_MS) {
		return;
	}
	lastToast = { message, time: now };
	toast.error(message, { position: "top-center" });
};

const unwrapResult = <T>(res: AxiosResponse<Result<T>>) => {
	if (!res.data) throw new Error(t("sys.api.apiRequestFailed"));
	const { status, data, message } = res.data;
	if (status === ResultStatus.SUCCESS) {
		return data;
	}
	throw new Error(message || t("sys.api.apiRequestFailed"));
};

const applyRefreshedToken = (tokenPayload: RefreshTokenResponse) => {
	const { userToken, actions } = userStore.getState();
	const nextAccessToken = tokenPayload.accessToken;
	if (!nextAccessToken) return null;

	actions.setUserToken({
		accessToken: nextAccessToken,
		refreshToken: tokenPayload.refreshToken || userToken.refreshToken,
	});

	return nextAccessToken;
};

const resolveRefreshTokenPayload = (response: AxiosResponse<Result<RefreshTokenResponse> | RefreshTokenResponse>) => {
	const body = response.data as any;
	if (!body || typeof body !== "object") return null;

	if (body.data && typeof body.data === "object") {
		const status = Number(body.status);
		if ((status === ResultStatus.SUCCESS || status === 201 || status === 200) && body.data.accessToken) {
			return body.data as RefreshTokenResponse;
		}
	}

	if (body.accessToken) {
		return body as RefreshTokenResponse;
	}

	return null;
};

const clearAuthAndNotify = () => {
	userStore.getState().actions.clearUserInfoAndToken();
	showErrorToastDedup(t("sys.api.timeoutMessage"));
};

const refreshAccessToken = async () => {
	if (refreshPromise) return refreshPromise;

	refreshPromise = (async () => {
		const { userToken } = userStore.getState();
		if (!userToken.refreshToken) return null;

		const refreshResponse = await axios.request<Result<RefreshTokenResponse> | RefreshTokenResponse>({
			baseURL: GLOBAL_CONFIG.apiBaseUrl,
			url: REFRESH_URL,
			method: "POST",
			headers: { "Content-Type": "application/json;charset=utf-8" },
			data: { refreshToken: userToken.refreshToken },
			timeout: 50000,
		});

		const tokenPayload = resolveRefreshTokenPayload(refreshResponse);
		if (!tokenPayload) return null;
		return applyRefreshedToken(tokenPayload);
	})();

	try {
		return await refreshPromise;
	} finally {
		refreshPromise = null;
	}
};

axiosInstance.interceptors.request.use(
	(config) => {
		const { userToken } = userStore.getState();
		const headers = AxiosHeaders.from((config.headers || {}) as any);

		if (userToken.accessToken) {
			headers.set("Authorization", `Bearer ${userToken.accessToken}`);
		} else {
			headers.delete("Authorization");
		}

		config.headers = headers;
		return config;
	},
	(error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
	(res: AxiosResponse<Result<any>>) => unwrapResult(res),
	async (error: AxiosError<Result>) => {
		const { response, message, config } = error || {};
		const originalRequest = config as RequestConfigWithRetry | undefined;
		const status = response?.status;
		const requestUrl = originalRequest?.url || "";

		if (status === 401) {
			const isRefreshRequest = requestUrl.includes(REFRESH_URL);

			if (!isRefreshRequest && originalRequest && !originalRequest._retry) {
				originalRequest._retry = true;
				try {
					const nextAccessToken = await refreshAccessToken();
					if (nextAccessToken) {
						const headers = AxiosHeaders.from((originalRequest.headers || {}) as any);
						headers.set("Authorization", `Bearer ${nextAccessToken}`);
						originalRequest.headers = headers;
						return axiosInstance.request(originalRequest);
					}
				} catch {
				}
			}

			clearAuthAndNotify();
			return Promise.reject(error);
		}

		const errMsg = response?.data?.message || message || t("sys.api.errorMessage");
		showErrorToastDedup(errMsg);
		return Promise.reject(error);
	},
);

class APIClient {
	get<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "GET" });
	}
	post<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "POST" });
	}
	put<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "PUT" });
	}
	delete<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "DELETE" });
	}
	request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return axiosInstance.request<any, T>(config);
	}
}

export default new APIClient();

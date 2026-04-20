import apiClient from "../apiClient";

export enum DemoApi {
	REVOKE_ACCESS_TOKEN = "/auth/revoke-access-token",
	REVOKE_REFRESH_TOKEN = "/auth/revoke-refresh-token",
}

type RevokeRefreshTokenPayload = {
	refreshToken: string;
};

const revokeAccessToken = () => apiClient.post({ url: DemoApi.REVOKE_ACCESS_TOKEN });

const revokeRefreshToken = (data: RevokeRefreshTokenPayload) =>
	apiClient.post({
		url: DemoApi.REVOKE_REFRESH_TOKEN,
		data,
	});

export default {
	revokeAccessToken,
	revokeRefreshToken,
};

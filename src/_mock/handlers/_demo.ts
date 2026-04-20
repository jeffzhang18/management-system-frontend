import { HttpResponse, http } from "msw";
import { DemoApi } from "@/api/services/demoService";
import { ResultStatus } from "@/types/enum";

const revokeAccessToken = http.post(`/api${DemoApi.REVOKE_ACCESS_TOKEN}`, () => {
	return new HttpResponse(null, { status: ResultStatus.TIMEOUT });
});

const revokeRefreshToken = http.post(`/api${DemoApi.REVOKE_REFRESH_TOKEN}`, () => {
	return HttpResponse.json({
		status: ResultStatus.SUCCESS,
		data: null,
		message: "Refresh token revoked",
	});
});

export { revokeAccessToken, revokeRefreshToken };

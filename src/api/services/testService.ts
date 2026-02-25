// src/api/services/testService.ts
import apiClient from "../apiClient";

const testPing = () => {
	return apiClient.get<{ message: string; time: string }>({
		url: "/ping",
	});
};
export default testPing;

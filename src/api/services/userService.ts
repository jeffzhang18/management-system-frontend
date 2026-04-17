import type { UserInfo, UserToken } from "#/entity";
import apiClient from "../apiClient";

export interface SignInReq {
	email: string;
	password: string;
}

export interface SignUpReq extends SignInReq {
	userName: string;
}

export interface UpdateUserProfileReq {
	name?: string;
	userName?: string;
	gender?: number;
	avatar?: string;
	language?: string;
	country?: string;
	contact?: string;
	about?: string;
}

export type SignInRes = UserToken & { user: UserInfo };

export enum UserApi {
	SignIn = "/auth/login",
	SignUp = "/auth/register",
	// 以下接口还未实现
	Logout = "/auth/logout",
	Refresh = "/auth/refresh",
	User = "/user",
	Profile = "/user/profile",
}

const signin = (data: SignInReq) => apiClient.post<SignInRes>({ url: UserApi.SignIn, data });
const signup = (data: SignUpReq) => apiClient.post<SignInRes>({ url: UserApi.SignUp, data });
const logout = () => apiClient.get({ url: UserApi.Logout });
const findById = (id: string) => apiClient.get<UserInfo | UserInfo[]>({ url: `${UserApi.User}/${id}` });
const updateById = (id: string, data: Partial<UserInfo> & Record<string, unknown>) =>
	apiClient.put<UserInfo>({ url: `${UserApi.User}/${id}`, data });
const updateProfile = (data: UpdateUserProfileReq) =>
	apiClient.request<UserInfo>({ url: UserApi.Profile, method: "PATCH", data });

export default {
	signin,
	signup,
	findById,
	updateById,
	updateProfile,
	logout,
};

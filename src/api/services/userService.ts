import type { UserInfo, UserToken } from "#/entity";
import apiClient from "../apiClient";

export interface SignInReq {
	userName: string;
	password: string;
}

export interface SignUpReq extends SignInReq {
	email: string;
}

export type SignInRes = UserToken & { user: UserInfo };

export enum UserApi {
	SignIn = "/auth/login",
	SignUp = "/auth/register",
	// 以下接口还未实现
	Logout = "/auth/logout",
	Refresh = "/auth/refresh",
	User = "/user",
}

const signin = (data: SignInReq) => apiClient.post<SignInRes>({ url: UserApi.SignIn, data });
const signup = (data: SignUpReq) => apiClient.post<SignInRes>({ url: UserApi.SignUp, data });
const logout = () => apiClient.get({ url: UserApi.Logout });
const findById = (id: string) => apiClient.get<UserInfo[]>({ url: `${UserApi.User}/${id}` });

export default {
	signin,
	signup,
	findById,
	logout,
};

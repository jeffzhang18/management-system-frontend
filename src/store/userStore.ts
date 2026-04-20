import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Role, UserInfo, UserToken } from "#/entity";
import { StorageEnum } from "#/enum";
import userService, { type SignInReq, type SignInRes, type SignUpReq } from "@/api/services/userService";
import { removeItem } from "@/utils/storage";

type UserStore = {
	userInfo: Partial<UserInfo>;
	userToken: UserToken;

	actions: {
		setUserInfo: (userInfo: UserInfo) => void;
		setUserToken: (token: UserToken) => void;
		clearUserInfoAndToken: () => void;
	};
};

type RawUserInfo = Partial<Omit<UserInfo, "roles">> & {
	role?: UserInfo["role"];
	roles?: Array<Role | string>;
};

const normalizeRoleItem = (role: Role | string): Role => {
	if (typeof role === "string") {
		return {
			id: role,
			name: role,
			code: role,
		};
	}
	return role;
};

const normalizeRoles = (role?: RawUserInfo["role"], roles?: RawUserInfo["roles"]): Role[] => {
	if (Array.isArray(roles) && roles.length > 0) {
		return roles.map((item) => normalizeRoleItem(item));
	}
	if (Array.isArray(role)) {
		return role.map((item) => normalizeRoleItem(item));
	}
	if (role) {
		return [normalizeRoleItem(role)];
	}
	return [];
};

const normalizeUserInfo = (user: RawUserInfo): Partial<UserInfo> => {
	const username = user.username || user.user_name || user.name || user.email;
	const roles = normalizeRoles(user.role, user.roles);

	return {
		...user,
		id: user.id ? String(user.id) : user.user_id,
		name: user.name || username,
		username,
		roles,
	};
};

const persistAuthPayload = (
	res: SignInRes,
	setUserToken: (token: UserToken) => void,
	setUserInfo: (userInfo: UserInfo) => void,
) => {
	const { user, accessToken, refreshToken } = res;
	const normalizedUser = normalizeUserInfo(user as RawUserInfo);

	setUserToken({ accessToken, refreshToken });
	setUserInfo(normalizedUser as UserInfo);

	if (normalizedUser.user_id) {
		localStorage.setItem(StorageEnum.UserId, normalizedUser.user_id);
	}
};

const useUserStore = create<UserStore>()(
	persist(
		(set) => ({
			userInfo: {},
			userToken: {},
			actions: {
				setUserInfo: (userInfo) => {
					set({ userInfo });
				},
				setUserToken: (userToken) => {
					set({ userToken });
				},
				clearUserInfoAndToken() {
					removeItem(StorageEnum.UserId);
					set({ userInfo: {}, userToken: {} });
				},
			},
		}),
		{
			name: "userStore", // name of the item in the storage (must be unique)
			storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
			partialize: (state) => ({
				[StorageEnum.UserInfo]: normalizeUserInfo(state.userInfo),
				[StorageEnum.UserToken]: state.userToken,
			}),
		},
	),
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserPermissions = () => useUserStore((state) => state.userInfo?.permissions || []);
export const useUserRoles = () => useUserStore((state) => state.userInfo.roles || []);
export const useUserActions = () => useUserStore((state) => state.actions);

export const useSignIn = () => {
	const { setUserToken, setUserInfo } = useUserActions();

	const signInMutation = useMutation({
		mutationFn: userService.signin,
	});

	const signIn = async (data: SignInReq) => {
		try {
			const res = await signInMutation.mutateAsync(data);
			persistAuthPayload(res, setUserToken, setUserInfo);
		} catch (err) {
			toast.error(err.message, {
				position: "top-center",
			});
			throw err;
		}
	};

	return signIn;
};

export const useSignUp = () => {
	const { setUserToken, setUserInfo } = useUserActions();

	const signUpMutation = useMutation({
		mutationFn: userService.signup,
	});

	const signUp = async (data: SignUpReq) => {
		try {
			const res = await signUpMutation.mutateAsync(data);
			persistAuthPayload(res, setUserToken, setUserInfo);
			return res;
		} catch (err) {
			toast.error(err.message, {
				position: "top-center",
			});
			throw err;
		}
	};

	return signUp;
};

export default useUserStore;

import { lazy, Suspense } from "react";
import type { RouteObject } from "react-router";
import { Outlet } from "react-router";

const LoginPage = lazy(() => import("@/pages/sys/login"));
const QrConfirmPage = lazy(() => import("@/pages/sys/login/qr-confirm"));
const authCustom: RouteObject[] = [
	{ path: "qr-confirm", element: <QrConfirmPage /> },
	{
		path: "login",
		element: <LoginPage />,
	},
];

export const authRoutes: RouteObject[] = [
	{
		path: "auth",
		element: (
			<Suspense>
				<Outlet />
			</Suspense>
		),
		children: [...authCustom],
	},
];

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import demoService from "@/api/services/demoService";
import { useUserToken } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";

export default function TokenExpired() {
	const { refreshToken } = useUserToken();

	const revokeAccessTokenMutation = useMutation({
		mutationFn: demoService.revokeAccessToken,
		onSuccess: () => {
			toast.success("Access token 已失效，下一次受保护接口请求会触发 401。", {
				position: "top-center",
			});
		},
	});

	const revokeRefreshTokenMutation = useMutation({
		mutationFn: demoService.revokeRefreshToken,
		onSuccess: () => {
			toast.success("Refresh token 已失效。", {
				position: "top-center",
			});
		},
	});

	const handleRevokeAccessToken = () => {
		revokeAccessTokenMutation.mutate();
	};

	const handleRevokeRefreshToken = () => {
		if (!refreshToken) {
			toast.error("当前没有可失效的 refresh token。", {
				position: "top-center",
			});
			return;
		}
		revokeRefreshTokenMutation.mutate({ refreshToken });
	};

	return (
		<Card>
			<CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<div>
					<p>调用后端 token 失效接口，分别模拟 access token 和 refresh token 过期场景。</p>
				</div>
				<div className="flex flex-wrap gap-3">
					<Button disabled={revokeAccessTokenMutation.isPending} onClick={handleRevokeAccessToken}>
						{revokeAccessTokenMutation.isPending ? "Access Token 失效中..." : "Access Token 过期"}
					</Button>
					<Button
						variant="outline"
						disabled={!refreshToken || revokeRefreshTokenMutation.isPending}
						onClick={handleRevokeRefreshToken}
					>
						{revokeRefreshTokenMutation.isPending ? "Refresh Token 失效中..." : "Refresh Token 过期"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

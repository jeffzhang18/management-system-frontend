import { setupWorker } from "msw/browser";
import { revokeAccessToken, revokeRefreshToken } from "./handlers/_demo";
import { menuList } from "./handlers/_menu";
import { signIn, userList } from "./handlers/_user";

const handlers = [signIn, userList, revokeAccessToken, revokeRefreshToken, menuList];
const worker = setupWorker(...handlers);

export { worker };

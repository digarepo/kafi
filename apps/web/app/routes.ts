import type { RouteConfig } from "@react-router/dev/routes";
import { index, route } from "@react-router/dev/routes";

export default [
    index("coming-soon.tsx"),
    route("/test", "routes/home.tsx"),
    route("*", "not-found.tsx"),
] satisfies RouteConfig;

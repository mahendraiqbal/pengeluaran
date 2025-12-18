import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("register", "routes/register.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("transactions/new", "routes/transactions.new.tsx"),
  route("reports", "routes/reports.tsx"),
  route("settings", "routes/settings.tsx"),
  route("share-target", "routes/share-target.tsx"),
  route("logout", "routes/logout.tsx"),
  route("api/whatsapp/send", "routes/api.whatsapp.send.tsx"),
  route("api/telegram/send", "routes/api.telegram.send.tsx"),
] satisfies RouteConfig;

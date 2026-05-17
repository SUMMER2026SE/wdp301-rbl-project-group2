import { config } from "@/config/config";
import { useRoutes } from "react-router";

function AppRoutes() {
  return useRoutes(config);
}

export default AppRoutes;

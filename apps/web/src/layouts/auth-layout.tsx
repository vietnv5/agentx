import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="w-full h-screen overflow-hidden bg-background">
      <Outlet />
    </div>
  );
}

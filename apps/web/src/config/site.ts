export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "AgentX Platform",
  description: "Hệ thống quản lý và vận hành đa Agent thông minh",
  navItems: [
    {
      label: "Trang chủ",
      href: "/",
    },
    {
      label: "Chat Playground",
      href: "/chat",
    },
    {
      label: "Quản trị",
      href: "/admin",
    },
  ],
  navMenuItems: [
    {
      label: "Profile",
      href: "/profile",
    },
    {
      label: "Dashboard",
      href: "/dashboard",
    },
    {
      label: "Projects",
      href: "/projects",
    },
    {
      label: "Team",
      href: "/team",
    },
    {
      label: "Calendar",
      href: "/calendar",
    },
    {
      label: "Settings",
      href: "/settings",
    },
    {
      label: "Help & Feedback",
      href: "/help-feedback",
    },
    {
      label: "Logout",
      href: "/logout",
    },
  ],
  links: {
    github: "https://github.com/vietnv5/agentx",
    docs: "https://heroui.com",
  },
};

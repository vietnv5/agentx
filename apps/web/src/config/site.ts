export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "AgentX Platform",
  description: "Hệ thống quản lý và vận hành đa Agent thông minh",
  navItems: [
    {
      label: "Trang chủ",
      labelKey: "nav.home",
      href: "/",
    },
    {
      label: "Chat Playground",
      labelKey: "nav.playground",
      href: "/chat",
    },
    {
      label: "Quản trị",
      labelKey: "nav.adminControl",
      href: "/admin",
    },
  ],
  navMenuItems: [
    {
      label: "Profile",
      labelKey: "nav.profile",
      href: "/profile",
    },
    {
      label: "Dashboard",
      labelKey: "nav.dashboard",
      href: "/dashboard",
    },

    {
      label: "Team",
      labelKey: "nav.team",
      href: "/team",
    },
    {
      label: "Calendar",
      labelKey: "nav.calendar",
      href: "/calendar",
    },
    {
      label: "Settings",
      labelKey: "nav.settings",
      href: "/settings",
    },
    {
      label: "Help & Feedback",
      labelKey: "nav.helpFeedback",
      href: "/help-feedback",
    },
    {
      label: "Logout",
      labelKey: "logout",
      href: "/logout",
    },
  ],
  links: {
    github: "https://github.com/vietnv5/agentx",
    docs: "https://heroui.com",
  },
};

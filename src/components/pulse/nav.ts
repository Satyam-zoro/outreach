import {
  BarChart3,
  Blocks,
  Building2,
  FileBarChart,
  Gauge,
  MessageSquareReply,
  Filter,
  Settings,
  Target,
  TrendingUp,
  Users,
  Video,
  Clapperboard,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  children?: NavItem[];
}

export const navGroups: { heading?: string; items: NavItem[] }[] = [
  {
    items: [{ label: "Overview", to: "/dashboard", icon: Gauge }],
  },
  {
    heading: "Analytics",
    items: [
      { label: "Outreach", to: "/analytics/outreach", icon: BarChart3 },
      { label: "Replies", to: "/analytics/replies", icon: MessageSquareReply },
      { label: "Conversion", to: "/analytics/conversion", icon: Filter },
      { label: "Revenue", to: "/analytics/revenue", icon: Wallet },
    ],
  },
  {
    heading: "Creators",
    items: [
      { label: "Short-form", to: "/creators/short", icon: Video },
      { label: "Long-form", to: "/creators/long", icon: Clapperboard },
    ],
  },
  {
    heading: "Workspace",
    items: [
      { label: "Leads", to: "/leads", icon: Users },
      { label: "Campaigns", to: "/campaigns", icon: Target },
      { label: "Team", to: "/team", icon: Building2 },
      { label: "Reports", to: "/reports", icon: FileBarChart },
      { label: "Integrations", to: "/integrations", icon: Blocks },
      { label: "Settings", to: "/settings", icon: Settings },
    ],
  },
];

export const mobileNav: NavItem[] = [
  { label: "Home", to: "/dashboard", icon: Gauge },
  { label: "Analytics", to: "/analytics/outreach", icon: TrendingUp },
  { label: "Creators", to: "/creators/short", icon: Video },
  { label: "Leads", to: "/leads", icon: Users },
  { label: "More", to: "/settings", icon: Settings },
];

export const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/analytics/outreach": "Outreach Analytics",
  "/analytics/replies": "Follow-up Intelligence",
  "/analytics/conversion": "Conversion Analytics",
  "/analytics/revenue": "Revenue Analytics",
  "/creators/short": "Short-Form Creators",
  "/creators/long": "Long-Form Creators",
  "/leads": "Leads",
  "/campaigns": "Campaigns",
  "/team": "Team Performance",
  "/reports": "Reports",
  "/integrations": "Integrations",
  "/settings": "Settings",
};

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export default function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor = "text-primary",
  iconBgColor = "bg-blue-50"
}: StatsCardProps) {
  return (
    <div className="stats-card">
      <div className="flex items-center">
        <div className={cn("p-3 rounded-lg", iconBgColor)}>
          <Icon className={cn("text-xl", iconColor)} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Plus, FileText } from "lucide-react";
import GRNModal from "@/components/modals/grn-modal";

interface HeaderProps {
  title?: string;
  breadcrumb?: string[];
}

export default function Header({ title = "Dashboard", breadcrumb = ["Home", "Dashboard"] }: HeaderProps) {
  const [isGRNModalOpen, setIsGRNModalOpen] = useState(false);

  return (
    <>
      <header className="bg-white shadow-material border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
            <nav className="text-sm text-muted-foreground">
              {breadcrumb.map((item, index) => (
                <span key={index}>
                  {index > 0 && <span className="mx-2">›</span>}
                  <span className={index === breadcrumb.length - 1 ? "text-foreground" : ""}>
                    {item}
                  </span>
                </span>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            <Button 
              onClick={() => setIsGRNModalOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New GRN
            </Button>
            
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              New Challan
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full"></span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <GRNModal open={isGRNModalOpen} onOpenChange={setIsGRNModalOpen} />
    </>
  );
}

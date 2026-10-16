import React, { useState } from "react";
import { AdminHeader } from "./AdminHeader";
import { DesktopSidebar, type AdminTab } from "./DesktopSidebar";
import { MobileBottomNavigation } from "./MobileBottomNavigation";
import { MobileMoreDrawer } from "./MobileMoreDrawer";

export interface AdminShellProps {
  activeTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  currentStore?: string;
  onSelectStore?: (store: string) => void;
  currentSector: string;
  onSelectSector: (sector: string) => void;
  connection: "online" | "syncing" | "offline";
  lastSync: Date | null;
  onLogout: () => void;
  counts?: {
    programs?: number;
    offers?: number;
    media?: number;
    catalogs?: number;
  };
  children: React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({
  activeTab,
  onSelectTab,
  currentStore = "Loja 01",
  onSelectStore,
  currentSector,
  onSelectSector,
  connection,
  lastSync,
  onLogout,
  counts,
  children,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  return (
    <div className="admin-shell">
      <div className="admin-shell-body">
        {/* Desktop Sidebar */}
        <DesktopSidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          counts={counts}
        />

        {/* Main Content Area */}
        <div className="admin-main">
          {/* Top Header */}
          <AdminHeader
            currentStore={currentStore}
            onSelectStore={onSelectStore}
            currentSector={currentSector}
            onSelectSector={onSelectSector}
            connection={connection}
            lastSync={lastSync}
            onLogout={onLogout}
          />

          {/* View Content */}
          <main className="admin-content-view">{children}</main>
        </div>
      </div>

      {/* Mobile Bottom Navigation (< 768px) */}
      <MobileBottomNavigation
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onOpenMore={() => setIsMoreOpen(true)}
        isMoreOpen={isMoreOpen}
      />

      {/* Mobile More Options Drawer */}
      <MobileMoreDrawer
        isOpen={isMoreOpen}
        onClose={() => setIsMoreOpen(false)}
        onSelectTab={onSelectTab}
        onLogout={onLogout}
        currentSector={currentSector}
      />
    </div>
  );
};


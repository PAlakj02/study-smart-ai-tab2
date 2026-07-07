import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export interface MobileNavItem {
  label: string;
  path: string;
  icon?: ReactNode;
}

interface MobileNavMenuProps {
  items: MobileNavItem[];
  onLogout: () => void;
}

// Same nav destinations as each page's "hidden md:flex" desktop link row,
// surfaced through a Sheet on screens below the md breakpoint where that
// row is hidden and would otherwise be completely unreachable.
export function MobileNavMenu({ items, onLogout }: MobileNavMenuProps) {
  const navigate = useNavigate();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 flex flex-col">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 mt-4">
          {items.map(item => (
            <SheetClose asChild key={item.path}>
              <Button variant="ghost" className="justify-start" onClick={() => navigate(item.path)}>
                {item.icon}
                {item.label}
              </Button>
            </SheetClose>
          ))}
          <SheetClose asChild>
            <Button variant="ghost" className="justify-start" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="ghost" className="justify-start text-destructive hover:text-destructive" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

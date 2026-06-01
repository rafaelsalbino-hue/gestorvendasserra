import { useEffect, useState } from "react";

const KEY = "sidebar:collapsed";

function readInitial(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Persistent collapsed state for desktop sidebar.
 * Drawer/mobile behavior is handled separately by the shadcn `Sidebar`.
 */
export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(readInitial);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return [collapsed, setCollapsed];
}
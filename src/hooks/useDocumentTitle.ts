import { useEffect } from "react";

/**
 * Sets document.title for the current route and restores
 * the previous title on unmount.
 */
export function useDocumentTitle(title: string, suffix = "TratAtiva") {
  useEffect(() => {
    const prev = document.title;
    document.title = title ? `${title} · ${suffix}` : suffix;
    return () => {
      document.title = prev;
    };
  }, [title, suffix]);
}
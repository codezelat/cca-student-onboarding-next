"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

type AdminActivityContextValue = {
  isBusy: boolean;
  pendingCount: number;
  beginNavigation: () => () => void;
};

const AdminActivityContext = createContext<AdminActivityContextValue>({
  isBusy: false,
  pendingCount: 0,
  beginNavigation: () => () => undefined,
});

function shouldTrackFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const requestUrl =
    input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.toString()
        : String(input);

  let url: URL;
  try {
    url = new URL(requestUrl, window.location.href);
  } catch {
    return false;
  }

  const headers =
    input instanceof Request ? input.headers : new Headers(init?.headers);

  if (url.origin !== window.location.origin) {
    return false;
  }

  if (
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/favicon")
  ) {
    return false;
  }

  const purposeHeader = headers.get("purpose");
  const prefetchHeader = headers.get("next-router-prefetch");

  if (
    purposeHeader?.toLowerCase() === "prefetch" ||
    prefetchHeader !== null
  ) {
    return false;
  }

  return true;
}

export function AdminActivityProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [networkPendingCount, setNetworkPendingCount] = useState(0);
  const [navigationPendingCount, setNavigationPendingCount] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const networkPendingCountRef = useRef(0);
  const navigationTokensRef = useRef(new Map<number, number>());
  const nextNavigationTokenRef = useRef(0);
  const busyDelayTimeoutRef = useRef<number | null>(null);
  const pendingCount = networkPendingCount + navigationPendingCount;

  const clearNavigationToken = useCallback((tokenId: number) => {
    const timeoutId = navigationTokensRef.current.get(tokenId);
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      navigationTokensRef.current.delete(tokenId);
      setNavigationPendingCount(navigationTokensRef.current.size);
    }
  }, []);

  const beginNavigation = useCallback(() => {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const tokenId = nextNavigationTokenRef.current++;
    const timeoutId = window.setTimeout(() => {
      clearNavigationToken(tokenId);
    }, 10000);

    navigationTokensRef.current.set(tokenId, timeoutId);
    setNavigationPendingCount(navigationTokensRef.current.size);

    return () => {
      clearNavigationToken(tokenId);
    };
  }, [clearNavigationToken]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const beginTrackedRequest = () => {
      networkPendingCountRef.current += 1;
      setNetworkPendingCount(networkPendingCountRef.current);
    };

    const endTrackedRequest = () => {
      networkPendingCountRef.current = Math.max(
        0,
        networkPendingCountRef.current - 1,
      );
      setNetworkPendingCount(networkPendingCountRef.current);
    };

    window.fetch = async (input, init) => {
      if (!shouldTrackFetch(input, init)) {
        return originalFetch(input, init);
      }

      beginTrackedRequest();

      try {
        return await originalFetch(input, init);
      } finally {
        endTrackedRequest();
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (navigationTokensRef.current.size === 0) {
      return;
    }

    for (const timeoutId of navigationTokensRef.current.values()) {
      window.clearTimeout(timeoutId);
    }

    navigationTokensRef.current.clear();
    setNavigationPendingCount(0);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (pendingCount > 0) {
      if (busyDelayTimeoutRef.current !== null) {
        window.clearTimeout(busyDelayTimeoutRef.current);
      }

      busyDelayTimeoutRef.current = window.setTimeout(() => {
        setIsBusy(true);
        busyDelayTimeoutRef.current = null;
      }, 80);

      return;
    }

    if (busyDelayTimeoutRef.current !== null) {
      window.clearTimeout(busyDelayTimeoutRef.current);
      busyDelayTimeoutRef.current = null;
    }

    setIsBusy(false);
  }, [pendingCount]);

  useEffect(() => {
    return () => {
      if (busyDelayTimeoutRef.current !== null) {
        window.clearTimeout(busyDelayTimeoutRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      isBusy,
      pendingCount,
      beginNavigation,
    }),
    [beginNavigation, isBusy, pendingCount],
  );

  return (
    <AdminActivityContext.Provider value={value}>
      {children}
    </AdminActivityContext.Provider>
  );
}

export function useAdminActivity() {
  return useContext(AdminActivityContext);
}

export function useAdminBusyRouter() {
  const router = useRouter();
  const { beginNavigation } = useAdminActivity();

  return useMemo(
    () => ({
      ...router,
      push: (...args: Parameters<typeof router.push>) => {
        const stopNavigation = beginNavigation();

        try {
          router.push(...args);
        } catch (error) {
          stopNavigation();
          throw error;
        }
      },
      replace: (...args: Parameters<typeof router.replace>) => {
        const stopNavigation = beginNavigation();

        try {
          router.replace(...args);
        } catch (error) {
          stopNavigation();
          throw error;
        }
      },
    }),
    [beginNavigation, router],
  );
}

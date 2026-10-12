"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { signalRouteTransitionStart } from "@/lib/navigation/routeTransition";

/** `router.push` com overlay de transição entre rotas. */
export function useAppRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      ...router,
      push: (href: string, options?: Parameters<typeof router.push>[1]) => {
        signalRouteTransitionStart();
        router.push(href, options);
      },
      replace: (href: string, options?: Parameters<typeof router.replace>[1]) => {
        signalRouteTransitionStart();
        router.replace(href, options);
      },
    }),
    [router]
  );
}

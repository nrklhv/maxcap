"use client";

/**
 * After OAuth login, consumes `sessionStorage` invite token via claim API (same tab).
 *
 * @domain maxrent-portal / broker
 * @see POST /api/investor/broker-invite/claim
 */

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { BROKER_INVITE_SESSION_STORAGE_KEY } from "@/lib/broker/broker-investor-invite-constants";

export function BrokerInvestorInviteClaimEffect() {
  const { data: session, status } = useSession();
  const ran = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.canInvest) return;
    if (typeof window === "undefined") return;
    if (ran.current) return;

    const token = sessionStorage.getItem(BROKER_INVITE_SESSION_STORAGE_KEY);
    if (!token) return;

    ran.current = true;

    void (async () => {
      try {
        await fetch("/api/investor/broker-invite/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        sessionStorage.removeItem(BROKER_INVITE_SESSION_STORAGE_KEY);
      } catch {
        ran.current = false;
      }
    })();
  }, [status, session?.user?.canInvest]);

  return null;
}

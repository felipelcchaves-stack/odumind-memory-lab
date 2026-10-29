import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  beginHubLogin,
  decideAccess,
  fetchHubServerStatus,
  forgetHubSession,
  HubSsoClientError,
  type HubServerStatus,
} from "@/lib/hubSso";
import { hubSso, LOCAL_LOGIN_PATH, supabase } from "@/lib/hubSsoProject";
import { currentSessionStatus, isSigningOut } from "@/lib/hubSsoSession";
import { HubSsoLoading, HubSsoMessage } from "./HubSsoScreen";

const RECHECK_MS = 60_000;

/**
 * Wraps the admin area. With VITE_HUB_SSO_ENABLED=true, people with a hub-managed role only get in
 * with a session opened through the hub; without a session they go straight to the hub (no local
 * login screen). A hub session signed out on the hub (back-channel) is dropped on the next check
 * (every minute and when the tab comes back). With the flag off, it renders the children as before.
 */
export default function HubAdminGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  const nextRef = useRef(`${location.pathname}${location.search}${location.hash}`);
  nextRef.current = `${location.pathname}${location.search}${location.hash}`;
  const [state, setState] = useState<"checking" | "allow" | "redirecting" | "error" | "signed-out">(hubSso.enabled ? "checking" : "allow");
  const [error, setError] = useState("");
  const allowedRef = useRef(false);
  const runningRef = useRef(false);

  const goToHub = useCallback(async () => {
    setState("redirecting");
    try {
      window.location.assign(await beginHubLogin(hubSso, nextRef.current));
    } catch (err) {
      setError(err instanceof HubSsoClientError ? err.message : "Não foi possível abrir o Hub. Tente de novo.");
      setState("error");
    }
  }, []);

  const check = useCallback(
    async (background: boolean) => {
      if (!hubSso.enabled || runningRef.current) return;
      if (isSigningOut()) {
        // "Sair" was clicked: never log straight back in through the hub.
        allowedRef.current = false;
        setState("signed-out");
        return;
      }
      runningRef.current = true;
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        let server: HubServerStatus | "unreachable";
        try {
          server = await fetchHubServerStatus(hubSso);
        } catch {
          server = "unreachable";
        }
        const sessionStatus = session && server !== "unreachable" && server.enabled ? await currentSessionStatus() : "unknown";
        const decision = decideAccess({ cfg: hubSso, server, hasSession: !!session, session: sessionStatus });

        if (decision === "allow") {
          allowedRef.current = true;
          setState("allow");
        } else if (decision === "relogin") {
          // Signed out on the hub: the server already deleted this session; drop the local copy.
          await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
          forgetHubSession();
          allowedRef.current = false;
          if (hubSso.localLogin) setState("allow");
          else await goToHub();
        } else if (decision === "login") {
          allowedRef.current = false;
          await goToHub();
        } else if (!(background && allowedRef.current)) {
          // A failed background check never throws someone out in the middle of their work.
          setError("Não foi possível conferir o login pelo Hub. Confira a internet e tente de novo.");
          setState("error");
        }
      } finally {
        runningRef.current = false;
      }
    },
    [goToHub],
  );

  useEffect(() => {
    if (!hubSso.enabled) return;
    void check(false);
    // Deferred: calling Supabase inside its own auth callback can deadlock the client.
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") window.setTimeout(() => void check(true), 0);
    });
    const timer = window.setInterval(() => void check(true), RECHECK_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void check(true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      data.subscription.unsubscribe();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check]);

  if (state === "allow") return <>{children}</>;
  if (state === "signed-out") {
    return (
      <HubSsoMessage
        title="Você saiu"
        message="Sua sessão neste sistema foi encerrada."
        actions={[{ label: "Entrar de novo", primary: true, onClick: () => void goToHub() }]}
      />
    );
  }
  if (state === "error") {
    const actions = [{ label: "Tentar de novo", primary: true, onClick: () => void check(false) }];
    if (hubSso.localLogin) actions.push({ label: "Entrar com e-mail e senha", primary: false, onClick: () => window.location.assign(LOCAL_LOGIN_PATH) });
    return <HubSsoMessage title="Login pelo Hub" message={error} actions={actions} />;
  }
  return <HubSsoLoading text={state === "redirecting" ? "Abrindo o Hub..." : "Verificando o acesso..."} />;
}

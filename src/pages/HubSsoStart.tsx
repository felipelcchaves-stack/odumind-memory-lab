import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { beginHubLogin, fetchHubServerStatus, HubSsoClientError, validateInitiation } from "@/lib/hubSso";
import { hubSso, supabase } from "@/lib/hubSsoProject";
import { currentSessionStatus } from "@/lib/hubSsoSession";
import { HubSsoLoading, HubSsoMessage } from "@/components/hub-sso/HubSsoScreen";

/**
 * /auth/hub/iniciar — OIDC third-party initiated login (the hub launcher opens this with
 * ?iss=<hub issuer>&target_link_uri=<system url>). Lands inside the admin area already signed in.
 */
export default function HubSsoStart() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      if (!hubSso.enabled) {
        navigate(hubSso.adminHome, { replace: true });
        return;
      }
      const entry = validateInitiation(new URLSearchParams(window.location.search), window.location.origin, hubSso);
      if (!entry.ok) {
        setError(entry.message);
        return;
      }
      try {
        const server = await fetchHubServerStatus(hubSso);
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const status = session ? await currentSessionStatus() : "unknown";
        // Already inside with a hub session (or SSO switched off on the server): just go there.
        if (!server.enabled || (status !== "unknown" && status.status === "active")) {
          navigate(entry.next, { replace: true });
          return;
        }
        window.location.replace(await beginHubLogin(hubSso, entry.next));
      } catch (err) {
        setError(err instanceof HubSsoClientError ? err.message : "Não foi possível abrir o Hub. Tente de novo.");
      }
    })();
  }, [navigate]);

  if (error) {
    return (
      <HubSsoMessage
        title="Não foi possível entrar"
        message={error}
        actions={[{ label: "Ir para a área administrativa", primary: true, href: hubSso.adminHome }]}
      />
    );
  }
  return <HubSsoLoading text="Entrando pelo Hub..." />;
}

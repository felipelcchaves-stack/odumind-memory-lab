import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { beginHubLogin, finishHubLogin, HubSsoClientError, rememberHubSession } from "@/lib/hubSso";
import { afterHubSession, beforeHubSession, hubSso, LOCAL_LOGIN_PATH, supabase } from "@/lib/hubSsoProject";
import { HubSsoLoading, HubSsoMessage } from "@/components/hub-sso/HubSsoScreen";

/** /auth/hub/callback — the hub sends the browser here with ?code=&state= after login. */
export default function HubSsoCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // Take the one-time code out of the address bar and history before anything else runs
    // (analytics, extensions, a reload): it only lives in this variable from now on.
    const search = window.location.search;
    window.history.replaceState(null, "", window.location.pathname);
    (async () => {
      try {
        if (!hubSso.enabled) throw new HubSsoClientError("O login pelo Hub está desligado neste sistema.");
        const result = await finishHubLogin(hubSso, search);

        // Another session in this browser (e.g. a student account) is closed before the switch.
        const {
          data: { session: current },
        } = await supabase.auth.getSession();
        if (current) await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

        await beforeHubSession();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        });
        if (sessionError) throw new HubSsoClientError("Não foi possível abrir a sessão neste navegador. Tente de novo.");
        rememberHubSession({ endSessionUrl: result.endSessionUrl, userId: result.userId });
        await afterHubSession(result.session);
        navigate(result.next, { replace: true });
      } catch (err) {
        setError(err instanceof HubSsoClientError ? err.message : "O login pelo Hub falhou. Tente de novo.");
      }
    })();
  }, [navigate]);

  if (!error) return <HubSsoLoading text="Entrando..." />;

  const hubHome = hubSso.issuer ? new URL(hubSso.issuer).origin : "";
  const actions = [
    {
      label: "Tentar de novo",
      primary: true,
      onClick: () => {
        beginHubLogin(hubSso, hubSso.adminHome)
          .then((url) => window.location.assign(url))
          .catch((err) => setError(err instanceof HubSsoClientError ? err.message : "Não foi possível abrir o Hub."));
      },
    },
  ];
  if (hubHome) actions.push({ label: "Voltar ao Hub", primary: false, onClick: () => window.location.assign(hubHome) });
  if (hubSso.localLogin) actions.push({ label: "Entrar com e-mail e senha", primary: false, onClick: () => navigate(LOCAL_LOGIN_PATH) });
  return <HubSsoMessage title="Não foi possível entrar" message={error} actions={actions} />;
}

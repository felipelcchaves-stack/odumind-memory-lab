// Hub single sign-on for the admin area. Docs: deploy/HUB-SSO.md. Logic: ../_shared/hub-sso/.
import { handlerFromEnv } from "../_shared/hub-sso/server.ts";

Deno.serve(handlerFromEnv((name) => Deno.env.get(name)));

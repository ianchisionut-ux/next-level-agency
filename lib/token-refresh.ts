import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { refreshGoogleToken } from "@/lib/oauth/google";
import { getLongLivedToken } from "@/lib/oauth/meta";
import type { ConnectedAccount } from "@prisma/client";

const REFRESH_MARGIN_MS = 48 * 60 * 60 * 1000; // reimprospatam daca expira in <48h

/**
 * Verifica daca token-ul unui cont conectat expira in curand si, daca da,
 * il reimprospateaza folosind refresh_token-ul (Google/TikTok) sau
 * mecanismul de extindere Meta. Returneaza access token-ul valid (decriptat).
 */
export async function ensureFreshToken(account: ConnectedAccount): Promise<string> {
  const currentToken = decrypt(account.accessToken);

  const expiresSoon =
    account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;

  if (!expiresSoon) return currentToken;

  switch (account.platform) {
    case "GOOGLE_BUSINESS": {
      if (!account.refreshToken) return currentToken; // nimic de facut fara refresh token
      const refreshed = await refreshGoogleToken(decrypt(account.refreshToken));
      const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { accessToken: encrypt(refreshed.access_token), tokenExpiresAt: expiresAt },
      });
      return refreshed.access_token;
    }

    case "FACEBOOK":
    case "INSTAGRAM": {
      // token-urile Meta long-lived se pot re-extinde cat timp sunt inca valide
      try {
        const extended = await getLongLivedToken(currentToken);
        const expiresAt =
          typeof extended.expires_in === "number" && Number.isFinite(extended.expires_in)
            ? new Date(Date.now() + extended.expires_in * 1000)
            : null;
        await prisma.connectedAccount.update({
          where: { id: account.id },
          data: { accessToken: encrypt(extended.access_token), tokenExpiresAt: expiresAt },
        });
        return extended.access_token;
      } catch {
        // daca extinderea esueaza, folosim tot ce avem si lasam publicarea sa esueze clar
        return currentToken;
      }
    }

    case "TIKTOK": {
      if (!account.refreshToken) return currentToken;
      const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY!,
          client_secret: process.env.TIKTOK_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: decrypt(account.refreshToken),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) return currentToken;
      const expiresAt = new Date(Date.now() + data.expires_in * 1000);
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: {
          accessToken: encrypt(data.access_token),
          refreshToken: data.refresh_token ? encrypt(data.refresh_token) : account.refreshToken,
          tokenExpiresAt: expiresAt,
        },
      });
      return data.access_token;
    }

    default:
      return currentToken;
  }
}

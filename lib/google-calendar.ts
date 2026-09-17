import { decrypt, encrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { refreshGoogleToken } from "@/lib/oauth/google";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const BUCHAREST_TIME_ZONE = "Europe/Bucharest";
export const GOOGLE_CALENDAR_STATE_COOKIE = "signal_google_calendar_oauth_state";

const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];

type CalendarItemForGoogle = {
  id: string;
  workspaceId: string;
  authorId: string;
  title: string;
  notes: string | null;
  type: string;
  priority: string;
  status: string;
  visibility: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  googleEventId: string | null;
  googleCalendarId: string | null;
  googleOwnerId: string | null;
};

type GoogleEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  extendedProperties?: {
    private?: Record<string, string>;
  };
};

function calendarRedirectUri() {
  return process.env.GOOGLE_CALENDAR_REDIRECT_URI || "";
}

export function isGoogleCalendarConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      calendarRedirectUri()
  );
}

export function getGoogleCalendarAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: calendarRedirectUri(),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: GOOGLE_CALENDAR_SCOPES.join(" "),
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeGoogleCalendarCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: calendarRedirectUri(),
      grant_type: "authorization_code",
      code,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Conectarea la Google Calendar a eșuat.");
  }
  return data as { access_token: string; refresh_token?: string; expires_in: number };
}

export async function getGoogleAccountEmail(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || "Nu am putut identifica contul Google.");
  return typeof data.email === "string" ? data.email : null;
}

async function getCalendarAccessToken(userId: string, forceRefresh = false) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) return null;

  const expiresSoon = !connection.tokenExpiresAt || connection.tokenExpiresAt.getTime() <= Date.now() + 60_000;
  if (!forceRefresh && !expiresSoon) {
    return { connection, accessToken: decrypt(connection.accessToken) };
  }

  if (!connection.refreshToken) throw new Error("Reconectează Google Calendar pentru a reînnoi accesul.");
  const refreshed = await refreshGoogleToken(decrypt(connection.refreshToken));
  const updated = await prisma.googleCalendarConnection.update({
    where: { userId },
    data: {
      accessToken: encrypt(refreshed.access_token),
      tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    },
  });
  return { connection: updated, accessToken: refreshed.access_token };
}

async function googleCalendarRequest(
  userId: string,
  path: string,
  init: RequestInit = {},
  allowNotFound = false
) {
  let auth = await getCalendarAccessToken(userId);
  if (!auth) return null;

  const execute = (token: string) =>
    fetch(`${GOOGLE_CALENDAR_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

  let response = await execute(auth.accessToken);
  if (response.status === 401) {
    auth = await getCalendarAccessToken(userId, true);
    if (!auth) return null;
    response = await execute(auth.accessToken);
  }
  if (allowNotFound && (response.status === 404 || response.status === 410)) return response;
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || `Google Calendar a răspuns cu ${response.status}.`);
  }
  return response;
}

function dateInBucharest(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: BUCHAREST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function toGoogleEvent(item: CalendarItemForGoogle) {
  const base = {
    summary: item.title,
    description: item.notes || undefined,
    extendedProperties: {
      private: {
        nextLevelItemId: item.id,
        nextLevelWorkspaceId: item.workspaceId,
        nextLevelType: item.type,
        nextLevelPriority: item.priority,
        nextLevelStatus: item.status,
        nextLevelVisibility: item.visibility,
      },
    },
  };

  if (item.allDay) {
    const startDate = dateInBucharest(item.startAt);
    let endDate = item.endAt ? dateInBucharest(item.endAt) : addDays(startDate, 1);
    if (endDate <= startDate) endDate = addDays(startDate, 1);
    return { ...base, start: { date: startDate }, end: { date: endDate } };
  }

  const endAt = item.endAt && item.endAt > item.startAt
    ? item.endAt
    : new Date(item.startAt.getTime() + 60 * 60 * 1000);
  return {
    ...base,
    start: { dateTime: item.startAt.toISOString(), timeZone: BUCHAREST_TIME_ZONE },
    end: { dateTime: endAt.toISOString(), timeZone: BUCHAREST_TIME_ZONE },
  };
}

export async function syncInternalItemToGoogle(itemId: string) {
  const item = await prisma.internalCalendarItem.findUnique({ where: { id: itemId } });
  if (!item) return { synced: false as const };
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId: item.authorId } });
  if (!connection) return { synced: false as const };

  const calendarId = item.googleCalendarId || connection.calendarId;
  const payload = JSON.stringify(toGoogleEvent(item));
  let eventId = item.googleOwnerId === item.authorId ? item.googleEventId : null;

  if (eventId) {
    const response = await googleCalendarRequest(
      item.authorId,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "PATCH", body: payload },
      true
    );
    if (response && response.ok) return { synced: true as const, eventId };
    eventId = null;
  }

  const response = await googleCalendarRequest(
    item.authorId,
    `/calendars/${encodeURIComponent(connection.calendarId)}/events`,
    { method: "POST", body: payload }
  );
  if (!response) return { synced: false as const };
  const event = (await response.json()) as GoogleEvent;
  if (!event.id) throw new Error("Google Calendar nu a returnat identificatorul evenimentului.");
  await prisma.internalCalendarItem.update({
    where: { id: item.id },
    data: {
      googleEventId: event.id,
      googleCalendarId: connection.calendarId,
      googleOwnerId: item.authorId,
    },
  });
  return { synced: true as const, eventId: event.id };
}

export async function deleteInternalItemFromGoogle(item: CalendarItemForGoogle) {
  if (!item.googleEventId || !item.googleCalendarId || !item.googleOwnerId) return;
  const response = await googleCalendarRequest(
    item.googleOwnerId,
    `/calendars/${encodeURIComponent(item.googleCalendarId)}/events/${encodeURIComponent(item.googleEventId)}`,
    { method: "DELETE" },
    true
  );
  if (response && !response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error("Evenimentul nu a putut fi șters din Google Calendar.");
  }
}

function eventDates(event: GoogleEvent) {
  if (event.start?.date) {
    return {
      allDay: true,
      startAt: new Date(`${event.start.date}T12:00:00Z`),
      endAt: event.end?.date ? new Date(`${event.end.date}T12:00:00Z`) : null,
    };
  }
  if (!event.start?.dateTime) return null;
  const startAt = new Date(event.start.dateTime);
  if (Number.isNaN(startAt.getTime())) return null;
  const endAt = event.end?.dateTime ? new Date(event.end.dateTime) : null;
  return { allDay: false, startAt, endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : null };
}

const ALLOWED_TYPES = new Set(["NOTE", "TASK", "MEETING", "DEADLINE"]);
const ALLOWED_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);
const ALLOWED_STATUSES = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const ALLOWED_VISIBILITIES = new Set(["TEAM", "PERSONAL"]);

async function applyGoogleEvent(userId: string, workspaceId: string, calendarId: string, event: GoogleEvent) {
  if (!event.id) return "ignored" as const;
  const linked = await prisma.internalCalendarItem.findFirst({
    where: { googleOwnerId: userId, googleCalendarId: calendarId, googleEventId: event.id },
  });
  if (linked && linked.workspaceId !== workspaceId) return "ignored" as const;

  if (event.status === "cancelled") {
    if (linked) {
      await prisma.internalCalendarItem.delete({ where: { id: linked.id } });
      return "deleted" as const;
    }
    return "ignored" as const;
  }

  const dates = eventDates(event);
  if (!dates) return "ignored" as const;
  const meta = event.extendedProperties?.private || {};
  if (meta.nextLevelWorkspaceId && meta.nextLevelWorkspaceId !== workspaceId) return "ignored" as const;
  const title = event.summary?.trim() || "Eveniment Google Calendar";
  const data = {
    title,
    notes: event.description?.trim() || null,
    startAt: dates.startAt,
    endAt: dates.endAt,
    allDay: dates.allDay,
    type: ALLOWED_TYPES.has(meta.nextLevelType) ? meta.nextLevelType : "MEETING",
    priority: ALLOWED_PRIORITIES.has(meta.nextLevelPriority) ? meta.nextLevelPriority : "MEDIUM",
    status: ALLOWED_STATUSES.has(meta.nextLevelStatus) ? meta.nextLevelStatus : "TODO",
    visibility: ALLOWED_VISIBILITIES.has(meta.nextLevelVisibility) ? meta.nextLevelVisibility : "PERSONAL",
  };

  if (linked) {
    await prisma.internalCalendarItem.update({ where: { id: linked.id }, data });
    return "updated" as const;
  }

  const appItemId = meta.nextLevelItemId;
  if (appItemId) {
    const appItem = await prisma.internalCalendarItem.findFirst({
      where: { id: appItemId, workspaceId, authorId: userId },
    });
    if (appItem) {
      await prisma.internalCalendarItem.update({
        where: { id: appItem.id },
        data: { ...data, googleEventId: event.id, googleCalendarId: calendarId, googleOwnerId: userId },
      });
      return "updated" as const;
    }
  }

  await prisma.internalCalendarItem.create({
    data: {
      workspaceId,
      authorId: userId,
      assigneeId: null,
      ...data,
      visibility: meta.nextLevelWorkspaceId ? data.visibility : "PERSONAL",
      googleEventId: event.id,
      googleCalendarId: calendarId,
      googleOwnerId: userId,
    },
  });
  return "created" as const;
}

export async function syncGoogleCalendarForUser(userId: string, workspaceId: string, fullSync = false) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("Conectează mai întâi Google Calendar.");
  const calendarId = connection.calendarId;
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  let syncToken = fullSync ? null : connection.syncToken;
  const counts = { created: 0, updated: 0, deleted: 0, ignored: 0 };

  do {
    const params = new URLSearchParams({
      singleEvents: "true",
      showDeleted: "true",
      maxResults: "2500",
    });
    if (pageToken) params.set("pageToken", pageToken);
    if (syncToken) {
      params.set("syncToken", syncToken);
    } else {
      const timeMin = new Date();
      timeMin.setFullYear(timeMin.getFullYear() - 1);
      const timeMax = new Date();
      timeMax.setFullYear(timeMax.getFullYear() + 2);
      params.set("timeMin", timeMin.toISOString());
      params.set("timeMax", timeMax.toISOString());
      params.set("orderBy", "startTime");
    }

    const response = await googleCalendarRequest(
      userId,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      {},
      true
    );
    if (!response) throw new Error("Conexiunea Google Calendar nu mai există.");
    if (response.status === 410 && syncToken) {
      await prisma.googleCalendarConnection.update({ where: { userId }, data: { syncToken: null } });
      return syncGoogleCalendarForUser(userId, workspaceId, true);
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || "Sincronizarea Google Calendar a eșuat.");
    }
    const data = (await response.json()) as {
      items?: GoogleEvent[];
      nextPageToken?: string;
      nextSyncToken?: string;
    };
    for (const event of data.items || []) {
      const result = await applyGoogleEvent(userId, workspaceId, calendarId, event);
      counts[result]++;
    }
    pageToken = data.nextPageToken;
    nextSyncToken = data.nextSyncToken || nextSyncToken;
  } while (pageToken);

  await prisma.googleCalendarConnection.update({
    where: { userId },
    data: { syncToken: nextSyncToken || syncToken, lastSyncedAt: new Date() },
  });
  return counts;
}

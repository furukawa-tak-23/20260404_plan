import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  colorId?: string;
  htmlLink?: string;
  calendarId: string;
}

export interface CalendarInfo {
  id: string;
  summary: string;
  backgroundColor: string;
  foregroundColor: string;
}

interface UseGoogleCalendarReturn {
  isSignedIn: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
  getCalendars: () => Promise<CalendarInfo[]>;
  getEvents: (startDate: Date, endDate: Date, calendarIds: string[]) => Promise<CalendarEvent[]>;
}

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

async function fetchCalendarList(accessToken: string): Promise<CalendarInfo[]> {
  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err?.error?.message ?? 'Calendar API error'), { status: res.status });
  }
  const data = await res.json();
  return (data.items ?? []).map((item: Record<string, unknown>) => ({
    id: item.id as string,
    summary: (item.summary as string) ?? '(No title)',
    backgroundColor: (item.backgroundColor as string) ?? '#4dd0e1',
    foregroundColor: (item.foregroundColor as string) ?? '#ffffff',
  }));
}

async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
    showDeleted: 'false',
    singleEvents: 'true',
    maxResults: '2500',
    orderBy: 'startTime',
  });

  const encodedId = encodeURIComponent(calendarId);
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err?.error?.message ?? 'Calendar API error'), { status: res.status });
  }

  const data = await res.json();
  return (data.items ?? []).map((item: Record<string, unknown>) => {
    const startObj = item.start as Record<string, string> | undefined;
    const endObj = item.end as Record<string, string> | undefined;
    return {
      id: `${calendarId}::${(item.id as string) ?? ''}`,
      summary: (item.summary as string) ?? '(No title)',
      start: startObj?.dateTime ?? startObj?.date ?? '',
      end: endObj?.dateTime ?? endObj?.date ?? '',
      colorId: item.colorId as string | undefined,
      htmlLink: item.htmlLink as string | undefined,
      calendarId,
    };
  });
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSignedIn(!!session);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(() => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: CALENDAR_SCOPE,
        redirectTo: window.location.href,
      },
    });
  }, []);

  const signOut = useCallback(() => {
    supabase.auth.signOut();
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    let token = session.provider_token;
    if (!token) {
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      token = refreshed?.provider_token ?? null;
      if (!token) {
        setError('Googleカレンダーへのアクセスが切れました。再ログインしてください。');
        setIsSignedIn(false);
        return null;
      }
    }
    return token;
  }, []);

  const getCalendars = useCallback(async (): Promise<CalendarInfo[]> => {
    const token = await getAccessToken();
    if (!token) return [];

    try {
      return await fetchCalendarList(token);
    } catch (err) {
      const status = (err as { status?: number }).status;
      if (status === 401) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession();
        const retryToken = refreshed?.provider_token;
        if (!retryToken) {
          setError('Googleカレンダーへのアクセスが切れました。再ログインしてください。');
          setIsSignedIn(false);
          return [];
        }
        try {
          return await fetchCalendarList(retryToken);
        } catch {
          setError('カレンダー一覧の取得に失敗しました。');
          return [];
        }
      }
      setError('カレンダー一覧の取得に失敗しました。');
      return [];
    }
  }, [getAccessToken]);

  const getEvents = useCallback(async (startDate: Date, endDate: Date, calendarIds: string[]): Promise<CalendarEvent[]> => {
    if (calendarIds.length === 0) return [];

    const token = await getAccessToken();
    if (!token) return [];

    const fetchAll = (t: string) =>
      Promise.allSettled(calendarIds.map(id => fetchCalendarEvents(t, id, startDate, endDate)));

    let results = await fetchAll(token);

    // 401が含まれていたらトークンをリフレッシュして再試行
    const has401 = results.some(r => r.status === 'rejected' && (r.reason as { status?: number }).status === 401);
    if (has401) {
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      const retryToken = refreshed?.provider_token;
      if (!retryToken) {
        setError('Googleカレンダーへのアクセスが切れました。再ログインしてください。');
        setIsSignedIn(false);
        return [];
      }
      results = await fetchAll(retryToken);
    }

    const events: CalendarEvent[] = [];
    let hasError = false;
    for (const result of results) {
      if (result.status === 'fulfilled') {
        events.push(...result.value);
      } else {
        hasError = true;
      }
    }
    if (hasError) {
      setError('一部のカレンダーの取得に失敗しました。');
    }
    return events;
  }, [getAccessToken]);

  return { isSignedIn, isLoading, error, signIn, signOut, getCalendars, getEvents };
}

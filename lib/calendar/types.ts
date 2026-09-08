export type CalendarCredentials = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export type ProviderCalendar = {
  providerCalendarId: string;
  name: string;
  timeZone: string;
  primary: boolean;
};

export type ProviderEvent = {
  providerEventId: string;
  title: string;
  location: string | null;
  status: "confirmed" | "tentative" | "cancelled";
  startAt: Date | null;
  endAt: Date | null;
  timeZone: string | null;
  allDay: boolean;
  recurringEventId: string | null;
  originalStartTime: string | null;
  providerUpdatedAt: Date;
};

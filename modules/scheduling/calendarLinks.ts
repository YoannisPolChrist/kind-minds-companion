import type { AppointmentDetails, CalendarLink } from './types';

function formatDate(date: Date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildGoogleLink(details: AppointmentDetails): CalendarLink {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: details.title,
        dates: `${formatDate(details.startDate)}/${formatDate(details.endDate || new Date(details.startDate.getTime() + 45 * 60000))}`,
        details: details.description || '',
        location: details.location || '',
    });

    return {
        provider: 'google',
        label: 'In Google Kalender oeffnen',
        url: `https://calendar.google.com/calendar/render?${params.toString()}`,
    };
}

function buildICS(details: AppointmentDetails): CalendarLink {
    const dtStamp = formatDate(new Date());
    const dtStart = formatDate(details.startDate);
    const dtEnd = formatDate(details.endDate || new Date(details.startDate.getTime() + 45 * 60000));

    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${details.title}`,
        details.description ? `DESCRIPTION:${details.description}` : '',
        details.location ? `LOCATION:${details.location}` : '',
        `UID:${details.id}`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean).join('\n');

    return {
        provider: 'icloud',
        label: 'Als ICS exportieren',
        url: `data:text/calendar;charset=utf8,${encodeURIComponent(ics)}`,
    };
}

export function buildCalendarLinks(details: AppointmentDetails): CalendarLink[] {
    return [buildGoogleLink(details), buildICS(details)];
}

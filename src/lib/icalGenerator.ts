interface CalendarEvent {
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
}

export function generateICalendar(events: CalendarEvent[], planName: string = 'Plano de Estudos Odu Ifá'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Odu Ifá//Plano de Estudos//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + planName,
    'X-WR-TIMEZONE:America/Sao_Paulo',
  ];

  events.forEach((event, index) => {
    const uid = `${timestamp}-${index}@oduifa.com`;
    const dtstart = formatICalDate(event.start);
    const dtend = formatICalDate(event.end);
    
    ical.push(
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + timestamp,
      'DTSTART:' + dtstart,
      'DTEND:' + dtend,
      'SUMMARY:' + escapeICalText(event.title),
    );
    
    if (event.description) {
      ical.push('DESCRIPTION:' + escapeICalText(event.description));
    }
    
    if (event.location) {
      ical.push('LOCATION:' + escapeICalText(event.location));
    }
    
    ical.push(
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'END:VEVENT'
    );
  });

  ical.push('END:VCALENDAR');
  
  return ical.join('\r\n');
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function downloadICalFile(icalContent: string, filename: string = 'plano-estudos.ics') {
  const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

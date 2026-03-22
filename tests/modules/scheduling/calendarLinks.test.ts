import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendarLinks } from '../../../modules/scheduling/calendarLinks';

test('buildCalendarLinks returns google and icloud entries', () => {
    const links = buildCalendarLinks({
        id: 'appointment-1',
        title: 'Therapie',
        startDate: new Date('2026-03-11T10:00:00.000Z'),
        endDate: new Date('2026-03-11T10:45:00.000Z'),
    });

    assert.equal(links.length, 2);
    assert.equal(links[0].provider, 'google');
    assert.equal(links[1].provider, 'icloud');
});

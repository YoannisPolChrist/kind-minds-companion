import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildNotificationDocumentData,
    formatAppointmentNotificationLabel,
    normalizeNotificationRecord,
    sortNotifications,
} from '../../../modules/notifications/utils';

test('buildNotificationDocumentData creates exercise-specific routes when an exercise id is present', () => {
    const document = buildNotificationDocumentData({
        userId: 'client-1',
        type: 'exercise_assigned',
        exerciseId: 'exercise-42',
        exerciseTitle: 'Atemfokus',
        createdAt: '2026-03-12T08:00:00.000Z',
    });

    assert.equal(document.type, 'exercise_assigned');
    assert.equal(document.appPath, '/(app)/exercise/exercise-42');
    assert.equal(document.webPath, '/exercise/exercise-42');
    assert.equal(document.actionLabel, 'Uebung oeffnen');
    assert.equal(document.body, 'Dein Therapeut hat dir "Atemfokus" zugewiesen.');
});

test('normalizeNotificationRecord maps legacy FILE_UPLOAD resource notifications to the shared resource flow', () => {
    const record = normalizeNotificationRecord({
        id: 'notif-1',
        userId: 'client-1',
        type: 'FILE_UPLOAD',
        title: 'Neue Ressource',
        body: 'Hey, fuer dich wurde neues Material hinterlegt!',
        read: false,
    });

    assert.equal(record.type, 'resource_shared');
    assert.equal(record.appPath, '/(app)/resources');
    assert.equal(record.webPath, '/resources');
    assert.equal(record.actionLabel, 'Ressourcen ansehen');
});

test('normalizeNotificationRecord keeps file uploads on the resources inbox path', () => {
    const record = normalizeNotificationRecord({
        id: 'notif-2',
        userId: 'client-1',
        type: 'FILE_UPLOAD',
        title: 'Neue Datei',
        body: 'Hey, fuer dich wurde eine neue Datei hinterlegt!',
        fileName: 'arbeitsblatt.pdf',
        read: false,
    });

    assert.equal(record.type, 'file_uploaded');
    assert.equal(record.appPath, '/(app)/resources');
    assert.equal(record.actionLabel, 'Dateien ansehen');
    assert.equal(record.body, 'Hey, fuer dich wurde eine neue Datei hinterlegt!');
});

test('sortNotifications orders entries newest-first across timestamp formats', () => {
    const middleTimestampSeconds = Math.floor(new Date('2026-03-12T08:30:00.000Z').getTime() / 1000);
    const sorted = sortNotifications([
        { id: 'a', createdAt: '2026-03-12T07:00:00.000Z' },
        { id: 'b', createdAt: { seconds: middleTimestampSeconds } },
        { id: 'c', createdAt: new Date('2026-03-12T09:00:00.000Z') },
    ]);

    assert.deepEqual(sorted.map((entry) => entry.id), ['c', 'b', 'a']);
});

test('formatAppointmentNotificationLabel creates a stable German appointment label', () => {
    const label = formatAppointmentNotificationLabel('2026-03-12T14:30:00.000Z');

    assert.match(label, /2026/);
    assert.match(label, /:30 Uhr/);
});

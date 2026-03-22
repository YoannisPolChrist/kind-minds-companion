import test from 'node:test';
import assert from 'node:assert/strict';
import { filterResources, inferResourceType, sortResources } from '../../../modules/resources/utils';

const resources = [
    { id: '1', title: 'Achtsamkeitsblatt', description: 'PDF fuer Atmung', type: 'pdf', tags: ['atmung'], isPinned: false, createdAt: { seconds: 10 } },
    { id: '2', title: 'Video Intro', description: 'Kurzes Video', type: 'video', tags: ['intro'], isPinned: true, createdAt: { seconds: 5 } },
    { id: '3', title: 'Externer Link', description: 'Website', type: 'link', tags: ['wissen'], isPinned: false, createdAt: { seconds: 15 } },
];

test('sortResources prioritizes pinned items, then date', () => {
    assert.deepEqual(sortResources(resources).map((entry) => entry.id), ['2', '3', '1']);
});

test('filterResources applies search and filter buckets', () => {
    assert.deepEqual(filterResources(resources, 'video', 'all').map((entry) => entry.id), ['2']);
    assert.deepEqual(filterResources(resources, '', 'documents').map((entry) => entry.id), ['1']);
    assert.deepEqual(filterResources(resources, '', 'links').map((entry) => entry.id), ['3']);
});

test('inferResourceType maps mime types to resource types', () => {
    assert.equal(inferResourceType('image/png'), 'image');
    assert.equal(inferResourceType('video/mp4'), 'video');
    assert.equal(inferResourceType('application/pdf'), 'pdf');
    assert.equal(inferResourceType('application/msword'), 'document');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { filterTemplatesByQuery } from '../../../modules/templates/utils';

const templates = [
    { id: '1', title: 'Atem Fokus', blocks: [{ content: 'Atme vier Sekunden ein' }] },
    { id: '2', title: 'Schlafroutine', blocks: [{ content: 'Licht dimmen und ruhig werden' }] },
];

test('filterTemplatesByQuery returns all templates for empty queries', () => {
    assert.equal(filterTemplatesByQuery(templates, '').length, 2);
});

test('filterTemplatesByQuery matches titles and block content', () => {
    assert.deepEqual(filterTemplatesByQuery(templates, 'licht').map((entry) => entry.id), ['2']);
    assert.deepEqual(filterTemplatesByQuery(templates, 'atem').map((entry) => entry.id), ['1']);
});

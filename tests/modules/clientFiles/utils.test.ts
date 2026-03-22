import test from 'node:test';
import assert from 'node:assert/strict';
import { filterClientFiles, formatClientFileSize, getClientFileDisplayMeta, getClientFilePreviewKind, sortClientFiles } from '../../../modules/clientFiles/utils';

const files = [
    { id: '1', title: 'Arbeitsblatt', originalName: 'blatt.pdf', createdAt: { seconds: 10 }, mimeType: 'application/pdf' },
    { id: '2', title: 'Bild', originalName: 'cover.png', createdAt: { seconds: 20 }, mimeType: 'image/png' },
];

test('sortClientFiles orders by createdAt descending', () => {
    assert.deepEqual(sortClientFiles(files as any).map((file) => file.id), ['2', '1']);
});

test('filterClientFiles matches title and original name', () => {
    assert.deepEqual(filterClientFiles(files as any, 'blatt').map((file) => file.id), ['1']);
    assert.deepEqual(filterClientFiles(files as any, 'cover').map((file) => file.id), ['2']);
});

test('formatClientFileSize creates human readable sizes', () => {
    assert.equal(formatClientFileSize(1024), '1.0 KB');
    assert.equal(formatClientFileSize(1024 * 1024), '1.0 MB');
});

test('preview and display helpers detect media classes', () => {
    assert.equal(getClientFilePreviewKind(files[0] as any), 'pdf');
    assert.equal(getClientFilePreviewKind(files[1] as any), 'image');
    assert.equal(getClientFileDisplayMeta(files[0] as any).label, 'PDF');
});

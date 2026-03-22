import test from 'node:test';
import assert from 'node:assert/strict';
import { isRemoteAsset } from '../../../modules/templates/utils';

test('isRemoteAsset detects remote urls', () => {
    assert.equal(isRemoteAsset('https://cdn.example.com/image.jpg'), true);
    assert.equal(isRemoteAsset('http://cdn.example.com/image.jpg'), true);
});

test('isRemoteAsset rejects local or empty values', () => {
    assert.equal(isRemoteAsset('file:///tmp/example.jpg'), false);
    assert.equal(isRemoteAsset(undefined), false);
    assert.equal(isRemoteAsset(''), false);
});

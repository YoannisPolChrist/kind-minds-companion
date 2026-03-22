import test from 'node:test';
import assert from 'node:assert/strict';
import { adoptionDecisions, benchmarkEntries, excludedRepos, rankedShortlist } from '../../../plans/githubBenchmark';
import type { TrackAction } from '../../../types/githubBenchmark';

const trackActions = new Set<TrackAction>([
    'adopt pattern',
    'borrow structure',
    'borrow UX only',
    'reject',
]);

test('shortlisted repos use a permissive license and map to at least one app subsystem', () => {
    assert.ok(rankedShortlist.length > 0);

    rankedShortlist.forEach((entry) => {
        assert.ok(entry.license === 'MIT' || entry.license === 'Apache-2.0');
        assert.ok(entry.current_app_mapping.length > 0);
        assert.equal(typeof entry.rank, 'number');
    });
});

test('excluded repos keep an explicit rejection reason', () => {
    assert.ok(excludedRepos.length > 0);

    excludedRepos.forEach((entry) => {
        assert.ok(entry.rejection_reason);
        assert.equal(entry.shortlist, false);
    });
});

test('benchmark rows expose the required benchmark fields and per-track actions', () => {
    benchmarkEntries.forEach((entry) => {
        assert.ok(entry.repo.length > 0);
        assert.ok(entry.maintenance_status.length > 0);
        assert.ok(entry.stack_match.length > 0);
        assert.ok(entry.best_fit_area.length > 0);
        assert.ok(entry.adoptability.length > 0);
        assert.ok(entry.risk.length > 0);
        assert.ok(entry.current_app_mapping.length > 0);
        assert.ok(entry.sources.length > 0);
        assert.ok(trackActions.has(entry.recommended_action.foundation));
        assert.ok(trackActions.has(entry.recommended_action.data));
        assert.ok(trackActions.has(entry.recommended_action['clinical-workflow']));
    });
});

test('the adoption backlog contains the three required implementation spikes', () => {
    assert.deepEqual(
        adoptionDecisions.map((decision) => decision.id),
        ['offline-read-cache-spike', 'notification-inbox-consistency-spike', 'app-shell-hardening-spike'],
    );

    adoptionDecisions.forEach((decision, index) => {
        assert.equal(decision.order, index + 1);
        assert.ok(decision.affected_modules.length > 0);
        assert.ok(decision.acceptance_criteria.length >= 3);
    });
});

export type BenchmarkLicense = 'MIT' | 'Apache-2.0' | 'NONE';

export type MaintenanceStatus = 'active' | 'moderate' | 'stale' | 'deprecated';

export type StackMatch = 'strong' | 'medium' | 'low';

export type FitArea = 'foundation' | 'data' | 'clinical-workflow' | 'reference-only';

export type Adoptability = 'high' | 'medium' | 'low' | 'reference-only';

export type RiskLevel = 'low' | 'medium' | 'high';

export type AppSubsystem =
    | 'checkins'
    | 'history'
    | 'resources'
    | 'templates'
    | 'scheduling'
    | 'notifications'
    | 'auth-session'
    | 'offline-cache';

export type TrackName = 'foundation' | 'data' | 'clinical-workflow';

export type TrackAction = 'adopt pattern' | 'borrow structure' | 'borrow UX only' | 'reject';

export interface BenchmarkEntry {
    repo: string;
    license: BenchmarkLicense;
    maintenance_status: MaintenanceStatus;
    stack_match: StackMatch;
    best_fit_area: FitArea[];
    adoptability: Adoptability;
    risk: RiskLevel;
    current_app_mapping: AppSubsystem[];
    recommended_action: Record<TrackName, TrackAction>;
    shortlist: boolean;
    rank: number | null;
    last_pushed_at: string;
    verified_at: string;
    rejection_reason?: string;
    notes: string[];
    sources: string[];
}

export interface AdoptionDecision {
    id: string;
    title: string;
    order: number;
    track: 'foundation' | 'data' | 'clinical-workflow';
    outcome: 'spike';
    repos: string[];
    affected_modules: string[];
    expected_effort: string;
    acceptance_criteria: string[];
}

# Frontend Human-Centered Law Audit

- Generated (UTC): 2026-10-03T02:32:33.431423+00:00
- Project: ICD
- Flow: MasterData create Shipping Line; re-audit partial evidence
- Auditor: Codex

## Summary

- Overall score: **38.42/100**
- Fast gate failures: **2** / 10
- Principle failures: **1** / 21
- Unknown principle checks: **20**

## Fast Gate

| Check | Status | Evidence | Fix |
|---|---|---|---|
| Single dominant primary CTA | UNKNOWN | Missing numeric metric: primary_cta_count | Keep one dominant primary action and demote secondary actions. |
| Critical touch targets >= 44px | FAIL | Target size below threshold. (min_target_size_px=33.3333, lower=44) | Increase hit area (padding/wrapper) for critical controls. |
| Primary completion action at task endpoint | PASS | Completion action aligns with task endpoint. | Place submit/continue where user naturally finishes the task. |
| Choice density <= 7 visible options | UNKNOWN | Missing numeric metric: screen_choice_count | Reduce options and defer advanced paths with progressive disclosure. |
| Progress visible on multi-step flows | UNKNOWN | Missing boolean metric: progress_visible | Add stepper/progress bar/counter for staged tasks. |
| Interaction feedback <= 400ms p95 | UNKNOWN | Missing numeric metric: feedback_ms_p95 | Show immediate pressed/loading feedback and reduce response latency. |
| Validation rules visible with inline recovery | FAIL | Validation guidance is hidden or vague. | Show requirements before submit and field-level actionable errors. |
| Input tolerance and normalization | UNKNOWN | Missing boolean metric: input_tolerant_parsing | Accept common formats and normalize internally. |
| Critical actions are at list/menu boundaries | UNKNOWN | Missing boolean metric: critical_actions_boundary_placement | Move high-priority actions to beginning or end positions. |
| Explicit positive ending/closure | UNKNOWN | Missing boolean metric: positive_end_state | Add success/failure confirmation and next-step guidance. |

## Principle Results

| Priority | Principle | Status | Weight | Rule | Diagnosis | Required change |
|---|---|---|---:|---|---|---|
|  | Fitts's Law | UNKNOWN | 5 | `rules/fitts-law.md` | Missing required metrics: primary_action_reach | Increase target size/padding and move high-value actions closer to task endpoints. |
|  | Hick's Law | UNKNOWN | 5 | `rules/hicks-law.md` | Missing required metrics: screen_choice_count, progressive_disclosure | Reduce choice density and introduce progressive disclosure. |
|  | Gestalt: Proximity | UNKNOWN | 4 | `rules/gestalt-proximity.md` | Missing numeric metric: group_spacing_ratio | Increase intra-group cohesion and inter-group separation. |
|  | Gestalt: Similarity | UNKNOWN | 4 | `rules/gestalt-similarity.md` | Missing boolean metric: role_style_consistency | Unify role-based tokens for color, shape, and typography. |
|  | Gestalt: Continuity | UNKNOWN | 3 | `rules/gestalt-continuity.md` | Missing boolean metric: continuity_cue | Align paths and expose continuation hints (peeking cards, steppers). |
|  | Gestalt: Closure | UNKNOWN | 2 | `rules/gestalt-closure.md` | Missing boolean metric: closure_support | Use simplified structure only when completion remains obvious. |
|  | Gestalt: Figure/Ground | UNKNOWN | 4 | `rules/gestalt-figure-ground.md` | Missing boolean metric: figure_ground_contrast | Strengthen scrim/layer contrast and focus hierarchy. |
|  | Gestalt: Common Fate | UNKNOWN | 3 | `rules/gestalt-common-fate.md` | Missing boolean metric: motion_group_consistency | Unify motion curves/directions for grouped elements. |
|  | Gestalt: Focal Point | UNKNOWN | 4 | `rules/gestalt-focal-point.md` | Missing numeric metric: focal_points | Converge to one visual priority and demote competing accents. |
|  | Von Restorff Effect | UNKNOWN | 3 | `rules/von-restorff-effect.md` | Missing numeric metric: isolated_key_element_count | Use selective contrast for one key choice, not all choices. |
|  | Jakob's Law | UNKNOWN | 4 | `rules/jakobs-law.md` | Missing boolean metric: pattern_familiarity | Align navigation/search/auth/checkout patterns with common standards. |
|  | Miller's Law | UNKNOWN | 4 | `rules/millers-law.md` | Missing numeric metric: chunk_count | Split dense screens into smaller chunked steps. |
|  | Goal-Gradient Hypothesis | UNKNOWN | 3 | `rules/goal-gradient-hypothesis.md` | Missing boolean metric: progress_visible | Expose progress counters and milestone reinforcement. |
| P2 | Zeigarnik Effect | FAIL | 3 | `rules/zeigarnik-effect.md` | No clear resume path for interrupted tasks. | Expose completion status and one-click resume mechanisms. |
|  | Tesler's Law | UNKNOWN | 4 | `rules/teslers-law.md` | Missing boolean metric: system_handles_complexity | Use smart defaults, autocomplete, masks, and structured controls. |
|  | Peak-End Rule | UNKNOWN | 4 | `rules/peak-end-rule.md` | Missing boolean metric: positive_end_state | Add clear success/failure closure with next-step guidance. |
|  | Postel's Law | UNKNOWN | 4 | `rules/postels-law.md` | Missing boolean metric: input_tolerant_parsing | Support tolerant parsing and provide precise recovery guidance. |
|  | Doherty Threshold | UNKNOWN | 5 | `rules/doherty-threshold.md` | Missing numeric metric: feedback_ms_p95 | Provide immediate visual acknowledgment and optimize perceived speed. |
|  | Serial Position Effect | UNKNOWN | 3 | `rules/serial-position-effect.md` | Missing boolean metric: critical_actions_boundary_placement | Move top-priority actions to start/end positions. |
|  | Occam's Razor | UNKNOWN | 3 | `rules/occams-razor.md` | Missing numeric metric: simplicity_score | Trim unnecessary states/features and simplify task path. |
|  | Parkinson's Law | UNKNOWN | 2 | `rules/parkinsons-law.md` | Missing boolean metric: scope_creep_signals | Enforce MVP boundaries and defer non-critical additions. |

## Priority Fix Backlog

- **P2 Zeigarnik Effect**: No clear resume path for interrupted tasks.
  - Rule: `rules/zeigarnik-effect.md`
  - Why it matters: Incomplete tasks persist in memory and drive return behavior.
  - Acceptance target: Higher interrupted-flow recovery.
  - Fix: Expose completion status and one-click resume mechanisms.

## Data Gaps

- **Fitts's Law**: Missing required metrics: primary_action_reach
- **Hick's Law**: Missing required metrics: screen_choice_count, progressive_disclosure
- **Gestalt: Proximity**: Missing numeric metric: group_spacing_ratio
- **Gestalt: Similarity**: Missing boolean metric: role_style_consistency
- **Gestalt: Continuity**: Missing boolean metric: continuity_cue
- **Gestalt: Closure**: Missing boolean metric: closure_support
- **Gestalt: Figure/Ground**: Missing boolean metric: figure_ground_contrast
- **Gestalt: Common Fate**: Missing boolean metric: motion_group_consistency
- **Gestalt: Focal Point**: Missing numeric metric: focal_points
- **Von Restorff Effect**: Missing numeric metric: isolated_key_element_count
- **Jakob's Law**: Missing boolean metric: pattern_familiarity
- **Miller's Law**: Missing numeric metric: chunk_count
- **Goal-Gradient Hypothesis**: Missing boolean metric: progress_visible
- **Tesler's Law**: Missing boolean metric: system_handles_complexity
- **Peak-End Rule**: Missing boolean metric: positive_end_state
- **Postel's Law**: Missing boolean metric: input_tolerant_parsing
- **Doherty Threshold**: Missing numeric metric: feedback_ms_p95
- **Serial Position Effect**: Missing boolean metric: critical_actions_boundary_placement
- **Occam's Razor**: Missing numeric metric: simplicity_score
- **Parkinson's Law**: Missing boolean metric: scope_creep_signals

## Recheck Criteria

- Fast gate failures must be zero.
- Overall score should meet or exceed team threshold.
- Unknown checks should be resolved by adding missing evidence.


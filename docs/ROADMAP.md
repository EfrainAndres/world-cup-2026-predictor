# Roadmap

This roadmap organizes the project into phases so each step has a clear purpose and quality bar.

| Phase | Name | Primary Outcome | Status |
| --- | --- | --- | --- |
| 0.0 | Project Foundation | Define scope, docs, roadmap, and working standards. | Done |
| 0.1 | Architecture Foundation | Define repository structure, architecture rules, ADRs, and package boundaries. | Done |
| 0.2 | Technical Decisions Foundation | Define stack choices, coding standards, Git workflow, and technical ADRs. | Done |
| 0.5 | UX Research & Product Discovery | Research dashboard patterns, prediction UX, product principles, and user journeys. | Done |
| 0.6 | Data & Modeling Research | Define data sources, data dictionary, model path, validation, and backtesting strategy. | Done |
| 0.7 | Delivery & Development Plan | Define repository structure, Definition of Done, milestones, and release strategy. | Done |
| 1.0 | Data Pipeline Foundation | Create workspace structure, data package contracts, validation, normalization, and tests. | Done |
| 2.0 | Elo Baseline Foundation | Build a transparent baseline rating and prediction model. | Done |
| 3.0 | Poisson/Dixon-Coles Foundation | Model goal distributions and improve match probability estimates. | Done |
| 4.0A | Monte Carlo Simulation Engine Foundation | Simulate single matches from scoreline probabilities. | Done |
| 4.0B | Tournament Simulation Foundation | Simulate groups, knockouts, and a simplified tournament. | Done |
| 4.0C | Tournament Simulation Validation & Repeated Runs | Run repeated tournament simulations and summarize stage/champion probabilities. | Done |
| 4.0D | FIFA 2026 Format & Fixture Modeling | Model the real tournament structure, fixtures, and official progression rules. | Done |
| 4.0E | Historical Tournament Validation | Validate tournament logic and model assumptions against historical tournament structures and results. | Done |
| 4.0F | Real Historical Dataset Integration | Connect validation helpers to licensed historical tournament data and real backtest outputs. | Done |
| 4.0G | Historical Backtesting & Calibration | Score historical probability outputs and document calibration before API work. | Done |
| 4.0H | Complete Historical World Cup Dataset | Expand historical fixtures before relying on backtesting for model decisions. | Done |
| 4.0I | Real Historical Backtesting Reports | Generate documented reports from complete historical fixtures and model probability snapshots. | Done |
| 4.0J | True Pre-Tournament Snapshot Generation | Generate real historical model snapshots using only pre-tournament data cutoffs. | Done |
| 4.0K | Historical Tournament Replay Backtesting | Replay historical tournaments with pre-tournament snapshots and compare against outcomes. | Done |
| 4.0L | Historical Elo Snapshot Replay | Generate cutoff-safe historical Elo foundation snapshots from available match data. | Done |
| 4.0M | Historical Monte Carlo Replay | Replay historical tournament simulations from pre-tournament model snapshots. | Done |
| 4.0N | Historical Tournament Bracket Reconstruction | Rebuild historical groups and brackets for more realistic replay simulations. | Done |
| 4.0O | Complete Historical Replay Validation | Connect reconstructed brackets to replay validation and prepare careful model-quality summaries. | Recommended next |
| 5.0 | Web Dashboard | Present teams, matches, probabilities, scenarios, and model explanations. | Planned |
| 6.0 | QA Automation | Expand automated checks for code, data, models, and dashboard flows. | Planned |
| 7.0 | CI/CD | Add repeatable GitHub Actions workflows and deployment automation. | Planned |
| 8.0 | Portfolio Polish | Refine documentation, case study, visuals, and final presentation. | Planned |

## Phase 0.0 - Project Foundation

Define the professional foundation for the project.

Deliverables:

- Project brief
- Agent instructions
- README
- Changelog
- Roadmap
- Data strategy
- Model strategy
- QA strategy
- Validation backlog

Exit criteria:

- Documentation clearly describes the project intent and rules.
- No application logic, dependencies, data pipeline, model, or web app has been created.
- The foundation is committed and pushed when a remote exists.

## Phase 0.1 - Architecture Foundation

Decide how the repository will be organized before implementation begins.

Deliverables:

- Proposed repository tree
- Architecture overview
- Layer responsibility rules
- Dependency direction rules
- Testing strategy by package or layer
- C4-style Mermaid diagrams
- Architecture Decision Records
- Initial package boundary guidance

Deferred to future phases:

- Exact package manager and workspace configuration
- Environment variable strategy
- Data directory implementation
- CI workflow files
- Application scaffolding

Exit criteria:

- Future implementation work has a clear structure.
- Tool choices are documented with tradeoffs.
- No major app or model implementation has started prematurely.
- Future architecture changes are expected to update `docs/ARCHITECTURE.md` or relevant ADRs.

## Phase 0.2 - Technical Decisions Foundation

Define the project-level technology decisions before implementation begins.

Deliverables:

- Technical stack documentation
- Decision index
- Coding standards
- Git workflow rules
- ADRs for package manager, monorepo tooling, model service, database, and CI/CD

Deferred to future phases:

- Dependency installation
- Next.js initialization
- Python or FastAPI initialization
- Database schema and migrations
- GitHub Actions workflow files
- Application logic

Exit criteria:

- The planned stack is documented with responsibilities and tradeoffs.
- Future contributors know the expected coding and Git standards.
- Major technical decisions have ADRs.
- No dependencies, app scaffolding, data pipelines, models, or CI files have been created.

## Phase 0.5 - UX Research & Product Discovery

Research how the future dashboard should communicate predictions, uncertainty, and tournament scenarios.

Deliverables:

- UX research notes
- Dashboard inspiration references
- Core user journeys
- Product vision
- Planned dashboard structure
- Design system direction
- Portfolio story

Exit criteria:

- The dashboard has a clear product direction before UI implementation.
- Prediction displays avoid misleading certainty.
- Future UI work has product, design, and portfolio guidance.

## Phase 0.6 - Data & Modeling Research

Research and document the data and modeling foundation before creating pipelines or prediction logic.

Deliverables:

- Candidate data source inventory
- Planned data dictionary
- Progressive model roadmap
- Model validation strategy
- Backtesting strategy

Deferred to future phases:

- Dependency installation
- Dataset download
- Data pipeline implementation
- Prediction logic
- Model training
- Dashboard integration

Exit criteria:

- Candidate sources and licensing risks are documented.
- MVP data source direction is clear.
- Planned data fields are defined before pipeline work begins.
- Model progression and validation expectations are clear.
- Phase 1.0 can start with a concrete data pipeline target.

## Phase 0.7 - Delivery & Development Plan

Define how the project should be structured, delivered, reviewed, and released before implementation begins.

Deliverables:

- Planned repository structure
- Definition of Done
- Milestone plan
- Release strategy

Deferred to future phases:

- Creating `apps/` or `packages/`
- Installing dependencies
- Initializing Next.js or Python tooling
- Writing application, data, or model code
- Creating release tags

Exit criteria:

- Future phases have a clear delivery framework.
- Repository structure is documented without creating placeholder folders.
- Phase-specific quality expectations are defined.
- Release criteria are clear before MVP implementation begins.

## Phase 1.0 - Data Pipeline Foundation

Build a reliable data foundation.

Deliverables:

- pnpm workspace setup
- Turborepo configuration
- Initial monorepo folders
- `packages/data` TypeScript package
- Data contracts from `docs/DATA_DICTIONARY.md`
- Match validation and normalization functions
- Small local test fixtures
- Data validation checks
- Data quality documentation

Deferred to future phases:

- External dataset downloads
- Large raw data files
- CSV ingestion
- Canonical team ID mapping
- Duplicate detection across full datasets
- Prediction models

Exit criteria:

- Workspace configuration exists for future packages.
- Data package tests cover core validation and normalization behavior.
- Data quality docs explain current coverage and gaps.
- No model, web app, FastAPI service, database, or external dataset has been added.

## Phase 2.0 - Elo Baseline Foundation

Create the first working prediction baseline.

Deliverables:

- Elo rating implementation
- Default Elo configuration
- Expected score and rating delta functions
- Sequential match processing
- Rating history output
- Deterministic model unit tests
- Documentation of assumptions
- Documentation of validation coverage and limitations

Deferred to future phases:

- Poisson modeling
- Dixon-Coles adjustment
- Monte Carlo simulation
- Historical backtesting on full datasets
- Home advantage
- Competition weighting
- Recency weighting
- Dashboard integration

Exit criteria:

- The model is simple, explainable, and tested.
- Ratings update deterministically without mutating inputs.
- Assumptions, validation coverage, and limitations are documented.
- No Poisson, Dixon-Coles, Monte Carlo, FastAPI, database, or dashboard work has been added.

## Phase 3.0 - Poisson/Dixon-Coles Foundation

Add goal-based match modeling.

Deliverables:

- Expected-goals input type
- Poisson probability mass function
- Scoreline probability calculation
- Configurable score matrix generation
- Win/draw/loss probability aggregation
- Most likely scoreline ranking
- Dixon-Coles low-score adjustment foundation
- Deterministic model unit tests
- Documentation of assumptions, validation coverage, and limitations

Deferred to future phases:

- Team attack and defense strength estimates
- Elo-to-expected-goals mapping
- Home advantage
- Full Dixon-Coles parameter optimization
- Comparison against Elo baseline on historical backtests
- Calibration and scoring reports from real data
- Monte Carlo tournament simulation

Exit criteria:

- The model produces valid match outcome probabilities.
- Scoreline probabilities are deterministic and tested.
- Dixon-Coles behavior is documented as a foundation, not a calibrated model.
- Existing Elo and data tests still pass.
- No Monte Carlo, FastAPI, database, dashboard, or external dataset work has been added.

## Phase 4.0A - Monte Carlo Simulation Engine Foundation

Create the match-level simulation engine that future tournament simulations will use.

Deliverables:

- Seeded pseudo-random support
- Injectable random function support
- Single-match scoreline sampling
- Repeated match simulation
- Home win, draw, and away win count aggregation
- Estimated outcome probabilities
- Most common scoreline summaries
- Probability matrix validation
- Deterministic simulation tests
- Monte Carlo assumptions, validation, and limitation docs

Deferred to future phases:

- Group-stage standings
- Knockout bracket simulation
- Full tournament path simulation
- Official World Cup 2026 rules
- Penalty shootout handling
- Dashboard-ready tournament exports

Exit criteria:

- Match-level simulations are reproducible with a seed.
- Result counts sum to the requested simulation count.
- Estimated probabilities are internally consistent.
- High-count simulation approximates analytical probabilities.
- No group-stage, knockout, FastAPI, database, dashboard, or external dataset work has been added.

## Phase 4.0B - Tournament Simulation Foundation

Simulate a simplified tournament from explicit group fixtures through a knockout bracket.

Deliverables:

- Group-stage simulation
- Knockout bracket simulation
- Group standings with points, goal difference, goals for, and team-name fallback sorting
- Group qualifier selection
- Knockout draw tie-break handling
- Simplified power-of-two tournament bracket
- Champion and runner-up output
- Simulation reproducibility checks
- Tournament assumptions, validation, and limitation docs

Deferred to future phases:

- Repeated tournament runs
- Stage and champion probability summaries
- Full FIFA World Cup 2026 format
- Official FIFA group tie-breakers
- Real fixtures and groups
- Dashboard-ready exports

Exit criteria:

- A simplified tournament can produce group results, knockout results, champion, and runner-up.
- Group and knockout rules are deterministic and tested.
- Existing data, Elo, Poisson, Dixon-Coles, and Monte Carlo tests still pass.
- No FastAPI, database, dashboard, real fixtures, or external datasets have been added.

## Phase 4.0C - Tournament Simulation Validation & Repeated Runs

Run many tournament simulations to estimate tournament-level probabilities.

Deliverables:

- Repeated tournament simulation runner
- Champion probability summaries
- Runner-up probability summaries
- Group qualification probability summaries
- Knockout qualification probability summaries
- Seed strategy for repeated runs
- Validation report for tournament probability outputs
- Deterministic repeated-run tests

Deferred to future phases:

- Full FIFA World Cup 2026 format
- Official FIFA fixture and group modeling
- Official tournament progression rules
- Stage-specific probability summaries beyond the simplified bracket
- Large-run performance optimization
- Dashboard-ready exports

Exit criteria:

- Repeated simulations produce stable, explainable probability summaries.
- Outputs include model and simulation metadata.
- Known limitations are documented before dashboard integration.
- Existing data, Elo, Poisson, Dixon-Coles, Monte Carlo, group, knockout, and tournament tests still pass.

## Phase 4.0D - FIFA 2026 Format & Fixture Modeling

Model the real World Cup 2026 structure before exposing tournament results more broadly.

Deliverables:

- FIFA 2026 group and fixture input contracts
- Official number of teams and groups
- Third-place qualification modeling
- Group validation for 12 groups of 4 teams
- Unique 48-team validation
- Best 8 third-place selection helper
- Round of 32 fixture validation
- Simple deterministic Round of 32 development bracket builder
- Fixture metadata requirements
- Validation docs for format assumptions

Deferred to future phases:

- Real FIFA 2026 fixture loading
- Official knockout slot mapping
- Full official FIFA tie-breaker chain
- Historical validation against past tournaments
- API/dashboard integration

Exit criteria:

- The tournament engine can represent the real FIFA 2026 structure.
- Simplified assumptions are replaced or clearly isolated.
- The engine remains deterministic and tested.
- No external fixtures, API, UI, database, or network-dependent logic has been added.

## Phase 4.0E - Historical Tournament Validation

Validate tournament-level probability snapshots against known tournament outcomes before exposing outputs.

Deliverables:

- Historical tournament validation contracts
- Champion probability Brier Score
- Champion probability Log Loss with safe epsilon handling
- Top-N champion hit checks
- Runner-up probability ranking checks
- Knockout qualification hit-rate foundation
- Champion calibration bucket foundation
- Deterministic validation tests
- Historical validation assumptions, report, and limitations docs

Deferred to future phases:

- Real historical World Cup dataset ingestion
- Real historical fixture loading
- Time-based historical model outputs
- Official FIFA historical tie-breaker validation
- Model promotion or accuracy claims

Exit criteria:

- Historical validation metrics are implemented and tested.
- Invalid probability snapshots and missing actual outcomes are rejected.
- The docs clearly state that no real model accuracy is claimed yet.
- The model is ready for real historical dataset integration or API planning.

## Phase 4.0F - Real Historical Dataset Integration

Connect the validation foundation to real historical tournament data after source licensing and data provenance are clear.

Deliverables:

- Curated 2018 and 2022 historical fixture subsets
- Historical World Cup fixture JSON structure
- Historical fixture loader and validation helpers
- Historical fixture normalization into `NormalizedMatch`
- Dataset metadata and retrieval-date tracking
- Documentation of data quality exclusions
- Deterministic tests for loading, validation, and normalization

Deferred to future phases:

- Complete historical World Cup coverage
- Automated source synchronization
- Penalty winner modeling
- Historical pre-tournament probability snapshots
- Backtest reports using real model outputs
- Calibration notes across historical tournaments

Exit criteria:

- Historical data provenance is documented.
- Validation results are reproducible from local commands.
- The fixture subset is small, curated, and validated.
- No model quality claims are made from the partial dataset.

## Phase 4.0G - Historical Backtesting & Calibration

Use validated historical fixture data and supplied probability snapshots to produce the first backtesting and calibration foundation.

Deliverables:

- Historical backtesting input and output contracts
- Champion and runner-up extraction from fixture subsets
- Tournament-level historical validation helpers
- Accuracy, Brier Score, Log Loss, and calibration output
- Top-N hit reporting
- Calibration bucket generation
- Partial dataset warning metadata
- Backtesting assumptions, validation, limitations, and calibration docs
- Deterministic tests using 2018 and 2022 curated fixtures

Deferred to future phases:

- Complete historical World Cup fixtures
- Historical prediction snapshot fixtures generated by the model
- Match-level backtesting commands
- Baseline comparison reports
- Data cutoff and model version metadata for real model runs
- Model promotion decisions

Exit criteria:

- Historical metrics are generated from reproducible local commands.
- Calibration and scoring reports are documented.
- Output is clearly marked as partial historical validation.
- No public model quality claims are made from the partial dataset.

## Phase 4.0H - Complete Historical World Cup Dataset

Expand historical data coverage so future backtesting can evaluate full tournament behavior.

Deliverables:

- Complete 2010, 2014, 2018, and 2022 fixture coverage
- Group-stage and knockout result records
- Winner, decision method, penalty score, and stage-order metadata
- Source metadata and review notes
- 64-match validation per tournament
- 256-match validation across the historical dataset
- Expanded data validation tests

Exit criteria:

- Historical fixture coverage is complete enough for meaningful backtesting.
- Source provenance and limitations are documented.
- Data validation protects full-tournament structure before model scoring.

## Phase 4.0I - Real Historical Backtesting Reports

Use complete historical fixture data and model-generated probability snapshots to produce documented backtesting reports.

Deliverables:

- Historical report generation helpers
- Per-year reports for 2010, 2014, 2018, and 2022
- Champion and runner-up extraction from complete fixture datasets
- Champion rank, probability, Top-1, Top-3, and Top-5 outputs
- Brier Score and Log Loss report fields
- Calibration bucket summaries
- Dataset completeness metadata
- Synthetic snapshot warnings
- Clear interpretation of what the reports can and cannot prove

Exit criteria:

- Backtesting reports are reproducible from local commands.
- Reports use complete fixture coverage and documented model snapshots.
- Results are framed as validation evidence, not guarantees.
- Remaining calibration and data limitations are documented.

## Phase 4.0J - True Pre-Tournament Snapshot Generation

Generate real historical probability snapshots from model logic using only information available before each evaluated tournament.

Deliverables:

- Baseline pre-tournament snapshot input contracts
- Team seed rating probability normalization
- Deterministic team probability ranking
- Look-ahead bias guardrail results
- Snapshot metadata with model version and data cutoff
- Baseline snapshots for 2010, 2014, 2018, and 2022 in tests
- Integration with historical backtesting report helpers

Exit criteria:

- Historical snapshots are generated reproducibly.
- Data leakage checks protect tournament cutoffs.
- Reports distinguish model-generated snapshots from synthetic fixtures.
- Model performance remains framed as evidence with limitations.

## Phase 4.0K - Historical Tournament Replay Backtesting

Replay historical tournament predictions using pre-tournament snapshots and compare the generated probabilities against actual outcomes.

Deliverables:

- Historical tournament replay helper
- Baseline report reruns using `baseline_pre_tournament_snapshot`
- Per-year replay outputs for 2010, 2014, 2018, and 2022
- Snapshot safety checks in report generation
- First replay-oriented model validation report
- Look-ahead guardrail status in replay outputs
- Baseline snapshot warnings in per-year and aggregate summaries
- Clear decision to improve model realism before public accuracy claims

Exit criteria:

- Historical replay outputs are deterministic.
- Reports use safe pre-tournament snapshots.
- Results are interpreted without overclaiming accuracy.
- Remaining gaps toward calibrated Elo/Poisson simulation are documented.

## Phase 4.0L - Historical Elo Snapshot Replay

Replace seed-rating replay snapshots with cutoff-safe Elo snapshots generated from available historical match data.

Deliverables:

- Historical Elo replay input, config, snapshot, metadata, and warning contracts.
- Match filtering that uses only matches on or before the cutoff date.
- Rejection of cutoffs on or after tournament start dates.
- Sequential Elo replay before each tournament start date when data is supplied.
- Elo-derived champion probability normalization and deterministic ranking.
- `historical_elo_replay_snapshot_foundation` snapshot outputs.
- Replay-helper compatibility for generated Elo foundation snapshots.
- Documentation of remaining data and calibration gaps before API/dashboard publication.

Exit criteria:

- Elo snapshots are generated only from data available on or before the cutoff.
- Replay reports distinguish Elo foundation replay from seed-rating baseline replay.
- Metrics are reported with Brier Score, Log Loss, Top-N hits, and calibration notes.
- The project has enough evidence to decide whether Phase 5.0 can begin or model realism should improve further.

## Phase 4.0M - Historical Monte Carlo Replay

Convert cutoff-safe pre-tournament snapshots into historical tournament simulations and compare simulated probabilities against actual outcomes.

Deliverables:

- Elo-to-match-probability mapping foundation.
- Elo-to-expected-goals mapping foundation.
- Poisson score matrix generation from Elo-derived expected goals.
- Explicit simplified historical tournament replay simulation inputs.
- Monte Carlo replay outputs for champion and runner-up probabilities.
- Per-year replay scoring with Brier Score, Log Loss, Top-1, Top-3, and Top-5.
- Aggregate replay summaries with simulation count metadata.
- Warnings for uncalibrated Elo-to-goals mapping and simplified bracket assumptions.
- Documentation of remaining realism gaps before API/dashboard publication.

Exit criteria:

- Historical simulations use only pre-tournament data.
- Simulation outputs are deterministic when seeded.
- Reports distinguish simulation evidence from public accuracy claims.
- Remaining gaps toward dashboard/API publication are documented.

## Phase 4.0N - Historical Tournament Bracket Reconstruction

Rebuild historical group and knockout structures so Monte Carlo replay can use more realistic tournament paths.

Deliverables:

- Historical fixture grouping by tournament year.
- Stage separation for group, Round of 16, quarter-final, semi-final, third-place, and final fixtures.
- Historical group reconstruction for 2010, 2014, 2018, and 2022.
- Group standings, winners, and runners-up from actual group-stage results.
- Knockout progression from recorded historical winners.
- Champion, runner-up, and third-place extraction.
- Match-count validation for the historical 32-team format.
- Documentation of remaining official tie-breaker and result-level reconstruction limitations.

Exit criteria:

- Historical replay simulations can use tournament-specific group and bracket structures.
- Bracket reconstruction does not use actual match outcomes to generate pre-tournament probabilities.
- Existing data/model checks remain deterministic.
- Remaining model calibration gaps are documented before Phase 5.0.

## Phase 4.0O - Complete Historical Replay Validation

Connect reconstructed historical brackets to the historical replay foundations and produce careful validation outputs.

Potential deliverables:

- Historical Monte Carlo replay inputs built from reconstructed brackets.
- Group qualification and knockout-path comparison summaries.
- Validation reports that combine Elo snapshots, Monte Carlo replay, and reconstructed bracket outcomes.
- Clear distinction between foundation validation and calibrated model accuracy.
- Decision point for whether to continue model validation or begin API foundation work.

Exit criteria:

- Historical replay validation uses reconstructed 2010, 2014, 2018, and 2022 tournament structures.
- Reports clearly separate data, calibration, and bracket limitations.
- No public accuracy claims are made without calibrated inputs.
- The project has enough evidence to choose Phase 5.0 or another model-validation phase.

## Phase 5.0 - Web Dashboard

Build the user-facing experience.

Potential deliverables:

- Dashboard app scaffold
- Match prediction views
- Team pages
- Tournament simulation views
- Explanation and uncertainty UI
- Responsive design

Exit criteria:

- Users can inspect predictions and understand model limitations.
- The UI is polished, accessible, and tested.

## Phase 6.0 - QA Automation

Strengthen automated quality coverage.

Potential deliverables:

- Unit tests
- Integration tests
- Data validation checks
- Model validation tests
- Dashboard E2E tests
- Accessibility checks

Exit criteria:

- Important regressions are caught before merge.
- Quality checks are documented and repeatable.

## Phase 7.0 - CI/CD

Automate checks and deployment paths.

Potential deliverables:

- GitHub Actions workflows
- Lint, test, and build jobs
- Data or model validation jobs
- Deployment workflow for dashboard
- Status badges

Exit criteria:

- Pull requests run meaningful automated checks.
- Deployment steps are repeatable.

## Phase 8.0 - Portfolio Polish

Turn the project into a strong portfolio artifact.

Potential deliverables:

- Final README polish
- Case study writeup
- Screenshots and demo assets
- Architecture diagram
- Model evaluation summary
- Lessons learned

Exit criteria:

- The project is understandable to recruiters, engineers, and data practitioners.
- The repository demonstrates both engineering and modeling judgment.

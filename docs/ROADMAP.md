# Roadmap

This roadmap organizes the project into phases so each step has a clear purpose and quality bar.

| Phase | Name | Primary Outcome | Status |
| --- | --- | --- | --- |
| 0.0 | Project Foundation | Define scope, docs, roadmap, and working standards. | Done |
| 0.1 | Architecture Foundation | Define repository structure, architecture rules, ADRs, and package boundaries. | Done |
| 0.2 | Technical Decisions Foundation | Define stack choices, coding standards, Git workflow, and technical ADRs. | Done |
| 0.5 | UX Research & Product Discovery | Research dashboard patterns, prediction UX, product principles, and user journeys. | Done |
| 1.0 | Data Pipeline Foundation | Collect, clean, validate, and version football datasets. | Recommended next |
| 2.0 | Elo Baseline | Build a transparent baseline rating and prediction model. | Planned |
| 3.0 | Poisson/Dixon-Coles Model | Model goal distributions and improve match probability estimates. | Planned |
| 4.0 | Monte Carlo Tournament Simulation | Simulate groups, knockouts, and full tournament outcomes. | Planned |
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

## Phase 1.0 - Data Pipeline Foundation

Build a reliable data foundation.

Potential deliverables:

- Raw and processed data directory structure
- Data source inventory
- Ingestion scripts
- Cleaning and normalization logic
- Data validation checks
- Dataset documentation

Exit criteria:

- Data can be refreshed with documented commands.
- Data quality checks catch common failures.
- Model inputs are reproducible.

## Phase 2.0 - Elo Baseline

Create the first working prediction baseline.

Potential deliverables:

- Elo rating implementation
- Match probability conversion
- Backtesting report
- Baseline metrics
- Documentation of assumptions

Exit criteria:

- The model is simple, explainable, and tested.
- Metrics provide a baseline for future models.

## Phase 3.0 - Poisson/Dixon-Coles Model

Add goal-based match modeling.

Potential deliverables:

- Team attack and defense strength estimates
- Poisson goal model
- Dixon-Coles low-score adjustment
- Comparison against Elo baseline
- Calibration and scoring reports

Exit criteria:

- The model produces valid match outcome probabilities.
- Improvements or tradeoffs are measured rather than assumed.

## Phase 4.0 - Monte Carlo Tournament Simulation

Simulate the full tournament.

Potential deliverables:

- Group-stage simulation
- Knockout bracket simulation
- Tournament outcome probabilities
- Scenario exports for dashboard use
- Simulation reproducibility checks

Exit criteria:

- Tournament outcomes are generated from match probabilities.
- Results are stable enough for dashboard presentation.

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

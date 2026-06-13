# Architecture Diagrams

Phase 9.2 adds GitHub-renderable Mermaid diagrams for portfolio and interview presentation. These diagrams summarize the current repository structure, prediction flow, API flow, QA strategy, and interview story without adding image files or changing application behavior.

## Monorepo Architecture

This diagram shows the main packages and support systems in the monorepo. The dashboard depends on API contracts, API handlers depend on model and data packages, and CI validates the workspace through root pnpm/Turborepo commands.

```mermaid
flowchart TD
    repo["world-cup-2026-predictor monorepo"]
    web["apps/web\nNext.js dashboard"]
    api["packages/api\nPure handlers and schemas"]
    model["packages/model\nElo, Poisson, Monte Carlo"]
    data["packages/data\nContracts, validation, fixtures"]
    docs["docs\nArchitecture, QA, portfolio"]
    ci["GitHub Actions CI\ninstall, test, typecheck, build, E2E"]
    turbo["pnpm + Turborepo\nworkspace orchestration"]

    repo --> web
    repo --> api
    repo --> model
    repo --> data
    repo --> docs
    repo --> turbo
    ci --> turbo
    turbo --> web
    turbo --> api
    turbo --> model
    turbo --> data
    web --> api
    api --> model
    api --> data
    model --> data
```

## Data-To-Prediction Flow

This diagram follows a prediction from historical fixtures through validation, Live Elo, expected-goals generation, scoreline probabilities, simulation, and final prediction output.

```mermaid
flowchart LR
    fixtures["Historical fixtures\nWorld Cup and international samples"]
    validation["Validation\nschema and required fields"]
    normalization["Normalization\nteam names and match shape"]
    liveElo["Live Elo\nteam ratings and metadata"]
    xg["Elo-to-xG\nexpected goals"]
    poisson["Poisson model\nscoreline probabilities"]
    monteCarlo["Monte Carlo\nmatch or tournament runs"]
    output["Prediction output\nprobabilities, scorelines, warnings"]

    fixtures --> validation
    validation --> normalization
    normalization --> liveElo
    liveElo --> xg
    xg --> poisson
    poisson --> monteCarlo
    poisson --> output
    monteCarlo --> output
```

## API Flow

This diagram shows how the dashboard reaches model outputs without a network server. The web app calls a local API client wrapper, which calls pure API handlers and returns typed responses to UI components.

```mermaid
flowchart LR
    dashboard["Dashboard components\nforms, cards, sections"]
    client["API client wrapper\napps/web"]
    handlers["Pure API handlers\npackages/api"]
    schemas["Typed schemas\nresponses and errors"]
    modelPkg["Model package\nratings and simulation"]
    dataPkg["Data package\nfixtures and validation"]
    response["Typed response\nprobabilities, metadata, warnings"]

    dashboard --> client
    client --> handlers
    handlers --> schemas
    handlers --> modelPkg
    handlers --> dataPkg
    modelPkg --> dataPkg
    handlers --> response
    response --> dashboard
```

## QA Strategy

This diagram groups the quality gates by risk area. Unit and integration tests protect deterministic logic, contract and snapshot tests protect API/model outputs, Playwright protects browser workflows, and GitHub Actions runs the core gates repeatedly.

```mermaid
flowchart TD
    risk["Quality risks\nlogic drift, API drift, UI regressions"]
    unit["Unit tests\ndata and model logic"]
    integration["Integration tests\nAPI handlers together"]
    contracts["API contract tests\nresponse and error shapes"]
    snapshots["Regression snapshots\ncritical numeric outputs"]
    e2e["Playwright E2E\ndashboard workflows"]
    ci["GitHub Actions CI\npnpm test, typecheck, build, E2E"]
    confidence["Review confidence\nsafe pull requests"]

    risk --> unit
    risk --> integration
    risk --> contracts
    risk --> snapshots
    risk --> e2e
    unit --> ci
    integration --> ci
    contracts --> ci
    snapshots --> ci
    e2e --> ci
    ci --> confidence
```

## Interview Story

This diagram provides a concise talk track for portfolio walkthroughs. It moves from the product problem to the architecture and quality strategy, then closes with portfolio value.

```mermaid
flowchart LR
    problem["Problem\nexplainable World Cup predictions"]
    architecture["Architecture\nseparate data, model, API, UI"]
    modeling["Modeling\nElo, Poisson, Monte Carlo"]
    validation["Validation\nhistorical replay and snapshots"]
    automation["Automation\nunit, contract, E2E tests"]
    cicd["CI/CD\nGitHub Actions gates"]
    value["Portfolio value\nSDET-ready engineering story"]

    problem --> architecture
    architecture --> modeling
    modeling --> validation
    validation --> automation
    automation --> cicd
    cicd --> value
```

## Usage Guidance

Use these diagrams in interviews to explain the project at different depths:

| Situation | Best diagram |
| --- | --- |
| Recruiter or quick screen | Interview Story |
| Engineering architecture discussion | Monorepo Architecture and API Flow |
| Data/model discussion | Data-To-Prediction Flow |
| QA or SDET discussion | QA Strategy and API Flow |
| Portfolio README reference | Monorepo Architecture and Interview Story |

Keep the walkthrough honest: the diagrams describe the current local monorepo and CI foundation. They do not claim production deployment, Docker, cloud infrastructure, databases, or external services.

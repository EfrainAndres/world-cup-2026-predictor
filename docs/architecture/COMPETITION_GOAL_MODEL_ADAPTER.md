# Competition Goal Model Adapter

## Purpose

The attack/defense goal model system (Phase 12.21A) is competition-neutral by design. All goal model candidates accept a `CompetitionGoalEnvironment` that encodes the competition's average home and away goal rates. This allows the same model to operate across World Cup, qualifiers, friendlies, and other competitions without team-specific or competition-specific hardcoding.

## CompetitionGoalEnvironment

```typescript
interface CompetitionGoalEnvironment {
  competitionId: string;
  averageHomeGoals: number;   // average goals by the "home" team per match
  averageAwayGoals: number;   // average goals by the "away" team per match
  averageTotalGoals: number;  // convenience sum
  sampleSize: number;         // number of matches used to compute these averages
  cutoffAt: string;           // ISO date; averages computed from data before this date
}
```

The environment is a snapshot at a point in time. The `cutoffAt` field ties the averages to the same no-look-ahead guarantee as team profiles.

## Building an Environment

`buildCompetitionGoalEnvironment` in `packages/api/src/attack-defense-profile-builder.ts` computes averages from a set of historical scored matches:

```typescript
const env = buildCompetitionGoalEnvironment({
  historicalMatches,   // HistoricalMatchRecord[]
  cutoffAt: "2022-01-01",
  competitionId: "world_cup",
});
```

If `sampleSize === 0` (no scored matches before the cutoff), fallback averages are returned:
- `averageHomeGoals: 1.25`
- `averageAwayGoals: 1.05`
- `averageTotalGoals: 2.30`

These match the Elo-to-xG V2 base assumption and ensure the model degrades gracefully.

## Integration with Goal Models

The `CompetitionGoalEnvironment` feeds directly into the multiplicative formula:

```
homeXg = competition.averageHomeGoals × homeAttack × awayDefense × eloMult × venueMult
```

For the log-linear model:
```
log(homeXg) = log(avgHomeGoals) + log(homeAttack) + log(awayDefense) + log(eloMult) + log(venueMult)
```

The competition average anchors the scale. A team with `attackStrength = 1.0` and `defenseStrength = 1.0` at equal Elo on a neutral pitch produces exactly the competition's average home and away goals.

## No-Look-Ahead Invariant

The competition environment and all team profiles share the same `cutoffAt`. Any match on or after `cutoffAt` is excluded from:
1. The competition goal averages (filtered in `buildCompetitionGoalEnvironment`)
2. Each team's attack/defense profile (filtered in `buildTeamAttackDefenseProfile`)

Violations (detected and counted but not used) become 0 when the historical record set is pre-filtered to strictly before `cutoffAt` before being passed to the builders.

## Adding New Competitions

To evaluate a new competition:
1. Provide historical `HistoricalMatchRecord[]` with scored matches from that competition
2. Call `buildCompetitionGoalEnvironment` with an appropriate `cutoffAt`
3. Build team profiles using the same `cutoffAt`
4. Pass the environment and profiles to `computeAttackDefenseGoalModel`

No code changes are required; the model adapts to the competition's goal-scoring environment through the environment object.

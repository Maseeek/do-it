# Competitor mechanics research

Researcher: Gemini. Parent audit: 9 October 2026 UTC, using first-party pages and developer-authored App Store descriptions. Gemini supplied the initial scan; the parent corrected unsupported absence and uniqueness claims and added the closer competitors found by Luna. No competitor app was installed or exhaustively tested. Likely audiences and marketing angles below are inferences.

## Finding

The scan does not establish that Do It is unique. Two-person habit products, separate personal routines, friend duels, point scoring, and real-world rewards already exist. The narrower positioning hypothesis is a contest across different personal plans that can be matched to the same available weekly points, with an agreed stake for the period. Whether a competitor implements the same calibration remains unresolved.

## Competitor mechanics

| Product and primary source | Observed mechanics | Relationship to the hypothesis |
| --- | --- | --- |
| [HabitShare](https://habitshareapp.com/) | Custom daily/weekly habits and per-friend sharing controls. | A direct substitute for social accountability. Point balancing, head-to-head stakes, and photo proof are not described on this page; their presence or absence in the app is unverified. |
| [Habitica's developer description](https://apps.apple.com/us/app/habitica-gamified-taskmanager/id994882113) | Personalized habit/productivity tracking, game progression, rewards, and social play. | Game-based habit motivation is established. Cooperative play and custom rewards should not be confused with matched weekly point ceilings across two personal plans. This source does not establish the latter. |
| [stickK commitment FAQ](https://new.stickk.com/faq/commitment/Commitment%2BContracts), [stakes FAQ](https://new.stickk.com/faq/stakes/Commitment%2BContracts), and [referee FAQ](https://new.stickk.com/faq/referees/Commitment%2BContracts) | Commitment contracts can include a referee, supporters, and optional financial stakes. Referees may request proof. A stake recipient can receive forfeited money. | Social accountability and consequences overlap. These pages describe verification of an individual's commitment, not a matched two-player leaderboard. Cash stakes are optional; the initial report's claim that money is required was incorrect. Referee verification alone does not establish a built-in photo-proof feature. |
| [Beeminder](https://www.beeminder.com/) | Quantifiable goals, progress graphs, manually reported or automatically collected data, and a charge when a goal crosses its allowed trajectory. | Strong overlap in measurable commitments and financial consequences. A goal trajectory is not the same as calibrated competitive scoring; the initial report conflated them. Two-player weekly point matching is not documented on this page. |
| [HabitFriend's developer description](https://apps.apple.com/us/app/habitfriend-habit-tracker/id6753701363) | Team group habits, competition group habits, real-time leaderboards, historical winners, flexible habit units and frequencies, and friend activity. | A closer competitive substitute than a solo tracker. Its listing describes comparing entries within group habits. Cross-plan calibration, chosen real-world stakes, and photo proof are not explained. Do not conclude they are absent. |
| [Daily Pact's developer description](https://apps.apple.com/us/app/daily-pact-habit-tracker/id6759385724) | Invite-based private groups, open pacts, daily/weekly challenges, custom habits, activity feeds, streaks, leaderboards, and group-approved pauses in its version history. | Friend/couple accountability, challenges, rest protection, and invitations overlap. Matched point ceilings across unlike plans and mutual period stakes are not explained. Pricing and membership limits were omitted because the initial report's details differed from the current listing. |

The stickK main page returned HTTP 403 during the parent audit; the linked official FAQs supplied the relevant evidence. Habitica's JavaScript product page did not expose useful text to the parent, so its developer-authored App Store description was used instead.

## Closer counterexamples from the combined scan

[DuoDucks](https://duoducks.com/) explicitly lets two people choose different habits and invent rewards, with earned credits entering a shared balance. That directly contradicts any broad claim that combining two people, unlike routines, and real rewards is new. Its documented reward loop spends credits; Do It keeps cumulative Karma separate from period stakes.

[PairHabit](https://pairhabit.app/) markets shared couples micro-habits, friendly competition, and optional reward stakes. Its page centers on shared streaks and allows either partner to confirm for both. Couples and relational stakes therefore are not exclusive territory.

[LifeMasters](https://lifemasters.app/) advertises weekly one-on-one matches against friends or other players, with habits becoming points. [Notion Habit Heroes](https://notionhabitheroes.com/blog/notion-habit-competitions/) describes one-on-one duels using each participant's own habit database and accumulated points. These are direct counterexamples to a broad friend-duel or separate-habit competition claim. Equal available weekly point potential is not explained on the reviewed pages. That is an open verification question, not proof of absence.

## Emotional angles to test

1. **Friendly rivalry across different ambitions.** Show one person running and the other learning a language, then the weekly point-matching step. Proposed line: "Different habits. Same shot at the win." Explain that the matching concerns points, not effort.
2. **A payoff chosen by the pair.** Show the actual agreed dinner or movie-night stake and the weekly result. Proposed line: "Make this week's habits worth a rematch." Avoid implying automatic payment or enforced delivery.
3. **A relationship with someone you already know.** Proposed line: "Your person. Your habits. Your next duel." This is a framing choice, not an exclusive privacy or two-person feature; other products already have private groups and pairs.

The original Gemini headlines are not treated as evidence of demand. Neither the reviewed pages nor this scan show that a headline will cause viral growth. Test the message against activated pairs and repeat participation, as described in [the positioning brief](positioning.md).

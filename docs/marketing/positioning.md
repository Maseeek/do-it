# Do It marketing direction

Research date: 9 October 2026. Requested in [issue #46](https://github.com/Maseeek/do-it/issues/46). Gemini researched competitor mechanics; Luna researched messaging. This document is the parent's recommendation after checking both reports against primary sources. Gemini's initial uniqueness conclusion was rejected because the combined scan found closer overlaps and undocumented mechanics remain unknown.

## Recommendation

Position Do It as a friendly habit rivalry between two people who want to improve different parts of their lives. Explain the scoring with a concrete promise: choose different habits, match your available weekly points, and agree on something worth winning.

The emotional hook is having someone you care about to challenge and cheer on. The product reason to choose it is how separate routines become one contest. This is a positioning hypothesis, not proof of an exclusive feature or a durable competitive advantage.

Recommended emotional headline:

> A little rivalry. A better us.

Supporting copy:

> You run. They read. Choose your own habits, match your available weekly points, and put dinner on the line. See who wins the week.

CTA: **Start a duel**. Use **Invite your person** at the actual invitation step.

The running/reading example describes separate plans, not a claim that a run and a reading session require equal effort. The app helps balance the plans' point totals.

More explicit alternative:

> Different habits. Same shot at the win.

Supporting copy:

> Build the habits that matter to each of you. Match your weekly point potential, choose a stake together, and compete for the week.

Test this wording for comprehension. "Same shot" must mean equal available points, not equal difficulty or equal probability of winning.

Couples-specific social hook:

> I love you. I'm still winning this week.

Example caption:

> I'm working on running. They're working on reading. We matched our weekly points and agreed the winner picks dinner. Want a rematch next week?

This is proposed copy for a demonstration. Use a real pair's actual habits and stake before publishing it as their story.

## What competitors already offer

These are observations from official pages, not independent tests of every app. A mechanic omitted from a page remains unknown.

| Product | Observed overlap | What the evidence lets us say |
| --- | --- | --- |
| [DuoDucks](https://duoducks.com/) | Two people choose different habits and spend shared credits on invented rewards. | This combination already exists. Do It's period stakes and cumulative Karma use a different model. |
| [PairHabit](https://pairhabit.app/) | Couples, shared micro-habits, friendly competition, streaks, and optional reward stakes. Either partner can confirm for both. | Couples and dinner stakes are established positioning. Its page centers on shared relationship rituals and streak rewards. Do It's separate personal plans and weekly point matching are a more specific angle. |
| [LifeMasters](https://lifemasters.app/) | Weekly one-on-one matches, habits as points, friend invitations, and leagues. | Weekly habit rivalry is direct competition. Matching unlike plans to equal available weekly points and chosen mutual stakes are not explained on the reviewed page. Their absence in the actual app is unverified. |
| [Notion Habit Heroes](https://notionhabitheroes.com/blog/notion-habit-competitions/) | Two-person duels, separate habit databases, accumulated points, and competition windows. | Separate habits and head-to-head leaderboards already exist. The reviewed page does not explain equal weekly point potential or agreed real-world stakes. |
| [HabitShare](https://habitshareapp.com/) | Custom habits, daily/weekly goals, selected sharing with friends, and messaging. | Social accountability is familiar territory. Do It can explain its contest mechanics rather than selling sharing alone. |
| [Forfeit](https://www.forfeit.app/) | Habit contracts, proof, deadlines, and financial consequences. | Stakes and proof are established. Do It's recorded stake between peers is a different experience from an automatically charged individual contract. |

See [Luna's messaging report](competitor-messaging-luna.md) and [Gemini's mechanics report](competitor-research-gemini.md) for the broader scan and supporting sources.

## The difference to demonstrate

Show the product doing the thing the headline promises. One player selects running and another reading or language practice. Display each plan's available weekly points, the point-balancing step, and the same final total. Then show an agreed stake and the weekly leaderboard.

That is more persuasive than a list of habits, streaks, proof photos, and leaderboards, which have substantial competitive overlap. Point matching is explainable and implemented, but competitors could copy it. A lasting advantage would need evidence of easier pairing, enjoyable weekly rituals, or better pair retention; we do not have that evidence yet.

Begin with people who already enjoy friendly competition and have someone in mind to invite. Luna recommends close friends first; the app's founding context and ADR favor couples. Neither establishes demand. For an initial small test, recruit competitive couples because they fit the original product story, then repeat with close friends. Compare headline variants within each audience rather than giving each audience different copy and attributing the outcome to the headline.

Avoid relationship-repair promises. The experience we can demonstrate is playful personal habit competition.

## Product claim verification

The current implementation is more precise than the context's general "240 Daily Par" language. Market weekly plan matching rather than saying every plan has a fixed 240-point daily ceiling.

| Proposed claim | Implementation evidence | Limit |
| --- | --- | --- |
| Players choose different habits. | [`catalogHabits`](../../src/lib/habit-catalog.ts), custom habits and independent plans in [`HabitOnboarding`](../../src/components/HabitOnboarding.tsx). | Choosing different plans alone is not distinctive. |
| Plans can have equal available weekly points. | `weeklyPointPotential` and `balanceHabitPlan` in [`habit-catalog.ts`](../../src/lib/habit-catalog.ts); `applyHabitPlan` in [`store.tsx`](../../src/lib/store.tsx) rejects a mismatched total when a partner total exists. | Some selections cannot reach the target. Equal points do not establish equal effort. Other add/edit/delete paths can change a plan without the same parity check. |
| Players record a weekly or monthly stake. | Stake creation and resolution in [`DuelView.tsx`](../../src/components/DuelView.tsx). | Agreement and delivery happen between the pair. There is no demonstrated automatic payment, escrow, or bilateral acceptance flow. |
| A weekly scorecard can become a shared story. | Scorecard generation in [`scorecard-image.ts`](../../src/lib/scorecard-image.ts), called from `DuelView`. | Export copies or downloads an image. It does not establish public reach or viral growth. |

Verification run: `./node_modules/.bin/tsx --test src/lib/habit-catalog.test.ts`. All three existing tests passed, including balancing different frequencies to one weekly potential and rejecting an impossible target. No application code changed. This is code inspection and a focused algorithm check, not a production onboarding walkthrough.

## Test the emotional headline

Compare "A little rivalry. A better us." with "Different habits. Same shot at the win." Keep the supporting copy, product demonstration, CTA, acquisition source, and onboarding identical. Assign each visitor one persistent variant so repeat visits do not change the message.

The primary outcome is a new activated pair per unique eligible visitor within seven days: the partner accepts the invite, both finish their habit plans, and both record a first check-in. Count each duel once and attribute it to the originating visitor's variant. Also inspect invite sends, invite acceptance, and the share of pairs in which both return and check in during week two.

Ask a few pairs what they expected from the headline, whether they understood the point matching, and whether the rivalry felt fun. Keep small-sample results directional; a click-through lift alone is insufficient to select a winner. Instrumentation and campaign launch are follow-up work, not changes included here.

The pair invitation is a plausible growth loop because the experience needs a second person. Recurring stakes and scorecards may give pairs something to talk about. An emotional headline alone cannot establish virality; actual invitations, new activated pairs, and retention must show it.

## Character progression and TikTok

Maciek also wants upgradeable characters as a marketing angle. The existing plan in [#33](https://github.com/Maseeek/do-it/issues/33) gives each Player an avatar immediately and uses lifetime Karma and approved achievements to unlock cosmetics. Character looks persist across weekly contests and do not change scoring.

The creative hypothesis is that two visible characters make the pair's progress and rivalry easier to follow. An upgradeable character alone has established competitors. Show the habits behind each earned look and the actual weekly result, then test whether those clips produce activated pairs. See [the character and TikTok proposal](character-marketing.md) for the progression loop, headline copy, storyboard, rollout boundaries, and experiment, and [Luna's supporting research](character-research-luna.md) for primary sources. The full character system remains planned; it is not a shipped feature to advertise as available today.

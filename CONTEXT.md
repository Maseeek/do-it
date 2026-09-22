# Do It (Couples Habit Tracker & Accountability Engine)

A minimalist, high-contrast, dual-player habit competition app engineered for Maciek and Myrna.

## Language

### Core Entities

**Player**:
One of the two registered participants, specifically Maciek or Myrna.
_Avoid_: User, Account, Customer, Client

**Habit**:
A recurring commitment assigned to a Player with an agreed point value and target frequency (daily or weekly).
_Avoid_: Task, Todo, Chore, Goal

**Equivalent Habit**:
A habit tailored to individual preference (e.g. Basketball for Maciek vs Running for Myrna; Swedish vs Polish; Prayer & Meditation vs Meditation & Red Light) calibrated to identical point rewards to maintain parity.
_Avoid_: Custom task, Asymmetric habit

**Check-in**:
The action of recording a Habit completion (or logging quantity, e.g. pages read) for a given date, awarding points to the Player's scores.
_Avoid_: Tick-off, completion, log, entry

**Proof**:
An optional visual or numeric confirmation attached to a Check-in (e.g. photo for Clean Space).
_Avoid_: Attachment, evidence

### Gamification & Competition

**Karma**:
The permanent, cumulative lifetime total points earned by a Player that never resets and cannot be spent.
_Avoid_: XP, Currency, Balance, Spendable tokens

**Leaderboard Score**:
The time-windowed point tally that resets automatically at period boundaries (Weekly on Sunday midnight, Monthly on last day, Yearly on Dec 31).
_Avoid_: Ranking, level

**Stake**:
The mutual real-world reward or forfeit wagered on a period's Leaderboard (e.g. loser buys dinner for the winner), credited directly without intrusive alerts.
_Avoid_: Reward, Prize, Bounty, Trophy

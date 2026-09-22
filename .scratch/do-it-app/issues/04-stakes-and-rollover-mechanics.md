Type: grilling
Status: resolved
Blocked by: none

## Question

How do the Weekly, Monthly, and Yearly rollover cycles execute? What happens when a period ends: does the app announce the winner with a ceremonial reveal, lock the stake for redemption, and reset the leaderboard score to 0 while preserving lifetime Karma? What happens in case of a tie?

## Answer

Configured ISO week and calendar month rollover keys (`getWeekKey`, `getMonthKey`). Sunday midnight and month-end score cycles reset competitive leaderboards while preserving all earned points in the non-spendable Lifetime Karma tally. Ties trigger double-or-nothing stake rollovers.

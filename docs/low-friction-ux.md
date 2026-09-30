# Do It: low-friction UX

## Core flow

Account creation comes first. The first habit screen starts with six common choices and allows one habit to be enough. An optional list contains the rest. After saving, Today opens with pending habits visible. A standard manual check-in is one large tap. Automatic habits stay on Today as pending until Google Health confirms them; a manual check-in is always possible.

The three destinations are **Today**, **Duel**, and **Progress**, each with a labeled icon. The profile button opens Settings and Google Health. Today keeps completed habits collapsed and date browsing behind a disclosure. Duel shows a short activity list with deeper history on demand. Progress shows personal trends and habit management, including an editable step target.

## Screen states

| Screen | Mobile | Desktop |
| --- | --- | --- |
| Account | One centered form; email, password, display name | Same compact form |
| First habit | Starter choices, one primary save action | Same choices in a narrow centered column |
| Today | Pending cards first; 44 px check target; collapsed completed and past days | Same content in centered column, persistent three-item sidebar |
| Duel | Scores and stake, then four recent events; full history on demand | Same content with roomier spacing |
| Progress | Streak, weekly completion, seven-day trend, habit list | Same content in centered column |
| Connection | One Connect action; plain iPhone/Android setup guidance; last checked and recovery states | Same card inside Settings |

Keep secondary actions icon-led with accessible names. Do not promise live or universal sync: the user must enable their fitness app, phone health store, and Google Health sharing. Show last checked, permission problems, and missing data without implying a check-in happened.

## Validation

The production build and a browser check of the account entry screen were completed. Signed-in Today, Duel, Progress, OAuth, and real-device states still need verification using test accounts and consented iPhone/Android data before release.

# A judged Daily Double always auto-reveals the Answer, correct or incorrect

ADR-0007 auto-reveals the Answer on a correct judge because the attempt loop is already over, and it deliberately leaves an incorrect judge alone — a normal wrong Buzz reopens the loop, and the remaining Players still deserve an un-spoiled Clue. A Daily Double never has remaining Players: exactly one Player was ever eligible to answer it, so a wrong answer ends the Clue's attempt loop just as finally as a correct one does.

Judging a Daily Double therefore auto-reveals in both outcomes, extending ADR-0007's reasoning to the losing case specifically because there's no one left to protect from a spoiler. This keeps both outcomes symmetric and spares the Host a manual Reveal click that would otherwise do nothing but delay them before they can Close.

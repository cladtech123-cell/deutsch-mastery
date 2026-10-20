"""Placement recommendation from the overall diagnostic percent."""

# (upper bound of percent, level, module). Each band starts the learner at a module whose
# prerequisites the score suggests they already know; anything >= 92 starts mid-A2.
BANDS = ((25, "A1", 1), (45, "A1", 4), (60, "A1", 7), (75, "A1", 10), (85, "A2", 13), (92, "A2", 16))


def recommend(percent: int) -> tuple[str, int]:
    for upper, level, module in BANDS:
        if percent < upper:
            return level, module
    return "A2", 19

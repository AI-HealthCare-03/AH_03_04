from types import SimpleNamespace

from app.services.scores import ScoreService


def test_score_components_reflect_exercise_sleep_vitals_prediction_and_streak():
    activity = SimpleNamespace(sleep_hours=7.5)
    vital_records = [SimpleNamespace(is_critical=True), SimpleNamespace(is_critical=False)]
    prediction = SimpleNamespace(
        items=[
            SimpleNamespace(is_at_risk=True),
            SimpleNamespace(is_at_risk=False),
        ]
    )

    result = ScoreService._calculate_component_scores(
        activity=activity,
        exercise_minutes=30,
        vital_records=vital_records,
        prediction=prediction,
        current_streak=3,
    )

    assert result["steps_score"] == 0
    assert result["exercise_score"] == 15
    assert result["water_score"] == 0
    assert result["sleep_score"] == 10
    assert result["vital_score"] == 30
    assert result["bonus_score"] == 3
    assert result["total_score"] == 58
    assert result["grade"] == "D"


def test_score_grade_status_and_message_thresholds():
    assert ScoreService._grade(95) == "S"
    assert ScoreService._grade(85) == "A"
    assert ScoreService._grade(75) == "B"
    assert ScoreService._grade(65) == "C"
    assert ScoreService._grade(55) == "D"
    assert ScoreService._status(55) == "HIGH"
    assert ScoreService._status(75) == "CAUTION"
    assert ScoreService._status(85) == "GOOD"
    assert "주의" in ScoreService._message(55)


def test_score_linear_slope_detects_direction():
    assert ScoreService._linear_slope([60, 65, 70]) > 0
    assert ScoreService._linear_slope([70, 65, 60]) < 0
    assert ScoreService._linear_slope([70, 70, 70]) == 0

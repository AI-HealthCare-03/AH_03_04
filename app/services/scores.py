from datetime import date, datetime, time, timedelta
from decimal import Decimal

from app.dtos.scores import HealthScoreHistoryResponse, HealthScoreResponse
from app.models.challenges import ChallengeCheckin
from app.models.predictions import ActivityLog, ChronicHealthInput, ExerciseLog, PredictionResult, VitalRecord
from app.models.scores import DailyHealthScore
from app.models.users import User


class ScoreService:
    async def get_today_score(self, user: User) -> HealthScoreResponse:
        return await self._score_for_date(user, date.today())

    async def get_scores(self, user: User, from_date: date | None, to_date: date | None) -> HealthScoreHistoryResponse:
        end = to_date or date.today()
        start = from_date or end - timedelta(days=6)
        items = []
        current = start
        while current <= end:
            items.append(await self._score_for_date(user, current))
            current += timedelta(days=1)
        return HealthScoreHistoryResponse(items=items)

    @classmethod
    async def _score_for_date(cls, user: User, target_date: date) -> HealthScoreResponse:
        health = (
            await ChronicHealthInput.filter(
                user_id=user.id,
                created_at__lte=cls._end_of_day(target_date),
            )
            .order_by("-created_at")
            .first()
        )
        if health is None:
            return HealthScoreResponse(
                score_date=target_date,
                total_score=None,
                grade=None,
                status="NEEDS_INPUT",
                message="건강 설문을 입력하면 건강 점수를 확인할 수 있습니다.",
                calculation_basis=["건강 설문 미입력"],
            )

        activity = await ActivityLog.get_or_none(user_id=user.id, record_date=target_date)
        exercise_minutes = await cls._exercise_minutes(user.id, target_date)
        vital_records = await VitalRecord.filter(user_id=user.id, record_date=target_date)
        prediction = (
            await PredictionResult.filter(user_id=user.id, created_at__lte=cls._end_of_day(target_date))
            .order_by("-created_at")
            .prefetch_related("items")
            .first()
        )
        current_streak = await cls._challenge_streak(user.id, target_date)

        component = cls._calculate_component_scores(
            activity=activity,
            exercise_minutes=exercise_minutes,
            vital_records=vital_records,
            prediction=prediction,
            current_streak=current_streak,
        )
        trend_label, trend_slope = await cls._calculate_trend(user.id, target_date, component["total_score"])

        row, _ = await DailyHealthScore.update_or_create(
            defaults={
                **component,
                "trend_label": trend_label,
                "trend_slope": Decimal(str(trend_slope)) if trend_slope is not None else None,
            },
            user_id=user.id,
            score_date=target_date,
        )
        return cls._to_response(row, cls._basis(activity, exercise_minutes, vital_records, prediction, current_streak))

    @staticmethod
    def _calculate_component_scores(
        activity: ActivityLog | None,
        exercise_minutes: int,
        vital_records: list[VitalRecord],
        prediction: PredictionResult | None,
        current_streak: int,
    ) -> dict:
        exercise_score = min(round(exercise_minutes / 30 * 15), 15)
        sleep_score = ScoreService._sleep_score(float(activity.sleep_hours)) if activity and activity.sleep_hours else 0
        vital_score = ScoreService._vital_score(vital_records, prediction)
        bonus_score = min(current_streak, 10)
        total_score = exercise_score + sleep_score + vital_score + bonus_score
        grade = ScoreService._grade(total_score)
        return {
            "steps_score": 0,
            "exercise_score": exercise_score,
            "water_score": 0,
            "sleep_score": sleep_score,
            "vital_score": vital_score,
            "bonus_score": bonus_score,
            "total_score": total_score,
            "grade": grade,
        }

    @staticmethod
    def _sleep_score(hours: float) -> int:
        if 7 <= hours <= 9:
            return 10
        if 6 <= hours < 7 or 9 < hours <= 10:
            return 7
        return 4

    @staticmethod
    def _vital_score(vital_records: list[VitalRecord], prediction: PredictionResult | None) -> int:
        score = 50
        critical_count = sum(1 for record in vital_records if record.is_critical)
        score -= min(critical_count * 10, 30)
        if prediction is not None:
            at_risk_count = sum(1 for item in prediction.items if item.is_at_risk)
            score -= min(at_risk_count * 10, 30)
        else:
            score -= 5
        return max(score, 0)

    @staticmethod
    async def _exercise_minutes(user_id: int, target_date: date) -> int:
        records = await ExerciseLog.filter(user_id=user_id, exercise_date=target_date)
        return sum(record.duration_minutes for record in records)

    @staticmethod
    async def _challenge_streak(user_id: int, target_date: date) -> int:
        rows = await ChallengeCheckin.filter(user_id=user_id, checkin_date__lte=target_date).values("checkin_date")
        dates = {row["checkin_date"] for row in rows}
        streak = 0
        current = target_date
        while current in dates:
            streak += 1
            current -= timedelta(days=1)
        return streak

    @staticmethod
    async def _calculate_trend(user_id: int, target_date: date, today_score: int) -> tuple[str | None, float | None]:
        start_date = target_date - timedelta(days=29)
        rows = await DailyHealthScore.filter(
            user_id=user_id,
            score_date__gte=start_date,
            score_date__lt=target_date,
        ).order_by("score_date")
        values = [row.total_score for row in rows] + [today_score]
        if len(values) < 2:
            return None, None

        slope = ScoreService._linear_slope(values)
        if slope > 0.2:
            return "IMPROVING", round(slope, 3)
        if slope < -0.2:
            return "DECLINING", round(slope, 3)
        return "STABLE", round(slope, 3)

    @staticmethod
    def _linear_slope(values: list[int]) -> float:
        n = len(values)
        x_mean = (n - 1) / 2
        y_mean = sum(values) / n
        denominator = sum((index - x_mean) ** 2 for index in range(n))
        if denominator == 0:
            return 0.0
        numerator = sum((index - x_mean) * (value - y_mean) for index, value in enumerate(values))
        return numerator / denominator

    @staticmethod
    def _grade(score: int) -> str:
        if score >= 90:
            return "S"
        if score >= 80:
            return "A"
        if score >= 70:
            return "B"
        if score >= 60:
            return "C"
        return "D"

    @staticmethod
    def _status(score: int) -> str:
        if score < 60:
            return "HIGH"
        if score < 80:
            return "CAUTION"
        return "GOOD"

    @staticmethod
    def _message(score: int) -> str:
        if score < 60:
            return "주의가 필요한 건강 신호가 있습니다."
        if score < 80:
            return "일부 건강 지표를 점검해 보세요."
        return "현재 입력 기준 건강 상태가 양호한 편입니다."

    @staticmethod
    def _basis(
        activity: ActivityLog | None,
        exercise_minutes: int,
        vital_records: list[VitalRecord],
        prediction: PredictionResult | None,
        current_streak: int,
    ) -> list[str]:
        basis = ["건강 설문 입력 완료"]
        basis.append(f"운동 {exercise_minutes}분")
        basis.append(f"수면 기록 {'있음' if activity and activity.sleep_hours else '없음'}")
        basis.append(f"활력징후 기록 {len(vital_records)}건")
        basis.append("AI 예측 결과 반영" if prediction else "AI 예측 결과 없음")
        if current_streak > 0:
            basis.append(f"챌린지 {current_streak}일 연속 달성")
        return basis

    @staticmethod
    def _to_response(row: DailyHealthScore, calculation_basis: list[str]) -> HealthScoreResponse:
        return HealthScoreResponse(
            score_date=row.score_date,
            total_score=row.total_score,
            grade=row.grade,
            status=ScoreService._status(row.total_score),
            message=ScoreService._message(row.total_score),
            calculation_basis=calculation_basis,
        )

    @staticmethod
    def _end_of_day(target_date: date) -> datetime:
        return datetime.combine(target_date, time.max)

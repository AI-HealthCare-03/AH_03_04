from tortoise import fields, models


class DailyHealthScore(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField("models.User", related_name="daily_health_scores", on_delete=fields.CASCADE)
    score_date = fields.DateField()
    steps_score = fields.IntField(default=0)
    exercise_score = fields.IntField(default=0)
    water_score = fields.IntField(default=0)
    sleep_score = fields.IntField(default=0)
    vital_score = fields.IntField(default=0)
    bonus_score = fields.IntField(default=0)
    total_score = fields.IntField(default=0)
    grade = fields.CharField(max_length=1, null=True)
    trend_label = fields.CharField(max_length=20, null=True)
    trend_slope = fields.DecimalField(max_digits=6, decimal_places=3, null=True)
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)

    class Meta:
        table = "daily_health_scores"
        unique_together = (("user", "score_date"),)

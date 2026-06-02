from tortoise import fields, models


class WeeklyReport(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField("models.User", related_name="weekly_reports", on_delete=fields.CASCADE)
    week_start_date = fields.DateField()
    week_end_date = fields.DateField()
    status = fields.CharField(max_length=20, default="AVAILABLE")
    source_summary = fields.JSONField()
    summary_cards = fields.JSONField(default=list)
    metric_summaries = fields.JSONField(default=list)
    trend_summary = fields.JSONField(default=dict)
    challenge_summary = fields.JSONField(default=dict)
    report_text = fields.TextField()
    provider = fields.CharField(max_length=20)
    model_name = fields.CharField(max_length=50)
    input_tokens = fields.IntField(null=True)
    output_tokens = fields.IntField(null=True)
    cache_read_tokens = fields.IntField(null=True)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "weekly_reports"
        unique_together = (("user", "week_start_date"),)

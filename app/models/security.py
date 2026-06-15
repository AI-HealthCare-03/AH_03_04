from tortoise import fields, models


class SecurityAuditLog(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField(
        "models.User",
        related_name="security_audit_logs",
        null=True,
        on_delete=fields.SET_NULL,
    )
    event_type = fields.CharField(max_length=50, db_index=True)
    request_path = fields.CharField(max_length=255, null=True)
    http_method = fields.CharField(max_length=10, null=True)
    ip_address = fields.CharField(max_length=45, null=True)
    user_agent = fields.CharField(max_length=255, null=True)
    status_code = fields.IntField(null=True)
    masked_summary = fields.CharField(max_length=500, null=True)
    created_at = fields.DatetimeField(auto_now_add=True, db_index=True)

    class Meta:
        table = "security_audit_logs"
        indexes = (("user_id", "created_at"),)


class RefreshTokenSession(models.Model):
    id = fields.BigIntField(primary_key=True)
    user = fields.ForeignKeyField(
        "models.User",
        related_name="refresh_token_sessions",
        on_delete=fields.CASCADE,
    )
    jti = fields.CharField(max_length=64, unique=True)
    expires_at = fields.DatetimeField()
    revoked_at = fields.DatetimeField(null=True)
    replaced_by_jti = fields.CharField(max_length=64, null=True)
    reuse_detected_at = fields.DatetimeField(null=True)
    remember_me = fields.BooleanField(default=False)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "refresh_token_sessions"
        indexes = (("user_id", "created_at"), ("user_id", "revoked_at"), ("expires_at",))

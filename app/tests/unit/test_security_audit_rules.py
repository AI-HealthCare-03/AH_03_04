from app.services.security_audit import mask_email, safe_summary


def test_mask_email_keeps_domain_and_hides_local_part():
    assert mask_email("hong@example.com") == "ho***@example.com"
    assert mask_email("a@example.com") == "a***@example.com"
    assert mask_email("not-email") == "***"


def test_safe_summary_skips_empty_values_and_limits_length():
    summary = safe_summary({"email": "ho***@example.com", "password": None, "reason": "failed"})

    assert summary == "email=ho***@example.com; reason=failed"
    assert len(safe_summary({"long": "x" * 1000})) == 500

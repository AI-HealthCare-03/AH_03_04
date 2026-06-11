from app.services.account_stats import membership_grade_for_points, points_to_level


def test_points_to_level_uses_100_point_steps():
    assert points_to_level(0) == 1
    assert points_to_level(99) == 1
    assert points_to_level(100) == 2
    assert points_to_level(550) == 6


def test_membership_grade_for_points_uses_thresholds():
    assert membership_grade_for_points(0) == "일반 회원"
    assert membership_grade_for_points(100) == "브론즈"
    assert membership_grade_for_points(500) == "실버"
    assert membership_grade_for_points(1000) == "골드"

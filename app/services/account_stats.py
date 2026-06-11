from tortoise.functions import Sum

from app.models.challenges import UserBadge
from app.models.users import UserAccountStats


def points_to_level(points: int) -> int:
    return max(points // 100 + 1, 1)


def membership_grade_for_points(points: int) -> str:
    if points >= 1000:
        return "골드"
    if points >= 500:
        return "실버"
    if points >= 100:
        return "브론즈"
    return "일반 회원"


async def ensure_user_account_stats(user_id: int) -> UserAccountStats:
    stats, _ = await UserAccountStats.get_or_create(user_id=user_id)
    return stats


async def sync_user_account_stats(user_id: int) -> UserAccountStats:
    aggregate = await UserBadge.filter(user_id=user_id).annotate(total=Sum("bonus_points")).values("total")
    points = int(aggregate[0]["total"] or 0) if aggregate else 0
    stats, _ = await UserAccountStats.get_or_create(user_id=user_id)
    stats.points = points
    stats.level = points_to_level(points)
    stats.membership_grade = membership_grade_for_points(points)
    await stats.save(update_fields=["points", "level", "membership_grade", "updated_at"])
    return stats

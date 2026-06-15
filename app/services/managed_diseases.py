from app.models.users import DiseaseCode, UserManagedDisease

DEFAULT_DISEASE_CODES: dict[str, str] = {
    "DIABETES": "당뇨",
    "HYPERTENSION": "고혈압",
    "DYSLIPIDEMIA": "고지혈증",
    "OBESITY": "비만",
    "CKD": "만성신장질환",
}

DISEASE_ALIASES = {
    "당뇨": "DIABETES",
    "당뇨병": "DIABETES",
    "고혈압": "HYPERTENSION",
    "고지혈증": "DYSLIPIDEMIA",
    "이상지질혈증": "DYSLIPIDEMIA",
    "비만": "OBESITY",
    "만성신장질환": "CKD",
    "만성 신장 질환": "CKD",
    "신장질환": "CKD",
}


def normalize_disease_codes(values: list[str]) -> list[str]:
    normalized: list[str] = []
    for value in values:
        code = DISEASE_ALIASES.get(value.strip(), value.strip().upper())
        if code in DEFAULT_DISEASE_CODES and code not in normalized:
            normalized.append(code)
    return normalized


async def ensure_default_disease_codes() -> None:
    for code, display_name in DEFAULT_DISEASE_CODES.items():
        await DiseaseCode.get_or_create(
            code=code,
            defaults={
                "display_name": display_name,
                "description": f"{display_name} 관리 대상 질환",
            },
        )


async def replace_user_managed_diseases(user_id: int, disease_values: list[str]) -> list[str]:
    codes = normalize_disease_codes(disease_values)
    await ensure_default_disease_codes()
    await UserManagedDisease.filter(user_id=user_id).delete()
    if not codes:
        return []

    await UserManagedDisease.bulk_create(
        [
            UserManagedDisease(
                user_id=user_id,
                disease_code=code,
                is_primary=index == 0,
            )
            for index, code in enumerate(codes)
        ]
    )
    return codes


async def get_user_managed_disease_codes(user_id: int) -> list[str]:
    rows = await UserManagedDisease.filter(user_id=user_id).order_by("-is_primary", "id")
    return [row.disease_code for row in rows]

from app.services.clova_ocr import ClovaOcrService


def test_clova_ocr_parser_extracts_health_checkup_values():
    text = """
    혈압 145/92 mmHg
    공복혈당 126 mg/dL
    총 콜레스테롤 230
    HDL 콜레스테롤 45
    LDL 콜레스테롤 150
    중성지방 180
    혈청 크레아티닌 1.4
    eGFR 58
    BUN 22
    요단백 양성
    """

    result = ClovaOcrService._parse_health_checkup_text(text)

    assert result["vitals"]["sbp"] == 145
    assert result["vitals"]["dbp"] == 92
    assert result["vitals"]["glucose_fasting"] == 126
    assert result["lipid"]["total_cholesterol"] == 230
    assert result["lipid"]["hdl_cholesterol"] == 45
    assert result["lipid"]["ldl_cholesterol"] == 150
    assert result["lipid"]["triglycerides"] == 180
    assert result["renal"]["creatinine"] == 1.4
    assert result["renal"]["egfr"] == 58
    assert result["renal"]["bun"] == 22
    assert result["renal"]["urine_protein_pos"] is True


def test_clova_ocr_parser_ignores_out_of_range_values():
    text = "공복혈당 9999 총 콜레스테롤 20 혈압 300/10"

    result = ClovaOcrService._parse_health_checkup_text(text)

    assert result["vitals"] == {}
    assert result["lipid"] == {}


def test_clova_ocr_parser_matches_korean_and_english_aliases():
    text = """
    식전혈당(FBS)
    121
    저밀도 콜레스테롤
    162
    고밀도 콜레스테롤
    39
    트리글리세라이드
    220
    단백뇨 음성
    """

    result = ClovaOcrService._parse_health_checkup_text(text)

    assert result["vitals"]["glucose_fasting"] == 121
    assert result["lipid"]["ldl_cholesterol"] == 162
    assert result["lipid"]["hdl_cholesterol"] == 39
    assert result["lipid"]["triglycerides"] == 220
    assert result["renal"]["urine_protein_pos"] is False


def test_clova_ocr_parser_does_not_use_not_applicable_or_reference_lipid_values():
    text = """
    총 콜레스테롤 비해당
    정상 기준 200 미만
    저밀도 콜레스테롤 해당 없음
    정상 범위 130 미만
    고밀도 콜레스테롤 미실시
    정상 60 이상
    중성지방 검사 안함
    참고치 150 미만
    공복혈당 121
    """

    result = ClovaOcrService._parse_health_checkup_text(text)

    assert result["lipid"] == {}
    assert result["vitals"]["glucose_fasting"] == 121

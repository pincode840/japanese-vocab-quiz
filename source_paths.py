import os
from pathlib import Path


def configured_path(environment_name, default):
    value = os.environ.get(environment_name)
    return Path(value).expanduser() if value else default


KAKAO_SOURCE_DIR = configured_path(
    "JLPT_KAKAO_SOURCE_DIR",
    Path.home() / "Documents" / "카카오톡 받은 파일",
)
N3_PDF_DIR = configured_path(
    "JLPT_N3_PDF_DIR",
    KAKAO_SOURCE_DIR / "JLPT N3 해커스 자료",
)
N2_DOWNLOAD_DIR = configured_path(
    "JLPT_N2_DOWNLOAD_DIR",
    Path.home() / "Downloads" / "drive-download-20260716T012548Z-1-001",
)
N2_PROBLEM_DIR = configured_path(
    "JLPT_N2_PROBLEM_DIR",
    Path.home() / "Downloads" / "N2 문제",
)

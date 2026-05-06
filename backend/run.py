from __future__ import annotations

import argparse

from app.core.version import APP_VERSION


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="personal_blog backend runner")
    parser.add_argument(
        "--version",
        action="store_true",
        help="print application version and exit",
    )
    return parser

if __name__ == "__main__":
    args = build_parser().parse_args()
    if args.version:
        print(APP_VERSION)
        raise SystemExit(0)

    from app.main import run

    run()

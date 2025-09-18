from __future__ import annotations

from settings import get_settings
from worker import PythonHelloWorker


def main() -> None:
    settings = get_settings()
    worker = PythonHelloWorker(settings)
    worker.run_forever()


if __name__ == "__main__":
    main()

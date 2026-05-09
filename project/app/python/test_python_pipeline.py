from pathlib import Path

import smart_retail_pipeline as pipeline


def main() -> int:
    summary = pipeline.run_pipeline({"days": 2, "customers": 20, "products": 12, "seed": 11}, logger=lambda _: None)
    assert summary["status"] == "success"
    assert summary["engine"] == "python"
    assert Path(pipeline.PATHS["warehouse_file"]).exists()
    assert Path(pipeline.PATHS["reports"]).exists()
    print("Python Smart Retail Pro checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from pathlib import Path

from ai_model_processor.config import load_config


def test_load_config_resolves_relative_paths() -> None:
    config = load_config(Path("config/example.mock.yaml"))

    assert config.provider == "mock"
    assert config.input.path.name == "sample_input.csv"
    assert config.output.path.name == "example_output.csv"
    assert config.prompt.template

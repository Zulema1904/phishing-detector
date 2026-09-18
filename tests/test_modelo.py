"""Tests del detector (no necesitan descargar el dataset)."""
import json

import pytest

from detector.modelo import ARTEFACTOS, RAIZ, entrenar, exportar, probabilidad

TEXTOS = [
    "verify your account now click here to claim your prize",
    "your password expires today update your account here",
    "win money now free offer click here",
    "thanks for the notes from the meeting see you tomorrow",
    "attached are the slides for the project review",
    "can we move the call to the afternoon thanks",
] * 3
ETIQUETAS = [1, 1, 1, 0, 0, 0] * 3


@pytest.fixture(scope="module")
def modelo_json():
    vectorizador, modelo = entrenar(TEXTOS, ETIQUETAS)
    return vectorizador, modelo, exportar(vectorizador, modelo, {})


@pytest.mark.parametrize("texto", [
    "Click HERE to verify your account!!!",
    "Thanks, see you at the meeting tomorrow",
    "texto sin ninguna palabra conocida",
    "",
])
def test_el_json_da_lo_mismo_que_scikit_learn(modelo_json, texto):
    """app.js repite la cuenta a mano: si el JSON o la fórmula fallan, el navegador daría otra cosa."""
    vectorizador, modelo, m = modelo_json
    esperado = modelo.predict_proba(vectorizador.transform([texto]))[0, 1]
    assert probabilidad(m, texto) == pytest.approx(esperado, abs=1e-3)


def test_aprende_lo_basico(modelo_json):
    *_, m = modelo_json
    assert probabilidad(m, "verify your account and claim your prize") > 0.5
    assert probabilidad(m, "thanks for the slides from the meeting") < 0.5


def test_el_modelo_publicado_no_usa_artefactos_del_dataset():
    ruta = RAIZ / "web" / "modelo.json"
    if not ruta.exists():
        pytest.skip("modelo.json aún no generado")
    m = json.loads(ruta.read_text(encoding="utf-8"))
    assert not set(ARTEFACTOS) & set(m["palabras"])
    assert len(m["palabras"]) == len(m["idf"]) == len(m["pesos"])
    assert m["metricas"]["exactitud"] > 0.9

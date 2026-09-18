"""Entrena el detector de phishing y lo exporta a JSON para usarlo en el navegador.

Uso:  python -m detector.modelo

Modelo: TF-IDF + regresión logística.
- Sencillo y rápido, y sobre todo **explicable**: cada palabra tiene un peso, así que se puede
  enseñar qué palabras han empujado el email hacia "phishing" o hacia "seguro".
- Cabe en un JSON pequeño: el navegador repite la cuenta sin servidor (web/app.js).
"""
import json
import math
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

RAIZ = Path(__file__).resolve().parent.parent
DATOS = RAIZ / "data" / "Phishing_Email.csv"
URL = "https://huggingface.co/datasets/zefang-liu/phishing-email-dataset/resolve/main/Phishing_Email.csv"
SALIDA = RAIZ / "web" / "modelo.json"

# El mismo patrón se usa en JavaScript: palabras que empiezan por letra
PATRON = r"[a-z][a-z0-9]+"
MAX_PALABRAS = 5000

# Palabras que delatan DE QUÉ COLECCIÓN viene cada email, no si es phishing: los emails "seguros"
# del dataset salen sobre todo de Enron y de listas de correo (lingüística, SpamAssassin…).
# Si se dejan, el modelo aprende "si pone enron es seguro", que no sirve con emails reales.
ARTEFACTOS = """
enron vince kaminski louise sally gary john mark ect hou houston hourahead url newsisfree cnet
linguistics linguist language english university edu listinfo mailman forteana spamassassin razor
rpm fork bitbitch groups users sightings paliourg xls tm oo gr em
""".split()
SEMILLA = 1904


def descargar():
    if DATOS.exists():
        return
    DATOS.parent.mkdir(exist_ok=True)
    r = requests.get(URL, timeout=120)
    r.raise_for_status()
    DATOS.write_bytes(r.content)


def cargar() -> pd.DataFrame:
    df = pd.read_csv(DATOS, usecols=["Email Text", "Email Type"]).dropna()
    df = df.rename(columns={"Email Text": "texto", "Email Type": "tipo"})
    df["phishing"] = (df["tipo"] == "Phishing Email").astype(int)
    df = df[df["texto"].str.strip().str.len() > 0]
    return df.drop_duplicates("texto")


def entrenar(textos, etiquetas):
    vectorizador = TfidfVectorizer(lowercase=True, token_pattern=PATRON, max_features=MAX_PALABRAS,
                                   min_df=3, sublinear_tf=True, stop_words=ARTEFACTOS)
    X = vectorizador.fit_transform(textos)
    modelo = LogisticRegression(C=4.0, max_iter=2000, class_weight="balanced")
    modelo.fit(X, etiquetas)
    return vectorizador, modelo


def exportar(vectorizador, modelo, metricas) -> dict:
    vocab = vectorizador.get_feature_names_out()
    return {
        "patron": PATRON,
        "palabras": vocab.tolist(),
        "idf": np.round(vectorizador.idf_, 5).tolist(),
        "pesos": np.round(modelo.coef_[0], 5).tolist(),
        "sesgo": round(float(modelo.intercept_[0]), 5),
        "metricas": metricas,
    }


def probabilidad(m: dict, texto: str) -> float:
    """La misma cuenta que hace app.js (sirve para comprobar que el JSON exportado es correcto)."""
    indice = {p: i for i, p in enumerate(m["palabras"])}
    cuentas = {}
    for palabra in re.findall(m["patron"], texto.lower()):
        if palabra in indice:
            cuentas[indice[palabra]] = cuentas.get(indice[palabra], 0) + 1
    # TF-IDF "sublineal": 1 + log(nº de veces) × idf, y después se normaliza el vector a longitud 1
    valores = {i: (1 + math.log(c)) * m["idf"][i] for i, c in cuentas.items()}
    norma = math.sqrt(sum(v * v for v in valores.values())) or 1.0
    z = m["sesgo"] + sum(v / norma * m["pesos"][i] for i, v in valores.items())
    return 1 / (1 + math.exp(-z))


def main():
    sys.stdout.reconfigure(encoding="utf-8")  # emojis también en la consola de Windows
    descargar()
    df = cargar()
    tr, te = train_test_split(df, test_size=0.2, stratify=df["phishing"], random_state=SEMILLA)
    vectorizador, modelo = entrenar(tr["texto"], tr["phishing"])
    pred = modelo.predict(vectorizador.transform(te["texto"]))
    vn, fp, fn, vp = confusion_matrix(te["phishing"], pred).ravel()
    metricas = {
        "emails": len(df), "entrenamiento": len(tr), "prueba": len(te),
        "exactitud": round(accuracy_score(te["phishing"], pred), 4),
        "precision": round(precision_score(te["phishing"], pred), 4),
        "sensibilidad": round(recall_score(te["phishing"], pred), 4),
        "f1": round(f1_score(te["phishing"], pred), 4),
        "matriz": {"vp": int(vp), "fp": int(fp), "fn": int(fn), "vn": int(vn)},
    }
    m = exportar(vectorizador, modelo, metricas)
    SALIDA.write_text(json.dumps(m, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    orden = np.argsort(modelo.coef_[0])
    vocab = vectorizador.get_feature_names_out()
    print(f"📧 {len(df):,} emails · {len(tr):,} para entrenar · {len(te):,} para probar")
    print(f"✅ Exactitud {metricas['exactitud']:.1%} · precisión {metricas['precision']:.1%} · "
          f"sensibilidad {metricas['sensibilidad']:.1%} · F1 {metricas['f1']:.3f}")
    print(f"   Phishing detectados {vp} · colados {fn} · falsas alarmas {fp} · seguros bien {vn}")
    print("🎣 Palabras más de phishing:", ", ".join(vocab[orden[-15:]][::-1]))
    print("🛡️  Palabras más de email normal:", ", ".join(vocab[orden[:15]]))
    print(f"💾 {SALIDA.relative_to(RAIZ)} ({SALIDA.stat().st_size / 1e3:.0f} KB)")


if __name__ == "__main__":
    main()

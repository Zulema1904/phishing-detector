# 🎣 Phishing.exe: detector de emails de phishing con IA explicable

![tests](https://github.com/Zulema1904/phishing-detector/actions/workflows/tests.yml/badge.svg)

Pegas un email y te dice si parece **phishing** y, sobre todo, **por qué**: qué palabras han pesado
en la decisión de la IA y qué señales de alerta ha encontrado.

**🔗 Demo:** se abre como **Phishing.exe** dentro de mi portfolio, [ZulemaOS](https://zulema1904.github.io).
Todo funciona en el navegador: el texto del email no se envía a ningún servidor.

## Cómo decide

Combina dos capas que se complementan:

| Capa | Qué hace | Punto fuerte | Punto débil |
|---|---|---|---|
| **IA** (TF-IDF + regresión logística) | Aprende de 14.000 emails reales qué palabras son típicas del phishing | Detecta el "tono" del fraude y del spam | Solo aprendió inglés; confunde publicidad con phishing |
| **Señales de alerta** (reglas) | Busca enlaces a IPs o acortados, urgencia, peticiones de contraseñas o tarjetas, premios… | Funciona en español e inglés y cada aviso se entiende | Solo ve lo que se le ha dicho que busque |

El veredicto final (*phishing probable*, *sospechoso*, *spam o publicidad*, *parece seguro* o *no lo sé*)
sale de juntar las dos.

## Resultados

Evaluado con **3.508 emails que el modelo no vio al entrenar** (20 % del dataset, separado al azar
manteniendo la proporción de cada clase):

| Exactitud | Precisión | Sensibilidad | F1 |
|---|---|---|---|
| 97,8 % | 96,7 % | 97,6 % | 0,971 |

- **Sensibilidad** 97,6 %: de cada 100 emails de phishing, detecta casi 98.
- **Precisión** 96,7 %: cuando dice "phishing", acierta casi 97 de cada 100 veces.

## Decisiones que puedo explicar

- **Un modelo sencillo a propósito.** La regresión logística da a cada palabra un peso: se puede enseñar
  qué palabras han empujado la decisión, y el modelo entero cabe en un JSON de 130 KB que el
  navegador ejecuta sin servidor.
- **Quité "trampas" del dataset.** La primera versión acertaba un 98,4 %, pero sus palabras favoritas
  para decir "seguro" eran *enron*, *vince* o *spamassassin*: los emails normales del dataset vienen
  sobre todo de Enron y de listas de correo, así que el modelo aprendía *de dónde venía el email*, no
  *si era phishing*. Al excluir esas palabras la nota baja a 97,8 %, pero el modelo generaliza mejor
  a emails reales.
- **El JSON se comprueba con tests.** `app.js` repite a mano la cuenta de scikit-learn (TF-IDF
  sublineal, normalización y función sigmoide); un test verifica que da las mismas probabilidades.
- **"No lo sé" también es una respuesta.** Si el email apenas tiene palabras que el modelo conozca
  (por ejemplo, en español), la IA no opina y decide solo con las señales de alerta.

## Límites

- El dataset está en inglés y mezcla phishing con spam comercial: un email de publicidad legítimo
  puede salir como "parece spam". Por eso el veredicto distingue *spam* de *phishing probable*.
- Es una herramienta didáctica: ante la duda, no pulses enlaces y entra en la web escribiendo tú la dirección.

## Cómo ejecutarlo

```bash
pip install -r requirements.txt
python -m detector.modelo      # descarga el dataset, entrena y genera web/modelo.json
pytest                         # tests
python -m http.server -d web   # abre http://localhost:8000
```

## Estructura

```
detector/modelo.py   Entrenamiento, evaluación y exportación a JSON
web/                 La app: index.html, style.css, app.js y modelo.json
tests/               Tests (el JSON reproduce a scikit-learn, sin artefactos del dataset…)
```

## Datos

[Phishing Email Detection](https://huggingface.co/datasets/zefang-liu/phishing-email-dataset)
(copia del dataset de Kaggle), licencia **LGPL-3.0**. 17.536 emails únicos tras quitar duplicados.

## Stack

Python · scikit-learn · pandas · pytest · GitHub Actions · JavaScript

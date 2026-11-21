
# Flask do projeto
# Lê os JSONs gerados a partir do Colab e entrega para o frontend.

import json
import unicodedata
from pathlib import Path

from flask import Flask, jsonify, request


# Caminhos das pastas
PASTA_API = Path(__file__).resolve().parent
PASTA_FRONTEND = PASTA_API.parent.parent.parent / "frontend"
PASTA_DADOS = PASTA_FRONTEND / "js" / "Dados do Colab"


# Criando a aplicação Flask
app = Flask(
    __name__,
    static_folder=str(PASTA_FRONTEND),
    static_url_path=""
)


# Conversão dos nomes dos estados para siglas
NOME_PARA_SIGLA = {
    "Acre": "AC", "Alagoas": "AL", "Amapa": "AP", "Amazonas": "AM",
    "Bahia": "BA", "Ceara": "CE", "Distrito Federal": "DF",
    "Espirito Santo": "ES", "Goias": "GO", "Maranhao": "MA",
    "Mato Grosso": "MT", "Mato Grosso do Sul": "MS", "Minas Gerais": "MG",
    "Para": "PA", "Paraiba": "PB", "Parana": "PR", "Pernambuco": "PE",
    "Piaui": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
    "Rio Grande do Sul": "RS", "Rondonia": "RO", "Roraima": "RR",
    "Santa Catarina": "SC", "Sao Paulo": "SP", "Sergipe": "SE",
    "Tocantins": "TO",
}


SIGLA_PARA_NOME = {
    sigla: nome for nome, sigla in NOME_PARA_SIGLA.items()
}


# Normaliza os nomes dos estados, removendo acentos
def normalizar(texto):
    texto = unicodedata.normalize("NFD", str(texto))

    return "".join(
        caractere for caractere in texto
        if unicodedata.category(caractere) != "Mn"
    ).strip().casefold()


NOME_PARA_SIGLA_NORMALIZADO = {
    normalizar(nome): sigla
    for nome, sigla in NOME_PARA_SIGLA.items()
}


# Função para ler os arquivos JSON
def ler_json(nome_arquivo):
    caminho = PASTA_DADOS / nome_arquivo

    with open(caminho, encoding="utf-8-sig") as arquivo:
        return json.load(arquivo)


# Página inicial do site
@app.route("/")
def pagina_inicial():
    return app.send_static_file("index.html")


# Verifica se a API está funcionando
@app.route("/api/saude")
def api_saude():
    return jsonify({"status": "ok"})


# API dos dados do SCR
@app.route("/api/scr")
def api_scr():
    dados = ler_json("dados_scr_2026.json")

    uf = request.args.get("uf")

    if uf:
        sigla = NOME_PARA_SIGLA_NORMALIZADO.get(
            normalizar(uf), uf
        ).upper()

        dados["ufs"] = [
            item for item in dados["ufs"]
            if item["uf"].upper() == sigla
        ]

        if not dados["ufs"]:
            return jsonify({
                "erro": f"UF '{uf}' não encontrada"
            }), 404

    return jsonify(dados)


# API dos dados do IBGE
@app.route("/api/ibge")
def api_ibge():
    dados = ler_json("dados_ibge.json")

    uf = request.args.get("uf")

    if uf:
        nome = SIGLA_PARA_NOME.get(uf.upper(), uf)
        nome = normalizar(nome)

        dados = [
            item for item in dados
            if normalizar(item["UF"]) == nome
        ]

        if not dados:
            return jsonify({
                "erro": f"UF '{uf}' não encontrada"
            }), 404

    return jsonify(dados)


# API dos dados mensais de apostas
@app.route("/api/apostas")
def api_apostas():
    dados = ler_json("bets_mensal.json")
    return jsonify(dados)


# API das taxas de juros por instituição
@app.route("/api/juros")
def api_juros():
    dados = ler_json("taxa_juros_instituicoes.json")
    return jsonify(dados)


# API dos dados de inadimplência por UF
@app.route("/api/inadimplencia")
def api_inadimplencia():
    dados = ler_json("inadimplencia_uf.json")
    return jsonify(dados)


# API das dívidas saudáveis e críticas
@app.route("/api/dividas")
def api_dividas():
    dados = ler_json("divida_saudavel_critica_uf.json")
    return jsonify(dados)


# Inicialização local do servidor
if __name__ == "__main__":
    # Na AWS utilizaremos o Gunicorn, sem debug.
    app.run(debug=True)

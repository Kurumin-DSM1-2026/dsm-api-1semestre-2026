import hmac
import json
import os
import re
import time
import unicodedata
from datetime import datetime

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

PASTA_FRONT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend")
)

# lê as senhas do arquivo .env, que fica na pasta principal do projeto
load_dotenv(os.path.join(PASTA_FRONT, "..", ".env"))

PASTA_DADOS = os.path.join(PASTA_FRONT, "js", "Dados do Colab")

app = Flask(__name__, static_folder=PASTA_FRONT, static_url_path="")

TIPOS_VALIDOS = {"pergunta", "sugestao", "critica"}
REGEX_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# nomes sem acento, do jeito que estão nos JSONs do Colab
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
SIGLA_PARA_NOME = {sigla: nome for nome, sigla in NOME_PARA_SIGLA.items()}


def normalizar(texto):
    texto = unicodedata.normalize("NFD", str(texto))
    return "".join(c for c in texto if unicodedata.category(c) != "Mn").strip().casefold()


NOME_PARA_SIGLA_NORMALIZADO = {normalizar(nome): sigla for nome, sigla in NOME_PARA_SIGLA.items()}


def ler_json(nome_arquivo):
    with open(os.path.join(PASTA_DADOS, nome_arquivo), encoding="utf-8-sig") as arquivo:
        return json.load(arquivo)


def criar_conexao():
    import pymysql

    return pymysql.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "3306")),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", ""),
        database=os.environ.get("DB_NAME", "credito_inclusivo"),
        charset="utf8mb4",
        autocommit=True,
        connect_timeout=5,
    )


def validar_contato(dados):
    nome = str(dados.get("nome", "")).strip()
    email = str(dados.get("email", "")).strip()
    tipo = str(dados.get("tipo", "")).strip().lower()
    mensagem = str(dados.get("mensagem", "")).strip()

    erros = {}
    if not 2 <= len(nome) <= 100:
        erros["nome"] = "Informe um nome com 2 a 100 caracteres."
    if len(email) > 150 or not REGEX_EMAIL.match(email):
        erros["email"] = "Informe um e-mail válido."
    if tipo not in TIPOS_VALIDOS:
        erros["tipo"] = "Escolha pergunta, sugestão ou crítica."
    if not 5 <= len(mensagem) <= 2000:
        erros["mensagem"] = "A mensagem precisa ter de 5 a 2000 caracteres."

    return {"nome": nome, "email": email, "tipo": tipo, "mensagem": mensagem}, erros


@app.get("/")
def inicio():
    return send_from_directory(app.static_folder, "index.html")


@app.get("/api/saude")
def saude():
    banco = "ok"
    try:
        conexao = criar_conexao()
        try:
            with conexao.cursor() as cursor:
                cursor.execute("SELECT 1")
        finally:
            conexao.close()
    except Exception:
        banco = "indisponivel"
    return jsonify({"status": "ok", "banco": banco})


@app.get("/api/scr")
def api_scr():
    dados = ler_json("dados_scr_2026.json")
    uf = request.args.get("uf")
    if uf:
        sigla = NOME_PARA_SIGLA_NORMALIZADO.get(normalizar(uf), uf).upper()
        dados["ufs"] = [item for item in dados["ufs"] if item["uf"].upper() == sigla]
        if not dados["ufs"]:
            return jsonify({"erro": f"UF '{uf}' não encontrada"}), 404
    return jsonify(dados)


@app.get("/api/ibge")
def api_ibge():
    dados = ler_json("dados_ibge.json")
    uf = request.args.get("uf")
    if uf:
        nome = normalizar(SIGLA_PARA_NOME.get(uf.upper(), uf))
        dados = [item for item in dados if normalizar(item["UF"]) == nome]
        if not dados:
            return jsonify({"erro": f"UF '{uf}' não encontrada"}), 404
    return jsonify(dados)


@app.get("/api/apostas")
def api_apostas():
    return jsonify(ler_json("bets_mensal.json"))


@app.get("/api/juros")
def api_juros():
    return jsonify(ler_json("taxa_juros_instituicoes.json"))


@app.get("/api/inadimplencia")
def api_inadimplencia():
    return jsonify(ler_json("inadimplencia_uf.json"))


@app.get("/api/dividas")
def api_dividas():
    return jsonify(ler_json("divida_saudavel_critica_uf.json"))


@app.post("/api/contato")
def salvar_contato():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados em JSON."}), 400

    if str(dados.get("empresa", "")).strip():
        return jsonify({"mensagem": "Recebido."}), 201

    limpo, erros = validar_contato(dados)
    if erros:
        return jsonify({"erro": "Dados inválidos.", "campos": erros}), 400

    try:
        conexao = criar_conexao()
        try:
            with conexao.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO comentarios (nome, email, tipo, mensagem) VALUES (%s, %s, %s, %s)",
                    (limpo["nome"], limpo["email"], limpo["tipo"], limpo["mensagem"]),
                )
        finally:
            conexao.close()
    except Exception:
        app.logger.exception("Erro ao salvar o comentário")
        return jsonify({"erro": "Não foi possível salvar agora. Tente de novo mais tarde."}), 503

    return jsonify({"mensagem": "Recebido. Obrigado pelo contato!"}), 201


def conferir_senha_admin(senha):
    esperada = os.environ.get("ADMIN_SENHA", "")
    if not esperada:
        return None
    return hmac.compare_digest(str(senha).encode("utf-8"), esperada.encode("utf-8"))


@app.post("/api/admin/comentarios")
def listar_comentarios():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados em JSON."}), 400

    resultado = conferir_senha_admin(dados.get("senha", ""))
    if resultado is None:
        return jsonify({"erro": "Área restrita desativada neste servidor."}), 503
    if not resultado:
        time.sleep(1)
        return jsonify({"erro": "Senha incorreta."}), 401

    consulta = "SELECT * FROM comentarios ORDER BY id DESC"
    try:
        conexao = criar_conexao()
        try:
            with conexao.cursor() as cursor:
                cursor.execute(consulta)
                colunas = [coluna[0] for coluna in cursor.description]
                registros = cursor.fetchall()
        finally:
            conexao.close()
    except Exception:
        app.logger.exception("Erro ao consultar os comentários")
        return jsonify({"erro": "Não foi possível consultar o banco agora."}), 503

    linhas = [
        [valor.strftime("%Y-%m-%d %H:%M:%S") if isinstance(valor, datetime) else valor for valor in registro]
        for registro in registros
    ]
    return jsonify({"consulta": consulta, "colunas": colunas, "linhas": linhas})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=os.environ.get("FLASK_DEBUG") == "1")

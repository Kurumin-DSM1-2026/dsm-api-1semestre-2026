import hmac
import os
import re
import time
from datetime import datetime

from flask import Flask, jsonify, request, send_from_directory

PASTA_FRONT = os.path.abspath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend")
)

app = Flask(__name__, static_folder=PASTA_FRONT, static_url_path="")

TIPOS_VALIDOS = {"pergunta", "sugestao", "critica"}
REGEX_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


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
    try:
        conexao = criar_conexao()
        try:
            with conexao.cursor() as cursor:
                cursor.execute("SELECT 1")
        finally:
            conexao.close()
    except Exception:
        return jsonify({"status": "erro", "banco": "indisponivel"}), 503
    return jsonify({"status": "ok", "banco": "ok"})


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

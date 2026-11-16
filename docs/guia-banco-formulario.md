# Banco de dados e formulário de contato

O formulário da página `contato.html` envia pergunta, sugestão ou crítica para o Flask, que grava na tabela `comentarios` do MySQL. O banco é usado só para isso. Os dados dos gráficos vêm dos arquivos JSON gerados no Colab.

## Arquivos

| Arquivo | Para que serve |
| :--- | :--- |
| `backend/app/app.py` | Servidor Flask. Serve o site, recebe o formulário e confere o banco |
| `backend/app/schema.sql` | Cria o banco `credito_inclusivo` e a tabela `comentarios` |
| `backend/app/requirements.txt` | Bibliotecas do Python |
| `backend/app/Dockerfile` | Imagem do servidor Flask |
| `docker-compose.yml` | Sobe o MySQL e o Flask juntos |
| `.env.example` | Modelo das senhas do banco |
| `frontend/contato.html` e `frontend/js/contato.js` | Página e script do formulário |
| `frontend/admin.html` e `frontend/js/admin.js` | Página protegida por senha que mostra os comentários gravados |

## Montar com Docker

Precisa de Docker e Docker Compose instalados.

1. Copie o modelo das senhas:

   ```
   cp .env.example .env
   ```

2. Abra o `.env` e troque as senhas (`DB_ROOT_PASSWORD`, `DB_PASSWORD` e `ADMIN_SENHA`). Para gerar uma senha forte:

   ```
   openssl rand -hex 16
   ```

   O `.env` não vai para o GitHub (está no `.gitignore`).

3. Suba o banco e o site:

   ```
   docker compose up --build -d
   ```

   Na primeira vez demora alguns minutos por causa dos downloads.

4. Confira se o site fala com o banco:

   ```
   curl http://localhost:5000/api/saude
   ```

   Resposta esperada: `{"banco":"ok","status":"ok"}`

5. Abra `http://localhost:5000/contato.html`, preencha e envie. Deve aparecer o aviso verde de recebido.

6. Veja o que foi gravado:

   ```
   docker compose exec banco sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id, nome, email, tipo, mensagem, criado_em FROM comentarios ORDER BY id DESC;"'
   ```

7. Para parar:

   ```
   docker compose down
   ```

   Os comentários continuam guardados. Para parar e apagar o banco junto, use `docker compose down -v`.

A hora de `criado_em` fica em UTC, 3 horas à frente do horário de Brasília.

## Ver os comentários pelo site

Abra `http://localhost:5000/admin.html`, digite a senha definida em `ADMIN_SENHA` no `.env` e clique em Consultar. A página mostra o resultado de `SELECT * FROM comentarios ORDER BY id DESC`.

A senha fica só no `.env` do servidor, nunca no código. Se `ADMIN_SENHA` estiver vazia, a consulta fica desativada. Os comentários têm nome e e-mail de pessoas, então use uma senha forte quando o site estiver na AWS. Sem HTTPS, a senha viaja sem criptografia.

## Montar com MySQL instalado no servidor (sem Docker)

1. Crie o banco e a tabela:

   ```
   sudo mysql < backend/app/schema.sql
   ```

2. Crie o usuário do site, só com as permissões necessárias:

   ```
   sudo mysql -e "CREATE USER 'site'@'localhost' IDENTIFIED BY 'SENHA_AQUI'; GRANT SELECT, INSERT ON credito_inclusivo.comentarios TO 'site'@'localhost'; FLUSH PRIVILEGES;"
   ```

3. Instale as bibliotecas:

   ```
   pip install -r backend/app/requirements.txt
   ```

4. Defina as variáveis e rode:

   ```
   export DB_HOST=localhost DB_NAME=credito_inclusivo DB_USER=site DB_PASSWORD=SENHA_AQUI ADMIN_SENHA=SENHA_ADMIN_AQUI
   cd backend/app && gunicorn --bind 0.0.0.0:5000 app:app
   ```

## Tabela `comentarios`

| Coluna | Tipo | Observação |
| :--- | :--- | :--- |
| `id` | INT, chave primária | Automático |
| `nome` | VARCHAR(100) | |
| `email` | VARCHAR(150) | |
| `tipo` | ENUM | `pergunta`, `sugestao` ou `critica` |
| `mensagem` | TEXT | |
| `criado_em` | TIMESTAMP | Preenchido na gravação |

## Rotas do Flask

| Rota | O que faz |
| :--- | :--- |
| `GET /` | Abre o `index.html` |
| `GET /api/saude` | Responde `ok` se o banco estiver acessível, ou erro 503 se não |
| `POST /api/contato` | Recebe o formulário em JSON e grava no banco |
| `POST /api/admin/comentarios` | Recebe `{"senha": "..."}` e devolve os comentários. Senha errada: 401. Sem `ADMIN_SENHA` no servidor: 503 |

Campos do `POST /api/contato`:

| Campo | Regra |
| :--- | :--- |
| `nome` | 2 a 100 caracteres |
| `email` | Formato de e-mail, até 150 caracteres |
| `tipo` | `pergunta`, `sugestao` ou `critica` |
| `mensagem` | 5 a 2000 caracteres |
| `empresa` | Campo escondido na página. Se vier preenchido é robô e nada é gravado |

Dados inválidos voltam com erro 400 e a lista dos campos errados. Se o banco estiver fora do ar, volta erro 503.

## Problemas comuns

**`Access denied` depois de mudar a senha no `.env`.** O MySQL só lê a senha quando cria o banco pela primeira vez. Para valer a senha nova, apague o banco e suba de novo (isso apaga os comentários):

```
docker compose down -v
docker compose up --build -d
```

**A porta 5000 já está em uso.** Pare o programa que está usando, ou troque `"5000:5000"` no `docker-compose.yml` por `"5001:5000"` e abra a página em `localhost:5001`.

**`/api/saude` responde erro.** Veja o que o banco e o site escreveram:

```
docker compose logs banco
docker compose logs site
```

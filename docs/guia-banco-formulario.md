# Banco de dados e formulário de contato

O formulário da página `contato.html` envia pergunta, sugestão ou crítica para o Flask, que grava na tabela `comentarios` do MySQL. O banco é usado só para isso. Os dados dos gráficos vêm dos arquivos JSON gerados no Colab, que o mesmo Flask entrega pelas rotas `/api/...`.

Há **um Flask só** (`backend/app/app.py`): ele entrega o site, os dados do Colab e o formulário.

## Como as partes se encaixam

```
Navegador  ->  Flask (porta 5000)  ->  MySQL (porta 3306)
 (página)      (roda direto na          (roda num contêiner
                máquina, em Python)      Docker, na mesma máquina)
```

- O **Flask** é o site. Ele roda direto na máquina, com Python e gunicorn. Entrega as páginas, os dados do Colab e recebe o formulário.
- O **MySQL** é outro programa, só do banco. Ele roda num **contêiner** do Docker (um programa isolado com tudo que precisa). O Flask se conecta a ele com a biblioteca PyMySQL, usando o usuário e a senha do `.env`.
- A porta 3306 do banco só aceita conexões de dentro da própria máquina. Na AWS, só a porta 5000 (o Flask) fica aberta para fora.

## Arquivos

| Arquivo | Para que serve |
| :--- | :--- |
| `backend/app/app.py` | Servidor Flask. Serve o site, os dados do Colab, o formulário e confere o banco |
| `backend/app/schema.sql` | Cria o banco `credito_inclusivo` e a tabela `comentarios` |
| `backend/app/requirements.txt` | Bibliotecas do Python |
| `docker-compose.yml` | Sobe o MySQL no Docker |
| `.env.example` | Modelo das senhas. Copie para `.env` |
| `frontend/contato.html` e `frontend/js/contato.js` | Página e script do formulário |
| `frontend/admin.html` e `frontend/js/admin.js` | Página protegida por senha que mostra os comentários gravados |

## Parte 1. Preparar a máquina na AWS

Este guia usa uma máquina EC2 com **Ubuntu 26.04**.

### 1.1. Liberar a porta do site

No painel da AWS: EC2, escolha a máquina, aba **Security**, clique no **Security Group**, depois **Edit inbound rules**. Deixe estas regras:

| Tipo | Porta | Origem | Para que serve |
| :--- | :--- | :--- | :--- |
| SSH | 22 | Seu IP | Entrar na máquina |
| TCP personalizado | 5000 | 0.0.0.0/0 | Acessar o site |

**Não abra a porta 3306.** O banco só precisa ser acessado de dentro da máquina.

### 1.2. Reservar um IP fixo (IP elástico)

Sem isso, o IP público da máquina muda toda vez que ela for parada e ligada de novo, e o endereço do site muda junto. O IP elástico é um IP que fica reservado para você.

1. No painel da AWS, em EC2, no menu da esquerda, abra **Elastic IPs**.
2. Clique em **Allocate Elastic IP address** e depois em **Allocate**.
3. Marque o IP que apareceu, clique em **Actions** e em **Associate Elastic IP address**.
4. Em **Instance**, escolha a máquina e clique em **Associate**.

Daqui em diante use esse IP. Dois cuidados:

- A AWS cobra por um IP elástico que não está ligado a uma máquina em execução. Se não for mais usar, em **Actions** escolha **Release Elastic IP addresses**.
- No AWS Academy Learner Lab essa opção pode estar bloqueada. Se estiver, o IP muda a cada vez que a máquina for ligada: confira o IP novo no painel (campo **Public IPv4 address**) e use ele.

### 1.3. Entrar na máquina por SSH

Na pasta onde está o arquivo da chave (`.pem`), no computador de quem vai acessar a máquina:

```
chmod 400 chave.pem
ssh -i chave.pem ubuntu@IP-DA-EC2
```

Troque `chave.pem` pelo nome do seu arquivo e `IP-DA-EC2` pelo IP público da máquina.

## Parte 2. Instalar os programas

Todos os comandos abaixo rodam na máquina da AWS, dentro da conexão SSH.

1. Instale Git, Python, Docker e Docker Compose:

   ```
   sudo apt update
   sudo apt install -y git python3 python3-venv python3-pip docker.io docker-compose-v2
   sudo systemctl enable --now docker
   ```

2. Dê ao seu usuário permissão de usar o Docker, para não precisar de `sudo` toda vez:

   ```
   sudo usermod -aG docker $USER
   ```

3. Reinicie a máquina, para a permissão valer:

   ```
   sudo reboot
   ```

   A conexão SSH vai cair. Espere cerca de 1 minuto e entre de novo com o mesmo comando `ssh` da Parte 1.3.

4. Confira que tudo foi instalado. Os quatro comandos devem mostrar um número de versão, e o último não deve pedir `sudo`:

   ```
   git --version
   python3 --version
   docker --version
   docker compose version
   ```

## Parte 3. Baixar o projeto e definir as senhas

1. Baixe o projeto e entre na pasta:

   ```
   git clone https://github.com/Kurumin-DSM1-2026/dsm-api-1semestre-2026.git
   cd dsm-api-1semestre-2026
   ```

2. Copie o modelo das senhas:

   ```
   cp .env.example .env
   ```

3. Abra o `.env` para editar:

   ```
   nano .env
   ```

   Troque as três senhas. Cada uma tem um uso:

   | Variável | Para que serve |
   | :--- | :--- |
   | `DB_ROOT_PASSWORD` | Senha do administrador do MySQL. Só é usada para manutenção do banco |
   | `DB_PASSWORD` | Senha do usuário que o Flask usa para entrar no banco |
   | `ADMIN_SENHA` | Senha da página `/admin.html`, que mostra os comentários |

   As outras (`DB_NAME` e `DB_USER`) podem ficar como estão.

   Quem estiver subindo o projeto escolhe as três senhas e depois passa para o grupo, para ficarem guardadas. Regras para não dar problema: pelo menos 12 caracteres, só letras e números, e sem espaços, aspas, `$` ou `#`. Para salvar no `nano`: `Ctrl+O`, `Enter`, e para sair `Ctrl+X`.

   O `.env` não vai para o GitHub (está no `.gitignore`). Cada máquina tem o seu, e no servidor deve ter senhas novas, não as usadas em testes.

## Parte 4. Subir o banco (Docker)

1. Suba o MySQL:

   ```
   docker compose up -d
   ```

   Na primeira vez demora alguns minutos por causa dos downloads. O `-d` deixa rodando em segundo plano. O banco e a tabela `comentarios` são criados sozinhos, a partir do `schema.sql`.

2. Confira que o contêiner está no ar:

   ```
   docker compose ps
   ```

   O `banco` deve aparecer como `running`, e depois de alguns segundos como `healthy`.

O banco já usa o horário de Brasília (UTC-3), então a hora que aparece em `criado_em` é a de Brasília.

## Parte 5. Subir o site (Flask)

1. Crie o ambiente do Python e instale as bibliotecas, ainda na pasta principal do projeto:

   ```
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/app/requirements.txt
   ```

2. Entre na pasta do Flask e rode o site:

   ```
   cd backend/app
   python app.py
   ```

   O terminal fica ocupado com o site rodando. Para parar, `Ctrl+C`.

Quem só mexe no dashboard e não precisa do formulário pode pular a Parte 4: o site e os dados funcionam sem o banco, só o formulário responde erro.

## Parte 6. Testar

Com o site rodando, abra um **segundo terminal** (na AWS, outra conexão SSH) e rode:

```
curl http://localhost:5000/api/saude
```

Resposta esperada: `{"banco":"ok","status":"ok"}`. Se vier `"banco":"indisponivel"`, o site está no ar mas não alcança o banco: veja "Problemas comuns".

Depois, no navegador, troque `IP-DA-EC2` pelo IP público da máquina:

1. `http://IP-DA-EC2:5000/` mostra o dashboard.
2. `http://IP-DA-EC2:5000/institucional.html` mostra a página institucional.
3. `http://IP-DA-EC2:5000/contato.html`: preencha e envie. Deve aparecer o aviso verde de recebido.
4. `http://IP-DA-EC2:5000/admin.html`: digite a senha `ADMIN_SENHA` e consulte. O comentário que você enviou deve aparecer.

## Parte 7. Deixar o site ligado sozinho

Até aqui o site para quando você fecha o terminal. Para ele ficar ligado e voltar sozinho se a máquina reiniciar, crie um serviço. Os caminhos abaixo supõem o usuário `ubuntu` e o projeto em `/home/ubuntu/dsm-api-1semestre-2026`. Se for diferente, ajuste.

1. Pare o `python app.py` com `Ctrl+C` e crie o arquivo do serviço:

   ```
   sudo nano /etc/systemd/system/credito-facil.service
   ```

2. Cole este conteúdo e salve:

   ```
   [Unit]
   Description=Credito Facil (Flask)
   After=network.target docker.service

   [Service]
   User=ubuntu
   WorkingDirectory=/home/ubuntu/dsm-api-1semestre-2026/backend/app
   ExecStart=/home/ubuntu/dsm-api-1semestre-2026/.venv/bin/gunicorn --bind 0.0.0.0:5000 app:app
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

3. Ligue o serviço:

   ```
   sudo systemctl daemon-reload
   sudo systemctl enable --now credito-facil
   ```

4. Confira que está rodando e repita os testes da Parte 6:

   ```
   sudo systemctl status credito-facil
   ```

   Deve aparecer `active (running)`. Para ver os erros: `sudo journalctl -u credito-facil -n 50`.

O banco (Docker) também volta sozinho quando a máquina reinicia.

## Ver os comentários pelo site

Abra `/admin.html` (por exemplo `http://IP-DA-EC2:5000/admin.html`), digite a senha definida em `ADMIN_SENHA` no `.env` e clique em Consultar. A página mostra o resultado de `SELECT * FROM comentarios ORDER BY id DESC`. Na página inicial há um cadeado discreto no menu que leva até ela.

A senha fica só no `.env` do servidor, nunca no código. Se `ADMIN_SENHA` estiver vazia, a consulta fica desativada. Os comentários têm nome e e-mail de pessoas, então use uma senha forte na AWS. Sem HTTPS, a senha viaja sem criptografia.

Para ver direto no banco, sem o site:

```
docker compose exec banco sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SELECT id, nome, email, tipo, mensagem, criado_em FROM comentarios ORDER BY id DESC;"'
```

## Guardar uma cópia dos comentários

Para salvar os comentários em um arquivo `backup.sql`:

```
docker compose exec banco sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' > backup.sql
```

Para colocar de volta em um banco novo e vazio:

```
docker compose exec -T banco sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' < backup.sql
```

## Tabela `comentarios`

| Coluna | Tipo | Observação |
| :--- | :--- | :--- |
| `id` | INT, chave primária | Automático |
| `nome` | VARCHAR(100) | |
| `email` | VARCHAR(150) | |
| `tipo` | ENUM | `pergunta`, `sugestao` ou `critica` |
| `mensagem` | TEXT | |
| `criado_em` | TIMESTAMP | Preenchido na gravação, no horário de Brasília |

## Rotas do Flask

| Rota | O que faz |
| :--- | :--- |
| `GET /` | Abre o `index.html` |
| `GET /api/saude` | Sempre responde `"status":"ok"` se o site está de pé, e mostra `"banco":"ok"` ou `"banco":"indisponivel"` |
| `GET /api/scr`, `/api/ibge` | Dados do SCR e do IBGE. Aceitam `?uf=SP` (sigla ou nome). UF que não existe: 404 |
| `GET /api/apostas`, `/api/juros`, `/api/inadimplencia`, `/api/dividas` | Os outros JSONs do Colab, lidos de `frontend/js/Dados do Colab/` |
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

**`/api/saude` mostra `"banco":"indisponivel"`.** O site não alcançou o banco. Confira se o contêiner está `healthy` com `docker compose ps`, veja o que ele escreveu com `docker compose logs banco`, e confira se o `DB_PASSWORD` do `.env` é o mesmo da criação do banco (próximo item).

**`Access denied` depois de mudar a senha no `.env`.** O MySQL só lê a senha quando cria o banco pela primeira vez. Para valer a senha nova, apague o banco e suba de novo (isso apaga os comentários):

```
docker compose down -v
docker compose up -d
```

**A porta 5000 já está em uso.** Outro programa (ou um `python app.py` esquecido) está usando. Pare ele, ou veja qual é com `sudo lsof -i :5000`.

**`permission denied` ao rodar `docker`.** Seu usuário ainda não está no grupo `docker`, ou falta reiniciar. Rode `sudo usermod -aG docker $USER`, depois `sudo reboot` e entre de novo.

**A página não abre pelo IP da EC2, mas o `curl` funciona dentro da máquina.** A porta 5000 não está liberada no Security Group (Parte 1.1).

**O IP da máquina mudou.** Sem IP elástico, o IP muda quando a máquina é parada e ligada. Pegue o IP novo no painel da AWS. O site e o banco voltam sozinhos; confirme com `docker compose ps` e `sudo systemctl status credito-facil`.

**O serviço não sobe.** Veja o erro com `sudo journalctl -u credito-facil -n 50`. Os motivos mais comuns são caminho errado no arquivo do serviço ou o `.venv` que não foi criado.

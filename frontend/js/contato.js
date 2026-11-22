"use strict";

const formContato = document.getElementById("formContato");
const botaoEnviar = document.getElementById("botaoEnviar");
const avisoContato = document.getElementById("avisoContato");

function mostrarAviso(texto, classe) {
    avisoContato.className = `mt-3 alert ${classe}`;
    avisoContato.textContent = texto;
}

formContato.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(formContato).entries());

    botaoEnviar.disabled = true;
    try {
        const resposta = await fetch("/api/contato", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });
        const corpo = await resposta.json();

        if (resposta.ok) {
            mostrarAviso(corpo.mensagem, "alert-success");
            formContato.reset();
        } else if (corpo.campos) {
            mostrarAviso(Object.values(corpo.campos).join(" "), "alert-warning");
        } else {
            mostrarAviso(corpo.erro || "Erro ao enviar.", "alert-danger");
        }
    } catch (erro) {
        mostrarAviso("Não foi possível falar com o servidor.", "alert-danger");
    } finally {
        botaoEnviar.disabled = false;
    }
});

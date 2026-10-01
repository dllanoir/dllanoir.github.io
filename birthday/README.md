# Bethânia — 04.10.2026

Experiência de aniversário em uma rota separada do site atual.

## Estrutura

```text
/
├─ index.html
├─ styles.css
├─ script.js
├─ assets/
└─ birthday/
   ├─ index.html
   ├─ styles.css
   ├─ script.js
   ├─ trilha.mp3
   └─ README.md
```

A experiência de `birthday/index.html` inclui a trilha sonora em segundo plano (`trilha.mp3`) acionada diretamente pelo botão no cabeçalho e reutiliza os assets visuais via `../assets/...`.

## Publicação

Copie a pasta `birthday/` para a raiz do repositório `dllanoir.github.io` e faça o commit.

URL esperada:

```text
https://dllanoir.github.io/birthday/
```

Não é necessário build nem npm.

## Dependências externas

- Google Fonts: Fraunces + DM Sans
- Lenis via CDN
- GSAP + ScrollTrigger via CDN

A narrativa continua utilizável sem JavaScript; as animações e alguns recursos interativos são aprimoramentos.

## Contagem Regressiva e Desbloqueio Automático (04.10.2026)

A página possui controle automático de data para proteger a surpresa:

- **Antes de 04.10.2026 00:00:00 (Horário de Brasília):** A página exibe exclusivamente a tela de **Contagem Regressiva** com a mesma estética visual (tipografia, cores escuras, iluminação suave, silhueta da rosa e botão de trilha sonora funcional). As memórias, fotos e cartas ficam ocultas para preservar a surpresa.
- **Assim que virar o dia 04.10.2026 (ou quando o cronômetro zerar):** O contador transiciona automaticamente para o momento de celebração com o botão *"Entrar na experiência"*, liberando todo o percurso interativo e carregando as animações GSAP e o scroll suave Lenis.
- **Parâmetros de teste na URL:**
  - `?preview=birthday` ou `?unlock=true`: Força o desbloqueio imediato da experiência completa para testes antes do dia.
  - `?preview=countdown`: Força a visualização da tela de contagem regressiva.
  - `?simulatedTime=2026-10-03T23:59:55-03:00`: Simula os últimos 5 segundos antes da meia-noite para testar a transição ao vivo.

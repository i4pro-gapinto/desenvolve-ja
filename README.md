# Gerador de Procedures SQL — Desenvolve Já

Este repositório contém uma ferramenta full-stack (backend em Node.js/Express e frontend em React) para gerar artefatos a partir de declarações CREATE TABLE. A ideia é facilitar a criação de rotinas SQL e arquivos auxiliares (procedures de consulta, insert/update, delete, layout de importação em Excel, arquivos JSON para chamadas de API, e um ZIP com todos os arquivos gerados) a partir de um único CREATE TABLE ou de múltiplos CREATE TABLEs dentro de arquivos `.sql`.

O projeto foi desenvolvido para ser simples de usar e fácil de estender com templates próprios da empresa.

## Visão Geral

- Backend (pasta `api/`): recebe uploads multipart (arquivos `.sql`), ou um payload JSON (com um texto `CREATE TABLE`), analisa os CREATE TABLEs, gera arquivos SQL e `.xlsx` (layout de importação), e fornece um ZIP com todos os artefatos. Utiliza `multer` para upload em memória, `ExcelJS` para gerar .xlsx e `archiver` para compactar os arquivos.

- Frontend (pasta `app/`): aplicação React simples que permite enviar múltiplos arquivos `.sql`, escolher quais artefatos gerar e baixar os resultados individualmente ou em um ZIP.

## Recursos principais

- Parse de arquivos `.sql` contendo múltiplos `CREATE TABLE` (o parser aceita mais de uma tabela por arquivo).
- Geração de:
  - Procedure de consulta (SELECT) — template configurável em `api/examples`.
  - Procedure de insert/update — template configurável.
  - Procedure de delete — template configurável.
  - Layout de importação em Excel (`.xlsx`) com cabeçalho e linha de exemplos.
  - JSON de exemplo para chamadas de API.
- Geração de ZIP contendo todos os arquivos produzidos e links para download individuais.
- Resposta JSON com resumo (lista de arquivos gerados, erros por arquivo, relatórios por arquivo) quando requisitado com `?json=1` ou com o header `Accept: application/json`.
- Robustez: agrega erros por arquivo sem abortar o processamento do lote.

## Estrutura do repositório

- `api/` — backend Node/Express
  - `index.js` — ponto de entrada do servidor
  - `package.json` — dependências do backend
  - `src/`
    - `parser.js` — lógica para extrair colunas, chaves primárias e estrangeiras de CREATE TABLE
    - `scriptGenerator.js` — gera os scripts a partir de metadados da tabela e templates
    - `excelGenerator.js` — gera o `.xlsx` de layout de importação
    - `fileUtils.js` — utilitários de leitura de templates e gerenciamento de diretórios gerados
    - `routes.js` — rota principal `/generate` que processa uploads e devolve JSON ou ZIP
  - `examples/` — templates de procedures e SQL de exemplo
  - `generated/` — arquivos gerados temporariamente (limpeza pelo servidor)

- `app/` — frontend React
  - `src/` — fontes do React
    - `App.js` — lógica principal de upload, geração e download
    - `components/` — componentes UI (`FormInput.js`, `FilesTable.js`, `OptionsCheckbox.js`)
  - `package.json` — dependências do frontend

- `test_samples/` — amostras de tabelas válidas/inválidas e opções
- `test_scripts/` — scripts de teste (ex.: PowerShell) que exemplificam envio e validação

## Como rodar (desenvolvimento)

Pré-requisitos:
- Node.js (versão 16+ recomendada)
- npm

Passos:

1. Abra um terminal no diretório raiz do projeto.
2. Instale dependências se ainda não instalou (backend e frontend):

```powershell
cd "c:\Projetos Curso\desenvolve-ja\api"
npm install
cd "..\app"
npm install
```

3. Para rodar backend + frontend simultaneamente (script `dev` já configurado):

```powershell
cd "c:\Projetos Curso\desenvolve-ja"
npm run dev
```

- O backend abrirá em `http://localhost:3001`.
- O frontend abrirá em `http://localhost:3000`.

Observações:
- Se preferir rodar apenas o backend, execute `cd api && node index.js`.
- O backend aceita uploads multipart no endpoint `POST /generate` (campo `files` para cada arquivo) e aceita também JSON com `{ createTable, options }` para gerar a resposta por texto.

## API / Endpoints

- POST /generate
  - Formato multipart (recomendado para múltiplos arquivos):
    - campos:
      - `files` — (vários) arquivos `.sql` que contenham um ou mais `CREATE TABLE` cada
      - `options` — string JSON com as opções desejadas (ex.: `{ "consulta": true, "insert_update": true, "delete": true, "layout_importacao": true }`)
      - opcionalmente `createTable` — string com CREATE TABLE (o frontend atual removeu o envio por texto da UI, mas o endpoint ainda aceita)
    - header/param:
      - Para obter resumo JSON em vez do ZIP, use `?json=1` ou `Accept: application/json`.
    - Resposta (JSON):
      - `files`: lista de arquivos gerados ({ name, url, size })
      - `errors`: lista de erros por arquivo ({ file, table?, message })
      - `perFileReports`: relatório detalhado por arquivo (tabelas geradas, erros por tabela)
      - `zipName`: nome do arquivo ZIP gerado (às vezes retornado quando aplicável)
    - Resposta (binária): se você fizer o POST sem `?json=1`, o servidor retornará um `application/zip` com o ZIP contendo todos os arquivos gerados.

## Como usar (exemplo rápido)

- Pelo frontend: selecione um ou mais arquivos `.sql` contendo `CREATE TABLE`, marque as opções desejadas e clique em "Gerar Scripts". Depois use o botão "Baixar todos (.zip)" para baixar o ZIP com os artefatos.

## Exemplo de templates

Os templates estão em `api/examples/`. Eles contêm placeholders (ex.: `--NOME_TABELA--`, `--COLUNAS--`) que o `scriptGenerator` substitui com os metadados extraídos pelo `parser`.

Adapte esses templates para corresponder ao padrão de templates da sua empresa.

## Tratamento de erros

- O servidor agrega erros por arquivo e continua processando outros arquivos do lote.
- A resposta JSON (`perFileReports`) contém, para cada arquivo enviado, as tabelas detectadas, os arquivos gerados e quaisquer erros por tabela.
- Mensagens de erro comuns podem incluir ausência de CREATE TABLE no arquivo, sintaxe inválida, ou colunas sem tipo reconhecido.

## Boas práticas e limitações

- O parser é baseado em regras/regex e cobre os padrões de CREATE TABLE mais comuns; para DDLs muito complexas ou dialectos muito diferentes pode ser necessário ajustar o `parser.js`.
- Limites de upload e segurança: o backend usa `multer` em memória e tem limites configuráveis (número máximo de arquivos e tamanho). Ajuste esses limites conforme a necessidade de produção.
- Os arquivos gerados são colocados em `api/generated/` temporariamente — o servidor faz limpeza, mas em ambiente de produção recomendo usar armazenamento temporário seguro ou um bucket (S3, Azure Blob) com ciclo de vida configurado.

## Desenvolvimento e contribuição

- Se quiser adicionar novos templates: crie um arquivo em `api/examples/` e modifique `scriptGenerator.js` para reconhecer o novo template/artefato.
- Para ajustar o parser: edite `api/src/parser.js` (cuidado: mudanças no parser impactam todos os templates que consomem metadados).
- Pull requests: siga as práticas normais (fork -> branch -> PR). Inclua exemplos de `CREATE TABLE` para testar os novos templates.

## Próximos passos sugeridos

- Remover definitivamente o fluxo de envio por texto do frontend (limpar estados remanescentes), se desejar simplificar a UI para apenas upload de arquivos.
- Adicionar testes automatizados que validem:
  - parsing de diferentes variações de CREATE TABLE
  - geração dos arquivos e conteúdo esperado (pegar o ZIP e inspecionar)
- Melhorar o pipeline de geração para suportar templates baseados em Handlebars/EJS para maior flexibilidade.

## Contato / autoria

Projeto inicial e manutenção por i4pro-gapinto.
Diga qual dos itens prefere que eu faça em seguida e eu executo.


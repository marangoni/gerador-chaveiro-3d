# Gerador de Chaveiros 3D — NuRIA Maker

Versão `v0.3.1`.


## Ajustes da v0.3.1

- corrigido o layout da biblioteca quando **Todos** exibe muitos modelos;
- os cards agora mantêm sua altura natural e a grade usa rolagem vertical;
- miniaturas recoloridas para a identidade NuRIA:
  - vinho/marrom `#531C33`;
  - laranja `#E17D01`;
- os SVGs originais continuam em vermelho/azul internamente, preservando a convenção técnica usada pelo gerador.

## Biblioteca de exemplos

A versão 0.3 adiciona uma biblioteca integrada com **30 modelos**.

Distribuição inicial:

- 8 nomes;
- 10 emojis e símbolos afetivos;
- 6 ícones Maker;
- 6 personagens originais.

Os exemplos são arquivos SVG reais armazenados em `biblioteca/` e descritos
por `biblioteca/biblioteca.json`.

## Como funciona

```text
Biblioteca
→ filtro / busca
→ selecionar modelo
→ carregar SVG
→ prévia 3D
→ ajustar dimensões
→ relevo ou vazado
→ gerar STL
```

O botão **Biblioteca** abre uma galeria com:

- miniatura do próprio SVG;
- nome;
- categoria;
- tags;
- campo de busca;
- filtros de categoria;
- botão **Usar este modelo**.

## Estrutura

```text
gerador-chaveiro-3d-v0.3.0/
├── index.html
├── style.css
├── script.js
├── README.md
├── exemplos/
│   └── chaveiro-david.svg
└── biblioteca/
    ├── biblioteca.json
    ├── nomes/
    ├── emojis/
    ├── maker/
    └── personagens/
```

## Compatibilidade

Todos os modelos da biblioteca foram criados com a convenção:

- vermelho: base do chaveiro;
- azul: desenho interno;
- sem elementos `<text>` nos exemplos de nomes;
- nomes já convertidos para paths.

Isso permite usar os exemplos tanto em alto-relevo quanto, quando adequado,
como recortes passantes.

## Valores padrão

- espessura da base: **1,5 mm**;
- relevo: **0,5 mm**;
- largura: **60 mm**.

O ajuste de largura atua apenas em X e Y. O eixo Z não é redimensionado.

## Teste local

```bash
cd gerador-chaveiro-3d-v0.3.0
python3 -m http.server 8006 > servidor.log 2>&1 &
```

Abra:

```text
http://localhost:8006
```

## Teste recomendado

1. Clique em **Biblioteca**.
2. Teste a busca por `Maria`.
3. Carregue um nome.
4. Volte à biblioteca e filtre **Emojis**.
5. Carregue `Coração`.
6. Marque/desmarque **Letras furadas**.
7. Gere o STL de um dos modelos.

## Observação sobre personagens conhecidos

A biblioteca inicial usa personagens originais e ícones genéricos. Isso mantém
o repositório público independente de artes protegidas por terceiros.
Arquivos de personagens externos continuam podendo ser carregados manualmente
quando forem compatíveis com o gerador.

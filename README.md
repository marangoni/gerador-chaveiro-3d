# Gerador de Chaveiros 3D — NuRIA Maker

Versão `v0.2.1`.


## Ajustes da v0.2.1

- espessura padrão da base: **1,5 mm**;
- altura padrão do relevo: **0,5 mm**;
- o controle **Largura final** altera somente X e Y;
- a proporção no plano XY é preservada;
- a espessura da base e a altura do relevo no eixo Z não são escaladas;
- a escala XY é aplicada diretamente às geometrias antes da exportação STL.

## Novidade principal

Foi adicionada a opção **Letras furadas**.

Quando o check-button está desmarcado:

```text
AZUL → alto-relevo
```

Quando está marcado:

```text
AZUL → furo passante pela base
```

O recorte é realizado em 2D antes da extrusão da base, usando operação booleana de polígonos. Assim, a prévia Three.js e o STL continuam derivados da mesma geometria.

## Convenção de cores

- vermelho `#ff0000`: geometria da base e furos estruturais;
- azul `#0000ff`: letras/detalhes, podendo ser relevo ou furo passante;
- preto `#000000`: detalhes preenchidos em relevo.

## SVG real de referência

O projeto inclui:

```text
exemplos/chaveiro-david.svg
```

Esse arquivo foi usado como caso de referência para a opção de letras furadas.

No SVG fornecido:

- `corte-chaveiro` está em vermelho;
- `furo-chaveiro` está em vermelho;
- `letras-chaveiro` está em azul;
- o nome do autor é um elemento SVG `<text>` azul.

### Limitação atual

Elementos SVG `<text>` ainda não são convertidos em geometria. Portanto, o pequeno texto de autoria do SVG de referência não entra no STL. Para ser convertido, o texto precisa estar transformado em `path`.

## Teste local

```bash
cd gerador-chaveiro-3d-v0.2.0
python3 -m http.server 8006 > servidor.log 2>&1 &
```

Abra:

```text
http://localhost:8006
```

## Teste recomendado

1. Carregue `exemplos/chaveiro-david.svg`.
2. Confira o chaveiro com **Letras furadas** desmarcado.
3. Marque **Letras furadas**.
4. Confira se DAVID passa a atravessar toda a espessura da base.
5. Gere o STL.
6. Abra no fatiador e inspecione os furos.

## Dependências carregadas via CDN

- Three.js;
- SVGLoader;
- STLExporter;
- `polygon-clipping` para a diferença booleana 2D.

## Próximos passos possíveis

- baixo-relevo;
- controle independente entre azul e preto;
- transformar linhas abertas em traços 3D;
- converter `<text>` em geometria;
- STL separado por cor/material.

# Gerador de Chaveiros 3D — NuRIA Maker

Versão inicial do conversor de SVGs de chaveiros para modelos 3D.

## Versão

`v0.1.0`

## Repositório sugerido

```text
gerador-chaveiro-3d
```

GitHub Pages esperado:

```text
https://marangoni.github.io/gerador-chaveiro-3d/
```

## Objetivo da v0.1

Validar o fluxo:

```text
SVG
→ leitura por cor
→ interpretação dos contornos
→ prévia Three.js
→ extrusão 3D
→ geração STL
```

Nesta versão, o STL é exportado diretamente a partir da mesma geometria usada na prévia. Isso elimina diferenças entre a visualização e a exportação durante a validação inicial do projeto.

## Convenção de cores

O gerador aproveita a convenção já utilizada nas ferramentas de corte a laser:

- vermelho `#ff0000`: contorno da base;
- azul `#0000ff`: detalhe;
- preto `#000000`: detalhe preenchido.

Na `v0.1.0`:

- o vermelho é extrudado como base;
- azul e preto podem ser extrudados em alto-relevo;
- detalhes podem ser ignorados;
- linhas abertas ainda não são convertidas em relevo sólido.

## Recursos

- carregamento de SVG local;
- exemplo integrado para teste;
- detecção automática de vermelho, azul e preto;
- preservação de furos quando os contornos são fechados;
- largura final ajustável;
- espessura da base ajustável;
- alto-relevo ajustável;
- prévia Three.js instantânea;
- exportação STL;
- invalidação automática do STL quando um parâmetro é alterado.

## Teste local

```bash
cd gerador-chaveiro-3d-v0.1.0
python3 -m http.server 8006 > servidor.log 2>&1 &
```

Abra:

```text
http://localhost:8006
```

## Primeiro teste recomendado

1. Clique em **Carregar exemplo**.
2. Confirme que o chaveiro aparece sobre a grade.
3. Altere a largura de 60 para 70 mm.
4. Altere a espessura de 3 para 4 mm.
5. Clique em **Gerar STL**.
6. Baixe o STL.
7. Abra no fatiador.

Depois deste teste, carregue um SVG real produzido por um dos geradores de chaveiros do laboratório.

## Próximas versões planejadas

### v0.2
- suporte a linhas abertas azuis como relevo;
- melhor diagnóstico de SVG;
- controle separado para azul e preto.

### v0.3
- baixo-relevo;
- gravação/rebaixo real;
- operações booleanas.

### v0.4
- geração em duas peças/STLs para impressão em duas cores.

### v0.5
- integração direta com os geradores de chaveiros existentes.

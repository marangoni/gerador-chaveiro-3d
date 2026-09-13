# Gerador de Chaveiros 3D — NuRIA Maker

Versão `v0.5.4`.

## Exemplos

Na interface, o nome **Biblioteca** foi substituído por **Exemplos**.

Os modelos continuam organizados em:

```text
Todos | Nomes | Emojis
```

## Criar um chaveiro com o próprio nome

Foi adicionada uma integração direta com:

```text
https://marangoni.github.io/keychain-generator/
```

O fluxo para o estudante é:

```text
Criar meu nome
→ abrir o gerador de nomes
→ criar o chaveiro
→ baixar o SVG
→ voltar ao Gerador de Chaveiros 3D
→ Escolher SVG
→ gerar STL
```

O link aparece em dois locais:

- no painel principal, junto de `Escolher SVG` e `Exemplos`;
- dentro da janela de `Exemplos`.

O gerador de nomes abre em uma nova aba para que o aluno não perca o trabalho
atual no gerador 3D.

## Padrões atuais

```text
Nomes: 50 mm
Emojis: 40 mm
Base: 1,5 mm
Relevo: 0,5 mm
```

## Teste local

```bash
cd gerador-chaveiro-3d-v0.5.4
python3 -m http.server 8007 > servidor.log 2>&1 &
```

Teste:

1. confirme o botão `Exemplos`;
2. clique em `Criar meu nome`;
3. confirme que o gerador de nomes abre em nova aba;
4. baixe um SVG pelo gerador de nomes;
5. volte e carregue em `Escolher SVG`.

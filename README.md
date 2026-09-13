# Gerador de Chaveiros 3D — NuRIA Maker

Versão `v0.5.5`.

## Criar o próprio chaveiro

O gerador 3D agora oferece acesso direto aos dois geradores SVG do NuRIA:

### Chaveiros com nome

```text
https://marangoni.github.io/keychain-generator/
```

### Chaveiros com emoji

```text
https://marangoni.github.io/keychain-emoji-generator/
```

O fluxo para o estudante fica:

```text
Criar meu nome / Criar meu emoji
→ gerar o SVG
→ baixar o SVG
→ voltar ao Gerador de Chaveiros 3D
→ Escolher SVG
→ gerar STL
```

Os dois links aparecem:

- no painel principal;
- dentro da janela **Exemplos**.

Os geradores abrem em nova aba, preservando o trabalho atual no gerador 3D.

## Exemplos

A biblioteca continua enxuta e curada:

```text
Todos | Nomes | Emojis
```

## Padrões atuais

```text
Nomes: 50 mm
Emojis: 40 mm
Base: 1,5 mm
Relevo: 0,5 mm
```

## Teste local

```bash
cd gerador-chaveiro-3d-v0.5.5
python3 -m http.server 8007 > servidor.log 2>&1 &
```

Teste recomendado:

1. clique em **Criar meu nome**;
2. confirme abertura do gerador de nomes em nova aba;
3. clique em **Criar meu emoji**;
4. confirme abertura do gerador de emojis em nova aba;
5. gere um SVG em qualquer um deles e carregue em **Escolher SVG**.

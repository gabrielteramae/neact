# neact — um React escrito para ser lido

![JavaScript](https://img.shields.io/badge/JavaScript-ESM-F7DF1E?logo=javascript&logoColor=black)

`h`, `useState`, `useEffect` e um reconciliador que atualiza o DOM no lugar. O componente é uma função, os hooks ficam numa lista por instância, e a árvore nova se compara com a anterior.

Não é compatível com o React. Não tem fila de trabalho, contexto nem portal.

## O que o miolo faz

| Peça | Comportamento |
|---|---|
| `h(type, props, ...children)` | Monta o vnode. `children` achatado. `false`, `true` e `null` somem. `key` sai das props. |
| `useState(inicial)` | Tupla `[valor, set]`. `set` aceita valor ou função. Valor igual (`Object.is`) não redesenha. Fora do render, lança erro. |
| `useEffect(fn, deps)` | Roda depois do render, num microtask. Sem deps, ou com deps diferentes, limpa o efeito anterior se ele devolveu uma função. |
| `render(vnode, container)` | Monta ou faz patch. Devolve uma função que desmonta e roda os cleanups. |
| Reconciliação | Mesmo `type` atualiza no lugar. `key` reaproveita a instância. O resto desmonta e monta de novo. |

Texto é um vnode interno (`#text`): se o valor mudou, só o `nodeValue` troca. `className`, `value` de input/textarea e listeners `onClick` / `onInput` / `onSubmit` são aplicados à parte, para não recriar o nó.

## Stack

- **JavaScript** em módulo ES, um arquivo, zero dependências
- DOM direto, sem virtual DOM de biblioteca e sem bundler
- Hooks guardados na instância do componente, na ordem das chamadas

## Estrutura

```
src/
└── neact.js            # h, useState, useEffect, render, patch
examples/
└── index.html          # contador, campo e lista com key
```

## Como rodar

Módulo ES não abre em `file://`.

```bash
git clone https://github.com/gabrielteramae/neact.git
cd neact
python -m http.server
```

Abra `http://127.0.0.1:8000/examples/`. O botão incrementa um contador, o formulário acrescenta um item e “Remover” tira só aquele — a `key` é o `id`.

```js
import { h, render, useState } from "../src/neact.js";

function App() {
  const [count, setCount] = useState(0);
  return h("button", { type: "button", onClick: () => setCount((n) => n + 1) }, "contador " + count);
}

render(h(App), document.querySelector("#app"));
```

## O que não tem

Contexto, `useRef`, `useMemo`, portal, fragments nomeados, SVG com namespace, fila concorrente e suíte de testes no repositório. A verificação é o exemplo: contador, input controlado e lista com chave.

---

© 2026 Gabriel Teramae Chan

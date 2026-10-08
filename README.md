# neact

Um React pequeno, escrito para ser lido: `h`, `useState`, `useEffect` e um reconciliador que atualiza o DOM no lugar.

Não é compatível com o React. Não tem fila de trabalho, contexto nem portal. O ponto é o miolo: o componente é uma função, os hooks ficam numa lista, e a árvore nova se compara com a anterior.

## Exemplo

```bash
python -m http.server
```

Abra `examples/index.html` pelo servidor.

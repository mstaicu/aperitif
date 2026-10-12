# Accounts — legacy reference

`Accounts` is a legacy reference implementation. It remains runnable for
comparison and regression coverage, but must not receive new capabilities or new
Product dependencies. Use [`domains/identity`](../identity/README.md) for all
forward-looking work. Limit maintenance here to comparison, regression,
build, or security fixes.

```sh
make -C domains/accounts check
make -C domains/accounts up
make -C domains/accounts dev
make -C domains/accounts down
```

The local commands are retained to make existing behavior observable while the
reference remains in the repository. This does not make Accounts a supported
composition dependency.

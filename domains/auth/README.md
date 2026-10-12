# Auth — legacy reference

`Auth` is a legacy reference implementation. It remains runnable for comparison
and regression coverage, but must not receive new capabilities or new Product
dependencies. Use [`domains/identity`](../identity/README.md) for all
forward-looking work. Limit maintenance here to comparison, regression,
build, or security fixes.

```sh
make -C domains/auth check
make -C domains/auth up
make -C domains/auth dev
make -C domains/auth e2e
make -C domains/auth down
```

The local commands are retained to make existing behavior observable while the
reference remains in the repository. This does not make Auth a supported
composition dependency.

function names(pattern) {
  if (pattern.type === 'Identifier') {
    return [pattern.name];
  }

  if (pattern.type === 'RestElement') {
    return names(pattern.argument);
  }

  if (pattern.type === 'AssignmentPattern') {
    return names(pattern.left);
  }

  return (pattern.properties ?? pattern.elements ?? []).flatMap((entry) => {
    return entry ? names(entry.value ?? entry) : [];
  });
}

export default {
  meta: { name: 'emberfall-structure' },
  rules: {
    'one-public-unit': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          split:
            'Expose one runtime unit per implementation file; move {{names}} to their own files. Supporting types and re-exports are allowed.',
        },
      },
      create(context) {
        return {
          Program(program) {
            const imports = new Set();
            const types = new Set();
            const values = new Set();
            const exports = new Map();

            for (const statement of program.body) {
              if (statement.type === 'ImportDeclaration') {
                for (const specifier of statement.specifiers) {
                  imports.add(specifier.local.name);
                }
              }

              const declaration = statement.declaration ?? statement;

              if (declaration.type === 'VariableDeclaration') {
                for (const binding of declaration.declarations) {
                  for (const name of names(binding.id)) {
                    values.add(name);
                  }
                }
              } else if (
                ['FunctionDeclaration', 'ClassDeclaration', 'TSEnumDeclaration'].includes(
                  declaration.type,
                ) &&
                declaration.id
              ) {
                values.add(declaration.id.name);
              }

              if (['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'].includes(declaration.type)) {
                types.add(declaration.id.name);
              }

              if (statement.type === 'ExportDefaultDeclaration') {
                const name =
                  declaration.type === 'Identifier' ? declaration.name : declaration.id?.name;
                exports.set(name ?? 'default', statement);
              }

              if (
                statement.type !== 'ExportNamedDeclaration' ||
                statement.source ||
                statement.exportKind === 'type'
              ) {
                continue;
              }

              if (declaration.type === 'VariableDeclaration') {
                for (const binding of declaration.declarations) {
                  for (const name of names(binding.id)) {
                    exports.set(name, statement);
                  }
                }
              } else if (
                ['FunctionDeclaration', 'ClassDeclaration', 'TSEnumDeclaration'].includes(
                  declaration.type,
                )
              ) {
                exports.set(declaration.id.name, statement);
              }

              for (const specifier of statement.specifiers ?? []) {
                if (specifier.exportKind !== 'type') {
                  exports.set(specifier.local.name, statement);
                }
              }
            }

            const units = [...exports].filter(([name]) => {
              return !imports.has(name) && (!types.has(name) || values.has(name));
            });

            if (units.length > 1) {
              context.report({
                node: units[1][1],
                messageId: 'split',
                data: {
                  names: units
                    .map(([name]) => {
                      return name;
                    })
                    .join(', '),
                },
              });
            }
          },
        };
      },
    },
  },
};

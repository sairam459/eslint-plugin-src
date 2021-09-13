module.exports = {
  configs: {
    default: {
      plugins: ["src"],
      rules: {
        "src/hook-func-name": "warn",
        "src/svg-file-name": "warn",
        "src/async-func-name": "warn",
        "src/const-naming-convention": "warn",
      },
    },
  },
  rules: {
    "const-naming-convention": {
      create: function (context) {
        return {
          VariableDeclaration(node) {
            if (node.parent.sourceType === "module" && node.kind == "const") {
              node.declarations &&
                node.declarations.forEach(declaration => {
                  if (declaration.id && !/^[A-Z_]+$/.test(declaration.id.name))
                    context.report({
                      node,
                      message: `constant '${declaration.id.name}' should follow UPPER_CASE convention`
                    });
                });
            }
          }
        };
      }
    },
    "async-func-name": {
      create: function (context) {
        return {
          FunctionDeclaration(node) {
            console.log(node.id.name);
            if (node.async && !/Async$/.test(node.id.name)) {
              context.report({
                node,
                message: "Async function name must end in 'Async'",
              });
            }
          },
        };
      },
    },
    "hook-func-name": {
      create: function (context) {
        return {
          CallExpression(node) {
            if (isHook(node.callee)) {
              if (!getFunctionName(node.arguments[0])) {
                context.report({
                  node,
                  message: "Use named function",
                });
              }
            }
          },
        };
      },
    },
    "svg-file-name": {
      create: function (context) {
        return {
          ImportDeclaration(node) {
            if (node.source.value.indexOf(".svg") !== -1) {
              if (!/\bw*Icon\b/.test(node.specifiers[0].local.name)) {
                context.report({
                  node,
                  message: "icons must end with word 'Icon'",
                });
              }
            }
          },
        };
      },
    },
  },
};

function isHook(node) {
  if (node.type === "Identifier") {
    return isHookName(node.name);
  } else if (
    node.type === "MemberExpression" &&
    !node.computed &&
    isHook(node.property)
  ) {
    const obj = node.object;
    const isPascalCaseNameSpace = /^[A-Z].*/;
    return obj.type === "Identifier" && isPascalCaseNameSpace.test(obj.name);
  } else {
    return false;
  }
}

function isHookName(s) {
  return /^use[A-Z0-9].*$/.test(s);
}

function getFunctionName(node) {
  if (
    node.type === "FunctionDeclaration" ||
    (node.type === "FunctionExpression" && node.id)
  ) {
    // function useHook() {}
    // const whatever = function useHook() {};
    //
    // Function declaration or function expression names win over any
    // assignment statements or other renames.
    return node.id;
  } else if (node.type === "FunctionExpression") {
    if (
      node.parent.type === "VariableDeclarator" &&
      node.parent.init === node
    ) {
      // const useHook = () => {};
      return node.parent.id;
    } else if (
      node.parent.type === "AssignmentExpression" &&
      node.parent.right === node &&
      node.parent.operator === "="
    ) {
      // useHook = () => {};
      return node.parent.left;
    } else if (
      node.parent.type === "Property" &&
      node.parent.value === node &&
      !node.parent.computed
    ) {
      // {useHook: () => {}}
      // {useHook() {}}
      return node.parent.key;

      // NOTE: We could also support `ClassProperty` and `MethodDefinition`
      // here to be pedantic. However, hooks in a class are an anti-pattern. So
      // we don't allow it to error early.
      //
      // class {useHook = () => {}}
      // class {useHook() {}}
    } else if (
      node.parent.type === "AssignmentPattern" &&
      node.parent.right === node &&
      !node.parent.computed
    ) {
      // const {useHook = () => {}} = {};
      // ({useHook = () => {}} = {});
      //
      // Kinda clowny, but we'd said we'd follow spec convention for
      // `IsAnonymousFunctionDefinition()` usage.
      return node.parent.left;
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

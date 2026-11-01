// Two-way choices stay readable as branches; the third repeated selector needs a table.
const MIN_DISPATCH_BRANCHES = 3;

function selector(node) {
  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'MemberExpression' && !node.computed && !node.optional) {
    const object = selector(node.object);

    return object && `${object}.${node.property.name}`;
  }

  return undefined;
}

function comparison(node) {
  if (node.type !== 'BinaryExpression' || node.operator !== '===') {
    return undefined;
  }

  const literal = (value) => {
    return value.type === 'Literal' && ['string', 'number'].includes(typeof value.value);
  };

  if (literal(node.right)) {
    return selector(node.left);
  }

  return literal(node.left) ? selector(node.right) : undefined;
}

const preferDispatch = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      dispatch:
        'Replace three or more equality branches on {{selector}} with a typed handler or value table. Preserve guards and fallback behavior.',
    },
  },
  create(context) {
    function check(node, next) {
      const key = comparison(node.test);

      if (
        !key ||
        (node.parent?.type === node.type &&
          next(node.parent) === node &&
          comparison(node.parent.test) === key)
      ) {
        return;
      }

      let count = 0;
      let branch = node;

      while (branch?.type === node.type && comparison(branch.test) === key) {
        count++;
        branch = next(branch);
      }

      if (count >= MIN_DISPATCH_BRANCHES) {
        context.report({ node, messageId: 'dispatch', data: { selector: key } });
      }
    }

    return {
      IfStatement(node) {
        check(node, (branch) => {
          return branch.alternate;
        });
      },
      ConditionalExpression(node) {
        check(node, (branch) => {
          return branch.alternate;
        });
      },
    };
  },
};

export default {
  meta: { name: 'emberfall' },
  rules: { 'prefer-dispatch': preferDispatch },
};

const structural = new Set([-1, 0, 1]);
const arithmetic = new Set(['*', '/', '**', '%']);
// Halving/doubling and squaring are mathematical structure rather than tuning.
const mathematicalFactors = new Set([2, 0.5]);
// Permit one blank line between a rationale and its declaration after spacing fixes.
const commentGapLines = 2;
const drawing = new Set([
  'arc',
  'ellipse',
  'rect',
  'roundRect',
  'fillRect',
  'strokeRect',
  'clearRect',
  'moveTo',
  'lineTo',
  'bezierCurveTo',
  'quadraticCurveTo',
  'translate',
  'scale',
  'drawImage',
  'drawArt',
  'fillText',
  'strokeText',
  'createLinearGradient',
  'createRadialGradient',
  'addColorStop',
  'setTransform',
  'transform',
  'drawStonePortal',
  'drawChimneySmoke',
  'drawTargetHit',
  'drawResourceHealth',
  'drawWorldBar',
]);

function numeric(node) {
  if (['TSAsExpression', 'TSSatisfiesExpression'].includes(node.type)) {
    return numeric(node.expression);
  }

  if (node.type === 'Literal') {
    return typeof node.value === 'number' || typeof node.value === 'bigint';
  }

  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'Math'
  ) {
    return ['PI', 'E', 'LN2', 'LN10', 'LOG2E', 'LOG10E', 'SQRT1_2', 'SQRT2'].includes(
      node.property.name,
    );
  }

  if (node.type === 'UnaryExpression' && ['-', '+'].includes(node.operator)) {
    return numeric(node.argument);
  }

  return node.type === 'BinaryExpression' && numeric(node.left) && numeric(node.right);
}

function declaration(node) {
  let current = node;

  while (
    ['UnaryExpression', 'BinaryExpression', 'TSAsExpression', 'TSSatisfiesExpression'].includes(
      current.parent?.type,
    )
  ) {
    current = current.parent;
  }

  if (
    current.parent?.type === 'VariableDeclarator' &&
    current.parent.init === current &&
    numeric(current)
  ) {
    return current.parent;
  }

  return undefined;
}

function data(node) {
  let current = node;
  let array = false;

  while (
    [
      'UnaryExpression',
      'BinaryExpression',
      'ArrayExpression',
      'TSAsExpression',
      'TSSatisfiesExpression',
    ].includes(current.parent?.type)
  ) {
    current = current.parent;
    array ||= current.type === 'ArrayExpression';
  }

  const parent = current.parent;

  return (
    (parent?.type === 'Property' && (parent.value === current || parent.key === current)) ||
    (parent?.type === 'VariableDeclarator' && parent.init === current && array) ||
    (array && parent?.type === 'NewExpression' && ['Set', 'Map'].includes(parent.callee.name)) ||
    (parent?.type === 'MemberExpression' && parent.computed && parent.property === current) ||
    parent?.type === 'TSLiteralType' ||
    parent?.type === 'TSEnumMember' ||
    parent?.type === 'PropertyDefinition' ||
    parent?.type === 'JSXExpressionContainer'
  );
}

function structuralCall(node) {
  let value = node;

  while (['UnaryExpression', 'BinaryExpression'].includes(value.parent?.type)) {
    value = value.parent;
  }

  const call = value.parent;

  if (call?.type !== 'CallExpression') {
    return false;
  }

  const name = call.callee.type === 'Identifier' ? call.callee.name : call.callee.property?.name;

  // These arguments describe artwork coordinates or explicit talent-grid coordinates.
  return drawing.has(name) || name === 'drawArt' || name === 'rank';
}

function timerDelay(node) {
  let value = node;

  while (['UnaryExpression', 'BinaryExpression', 'TSAsExpression'].includes(value.parent?.type)) {
    value = value.parent;
  }

  const parent = value.parent;

  if (parent?.type !== 'CallExpression') {
    return false;
  }

  const name =
    parent.callee.type === 'Identifier' ? parent.callee.name : parent.callee.property?.name;

  if (name === 'waitForTimeout') {
    return parent.arguments[0] === value;
  }

  return (
    ['setTimeout', 'setInterval'].includes(name) &&
    (parent.arguments[1] === value || (parent.arguments[0] === value && numeric(value)))
  );
}

const namedValues = {
  meta: {
    type: 'suggestion',
    schema: [],
    messages: {
      name: 'Give {{value}} a domain name and explain why this exact value is needed at its definition.',
      reason:
        'Explain why the exact numeric value of {{name}} is needed in a comment beside its definition.',
      constant: 'Declare the numeric policy value {{name}} with const.',
    },
  },
  create(context) {
    const source = context.sourceCode;
    const filename = context.filename.replaceAll('\\', '/');
    const example =
      /(?:^|\/)(?:tests|stories)\/|\.(?:test|spec|fixture|cases|stories)\.[cm]?[jt]sx?$/.test(
        filename,
      );
    const checked = new Set();

    function documented(node) {
      const statement =
        node.parent.parent?.type === 'ExportNamedDeclaration' ? node.parent.parent : node.parent;
      const before = source.getCommentsBefore(statement).at(-1);
      const after = source.getCommentsAfter(statement)[0];

      return (
        (before && statement.loc.start.line - before.loc.end.line <= commentGapLines) ||
        (after && after.loc.start.line === statement.loc.end.line)
      );
    }

    return {
      Literal(node) {
        if (!numeric(node)) {
          return;
        }

        const value =
          node.parent?.type === 'UnaryExpression' && node.parent.operator === '-'
            ? -Number(node.value)
            : Number(node.value);

        if (timerDelay(node) && value !== 0) {
          context.report({ node, messageId: 'name', data: { value: String(value) } });

          return;
        }

        if (example || structural.has(value)) {
          return;
        }

        const definition = declaration(node);

        if (definition) {
          if (checked.has(definition)) {
            return;
          }

          checked.add(definition);

          if (definition.parent.kind !== 'const') {
            context.report({
              node: definition,
              messageId: 'constant',
              data: { name: definition.id.name },
            });
          } else if (!documented(definition)) {
            context.report({
              node: definition,
              messageId: 'reason',
              data: { name: definition.id.name },
            });
          }

          return;
        }

        if (data(node) || structuralCall(node)) {
          return;
        }

        const parent = node.parent;

        if (
          mathematicalFactors.has(value) &&
          parent?.type === 'BinaryExpression' &&
          arithmetic.has(parent.operator)
        ) {
          return;
        }

        context.report({ node, messageId: 'name', data: { value: String(value) } });
      },
    };
  },
};

export default { meta: { name: 'emberfall-values' }, rules: { 'named-values': namedValues } };

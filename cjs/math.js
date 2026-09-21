(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.IntegerMath = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const normalLevel = level => Math.max(1, Math.min(1000, Math.floor(Number(level)) || 1));
  const numberText = n => n < 0 ? `(−${Math.abs(n)})` : String(n);
  const titles = ['整數加法', '整數減法', '負數的加減', '正負數乘法', '整除練習', '連續加減', '先乘除後加減', '括弧優先', '絕對值入門', '絕對值加減', '絕對值混合運算'];
  const descriptions = [
    '從 −5 到 5 的加法開始，沿著數線移動。',
    '減去一個數，等於加上它的相反數。',
    '練習 −8 到 8 的正負數加減。',
    '同號相乘為正，異號相乘為負。',
    '先判斷正負號，再算能整除的商。',
    '加減同級，從左到右依序計算。',
    '先算乘法，再進行加減法。',
    '先算複合括弧，再乘除，最後加減。',
    '絕對值是到零的距離，零的絕對值仍是零。',
    '先算絕對值，再處理外面的加減；整題答案仍可能是負數。',
    '先算絕對值符號內的算式，再取距離，接著乘除與加減。'
  ];
  function curriculum(level) {
    level = normalLevel(level);
    return {
      title: level <= 11 ? titles[level - 1] : `整數綜合挑戰 ${level - 11}`,
      description: level <= 11 ? descriptions[level - 1] : '綜合括弧、絕對值與四則組合；每個原始數皆在 −10 到 10，除法一定整除。',
      goal: Math.min(8, 3 + Math.floor((level - 1) / 3)),
      grace: Math.max(7, 14 - (level - 1) * 0.35)
    };
  }
  const leaf = value => ({ value: value === 0 ? 0 : value });
  const absolute = inner => ({op:'abs',inner,value:Math.abs(inner.value)});
  function binary(op, left, right, grouped = false) {
    const a = left.value, b = right.value;
    const value = op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b;
    return { op, left, right, grouped, value: value === 0 ? 0 : value };
  }
  function render(node) {
    if(node.op==='abs')return `|${render(node.inner)}|`;
    if (!node.op) return numberText(node.value);
    const text = `${render(node.left)} ${node.op} ${render(node.right)}`;
    return node.grouped ? `(${text})` : text;
  }
  function operands(node) { return node.op==='abs'?operands(node.inner):node.op ? operands(node.left).concat(operands(node.right)) : [node.value]; }
  function grouped(node) { return node.op==='abs'?grouped(node.inner):!!(node.op && (node.grouped || grouped(node.left) || grouped(node.right))); }
  function steps(node, list) {
    if(node.op==='abs'){steps(node.inner,list);list.push(`${render(node)} = ${numberText(node.value)}`);return;}
    if (!node.op) return;
    steps(node.left, list); steps(node.right, list);
    list.push(`${numberText(node.left.value)} ${node.op} ${numberText(node.right.value)} = ${numberText(node.value)}`);
  }
  function generate(level, rng = Math.random, previousKey = '') {
    level = normalLevel(level);
    let tree, skill, random;
    // Rotate samples on retries so even a constant injected RNG cannot deadlock.
    for (let attempt = 0; attempt < 64; attempt++) {
      random = () => {
        const sample = Number(rng());
        return ((Number.isFinite(sample) ? sample : 0.5) + attempt * 0.618033988749895) % 1;
      };
      const integer = (min, max) => min + Math.floor(Math.abs(random()) * (max - min + 1));
      const choose = values => values[integer(0, values.length - 1)];
      const limit = level <= 2 ? 5 : level === 3 ? 8 : Math.min(10, level + 1);
      const n = () => leaf(integer(-limit, limit));
      const addOrSubtract = () => choose(['+', '−']);
      const division = () => {
        // Deliberate coverage: 80% genuine factor calculations, 10% zero,
        // 10% unit factors. All dividend/divisor operands stay within limit.
        const category=random(),pairs=[];
        for(let divisor=-limit;divisor<=limit;divisor++){
          if(divisor===0)continue;
          for(let quotient=-limit;quotient<=limit;quotient++){
            if(Math.abs(divisor*quotient)>limit)continue;
            const substantial=Math.abs(divisor)>1&&Math.abs(quotient)>1;
            if(category<.1?quotient===0:category<.2?quotient!==0&&!substantial:substantial)pairs.push([divisor*quotient,divisor]);
          }
        }
        const [dividend,divisor]=choose(pairs);
        return binary('÷',leaf(dividend),leaf(divisor));
      };
      const sumGroup = () => binary(addOrSubtract(), n(), n(), true);
      if (level === 1) { tree = binary('+', n(), n()); skill = '整數加法'; }
      else if (level === 2) { tree = binary('−', n(), n()); skill = '減去一數等於加相反數'; }
      else if (level === 3) { tree = binary(addOrSubtract(), leaf(-integer(1, limit)), n()); skill = '負數加減'; }
      else if (level === 4) { tree = binary('×', n(), n()); skill = '同號得正、異號得負'; }
      else if (level === 5) { tree = division(); skill = '整除與正負號'; }
      else if (level === 6) { tree = binary(addOrSubtract(), binary(addOrSubtract(), n(), n()), n()); skill = '加減由左至右'; }
      else if (level === 7) { tree = binary(addOrSubtract(), n(), binary('×', n(), n())); skill = '先乘後加減'; }
      else if(level===9){tree=absolute(n());skill='絕對值是到零的距離';}
      else if(level===10){tree=binary(addOrSubtract(),absolute(n()),n());skill='先取絕對值再加減';}
      else if(level===11||(level>=12&&random()<.35)){
        const inside=absolute(binary(addOrSubtract(),n(),n()));
        const variant=integer(0,2);
        if(variant===0)tree=binary('×',inside,n());
        else if(variant===1){const ds=Array.from({length:21},(_,i)=>i-10).filter(d=>d!==0&&inside.value%d===0);tree=binary('÷',inside,leaf(choose(ds)));}
        else tree=binary('−',n(),inside);
        skill='絕對值內先算，再做四則';
      }
      else {
        const variant = integer(0, level < 9 ? 1 : level < 12 ? 3 : 4);
        if (variant === 0) tree = binary('×', sumGroup(), n());
        else if (variant === 1) tree = binary('−', n(), sumGroup());
        else if (variant === 2) {
          const group = sumGroup();
          const divisors = Array.from({ length: limit * 2 + 1 }, (_, i) => i - limit).filter(d => d !== 0 && group.value % d === 0);
          tree = binary('÷', group, leaf(choose(divisors)));
        } else if (variant === 3) tree = binary(addOrSubtract(), sumGroup(), division());
        else tree = binary(addOrSubtract(), binary('×', sumGroup(), n()), n());
        skill = '括弧優先，再乘除後加減';
      }
      if (render(tree) !== previousKey) break;
    }
    const answer = tree.value, expression = render(tree);
    const values = operands(tree);
    // Sign reversal, wrong operation and ignoring precedence are common errors.
    const a = tree.left?.value??tree.inner.value, b = tree.right?.value??0;
    const candidates = [-answer, Math.abs(a) + Math.abs(b), a + b, a - b, b - a, a * b];
    if (tree.right?.op === '×') candidates.unshift((tree.op==='−'?a-tree.right.left.value:a+tree.right.left.value) * tree.right.right.value);
    if (tree.op==='−'&&tree.right.grouped&&['+','−'].includes(tree.right.op)) candidates.unshift(a-tree.right.left.value+(tree.right.op==='+'?tree.right.right.value:-tree.right.right.value));
    const options = [answer];
    for (const candidate of candidates) {
      const value = candidate === 0 ? 0 : candidate;
      if (Number.isInteger(value) && !options.includes(value)) options.push(value);
      if (options.length === 4) break;
    }
    for (let delta = 1; options.length < 4; delta++) {
      for (const value of [answer + delta, answer - delta]) {
        if (!options.includes(value)) options.push(value);
        if (options.length === 4) break;
      }
    }
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.abs(random()) * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    const calculation = []; steps(tree, calculation);
    return {
      expression, answer, options, firstStep: calculation[0].split(' = ')[0],
      explanation: `${skill}。${calculation.join('；')}。`,
      skill, operands: values, hasGrouping: grouped(tree), key: expression
    };
  }
  return { generate, curriculum };
});

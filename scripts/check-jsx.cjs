const lines = require('fs').readFileSync('src/components/AssetsView.tsx', 'utf8').split('\n');
let depth = 0;
const tags = ['div', 'Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter', 'ul', 'li', 'span', 'button', 'form'];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  const opens = (l.match(/<[a-z][^>\/]*?(?<![\w])/g) || []).filter(s => tags.includes(s.replace(/^<|[\s>].*/, ''))).length;
  const closes = (l.match(/<\/[a-z]+>/g) || []).filter(s => tags.includes(s.replace(/<\//, '').replace('>', ''))).length;
  depth += (opens - closes);
  if (depth < 0) {
    console.log(`Negative at line ${i+1}: ${l}`);
    break;
  }
}
console.log('Final depth:', depth);

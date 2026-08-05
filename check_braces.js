const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8');

let stack = [];
for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{' || char === '(' || char === '[') {
        stack.push({ char, line: content.substring(0, i).split('\n').length });
    } else if (char === '}' || char === ')' || char === ']') {
        const last = stack.pop();
        if (!last) {
            console.log(`Unmatched closing ${char} at line ${content.substring(0, i).split('\n').length}`);
        } else {
            const match = (last.char === '{' && char === '}') ||
                          (last.char === '(' && char === ')') ||
                          (last.char === '[' && char === ']');
            if (!match) {
                console.log(`Mismatched closing ${char} at line ${content.substring(0, i).split('\n').length}, expected matching for ${last.char} from line ${last.line}`);
                stack.push(last); // push back to not mess up completely
            }
        }
    }
}
if (stack.length > 0) {
    console.log('Unclosed braces/parens:');
    stack.forEach(item => console.log(`- ${item.char} at line ${item.line}`));
} else {
    console.log('All braces matched!');
}

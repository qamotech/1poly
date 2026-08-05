const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8');

let stack = [];
let inString = false;
let stringChar = '';
let inBlockComment = false;
let inLineComment = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];
    const prevChar = content[i-1];
    
    if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
            inBlockComment = false;
            i++;
        }
        continue;
    }
    if (inLineComment) {
        if (char === '\n') {
            inLineComment = false;
        }
        continue;
    }
    if (inString) {
        if (char === '\\') {
            i++;
            continue;
        }
        if (char === stringChar) {
            inString = false;
        }
        continue;
    }
    
    if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        i++;
        continue;
    }
    if (char === '/' && nextChar === '/') {
        inLineComment = true;
        i++;
        continue;
    }
    if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
        continue;
    }
    
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

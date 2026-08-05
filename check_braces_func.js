const fs = require('fs');
const content = fs.readFileSync('script.js', 'utf8');

// We need to ignore strings and regexes and comments when counting braces.
// Using a slightly more robust parser or just searching for the closing brace.
// Instead, let's just use acorn to parse it.

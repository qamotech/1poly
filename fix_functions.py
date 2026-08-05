with open('script.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = "function updateStatus(state, msg = '') {}\n" + text

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done.")

with open('script.js', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace("rollDice();\n             if (G.phase === 'postroll') {", "rollDice();\n            }\n            if (G.phase === 'postroll') {")

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done.")

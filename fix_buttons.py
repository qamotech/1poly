with open('script.js', 'r', encoding='utf-8') as f:
    text = f.read()

import re
text = re.sub(r'(document\.getElementById\(\'megaHubBtn\'\))(\.addEventListener)', r'if (\1) \1\2', text)
text = re.sub(r'(document\.getElementById\(\'closeMegaHubBtn\'\))(\.addEventListener)', r'if (\1) \1\2', text)
text = re.sub(r'(document\.getElementById\(\'quickSoundBtn\'\))(\.addEventListener)', r'if (\1) \1\2', text)
text = re.sub(r'(document\.getElementById\(\'quickCoinBtn\'\))(\.addEventListener)', r'if (\1) \1\2', text)
text = re.sub(r'(document\.getElementById\(\'quickFortuneBtn\'\))(\.addEventListener)', r'if (\1) \1\2', text)

with open('script.js', 'w', encoding='utf-8') as f:
    f.write(text)
print("Done.")

import pandas as pd
df = pd.read_excel('/Users/periskop/.gemini/antigravity-ide/scratch/used-car-intelligence/apps/satariz_vehicle_taxonomy.xlsx')
peugeot_307 = df[(df['Marka'].str.lower() == 'peugeot') & (df['Model'].str.lower() == '307')]
print(peugeot_307.to_string())

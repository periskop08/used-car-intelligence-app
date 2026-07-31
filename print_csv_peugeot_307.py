import pandas as pd
df = pd.read_csv('apps/api/scratch/TorqueScout_Satariz_Verified_Taxonomy_Varyant_DB_2000_2026.csv')
p307 = df[(df['Marka'].str.lower() == 'peugeot') & (df['Model'].str.lower() == '307')]
print("Unique Years:", p307['Yıl'].unique())
print("Unique Engines:", p307['Motor'].unique())
print("Unique Fuel Types:", p307['Yakıt Tipi'].unique())
print("Unique Trims:", p307['Donanım Paketi'].unique())
print("Sample rows:")
print(p307.head(10).to_string())

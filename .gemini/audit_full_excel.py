import pandas as pd
import sys

file_path = r"c:\Users\phili\gehringer-website\docs\RAG_modele_evolutif.xlsx"

try:
    # Lecture du fichier Excel (toutes les feuilles pour avoir les noms)
    xls = pd.ExcelFile(file_path)
    
    print("--- STRUCTURE GLOBALE ---")
    print(f"Feuilles trouvées ({len(xls.sheet_names)}) : {xls.sheet_names}")
    
    # Inspection détaillée de 'experience'
    if 'experience' in xls.sheet_names:
        df_exp = pd.read_excel(xls, sheet_name='experience')
        cols = df_exp.columns.tolist()
        print(f"\n--- FEUILLE 'experience' ---")
        print(f"Nombre de colonnes : {len(cols)}")
        print(f"Nombre de lignes de données : {len(df_exp)}")
        print("Liste des colonnes :")
        for col in cols:
            print(f" - {col}")
    else:
        print("\nERREUR: La feuille 'experience' est introuvable !")

except Exception as e:
    print(f"Erreur de lecture : {e}")

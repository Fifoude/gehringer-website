
import pandas as pd
import sys

# Set encoding to utf-8 for console output
sys.stdout.reconfigure(encoding='utf-8')

try:
    file_path = r'c:\Users\phili\gehringer-website\docs\RAG_modele_evolutif.xlsx'
    xl = pd.ExcelFile(file_path)
    
    # Only check experience this time
    target_sheets = ['experience']
    
    for sheet in target_sheets:
        if sheet in xl.sheet_names:
            print(f"\n--- Sheet: {sheet.upper()} ---")
            df = xl.parse(sheet)
            print(f"Columns ({len(df.columns)}):")
            for col in df.columns:
                print(f"  - {col}")
            
            if not df.empty:
                print("\nFirst Row Data:")
                row = df.iloc[0]
                for col in df.columns:
                    val = str(row[col])
                    if len(val) > 100: val = val[:97] + "..."
                    print(f"  {col}: {val}")

except Exception as e:
    print(f"Error: {e}")

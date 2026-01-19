
import pandas as pd

try:
    # Read the excel file
    file_path = r'c:\Users\phili\gehringer-website\docs\RAG_modele_evolutif.xlsx'
    
    # Load the workbook to see sheet names
    xl = pd.ExcelFile(file_path)
    print("Sheet names:", xl.sheet_names)
    
    # Iterate through sheets and print headers and first row
    for sheet in xl.sheet_names:
        print(f"\n--- Sheet: {sheet} ---")
        df = xl.parse(sheet)
        print("Columns:", list(df.columns))
        if not df.empty:
            print("First row:", df.iloc[0].to_dict())
        else:
            print("Sheet is empty")

except Exception as e:
    print(f"Error: {e}")

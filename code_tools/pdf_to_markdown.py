
import sys
import pdfplumber
from markdownify import markdownify as md

def convert_pdf_to_markdown(pdf_path, markdown_path):
    """
    Converts a PDF file to a Markdown file, preserving tables.

    Args:
        pdf_path (str): The path to the input PDF file.
        markdown_path (str): The path to the output Markdown file.
    """
    try:
        full_text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Extract text from the page
                text = page.extract_text()
                if text:
                    full_text += text + "\n\n"

                # Extract tables from the page
                tables = page.extract_tables()
                for table in tables:
                    if table:
                        # Convert table to HTML, then to Markdown
                        html_table = "<table>"
                        for row in table:
                            html_table += "<tr>"
                            for cell in row:
                                if cell:
                                    html_table += f"<td>{cell}</td>"
                                else:
                                    html_table += "<td></td>"
                            html_table += "</tr>"
                        html_table += "</table>"
                        
                        markdown_table = md(html_table)
                        full_text += markdown_table + "\n\n"

        # The output is written to a file with UTF-8 encoding to preserve special characters.
        with open(markdown_path, 'w', encoding='utf-8') as f:
            f.write(full_text)
            
        print(f"Successfully converted '{pdf_path}' to '{markdown_path}'")

    except Exception as e:
        print(f"An error occurred during the conversion: {e}")

if __name__ == '__main__':
    # This script is designed to be run from the command line with two arguments:
    # 1. The path to the input PDF file.
    # 2. The path to the output Markdown file.
    
    # Example usage:
    # python pdf_to_markdown_converter.py "path/to/your/document.pdf" "path/to/your/output.md"
    
    if len(sys.argv) != 3:
        print("Usage: python pdf_to_markdown_converter.py <input_pdf_path> <output_markdown_path>")
        sys.exit(1)
        
    input_pdf_file = sys.argv[1]
    output_markdown_file = sys.argv[2]
    
    convert_pdf_to_markdown(input_pdf_file, output_markdown_file)

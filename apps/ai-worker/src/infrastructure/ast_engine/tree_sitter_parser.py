"""
TreeSitterParser — AST-based code isolation.
Research3 §"AST Context Isolation" / Research5 §1.1:
  Converts source code to AST (Abstract Syntax Tree).
  Builds Control Flow Graph (CFG) for taint analysis.
  For files > 2000 lines with localized changes:
    Extracts ONLY the enclosing function/class body + signature.
    Discards all unrelated code from the diff context.
  Average token reduction: 60-80% on large files with small changes.
Supported languages: Python, Go, JavaScript, TypeScript, Java.
"""


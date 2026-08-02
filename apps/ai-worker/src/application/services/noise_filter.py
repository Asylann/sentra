import re
from typing import List
from src.domain.entities.diff import FileDiff, PrunedDiff

class DiffNoiseFilter:
    """
    Aggressively filters out irrelevant files and verbose Git metadata 
    from the raw patch to save LLM tokens and reduce hallucination risks.
    """
    
    # Patterns for files that provide zero value to LLM architecture/security analysis
    IRRELEVANT_PATTERNS = [
        re.compile(r".*\.lock$"),           # poetry.lock, yarn.lock, Cargo.lock
        re.compile(r"^go\.sum$"),           # go.sum
        re.compile(r".*package-lock\.json$"),
        re.compile(r".*\.min\.js$"),        # Minified JS
        re.compile(r".*\.min\.css$"),       # Minified CSS
        re.compile(r".*\.pb\.go$"),         # Protobuf generated Go
        re.compile(r".*\.(png|jpg|jpeg|gif|svg|ico|webp)$", re.IGNORECASE), # Images
        re.compile(r".*\.(woff2?|ttf|eot)$", re.IGNORECASE),                # Fonts
    ]

    @classmethod
    def should_exclude(cls, filename: str) -> bool:
        for pattern in cls.IRRELEVANT_PATTERNS:
            if pattern.match(filename):
                return True
        return False

    @classmethod
    def clean_patch_headers(cls, raw_patch: str) -> str:
        """
        Strips verbose Git headers that consume LLM tokens without adding semantic value.
        e.g., 'index a1b2c3d..e4f5g6h 100644', 'new file mode 100644'
        """
        if not raw_patch:
            return ""
            
        lines = raw_patch.split('\n')
        cleaned_lines = []
        
        for line in lines:
            if line.startswith('index '):
                continue
            if line.startswith('old mode ') or line.startswith('new mode '):
                continue
            if line.startswith('new file mode ') or line.startswith('deleted file mode '):
                continue
            if line.startswith('SIMILARITY INDEX'):
                continue
            cleaned_lines.append(line)
            
        return '\n'.join(cleaned_lines)

    @classmethod
    def filter_diff(cls, repo_id: int, pr_number: int, parsed_files: List[dict]) -> PrunedDiff:
        """
        Takes raw file entries (e.g. from GitHub JSON API) and returns a PrunedDiff entity.
        Format expected: [{'filename': 'foo.py', 'status': 'modified', 'patch': '...', 'additions': 5, ...}]
        """
        file_diffs = []
        for f in parsed_files:
            filename = f.get('filename', '')
            
            if cls.should_exclude(filename):
                file_diffs.append(FileDiff(
                    filename=filename,
                    status=f.get('status', 'unknown'),
                    was_excluded=True,
                    exclusion_reason="noise_filter"
                ))
                continue
                
            raw_patch = f.get('patch', '')
            cleaned_patch = cls.clean_patch_headers(raw_patch)
            
            file_diffs.append(FileDiff(
                filename=filename,
                status=f.get('status', 'unknown'),
                raw_patch=cleaned_patch,
                additions=f.get('additions', 0),
                deletions=f.get('deletions', 0)
            ))
            
        return PrunedDiff(
            repository_id=repo_id,
            pull_number=pr_number,
            files=file_diffs
        )

$allFiles = git ls-files --others --exclude-standard
foreach ($file in $allFiles) {
    if ([string]::IsNullOrWhiteSpace($file)) { continue }
    git add "$file"
    git commit -m "chore: add $(Split-Path $file -Leaf)"
}
git push origin main

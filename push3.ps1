$allFiles = git ls-files --others --exclude-standard
$total = $allFiles.Count
if ($total -eq 0) {
    Write-Host "No files to commit"
    exit
}

$commits = 55
$batchSize = [Math]::Max(1, [int][Math]::Ceiling($total / $commits))

$i = 0
$c = 1
while ($i -lt $total) {
    $batch = $allFiles[$i..([Math]::Min($i + $batchSize - 1, $total - 1))]
    foreach ($file in $batch) {
        if (-not [string]::IsNullOrWhiteSpace($file)) {
            git add "$file"
        }
    }
    git commit -m "chore: incrementally add project files part $c"
    $i += $batchSize
    $c++
}
git branch -M main
git push -u origin main -f

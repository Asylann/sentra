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
    $batch = $allFiles[$i..($i + $batchSize - 1)] | Where-Object { $_ -ne $null }
    foreach ($file in $batch) {
        git add "$file"
    }
    git commit -m "chore: setup project structure part $c"
    $i += $batchSize
    $c++
}
git branch -M main
git push -u origin main

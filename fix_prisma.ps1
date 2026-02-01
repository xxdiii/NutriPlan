Set-Location "c:\Users\asadi\Desktop\smart-diet-app\server"
Write-Output "Installing dependencies..."
npm install | Out-String | Write-Output
Write-Output "Installing prisma CLI..."
npm install prisma --save-dev | Out-String | Write-Output
Write-Output "Generating Prisma Client..."
npx prisma generate 2>&1 | Out-String | Write-Output
Write-Output "Listing .prisma directory..."
Get-ChildItem -Path "node_modules\.prisma" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName | Out-String | Write-Output

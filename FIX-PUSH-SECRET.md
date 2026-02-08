# Fix GitHub push blocked by secret (OpenAI API Key)

GitHub blocked your push because **lavitur-ai-server/.env** (with an OpenAI API key) was committed in the past. You need to remove that file from Git history, then force-push.

## Do this in a normal terminal (e.g. PowerShell or Git Bash), not inside Cursor

### 1. Remove any Git lock (if present)

```powershell
cd "C:\Users\kuane\OneDrive\Desktop\lavitur"
Remove-Item -Force .git\index.lock -ErrorAction SilentlyContinue
```

### 2. Stash or commit local changes so the working tree is clean

```powershell
git status
git add .gitignore
git commit -m "chore: ensure .env is ignored"   # if you have other changes, stash them first: git stash -u
```

### 3. Remove lavitur-ai-server/.env from all history

```powershell
$env:FILTER_BRANCH_SQUELCH_WARNING = "1"
git filter-branch -f --index-filter "git rm -f --cached --ignore-unmatch lavitur-ai-server/.env" --prune-empty -- --all
```

### 4. Force-push (rewrites remote history)

```powershell
git push --force-with-lease origin main
```

### 5. Rotate your OpenAI API key

Because the key was in history, treat it as exposed:

1. Go to https://platform.openai.com/api-keys  
2. Revoke the key that was in `.env`  
3. Create a new key and put it only in **lavitur-ai-server/.env** (that file is now in .gitignore and must never be committed)

---

**Optional:** After a successful push you can remove the backup refs left by filter-branch:

```powershell
git for-each-ref --format="%(refname)" refs/original/ | ForEach-Object { git update-ref -d $_ }
```

You can delete this file (FIX-PUSH-SECRET.md) after you’ve fixed the push.

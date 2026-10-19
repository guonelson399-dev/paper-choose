"""Install the built frontend into the local Python server, without patching code."""
from pathlib import Path
import shutil
root = Path(__file__).resolve().parents[1]
source = root / "frontend" / "dist-local"
target = root / "paperchoose" / "webapp"
if not (source / "index.html").is_file():
    raise SystemExit("First run npm ci and npm run build:local in frontend/.")
if target.exists():
    shutil.rmtree(target)
shutil.copytree(source, target)
print("Installed frontend. Start with python -m paperchoose serve --open")

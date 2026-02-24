## Univer Embed Launcher & Server

This project ships with two streamlined ways to run the local Univer data server that backs `index.html`.

### Option A — UniverApiApp launcher (GUI or CLI)

1. Make sure Python 3.9+ is installed on Windows.
2. Run the launcher:
   ```powershell
   cd path\to\univer-embed-with-tags
   python launcher/UniverApiApp.py
   ```
3. The Tkinter app auto-checks `/health`. If the server is down it will start `server.py --port 8080` for you, expose buttons to open the browser, stop the server, or manually re-run the health probe.

#### Package as `UniverApiApp.exe`

```powershell
pip install pyinstaller
pyinstaller --onefile --name UniverApiApp launcher/UniverApiApp.py
```

The executable will be generated inside `dist/UniverApiApp.exe`. Distribute that single file to teammates; it behaves exactly like running the Python script.

### Option B — Docker (auto-restart friendly)

1. Build the image:
   ```bash
   docker build -t univer-embed .
   ```
2. Run it with restart policy + port binding:
   ```bash
   docker run -d \
     --name univer-embed \
     -p 8080:8080 \
     -e SERVER_PORT=8080 \
     --restart unless-stopped \
     -v "${PWD}/data:/app/data" \
     univer-embed
   ```
   - Change `SERVER_PORT` and the `-p` mapping if you need a different port.
   - The volume mount keeps `data/` contents (templates, tags) persistent.
3. The container automatically exposes the `/health` endpoint which the launcher UI (and Docker health check) can call.

### Health check endpoint

Both approaches rely on `http://127.0.0.1:8080/health` exposed by `server.py`. The launcher UI already wires the “Check server” button to this endpoint.

### Removed legacy scripts

Older `.bat` helpers (`start_server.bat`, `open_view.bat`) have been removed in favor of the launcher + Docker workflow above.
# univer-custom

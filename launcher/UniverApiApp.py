"""
UniverApiApp launcher.

Simple Tkinter UI that helps Windows users:
  • Start/stop the local Python server (server.py)
  • Check health endpoint (http://127.0.0.1:8080/health)
  • Open the embed view in the default browser

You can run this script with `python launcher/UniverApiApp.py`
or package it as an .exe via PyInstaller (see README below).
"""

import os
import subprocess
import sys
import threading
import urllib.error
import urllib.request
import webbrowser
import tkinter as tk
from tkinter import messagebox

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVER_SCRIPT = os.path.join(PROJECT_ROOT, "server.py")
SERVER_PORT = os.environ.get("UNIVER_SERVER_PORT", "8080")
SERVER_URL = f"http://127.0.0.1:{SERVER_PORT}"
HEALTH_URL = f"{SERVER_URL}/health"

server_process = None


def ensure_server_script():
    if not os.path.exists(SERVER_SCRIPT):
        messagebox.showerror(
            "Missing server.py",
            f"Không tìm thấy server.py tại:\n{SERVER_SCRIPT}\n"
            "Kiểm tra lại project path.",
        )
        return False
    return True


def set_status(text, color="#1a73e8"):
    status_var.set(text)
    status_label.config(fg=color)


def probe_health(timeout=2):
    req = urllib.request.Request(HEALTH_URL, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status == 200:
                return True, None
            return False, f"HTTP {resp.status}"
    except urllib.error.URLError as err:
        detail = getattr(err, "reason", err)
        return False, str(detail)


def start_server():
    global server_process
    if not ensure_server_script():
        return
    healthy, _ = probe_health(timeout=1)
    if healthy:
        set_status("Server đang chạy", "#1e8e3e")
        return
    if server_process and server_process.poll() is None:
        set_status("Server đang chạy", "#1e8e3e")
        return

    try:
        creationflags = getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
        server_process = subprocess.Popen(
            [sys.executable, SERVER_SCRIPT, "--port", SERVER_PORT],
            cwd=PROJECT_ROOT,
            creationflags=creationflags,
        )
        set_status("Đang khởi động server...", "#fbbc04")
        root.after(1500, check_health)
    except Exception as exc:
        messagebox.showerror("Không thể khởi động server", str(exc))
        set_status("Lỗi khởi động server", "#d93025")


def stop_server():
    global server_process
    if server_process and server_process.poll() is None:
        server_process.terminate()
        set_status("Đã gửi tín hiệu dừng server", "#5f6368")
        server_process = None
    else:
        set_status("Server chưa chạy", "#5f6368")


def open_view():
    webbrowser.open(SERVER_URL)
    set_status("Đang mở trình duyệt…", "#1a73e8")


def check_health():
    def worker():
        healthy, detail = probe_health()
        if healthy:
            root.after(0, lambda: set_status("✅ Server OK", "#1e8e3e"))
        else:
            msg = "❌ Server chưa chạy – hãy bấm Start"
            if detail:
                msg += f" ({detail})"
            root.after(0, lambda: set_status(msg, "#d93025"))

    threading.Thread(target=worker, daemon=True).start()


def auto_start_if_needed():
    def worker():
        healthy, _ = probe_health(timeout=1.5)
        if healthy:
            root.after(0, lambda: set_status("✅ Server OK", "#1e8e3e"))
        else:
            root.after(0, start_server)

    threading.Thread(target=worker, daemon=True).start()


def on_close():
    if server_process and server_process.poll() is None:
        if not messagebox.askyesno(
            "Thoát",
            "Server đang chạy. Bạn có muốn dừng server trước khi thoát?",
        ):
            return
        stop_server()
    root.destroy()


root = tk.Tk()
root.title("Univer API Launcher")
root.geometry("400x240")
root.resizable(False, False)

title = tk.Label(
    root,
    text="Univer Embed Launcher",
    font=("Segoe UI", 14, "bold"),
    fg="#202124",
)
title.pack(pady=(16, 8))

desc = tk.Label(
    root,
    text="Khởi động server.py, kiểm tra health, mở giao diện embed.",
    font=("Segoe UI", 10),
    wraplength=360,
    justify="center",
)
desc.pack(pady=(0, 16))

btn_frame = tk.Frame(root)
btn_frame.pack(pady=8)

btn_start = tk.Button(
    btn_frame,
    text="Start server",
    command=start_server,
    width=14,
    bg="#1a73e8",
    fg="white",
    relief="raised",
)
btn_start.grid(row=0, column=0, padx=6, pady=6)

btn_stop = tk.Button(
    btn_frame,
    text="Stop server",
    command=stop_server,
    width=14,
)
btn_stop.grid(row=0, column=1, padx=6, pady=6)

btn_health = tk.Button(
    btn_frame,
    text="Check health",
    command=check_health,
    width=14,
)
btn_health.grid(row=1, column=0, padx=6, pady=6)

btn_open = tk.Button(
    btn_frame,
    text="Open view",
    command=open_view,
    width=14,
)
btn_open.grid(row=1, column=1, padx=6, pady=6)

status_var = tk.StringVar(value="Nhấn Start để chạy server.")
status_label = tk.Label(
    root,
    textvariable=status_var,
    font=("Segoe UI", 11),
    fg="#5f6368",
    wraplength=360,
    justify="center",
)
status_label.pack(pady=12)

hint_label = tk.Label(
    root,
    text=f"Server port: {SERVER_PORT}  •  Health: /health",
    font=("Segoe UI", 9),
    fg="#5f6368",
)
hint_label.pack(pady=(0, 8))

root.protocol("WM_DELETE_WINDOW", on_close)
root.after(400, auto_start_if_needed)
root.mainloop()

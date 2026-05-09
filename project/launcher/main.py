import os
import sys
import time
import subprocess
import threading
import urllib.request
import webbrowser

def find_node(base_dir):
    candidates = [
        os.path.join(base_dir, "runtime", "node.exe"),
        os.path.join(os.environ.get('LOCALAPPDATA', ''), "OpenAI", "Codex", "bin", "node.exe"),
        os.path.join(os.environ.get('PROGRAMFILES', ''), "nodejs", "node.exe"),
        "node.exe"
    ]
    
    for candidate in candidates:
        if candidate == "node.exe":
            return candidate
        if os.path.exists(candidate):
            return candidate
            
    return None

def pause():
    print()
    print("Press any key to close...")
    if os.name == 'nt':
        import msvcrt
        msvcrt.getch()
    else:
        input()

def wait_for_server(url):
    for _ in range(30):
        try:
            req = urllib.request.Request(f"{url}/api/overview")
            with urllib.request.urlopen(req) as response:
                if response.getcode() == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.3)
    return False

def stream_output(pipe, is_error=False):
    for line in iter(pipe.readline, ''):
        if line:
            line_stripped = line.strip()
            if line_stripped:
                if is_error:
                    print(line_stripped, file=sys.stderr, flush=True)
                else:
                    print(line_stripped, flush=True)

def main():
    if os.name == 'nt':
        os.system("title Smart Retail Pro")
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    # The C# version uses AppContext.BaseDirectory, which is the root directory.
    # Assuming this python script is in the `launcher` directory, its parent is the root.
    base_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    
    node_path = find_node(base_dir)
    server_path = os.path.join(base_dir, "app", "server.mjs")
    port = "4173"
    url = f"http://127.0.0.1:{port}"

    print("Smart Retail Pro")
    print("=================")
    print(base_dir)

    if node_path is None:
        print("Node runtime was not found.")
        print("Keep runtime\\node.exe with this project folder, or install Node.js 24+.")
        pause()
        sys.exit(1)

    if not os.path.exists(server_path):
        print("Project server file was not found:")
        print(server_path)
        pause()
        sys.exit(1)

    print(f"Runtime: {node_path}")
    print(f"URL:     {url}")
    print()
    print("Starting local server. Keep this window open while using the project.")

    try:
        server = subprocess.Popen(
            [node_path, "--no-warnings", server_path, "--port", port],
            cwd=base_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        threading.Thread(target=stream_output, args=(server.stdout, False), daemon=True).start()
        threading.Thread(target=stream_output, args=(server.stderr, True), daemon=True).start()
    except Exception as ex:
        print("Failed to start the local server.")
        print(str(ex))
        pause()
        sys.exit(1)

    ready = wait_for_server(url)
    if ready:
        print("Opening browser...")
        webbrowser.open(url)
    else:
        print("The server did not respond yet. You can still try opening:")
        print(url)

    print()
    print("Close this window to stop the project server.")
    
    server.wait()
    sys.exit(server.returncode)

if __name__ == "__main__":
    main()

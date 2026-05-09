using System.Diagnostics;
using System.Net.Http;

var baseDir = AppContext.BaseDirectory; //D:\1-Software\4-Data-Engineer\project\SmartRetailPro_Portable\SmartRetailPro
var nodePath = FindNode(baseDir); //D:\1-Software\4-Data-Engineer\project\SmartRetailPro_Portable\SmartRetailPro/runtime/node.exe
var serverPath = Path.Combine(baseDir, "app", "server.mjs"); //D:\1-Software\4-Data-Engineer\project\SmartRetailPro_Portable\SmartRetailPro/app/server.mjs
var port = "4173";
var url = $"http://127.0.0.1:{port}";

Console.Title = "Smart Retail Pro";
Console.OutputEncoding = System.Text.Encoding.UTF8;
Console.WriteLine("Smart Retail Pro");
Console.WriteLine("=================");
Console.WriteLine(AppContext.BaseDirectory);

if (nodePath is null)
{
    Console.WriteLine("Node runtime was not found.");
    Console.WriteLine("Keep runtime\\node.exe with this project folder, or install Node.js 24+.");

    Pause();
    return 1;
}

if (!File.Exists(serverPath))
{
    Console.WriteLine("Project server file was not found:");
    Console.WriteLine(serverPath);
    Pause();
    return 1;
}

Console.WriteLine($"Runtime: {nodePath}");
Console.WriteLine($"URL:     {url}");
Console.WriteLine();
Console.WriteLine("Starting local server. Keep this window open while using the project.");

using var server = new Process();
server.StartInfo.FileName = nodePath;
server.StartInfo.Arguments = $"--no-warnings \"{serverPath}\" --port {port}";
server.StartInfo.WorkingDirectory = baseDir;
server.StartInfo.UseShellExecute = false;
server.StartInfo.RedirectStandardOutput = true;
server.StartInfo.RedirectStandardError = true;
server.StartInfo.CreateNoWindow = false;
server.OutputDataReceived += (_, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) Console.WriteLine(e.Data); };
server.ErrorDataReceived += (_, e) => { if (!string.IsNullOrWhiteSpace(e.Data)) Console.Error.WriteLine(e.Data); };

try
{
    server.Start();
    server.BeginOutputReadLine();
    server.BeginErrorReadLine();
}
catch (Exception ex)
{
    Console.WriteLine("Failed to start the local server.");
    Console.WriteLine(ex.Message);
    Pause();
    return 1;
}

var ready = await WaitForServer(url);
if (ready)
{
    Console.WriteLine("Opening browser...");
    Process.Start(new ProcessStartInfo { FileName = url, UseShellExecute = true });
}
else
{
    Console.WriteLine("The server did not respond yet. You can still try opening:");
    Console.WriteLine(url);
}

Console.WriteLine();
Console.WriteLine("Close this window to stop the project server.");
server.WaitForExit();
return server.ExitCode;

static string? FindNode(string baseDir)
{
    var candidates = new[]
    {
        Path.Combine(baseDir, "runtime", "node.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OpenAI", "Codex", "bin", "node.exe"),
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "nodejs", "node.exe"),
        "node.exe"
    };

    foreach (var candidate in candidates)
    {
        if (candidate == "node.exe") return candidate;
        if (File.Exists(candidate)) return candidate;
    }
    return null;
}

static async Task<bool> WaitForServer(string url)
{
    using var client = new HttpClient();
    for (var i = 0; i < 30; i++)
    {
        try
        {
            using var response = await client.GetAsync($"{url}/api/overview");
            if (response.IsSuccessStatusCode) return true;
        }
        catch
        {
            // Retry until the local server is ready.
        }
        await Task.Delay(300);
    }
    return false;
}

static void Pause()
{
    Console.WriteLine();
    Console.WriteLine("Press any key to close...");
    Console.ReadKey(intercept: true);
}

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path"; // Add this for path handling

const lastShownIdKey = "lastShownId";
export function activate(context: vscode.ExtensionContext) {
  const ayatData = loadJsonData("ayat.json");
  const tafseerData = loadJsonData("tafseer.json");
  const ayatCount = Object.keys(ayatData).length;
  let disposable = vscode.commands.registerCommand("ayat.showAyah", () => {
    // Create Webview Panel
    const panel = vscode.window.createWebviewPanel(
      "ayatDisplay",
      "Ayat",
      vscode.ViewColumn.One, // Display in the first column
      {
        enableScripts: true, // Enable JavaScript in the webview
      }
    );
    // Set Webview HTML Content
    panel.webview.html = renderContent({ incrementAyah: true });

    // Handle Messages from the Webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "toggleTafseer":
            // Toggle the configuration value

            const config = vscode.workspace.getConfiguration("ayat");
            const currentShowTafseer = config.get(
              "showTafseerInitially",
              true
            ) as boolean;
            await config.update(
              "showTafseerInitially",
              !currentShowTafseer,
              vscode.ConfigurationTarget.Global
            );
            panel.webview.html = renderContent();
            break;
          case "nextAyah":
            panel.webview.html = renderContent({
              incrementAyah: true,
              forceSequential: true,
            });
            break;
        }
      },
      undefined,
      context.subscriptions
    );
  });

  context.subscriptions.push(disposable);
  function loadJsonData(filename: string): any {
    const filePath = path.join(__dirname, "..", "data", filename); // Construct the correct path
    const jsonData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(jsonData);
  }

  function getNextAyahId(ayahMode: string, lastShownId: number): number {
    let res: number;
    if (ayahMode === "sequential") {
      res = (lastShownId % ayatCount) + 1; // Circular increment
    } else {
      res = Math.floor(Math.random() * ayatCount) + 1;
    }
    return res;
  }

  function renderContent(args?: {
    incrementAyah?: boolean;
    forceSequential?: boolean;
  }): string {
    const incrementAyah = args?.incrementAyah || false;
    const forceSequential = args?.forceSequential || false;
    const config = vscode.workspace.getConfiguration("ayat");
    const ayahMode = config.get("ayahMode", "sequential") as string;
    const showTafseer = config.get("showTafseerInitially", true) as boolean;
    let lastShownId = context.workspaceState.get<number>(lastShownIdKey) || 0;
    const currentAyahId = incrementAyah
      ? getNextAyahId(forceSequential ? "sequential" : ayahMode, lastShownId)
      : lastShownId;
    context.workspaceState.update(lastShownIdKey, currentAyahId);
    const ayahText = ayatData[currentAyahId].text;
    const tafseer = tafseerData[currentAyahId];
    console.log({ showTafseer });
    return `
		  <!DOCTYPE html>
		  <html dir="rtl" lang="ar">
		  <head>
			  <meta charset="UTF-8">
			  <meta name="viewport" content="width=device-width, initial-scale=1.0">
			  <title>Ayat</title>
			  <style>
				  body {
					  font-family: 'Arabic Font', sans-serif; /* Replace with your Arabic font */
					  text-align: center; 
					  margin: 20px;
				  }
				  .ayah { 
					  font-size: 24px;
					  margin-bottom: 10px;
				  }
				  .tafseer {
					  font-size: 18px;
				  }
			  </style>
		  </head>
		  <body>
			  <div class="ayah">${ayahText}</div>
			  ${showTafseer ? `<div class="tafseer">${tafseer}</div>` : ""}
			  <button onclick="toggleTafseer()"> ${
          showTafseer ? "إخفاء التفسير" : "إظهار التفسير"
        }</button>
			  <button onclick="nextAyah()">التالي</button>
			  <script>
				  const vscode = acquireVsCodeApi(); 
				  function toggleTafseer() {
					  vscode.postMessage({ command: 'toggleTafseer' });
				  }
				  function nextAyah() {
					  vscode.postMessage({ command: 'nextAyah' });
				  }
			  </script>
		  </body>
		  </html>
	  `;
  }
}

// ... (deactivate function) ...
// This method is called when your extension is deactivated
export function deactivate() {}

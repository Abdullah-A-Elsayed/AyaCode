import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const lastShownIdKey = "lastShownId";

const nextButtonLabel = "Next ayah";
const showTafseerButtonLabel = "Show tafseer";
const hideTafseerButtonLabel = "Hide tafseer";
const closeButtonLabel = "Close";

export function activate(context: vscode.ExtensionContext) {
  const ayatData = loadJsonData("quran.json");
  const tafseerData = loadJsonData("tafseer.json");
  const ayatCount = Object.keys(ayatData).length;

  let disposable = vscode.commands.registerCommand("ayat.showAyat", () => {
    showAyat(context);
  });

  context.subscriptions.push(disposable);

  function loadJsonData(filename: string): any {
    const filePath = path.join(__dirname, "..", "data", filename);
    const jsonData = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(jsonData);
  }

  function getNextAyahId(ayahMode: string, lastShownId: number): number {
    if (ayahMode === "sequential") {
      return (lastShownId + 1) % ayatCount; // Circular increment
    } else {
      return Math.floor(Math.random() * ayatCount);
    }
  }

  function showAyat(context: vscode.ExtensionContext) {
    const panel = vscode.window.createWebviewPanel(
      "ayatView",
      "Ayat",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
      }
    );

    const config = vscode.workspace.getConfiguration("ayat");
    const ayahMode = config.get("ayahMode", "sequential") as string;
    let showTafseer = config.get("showTafseerInitially", true) as boolean;

    let lastShownId = context.globalState.get<number>(lastShownIdKey) ?? -1;
    let currentAyahId = getNextAyahId(ayahMode, lastShownId);

    function updateWebview() {
      context.globalState.update(lastShownIdKey, currentAyahId);
      const ayah = ayatData[currentAyahId];
      const ayahText = ayah.text;
      const tafseer = tafseerData[currentAyahId].text;
      const chapter_name = ayah.chapter_ar;
      const verse_number = ayah.verse;

      panel.webview.html = getWebviewContent(
        ayahText,
        chapter_name,
        verse_number,
        tafseer,
        showTafseer
      );
    }

    updateWebview();

    panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "next":
            currentAyahId = getNextAyahId(ayahMode, currentAyahId);
            updateWebview();
            return;
          case "toggleTafseer":
            showTafseer = !showTafseer;
            config.update(
              "showTafseerInitially",
              showTafseer,
              vscode.ConfigurationTarget.Global
            );
            updateWebview();
            return;
          case "close":
            panel.dispose();
            return;
        }
      },
      undefined,
      context.subscriptions
    );
  }

  showAyat(context);
}

function getWebviewContent(
  ayahText: string,
  chapter_name: string,
  verse_number: string,
  tafseer: string,
  showTafseer: boolean
): string {
  return `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ayat</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: right; direction: rtl; }
                .ayah { font-size: 24px; margin-bottom: 10px; }
                .reference { font-size: 18px; opacity: 70%; }
                .tafseer { font-size: 18px; margin-top: 20px; }
                button { 
                  font-size: 14px; padding: 5px 10px;
                  margin-left:10px;
                  border-radius: 10px;
                  box-shadow: 1px 1px #777;
                  cursor: pointer;
                }
                .container { 
                  width: 80%;
                  margin-right: auto;
                  margin-left: auto;
                  margin-top: 60px;
                }
                .content {
                  border:1px solid;
                  border-radius: 15px;
                  padding: 5%;
                }
                .control {
                  margin: 20px 0;
                  direction: ltr;
                  display: flex;
                }
                .close-button { margin-left: auto; }
            </style>
        </head>
        <body class="container">
            <div class="content">
              <div class="ayah">${ayahText}</div>
              <div class="reference">${chapter_name} - ${verse_number}</div>
              ${showTafseer ? `<div class="tafseer">${tafseer}</div>` : ""}
            </div>
            <div class="control">
              <button onclick="sendMessage('next')">${nextButtonLabel}</button>
              <button onclick="sendMessage('toggleTafseer')">${
                showTafseer ? hideTafseerButtonLabel : showTafseerButtonLabel
              }</button>
              <button 
                onclick="sendMessage('close')"
                class="close-button"
              >
                ${closeButtonLabel}
              </button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                function sendMessage(command) {
                    vscode.postMessage({ command: command });
                }
            </script>
        </body>
        </html>
    `;
}

export function deactivate() {}

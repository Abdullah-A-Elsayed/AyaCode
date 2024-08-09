import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const lastShownIdKey = "lastShownId";
const nextButtonLabel = "الآية التالية";
const showTafseerButtonLabel = "إظهار التفسير";
const hideTafseerButtonLabel = "إخفاء التفسير";

export function activate(context: vscode.ExtensionContext) {
  const ayatData = loadJsonData("ayat.json");
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
      return (lastShownId % ayatCount) + 1; // Circular increment
    } else {
      return Math.floor(Math.random() * ayatCount) + 1;
    }
  }

  async function showAyat(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("ayat");
    const ayahMode = config.get("ayahMode", "sequential") as string;
    let showTafseer = config.get("showTafseerInitially", true) as boolean;

    let lastShownId = context.workspaceState.get<number>(lastShownIdKey) ?? 0;
    let currentAyahId = getNextAyahId(ayahMode, lastShownId);

    while (true) {
      context.workspaceState.update(lastShownIdKey, currentAyahId);

      const ayahText = ayatData[currentAyahId].text;
      const tafseer = tafseerData[currentAyahId];

      const message = showTafseer ? `${ayahText}\n\n${tafseer}` : ayahText;

      const result = await vscode.window.showInformationMessage(
        message,
        { modal: true },
        { title: nextButtonLabel, isCloseAffordance: false },
        {
          title: showTafseer ? hideTafseerButtonLabel : showTafseerButtonLabel,
          isCloseAffordance: false,
        }
      );

      if (!result) {
        // User closed the dialog
        break;
      } else if (result.title === nextButtonLabel) {
        currentAyahId = getNextAyahId(ayahMode, currentAyahId);
      } else if (
        result.title === hideTafseerButtonLabel ||
        result.title === showTafseerButtonLabel
      ) {
        showTafseer = !showTafseer;
        await config.update(
          "showTafseerInitially",
          showTafseer,
          vscode.ConfigurationTarget.Global
        );
      }
    }
  }
  showAyat(context);
}
export function deactivate() {}

import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const lastShownIdKey = "lastShownId";
const nextButtonLabel = "الآية التالية";
const showTafseerButtonLabel = "إظهار التفسير";
const hideTafseerButtonLabel = "إخفاء التفسير";

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

  async function showAyat(context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration("ayat");
    const ayahMode = config.get("ayahMode", "sequential") as string;
    let showTafseer = config.get("showTafseerInitially", true) as boolean;

    let lastShownId = context.workspaceState.get<number>(lastShownIdKey) ?? -1;
    let currentAyahId = getNextAyahId(ayahMode, lastShownId);

    while (true) {
      context.workspaceState.update(lastShownIdKey, currentAyahId);
      const ayah = ayatData[currentAyahId];
      const ayahText = ayah.text;
      const tafseer = tafseerData[currentAyahId].text;
      const chapter_name = ayah.chapter_ar;
      const verse_number = ayah.verse;
      const messageWithoutTafseer = `${ayahText}\n${chapter_name}-${verse_number}`;
      const message = showTafseer
        ? `${messageWithoutTafseer}\n\n${tafseer}`
        : messageWithoutTafseer;

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

# Die Deutsche Programmiersprache für Visual Studio Code
## Funktionen

|                                                                                                                                            |                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| ![image](https://github.com/DDP-Projekt/vscode-ddp/assets/26361108/114484b8-58c3-480b-a2b3-c2447bfeb53f)Syntax highlighting (.ddp Dateien) | ![image](https://github.com/DDP-Projekt/vscode-ddp/assets/26361108/1367aa51-e873-4492-b493-edb25e1a2bf3)Tooltips             |
| ![image](https://github.com/DDP-Projekt/vscode-ddp/assets/26361108/34a5f757-2777-4618-a0be-95dc2595223e)Befehle                            | ![image](https://github.com/DDP-Projekt/vscode-ddp/assets/26361108/38975815-477e-4c2e-b43d-a0930c54721e)Vervollständigung    |
| ![image](https://github.com/DDP-Projekt/vscode-ddp/assets/26361108/a53dfbd9-c200-446d-abbd-c1e0843696dc)Fehlerbericht                      | ![image](https://github.com/DDP-Projekt/vscode-ddp/assets/26361108/5dff6294-fa94-44fb-828a-e4cb76ff1df3)Goto/Peek Definition |
|                                                                                                                                            |                                                                                                                              |

## Installation

Im Erweiterungen Menü in vscode nach DDP suchen und installieren oder über diesen link: https://marketplace.visualstudio.com/items?itemName=DDP-Projekt.vscode-ddp

Optional direkt von der [Github Release Seite](https://github.com/DDP-Projekt/vscode-ddp/releases) herunterladen.

### Developer version
1. Dieses Repo in den Ordner\
   `%USERPROFILE%\.vscode\extensions` auf Windows\
   `~/.vscode/extensions` auf MacOS\
   `~/.vscode/extensions` auf Linux<br>
   klonen.
2. VSCode neustarten.

## Release

1. Version erhöhen
2. Optional die DDPLS<.exe> binaries in das bin/ Verzeichnis kopieren
   sollte man das nicht machen muss der Benutzer DDPLS global installiert haben
3. `vsce package` ausführen für die .vsix Datei (für den Github Release)
4. `vsce publish` für den Marketplace Release ausführen